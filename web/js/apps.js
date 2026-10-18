/* Blockvile Plus OS — system & productivity apps.
   App shape: { id, name, icon, bg, cat, system?, dock?, net?, size?, keywords?, render(body, os, args) -> cleanup? } */
(() => {
  const { esc, fmtSize, safeMath } = window.BV;
  const A = window.BV_APPS;
  const sw = (k, on, label, sub = "") => `<button data-k="${k}"><span>${label}${sub ? `<br><small>${sub}</small>` : ""}</span><i class="switch ${on ? "on" : ""}"></i></button>`;
  const tabs = (list, cur) => `<div class="seg">${list.map(([k, l]) => `<button data-tab="${k}" class="${k === cur ? "on" : ""}">${l}</button>`).join("")}</div>`;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------------- Settings ---------------- */
  A.push({
    id: "settings", name: "Settings", icon: "⚙️", bg: "linear-gradient(135deg,#8e9aaf,#5c6578)", cat: "System", system: true, dock: true,
    keywords: "preferences wallpaper pin lock display sound", size: [640, 600],
    render(body, os, args) {
      const s = os.state, f = s.flags;
      const draw = async () => {
        const top = body.scrollTop;
        let est = ""; try { const e = await navigator.storage?.estimate?.(); if (e) est = `${fmtSize(e.usage || 0)} used of ${fmtSize(e.quota || 0)}`; } catch { }
        body.innerHTML = `
        <div class="h" id="sec-account">Account</div>
        <div class="list"><div><span>Name</span><input class="field" data-in="username" value="${esc(s.username)}" style="max-width:180px;padding:8px 10px"></div>
          <button data-k="accounts"><span><b>👤 ${window.BV.auth?.signedIn() ? esc(window.BV.auth.email()) : "Sign in"}</b><br><small>${window.BV.auth?.signedIn() ? "Account, linked devices, Google &amp; Microsoft" : "Google, Microsoft or any email — unlocks Digital SIM"}</small></span><small>›</small></button></div>

        <div class="h" id="sec-takeover">Temporary takeover</div>
        <div class="list">
          ${os.isTakeover()
            ? `<button data-k="endTakeover"><span><b>⛶ Temporary takeover is on — end it</b><br><small>Gives the device back to its own system. Terminal: <code>application exit</code></small></span><small>■</small></button>`
            : `<button data-k="startTakeover"><span><b>⛶ Temporarily let Blockvile take over this device</b><br><small>${window.BV.android?.available
                ? "Blockvile becomes the home screen until you press Exit, type application exit, or restart the phone."
                : "Full screen, screen kept awake and keys captured until you press Exit or type application exit."} Never permanent.</small></span><small>›</small></button>`}
          <button data-k="exit"><span>⏻ Exit Blockvile now<br><small>Back to your device's own system · Ctrl+Shift+E</small></span><small>›</small></button>
        </div>

        ${window.BV.updates?.html(sw) || ""}

        <div class="h" id="sec-display">Display & wallpaper</div>
        <div class="list">
          ${sw("dark", root().dataset.theme === "dark", "Dark mode", "Shortcut: Ctrl+Shift+D")}
          ${sw("autoTheme", s.autoTheme, "Follow system theme")}
          ${sw("nightLight", f.nightLight, "Night light", "Warmer colours for the evening")}
          <div><span>Brightness</span><input type="range" min="20" max="100" value="${s.brightness}" data-range="brightness"></div>
        </div>
        <div class="h">Accent colour</div>
        <div class="list"><div class="color-row">${os.ACCENTS.map(c => `<button data-accent="${c}" class="${s.accent === c ? "on" : ""}" style="background:${c}" aria-label="${c}"></button>`).join("")}</div></div>
        <div class="seg">${["Aurora", "Ocean", "Sunset", "Mono"].map((w, i) => `<button data-wall="${i}" class="${!s.wallImg && s.wall === i ? "on" : ""}">${w}</button>`).join("")}
          <button data-k="pickWall" class="${s.wallImg ? "on" : ""}">📷 Photo…</button></div>
        <input type="file" accept="image/*" data-wallfile hidden>

        <div class="h" id="sec-sound">Sound & notifications</div>
        <div class="list">
          <div><span>Volume</span><input type="range" min="0" max="100" value="${s.volume}" data-range="volume"></div>
          ${sw("dnd", f.dnd, "Do not disturb", "Silences banners and sounds")}
          <button data-k="testNotif"><span>Send a test notification</span><small>›</small></button>
          ${sw("haptics", s.haptics, "Vibrate on touch", "A light buzz when you tap buttons and apps")}
          ${sw("clicks", s.clicks, "Touch sounds", "A soft click when you tap")}
          ${window.BV.android?.available ? `<button data-k="nativeNotif"><span>Phone notifications<br><small>${window.BV.android.canNotify() ? "On — Blockvile notifies you even when it's in the background" : "Off — tap to allow"}</small></span><small>›</small></button>` : ""}
        </div>

        <div class="h" id="sec-mode">Device mode <small class="muted">(Ctrl+Shift+M)</small></div>
        <div class="seg">${["phone", "tablet", "laptop"].map(m => `<button data-mode="${m}" class="${s.mode === m ? "on" : ""}">${{ phone: "📱 Phone", tablet: "📲 Tablet", laptop: "💻 Laptop" }[m]}</button>`).join("")}</div>
        <div class="list">${sw("landscape", f.landscape, "Landscape / rotate screen")}</div>

        <div class="h" id="sec-security">Lock screen & security</div>
        <div class="list">
          <div><span>Screen lock PIN<br><small>${s.pin ? "PIN is set" : "No PIN"}</small></span>
            <span class="row"><input class="field" data-in="newpin" inputmode="numeric" maxlength="8" placeholder="4–8 digits" style="width:110px;padding:8px 10px"><button class="btn" data-k="setPin" style="padding:8px 12px">Set</button>${s.pin ? `<button class="btn ghost" data-k="clearPin" style="padding:8px 12px">Remove</button>` : ""}</span></div>
          <div><span>Auto-lock</span><select data-sel="autolock">${[[0, "Never"], [1, "1 minute"], [2, "2 minutes"], [5, "5 minutes"], [10, "10 minutes"]].map(([v, l]) => `<option value="${v}" ${s.autolock == v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
          <button data-k="lock"><span>Lock now</span><small>Ctrl+Shift+L</small></button>
        </div>
        <p class="muted" style="font-size:11px;margin:-8px 6px 16px">The PIN protects the OS screen only. It is stored in this browser and isn't strong security.</p>

        <div class="h" id="sec-network">Connections</div>
        <div class="list">${sw("airplane", f.airplane, "Airplane mode")}<div><span>Internet</span><small>${navigator.onLine ? "Connected" : "Offline"}</small></div></div>

        <div class="h" id="sec-battery">Battery</div>
        <div class="list">${sw("saver", f.saver, "Battery saver", "Turns off animations and blur")}<div><span>Level</span><small data-battery>—</small></div></div>

        <div class="h" id="sec-access">Accessibility</div>
        <div class="list">${sw("largeText", f.largeText, "Large text")}${sw("reduceMotion", f.reduceMotion, "Reduce motion")}${sw("highContrast", f.highContrast, "High contrast")}</div>

        <div class="h" id="sec-time">Date & time</div>
        <div class="list">${sw("use24h", s.use24h, "24-hour clock")}<div><span>Time zone</span><small>${Intl.DateTimeFormat().resolvedOptions().timeZone}</small></div></div>

        <div class="h" id="sec-apps">Apps & storage</div>
        <div class="list">
          <button data-k="store"><span>App Store<br><small>${os.installed().length} of ${os.apps().length} apps installed</small></span><small>›</small></button>
          <div><span>Files</span><small>${fmtSize(os.fs.usage())}</small></div>
          <div><span>Device storage</span><small>${est || "—"}</small></div>
        </div>

        ${window.BV.android?.available ? `<div class="h" id="sec-android">Android</div>
        <div class="list">
          <button data-k="panel" data-panel="settings"><span>Phone settings<br><small>Wi-Fi, Bluetooth, display and everything else</small></span><small>›</small></button>
          <button data-k="androidapps"><span>Android apps on this phone</span><small>${window.BV.android.apps().length} ›</small></button>
          <div><span>Device</span><small>${esc((d => d.model + " · Android " + d.android)(window.BV.android.device()))}</small></div>
        </div>` : ""}
        <div class="h" id="sec-system">System</div>
        <div class="list">
          <button data-k="help"><span>Keyboard shortcuts</span><small>Ctrl+/</small></button>
          <button data-k="fullscreen"><span>Full screen</span><small>⛶</small></button>
          <button data-k="restart"><span>Restart</span><small>↻</small></button>
          <button data-k="shutdown"><span>Shut down</span><small>⏻</small></button>
          <button data-k="exit"><span>Exit Blockvile Plus OS<br><small>Shortcut: Ctrl+Shift+E</small></span><small>⏏</small></button>
          <button data-k="reset"><span style="color:var(--danger)">Erase everything & reset</span><small>↺</small></button>
          <button data-k="about"><span>About</span><small>Blockvile Plus ${esc(window.BV_CONFIG?.version || "")}</small></button>
        </div>`;
        body.scrollTop = top;
        navigator.getBattery?.().then(b => body.querySelectorAll("[data-battery]").forEach(e => e.textContent = Math.round(b.level * 100) + "%" + (b.charging ? " · charging" : ""))).catch(() => { });
      };
      const root = () => document.documentElement;
      const onUpd = () => { if (!body.isConnected) return window.removeEventListener("bv:update", onUpd); draw(); };
      window.addEventListener("bv:update", onUpd);
      body.addEventListener("click", async e => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.mode) os.setMode(b.dataset.mode);
        if (b.dataset.wall) os.setWall(+b.dataset.wall);
        if (b.dataset.accent) { s.accent = b.dataset.accent; os.save(); os.apply(); }
        const k = b.dataset.k; if (!k) return draw();
        const flags = ["nightLight", "dnd", "landscape", "airplane", "saver", "largeText", "reduceMotion", "highContrast"];
        if (flags.includes(k)) os.setFlag(k);
        if (k === "dark") os.toggleDark();
        if (k === "autoTheme") { s.autoTheme = !s.autoTheme; os.save(); os.apply(); }
        if (k === "use24h") { s.use24h = !s.use24h; os.save(); os.apply(); }
        if (k === "pickWall") return body.querySelector("[data-wallfile]").click();
        if (k === "testNotif") os.notify({ app: "settings", icon: "⚙️", title: "Test notification", text: "Notifications are working." });
        if (k === "setPin") { const v = body.querySelector('[data-in="newpin"]').value.trim(); if (!/^\d{4,8}$/.test(v)) return os.toast("PIN must be 4–8 digits"); s.pin = v; os.save(); os.toast("🔒 PIN set"); }
        if (k === "clearPin") { s.pin = ""; os.save(); os.toast("PIN removed"); }
        if (k === "lock") return os.lock();
        if (k === "store") return os.open("store");
        if (k === "help") return os.showHelp();
        if (k === "fullscreen") { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch { } }
        if (k === "restart") return os.power("restart");
        if (k === "shutdown") return os.power("shutdown");
        if (k === "exit") return os.toggleExit();
        if (k === "reset") { if (await BV.confirm("Erase all files, photos, settings and app data?", { ok: "Erase", danger: true })) await os.reset(); }
        if (k === "about") return os.open("about");
        if (k === "accounts") return os.open("accounts");
        if (k === "panel") return window.BV.android?.openPanel(b.dataset.panel);
        if (k === "startTakeover") return os.startTakeover();
        if (k === "openUpdates") return os.open("updates");
        if (k === "checkUpdate") { const U = window.BV.updates; const p = U.check(true); draw(); const got = await p; if (!U.configured()) os.toast("Updates need the hosted website"); else if (U.state.error) os.toast("⚠️ " + U.state.error); else os.toast(got ? "⬆️ Blockvile " + U.state.remote.version + " is ready" : "✅ Blockvile is up to date"); return draw(); }
        if (k === "applyUpdate") return window.BV.updates.apply();
        if (k === "endTakeover") { os.endTakeover(); return draw(); }
        if (k === "haptics") { s.haptics = !s.haptics; os.save(); if (s.haptics) navigator.vibrate?.(20); }
        if (k === "clicks") { s.clicks = !s.clicks; os.save(); }
        if (k === "nativeNotif") { window.BV.android.canNotify() ? window.BV.android.openPanel("notifications") : window.BV.android.askNotify(); }
        if (k === "androidapps") return os.open("androidapps");
        draw();
      });
      body.addEventListener("change", e => {
        const t = e.target;
        if (t.dataset.in === "username") { s.username = t.value.trim() || "User"; os.save(); os.apply(); }
        if (t.dataset.sel === "autolock") { s.autolock = +t.value; os.save(); }
        if (t.dataset.wallfile !== undefined && t.files[0]) os.setWallpaperBlob(t.files[0]).then(draw);
      });
      body.addEventListener("input", e => {
        const r = e.target.dataset.range;
        if (r === "volume") os.setVolume(+e.target.value);
        if (r === "brightness") os.setBrightness(+e.target.value);
      });
      let rt; const onCh = () => { clearTimeout(rt); rt = setTimeout(() => { const ae = document.activeElement; if (body.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) return; draw(); }, 50); };
      window.addEventListener("bv:changed", onCh);
      draw().then(() => { if (args?.section) body.querySelector("#sec-" + args.section)?.scrollIntoView(); });
      return () => window.removeEventListener("bv:changed", onCh);
    }
  });

  /* ---------------- Files ---------------- */
  A.push({
    id: "files", name: "Files", icon: "📁", bg: "linear-gradient(135deg,#4fd1c5,#2a9d8f)", cat: "System", system: true, keywords: "folders documents explorer finder",
    render(body, os, args) {
      const fs = os.fs; let cwd = args?.path && fs.isDir(args.path) ? fs.norm(args.path) : "/";
      const icon = n => n.type === "dir" ? "📁" : /\.(txt|md)$/i.test(n.name) ? "📄" : /\.(js|html|css|json|py)$/i.test(n.name) ? "📜" : "📃";
      const draw = () => {
        const parts = cwd.split("/").filter(Boolean);
        let items; try { items = fs.list(cwd); } catch { cwd = "/"; items = fs.list("/"); }
        body.innerHTML = `
          <div class="toolbar">
            <button class="btn ghost" data-a="up" ${cwd === "/" ? "disabled" : ""}>⬆</button>
            <button class="btn ghost" data-a="mkdir">＋ Folder</button>
            <button class="btn ghost" data-a="new">＋ File</button>
            <button class="btn ghost" data-a="upload">⬆ Upload</button>
            <button class="btn ghost" data-a="photos">🖼 Photos</button>
            <input type="file" multiple hidden data-up>
          </div>
          <div class="crumbs"><button data-go="/">🏠 Home</button>${parts.map((p, i) => `<span>›</span><button data-go="/${parts.slice(0, i + 1).join("/")}">${esc(p)}</button>`).join("")}</div>
          <div class="fl">${items.length ? items.map(n => `<div class="fl-row" data-name="${esc(n.name)}" data-type="${n.type}"><span class="fl-ic">${icon(n)}</span><span class="fl-name">${esc(n.name)}</span>
            <small>${n.type === "dir" ? n.size + " items" : fmtSize(n.size)}</small><button class="fl-act" data-act="rename" title="Rename">✎</button><button class="fl-act" data-act="del" title="Delete">🗑</button></div>`).join("")
            : `<p class="muted center" style="padding:30px">This folder is empty</p>`}</div>`;
        os.setTitle("files", "Files — " + (cwd === "/" ? "Home" : parts[parts.length - 1]));
      };
      const path = n => (cwd === "/" ? "" : cwd) + "/" + n;
      const tryDo = fn => { try { fn(); } catch (err) { os.toast("⚠ " + err.message); } draw(); };
      body.addEventListener("click", async e => {
        const go = e.target.closest("[data-go]"); if (go) { cwd = go.dataset.go; return draw(); }
        const a = e.target.closest("[data-a]")?.dataset.a;
        if (a === "up") { cwd = fs.norm(cwd + "/.."); return draw(); }
        if (a === "mkdir") { const n = await BV.ask("Folder name", "New folder"); if (n) tryDo(() => fs.mkdir(path(n))); return; }
        if (a === "new") { const n = await BV.ask("File name", "Untitled.txt"); if (n) { tryDo(() => fs.write(path(n), "")); os.open("editor", { path: path(n) }); } return; }
        if (a === "upload") return body.querySelector("[data-up]").click();
        if (a === "photos") return os.open("gallery");
        const row = e.target.closest(".fl-row"); if (!row) return;
        const name = row.dataset.name, act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "rename") { const n = await BV.ask("Rename to", name); if (n && n !== name) tryDo(() => fs.rename(path(name), n)); return; }
        if (act === "del") { if (await BV.confirm(`Delete “${name}”?`, { ok: "Delete", danger: true })) tryDo(() => fs.rm(path(name))); return; }
        if (row.dataset.type === "dir") { cwd = path(name); draw(); } else os.open("editor", { path: path(name) });
      });
      body.addEventListener("change", async e => {
        if (e.target.dataset.up === undefined) return;
        for (const file of e.target.files) {
          if (file.type.startsWith("image/")) { await os.idb.put("photos", { name: file.name, blob: file }); os.toast("🖼 Added to Photos: " + file.name); continue; }
          if (file.type.startsWith("audio/")) { await os.idb.put("music", { name: file.name, blob: file }); os.toast("🎵 Added to Music: " + file.name); continue; }
          if (file.size > 400000) { os.toast("Too big for Files: " + file.name); continue; }
          const text = await file.text(); try { fs.write(path(file.name), text); } catch (err) { os.toast("⚠ " + err.message); }
        }
        draw();
      });
      os.onBack("files", () => { if (cwd !== "/") { cwd = fs.norm(cwd + "/.."); draw(); return true; } });
      draw();
    }
  });

  /* ---------------- Text editor ---------------- */
  A.push({
    id: "editor", name: "Text Editor", icon: "✏️", bg: "linear-gradient(135deg,#6b7cff,#3346d3)", cat: "Productivity", system: true, keywords: "edit text code write",
    render(body, os, args) {
      let file = args?.path || "", dirty = false;
      body.innerHTML = `<div class="toolbar"><button class="btn ghost" data-a="new">New</button><button class="btn ghost" data-a="open">Open…</button><button class="btn" data-a="save">Save</button><button class="btn ghost" data-a="saveas">Save as…</button><small class="muted" data-info style="margin-left:auto"></small></div>
        <textarea class="field editor" spellcheck="false" placeholder="Start typing…"></textarea>`;
      const ta = body.querySelector("textarea"), info = body.querySelector("[data-info]");
      const title = () => { os.setTitle("editor", (dirty ? "• " : "") + (file ? file.split("/").pop() : "Untitled") + " — Text Editor"); const w = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0; info.textContent = `${w} words · ${ta.value.length} chars`; };
      const load = p => { try { ta.value = os.fs.read(p); file = os.fs.norm(p); dirty = false; } catch (err) { os.toast("⚠ " + err.message); } title(); };
      const saveAs = async () => { const p = await BV.ask("Save as (path)", file || "/Documents/Untitled.txt"); if (!p) return; file = os.fs.norm(p); save(); };
      const save = () => { if (!file) return saveAs(); try { os.fs.write(file, ta.value); dirty = false; os.toast("💾 Saved " + file); } catch (err) { os.toast("⚠ " + err.message); } title(); };
      body.addEventListener("click", async e => {
        const a = e.target.closest("[data-a]")?.dataset.a;
        if (a === "new") { if (dirty && !(await BV.confirm("Discard unsaved changes?", { ok: "Discard", danger: true }))) return; file = ""; ta.value = ""; dirty = false; title(); }
        if (a === "open") { const p = await BV.ask("Open file (path)", "/Documents/"); if (p) load(p); }
        if (a === "save") save();
        if (a === "saveas") saveAs();
      });
      ta.addEventListener("input", () => { dirty = true; title(); });
      ta.addEventListener("keydown", e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
        if (e.key === "Tab") { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText("  ", s, ta.selectionEnd, "end"); dirty = true; }
      });
      if (file) load(file); else title();
      setTimeout(() => ta.focus(), 50);
    }
  });

  /* ---------------- Terminal ---------------- */
  A.push({
    id: "terminal", name: "Terminal", icon: "⌨️", bg: "linear-gradient(135deg,#2b2f3a,#000)", cat: "System", system: true, keywords: "shell console command bash",
    render(body, os) {
      const fs = os.fs; let cwd = "/"; const hist = os.store.get("termhist", []); let hi = hist.length;
      body.style.padding = "0";
      body.innerHTML = `<div class="term"><div data-out></div><div class="row" style="gap:6px"><span class="pr" data-ps></span><input data-in autocomplete="off" spellcheck="false" aria-label="Command"></div></div>`;
      const out = body.querySelector("[data-out]"), inp = body.querySelector("[data-in]"), ps = body.querySelector("[data-ps]"), term = body.querySelector(".term");
      const user = () => os.state.username.toLowerCase().replace(/\s+/g, "");
      const prompt = () => ps.textContent = `${user()}@blockvile:${cwd === "/" ? "~" : "~" + cwd}$`;
      const print = (t, cls = "") => { const d = document.createElement("div"); if (cls) d.className = cls; d.textContent = t; out.appendChild(d); };
      const P = p => fs.norm(p || ".", cwd);
      const up = () => { const s = (Date.now() - os.bootTime) / 1000; return `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m ${Math.floor(s % 60)}s`; };
      const HELP = `Commands:
  ls [dir]          list files        cd <dir>         change folder
  pwd               current folder    cat <file>       show a file
  touch <file>      new empty file    mkdir <dir>      new folder
  rm <path>         delete            mv <a> <b>       move / rename
  cp <a> <b>        copy file         echo text > f    write to a file (>> appends)
  edit <file>       open in editor    open <app>       open an app
  apps              list apps         theme dark|light change theme
  mode phone|tablet|laptop            calc <sum>       calculator
  notify <text>     notification      weather          current weather
  date  whoami  uptime  history  neofetch  clear  lock  reboot  shutdown  exit
  ai <question>     ask Blockvile AI           ai model fast|balanced|smart   pick the AI model
  account           who is signed in           signin google|microsoft   or   signin <email> <password>
  signup <email> <password> [name]             signout   reset <email>   (password reset email)
  sim               your Digital SIM           sim send <BV 1234 5678> <message>
  devices           linked devices             devices link | devices unlink <number>
  services          Google & Microsoft apps    services open <name>
  update            check for a new version      update now   install it (only when you type this)
  switch version    list versions (older & newer)   switch version <x.y> now   move to that version
                    switch version latest now   go back to the newest   (also spelled: swich version)

Temporary takeover (Blockvile runs the whole device for a while — never permanent):
  application takeover   start a temporary takeover of this device
  application status     is a takeover running?
  application exit       end the temporary takeover and go back to the device's own system`;
      const cmds = {
        help: () => print(HELP),
        ls: a => { const l = fs.list(P(a[0])); print(l.length ? l.map(n => n.type === "dir" ? n.name + "/" : n.name).join("    ") : "(empty)"); },
        cd: a => { const p = P(a[0] || "/"); if (!fs.isDir(p)) throw new Error("no such folder: " + (a[0] || "")); cwd = p; },
        pwd: () => print(cwd),
        cat: a => print(fs.read(P(a[0]))),
        touch: a => { const p = P(a[0]); if (!fs.exists(p)) fs.write(p, ""); },
        mkdir: a => fs.mkdir(P(a[0])),
        rm: a => { if (!a[0]) throw new Error("usage: rm <path>"); fs.rm(P(a.filter(x => !x.startsWith("-"))[0])); },
        mv: a => { const s = P(a[0]), d = P(a[1]); if (!a[1]) throw new Error("usage: mv <from> <to>");
          const target = fs.isDir(d) ? d + "/" + s.split("/").pop() : d;
          if (s.split("/").slice(0, -1).join("/") === target.split("/").slice(0, -1).join("/")) fs.rename(s, target.split("/").pop());
          else { fs.write(target, fs.read(s)); fs.rm(s); } },
        cp: a => { if (!a[1]) throw new Error("usage: cp <from> <to>"); const d = P(a[1]); fs.write(fs.isDir(d) ? d + "/" + P(a[0]).split("/").pop() : d, fs.read(P(a[0]))); },
        echo: (a, raw) => { const m = raw.match(/^echo\s+(.*?)\s*(>>?)\s*(\S+)\s*$/);
          if (m) { const p = P(m[3]); const prev = m[2] === ">>" && fs.exists(p) ? fs.read(p) + "\n" : ""; fs.write(p, prev + m[1].replace(/^["']|["']$/g, "")); }
          else print(raw.slice(5).replace(/^["']|["']$/g, "")); },
        edit: a => os.open("editor", { path: a[0] ? P(a[0]) : "" }),
        open: a => { const n = (a.join(" ") || "").toLowerCase(); const app = os.installed().find(x => x.id === n || x.name.toLowerCase() === n); if (!app) throw new Error("no app: " + n); os.open(app.id); },
        apps: () => print(os.installed().map(a => `${a.icon} ${a.id.padEnd(11)} ${a.name}`).join("\n")),
        theme: a => { const t = a[0]; if (!["dark", "light"].includes(t)) throw new Error("usage: theme dark|light"); if ((document.documentElement.dataset.theme) !== t) os.toggleDark(); },
        mode: a => { if (!["phone", "tablet", "laptop"].includes(a[0])) throw new Error("usage: mode phone|tablet|laptop"); os.setMode(a[0]); },
        calc: a => { const v = safeMath(a.join("")); print(v === null ? "can't calculate that" : String(v)); },
        notify: a => os.notify({ app: "terminal", icon: "⌨️", title: "Terminal", text: a.join(" ") || "Hello!" }),
        weather: async () => { const w = await os.weather(true); print(w ? `${w.loc}: ${w.temp}°C, ${os.wxInfo(w.code)[1]}, wind ${w.wind} km/h` : "weather unavailable (offline?)"); },
        date: () => print(new Date().toString()),
        whoami: () => print(user()),
        uptime: () => print("up " + up()),
        history: () => print(hist.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n")),
        neofetch: () => print(`   ▄▄▄ ▄▄▄      ${user()}@blockvile
   ███ ███      ───────────────────
   ▄▄▄ ▄█▄      OS:      Blockvile Plus 3.0
   ███ ▀█▀      Mode:    ${os.state.mode}
                Theme:   ${document.documentElement.dataset.theme}
                Uptime:  ${up()}
                Apps:    ${os.installed().length} installed
                Screen:  ${innerWidth}x${innerHeight}
                CPU:     ${navigator.hardwareConcurrency || "?"} cores`, "ac"),
        clear: () => out.innerHTML = "",
        lock: () => os.lock(), reboot: () => os.power("restart"), shutdown: () => os.power("shutdown"),
        exit: () => os.close("terminal"),
        update: async a => {
          const U = window.BV.updates; if (!U) throw new Error("updates are not available");
          const sub = (a[0] || "").toLowerCase();
          if (sub && !["now", "check", "status"].includes(sub)) throw new Error("usage: update | update now");
          if (sub === "status") { const r = U.state.remote; return print(`Version ${U.local().version}` + (U.available() ? ` — ${r.version} is ready (type 'update now')` : " — up to date")); }
          if (sub !== "now") {
            if (!U.configured()) return print("Updates need the hosted website (or the update address set in the Android app).");
            print("Checking for updates…");
            const got = await U.check(true);
            if (U.state.error) return print("⚠️ " + U.state.error, "er");
            if (!got) return print(`Blockvile ${U.local().version} is up to date.`, "ac");
            const r = U.state.remote;
            print(`Update available: ${U.local().version} → ${r.version}`, "ac");
            (r.notes || []).forEach(n => print("  • " + n));
            return print("Nothing is installed yet. Type 'update now' to install it.");
          }
          if (!U.available()) { if (U.configured()) await U.check(true); }
          if (!U.available()) return print(U.state.error ? "⚠️ " + U.state.error : `Blockvile ${U.local().version} is up to date.`, U.state.error ? "er" : "ac");
          print(`Updating to ${U.state.remote.version}… Blockvile will restart when it is done.`, "ac");
          await U.apply();
        },
        switch: async a => {
          const U = window.BV.updates; if (!U) throw new Error("updates are not available");
          if ((a[0] || "").toLowerCase() !== "version") throw new Error("usage: switch version [<x.y> now | latest now]");
          if (!U.versionsOk()) return print(window.BV.android?.available ? "The publisher hasn't set the update address yet." : "Switching versions needs the hosted website (or the Android app).", "er");
          const cur = U.local().version;
          const list = await U.versions(true);
          if (U.state.vError) return print("⚠️ " + U.state.vError, "er");
          if (!list.length) return print("No versions found.");
          const want = (a[1] || "").toLowerCase();
          if (!want) {
            const latest = U.latest();
            print(list.slice().reverse().map(v => {
              const r = U.rel(v.version), tag = r === "current" && !U.isOlderCopy() ? "current" : latest && v.version === latest.version ? "latest" : r;
              const bad = U.blocked(v);
              return `${tag === "current" ? "●" : "○"} ${v.version.padEnd(7)} ${tag.padEnd(8)} ${v.released}${bad ? "  (" + bad + ")" : ""}${v.notes[0] ? "\n          " + v.notes[0] : ""}`;
            }).join("\n") + `\nYou are on ${cur}. Switch with: switch version <number> now` + (U.request() ? `\nYour Updater asked for ${U.request().version}: switch version ${U.request().version} now` : ""));
            return;
          }
          const v = want === "latest" ? U.latest() : list.find(x => x.version === a[1]);
          if (!v) throw new Error("no such version: " + a[1] + " (type 'switch version' to see them)");
          if (v.version === cur && !U.isOlderCopy()) return print(`You're already on ${cur}.`, "ac");
          const bad = U.blocked(v); if (bad) return print("⚠️ " + bad, "er");
          const r = U.rel(v.version);
          if ((a[2] || "").toLowerCase() !== "now") {
            print(`${r === "older" ? "Going back to" : "Moving to"} ${v.version}. Your apps, files and settings stay as they are.` + (r === "older" ? " Older versions may lack newer features and fixes." : ""));
            return print(`Type 'switch version ${v.version} now' to do it.`);
          }
          print(`Switching to ${v.version}… Blockvile will restart.`, "ac");
          if (U.request()?.version === v.version) await U.answer(true); else await U.switchTo(v.version);
        },
        swich: (a, raw) => cmds.switch(a, raw),
        ai: async (a, raw) => {
          const AI = window.BV.ai; if (!AI) throw new Error("AI is not available");
          const sub = (a[0] || "").toLowerCase();
          if (sub === "model") {
            if (!a[1]) return print(Object.entries(AI.models).map(([k, v]) => `${k === AI.model() ? "●" : "○"} ${k.padEnd(9)} ${v.name} — ${v.note}`).join("\n") + "\nChange it with: ai model fast|balanced|smart");
            AI.setModel(a[1].toLowerCase()); return print(`AI model is now ${AI.models[AI.model()].name}.`, "ac");
          }
          const q = raw.replace(/^ai\s*/, "").trim(); if (!q) throw new Error("usage: ai <question>  |  ai model [fast|balanced|smart]");
          print("Thinking…");
          const r = await AI.cloud([{ role: "user", content: q }]);
          print(r.replace(/\[\[action:[^\]]*\]\]/gi, "").trim());
        },
        account: () => {
          const A = window.BV.auth; if (!A) throw new Error("accounts are not available");
          if (!A.configured()) return print("Sign-in isn't set up yet. Open Accounts → Setup and paste your Supabase address and key (see SUPABASE-SETUP.md).");
          if (!A.signedIn()) return print("Not signed in. Type: signin google | signin microsoft | signin <email> <password>   (new? signup <email> <password>)");
          print(`${A.name()} <${A.email()}>  ·  signed in with ${A.provider() === "azure" ? "Microsoft" : A.provider()}`, "ac");
          print("Digital SIM, linked devices and the AI are unlocked. Type 'sim', 'devices' or 'ai <question>'.");
        },
        signin: async a => {
          const A = window.BV.auth; if (!A.configured()) throw new Error("sign-in isn't set up yet — open Accounts → Setup");
          if (A.signedIn()) return print(`Already signed in as ${A.email()}. Type 'signout' first to switch.`);
          const w = (a[0] || "").toLowerCase();
          if (w === "google" || w === "microsoft") { print(`Opening ${w === "google" ? "Google" : "Microsoft"} sign-in…`, "ac"); return A.oauth(w === "google" ? "google" : "azure", false); }
          if (!a[0] || !a[1]) throw new Error("usage: signin google | signin microsoft | signin <email> <password>");
          await A.signIn(a[0], a.slice(1).join(" ")); print(`✅ Signed in as ${A.email()}. The Digital SIM is now unlocked.`, "ac");
        },
        signup: async a => {
          const A = window.BV.auth; if (!A.configured()) throw new Error("sign-in isn't set up yet — open Accounts → Setup");
          if (!a[0] || !a[1]) throw new Error("usage: signup <email> <password> [name]");
          if (a[1].length < 8) throw new Error("use a password of at least 8 characters");
          const r = await A.signUp(a[0], a[1], a.slice(2).join(" "));
          print(r.needsConfirm ? "📧 Almost done — open the email we sent to confirm your address, then type: signin <email> <password>" : "✅ Account created and signed in.", "ac");
        },
        signout: async () => { const A = window.BV.auth; if (!A.signedIn()) return print("You're not signed in."); await A.signOut(); print("Signed out. The Digital SIM is locked again.", "ac"); },
        reset: async a => { if (!a[0]) throw new Error("usage: reset <email>"); await window.BV.auth.reset(a[0]); print("📧 If that address has an account, a reset link is on its way."); },
        sim: async a => {
          const A = window.BV.auth, S = window.BV.simApi;
          if (!A.signedIn()) throw new Error("the Digital SIM is only for signed-in users — type 'signin'");
          if ((a[0] || "").toLowerCase() === "send") {
            const to = a.slice(1, 4).join(" ").toUpperCase(), body = a.slice(4).join(" ");
            if (!/^BV \d{4} \d{4}$/.test(to) || !body) throw new Error("usage: sim send BV 1234 5678 <message>");
            await S.send(to, body); return print(`✅ Sent to ${to}`, "ac");
          }
          const s = await S.status();
          print(`Number: ${s.number}\nCharge: ${Math.round(Number(s.charge))}%${S.onWifi() ? "  (charging on Wi-Fi)" : "  (not on Wi-Fi)"}\nWi-Fi data bank: ${Math.floor(Number(s.data_mb))} / 500 MB`, "ac");
          print("Open the Digital SIM app to read and write messages.");
        },
        devices: async a => {
          const A = window.BV.auth, D = window.BV.services?.devices;
          if (!A.signedIn()) throw new Error("sign in first — type 'signin'");
          const sub = (a[0] || "").toLowerCase();
          if (sub === "link") { await D.link(); return print("✅ This device is linked to your account.", "ac"); }
          const list = await D.list();
          if (sub === "unlink") {
            const d = list[+a[1] - 1]; if (!d) throw new Error("usage: devices unlink <number from the list>");
            if (D.isThis(d)) throw new Error("that's this device — unlink it from another device");
            await D.unlink(d.id); return print(`Unlinked ${d.name}.`, "ac");
          }
          print(list.length ? list.map((d, i) => `${i + 1}. ${d.platform === "android" ? "📱" : "💻"} ${d.name}${D.isThis(d) ? "  (this device)" : ""}  · last seen ${new Date(d.last_seen).toLocaleDateString()}`).join("\n") : "No linked devices yet. Type 'devices link'.");
        },
        services: a => {
          const V = window.BV.services; if (!V) throw new Error("services are not available");
          const all = Object.values(V.SERVICES).flatMap(s => s.apps.map(x => ({ svc: s.name, icon: x[0], name: x[1], pkg: x[2], url: x[3] })));
          if ((a[0] || "").toLowerCase() === "open") {
            const q = a.slice(1).join(" ").toLowerCase(); if (!q) throw new Error("usage: services open <name>   e.g. services open gmail");
            const hit = all.find(x => x.name.toLowerCase() === q) || all.find(x => `${x.svc} ${x.name}`.toLowerCase().includes(q)); if (!hit) throw new Error("no service called " + q);
            V.openService(hit.pkg, hit.url); return print(`Opening ${hit.svc} ${hit.name}…`, "ac");
          }
          for (const s of Object.values(V.SERVICES)) print(`${s.icon} ${s.name}: ${s.apps.map(x => x[1]).join(", ")}`);
          print("Open one with: services open <name>");
        },
        application: async a => {
          const sub = (a[0] || "").toLowerCase(), on = os.isTakeover();
          if (sub === "exit") {
            print(on ? "Ending the temporary takeover…" : "No temporary takeover is running.", on ? "ac" : "");
            print(window.BV.android?.available ? "Handing the phone back to its own home screen…" : "Leaving Blockvile — your device's own system is back in charge.");
            await new Promise(r => setTimeout(r, 700));
            os.endTakeover(true);
            if (!window.BV.android?.available) os.toggleExit();   // Android: ending the takeover already returns to the phone's own home screen
            return;
          }
          if (sub === "takeover" || sub === "start") {
            if (on) return print("A temporary takeover is already running. Type 'application exit' to end it.");
            print("Starting a temporary takeover — Blockvile will run this device until you type 'application exit' or press ⏻ Exit.", "ac");
            print(window.BV.android?.available ? "Android will ask you to choose Blockvile as the home app. It switches back on Exit or when the phone restarts." : "Nothing is changed permanently: closing the page or restarting also ends it.");
            await os.startTakeover(); return;
          }
          if (sub === "status") return print(on ? "Temporary takeover: ON — type 'application exit' to end it." : "Temporary takeover: off — your device's own system is in charge.");
          throw new Error("usage: application takeover | application status | application exit");
        },
      };
      const run = async raw => {
        raw = raw.trim(); if (!raw) return print(`${ps.textContent}`, "pr");
        const shown = /^(signin|signup)\s+\S+\s+\S/.test(raw) ? raw.replace(/^(\S+\s+\S+\s+).*/, "$1••••••••") : raw;   // never show or remember passwords
        print(`${ps.textContent} ${shown}`, "pr");
        hist.push(shown); os.store.set("termhist", hist.slice(-100)); hi = hist.length;
        const [c, ...a] = raw.split(/\s+/);
        if (!cmds[c]) return print(`${c}: command not found (type 'help')`, "er");
        try { await cmds[c](a, raw); } catch (err) { print(`${c}: ${err.message}`, "er"); }
      };
      inp.addEventListener("keydown", async e => {
        if (e.key === "Enter") { const v = inp.value; inp.value = ""; await run(v); prompt(); term.scrollTop = term.scrollHeight; }
        if (e.key === "ArrowUp") { hi = Math.max(0, hi - 1); inp.value = hist[hi] || ""; e.preventDefault(); }
        if (e.key === "ArrowDown") { hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ""; e.preventDefault(); }
        if (e.key === "Tab") { e.preventDefault(); const parts = inp.value.split(" "), last = parts.pop();
          const pool = parts.length ? (() => { try { return fs.list(cwd).map(n => n.name); } catch { return []; } })() : Object.keys(cmds);
          const m = pool.filter(n => n.startsWith(last)); if (m.length === 1) inp.value = [...parts, m[0]].join(" "); else if (m.length) print(m.join("  ")); }
        if (e.key === "l" && e.ctrlKey) { e.preventDefault(); out.innerHTML = ""; }
      });
      term.addEventListener("click", () => inp.focus());
      print("Blockvile Plus Terminal — type 'help' for commands", "ac");
      prompt(); setTimeout(() => inp.focus(), 50);
    }
  });

  /* ---------------- Task manager ---------------- */
  A.push({
    id: "taskmgr", name: "Task Manager", icon: "📊", bg: "linear-gradient(135deg,#22c55e,#15803d)", cat: "System", system: true, keywords: "processes running memory activity monitor",
    render(body, os) {
      const fmtT = ms => { const s = Math.floor(ms / 1000); return s < 60 ? s + "s" : s < 3600 ? Math.floor(s / 60) + "m " + (s % 60) + "s" : Math.floor(s / 3600) + "h " + Math.floor(s / 60) % 60 + "m"; };
      let est = "—";
      navigator.storage?.estimate?.().then(e => est = fmtSize(e.usage || 0)).catch(() => { });
      const draw = () => {
        const run = os.running(), mem = performance.memory;
        body.innerHTML = `<div class="stat">
            <div><b>${run.length}</b><small>Apps running</small></div>
            <div><b>${fmtT(Date.now() - os.bootTime)}</b><small>Uptime</small></div>
            <div><b>${navigator.hardwareConcurrency || "?"}</b><small>CPU cores</small></div>
            <div><b>${mem ? fmtSize(mem.usedJSHeapSize) : navigator.deviceMemory ? navigator.deviceMemory + " GB" : "—"}</b><small>${mem ? "Memory in use" : "Device RAM"}</small></div>
            <div><b>${est}</b><small>Storage used</small></div>
            <div><b>${navigator.onLine ? "Online" : "Offline"}</b><small>Network</small></div></div>
          <div class="h">Running apps</div>
          ${run.length ? run.map(r => `<div class="tm-row"><span>${r.app.icon}</span><b>${r.app.name}</b><small class="muted">${fmtT(Date.now() - r.started)}</small><button class="btn ghost" data-kill-app="${r.id}">End task</button></div>`).join("") : `<p class="muted">Nothing running</p>`}`;
      };
      body.addEventListener("click", e => { const k = e.target.closest("[data-kill-app]"); if (k) { os.close(k.dataset.killApp); setTimeout(draw, 250); } });
      draw(); const t = setInterval(draw, 2000); return () => clearInterval(t);
    }
  });

  /* ---------------- Notes (multiple notes) ---------------- */
  A.push({
    id: "notes", name: "Notes", icon: "📝", bg: "linear-gradient(135deg,#ffd76a,#ffb020)", cat: "Productivity", keywords: "memo write",
    render(body, os) {
      let notes = os.store.get("notesList", null);
      if (!notes) { const old = os.store.get("notes", ""); notes = old ? [{ id: uid(), body: old, t: Date.now() }] : []; os.store.set("notesList", notes); }
      let cur = null, q = "";
      const save = () => os.store.set("notesList", notes);
      const title = n => (n.body.split("\n")[0] || "New note").slice(0, 40);
      const list = () => {
        cur = null;
        const shown = notes.filter(n => n.body.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.t - a.t);
        body.innerHTML = `<div class="toolbar"><input class="field" placeholder="Search notes" data-q value="${esc(q)}" style="flex:1"><button class="btn" data-new>＋ New</button></div>
          ${shown.length ? shown.map(n => `<div class="todo" data-note="${n.id}" style="cursor:pointer"><span><b>${esc(title(n))}</b><br><small>${new Date(n.t).toLocaleString()}</small></span></div>`).join("") : `<p class="muted center" style="padding:30px">No notes yet</p>`}`;
        const qi = body.querySelector("[data-q]"); qi.oninput = () => { q = qi.value; list(); const n = body.querySelector("[data-q]"); n.focus(); n.setSelectionRange(q.length, q.length); };
      };
      const edit = n => {
        cur = n;
        body.innerHTML = `<div class="toolbar"><button class="btn ghost" data-back>‹ Notes</button><span class="muted" style="font-size:12px">Saved automatically</span>
          <button class="btn ghost" data-del style="margin-left:auto">🗑</button><button class="btn ghost" data-export>Save to Files</button></div>
          <textarea class="field" style="height:calc(100% - 56px)" placeholder="Write something…"></textarea>`;
        const ta = body.querySelector("textarea"); ta.value = n.body; ta.focus();
        ta.oninput = () => { n.body = ta.value; n.t = Date.now(); save(); };
      };
      body.addEventListener("click", async e => {
        if (e.target.closest("[data-new]")) { const n = { id: uid(), body: "", t: Date.now() }; notes.push(n); save(); edit(n); }
        const it = e.target.closest("[data-note]"); if (it) edit(notes.find(n => n.id === it.dataset.note));
        if (e.target.closest("[data-back]")) { notes = notes.filter(n => n.body.trim()); save(); list(); }
        if (e.target.closest("[data-del]") && cur && await BV.confirm("Delete this note?", { ok: "Delete", danger: true })) { notes = notes.filter(n => n !== cur); save(); list(); }
        if (e.target.closest("[data-export]") && cur) { const p = "/Documents/" + title(cur).replace(/[\/\\:*?"<>|]/g, "") + ".txt"; try { os.fs.write(p, cur.body); os.toast("💾 Saved to " + p); } catch (err) { os.toast("⚠ " + err.message); } }
      });
      os.onBack("notes", () => { if (cur) { notes = notes.filter(n => n.body.trim()); save(); list(); return true; } });
      list();
    }
  });

  /* ---------------- Calculator ---------------- */
  A.push({
    id: "calculator", name: "Calculator", icon: "🧮", bg: "linear-gradient(135deg,#ff8a4c,#ff5a2a)", cat: "Productivity", size: [380, 600], keywords: "math sum",
    render(body) {
      let cur = "0", prev = null, op = null, fresh = false;
      const keys = ["AC", "±", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "="];
      body.innerHTML = `<div class="calc"><div class="calc-out">0</div>${keys.map(k =>
        `<button class="${"÷×−+=".includes(k) ? "op" : ""} ${"AC±%".includes(k) ? "fn" : ""} ${k === "0" ? "zero" : ""}" data-k="${k}">${k}</button>`).join("")}</div>`;
      const out = body.querySelector(".calc-out");
      const calc = (a, b, o) => ({ "+": a + b, "−": a - b, "×": a * b, "÷": b === 0 ? NaN : a / b })[o];
      const fmt = n => (isFinite(n) ? +n.toPrecision(12) : "Error").toString();
      const press = k => {
        if (/[0-9]/.test(k)) { cur = (cur === "0" || fresh) ? k : cur + k; fresh = false; }
        else if (k === ".") { if (fresh) { cur = "0"; fresh = false; } if (!cur.includes(".")) cur += "."; }
        else if (k === "AC") { cur = "0"; prev = null; op = null; }
        else if (k === "±") cur = fmt(-parseFloat(cur));
        else if (k === "%") cur = fmt(parseFloat(cur) / 100);
        else if (k === "=") { if (op) { cur = fmt(calc(prev, parseFloat(cur), op)); op = null; prev = null; fresh = true; } }
        else { if (op && !fresh) cur = fmt(calc(prev, parseFloat(cur), op)); prev = parseFloat(cur); op = k; fresh = true; }
        out.textContent = cur;
      };
      body.onclick = e => { const k = e.target.dataset.k; if (k) press(k); };
      const win = body.closest(".win");
      const kd = e => {
        if (win.style.zIndex != Math.max(...[...document.querySelectorAll(".win:not(.min)")].map(w => +w.style.zIndex))) return;
        if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
        const m = { "*": "×", "/": "÷", "-": "−", "+": "+", Enter: "=", "=": "=", Escape: null, Backspace: "AC", ".": ".", "%": "%" };
        if (/^[0-9]$/.test(e.key)) press(e.key); else if (m[e.key]) { e.preventDefault(); press(m[e.key]); }
      };
      document.addEventListener("keydown", kd);
      return () => document.removeEventListener("keydown", kd);
    }
  });

  /* ---------------- Clock (clock, alarms, stopwatch, timer) ---------------- */
  A.push({
    id: "clock", name: "Clock", icon: "⏰", bg: "linear-gradient(135deg,#2b2f3a,#11131a)", cat: "Productivity", keywords: "alarm timer stopwatch world",
    render(body, os) {
      body.innerHTML = tabs([["clock", "Clock"], ["alarm", "Alarms"], ["sw", "Stopwatch"], ["timer", "Timer"]], "clock") + `<div data-v></div>`;
      const v = body.querySelector("[data-v]"); let tick = null;
      const f2 = n => String(n).padStart(2, "0");
      const views = {
        clock() {
          v.innerHTML = `<div class="big-clock" data-c></div><p class="center muted" data-d></p>
            <div class="list" style="margin-top:20px">${[["London", "Europe/London"], ["New York", "America/New_York"], ["Dubai", "Asia/Dubai"], ["Tokyo", "Asia/Tokyo"], ["Sydney", "Australia/Sydney"]].map(([n, z]) =>
              `<div><span>${n}</span><b data-z="${z}"></b></div>`).join("")}</div>`;
          const up = () => { const d = new Date(), h12 = !os.state.use24h;
            v.querySelector("[data-c]").textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: h12 });
            v.querySelector("[data-d]").textContent = d.toDateString();
            v.querySelectorAll("[data-z]").forEach(el => el.textContent = d.toLocaleTimeString([], { timeZone: el.dataset.z, hour: "2-digit", minute: "2-digit", hour12: h12 })); };
          up(); tick = setInterval(up, 1000);
        },
        alarm() {
          const draw = () => { const al = os.store.get("alarms", []);
            v.innerHTML = `<div class="toolbar"><input type="time" class="field" data-t style="width:auto" value="07:00"><input class="field" data-l placeholder="Label" style="flex:1;min-width:100px"><button class="btn" data-add>＋ Add</button></div>
              ${al.length ? `<div class="list">${al.map(a => `<div><span><b style="font-size:24px;font-weight:300">${a.time}</b><br><small>${esc(a.label || "Alarm")}</small></span><span class="row"><i class="switch ${a.on ? "on" : ""}" data-tog="${a.id}"></i><button data-del="${a.id}">🗑</button></span></div>`).join("")}</div>` : `<p class="muted center">No alarms</p>`}
              <p class="muted" style="font-size:11px">Alarms ring while Blockvile Plus is open in your browser.</p>`; };
          v.onclick = e => { let al = os.store.get("alarms", []);
            if (e.target.closest("[data-add]")) { const time = v.querySelector("[data-t]").value, label = v.querySelector("[data-l]").value;
              al.push({ id: uid(), time, label, on: true });
              if (window.BV.android?.available) { const [h, m] = time.split(":").map(Number); window.BV.android.setAlarm(h, m, label); os.toast("⏰ Alarm set — also on your phone's clock, so it rings even when Blockvile is closed"); }
              else os.toast("⏰ Alarm set"); }
            const t = e.target.closest("[data-tog]"); if (t) { const a = al.find(a => a.id === t.dataset.tog); a.on = !a.on; a.last = null; }
            const d = e.target.closest("[data-del]"); if (d) al = al.filter(a => a.id !== d.dataset.del);
            os.store.set("alarms", al); if (e.target.closest("button,.switch")) draw(); };
          draw();
        },
        sw() {
          let start = 0, acc = 0, run = false; const laps = [];
          const f = ms => `${f2(Math.floor(ms / 60000))}:${f2(Math.floor(ms / 1000) % 60)}.${f2(Math.floor(ms / 10) % 100)}`;
          v.innerHTML = `<div class="big-clock" data-c>00:00.00</div><div class="row" style="justify-content:center"><button class="btn" data-a>Start</button><button class="btn ghost" data-lap>Lap</button><button class="btn ghost" data-r>Reset</button></div><div class="list" data-laps style="margin-top:14px"></div>`;
          const c = v.querySelector("[data-c]"), a = v.querySelector("[data-a]"), now = () => acc + (run ? Date.now() - start : 0);
          tick = setInterval(() => { if (run) c.textContent = f(now()); }, 33);
          a.onclick = () => { run = !run; if (run) start = Date.now(); else acc += Date.now() - start; a.textContent = run ? "Pause" : "Start"; };
          v.querySelector("[data-lap]").onclick = () => { if (!run) return; laps.unshift(now()); v.querySelector("[data-laps]").innerHTML = laps.map((l, i) => `<div><span>Lap ${laps.length - i}</span><b>${f(l)}</b></div>`).join(""); };
          v.querySelector("[data-r]").onclick = () => { run = false; acc = 0; laps.length = 0; c.textContent = f(0); a.textContent = "Start"; v.querySelector("[data-laps]").innerHTML = ""; };
        },
        timer() {
          let left = 300000, end = 0;
          const f = ms => `${f2(Math.floor(ms / 60000))}:${f2(Math.ceil(ms / 1000) % 60 === 60 ? 0 : Math.ceil(ms / 1000) % 60)}`;
          v.innerHTML = `<div class="big-clock" data-c>05:00</div><div class="row" style="justify-content:center;flex-wrap:wrap">
            ${[1, 3, 5, 10, 25].map(m => `<button class="btn ghost" data-m="${m}">${m} min</button>`).join("")}</div>
            <div class="row" style="justify-content:center;margin-top:10px"><button class="btn" data-s>Start</button><button class="btn ghost" data-x>Cancel</button></div>`;
          const c = v.querySelector("[data-c]");
          v.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { end = 0; left = b.dataset.m * 60000; c.textContent = f(left); });
          v.querySelector("[data-s]").onclick = () => { if (!end) { end = Date.now() + left; if (window.BV.android?.available) window.BV.android.setTimer(left / 1000, "Blockvile timer"); } };
          v.querySelector("[data-x]").onclick = () => { end = 0; c.textContent = f(left); };
          tick = setInterval(() => { if (!end) return; const l = end - Date.now();
            if (l <= 0) { end = 0; c.textContent = "00:00"; os.notify({ app: "clock", icon: "⏲", title: "Timer", text: "Time's up!" }); os.beep(988, 300, 4, os.state.volume / 100); } else c.textContent = f(l); }, 200);
        }
      };
      body.querySelector(".seg").onclick = e => { const t = e.target.dataset.tab; if (!t) return;
        body.querySelectorAll(".seg button").forEach(b => b.classList.toggle("on", b === e.target)); clearInterval(tick); v.onclick = null; views[t](); };
      views.clock();
      return () => clearInterval(tick);
    }
  });

  /* ---------------- Calendar ---------------- */
  A.push({
    id: "calendar", name: "Calendar", icon: "📅", bg: "linear-gradient(135deg,#ff5f6d,#ffc371)", cat: "Productivity", keywords: "events schedule agenda date",
    render(body, os) {
      const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      let view = new Date(); view.setDate(1); let sel = iso(new Date());
      const draw = () => {
        const ev = os.store.get("events", []), y = view.getFullYear(), m = view.getMonth();
        const first = new Date(y, m, 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
        const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
        const today = iso(new Date()), dayEv = ev.filter(e => e.date === sel).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        body.innerHTML = `<div class="cal-head"><button class="btn ghost" data-nav="-1">‹</button><b>${first.toLocaleDateString([], { month: "long", year: "numeric" })}</b><button class="btn ghost" data-nav="1">›</button></div>
          <div class="cal-grid">${["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => `<span class="dn">${d}</span>`).join("")}
          ${days.map(d => { const k = iso(d); return `<button data-day="${k}" class="${k === today ? "today" : ""} ${k === sel ? "sel" : ""} ${d.getMonth() !== m ? "other" : ""} ${ev.some(e => e.date === k) ? "has" : ""}">${d.getDate()}</button>`; }).join("")}</div>
          <div class="h" style="margin-top:16px">${new Date(sel + "T12:00").toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</div>
          ${dayEv.map(e => `<div class="todo"><span>${esc(e.title)}</span><small>${e.time || "All day"}</small>${window.BV.android?.available ? `<button data-tophone="${e.id}" title="Add to phone calendar">📲</button>` : ""}<button data-del="${e.id}">🗑</button></div>`).join("") || `<p class="muted" style="margin:0 6px 10px">No events</p>`}
          <div class="toolbar"><input class="field" data-title placeholder="New event" style="flex:1;min-width:120px"><input type="time" class="field" data-time style="width:auto"><button class="btn" data-add>Add</button></div>`;
      };
      body.addEventListener("click", e => {
        const n = e.target.closest("[data-nav]"); if (n) { view.setMonth(view.getMonth() + +n.dataset.nav); draw(); }
        const d = e.target.closest("[data-day]"); if (d) { sel = d.dataset.day; draw(); }
        if (e.target.closest("[data-add]")) { const t = body.querySelector("[data-title]").value.trim(); if (!t) return;
          const ev = os.store.get("events", []); ev.push({ id: uid(), date: sel, time: body.querySelector("[data-time]").value, title: t }); os.store.set("events", ev); draw(); }
        const x = e.target.closest("[data-del]"); if (x) { os.store.set("events", os.store.get("events", []).filter(e => e.id !== x.dataset.del)); draw(); }
        const ph = e.target.closest("[data-tophone]"); if (ph) { const ev = os.store.get("events", []).find(e => e.id === ph.dataset.tophone); if (!ev) return;
          const start = new Date(ev.date + "T" + (ev.time || "09:00")).getTime(); window.BV.android.addCalendarEvent(ev.title, start, start + 3600000); }
      });
      draw();
    }
  });

  /* ---------------- Reminders ---------------- */
  A.push({
    id: "reminders", name: "Reminders", icon: "✅", bg: "linear-gradient(135deg,#34d399,#0ea5e9)", cat: "Productivity", keywords: "todo tasks list checklist",
    render(body, os) {
      let showDone = false;
      const draw = () => {
        const t = os.store.get("todos", []), open = t.filter(x => !x.done), done = t.filter(x => x.done);
        const row = x => `<div class="todo ${x.done ? "done" : ""}"><input type="checkbox" data-chk="${x.id}" ${x.done ? "checked" : ""}><span>${esc(x.text)}</span>${x.due ? `<small>${new Date(x.due).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</small>` : ""}<button data-del="${x.id}">🗑</button></div>`;
        body.innerHTML = `<div class="toolbar"><input class="field" data-text placeholder="New reminder" style="flex:1;min-width:140px"><input type="datetime-local" class="field" data-due style="width:auto"><button class="btn" data-add>Add</button></div>
          ${open.map(row).join("") || `<p class="muted center" style="padding:16px">All done 🎉</p>`}
          ${done.length ? `<button class="btn ghost" data-show style="margin:10px 0">${showDone ? "Hide" : "Show"} completed (${done.length})</button>${showDone ? done.map(row).join("") : ""}` : ""}`;
      };
      const upd = fn => { const t = os.store.get("todos", []); os.store.set("todos", fn(t) || t); draw(); };
      body.addEventListener("click", e => {
        if (e.target.closest("[data-add]")) { const text = body.querySelector("[data-text]").value.trim(); if (!text) return; const due = body.querySelector("[data-due]").value; upd(t => { t.push({ id: uid(), text, due, done: false }); }); }
        const d = e.target.closest("[data-del]"); if (d) upd(t => t.filter(x => x.id !== d.dataset.del));
        if (e.target.closest("[data-show]")) { showDone = !showDone; draw(); }
      });
      body.addEventListener("change", e => { const c = e.target.dataset.chk; if (c) upd(t => { const x = t.find(x => x.id === c); x.done = e.target.checked; }); });
      body.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset.text !== undefined) body.querySelector("[data-add]").click(); });
      draw();
    }
  });

  /* ---------------- Phone & contacts ---------------- */
  A.push({
    id: "phone", name: "Phone", icon: "📞", bg: "linear-gradient(135deg,#4ade80,#16a34a)", cat: "Communication", dock: true, keywords: "call dial contacts",
    render(body, os) {
      let num = "", tab = "keypad";
      const call = n => { const log = os.store.get("calls", []); log.unshift({ n, t: Date.now() }); os.store.set("calls", log.slice(0, 30)); const a = document.createElement("a"); a.href = "tel:" + n.replace(/[^\d+*#]/g, ""); a.click(); os.toast("📞 Calling " + n); };
      const draw = () => {
        const contacts = os.store.get("contacts", []).sort((a, b) => a.name.localeCompare(b.name)), log = os.store.get("calls", []);
        const nameOf = n => contacts.find(c => c.num === n)?.name || n;
        body.innerHTML = tabs([["keypad", "Keypad"], ["recent", "Recents"], ["contacts", "Contacts"]], tab) + ({
          keypad: () => `<div class="dial-num">${esc(num) || "&nbsp;"}</div><div class="dial">${[..."123456789*0#"].map(k => `<button data-d="${k}">${k}</button>`).join("")}<button class="call" data-call>📞</button></div>
            <div class="row" style="justify-content:center;margin-top:10px"><button class="btn ghost" data-bs>⌫</button><button class="btn ghost" data-save>＋ Save contact</button></div>
            <p class="muted center" style="font-size:11px;margin-top:10px">Calls go through your device's phone app, if it has one.</p>`,
          recent: () => log.length ? `<div class="list">${log.map(c => `<button data-calln="${esc(c.n)}"><span>${esc(nameOf(c.n))}<br><small>${new Date(c.t).toLocaleString()}</small></span><small>📞</small></button>`).join("")}</div>` : `<p class="muted center">No recent calls</p>`,
          contacts: () => `<div class="toolbar"><input class="field" data-cn placeholder="Name" style="flex:1;min-width:100px"><input class="field" data-cnum placeholder="Number" inputmode="tel" style="flex:1;min-width:100px"><button class="btn" data-addc>Add</button></div>
            ${contacts.length ? `<div class="list">${contacts.map(c => `<div><span>👤 ${esc(c.name)}<br><small>${esc(c.num)}</small></span><span class="row"><button data-calln="${esc(c.num)}">📞</button><button data-delc="${c.id}">🗑</button></span></div>`).join("")}</div>` : `<p class="muted center">No contacts</p>`}`,
        })[tab]();
      };
      body.addEventListener("click", async e => {
        const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; return draw(); }
        const d = e.target.closest("[data-d]"); if (d) { num += d.dataset.d; return draw(); }
        if (e.target.closest("[data-bs]")) { num = num.slice(0, -1); return draw(); }
        if (e.target.closest("[data-call]") && num) return call(num);
        const c = e.target.closest("[data-calln]"); if (c) return call(c.dataset.calln);
        if (e.target.closest("[data-save]") && num) { const name = await BV.ask("Contact name"); if (name) { const cs = os.store.get("contacts", []); cs.push({ id: uid(), name, num }); os.store.set("contacts", cs); os.toast("Saved " + name); } return; }
        if (e.target.closest("[data-addc]")) { const name = body.querySelector("[data-cn]").value.trim(), n = body.querySelector("[data-cnum]").value.trim(); if (!name || !n) return; const cs = os.store.get("contacts", []); cs.push({ id: uid(), name, num: n }); os.store.set("contacts", cs); return draw(); }
        const dc = e.target.closest("[data-delc]"); if (dc) { os.store.set("contacts", os.store.get("contacts", []).filter(c => c.id !== dc.dataset.delc)); draw(); }
      });
      draw();
    }
  });

  /* ---------------- About ---------------- */
  A.push({
    id: "about", name: "About", icon: "ℹ️", bg: "linear-gradient(135deg,#ff6a3d,#2f6bff)", cat: "System", system: true, size: [520, 560],
    render(body, os) {
      const ua = navigator.userAgent, br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
      body.innerHTML = `<img src="icons/logo.svg" class="about-logo" alt=""><h2 class="center">Blockvile Plus OS</h2>
        <p class="center muted">Version 3.0 · ${cap(os.state.mode)} mode</p>
        <div class="list" style="margin-top:16px">
          <div><span>Device name</span><small>${esc(os.state.username)}'s Blockvile</small></div>
          <div><span>Running on</span><small>${br}</small></div>
          <div><span>Screen</span><small>${screen.width} × ${screen.height}</small></div>
          <div><span>Processor</span><small>${navigator.hardwareConcurrency || "?"} cores</small></div>
          <div><span>Apps</span><small>${os.installed().length} installed</small></div>
        </div>
        <div class="row" style="justify-content:center"><button class="btn" data-h>⌨ Keyboard shortcuts</button><button class="btn ghost" data-u>📊 Task Manager</button></div>`;
      body.querySelector("[data-h]").onclick = () => os.showHelp();
      body.querySelector("[data-u]").onclick = () => os.open("taskmgr");
    }
  });
  const cap = s => s[0].toUpperCase() + s.slice(1);
})();
