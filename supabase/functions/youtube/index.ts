// Blockvile YouTube — Supabase Edge Function. The YouTube API key lives ONLY here (as a secret), never in the app.
//
// Set up (once):
//   supabase secrets set YOUTUBE_API_KEY=<your key>          (optional: YT_USER_UNITS=3000  YT_ALL_UNITS=9000)
//   supabase functions deploy youtube
//
// Why this is safe to expose:
//   * only signed-in users can call it (Supabase checks the login token, and so do we),
//   * it is NOT a pass-through: it only does two fixed things (search / trending), checks every input, and
//     returns a small cleaned-up list, so it can't be used to reach other parts of the YouTube API,
//   * each user and the whole app have a daily cap, so one person can't burn through your free quota,
//   * the key is never sent to the browser, never logged, and never part of any reply.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Google's free quota is 10,000 units a day: a search costs 100, a lookup costs 1.
const USER_UNITS = Number(Deno.env.get("YT_USER_UNITS") ?? 3000);   // about 30 searches per person per day
const ALL_UNITS = Number(Deno.env.get("YT_ALL_UNITS") ?? 9000);     // keeps everyone together under the free limit
const API = "https://www.googleapis.com/youtube/v3";

// small burst limit per person (resets when the function restarts; the daily caps below are the durable limit)
const burst = new Map<string, number[]>();
function tooFast(uid: string): boolean {
  const now = Date.now(), list = (burst.get(uid) ?? []).filter((t) => now - t < 60_000);
  list.push(now); burst.set(uid, list);
  if (burst.size > 5000) burst.clear();
  return list.length > 12;
}

type Item = { id: string; title: string; channel: string; published: string; description: string; duration: string; views: number; likes: number };

async function details(ids: string[], key: string): Promise<Item[]> {
  if (!ids.length) return [];
  const p = new URLSearchParams({ part: "snippet,contentDetails,statistics", id: ids.join(","), maxResults: "50", key });
  const r = await fetch(`${API}/videos?${p}`);
  if (!r.ok) throw new Error("upstream");
  const j = await r.json();
  return (j.items ?? []).map((x: any) => ({
    id: String(x.id ?? ""), title: String(x.snippet?.title ?? "").slice(0, 200), channel: String(x.snippet?.channelTitle ?? "").slice(0, 100),
    published: String(x.snippet?.publishedAt ?? "").slice(0, 30), description: String(x.snippet?.description ?? "").slice(0, 1200),
    duration: String(x.contentDetails?.duration ?? "").slice(0, 30), views: Number(x.statistics?.viewCount) || 0, likes: Number(x.statistics?.likeCount) || 0,
  })).filter((v: Item) => /^[\w-]{11}$/.test(v.id));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const supa = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return json({ error: "Sign in to use YouTube here" }, 401);

  const key = Deno.env.get("YOUTUBE_API_KEY");
  if (!key) return json({ error: "YouTube isn't set up on the server yet" }, 503);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const op = body?.op;
  let cost = 0, run: () => Promise<Item[]>;
  if (op === "search") {
    const q = typeof body.q === "string" ? body.q.replace(/\s+/g, " ").trim() : "";
    if (q.length < 1 || q.length > 100) return json({ error: "Type something to search for (up to 100 characters)" }, 400);
    cost = 101;
    run = async () => {
      const p = new URLSearchParams({ part: "snippet", type: "video", maxResults: "24", safeSearch: "moderate", q, key });
      const r = await fetch(`${API}/search?${p}`);
      if (!r.ok) throw new Error("upstream");
      const j = await r.json();
      return details((j.items ?? []).map((x: any) => x?.id?.videoId).filter((s: unknown) => typeof s === "string" && /^[\w-]{11}$/.test(s as string)), key);
    };
  } else if (op === "trending") {
    const region = typeof body.region === "string" && /^[A-Za-z]{2}$/.test(body.region) ? body.region.toUpperCase() : "US";
    cost = 1;
    run = async () => {
      const p = new URLSearchParams({ part: "snippet,contentDetails,statistics", chart: "mostPopular", maxResults: "24", regionCode: region, key });
      const r = await fetch(`${API}/videos?${p}`);
      if (!r.ok) throw new Error("upstream");
      const j = await r.json();
      return (j.items ?? []).map((x: any) => ({
        id: String(x.id ?? ""), title: String(x.snippet?.title ?? "").slice(0, 200), channel: String(x.snippet?.channelTitle ?? "").slice(0, 100), published: String(x.snippet?.publishedAt ?? "").slice(0, 30),
        description: String(x.snippet?.description ?? "").slice(0, 1200), duration: String(x.contentDetails?.duration ?? "").slice(0, 30), views: Number(x.statistics?.viewCount) || 0, likes: Number(x.statistics?.likeCount) || 0,
      })).filter((v: Item) => /^[\w-]{11}$/.test(v.id));
    };
  } else {
    return json({ error: "Unknown request" }, 400);
  }

  if (tooFast(user.id)) return json({ error: "Slow down a little — try again in a minute" }, 429);

  // daily caps (counted in the database with the service role; nobody else can touch the table)
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const hit = async (who: string, cap: number) => {
    const { data, error } = await admin.rpc("yt_hit", { who, units: cost, cap });
    if (error) throw new Error("quota");
    return data === true;
  };
  try {
    if (!(await hit(user.id, USER_UNITS))) return json({ error: "You've used today's YouTube searches. They reset tomorrow." }, 429);
    if (!(await hit("ALL", ALL_UNITS))) return json({ error: "YouTube search is busy today. Try again tomorrow." }, 429);
  } catch { return json({ error: "YouTube isn't set up on the server yet (run supabase/schema.sql)" }, 503); }

  try { return json({ videos: await run() }); }
  catch { return json({ error: "YouTube didn't answer. Try again in a moment." }, 502); }   // never echo upstream text (it could mention the key)
});
