/* Blockvile Plus OS — Videos: watch YouTube with YouTube's official embedded player */
(() => {
  const { esc, store } = window.BV;

  /* Understands every common YouTube link: watch?v=, youtu.be/, /shorts/, /live/, /embed/, playlists, start times, or a bare video ID */
  function parseYT(input) {
    let s = String(input || "").trim(); if (!s) return null;
    if (/^[\w-]{11}$/.test(s)) return { type: "video", id: s, start: 0 };
    if (/^(PL|UU|LL|FL|RD|OL)[\w-]{10,}$/.test(s)) return { type: "list", list: s };
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    let u; try { u = new URL(s); } catch { return null; }
    const host = u.hostname.replace(/^(www|m|music)\./, "");
    if (!/^(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(host)) return null;
    const t = u.searchParams.get("t") || u.searchParams.get("start") || "";
    const start = /^\d+$/.test(t) ? +t : ((m => m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : 0)(t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)));
    const list = u.searchParams.get("list") || "";
    let id = host === "youtu.be" ? u.pathname.split("/")[1] : u.searchParams.get("v");
    if (!id) { const m = u.pathname.match(/^\/(?:shorts|live|embed|v|e)\/([\w-]{11})/); if (m) id = m[1]; }
    if (id && /^[\w-]{11}$/.test(id)) return { type: "video", id, start, list };
    if (list) return { type: "list", list };
    return null;
  }
  const thumb = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  const watchUrl = it => it.type === "list" ? `https://www.youtube.com/playlist?list=${it.list}` : `https://www.youtube.com/watch?v=${it.id}${it.start ? "&t=" + it.start + "s" : ""}`;
  const embedUrl = it => {
    const q = "autoplay=1&rel=0&playsinline=1&modestbranding=1";
    if (it.type === "list") return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(it.list)}&${q}`;
    return `https://www.youtube-nocookie.com/embed/${it.id}?${q}${it.start ? "&start=" + it.start : ""}${it.list ? "&list=" + encodeURIComponent(it.list) : ""}`;
  };
  const decode = s => { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; };
  const keyOf = it => it.type === "list" ? "list:" + it.list : it.id;

  window.BV_APPS.push({
    id: "videos", name: "Videos", icon: "📺", bg: "linear-gradient(135deg,#f43f5e,#7c3aed)", cat: "Media", net: true, dock: true, size: [800, 660],
    keywords: "youtube video watch tube clips music videos",
    render(body, os) {
      let tab = "watch", cur = store.get("ytNow", null), results = [], queue = [], searching = false, searchErr = "", showKey = false, lastQ = "";
      const lib = () => store.get("ytLib", []), hist = () => store.get("ytHist", []);
      const saved = it => lib().some(x => keyOf(x) === keyOf(it));

      async function withTitle(it) {
        if (it.title) return it;
        try {
          const r = await fetch("https://noembed.com/embed?url=" + encodeURIComponent(watchUrl(it)));
          const j = await r.json();
          if (j.title) { it.title = j.title; it.author = j.author_name || ""; }
        } catch { }
        if (!it.title) it.title = it.type === "list" ? "YouTube playlist" : "YouTube video";
        return it;
      }
      function play(it, fromQueue) {
        cur = { ...it }; if (fromQueue) queue = fromQueue;
        store.set("ytNow", cur);
        if (cur.type === "video") store.set("ytHist", [cur, ...hist().filter(x => keyOf(x) !== keyOf(cur))].slice(0, 50));
        tab = "watch"; draw();
        if (!cur.title) withTitle(cur).then(t => { if (cur && keyOf(cur) === keyOf(t)) { store.set("ytNow", t); store.set("ytHist", hist().map(x => keyOf(x) === keyOf(t) ? t : x)); draw(); } });
      }
      async function search(q) {
        const key = store.get("ytKey", "");
        lastQ = q; searchErr = "";
        if (!key) { results = []; return draw(); }
        searching = true; draw();
        try {
          const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=24&safeSearch=moderate&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`);
          const j = await r.json();
          if (j.error) throw new Error(j.error.message || "Search failed");
          results = (j.items || []).filter(x => x.id?.videoId).map(x => ({ type: "video", id: x.id.videoId, title: decode(x.snippet.title), author: decode(x.snippet.channelTitle) }));
        } catch (e) { results = []; searchErr = e.message || "Search failed — check your connection"; }
        searching = false; draw();
      }

      const card = (it, attrs) => `<div class="yt-card" ${attrs}><div class="yt-thumb">${it.type === "list" ? `<span class="yt-list">☰ Playlist</span>` : `<img src="${thumb(it.id)}" alt="" loading="lazy" onerror="this.remove()">`}</div>
        <div class="yt-meta"><b>${esc(it.title || (it.type === "list" ? "YouTube playlist" : "YouTube video"))}</b><small>${esc(it.author || "")}</small></div></div>`;

      function draw() {
        const tabsH = [["watch", "▶ Watch"], ["search", "🔎 Search"], ["library", `♡ Saved (${lib().length})`], ["history", "🕘 History"]]
          .map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? "on" : ""}">${l}</button>`).join("");
        let html = "";
        if (tab === "watch") {
          if (cur) {
            const up = (queue.length ? queue : lib()).filter(x => keyOf(x) !== keyOf(cur));
            html = `<div class="yt-player"><iframe src="${embedUrl(cur)}" title="YouTube video player" allow="autoplay; encrypted-media; picture-in-picture; fullscreen; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
              <div class="yt-now"><div><b>${esc(cur.title || "Loading…")}</b><small>${esc(cur.author || "")}</small></div>
                <button class="btn ghost" data-save>${saved(cur) ? "♥ Saved" : "♡ Save"}</button><button class="btn ghost" data-ext>↗ YouTube</button></div>
              ${up.length ? `<div class="h" style="margin-top:14px">Up next</div><div class="yt-list-v">${up.slice(0, 12).map((x, i) => card(x, `data-up="${i}"`)).join("")}</div>` : ""}`;
            body._up = up;
          } else {
            html = `<div class="cm-empty"><div style="font-size:64px">📺</div><h3>Watch YouTube here</h3><p class="muted">Paste a YouTube link below, or search for videos.</p></div>`;
          }
        }
        if (tab === "search") {
          const key = store.get("ytKey", "");
          html = `<form class="toolbar" data-sform><input class="field" data-sq placeholder="Search YouTube" value="${esc(lastQ)}" style="flex:1;min-width:160px" aria-label="Search YouTube"><button class="btn">${key ? "Search" : "Search ↗"}</button></form>`;
          if (!key) html += `<p class="muted" style="font-size:13px">Search opens YouTube in a new tab — copy a video's link and paste it below to watch it here.
              <button class="link-btn" data-showkey>${showKey ? "Hide" : "Want search inside Blockvile?"}</button></p>`;
          if (!key && showKey || key && showKey) html += keyBox(key);
          if (searching) html += `<p class="muted center" style="padding:20px">Searching…</p>`;
          else if (searchErr) html += `<p class="muted" style="color:var(--danger)">⚠ ${esc(searchErr)}</p>`;
          else if (results.length) html += `<div class="yt-grid">${results.map((x, i) => card(x, `data-res="${i}"`)).join("")}</div>`;
          else if (key && lastQ) html += `<p class="muted center">No results</p>`;
          if (key && !showKey) html += `<p class="muted" style="font-size:11px;margin-top:10px">In-app search uses your YouTube API key. <button class="link-btn" data-showkey>Change key</button></p>`;
        }
        if (tab === "library") html = lib().length ? `<div class="yt-grid">${lib().map((x, i) => card(x, `data-lib="${i}"`) .replace('</div></div>', `</div><button class="yt-x" data-unsave="${i}" aria-label="Remove">✕</button></div>`)).join("")}</div>`
          : `<div class="cm-empty"><div style="font-size:48px">♡</div><p class="muted">Videos you save appear here.</p></div>`;
        if (tab === "history") html = hist().length ? `<div class="toolbar"><button class="btn ghost" data-clearhist>Clear history</button></div><div class="yt-grid">${hist().map((x, i) => card(x, `data-hist="${i}"`)).join("")}</div>`
          : `<div class="cm-empty"><div style="font-size:48px">🕘</div><p class="muted">Nothing watched yet.</p></div>`;

        body.innerHTML = `<div class="seg">${tabsH}</div>
          <form class="cm-add" data-pform style="margin:0 0 12px"><input class="field" data-url placeholder="Paste a YouTube link (video, Shorts or playlist)…" aria-label="YouTube link"><button class="btn">▶ Play</button></form>
          ${html}
          ${os.state.flags.airplane ? `<p class="muted" style="font-size:12px">✈ Airplane mode is on — videos need internet.</p>` : ""}
          ${location.protocol === "file:" && tab === "watch" && cur ? `<p class="muted" style="font-size:11px;margin-top:8px">If the video shows an error, YouTube may need Blockvile to be opened from a website rather than a file on your computer — or tap ↗ YouTube.</p>` : ""}
          <p class="muted" style="font-size:10px;margin-top:8px">Videos play in YouTube's official embedded player.</p>`;
      }
      const keyBox = key => `<div class="ps-note" style="margin-bottom:12px"><b>Search inside Blockvile (optional)</b>
        <p>YouTube only allows in-app search with a free YouTube Data API key: in Google Cloud Console create a project, enable <b>YouTube Data API v3</b>, then create an <b>API key</b> and paste it here. It's saved only on this device.</p>
        <div class="toolbar" style="margin-top:8px"><input class="field" data-key placeholder="API key" value="${esc(key)}" style="flex:1;min-width:160px" autocomplete="off"><button class="btn" data-savekey>Save</button>${key ? `<button class="btn ghost" data-delkey>Remove</button>` : ""}</div></div>`;

      body.addEventListener("submit", e => {
        e.preventDefault();
        if (e.target.matches("[data-pform]")) {
          const v = body.querySelector("[data-url]").value, it = parseYT(v);
          if (!it) return os.toast("That doesn't look like a YouTube link");
          play(it);
        }
        if (e.target.matches("[data-sform]")) {
          const q = body.querySelector("[data-sq]").value.trim(); if (!q) return;
          if (store.get("ytKey", "")) search(q); else { lastQ = q; window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(q), "_blank", "noopener"); }
        }
      });
      body.addEventListener("paste", e => { if (e.target.dataset.url !== undefined) setTimeout(() => { const it = parseYT(e.target.value); if (it) play(it); }, 0); });
      body.addEventListener("click", e => {
        const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; return draw(); }
        const unsave = e.target.closest("[data-unsave]"); if (unsave) { e.stopPropagation(); const l = lib(); l.splice(+unsave.dataset.unsave, 1); store.set("ytLib", l); return draw(); }
        const pick = (attr, list) => { const el = e.target.closest(`[data-${attr}]`); if (el) { const L = list(); play(L[+el.dataset[attr]], L); return true; } };
        if (pick("res", () => results) || pick("lib", lib) || pick("hist", hist)) return;
        const up = e.target.closest("[data-up]"); if (up) return play(body._up[+up.dataset.up], queue.length ? queue : null);
        if (e.target.closest("[data-save]") && cur) {
          store.set("ytLib", saved(cur) ? lib().filter(x => keyOf(x) !== keyOf(cur)) : [cur, ...lib()]);
          os.toast(saved(cur) ? "♥ Saved" : "Removed from Saved"); return draw();
        }
        if (e.target.closest("[data-ext]") && cur) return window.open(watchUrl(cur), "_blank", "noopener");
        if (e.target.closest("[data-clearhist]")) { store.set("ytHist", []); return draw(); }
        if (e.target.closest("[data-showkey]")) { showKey = !showKey; return draw(); }
        if (e.target.closest("[data-savekey]")) { const k = body.querySelector("[data-key]").value.trim(); store.set("ytKey", k); showKey = false; os.toast(k ? "🔑 Key saved — search works inside Blockvile" : "Key removed"); if (k && lastQ) return search(lastQ); return draw(); }
        if (e.target.closest("[data-delkey]")) { store.del("ytKey"); showKey = false; results = []; return draw(); }
      });
      draw();
    }
  });

  window.BV.parseYT = parseYT;
})();
