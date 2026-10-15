/* Blockvile Plus OS — media, internet & game apps */
(() => {
  const { esc, fmtSize, download } = window.BV;
  const A = window.BV_APPS;
  const isTop = body => { const w = body.closest(".win"); if (!w || w.classList.contains("min")) return false;
    return +w.style.zIndex === Math.max(...[...document.querySelectorAll(".win:not(.min)")].map(x => +x.style.zIndex)); };

  /* ---------------- Weather (live) ---------------- */
  A.push({
    id: "weather", name: "Weather", icon: "🌤", bg: "linear-gradient(135deg,#5ab0ff,#3a6bff)", cat: "Internet", net: true, keywords: "forecast temperature rain",
    render(body, os) {
      const draw = w => {
        if (!w) { body.innerHTML = `<div class="weather-hero"><b>--°</b><div>Weather unavailable — check your connection</div></div>${ctl()}`; return; }
        const [ic, desc] = os.wxInfo(w.code);
        body.innerHTML = `<div class="weather-hero"><div>📍 ${esc(w.loc)}</div><div style="font-size:48px">${ic}</div><b>${w.temp}°</b><div>${desc} · H ${w.daily[0].max}° L ${w.daily[0].min}°</div></div>
          <div class="stat"><div><b>${w.wind} km/h</b><small>Wind</small></div><div><b>${w.hum}%</b><small>Humidity</small></div><div><b>${new Date(w.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b><small>Updated</small></div></div>
          <div class="forecast" style="grid-template-columns:repeat(${w.daily.length - 1},1fr)">${w.daily.slice(1).map(d => `<div>${new Date(d.d + "T12:00").toLocaleDateString([], { weekday: "short" })}<div style="font-size:24px">${os.wxInfo(d.code)[0]}</div>${d.max}° <small class="muted">${d.min}°</small></div>`).join("")}</div>${ctl()}`;
      };
      const ctl = () => `<div class="toolbar" style="margin-top:14px"><input class="field" data-city placeholder="Search a city" style="flex:1;min-width:120px"><button class="btn" data-go>Go</button><button class="btn ghost" data-me>📍 My location</button><button class="btn ghost" data-r>↻</button></div>
        <p class="muted" style="font-size:11px">Live data from Open-Meteo.</p>`;
      body.innerHTML = `<p class="muted center" style="padding:30px">Loading weather…</p>`;
      os.weather().then(draw);
      body.addEventListener("click", async e => {
        if (e.target.closest("[data-r]")) draw(await os.weather(true));
        if (e.target.closest("[data-go]")) {
          const q = body.querySelector("[data-city]").value.trim(); if (!q) return;
          try { const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`)).json();
            const p = r.results?.[0]; if (!p) return os.toast("City not found"); draw(await os.weather(true, { name: p.name, lat: p.latitude, lon: p.longitude })); }
          catch { os.toast("Search failed — offline?"); }
        }
        if (e.target.closest("[data-me]")) {
          if (!navigator.geolocation) return os.toast("Location not available");
          navigator.geolocation.getCurrentPosition(async p => draw(await os.weather(true, { name: "My location", lat: p.coords.latitude, lon: p.coords.longitude })), () => os.toast("Location permission denied"));
        }
      });
      body.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset.city !== undefined) body.querySelector("[data-go]").click(); });
    }
  });

  /* ---------------- Gallery ---------------- */
  A.push({
    id: "gallery", name: "Gallery", icon: "🖼", bg: "linear-gradient(135deg,#ff6aa2,#b84dff)", cat: "Media", dock: true, keywords: "photos pictures images",
    render(body, os) {
      let urls = [], items = [], idx = -1;
      const free = () => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; };
      const draw = async () => {
        free(); items = await os.idb.all("photos").catch(() => []);
        urls = items.map(p => URL.createObjectURL(p.blob));
        body.innerHTML = `<div class="toolbar"><button class="btn" data-add>＋ Add photos</button><button class="btn ghost" data-cam>📷 Camera</button><button class="btn ghost" data-paint>🎨 Paint</button><small class="muted" style="margin-left:auto">${items.length} photos</small><input type="file" accept="image/*" multiple hidden data-file></div>
          ${items.length ? `<div class="gallery">${urls.map((u, i) => `<img src="${u}" data-i="${i}" alt="${esc(items[i].name || "Photo")}" loading="lazy">`).join("")}</div>` : `<p class="muted center" style="padding:40px">No photos yet.<br>Add some, take one with Camera, or draw in Paint.</p>`}`;
      };
      const view = i => {
        idx = i; body.querySelector(".viewer")?.remove();
        if (i < 0) return;
        const v = document.createElement("div"); v.className = "viewer";
        v.innerHTML = `<img src="${urls[i]}" alt=""><div class="toolbar"><button class="btn ghost" data-v="prev">◀</button><button class="btn ghost" data-v="wall">Set wallpaper</button><button class="btn ghost" data-v="dl">Download</button><button class="btn ghost" data-v="del">🗑 Delete</button><button class="btn ghost" data-v="close">✕</button><button class="btn ghost" data-v="next">▶</button></div>`;
        body.style.position = "relative"; body.appendChild(v);
      };
      body.addEventListener("click", async e => {
        if (e.target.closest("[data-add]")) return body.querySelector("[data-file]").click();
        if (e.target.closest("[data-cam]")) return os.open("camera");
        if (e.target.closest("[data-paint]")) return os.open("paint");
        const im = e.target.closest("[data-i]"); if (im) return view(+im.dataset.i);
        const a = e.target.closest("[data-v]")?.dataset.v; if (!a) return;
        const it = items[idx];
        if (a === "close") view(-1);
        if (a === "prev") view((idx - 1 + items.length) % items.length);
        if (a === "next") view((idx + 1) % items.length);
        if (a === "wall") os.setWallpaperBlob(it.blob);
        if (a === "dl") download(it.blob, it.name || "photo.png");
        if (a === "del" && confirm("Delete this photo?")) { await os.idb.del("photos", it.id); await draw(); }
      });
      body.addEventListener("change", async e => { if (e.target.dataset.file === undefined) return;
        for (const f of e.target.files) await os.idb.put("photos", { name: f.name, blob: f }); draw(); });
      os.onBack("gallery", () => { if (idx >= 0 && body.querySelector(".viewer")) { view(-1); return true; } });
      draw();
      return free;
    }
  });

  /* ---------------- Camera ---------------- */
  A.push({
    id: "camera", name: "Camera", icon: "📷", bg: "linear-gradient(135deg,#3d3d3d,#111)", cat: "Media", keywords: "photo selfie picture",
    render(body, os) {
      let stream = null, facing = "user";
      body.innerHTML = `<video autoplay playsinline muted style="width:100%;border-radius:16px;background:#000;max-height:65%;object-fit:cover"></video>
        <p class="center muted" data-m style="margin:8px 0">Asking for camera…</p>
        <div class="row" style="justify-content:center"><button class="btn ghost" data-flip>🔄</button><button class="btn" data-snap style="width:64px;height:64px;border-radius:50%;font-size:24px">📸</button><button class="btn ghost" data-gal>🖼</button></div>`;
      const vid = body.querySelector("video"), msg = body.querySelector("[data-m]");
      const start = async () => {
        stream?.getTracks().forEach(t => t.stop());
        if (!navigator.mediaDevices?.getUserMedia) return msg.textContent = "Camera not supported here.";
        try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } }); vid.srcObject = stream; msg.textContent = "Ready"; }
        catch { msg.textContent = "Camera not available or permission denied."; }
      };
      body.addEventListener("click", e => {
        if (e.target.closest("[data-flip]")) { facing = facing === "user" ? "environment" : "user"; start(); }
        if (e.target.closest("[data-gal]")) os.open("gallery");
        if (e.target.closest("[data-snap]")) {
          if (!stream) return os.toast("No camera");
          const c = document.createElement("canvas"); c.width = vid.videoWidth; c.height = vid.videoHeight; c.getContext("2d").drawImage(vid, 0, 0);
          body.animate([{ opacity: .2 }, { opacity: 1 }], 250); os.beep(1800, 40, 1, .3);
          c.toBlob(b => os.idb.put("photos", { name: `IMG_${Date.now()}.png`, blob: b }).then(() => os.toast("📸 Saved to Gallery")), "image/png");
        }
      });
      start();
      return () => stream?.getTracks().forEach(t => t.stop());
    }
  });

  /* ---------------- Music player ---------------- */
  A.push({
    id: "music", name: "Music", icon: "🎵", bg: "linear-gradient(135deg,#fb7185,#e11d48)", cat: "Media", dock: true, keywords: "songs audio player mp3",
    render(body, os) {
      const audio = new Audio(); let list = [], i = -1, url = null, shuffle = false, repeat = false;
      audio.volume = os.state.volume / 100;
      const onVol = e => audio.volume = e.detail / 100; window.addEventListener("bv:volume", onVol);
      const fmt = s => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";
      const draw = () => {
        const cur = list[i];
        body.innerHTML = `<div class="music-now"><div class="art">${cur ? "💿" : "🎶"}</div><b>${cur ? esc(cur.name.replace(/\.[^.]+$/, "")) : "Nothing playing"}</b>
          <input type="range" min="0" max="1000" value="0" data-seek aria-label="Seek"><div class="row" style="justify-content:space-between;font-size:12px"><span data-ct>0:00</span><span data-dt>0:00</span></div>
          <div class="music-ctrl"><button data-c="shuffle" style="opacity:${shuffle ? 1 : .5}">🔀</button><button data-c="prev">⏮</button><button data-c="play">${audio.paused ? "▶" : "⏸"}</button><button data-c="next">⏭</button><button data-c="repeat" style="opacity:${repeat ? 1 : .5}">🔁</button></div></div>
          <div class="toolbar"><button class="btn" data-add>＋ Add music files</button><input type="file" accept="audio/*" multiple hidden data-file><small class="muted" style="margin-left:auto">${list.length} songs</small></div>
          ${list.length ? `<div class="list">${list.map((s, n) => `<div data-song="${n}" style="cursor:pointer;${n === i ? "color:var(--accent);font-weight:600" : ""}"><span>${n === i && !audio.paused ? "🔊 " : ""}${esc(s.name)}</span><span class="row"><small>${fmtSize(s.blob.size)}</small><button data-rm="${n}">🗑</button></span></div>`).join("")}</div>` : `<p class="muted center">Add songs from your device — they're saved in this browser.</p>`}`;
      };
      const play = n => { if (!list.length) return; i = (n + list.length) % list.length; if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(list[i].blob); audio.src = url; audio.play().catch(() => { }); draw(); };
      const next = () => play(shuffle ? Math.floor(Math.random() * list.length) : i + 1);
      audio.addEventListener("ended", () => repeat ? play(i) : next());
      audio.addEventListener("play", draw); audio.addEventListener("pause", draw);
      audio.addEventListener("timeupdate", () => { const s = body.querySelector("[data-seek]"); if (!s) return; s.value = audio.duration ? audio.currentTime / audio.duration * 1000 : 0;
        body.querySelector("[data-ct]").textContent = fmt(audio.currentTime); body.querySelector("[data-dt]").textContent = fmt(audio.duration); });
      body.addEventListener("input", e => { if (e.target.dataset.seek !== undefined && audio.duration) audio.currentTime = e.target.value / 1000 * audio.duration; });
      body.addEventListener("click", async e => {
        if (e.target.closest("[data-add]")) return body.querySelector("[data-file]").click();
        const rm = e.target.closest("[data-rm]"); if (rm) { e.stopPropagation(); const n = +rm.dataset.rm; await os.idb.del("music", list[n].id); if (n === i) { audio.pause(); i = -1; } list.splice(n, 1); if (n < i) i--; return draw(); }
        const s = e.target.closest("[data-song]"); if (s) return play(+s.dataset.song);
        const c = e.target.closest("[data-c]")?.dataset.c;
        if (c === "play") { if (i < 0) play(0); else audio.paused ? audio.play().catch(() => { }) : audio.pause(); }
        if (c === "next") next(); if (c === "prev") play(audio.currentTime > 3 ? i : i - 1);
        if (c === "shuffle") { shuffle = !shuffle; draw(); } if (c === "repeat") { repeat = !repeat; draw(); }
      });
      body.addEventListener("change", async e => { if (e.target.dataset.file === undefined) return;
        for (const f of e.target.files) await os.idb.put("music", { name: f.name, blob: f }).catch(() => os.toast("Storage full"));
        list = (await os.idb.all("music").catch(() => [])).reverse(); draw(); });
      os.idb.all("music").then(l => { list = l.reverse(); draw(); }).catch(draw);
      return () => { audio.pause(); if (url) URL.revokeObjectURL(url); window.removeEventListener("bv:volume", onVol); };
    }
  });

  /* ---------------- Voice recorder ---------------- */
  A.push({
    id: "recorder", name: "Recorder", icon: "🎙", bg: "linear-gradient(135deg,#f97316,#dc2626)", cat: "Media", keywords: "voice memo audio record microphone",
    render(body, os) {
      let rec = null, chunks = [], t0 = 0, tick = null, urls = [];
      const draw = async () => {
        urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
        const items = await os.idb.all("recordings").catch(() => []);
        body.innerHTML = `<div class="big-clock" data-c>00:00</div><div class="row" style="justify-content:center"><button class="btn" data-rec style="width:72px;height:72px;border-radius:50%;font-size:28px;background:var(--danger)">${rec ? "⏹" : "⏺"}</button></div>
          <div class="h" style="margin-top:20px">Recordings</div>
          ${items.length ? items.map(r => { const u = URL.createObjectURL(r.blob); urls.push(u);
            return `<div class="todo" style="flex-wrap:wrap"><span>${esc(r.name)}</span><button data-dl="${r.id}">⬇</button><button data-del="${r.id}">🗑</button><audio controls src="${u}" style="width:100%;height:36px"></audio></div>`; }).join("") : `<p class="muted">No recordings yet</p>`}`;
        body._items = items;
      };
      body.addEventListener("click", async e => {
        if (e.target.closest("[data-rec]")) {
          if (rec) { rec.stop(); return; }
          if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) return os.toast("Recording not supported here");
          try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            rec = new MediaRecorder(s); chunks = []; t0 = Date.now();
            rec.ondataavailable = ev => chunks.push(ev.data);
            rec.onstop = async () => { s.getTracks().forEach(t => t.stop()); clearInterval(tick); rec = null;
              const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
              await os.idb.put("recordings", { name: "Recording " + new Date().toLocaleString(), blob }); os.toast("🎙 Recording saved"); draw(); };
            rec.start(); draw();
            tick = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); const c = body.querySelector("[data-c]"); if (c) c.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }, 250);
          } catch { os.toast("Microphone permission denied"); }
        }
        const dl = e.target.closest("[data-dl]"); if (dl) { const r = body._items.find(x => x.id === dl.dataset.dl); download(r.blob, r.name.replace(/[^\w\- ]/g, "_") + ".webm"); }
        const del = e.target.closest("[data-del]"); if (del && confirm("Delete recording?")) { await os.idb.del("recordings", del.dataset.del); draw(); }
      });
      draw();
      return () => { if (rec) rec.stop(); clearInterval(tick); urls.forEach(u => URL.revokeObjectURL(u)); };
    }
  });

  /* ---------------- Paint ---------------- */
  A.push({
    id: "paint", name: "Paint", icon: "🎨", bg: "linear-gradient(135deg,#facc15,#ec4899)", cat: "Media", keywords: "draw sketch art canvas",
    render(body, os) {
      const colors = ["#111111", "#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899"];
      let color = colors[0], size = 6, eraser = false; const undo = [];
      body.innerHTML = `<div class="paint-tools">${colors.map(c => `<button class="sw ${c === color ? "on" : ""}" data-col="${c}" style="background:${c}" aria-label="${c}"></button>`).join("")}
        <input type="color" data-pick value="#111111" aria-label="Custom colour" style="width:30px;height:30px;border:0;background:none">
        <input type="range" min="1" max="40" value="6" data-size aria-label="Brush size">
        <button class="btn ghost" data-t="eraser">🧽</button><button class="btn ghost" data-t="undo">↶</button><button class="btn ghost" data-t="clear">🗑</button>
        <button class="btn" data-t="save">Save</button><button class="btn ghost" data-t="dl">⬇</button></div><canvas class="paint-cv"></canvas>`;
      const cv = body.querySelector("canvas"), ctx = cv.getContext("2d");
      const fit = () => { const r = cv.getBoundingClientRect(); if (!r.width) return; const img = cv.width ? ctx.getImageData(0, 0, cv.width, cv.height) : null;
        cv.width = r.width; cv.height = r.height; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); if (img) ctx.putImageData(img, 0, 0); };
      requestAnimationFrame(fit);
      const ro = new ResizeObserver(() => { const r = cv.getBoundingClientRect(); if (Math.abs(r.width - cv.width) > 2 || Math.abs(r.height - cv.height) > 2) fit(); }); ro.observe(cv);
      let drawing = false, last = null;
      const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.addEventListener("pointerdown", e => { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); undo.push(ctx.getImageData(0, 0, cv.width, cv.height)); if (undo.length > 25) undo.shift(); stroke(e); });
      const stroke = e => { if (!drawing) return; const p = pos(e); ctx.strokeStyle = eraser ? "#fff" : color; ctx.lineWidth = size; ctx.lineCap = ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; };
      cv.addEventListener("pointermove", stroke);
      cv.addEventListener("pointerup", () => drawing = false);
      body.addEventListener("click", e => {
        const c = e.target.closest("[data-col]"); if (c) { color = c.dataset.col; eraser = false; body.querySelectorAll(".sw").forEach(b => b.classList.toggle("on", b === c)); }
        const t = e.target.closest("[data-t]")?.dataset.t;
        if (t === "eraser") { eraser = !eraser; e.target.closest("button").style.outline = eraser ? "2px solid var(--accent)" : ""; }
        if (t === "undo" && undo.length) ctx.putImageData(undo.pop(), 0, 0);
        if (t === "clear") { undo.push(ctx.getImageData(0, 0, cv.width, cv.height)); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); }
        if (t === "save") cv.toBlob(b => os.idb.put("photos", { name: `Drawing_${Date.now()}.png`, blob: b }).then(() => os.toast("🎨 Saved to Gallery")));
        if (t === "dl") cv.toBlob(b => download(b, "drawing.png"));
      });
      body.addEventListener("input", e => { if (e.target.dataset.size !== undefined) size = +e.target.value; if (e.target.dataset.pick !== undefined) { color = e.target.value; eraser = false; } });
      return () => ro.disconnect();
    }
  });

  /* ---------------- Browser ---------------- */
  A.push({
    id: "browser", name: "Browser", icon: "🌐", bg: "linear-gradient(135deg,#46a3ff,#0057ff)", cat: "Internet", dock: true, net: true, keywords: "web internet chrome safari",
    render(body, os, args) {
      const HOME = "https://en.m.wikipedia.org/wiki/Main_Page";
      const hist = []; let pos = -1;
      body.style.padding = "10px";
      body.innerHTML = `<form class="browser-bar"><button type="button" class="btn ghost" data-b="back">‹</button><button type="button" class="btn ghost" data-b="fwd">›</button><button type="button" class="btn ghost" data-b="home">⌂</button>
        <input class="field" name="u" aria-label="Address" autocomplete="off"><button class="btn">Go</button><button type="button" class="btn ghost" data-b="ext" title="Open in real browser">↗</button></form>
        <div class="toolbar" style="margin-bottom:8px">${[["Wikipedia", HOME], ["OpenStreetMap", "https://www.openstreetmap.org/export/embed.html"], ["Example", "https://example.com"]].map(([n, u]) => `<button class="btn ghost" data-bm="${u}">${n}</button>`).join("")}</div>
        <iframe class="browser-frame" style="height:calc(100% - 104px)" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
        <p class="muted" style="font-size:11px;margin-top:4px">Some sites (Google, YouTube…) refuse to show inside other pages. Use ↗ to open them in your real browser.</p>`;
      const f = body.querySelector("form"), fr = body.querySelector("iframe");
      const toUrl = u => /^https?:\/\//.test(u) ? u : /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(u) ? "https://" + u : "https://en.m.wikipedia.org/w/index.php?search=" + encodeURIComponent(u);
      const go = (u, push = true) => { u = toUrl(u); if (push) { hist.splice(pos + 1); hist.push(u); pos = hist.length - 1; } fr.src = u; f.u.value = u; };
      f.onsubmit = e => { e.preventDefault(); go(f.u.value.trim()); };
      body.addEventListener("click", e => {
        const b = e.target.closest("[data-b]")?.dataset.b;
        if (b === "back" && pos > 0) go(hist[--pos], false);
        if (b === "fwd" && pos < hist.length - 1) go(hist[++pos], false);
        if (b === "home") go(HOME);
        if (b === "ext") window.open(f.u.value || HOME, "_blank", "noopener");
        const bm = e.target.closest("[data-bm]"); if (bm) go(bm.dataset.bm);
      });
      go(args?.q || HOME);
    }
  });

  /* ---------------- Maps ---------------- */
  A.push({
    id: "maps", name: "Maps", icon: "🗺", bg: "linear-gradient(135deg,#34d399,#059669)", cat: "Internet", net: true, keywords: "map directions location places",
    render(body, os) {
      body.style.padding = "10px";
      body.innerHTML = `<div class="toolbar"><input class="field" data-q placeholder="Search a place" style="flex:1;min-width:140px"><button class="btn" data-go>Search</button><button class="btn ghost" data-me>📍</button></div>
        <iframe class="browser-frame" style="height:calc(100% - 80px)" title="Map"></iframe><p class="muted" style="font-size:11px">© OpenStreetMap contributors</p>`;
      const fr = body.querySelector("iframe");
      const show = (lat, lon, z = 0.04) => fr.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - z},${lat - z / 2},${lon + z},${lat + z / 2}&layer=mapnik&marker=${lat},${lon}`;
      const home = os.store.get("wxloc", { lat: 51.8642, lon: -2.2382 }); show(home.lat, home.lon);
      body.addEventListener("click", async e => {
        if (e.target.closest("[data-go]")) {
          const q = body.querySelector("[data-q]").value.trim(); if (!q) return;
          try { const r = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`)).json();
            if (!r[0]) return os.toast("Place not found"); show(+r[0].lat, +r[0].lon); } catch { os.toast("Search failed — offline?"); }
        }
        if (e.target.closest("[data-me]")) navigator.geolocation?.getCurrentPosition(p => show(p.coords.latitude, p.coords.longitude, 0.01), () => os.toast("Location permission denied"));
      });
      body.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset.q !== undefined) body.querySelector("[data-go]").click(); });
    }
  });

  /* ---------------- Snake (game) ---------------- */
  A.push({
    id: "snake", name: "Snake", icon: "🐍", bg: "linear-gradient(135deg,#84cc16,#15803d)", cat: "Games", size: [420, 640], keywords: "game play",
    render(body, os) {
      const N = 20, C = 16;
      body.innerHTML = `<div class="snake-wrap"><div class="row"><b data-s>Score 0</b><small class="muted" data-h></small></div>
        <canvas width="${N * C}" height="${N * C}"></canvas>
        <div class="snake-pad"><span></span><button data-d="0,-1">▲</button><span></span><button data-d="-1,0">◀</button><button data-p>⏯</button><button data-d="1,0">▶</button><span></span><button data-d="0,1">▼</button><span></span></div>
        <small class="muted">Arrows / WASD / swipe · Space to pause</small></div>`;
      const cv = body.querySelector("canvas"), ctx = cv.getContext("2d");
      let snake, dir, nd, food, score, alive, paused, speed, timer, best = os.store.get("snakeBest", 0);
      const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
      const place = () => { do food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; while (snake.some(s => s[0] === food[0] && s[1] === food[1])); };
      const reset = () => { snake = [[10, 10], [9, 10], [8, 10]]; dir = nd = [1, 0]; score = 0; alive = true; paused = false; speed = 130; place(); loop(); };
      const drawB = () => {
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(food[0] * C + C / 2, food[1] * C + C / 2, C / 2 - 2, 0, 7); ctx.fill();
        snake.forEach((s, i) => { ctx.fillStyle = i ? css("--accent") : "#22c55e"; ctx.beginPath(); ctx.roundRect(s[0] * C + 1, s[1] * C + 1, C - 2, C - 2, 4); ctx.fill(); });
        body.querySelector("[data-s]").textContent = "Score " + score; body.querySelector("[data-h]").textContent = " · Best " + best;
        if (!alive || paused) { ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = "#fff"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(alive ? "Paused" : "Game over — tap to restart", cv.width / 2, cv.height / 2); }
      };
      const step = () => {
        if (!alive || paused) return drawB();
        dir = nd; const h = [(snake[0][0] + dir[0] + N) % N, (snake[0][1] + dir[1] + N) % N];
        if (snake.some(s => s[0] === h[0] && s[1] === h[1])) { alive = false; if (score > best) { best = score; os.store.set("snakeBest", best); os.toast("🏆 New best: " + best); } return drawB(); }
        snake.unshift(h);
        if (h[0] === food[0] && h[1] === food[1]) { score++; place(); speed = Math.max(60, speed - 3); os.beep(660, 50, 1, os.state.volume / 200); } else snake.pop();
        drawB(); loop();
      };
      const loop = () => { clearTimeout(timer); timer = setTimeout(step, speed); };
      const turn = (x, y) => { if (dir[0] === -x && dir[1] === -y) return; nd = [x, y]; };
      const kd = e => { if (!isTop(body)) return;
        const m = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[e.key];
        if (m && !e.shiftKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); turn(...m); }
        if (e.key === " ") { e.preventDefault(); if (!alive) reset(); else { paused = !paused; paused ? drawB() : loop(); } } };
      document.addEventListener("keydown", kd);
      body.addEventListener("click", e => { const d = e.target.closest("[data-d]"); if (d) turn(...d.dataset.d.split(",").map(Number));
        if (e.target.closest("[data-p]")) { if (!alive) reset(); else { paused = !paused; paused ? drawB() : loop(); } }
        if (e.target === cv && !alive) reset(); });
      let t0 = null; cv.addEventListener("pointerdown", e => t0 = [e.clientX, e.clientY]);
      cv.addEventListener("pointerup", e => { if (!t0) return; const dx = e.clientX - t0[0], dy = e.clientY - t0[1]; if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) Math.abs(dx) > Math.abs(dy) ? turn(Math.sign(dx), 0) : turn(0, Math.sign(dy)); t0 = null; });
      reset();
      return () => { clearTimeout(timer); document.removeEventListener("keydown", kd); };
    }
  });
})();
