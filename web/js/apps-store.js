/* Blockvile Plus OS — Blockvile Store, Cloud Music, web apps and extra installable apps */
(() => {
  const { esc, store } = window.BV;
  const A = window.BV_APPS;
  const isTop = body => { const w = body.closest(".win"); if (!w || w.classList.contains("min")) return false;
    return +w.style.zIndex === Math.max(...[...document.querySelectorAll(".win:not(.min)")].map(x => +x.style.zIndex)); };

  /* ================= Web apps (any website added from the Store) ================= */
  const webApp = w => ({
    id: w.id, name: w.name, icon: w.icon || "🌐", bg: w.bg || "linear-gradient(135deg,#64748b,#334155)", cat: "Web apps", web: true, net: true, url: w.url, external: !!w.external,
    launch: w.external ? () => window.open(w.url, "_blank", "noopener") : undefined,
    render(body) {
      body.style.padding = "0";
      body.innerHTML = `<div class="toolbar" style="padding:8px 10px;margin:0;border-bottom:1px solid var(--line)"><small class="muted" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(w.url)}</small>
        <button class="btn ghost" data-r>↻</button><button class="btn ghost" data-x>↗ Open in browser</button></div>
        <iframe src="${esc(w.url)}" style="width:100%;height:calc(100% - 50px);border:0;background:#fff" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"></iframe>`;
      body.querySelector("[data-r]").onclick = () => { const f = body.querySelector("iframe"); f.src = f.src; };
      body.querySelector("[data-x]").onclick = () => window.open(w.url, "_blank", "noopener");
    }
  });
  store.get("webapps", []).forEach(w => A.push(webApp(w)));

  /* ================= Store metadata ================= */
  const META = {
    settings: ["Control every part of your device", "Display, sound, lock screen, accessibility, accent colours and wallpapers.", ["Dark mode & night light", "PIN lock & auto-lock", "Custom photo wallpapers"]],
    files: ["Your folders and documents", "Browse, create, rename and delete files and folders, and upload from your device.", ["Folders & breadcrumbs", "Upload files", "Opens files in Text Editor"]],
    editor: ["Write and edit text files", "A clean editor for notes, code and documents saved in Files.", ["Ctrl+S to save", "Word count", "Tab indents"]],
    terminal: ["A real command line", "Navigate the file system, write files, open apps and change settings with commands.", ["ls, cd, cat, mkdir, mv, cp", "Command history & Tab completion", "neofetch"]],
    store: ["Get apps for Blockvile Plus", "Discover, install and manage apps, add any website as an app, and send Android apps to the real Google Play Store.", ["Install with one tap", "Your most-used apps", "Web apps"]],
    taskmgr: ["See what's running", "Running apps, uptime, memory and storage at a glance.", ["End tasks", "Live stats"]],
    notes: ["Quick notes, saved automatically", "Write many notes, search them, and save any note to Files.", ["Auto-save", "Search", "Export to Files"]],
    calculator: ["Everyday maths", "A clean calculator with keyboard support.", ["Keyboard input", "Percent & sign"]],
    clock: ["World clock, alarms, stopwatch & timer", "Everything time-related in one app.", ["Alarms with sound", "Lap stopwatch", "Quick timers"]],
    calendar: ["Plan your days", "Month view with events and reminders that notify you at the right time.", ["Event alerts", "Month navigation"]],
    reminders: ["To-dos with due times", "Check things off and get notified when they're due.", ["Due-time alerts", "Show/hide completed"]],
    phone: ["Keypad, recents & contacts", "Dial numbers and keep your contacts. Calls are handed to your device's dialer.", ["Contacts", "Call history"]],
    about: ["About this device", "Version, device details and shortcuts.", ["Device info"]],
    weather: ["Live forecasts anywhere", "Current conditions and a 5-day forecast for any city, or your location.", ["Live data", "City search", "Use my location"]],
    gallery: ["All your photos", "View, download, delete and set photos as wallpaper.", ["Full-screen viewer", "Set as wallpaper"]],
    camera: ["Take photos", "Front and back cameras, saved straight to Gallery.", ["Switch cameras", "Saves to Gallery"]],
    music: ["Play your own music", "Add songs from your device and play them with shuffle and repeat.", ["Shuffle & repeat", "Saved in your library"]],
    videos: ["Watch YouTube videos", "Paste any YouTube link — videos, Shorts or playlists — and watch it here. Save favourites, see your history, and optionally search inside the app with your own free YouTube API key.", ["Videos, Shorts & playlists", "Saved videos & history", "Optional in-app search"]],
    cloudmusic: ["Stream music from the cloud", "Play tracks, playlists and artists from SoundCloud using its official player, and keep them in your library.", ["Paste any SoundCloud link", "Your saved library", "Playlists & artists"]],
    recorder: ["Record voice memos", "Record audio with your microphone, play it back or download it.", ["One-tap recording", "Download recordings"]],
    paint: ["Draw and sketch", "Brushes, colours, eraser and undo, and save drawings to Gallery.", ["Undo", "Custom colours", "Save to Gallery"]],
    browser: ["Browse the web", "Address bar, back/forward and bookmarks.", ["Bookmarks", "Open in real browser"]],
    maps: ["Find places", "Search any place on OpenStreetMap or jump to your location.", ["Place search", "My location"]],
    snake: ["The classic snake game", "Eat, grow and don't bite yourself. Keyboard, buttons or swipe.", ["Best score saved", "Gets faster"]],
    g2048: ["Slide tiles, reach 2048", "The addictive number-merging puzzle.", ["Swipe or arrow keys", "Best score saved"]],
    tictactoe: ["X and O against the computer", "Play against an unbeatable AI, or a friend.", ["Easy & hard AI", "Two-player mode"]],
    converter: ["Convert units instantly", "Length, weight, temperature, speed, area and data.", ["6 categories", "Live conversion"]],
  };
  const PERMS = { camera: ["📷 Camera"], recorder: ["🎙 Microphone"], weather: ["🌐 Internet", "📍 Location"], maps: ["🌐 Internet", "📍 Location"], browser: ["🌐 Internet"], cloudmusic: ["🌐 Internet"], videos: ["🌐 Internet"], phone: ["📞 Phone dialer"], gallery: ["🖼 Photos"], music: ["🎵 Media"] };
  const sizeOf = a => { const n = (a.render?.toString().length || 2000) * 1.6; return n < 1024 * 1024 ? (n / 1024).toFixed(0) + " KB" : (n / 1048576).toFixed(1) + " MB"; };
  const CAT_IC = { System: "⚙️", Productivity: "📋", Communication: "💬", Media: "🎬", "Music & audio": "🎧", Internet: "🌐", Games: "🎮", Tools: "🧰", "Web apps": "🔗" };

  /* ================= Google Play hand-off =================
     There is no public Google Play API for installing apps, so the Store hands installs to the
     real Play Store: on Android the Play page opens the Play Store app; elsewhere it opens play.google.com. */
  const IS_ANDROID = /Android/i.test(navigator.userAgent);
  const PLAY_APP = id => `https://play.google.com/store/apps/details?id=${encodeURIComponent(id)}`;
  const PLAY_SEARCH = q => `https://play.google.com/store/search?q=${encodeURIComponent(q)}&c=apps`;
  const CAT_BG = { Social: "linear-gradient(135deg,#ec4899,#8b5cf6)", "Music & video": "linear-gradient(135deg,#ef4444,#f97316)", Games: "linear-gradient(135deg,#22c55e,#0ea5e9)", "Learning & tools": "linear-gradient(135deg,#0ea5e9,#6366f1)" };
  // [package, name, category, icon, web version]
  const ANDROID_APPS = [
    ["com.whatsapp", "WhatsApp", "Social", "💬", "https://web.whatsapp.com"],
    ["com.instagram.android", "Instagram", "Social", "📸", "https://www.instagram.com"],
    ["com.snapchat.android", "Snapchat", "Social", "👻", "https://web.snapchat.com"],
    ["com.discord", "Discord", "Social", "🎮", "https://discord.com/app"],
    ["com.zhiliaoapp.musically", "TikTok", "Social", "🎵", "https://www.tiktok.com"],
    ["com.spotify.music", "Spotify", "Music & video", "🎧", "https://open.spotify.com"],
    ["com.soundcloud.android", "SoundCloud", "Music & video", "☁️", "https://soundcloud.com"],
    ["com.google.android.youtube", "YouTube", "Music & video", "▶️", "https://www.youtube.com"],
    ["com.netflix.mediaclient", "Netflix", "Music & video", "🎬", "https://www.netflix.com"],
    ["com.roblox.client", "Roblox", "Games", "🧱", "https://www.roblox.com"],
    ["com.mojang.minecraftpe", "Minecraft", "Games", "⛏", ""],
    ["com.king.candycrushsaga", "Candy Crush Saga", "Games", "🍬", ""],
    ["com.supercell.clashofclans", "Clash of Clans", "Games", "🏰", ""],
    ["com.duolingo", "Duolingo", "Learning & tools", "🦉", "https://www.duolingo.com"],
    ["com.google.android.apps.maps", "Google Maps", "Learning & tools", "🗺", "https://www.google.com/maps"],
    ["com.google.android.apps.translate", "Google Translate", "Learning & tools", "🌍", "https://translate.google.com"],
  ];
  const NAT = () => window.BV.android?.available ? window.BV.android : null;
  function openPlay(pkg) {
    const name = ANDROID_APPS.find(a => a[0] === pkg)?.[1];
    store.set("playSent", [{ pkg, name, t: Date.now() }, ...store.get("playSent", []).filter(x => x.pkg !== pkg)].slice(0, 20));
    if (NAT()) NAT().openPlay(pkg); else window.open(PLAY_APP(pkg), "_blank", "noopener");
  }
  const playSearch = q => NAT() ? NAT().search(q) : window.open(PLAY_SEARCH(q), "_blank", "noopener");

  /* ================= Blockvile Store (Play-Store-style) ================= */
  A.push({
    id: "store", name: "Blockvile Store", icon: "🛍", bg: "linear-gradient(135deg,#22c55e 0%,#2f6bff 55%,#ff6a3d 100%)", cat: "System", system: true, dock: true,
    keywords: "app store play store install apps download games", size: [820, 640],
    render(body, os, args) {
      let tab = args?.tab || "home", q = "", detail = null, cat = null; const installing = {};
      body.style.padding = "0";
      const meta = a => a.web ? [`Website · ${hostOf(a.url)}`, `Opens ${a.url} as an app.`, ["Runs in its own window", "Open in real browser any time"]] : (META[a.id] || ["A Blockvile app", "", []]);
      const hostOf = u => { try { return new URL(u).hostname; } catch { return u; } };
      const btn = a => {
        if (installing[a.id] !== undefined) return `<div class="ps-prog"><i style="width:${installing[a.id]}%"></i><span>${installing[a.id]}%</span></div>`;
        if (os.isInstalled(a.id)) return `<button class="ps-btn ghost" data-openapp="${a.id}">Open</button>`;
        return `<button class="ps-btn" data-get="${a.id}">Install</button>`;
      };
      const card = a => `<div class="ps-card" data-detail="${a.id}"><i class="app-ic" style="background:${a.bg}">${a.icon}</i><b>${esc(a.name)}</b><small>${a.cat}</small><small>${os.isInstalled(a.id) ? "✓ Installed" : sizeOf(a)}</small></div>`;
      const row = (a, rank) => `<div class="ps-row" data-detail="${a.id}">${rank ? `<span class="ps-rank">${rank}</span>` : ""}<i class="app-ic" style="background:${a.bg}">${a.icon}</i>
        <div><b>${esc(a.name)}</b><small>${esc(meta(a)[0])}</small><small>${a.cat} · ${sizeOf(a)}</small></div>${btn(a)}</div>`;
      const section = (title, apps) => apps.length ? `<div class="ps-sec"><h3>${title}</h3><div class="ps-scroll">${apps.map(card).join("")}</div></div>` : "";
      const all = () => os.apps().filter(a => !a.hidden && !a.native);

      const views = {
        home() {
          const notInst = all().filter(a => !os.isInstalled(a.id));
          const feat = notInst[Math.floor(Date.now() / 86400000) % Math.max(1, notInst.length)] || all().find(a => a.id === "cloudmusic") || all()[0];
          return `<div class="ps-hero" style="background:${feat.bg}" data-detail="${feat.id}"><div><small>${notInst.includes(feat) ? "FEATURED" : "EDITORS' PICK"}</small><h2>${esc(feat.name)}</h2><p>${esc(meta(feat)[0])}</p>${btn(feat)}</div><span>${feat.icon}</span></div>
            ${section("✨ Get something new", notInst)}
            ${section("🎮 Games", all().filter(a => a.cat === "Games"))}
            ${section("🎧 Music & media", all().filter(a => a.cat === "Media" || a.cat === "Music & audio"))}
            ${section("📋 Get things done", all().filter(a => a.cat === "Productivity" || a.cat === "Tools"))}
            ${section("🌐 Internet", all().filter(a => a.cat === "Internet" || a.cat === "Web apps"))}`;
        },
        top() {
          const opens = store.get("opens", {});
          const ranked = all().slice().sort((a, b) => (opens[b.id] || 0) - (opens[a.id] || 0) || a.name.localeCompare(b.name));
          return `<div class="ps-sec"><h3>🏆 Top charts</h3><p class="muted" style="margin:-6px 0 10px;font-size:12px">Ranked by how often apps are opened on this device</p>${ranked.map((a, i) => row(a, i + 1)).join("")}</div>`;
        },
        cats() {
          const cats = [...new Set(all().map(a => a.cat || "Other"))];
          if (cat) return `<div class="ps-sec"><button class="btn ghost" data-cat="">‹ All categories</button><h3 style="margin-top:12px">${CAT_IC[cat] || "📦"} ${cat}</h3>${all().filter(a => a.cat === cat).map(a => row(a)).join("")}</div>`;
          return `<div class="ps-sec"><h3>Categories</h3><div class="ps-cats">${cats.map(c => `<button data-cat="${c}"><span>${CAT_IC[c] || "📦"}</span>${c}<small>${all().filter(a => a.cat === c).length} apps</small></button>`).join("")}</div></div>`;
        },
        android() {
          const sent = store.get("playSent", []);
          const groups = [...new Set(ANDROID_APPS.map(a => a[2]))];
          const nat = NAT(), has = pkg => nat && nat.installed(pkg), pending = store.get("pendingPlay", []);
          const getBtn = pkg => has(pkg) ? `<button class="ps-btn ghost" data-natopen="${esc(pkg)}">Open</button>`
            : nat ? `<button class="ps-btn" data-playget="${esc(pkg)}">${pending.includes(pkg) ? "Installing…" : "Install"}</button>` : `<button class="ps-btn" data-playget="${esc(pkg)}">Get ↗</button>`;
          const arow = a => { const [pkg, name, c, ic, web] = a;
            return `<div class="ps-row"><i class="app-ic" style="background:${has(pkg) ? "transparent" : CAT_BG[c] || "#64748b"}">${has(pkg) ? nat.icon(pkg) ? `<img class="nat-ic" src="${nat.icon(pkg)}" alt="">` : ic : ic}</i><div><b>${esc(name)}</b><small>${has(pkg) ? "✓ Installed on this phone" : c + " · " + pkg}</small></div>
              ${web && !nat ? `<button class="ps-btn ghost" data-shortcut="${pkg}" title="Add the web version to your home screen">＋ Web</button>` : ""}${getBtn(pkg)}</div>`; };
          if (nat) return `<div class="ps-note"><b>🤖 Android apps</b><p><b>Install</b> opens the app in Google Play — tap Install there, then come back. Blockvile spots the new app and puts it on your home screen.</p>
              <button class="btn ghost" data-openapp="androidapps" style="margin-top:8px">📱 All apps on this phone (${nat.apps().length})</button></div>
            <div class="ps-sec"><h3>Search Google Play</h3><div class="toolbar"><input class="field" data-play placeholder="App name, Play link, or package (com.example.app)" style="flex:1;min-width:180px"><button class="btn" data-playgo>Search</button></div></div>
            ${sent.length ? `<div class="ps-sec"><h3>🕘 Recent</h3>${sent.slice(0, 5).map(x => `<div class="ps-row"><i class="app-ic" style="background:#64748b">📦</i><div><b>${esc(x.name || x.pkg)}</b><small>${has(x.pkg) ? "✓ Installed" : esc(x.pkg)}</small></div>${getBtn(x.pkg)}</div>`).join("")}</div>` : ""}
            ${groups.map(g => `<div class="ps-sec"><h3>${g}</h3>${ANDROID_APPS.filter(a => a[2] === g).map(arow).join("")}</div>`).join("")}
            <p class="muted" style="font-size:11px;margin-top:14px">Apps are installed by Google Play. App names belong to their owners; Blockvile isn't affiliated with them.</p>`;
          return `<div class="ps-note"><b>🤖 Android apps from Google Play</b><p>${IS_ANDROID
              ? "You're on Android: <b>Get</b> opens the app's page in the Play Store so you can install it on this phone."
              : "<b>Get</b> opens the app's Google Play page. Signed in to Google Play, you can install it straight to your Android phone from there."}
              Android apps can't run inside Blockvile itself — but many have web versions you can add as Blockvile apps.</p></div>
            <div class="ps-sec"><h3>Search Google Play</h3><div class="toolbar"><input class="field" data-play placeholder="App name, Play link, or package (com.example.app)" style="flex:1;min-width:180px"><button class="btn" data-playgo>Go ↗</button></div></div>
            ${sent.length ? `<div class="ps-sec"><h3>🕘 Recently sent to Play</h3>${sent.slice(0, 5).map(x => `<div class="ps-row"><i class="app-ic" style="background:#64748b">📦</i><div><b>${esc(x.name || x.pkg)}</b><small>${esc(x.pkg)}</small></div><button class="ps-btn ghost" data-playget="${esc(x.pkg)}">Open ↗</button></div>`).join("")}</div>` : ""}
            ${groups.map(g => `<div class="ps-sec"><h3>${g}</h3>${ANDROID_APPS.filter(a => a[2] === g).map(arow).join("")}</div>`).join("")}
            <p class="muted" style="font-size:11px;margin-top:14px">App names belong to their owners. Blockvile isn't affiliated with Google Play or these apps.</p>`;
        },
        lib() {
          const inst = all().filter(a => os.isInstalled(a.id)), webs = store.get("webapps", []);
          return `<div class="ps-sec"><h3>➕ Add a website as an app</h3>
              <div class="toolbar"><input class="field" data-wname placeholder="Name" style="flex:1;min-width:110px"><input class="field" data-wurl placeholder="https://…" style="flex:2;min-width:160px"><input class="field" data-wicon placeholder="Emoji" maxlength="2" style="width:70px"><button class="btn" data-addweb>Add</button></div>
              <label class="row" style="font-size:13px;margin-bottom:6px"><input type="checkbox" data-wext> Open in a new browser tab (for sites like YouTube that block apps)</label>
              <p class="muted" style="font-size:11px;margin-top:-4px">Some sites block being shown inside apps. Those still open with “↗ Open in browser”.</p></div>
            <div class="ps-sec"><h3>📦 Installed (${inst.length})</h3>${inst.map(a => `<div class="ps-row" data-detail="${a.id}"><i class="app-ic" style="background:${a.bg}">${a.icon}</i><div><b>${esc(a.name)}</b><small>${a.system ? "System app" : a.web ? "Web app" : a.cat} · ${sizeOf(a)}</small></div>
              <button class="ps-btn ghost" data-openapp="${a.id}">Open</button>${a.system ? "" : `<button class="ps-btn ghost" data-uninstall="${a.id}">${a.web ? "Remove" : "Uninstall"}</button>`}</div>`).join("")}</div>
            ${webs.length ? "" : ""}`;
        },
        search() {
          const ql = q.toLowerCase();
          const r = all().filter(a => a.name.toLowerCase().includes(ql) || (a.keywords || "").includes(ql) || (a.cat || "").toLowerCase().includes(ql) || meta(a)[1].toLowerCase().includes(ql));
          return `<div class="ps-sec"><h3>Results for “${esc(q)}”</h3>${r.map(a => row(a)).join("") || `<p class="muted">No Blockvile apps found. Try “game”, “music” or “photo”.</p>`}
            <div class="ps-row" data-playsearch="${esc(q)}"><i class="app-ic" style="background:linear-gradient(135deg,#34d399,#2563eb)">🤖</i><div><b>Search Android apps for “${esc(q)}”</b><small>${NAT() ? "Search Google Play" : "Opens Google Play"}</small></div><span class="ps-btn ghost">↗</span></div></div>`;
        },
      };
      const detailView = a => {
        const [tag, desc, feats] = meta(a), perms = a.web ? ["🌐 Internet"] : (PERMS[a.id] || ["No special permissions"]);
        return `<div class="ps-detail"><button class="btn ghost" data-back>‹ Back</button>
          <div class="ps-dhead"><i class="app-ic" style="background:${a.bg}">${a.icon}</i><div><h2>${esc(a.name)}</h2><small style="color:var(--accent)">${a.web ? esc(hostOf(a.url)) : "Blockvile Labs"}</small><small>${a.system ? "Pre-installed system app" : esc(tag)}</small></div></div>
          <div class="ps-dbtns">${btn(a)}${os.isInstalled(a.id) && !a.system ? `<button class="ps-btn ghost" data-uninstall="${a.id}">${a.web ? "Remove" : "Uninstall"}</button>` : ""}</div>
          <div class="ps-info"><div><b>${a.cat}</b><small>Category</small></div><div><b>${sizeOf(a)}</b><small>Size</small></div><div><b>${a.web ? "Web" : "3.0"}</b><small>Version</small></div><div><b>Free</b><small>Price</small></div></div>
          <div class="ps-preview" style="background:${a.bg}"><span>${a.icon}</span><b>${esc(a.name)}</b><small>${esc(tag)}</small></div>
          <h3>About this app</h3><p>${esc(desc || tag)}</p>
          ${feats.length ? `<ul class="ps-feats">${feats.map(f => `<li>✓ ${esc(f)}</li>`).join("")}</ul>` : ""}
          <h3>Permissions</h3><div class="ps-perms">${perms.map(p => `<span>${p}</span>`).join("")}</div>
          <h3>What's new</h3><p class="muted">Updated for Blockvile Plus 3.0 — works in Phone, Tablet and Laptop modes, with dark mode support.</p></div>`;
      };
      const draw = () => {
        const sc = body.querySelector(".ps-main")?.scrollTop || 0;
        const tabsHtml = [["home", "🏠", "For you"], ["top", "🏆", "Top charts"], ["cats", "🗂", "Categories"], ["android", "🤖", "Android"], ["lib", "📦", "Library"]].map(([k, i, l]) => `<button data-tab="${k}" class="${tab === k && !detail && !q ? "on" : ""}"><span>${i}</span>${l}</button>`).join("");
        const content = detail ? detailView(os.apps().find(a => a.id === detail) || all()[0]) : q ? views.search() : views[tab]();
        body.innerHTML = `<div class="ps"><div class="ps-top"><div class="ps-search">⌕<input data-q placeholder="Search apps & games" value="${esc(q)}" aria-label="Search apps">${q ? `<button data-clear>✕</button>` : ""}</div></div>
          <div class="ps-main">${content}</div><nav class="ps-tabs">${tabsHtml}</nav></div>`;
        body.querySelector(".ps-main").scrollTop = sc;
        const qi = body.querySelector("[data-q]");
        qi.oninput = () => { q = qi.value; detail = null; draw(); const n = body.querySelector("[data-q]"); n.focus(); n.setSelectionRange(q.length, q.length); };
      };
      const install = id => {
        installing[id] = 0; draw();
        const t = setInterval(() => {
          installing[id] = Math.min(100, installing[id] + 9 + Math.floor(Math.random() * 12));
          if (installing[id] >= 100) { clearInterval(t); delete installing[id]; os.install(id, true); os.notify({ app: id, icon: os.apps().find(a => a.id === id).icon, title: "App installed", text: os.apps().find(a => a.id === id).name + " is ready to use", sound: false }); }
          if (body.isConnected) draw();
        }, 120);
      };
      body.addEventListener("click", async e => {
        const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; detail = null; q = ""; cat = null; draw(); body.querySelector(".ps-main").scrollTop = 0; return; }
        if (e.target.closest("[data-clear]")) { q = ""; return draw(); }
        const g = e.target.closest("[data-get]"); if (g) { e.stopPropagation(); return install(g.dataset.get); }
        const o = e.target.closest("[data-openapp]"); if (o) { e.stopPropagation(); return os.open(o.dataset.openapp); }
        const u = e.target.closest("[data-uninstall]"); if (u) { e.stopPropagation(); const a = os.apps().find(x => x.id === u.dataset.uninstall);
          if (!(await BV.confirm(`${a.web ? "Remove" : "Uninstall"} ${a.name}?`, { ok: a.web ? "Remove" : "Uninstall", danger: true }))) return;
          if (a.web) { store.set("webapps", store.get("webapps", []).filter(w => w.id !== a.id)); os.unregisterApp(a.id); if (detail === a.id) detail = null; os.toast("🗑 " + a.name + " removed"); }
          else os.install(a.id, false);
          return draw(); }
        const c = e.target.closest("[data-cat]"); if (c) { cat = c.dataset.cat || null; return draw(); }
        if (e.target.closest("[data-back]")) { detail = null; return draw(); }
        const pg = e.target.closest("[data-playget]"); if (pg) { e.stopPropagation(); openPlay(pg.dataset.playget); return draw(); }
        const ps = e.target.closest("[data-playsearch]"); if (ps) return playSearch(ps.dataset.playsearch);
        const no = e.target.closest("[data-natopen]"); if (no) { e.stopPropagation(); return NAT()?.launch(no.dataset.natopen); }
        if (e.target.closest("[data-playgo]")) {
          const v = body.querySelector("[data-play]").value.trim(); if (!v) return;
          const m = v.match(/[?&]id=([\w.]+)/), pkg = m ? m[1] : /^[a-zA-Z]\w*(\.\w+)+$/.test(v) ? v : null;
          if (pkg) { openPlay(pkg); return draw(); } return playSearch(v);
        }
        const sc = e.target.closest("[data-shortcut]"); if (sc) {
          const a = ANDROID_APPS.find(x => x[0] === sc.dataset.shortcut); if (!a) return;
          if (store.get("webapps", []).some(w => w.url === a[4])) return os.toast(a[1] + " is already on your home screen");
          const w = { id: "web-" + Date.now().toString(36), name: a[1], url: a[4], icon: a[3], external: true, bg: CAT_BG[a[2]] };
          store.set("webapps", [...store.get("webapps", []), w]); os.registerApp(webApp(w)); os.toast("✅ " + a[1] + " (web) added to your home screen"); return draw();
        }
        if (e.target.closest("[data-addweb]")) {
          const name = body.querySelector("[data-wname]").value.trim(); let url = body.querySelector("[data-wurl]").value.trim(); const icon = body.querySelector("[data-wicon]").value.trim() || "🌐";
          if (!name || !url) return os.toast("Add a name and a web address");
          if (!/^https?:\/\//i.test(url)) url = "https://" + url;
          try { new URL(url); } catch { return os.toast("That web address doesn't look right"); }
          const hue = [...name].reduce((h, ch) => h + ch.charCodeAt(0), 0) % 360;
          const w = { id: "web-" + Date.now().toString(36), name, url, icon, external: body.querySelector("[data-wext]").checked, bg: `linear-gradient(135deg,hsl(${hue} 70% 55%),hsl(${(hue + 40) % 360} 70% 40%))` };
          store.set("webapps", [...store.get("webapps", []), w]); os.registerApp(webApp(w)); os.toast("✅ " + name + " added to your apps"); return draw();
        }
        const d = e.target.closest("[data-detail]"); if (d) { detail = d.dataset.detail; draw(); body.querySelector(".ps-main").scrollTop = 0; }
      });
      body.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset.play !== undefined) body.querySelector("[data-playgo]").click(); });
      os.onBack("store", () => { if (detail) { detail = null; draw(); return true; } if (q) { q = ""; draw(); return true; } if (cat) { cat = null; draw(); return true; } });
      const onCh = () => { if (!body.contains(document.activeElement) || !/INPUT/.test(document.activeElement.tagName)) draw(); };
      ["bv:changed", "bv:android-apps"].forEach(ev => window.addEventListener(ev, onCh));
      draw();
      return () => ["bv:changed", "bv:android-apps"].forEach(ev => window.removeEventListener(ev, onCh));
    }
  });

  /* ================= Cloud Music (SoundCloud official player) ================= */
  A.push({
    id: "cloudmusic", name: "Cloud Music", icon: "🎧", bg: "linear-gradient(135deg,#ff8a00,#ff3d00)", cat: "Music & audio", net: true, dock: true, size: [520, 680],
    keywords: "soundcloud stream music songs playlist",
    render(body, os) {
      let tab = "player", cur = store.get("cloudNow", null);
      const lib = () => store.get("cloudLib", []);
      const isSC = u => { try { const h = new URL(u).hostname; return /(^|\.)soundcloud\.com$/.test(h) || h === "snd.sc"; } catch { return false; } };
      const niceTitle = u => { try { const p = new URL(u).pathname.split("/").filter(Boolean); return p.map(x => x.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())).join(" — ") || u; } catch { return u; } };
      const player = (u, auto) => `https://w.soundcloud.com/player/?url=${encodeURIComponent(u)}&color=%23ff5500&auto_play=${auto ? "true" : "false"}&visual=true&show_comments=true&show_reposts=false&hide_related=false`;
      const add = async u => {
        u = u.trim(); if (!/^https?:\/\//.test(u)) u = "https://" + u;
        if (!isSC(u)) return os.toast("Paste a SoundCloud link (soundcloud.com/…)"), null;
        if (lib().some(x => x.url === u)) return lib().find(x => x.url === u);
        let item = { id: Date.now().toString(36), url: u, title: niceTitle(u), thumb: "", added: Date.now() };
        try { const r = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(u)}`); if (r.ok) { const j = await r.json(); item.title = j.title || item.title; item.thumb = j.thumbnail_url || ""; item.author = j.author_name || ""; } } catch { }
        store.set("cloudLib", [item, ...lib()]); os.toast("➕ Added to your library"); return item;
      };
      const play = (item, auto = true) => { cur = item; store.set("cloudNow", item); tab = "player"; draw(auto); };
      const draw = (auto = false) => {
        const L = lib();
        const tabsH = [["player", "▶ Player"], ["library", `📚 Library (${L.length})`], ["discover", "🔎 Discover"]].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? "on" : ""}">${l}</button>`).join("");
        let html = "";
        if (tab === "player") html = cur
          ? `<div class="cm-now"><b>${esc(cur.title)}</b>${cur.author ? `<small>${esc(cur.author)}</small>` : ""}</div>
             <iframe class="cm-frame" allow="autoplay; encrypted-media" src="${player(cur.url, auto)}" title="SoundCloud player"></iframe>
             <div class="toolbar" style="margin-top:8px"><button class="btn ghost" data-prev>⏮ Previous</button><button class="btn ghost" data-next>Next ⏭</button><button class="btn ghost" data-ext style="margin-left:auto">↗ Open on SoundCloud</button></div>`
          : `<div class="cm-empty"><div style="font-size:64px">🎧</div><h3>Nothing playing yet</h3><p class="muted">Paste a SoundCloud link to a track, playlist or artist.</p></div>`;
        if (tab === "library") html = L.length ? `<div class="list">${L.map(x => `<div class="cm-item ${cur?.url === x.url ? "on" : ""}" data-play="${x.id}">${x.thumb ? `<img src="${esc(x.thumb)}" alt="">` : `<span class="cm-ph">🎵</span>`}<span class="cm-t"><b>${esc(x.title)}</b><small>${esc(x.author || new URL(x.url).pathname.split("/")[1] || "")}</small></span><button data-rm="${x.id}" aria-label="Remove">🗑</button></div>`).join("")}</div>`
          : `<div class="cm-empty"><div style="font-size:48px">📚</div><p class="muted">Your library is empty. Add links below or from Discover.</p></div>`;
        if (tab === "discover") html = `<div class="cm-empty" style="padding:16px 8px"><h3>Find music on SoundCloud</h3><p class="muted">Search opens SoundCloud in a new tab. Copy the link of any track, playlist or artist, then paste it below to play it here.</p>
            <div class="toolbar" style="justify-content:center;margin-top:12px"><input class="field" data-sq placeholder="Artist, track, genre…" style="flex:1;min-width:160px"><button class="btn" data-search>Search ↗</button></div>
            <div class="toolbar" style="justify-content:center">${["lofi", "chill", "hip hop", "house", "drum and bass", "podcasts", "piano", "rock"].map(g => `<button class="btn ghost" data-genre="${g}">#${g}</button>`).join("")}</div></div>`;
        body.innerHTML = `<div class="seg">${tabsH}</div>${html}
          <div class="cm-add"><input class="field" data-url placeholder="Paste a SoundCloud link…" aria-label="SoundCloud link"><button class="btn" data-addplay>▶ Play</button><button class="btn ghost" data-addonly>＋ Save</button></div>
          ${os.state.flags.airplane ? `<p class="muted" style="font-size:12px">✈ Airplane mode is on — streaming needs internet.</p>` : ""}
          <p class="muted" style="font-size:10px;margin-top:6px">Music streamed with SoundCloud's official embedded player.</p>`;
      };
      const step = d => { const L = lib(); if (!L.length) return; const i = L.findIndex(x => x.url === cur?.url); play(L[(i + d + L.length) % L.length]); };
      body.addEventListener("click", async e => {
        const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; return draw(); }
        const rm = e.target.closest("[data-rm]"); if (rm) { e.stopPropagation(); store.set("cloudLib", lib().filter(x => x.id !== rm.dataset.rm)); return draw(); }
        const p = e.target.closest("[data-play]"); if (p) return play(lib().find(x => x.id === p.dataset.play));
        if (e.target.closest("[data-prev]")) return step(-1);
        if (e.target.closest("[data-next]")) return step(1);
        if (e.target.closest("[data-ext]") && cur) return window.open(cur.url, "_blank", "noopener");
        const g = e.target.closest("[data-genre]"); if (g) return window.open("https://soundcloud.com/search?q=" + encodeURIComponent(g.dataset.genre), "_blank", "noopener");
        if (e.target.closest("[data-search]")) { const q = body.querySelector("[data-sq]").value.trim(); if (q) window.open("https://soundcloud.com/search?q=" + encodeURIComponent(q), "_blank", "noopener"); return; }
        if (e.target.closest("[data-addplay]") || e.target.closest("[data-addonly]")) {
          const v = body.querySelector("[data-url]").value; if (!v.trim()) return;
          const item = await add(v); if (!item) return;
          if (e.target.closest("[data-addplay]")) play(item); else draw();
        }
      });
      body.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset.url !== undefined) body.querySelector("[data-addplay]").click();
        if (e.key === "Enter" && e.target.dataset.sq !== undefined) body.querySelector("[data-search]").click(); });
      body.addEventListener("paste", e => { if (e.target.dataset.url !== undefined) setTimeout(() => { if (isSC(e.target.value.trim())) body.querySelector("[data-addplay]").click(); }, 0); });
      draw();
    }
  });

  /* ================= 2048 (installable game) ================= */
  A.push({
    id: "g2048", name: "2048", icon: "🔢", bg: "linear-gradient(135deg,#f59e0b,#ea580c)", cat: "Games", defaultOff: true, size: [420, 620], keywords: "game puzzle numbers",
    render(body, os) {
      let g, score, best = store.get("best2048", 0), over = false;
      const empty = () => { const e = []; g.forEach((r, y) => r.forEach((v, x) => !v && e.push([y, x]))); return e; };
      const spawn = () => { const e = empty(); if (!e.length) return; const [y, x] = e[Math.floor(Math.random() * e.length)]; g[y][x] = Math.random() < .9 ? 2 : 4; };
      const reset = () => { g = Array.from({ length: 4 }, () => [0, 0, 0, 0]); score = 0; over = false; spawn(); spawn(); draw(); };
      const COL = { 2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563", 32: "#f67c5f", 64: "#f65e3b", 128: "#edcf72", 256: "#edcc61", 512: "#edc850", 1024: "#edc53f", 2048: "#edc22e" };
      const draw = () => {
        body.innerHTML = `<div class="g2-head"><b>2048</b><span class="g2-score">Score<b>${score}</b></span><span class="g2-score">Best<b>${best}</b></span><button class="btn" data-new>New</button></div>
          <div class="g2-board">${g.flat().map(v => `<div class="g2-t" style="background:${v ? COL[v] || "#3c3a32" : "var(--bg)"};color:${v > 4 ? "#fff" : "#776e65"};font-size:${v > 512 ? 26 : 32}px">${v || ""}</div>`).join("")}</div>
          <p class="muted center" style="margin-top:10px">${over ? "<b>Game over!</b> Tap New to play again." : "Arrow keys or swipe to slide tiles"}</p>`;
      };
      const slide = row => { const r = row.filter(Boolean); for (let i = 0; i < r.length - 1; i++) if (r[i] === r[i + 1]) { r[i] *= 2; score += r[i]; r.splice(i + 1, 1); } while (r.length < 4) r.push(0); return r; };
      const move = d => {
        if (over) return; const before = JSON.stringify(g);
        for (let i = 0; i < 4; i++) {
          let line = d === "L" || d === "R" ? g[i].slice() : g.map(r => r[i]);
          if (d === "R" || d === "D") line.reverse(); line = slide(line); if (d === "R" || d === "D") line.reverse();
          if (d === "L" || d === "R") g[i] = line; else line.forEach((v, y) => g[y][i] = v);
        }
        if (JSON.stringify(g) !== before) { spawn(); if (score > best) { best = score; store.set("best2048", best); } }
        if (!empty().length && !g.some((r, y) => r.some((v, x) => r[x + 1] === v || g[y + 1]?.[x] === v))) over = true;
        draw();
      };
      const kd = e => { if (!isTop(body)) return; const m = { ArrowLeft: "L", ArrowRight: "R", ArrowUp: "U", ArrowDown: "D" }[e.key]; if (m && !e.shiftKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); move(m); } };
      document.addEventListener("keydown", kd);
      let t0; body.addEventListener("pointerdown", e => t0 = [e.clientX, e.clientY]);
      body.addEventListener("pointerup", e => { if (!t0) return; const dx = e.clientX - t0[0], dy = e.clientY - t0[1]; t0 = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return; move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : (dy > 0 ? "D" : "U")); });
      body.addEventListener("click", e => { if (e.target.closest("[data-new]")) reset(); });
      reset();
      return () => document.removeEventListener("keydown", kd);
    }
  });

  /* ================= Tic-Tac-Toe (installable game) ================= */
  A.push({
    id: "tictactoe", name: "Tic-Tac-Toe", icon: "⭕", bg: "linear-gradient(135deg,#6366f1,#ec4899)", cat: "Games", defaultOff: true, size: [400, 600], keywords: "game noughts crosses xo",
    render(body) {
      let b, turn, mode = "hard", wins = { X: 0, O: 0, D: 0 };
      const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
      const winner = s => { for (const [a, c, d] of L) if (s[a] && s[a] === s[c] && s[a] === s[d]) return s[a]; return s.every(Boolean) ? "D" : null; };
      const mm = (s, p) => { const w = winner(s); if (w === "O") return [10]; if (w === "X") return [-10]; if (w === "D") return [0];
        let best = [p === "O" ? -99 : 99]; s.forEach((v, i) => { if (v) return; s[i] = p; const sc = mm(s, p === "O" ? "X" : "O")[0]; s[i] = null;
          if (p === "O" ? sc > best[0] : sc < best[0]) best = [sc, i]; }); return best; };
      const ai = () => { const free = b.map((v, i) => v ? null : i).filter(i => i !== null);
        const i = mode === "easy" && Math.random() < .6 ? free[Math.floor(Math.random() * free.length)] : mm(b.slice(), "O")[1]; b[i] = "O"; turn = "X"; };
      const reset = () => { b = Array(9).fill(null); turn = "X"; draw(); };
      const draw = () => {
        const w = winner(b);
        body.innerHTML = `<div class="seg">${[["easy", "🙂 Easy AI"], ["hard", "🤖 Hard AI"], ["2p", "👥 2 players"]].map(([k, l]) => `<button data-mode="${k}" class="${mode === k ? "on" : ""}">${l}</button>`).join("")}</div>
          <p class="center" style="font-size:18px;margin-bottom:10px">${w ? (w === "D" ? "It's a draw 🤝" : `${w} wins! 🎉`) : `${turn}'s turn`}</p>
          <div class="ttt">${b.map((v, i) => `<button data-c="${i}" class="${v === "X" ? "x" : v === "O" ? "o" : ""}">${v || ""}</button>`).join("")}</div>
          <div class="row" style="justify-content:center;margin-top:12px"><small class="muted">X ${wins.X} · O ${wins.O} · Draws ${wins.D}</small><button class="btn" data-new>New game</button></div>`;
      };
      body.addEventListener("click", e => {
        const m = e.target.closest("[data-mode]"); if (m) { mode = m.dataset.mode; return reset(); }
        if (e.target.closest("[data-new]")) return reset();
        const c = e.target.closest("[data-c]"); if (!c || winner(b) || b[c.dataset.c]) return;
        b[c.dataset.c] = turn; turn = turn === "X" ? "O" : "X";
        if (!winner(b) && mode !== "2p" && turn === "O") ai();
        const w = winner(b); if (w) wins[w]++;
        draw();
      });
      reset();
    }
  });

  /* ================= Unit converter (installable tool) ================= */
  A.push({
    id: "converter", name: "Converter", icon: "📐", bg: "linear-gradient(135deg,#14b8a6,#0e7490)", cat: "Tools", defaultOff: true, size: [460, 520], keywords: "units convert length weight temperature",
    render(body) {
      const U = {
        Length: { m: 1, km: 1000, cm: .01, mm: .001, mi: 1609.344, yd: .9144, ft: .3048, in: .0254 },
        Weight: { kg: 1, g: .001, mg: 1e-6, lb: .45359237, oz: .028349523, st: 6.35029318, t: 1000 },
        Temperature: { "°C": "c", "°F": "f", K: "k" },
        Speed: { "km/h": 1 / 3.6, mph: .44704, "m/s": 1, knot: .514444 },
        Area: { "m²": 1, "km²": 1e6, "ft²": .09290304, acre: 4046.8564, hectare: 1e4 },
        Data: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 },
      };
      let cat = "Length";
      const toC = (v, u) => u === "c" ? v : u === "f" ? (v - 32) * 5 / 9 : v - 273.15;
      const fromC = (v, u) => u === "c" ? v : u === "f" ? v * 9 / 5 + 32 : v + 273.15;
      const conv = (v, a, b) => cat === "Temperature" ? fromC(toC(v, U[cat][a]), U[cat][b]) : v * U[cat][a] / U[cat][b];
      const draw = () => {
        const units = Object.keys(U[cat]);
        body.innerHTML = `<div class="seg" style="flex-wrap:wrap">${Object.keys(U).map(c => `<button data-cat="${c}" class="${c === cat ? "on" : ""}">${c}</button>`).join("")}</div>
          <div class="conv"><input class="field" type="number" data-v value="1"><select class="field" data-a>${units.map((u, i) => `<option ${i === 0 ? "selected" : ""}>${u}</option>`).join("")}</select>
          <button class="btn ghost" data-swap>⇅</button>
          <output class="field" data-out></output><select class="field" data-b>${units.map((u, i) => `<option ${i === 1 ? "selected" : ""}>${u}</option>`).join("")}</select></div>
          <div class="list" data-all style="margin-top:14px"></div>`;
        calc();
      };
      const calc = () => {
        const v = parseFloat(body.querySelector("[data-v]").value), a = body.querySelector("[data-a]").value, b = body.querySelector("[data-b]").value;
        const f = n => isFinite(n) ? (+n.toPrecision(8)).toLocaleString(undefined, { maximumFractionDigits: 8 }) : "—";
        body.querySelector("[data-out]").textContent = f(conv(v, a, b));
        body.querySelector("[data-all]").innerHTML = Object.keys(U[cat]).filter(u => u !== a).map(u => `<div><span>${u}</span><b>${f(conv(v, a, u))}</b></div>`).join("");
      };
      body.addEventListener("click", e => { const c = e.target.closest("[data-cat]"); if (c) { cat = c.dataset.cat; draw(); }
        if (e.target.closest("[data-swap]")) { const a = body.querySelector("[data-a]"), b = body.querySelector("[data-b]"); [a.value, b.value] = [b.value, a.value]; calc(); } });
      body.addEventListener("input", calc); body.addEventListener("change", calc);
      draw();
    }
  });
})();
