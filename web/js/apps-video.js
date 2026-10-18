/* Blockvile Plus OS — YouTube app.
   The app IS the Tube page (tube.html): a YouTube-style screen. Searching and trending come from YouTube's Data API, but the
   API key never lives in the app — Blockvile asks the publisher's own server function (Supabase `youtube`) which holds it.
   Videos play in YouTube's official embedded player. Pasting a YouTube link into the search box also works without signing in. */
(() => {
  const { store } = window.BV;
  const A = () => window.BV.auth;
  try { store.del("ytKey"); } catch { }      // an older version asked people for their own key; the app never stores one now
  const decode = s => { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; };

  window.BV_APPS.push({
    id: "videos", name: "YouTube", icon: "▶️", bg: "linear-gradient(135deg,#ff2d2d,#b91c1c)", cat: "Media", net: true, dock: true, size: [980, 680],
    keywords: "youtube video watch tube clips music videos search",
    render(body, os) {
      let frame = null, status = "ok";
      body.style.padding = "0"; body.style.overflow = "hidden";

      // ---- talking to the publisher's server function (the key is there, not here) ----
      async function call(op, params) {
        const auth = A();
        if (!auth?.configured()) throw new Error("YouTube search isn't set up yet");
        if (!auth.signedIn()) throw new Error("Sign in to search YouTube here");
        const c = await auth.client();
        const { data, error } = await c.functions.invoke("youtube", { body: { op, ...params } });
        if (error || !Array.isArray(data?.videos)) {
          let why = ""; try { why = (await error?.context?.json?.())?.error || ""; } catch { }
          throw new Error(why || (navigator.onLine === false ? "You're offline" : "YouTube search isn't available right now"));
        }
        return data.videos.map(v => ({ ...v, title: decode(v.title || ""), channel: decode(v.channel || ""), description: decode(v.description || "") }));
      }
      const region = () => (navigator.language.split("-")[1] || "US").toUpperCase();
      const state = () => { const a = A(); return !a?.configured() ? "setup" : !a.signedIn() ? "signin" : "ok"; };

      // what you saved in the old YouTube app moves across (once)
      function saved() {
        let s = store.get("tubeState", null);
        if (!s) {
          const old = it => it && it.type === "video" && /^[\w-]{11}$/.test(it.id || "") ? { id: it.id, title: it.title || "YouTube video", channel: it.author || "YouTube" } : null;
          s = { subs: [], liked: [], disliked: [], later: store.get("ytLib", []).map(old).filter(Boolean), hist: store.get("ytHist", []).map(old).filter(Boolean) };
        }
        return s;
      }

      const post = m => { try { frame?.contentWindow?.postMessage({ bv: "tube", ...m }, "*"); } catch { } };
      let home = null;
      async function init() {
        status = state(); let err = "";
        if (status === "ok" && home === null) { try { home = await call("trending", { region: region() }); } catch (e) { home = []; err = e.message; } }
        post({ type: "init", status, home: status === "ok" ? home : [], saved: saved() });
        if (err) post({ type: "error", message: err });
      }
      async function onMsg(e) {
        if (!frame || e.source !== frame.contentWindow || !e.data || typeof e.data.bv !== "string") return;
        const d = e.data;
        if (d.bv === "tube-ready") return init();
        if (d.bv === "tube-search" && typeof d.q === "string") {
          const q = d.q.replace(/\s+/g, " ").trim().slice(0, 100); if (!q) return;
          try { post({ type: "results", q, videos: await call("search", { q }) }); }
          catch (err) { post({ type: "error", message: err.message || "Search failed" }); }
        }
        if (d.bv === "tube-accounts") os.open("accounts");
        if (d.bv === "tube-save" && d.state && typeof d.state === "object") {
          const cut = a => (Array.isArray(a) ? a : []).slice(0, 60);
          const raw = r => ({ id: String(r?.id || ""), title: String(r?.title || "").slice(0, 200), channel: String(r?.channel || "").slice(0, 100), published: String(r?.published || ""), duration: String(r?.duration || ""), views: +r?.views || 0, likes: +r?.likes || 0 });
          const ok = r => /^[\w-]{11}$/.test(String(r?.id || ""));
          const s = d.state;
          store.set("tubeState", { subs: cut(s.subs).map(x => String(x).slice(0, 80)), liked: cut(s.liked).filter(ok).map(raw), disliked: cut(s.disliked).map(String).filter(x => /^[\w-]{11}$/.test(x)), later: cut(s.later).filter(ok).map(raw), hist: cut(s.hist).filter(ok).map(raw) });
        }
      }
      window.addEventListener("message", onMsg);
      const onAuth = () => { if (body.isConnected) { home = null; init(); } };
      window.addEventListener("bv:auth", onAuth);

      body.innerHTML = `<iframe data-tube title="YouTube" style="width:100%;height:100%;border:0;background:#0f0f0f;display:block" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation"></iframe>`;
      frame = body.querySelector("[data-tube]");
      const el = document.getElementById("bv-tube-src");     // the one-file copy carries tube.html inside itself
      let html = ""; if (el) { try { html = new TextDecoder().decode(Uint8Array.from(atob(el.textContent.trim()), c => c.charCodeAt(0))); } catch { } }
      if (html) frame.srcdoc = html; else frame.src = "tube.html";
      return () => { window.removeEventListener("message", onMsg); window.removeEventListener("bv:auth", onAuth); };
    }
  });
})();
