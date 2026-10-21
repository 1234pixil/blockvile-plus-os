/* Blockvile Plus OS — YouTube app.
   The app IS the Tube page (tube.html): a YouTube-style screen. Searching and trending come from YouTube's Data API, but the
   API key never lives in the app — Blockvile asks the publisher's own server function (Supabase `blockvile-youtube`) which holds it.
   Videos play in YouTube's official embedded player. Pasting a YouTube link into the search box also works without signing in. */
(() => {
  const { store } = window.BV;
  const A = () => window.BV.auth;
  const myKey = () => { try { const k = String(store.get("ytKey", "") || "").trim(); return /^AIza[\w-]{30,45}$/.test(k) ? k : ""; } catch { return ""; } };   // your own key: typed by you, kept only on this device
  const decode = s => { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; };

  window.BV_APPS.push({
    id: "videos", name: "YouTube", icon: "▶️", bg: "linear-gradient(135deg,#ff2d2d,#b91c1c)", cat: "Media", net: true, dock: true, size: [980, 680],
    keywords: "youtube video watch tube clips music videos search",
    render(body, os) {
      let frame = null, status = "ok";
      body.style.padding = "0"; body.style.overflow = "hidden";

      // ---- talking to the publisher's server function (the key is there, not here) ----
      // Public, key-free search (tried when the publisher's function isn't available), so the app keeps working with no errors shown
      const MIRRORS = ["https://api.piped.private.coffee", "https://pipedapi.kavin.rocks", "https://pipedapi.adminforge.de"];
      const iso = n => { n = Math.max(0, Math.floor(+n || 0)); const h = Math.floor(n / 3600), m = Math.floor(n % 3600 / 60), s = n % 60; return "PT" + (h ? h + "H" : "") + (m ? m + "M" : "") + (s || (!h && !m) ? s + "S" : ""); };
      async function mirror(op, params) {
        const path = op === "search" ? "/search?filter=videos&q=" + encodeURIComponent(params.q || "") : "/trending?region=" + encodeURIComponent(params.region || "US");
        for (const base of MIRRORS) {
          try {
            const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 7000);
            const r = await fetch(base + path, { signal: ctl.signal }); clearTimeout(t);
            if (!r.ok) continue;
            const j = await r.json(), list = Array.isArray(j) ? j : j.items;
            const out = (list || []).map(x => ({ id: (String(x.url || "").match(/[?&]v=([\w-]{11})/) || [])[1] || "", title: String(x.title || ""), channel: String(x.uploaderName || ""), published: x.uploaded > 0 ? new Date(x.uploaded).toISOString() : "", description: String(x.shortDescription || ""), duration: iso(x.duration), views: +x.views || 0, likes: 0 })).filter(v => v.id && v.duration !== "PT0S").slice(0, 24);
            if (out.length) return out;
          } catch { }
        }
        return [];
      }

      // ---- your own YouTube key (🔑 button): the app talks to YouTube directly; the key never leaves this device ----
      async function direct(op, params) {
        const key = myKey(); if (!key) return null;
        const api = async (path, q) => { const r = await fetch("https://www.googleapis.com/youtube/v3/" + path + "?" + new URLSearchParams({ ...q, key }), { cache: "no-store" }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error?.message || ("YouTube said HTTP " + r.status)); return j; };
        let ids;
        if (op === "search") { const j = await api("search", { part: "id", type: "video", maxResults: "24", safeSearch: "moderate", q: params.q || "" }); ids = (j.items || []).map(x => x.id?.videoId).filter(Boolean); }
        else { const j = await api("videos", { part: "snippet,contentDetails,statistics", chart: "mostPopular", regionCode: params.region || "US", maxResults: "24" }); return (j.items || []).map(x => ({ id: x.id, title: x.snippet?.title || "", channel: x.snippet?.channelTitle || "", published: x.snippet?.publishedAt || "", description: String(x.snippet?.description || "").slice(0, 1200), duration: x.contentDetails?.duration || "", views: +x.statistics?.viewCount || 0, likes: +x.statistics?.likeCount || 0 })); }
        if (!ids.length) return [];
        const j = await api("videos", { part: "snippet,contentDetails,statistics", id: ids.join(",") });
        return (j.items || []).map(x => ({ id: x.id, title: x.snippet?.title || "", channel: x.snippet?.channelTitle || "", published: x.snippet?.publishedAt || "", description: String(x.snippet?.description || "").slice(0, 1200), duration: x.contentDetails?.duration || "", views: +x.statistics?.viewCount || 0, likes: +x.statistics?.likeCount || 0 }));
      }

      // ---- the publisher's server function first (the key is there, not here); anything that goes wrong is logged quietly in the Debug Center ----
      async function call(op, params) {
        if (myKey()) {
          try { const v = await direct(op, params); if (v) return v.map(x => ({ ...x, title: decode(x.title), channel: decode(x.channel), description: decode(x.description) })); }
          catch (e) { window.BV_DEBUG?.log("warn", "YouTube own key", String(e?.message || e)); }
        }
        const auth = A();
        if (auth?.configured() && auth.signedIn()) {
          try {
            const c = await auth.client();
            const { data, error } = await c.functions.invoke(auth.settings().yt || "blockvile-youtube", { body: { op, ...params } });
            if (!error && Array.isArray(data?.videos)) return data.videos.map(v => ({ ...v, title: decode(v.title || ""), channel: decode(v.channel || ""), description: decode(v.description || "") }));
            let why = ""; try { why = (await error?.context?.json?.())?.error || ""; } catch { }
            window.BV_DEBUG?.log("warn", "YouTube " + op, why || "function unavailable, used the public fallback");
          } catch (e) { window.BV_DEBUG?.log("warn", "YouTube " + op, String(e?.message || e)); }
        }
        const v = await mirror(op, params);
        if (!v.length) window.BV_DEBUG?.log("warn", "YouTube " + op, "no results from any source");
        return v.map(x => ({ ...x, title: decode(x.title), channel: decode(x.channel), description: decode(x.description) }));
      }
      const region = () => (navigator.language.split("-")[1] || "US").toUpperCase();
      const state = () => "ok";   // search always works: the account is optional now

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
      body.style.position = "relative";
      const kb = document.createElement("button");
      kb.type = "button"; kb.title = "Use your own YouTube key"; kb.textContent = "🔑";
      kb.style.cssText = "position:absolute;right:10px;bottom:10px;z-index:5;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(20,20,20,.85);color:#fff;font-size:16px;cursor:pointer;opacity:.75";
      kb.onclick = async () => {
        const cur = myKey();
        const v = await window.BV.ask(cur ? "Your YouTube key is set (kept only on this device). Paste a new one, or clear it to remove:" : "Paste your own YouTube Data API key (starts with AIza). It stays only on this device:", cur);
        if (v === null) return;
        const k = v.trim();
        if (!k) { store.del("ytKey"); os.toast?.("YouTube key removed"); }
        else if (!/^AIza[\w-]{30,45}$/.test(k)) { os.toast?.("That doesn't look like a YouTube key"); return; }
        else { store.set("ytKey", k); os.toast?.("YouTube key saved on this device"); }
        home = null; init();
      };
      body.appendChild(kb);
      const el = document.getElementById("bv-tube-src");     // the one-file copy carries tube.html inside itself
      let html = ""; if (el) { try { html = new TextDecoder().decode(Uint8Array.from(atob(el.textContent.trim()), c => c.charCodeAt(0))); } catch { } }
      if (html) frame.srcdoc = html; else frame.src = "tube.html";
      return () => { window.removeEventListener("message", onMsg); window.removeEventListener("bv:auth", onAuth); };
    }
  });
})();
