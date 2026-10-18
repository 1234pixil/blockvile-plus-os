// Blockvile AI — Supabase Edge Function. The AI key stays here on the server, never in the app.
// Deploy:  supabase functions deploy ai
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   (optional: ANTHROPIC_MODEL=claude-sonnet-5-5 changes the default)
// The app lets people pick Fast / Balanced / Smartest. Only these models are allowed, so nobody can pick an expensive one by hand.
// Only signed-in users can call it (Supabase checks the login token for you).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MODELS: Record<string, string> = {
  fast: "claude-haiku-5-5",
  balanced: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5",
  smart: "claude-opus-5-5",
};

const SYSTEM = `You are Blockvile AI, the built-in assistant of Blockvile Plus OS (a phone/tablet/laptop-style shell).
Be brief, friendly and practical. You can't see the user's files. If the user wants the OS to do something, you may add ONE action line at the very end, exactly like:
[[action: open notes]]  |  [[action: dark on]]  |  [[action: dark off]]  |  [[action: mode laptop]]  |  [[action: takeover]]  |  [[action: exit takeover]]
Only add an action when the user clearly asked for it. Never claim you did something you did not do.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return json({ error: "Sign in to use Blockvile AI" }, 401);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "The AI key hasn't been set up on the server yet" }, 503);

  let messages: { role: string; content: string }[] = [];
  let choice = "balanced";
  try { const b = await req.json(); messages = b.messages ?? []; if (typeof b.model === "string" && MODELS[b.model]) choice = b.model; } catch { return json({ error: "Bad request" }, 400); }
  messages = messages.filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "Nothing to answer" }, 400);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODELS[choice], max_tokens: 600, system: SYSTEM, messages }),
  });
  if (!r.ok) return json({ error: "The AI service is busy, try again" }, 502);
  const out = await r.json();
  const text = (out.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n").trim();
  return json({ reply: text });
});
