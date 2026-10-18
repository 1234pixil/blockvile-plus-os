/* Blockvile Plus OS — core shell (v3) */
(() => {
  const { store, idb, fs, esc, safeMath, beep } = window.BV;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const screenEl = $("#screen");
  const MODES = ["phone", "tablet", "laptop"];
  const WALLS = [
    [["#7ab8ff", "#c7a6ff", "#ffd2a8"], ["#1b2a55", "#3a1f5c", "#5a2a24"]],
    [["#5ee7df", "#4f8dff", "#b8f1ff"], ["#0b3a4a", "#10275a", "#062a36"]],
    [["#ff9a8b", "#ff6a88", "#ffd36e"], ["#5a1e2e", "#4a1a3a", "#5a3a12"]],
    [["#d9dde5", "#bfc5d1", "#eef0f4"], ["#1c1f26", "#14161b", "#22252d"]],
  ];
  const ACCENTS = ["#2f6bff", "#ff6a3d", "#22c55e", "#a855f7", "#ec4899", "#0ea5e9", "#eab308"];
  const FLAGS = ["dnd", "nightLight", "saver", "landscape", "airplane", "torch", "reduceMotion", "highContrast", "largeText"];
  const APPS = window.BV_APPS;

  /* ================= State ================= */
  const guessMode = () => innerWidth < 700 ? "phone" : innerWidth < 1200 ? "tablet" : "laptop";
  const defaults = {
    theme: "light", autoTheme: false, mode: guessMode(), wall: 0, wallImg: false, exited: false,
    accent: ACCENTS[0], volume: 60, brightness: 100, flags: {}, pin: "", autolock: 0, use24h: true,
    username: "User", removed: [], dock: APPS.filter(a => a.dock).map(a => a.id), powered: true,
    haptics: matchMedia("(pointer: coarse)").matches, clicks: false,
  };
  const state = Object.assign({}, defaults, store.get("state", {}));
  delete state.fullDevice; // older versions saved a takeover setting; takeover is now always temporary and never saved
  state.flags = Object.assign({}, state.flags);
  // Apps marked defaultOff start uninstalled (only the first time the OS sees them)
  const applyDefaultOff = () => { state.known = state.known || [];
  APPS.forEach(a => { if (!state.known.includes(a.id)) { state.known.push(a.id); if (a.defaultOff && !state.removed.includes(a.id)) state.removed.push(a.id); } }); };
  applyDefaultOff();
  const save = () => store.set("state", state);
  const bootTime = Date.now();

  /* ================= Apply settings ================= */
  const mql = matchMedia("(prefers-color-scheme: dark)");
  const effectiveTheme = () => state.autoTheme ? (mql.matches ? "dark" : "light") : state.theme;
  function apply() {
    const t = effectiveTheme();
    root.dataset.theme = t;
    root.dataset.mode = state.mode;
    const [a, b, c] = WALLS[state.wall][t === "dark" ? 1 : 0];
    root.style.setProperty("--wall-a", a); root.style.setProperty("--wall-b", b); root.style.setProperty("--wall-c", c);
    root.style.setProperty("--accent", state.accent);
    FLAGS.forEach(f => root.classList.toggle("f-" + f, !!state.flags[f]));
    root.classList.toggle("os-exited", state.exited);
    $$('[data-action="toggle-dark"]').forEach(el => el.classList.toggle("on", t === "dark"));
    $$('[data-action="toggle-flag"]').forEach(el => el.classList.toggle("on", !!state.flags[el.dataset.flag]));
    $$('.cc-tile[data-mode]').forEach(el => el.classList.toggle("on", el.dataset.mode === state.mode));
    $$("[data-mode-label]").forEach(el => el.textContent = cap(state.mode));
    $$("[data-username]").forEach(el => el.textContent = state.username);
    $("#volume").value = state.volume; $("#brightness").value = state.brightness;
    $("#dim").style.opacity = (100 - state.brightness) / 100 * 0.75;
    tickClock();
    window.dispatchEvent(new Event("bv:changed"));
  }
  mql.addEventListener?.("change", apply);
  const cap = s => s[0].toUpperCase() + s.slice(1);

  async function loadWallImg() {
    if (!state.wallImg) { screenEl.classList.remove("has-img"); return; }
    try { const r = await idb.get("kv", "wallpaper"); if (r?.blob) { screenEl.style.setProperty("--wall-img", `url(${URL.createObjectURL(r.blob)})`); screenEl.classList.add("has-img"); } }
    catch { screenEl.classList.remove("has-img"); }
  }
  async function setWallpaperBlob(blob) {
    try { await idb.put("kv", { id: "wallpaper", blob }); state.wallImg = true; save(); await loadWallImg(); toast("🖼 Wallpaper set"); }
    catch { toast("Couldn't save wallpaper"); }
  }
  function setWall(i) { state.wall = i; state.wallImg = false; save(); apply(); loadWallImg(); }

  function toggleDark() { state.autoTheme = false; state.theme = effectiveTheme() === "dark" ? "light" : "dark"; save(); apply(); toast(state.theme === "dark" ? "🌙 Dark mode on" : "☀️ Dark mode off"); }
  const FLAG_LABEL = { dnd: "🌙 Do not disturb", nightLight: "🌅 Night light", saver: "🔋 Battery saver", landscape: "⟳ Landscape", airplane: "✈ Airplane mode", torch: "🔦 Torch", reduceMotion: "Reduce motion", highContrast: "High contrast", largeText: "Large text" };
  function setFlag(f, v) { state.flags[f] = v === undefined ? !state.flags[f] : !!v; save(); apply(); toast(`${FLAG_LABEL[f]} ${state.flags[f] ? "on" : "off"}`); window.dispatchEvent(new CustomEvent("bv:flag", { detail: { flag: f, on: state.flags[f] } })); }

  /* ================= Exit / power ================= */
  // Installed as an app (home-screen icon / desktop app window)? The manifest starts the app with ?source=app.
  const launchedAsApp = /[?&]source=app\b/.test(location.search) || navigator.standalone === true ||
    matchMedia("(display-mode: standalone), (display-mode: minimal-ui)").matches;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const isTouch = matchMedia("(pointer: coarse)").matches;
  function toggleExit() {
    // Android app: give the phone straight back to its normal home screen
    if (!state.exited && BV.android?.available) { closeOverlays(); BV.android.exitToSystem(); return; }
    state.exited = !state.exited; save(); closeOverlays();
    tellParent(state.exited ? "exit" : "enter");
    if (state.exited) {
      endTakeover(true);
      if (launchedAsApp && !BV.embedded) { try { window.close(); } catch { } }   // installed app: close its window → back to the desktop / phone
      updateHost();
    } else boot();
    apply();
  }
  // Pages that embed Blockvile in an <iframe> hear about Exit / re-entry and can react (e.g. hide the frame)
  function tellParent(what) { if (!BV.embedded) return; try { window.parent.postMessage({ type: "blockvile:" + what }, "*"); } catch { } }
  window.addEventListener("message", e => {
    if (e.source !== window.parent || !e.data || typeof e.data.type !== "string") return;
    if (e.data.type === "blockvile:exit" && !state.exited) toggleExit();
    if (e.data.type === "blockvile:enter" && state.exited) toggleExit();
  });

  /* ================= Temporary takeover =================
     Starts ONLY when the user presses "Temporarily let Blockvile take over this device".
     While it runs, Blockvile acts as the device's system: full screen with the browser's bars hidden,
     the screen kept awake, keys like Esc captured, and a warning before the page is closed.
     It is never saved and never permanent: it ends with Exit, the End button, the Terminal command
     `application exit`, or when the page/app is closed or the device restarts.
     (In the Android app the native side does the same with a temporary home screen.) */
  let takeover = false, wakeLock = null;
  const nativeTakeover = () => !!(BV.android?.available && BV.android.takeover().active);
  const isTakeover = () => BV.android?.available ? nativeTakeover() : takeover;
  const tkActive = () => takeover && !state.exited && state.powered;
  function showTakeover() {
    const on = isTakeover();
    root.classList.toggle("takeover", on);
    $$('[data-action="takeover-toggle"]').forEach(el => el.classList.toggle("on", on));
    window.dispatchEvent(new Event("bv:changed"));
  }
  async function grabDevice() {
    if (!tkActive()) return;
    try { if (!document.fullscreenElement && document.fullscreenEnabled) await document.documentElement.requestFullscreen({ navigationUI: "hide" }); } catch { }
    try { if (document.fullscreenElement && navigator.keyboard?.lock) await navigator.keyboard.lock(); } catch { }
    try { if (!wakeLock && navigator.wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } } catch { }
  }
  function releaseDevice() {
    try { navigator.keyboard?.unlock(); } catch { }
    try { wakeLock?.release(); } catch { } wakeLock = null;
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch { }
  }
  async function startTakeover() {
    closeOverlays();
    if (BV.android?.available) { BV.android.startTakeover(); return; }   // Android: temporary home screen, Android asks first
    if (takeover) return toast("⛶ The temporary takeover is already on");
    if (state.exited) { state.exited = false; save(); apply(); }
    takeover = true; showTakeover(); tellParent("takeover-start");
    await grabDevice();
    const full = !!document.fullscreenElement;
    toast(full ? `⛶ Temporary takeover on — end it with ⏻ Exit${isTouch ? "" : ", Ctrl+Shift+E"} or "application exit" in Terminal`
      : isIOS ? "⛶ Temporary takeover on — iPhone browsers can't go full screen; add Blockvile to your Home Screen for that"
      : BV.embedded ? "⛶ Temporary takeover on — this page doesn't allow full screen, so Blockvile stays in its frame"
      : "⛶ Temporary takeover on — your browser didn't allow full screen; tap anywhere to try again");
  }
  // Ends the takeover. Returns true if one was running. (Android: hands the phone back to its own home screen.)
  function endTakeover(quiet) {
    if (BV.android?.available) { if (!nativeTakeover()) return false; BV.android.exitToSystem(); return true; }
    if (!takeover) return false;
    takeover = false; releaseDevice(); showTakeover(); tellParent("takeover-end");
    if (!quiet) toast("Temporary takeover ended — your device is back to normal");
    return true;
  }
  const toggleTakeover = () => isTakeover() ? endTakeover() : startTakeover();
  // Browsers only allow full screen after a tap or key press, so while the takeover runs, re-enter on the next one
  const tkGesture = e => { if (tkActive() && !document.fullscreenElement && document.fullscreenEnabled && !e.target.closest?.("#host, #off, .bv-dialog, [data-action='toggle-exit'], [data-power='exit'], [data-action='end-takeover'], [data-action='takeover-toggle']")) grabDevice(); };
  document.addEventListener("pointerup", tkGesture, true);
  document.addEventListener("keyup", tkGesture, true);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && tkActive() && !wakeLock && navigator.wakeLock) navigator.wakeLock.request("screen").then(l => { wakeLock = l; l.addEventListener("release", () => { wakeLock = null; }); }).catch(() => { }); });
  window.addEventListener("beforeunload", e => { if (tkActive()) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("bv:takeover", showTakeover);   // Android: takeover started or ended natively
  window.addEventListener("bv:takeover-refresh", showTakeover);

  /* ================= Touch feedback ================= */
  document.addEventListener("pointerdown", e => {
    if (!state.haptics && !state.clicks) return;
    if (!e.target.closest?.("button, .app, [data-open], [data-action], [data-tb], .switch, input[type=checkbox]")) return;
    if (state.haptics) { try { navigator.vibrate?.(9); } catch { } }
    if (state.clicks) beep(1500, 18, 1, Math.max(0.05, state.volume / 100) * 0.35);
  }, true);
  function updateHost() {
    const embedded = BV.embedded;
    $("[data-host-msg]").textContent = embedded ? "Blockvile is closed. The rest of this page works as normal."
      : launchedAsApp ? "Close this window to get back to your device — or jump back in."
      : "Your browser and device are all yours again.";
    $('[data-action="host-close"]').hidden = embedded;
    $('[data-action="host-back"]').hidden = embedded || history.length < 2;
    $("[data-host-hint]").innerHTML = isTouch ? "" : `Come back any time: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd>`;
  }
  function hostClose() {
    try { window.close(); } catch { }
    setTimeout(() => { // still here → the browser didn't allow it
      $("[data-host-hint]").innerHTML = isTouch ? "Your browser kept this tab open — close it from your tabs list."
        : `Your browser kept this tab open — press <kbd>${isMac ? "⌘" : "Ctrl"}</kbd> + <kbd>W</kbd> to close it.`;
    }, 300);
  }
  function power(action) {
    closeOverlays();
    if (action === "lock") lock();
    if (action === "sleep") { $("#sleep").classList.add("on"); }
    if (action === "restart") { closeAll(true); boot(); }
    if (action === "shutdown") { closeAll(true); state.powered = false; save(); $("#off").classList.add("on"); }
    if (action === "exit") toggleExit();
  }
  function wake() { $("#sleep").classList.remove("on"); lock(); }
  function powerOn() { state.powered = true; save(); $("#off").classList.remove("on"); boot(); }

  /* ================= Modes ================= */
  function setMode(m) {
    if (!MODES.includes(m)) return;
    state.mode = m; save(); apply(); closeOverlays();
    layoutWindows(); renderAll();
    toast({ phone: "📱 Phone mode", tablet: "📲 Tablet mode", laptop: "💻 Laptop mode" }[m]);
  }
  const cycleMode = () => setMode(MODES[(MODES.indexOf(state.mode) + 1) % 3]);

  /* ================= Clock, battery, weather ================= */
  function tickClock() {
    const d = new Date(), h12 = !state.use24h;
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: h12 });
    $$('[data-clock="time"],[data-clock="short"]').forEach(e => e.textContent = time);
    $$('[data-clock="date"]').forEach(e => e.textContent = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }));
    $$('[data-clock="dshort"]').forEach(e => e.textContent = d.toLocaleDateString());
    $$('[data-clock="mbar"]').forEach(e => e.textContent = d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) + "  " + time);
  }
  setInterval(tickClock, 10000);
  const setBatt = p => { $$("[data-battery]").forEach(e => e.textContent = Math.round(p * 100) + "%"); $$("[data-battery-bar]").forEach(e => e.style.width = p * 100 + "%"); };
  navigator.getBattery?.().then(b => { const u = () => setBatt(b.level); u(); b.addEventListener("levelchange", u); }).catch(() => { });

  const WX = { 0: ["☀️", "Clear"], 1: ["🌤", "Mostly clear"], 2: ["⛅", "Partly cloudy"], 3: ["☁️", "Cloudy"], 45: ["🌫", "Fog"], 48: ["🌫", "Fog"], 51: ["🌦", "Drizzle"], 53: ["🌦", "Drizzle"], 55: ["🌦", "Drizzle"], 61: ["🌧", "Rain"], 63: ["🌧", "Rain"], 65: ["🌧", "Heavy rain"], 71: ["🌨", "Snow"], 73: ["🌨", "Snow"], 75: ["❄️", "Heavy snow"], 80: ["🌦", "Showers"], 81: ["🌧", "Showers"], 82: ["⛈", "Storm showers"], 95: ["⛈", "Thunderstorm"], 96: ["⛈", "Thunderstorm"], 99: ["⛈", "Thunderstorm"] };
  const wxInfo = c => WX[c] || ["🌡", "—"];
  async function weather(force = false, place) {
    const cached = store.get("wx", null);
    if (!force && !place && cached && Date.now() - cached.t < 30 * 60000) { paintWx(cached); return cached; }
    const loc = place || store.get("wxloc", { name: "Gloucester", lat: 51.8642, lon: -2.2382 });
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=6`);
      const j = await r.json();
      const data = { t: Date.now(), loc: loc.name, temp: Math.round(j.current.temperature_2m), code: j.current.weather_code, wind: j.current.wind_speed_10m, hum: j.current.relative_humidity_2m,
        daily: j.daily.time.map((d, i) => ({ d, code: j.daily.weather_code[i], max: Math.round(j.daily.temperature_2m_max[i]), min: Math.round(j.daily.temperature_2m_min[i]) })) };
      store.set("wx", data); if (place) store.set("wxloc", loc); paintWx(data); return data;
    } catch { if (cached) { paintWx(cached); return cached; } paintWx(null); return null; }
  }
  function paintWx(d) {
    $$("[data-wx-ic]").forEach(e => e.textContent = d ? wxInfo(d.code)[0] : "🌡");
    $$("[data-wx-temp]").forEach(e => e.textContent = d ? d.temp + "°" : "--°");
    $$("[data-wx-desc]").forEach(e => e.textContent = d ? wxInfo(d.code)[1] : "Offline");
    $$("[data-wx-loc]").forEach(e => e.textContent = d ? d.loc : "Weather");
  }

  /* ================= Apps registry / install / dock ================= */
  const appById = id => APPS.find(a => a.id === id);
  const installed = () => APPS.filter(a => !state.removed.includes(a.id) && !a.hidden);
  function registerApp(app) { if (!appById(app.id)) APPS.push(app); state.removed = state.removed.filter(x => x !== app.id); if (!state.known.includes(app.id)) state.known.push(app.id); save(); renderAll(); }
  function unregisterApp(id) { close(id, true); const i = APPS.findIndex(a => a.id === id); if (i >= 0) APPS.splice(i, 1); state.dock = state.dock.filter(x => x !== id); save(); renderAll(); }
  function install(id, on) {
    const a = appById(id); if (!a || a.system) return;
    state.removed = state.removed.filter(x => x !== id);
    if (!on) { state.removed.push(id); close(id); state.dock = state.dock.filter(x => x !== id); }
    save(); renderAll(); toast(on ? `✅ ${a.name} installed` : `🗑 ${a.name} uninstalled`);
  }
  function pin(id, on) { state.dock = state.dock.filter(x => x !== id); if (on) state.dock.push(id); save(); renderAll(); }

  const badgeCount = id => notifs.filter(n => n.app === id).length;
  const appTile = a => { const n = badgeCount(a.id);
    return `<button class="app" data-open="${a.id}" data-app-tile="${a.id}"><i class="app-ic" style="background:${a.bg}">${a.icon}${n ? `<em class="badge">${n}</em>` : ""}</i><span>${a.name}</span></button>`; };
  function renderAll() {
    const inst = installed(), dockIds = state.dock.filter(id => inst.some(a => a.id === id));
    $("#appgrid").innerHTML = inst.filter(a => state.mode !== "phone" || !dockIds.includes(a.id)).map(appTile).join("");
    $("#dock").innerHTML = dockIds.map(id => appTile(appById(id))).join("");
    $("#dock").style.setProperty("--n", Math.max(4, dockIds.length));
    renderLauncher($("#launcher-search").value || "");
    renderTaskbar();
    const c = $(".tb-count"); c.textContent = notifs.length; c.classList.toggle("on", notifs.length > 0);
  }
  function renderLauncher(q) {
    q = q.toLowerCase();
    $("#launcher-grid").innerHTML = installed().filter(a => a.name.toLowerCase().includes(q)).map(appTile).join("");
  }
  $("#launcher-search").addEventListener("input", e => renderLauncher(e.target.value));
  $("#launcher-search").addEventListener("keydown", e => { if (e.key === "Enter") { const b = $("#launcher-grid .app"); b && open(b.dataset.open); } });
  function renderTaskbar() {
    root.classList.toggle("has-win", visibleWins().length > 0);
    const ids = [...new Set([...state.dock.filter(id => installed().some(a => a.id === id)), ...wins.keys()])];
    const top = topWin();
    $("#tb-apps").innerHTML = ids.map(id => { const a = appById(id), w = wins.get(id);
      return `<button class="tb-app ${w ? "running" : ""} ${w && w.el === top ? "active" : ""}" data-tb="${id}" data-app-tile="${id}" title="${a.name}">${a.icon}</button>`; }).join("");
    $("#mb-app").textContent = top ? appById(top.dataset.app).name : "Desktop";
  }
  $("#tb-apps").addEventListener("click", e => {
    const b = e.target.closest("[data-tb]"); if (!b) return;
    const w = wins.get(b.dataset.tb);
    if (w && w.el === topWin()) { w.el.classList.add("min"); renderTaskbar(); } else open(b.dataset.tb);
  });

  /* ================= Windows ================= */
  const wins = new Map(); let z = 10, cascade = 0;
  const visibleWins = () => [...wins.values()].map(w => w.el).filter(el => !el.classList.contains("min"));
  const topWin = () => visibleWins().sort((a, b) => b.style.zIndex - a.style.zIndex)[0];
  function placeWin(el) {
    const W = Math.min(el.dataset.w || 760, innerWidth - 40), H = Math.min(el.dataset.h || 540, innerHeight - 140);
    el.style.width = W + "px"; el.style.height = H + "px";
    el.style.left = (90 + (cascade % 6) * 32) + "px"; el.style.top = (50 + (cascade % 6) * 32) + "px"; cascade++;
  }
  function open(id, args) {
    const a = appById(id); if (!a || state.removed.includes(id)) return;
    if (!wins.has(id)) { const o = store.get("opens", {}); o[id] = (o[id] || 0) + 1; store.set("opens", o); }
    if (a.launch) { closeOverlays(); a.launch(); return; } // shortcut apps open outside the OS
    if (state.flags.airplane && a.net) toast("✈ Airplane mode is on — this app needs internet");
    closeOverlays();
    if (wins.has(id)) {
      const w = wins.get(id);
      if (args !== undefined) { close(id, true); } else { w.el.classList.remove("min"); focus(w.el); layoutWindows(); return; }
    }
    const el = document.createElement("section");
    el.className = "win"; el.dataset.app = id;
    if (a.size) { el.dataset.w = a.size[0]; el.dataset.h = a.size[1]; }
    el.innerHTML = `<header class="win-bar"><span class="w-ic">${a.icon}</span><span class="w-title">${a.name}</span>
      <div class="win-btns"><button class="w-min" title="Minimise">–</button><button class="w-max" title="Maximise">▢</button><button class="w-close" title="Close">✕</button></div></header>
      <div class="win-body"></div>`;
    if (state.mode === "laptop") placeWin(el);
    $("#windows").appendChild(el);
    const w = { el, started: Date.now(), cleanup: null };
    wins.set(id, w);
    try { w.cleanup = a.render(el.querySelector(".win-body"), api, args); }
    catch (err) { el.querySelector(".win-body").innerHTML = `<p class="muted">This app crashed: ${esc(err.message)}</p>`; console.error(err); }
    // clear this app's badges when opened
    if (badgeCount(id)) { notifs = notifs.filter(n => n.app !== id); saveNotifs(); renderNotifs(); }
    focus(el); bindWin(el, id); layoutWindows(); renderTaskbar();
  }
  function close(id, instant) {
    const w = wins.get(id); if (!w) return;
    try { typeof w.cleanup === "function" && w.cleanup(); } catch { }
    wins.delete(id);
    if (instant) w.el.remove(); else { w.el.classList.add("closing"); setTimeout(() => w.el.remove(), 220); }
    renderTaskbar(); layoutWindows();
  }
  const setTitle = (id, t) => { const w = wins.get(id); if (w) w.el.querySelector(".w-title").textContent = t; };
  function focus(el) { el.style.zIndex = ++z; renderTaskbar(); }
  function minimize(el) { el.classList.add("min"); renderTaskbar(); layoutWindows(); }
  function bindWin(el, id) {
    el.addEventListener("pointerdown", () => { if (el !== topWin()) focus(el); });
    el.querySelector(".w-close").onclick = () => close(id);
    el.querySelector(".w-min").onclick = () => minimize(el);
    el.querySelector(".w-max").onclick = () => el.classList.toggle("max");
    const bar = el.querySelector(".win-bar");
    bar.addEventListener("dblclick", () => state.mode === "laptop" && el.classList.toggle("max"));
    bar.addEventListener("pointerdown", e => {
      if (state.mode !== "laptop" || e.target.closest("button")) return;
      const r = screenEl.getBoundingClientRect();
      if (el.classList.contains("max")) { el.classList.remove("max"); el.style.left = (e.clientX - r.left - el.offsetWidth / 2) + "px"; el.style.top = "30px"; }
      const sx = e.clientX - el.offsetLeft, sy = e.clientY - el.offsetTop; let snap = null;
      bar.setPointerCapture(e.pointerId);
      const prev = snapPreview();
      const mv = ev => {
        el.style.left = Math.max(-el.offsetWidth + 80, ev.clientX - sx) + "px"; el.style.top = Math.max(30, ev.clientY - sy) + "px";
        const x = ev.clientX - r.left, y = ev.clientY - r.top;
        snap = y < 36 ? "max" : x < 12 ? "left" : x > r.width - 12 ? "right" : null;
        showSnap(prev, snap, r);
      };
      const up = () => { bar.removeEventListener("pointermove", mv); bar.removeEventListener("pointerup", up); prev.style.display = "none"; if (snap) snapWin(el, snap); };
      bar.addEventListener("pointermove", mv); bar.addEventListener("pointerup", up);
    });
  }
  function snapPreview() { let s = $("#snap"); if (!s) { s = document.createElement("div"); s.id = "snap"; screenEl.appendChild(s); } return s; }
  function showSnap(s, where, r) {
    if (!where) { s.style.display = "none"; return; }
    s.style.display = "block"; s.style.top = "34px"; s.style.height = (r.height - 110) + "px";
    s.style.left = where === "right" ? r.width / 2 + 4 + "px" : "4px"; s.style.width = (where === "max" ? r.width - 8 : r.width / 2 - 8) + "px";
  }
  function snapWin(el, where) {
    const r = screenEl.getBoundingClientRect();
    el.classList.remove("max");
    if (where === "max") { el.classList.add("max"); return; }
    el.style.top = "30px"; el.style.height = (r.height - 102) + "px"; el.style.width = (r.width / 2) + "px";
    el.style.left = where === "left" ? "0px" : r.width / 2 + "px";
  }
  let splitOn = true;
  function layoutWindows() {
    const els = [...wins.values()].map(w => w.el);
    els.forEach(el => el.classList.remove("split-l", "split-r"));
    if (state.mode === "tablet" && splitOn) {
      const vis = visibleWins().sort((a, b) => b.style.zIndex - a.style.zIndex);
      if (vis.length >= 2) { vis[1].classList.add("split-l"); vis[0].classList.add("split-r"); }
    }
    if (state.mode !== "laptop") els.forEach(el => el.classList.remove("max"));
    else els.forEach(el => { if (!el.style.width) placeWin(el); });
  }

  function goHome() { closeOverlays(); wins.forEach(w => w.el.classList.add("min")); renderTaskbar(); }
  function handleBack() { // used by the Android back button; true = Blockvile handled it
    if (isLocked()) return true;
    if (anyOverlay()) { closeOverlays(); return true; }
    if (topWin()) { back(); return true; }
    return false;
  }
  function back() {
    if (anyOverlay()) return closeOverlays();
    const t = topWin(); if (!t) return;
    const w = wins.get(t.dataset.app);
    if (w?.el.__back && w.el.__back() === true) return; // app handled back
    close(t.dataset.app);
  }
  function recents() {
    const r = $("#recents"), was = r.classList.contains("open");
    closeOverlays(); if (was) return;
    r.classList.add("open");
    $("#recents-list").innerHTML = wins.size ? [...wins.keys()].map(id => { const a = appById(id);
      return `<div class="rc-card" data-open="${id}"><header><span>${a.icon} ${a.name}</span><button data-kill="${id}" aria-label="Close">✕</button></header><div class="rc-prev" style="background:${a.bg}">${a.icon}</div></div>`; }).join("")
      : `<p class="rc-empty">No recent apps</p>`;
  }
  function closeAll(instant) { [...wins.keys()].forEach(id => close(id, instant)); $("#recents").classList.remove("open"); }

  /* ================= Overlays ================= */
  const OVERLAYS = ["#notif", "#cc", "#spotlight", "#powermenu", "#help", "#installsheet", "#recents", "#launcher", "#ctxmenu"];
  const anyOverlay = () => OVERLAYS.some(s => $(s).classList.contains("open"));
  function closeOverlays() { OVERLAYS.forEach(s => $(s).classList.remove("open")); $("#scrim").classList.remove("on"); $$("#menubar button.open").forEach(b => b.classList.remove("open")); }
  function openShade(id) { const s = $(id), was = s.classList.contains("open"); closeOverlays(); if (!was) { s.classList.add("open"); $("#scrim").classList.add("on"); } }
  $("#scrim").onclick = closeOverlays;
  $$(".overlay").forEach(o => o.addEventListener("click", e => { if (e.target === o) closeOverlays(); }));

  /* ================= Notifications ================= */
  let notifs = store.get("notifs", []);
  const saveNotifs = () => store.set("notifs", notifs.slice(0, 50));
  function notify(o, title, text) {
    if (typeof o === "string") o = { icon: o, title, text };
    const n = { id: Date.now() + Math.random(), app: o.app || null, action: o.action || null, icon: o.icon || "🔔", title: o.title || "", text: o.text || "", time: Date.now() };
    notifs.unshift(n); saveNotifs(); renderNotifs(); renderAll();
    window.dispatchEvent(new CustomEvent("bv:notify", { detail: n }));
    if (!state.flags.dnd && state.haptics) { try { navigator.vibrate?.([30, 60, 30]); } catch { } }
    if (!state.flags.dnd) { banner(n); if (o.sound !== false) beep(880, 120, 2, state.volume / 100); }
  }
  const ago = t => { const s = (Date.now() - t) / 1000; return s < 60 ? "now" : s < 3600 ? Math.floor(s / 60) + "m" : s < 86400 ? Math.floor(s / 3600) + "h" : Math.floor(s / 86400) + "d"; };
  function renderNotifs() {
    const html = n => `<div class="nt" data-nt="${n.id}"><span class="nt-ic">${n.icon}</span><div><b>${esc(n.title)}</b><p>${esc(n.text)}</p><time>${ago(n.time)}</time></div><button class="nt-x" data-ntx="${n.id}" aria-label="Dismiss">✕</button></div>`;
    $("#notif-list").innerHTML = notifs.length ? notifs.map(html).join("") : `<p class="muted center" style="padding:20px">No notifications</p>`;
    $("#lock-notifs").innerHTML = notifs.slice(0, 3).map(html).join("");
    $(".sb-badges").textContent = notifs.length ? " · " + notifs.slice(0, 3).map(n => n.icon).join("") : "";
  }
  $("#notif-list").addEventListener("click", e => {
    const x = e.target.closest("[data-ntx]");
    if (x) { notifs = notifs.filter(n => String(n.id) !== x.dataset.ntx); saveNotifs(); renderNotifs(); renderAll(); return; }
    const it = e.target.closest("[data-nt]"); if (!it) return;
    const n = notifs.find(n => String(n.id) === it.dataset.nt);
    notifs = notifs.filter(m => m !== n); saveNotifs(); renderNotifs(); renderAll();
    openNotif(n);
  });
  let tt;
  function toast(msg) { const t = $("#toast"); t.className = ""; t.textContent = msg; void t.offsetWidth; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 1800); }
  function banner(n) { const t = $("#toast"); t.className = "banner"; t.innerHTML = `<span style="font-size:22px">${n.icon}</span><span><b>${esc(n.title)}</b><br><small>${esc(n.text)}</small></span>`; void t.offsetWidth; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 3500); t.onclick = () => openNotif(n); }
  function openNotif(n) { if (!n) return; if (n.action === "update") open("updates"); else if (n.action === "install") installApp(); else if (n.app) open(n.app); }

  /* ================= OSD (volume / brightness) ================= */
  let ot;
  function osd(icon, v) { $("#osd-ic").textContent = icon; $("#osd-bar").style.width = v + "%"; $("#osd").classList.add("on"); clearTimeout(ot); ot = setTimeout(() => $("#osd").classList.remove("on"), 1200); }
  function setVolume(v) { state.volume = Math.max(0, Math.min(100, v)); save(); $("#volume").value = state.volume; osd(state.volume ? "🔊" : "🔇", state.volume); window.dispatchEvent(new CustomEvent("bv:volume", { detail: state.volume })); }
  function setBrightness(v) { state.brightness = Math.max(20, Math.min(100, v)); save(); apply(); osd("☀", state.brightness); window.dispatchEvent(new CustomEvent("bv:brightness", { detail: state.brightness })); }
  $("#volume").addEventListener("input", e => setVolume(+e.target.value));
  $("#brightness").addEventListener("input", e => setBrightness(+e.target.value));

  /* ================= Boot, lock, PIN, auto-lock ================= */
  function boot() {
    const b = $("#boot"); b.classList.remove("gone");
    const bar = b.querySelector("i"); bar.style.animation = "none"; void bar.offsetHeight; bar.style.animation = "";
    lock(); setTimeout(() => b.classList.add("gone"), 1700);
  }
  let afterUnlock = null;
  function lock() { closeOverlays(); $("#lock").classList.remove("open", "pin"); $("#pinpad").hidden = true; pinBuf = ""; drawPin(); }
  function unlock(then) {
    grabDevice();
    afterUnlock = typeof then === "function" ? then : null;
    if (state.pin) { $("#lock").classList.add("pin"); $("#pinpad").hidden = false; return; }
    finishUnlock();
  }
  const unlockQueue = [];
  function finishUnlock() { setTimeout(() => unlockQueue.splice(0).forEach(f => f()), 350); $("#lock").classList.add("open"); $("#lock").classList.remove("pin"); $("#pinpad").hidden = true; lastActive = Date.now(); afterUnlock && afterUnlock(); afterUnlock = null; }
  let pinBuf = "";
  const drawPin = () => $(".pin-dots").innerHTML = "<i></i>".repeat(pinBuf.length);
  function pinKey(k) {
    if (k === "cancel") { pinBuf = ""; drawPin(); lock(); return; }
    if (k === "del") pinBuf = pinBuf.slice(0, -1); else if (pinBuf.length < 8) pinBuf += k;
    drawPin();
    if (pinBuf.length >= state.pin.length) {
      if (pinBuf === state.pin) { pinBuf = ""; drawPin(); finishUnlock(); }
      else { $(".pin-msg").textContent = "Wrong PIN"; $(".pin-dots").classList.add("shake"); setTimeout(() => { $(".pin-dots").classList.remove("shake"); pinBuf = ""; drawPin(); $(".pin-msg").textContent = "Enter PIN"; }, 450); }
    }
  }
  $(".pin-keys").addEventListener("click", e => { const b = e.target.closest("button"); if (b) pinKey(b.dataset.pin || b.textContent); });
  let sy = null;
  $("#lock").addEventListener("pointerdown", e => sy = e.clientY);
  $("#lock").addEventListener("pointerup", e => { if (sy !== null && sy - e.clientY > 60 && !$("#lock").classList.contains("pin")) unlock(); sy = null; });
  $("#lock").addEventListener("wheel", e => { if (e.deltaY > 0 && !$("#lock").classList.contains("pin")) unlock(); });
  const isLocked = () => !$("#lock").classList.contains("open");

  let lastActive = Date.now();
  ["pointerdown", "keydown", "wheel"].forEach(ev => document.addEventListener(ev, () => lastActive = Date.now(), true));
  setInterval(() => { if (state.autolock && !isLocked() && Date.now() - lastActive > state.autolock * 60000) lock(); }, 5000);

  /* ================= Gestures (phone/tablet) ================= */
  let g = null;
  screenEl.addEventListener("pointerdown", e => {
    if (state.mode === "laptop" || isLocked()) return;
    const r = screenEl.getBoundingClientRect(), y = e.clientY - r.top;
    if (y < 40) g = { kind: "top", x: e.clientX - r.left, y: e.clientY, w: r.width };
    else if (y > r.height - 30) g = { kind: "bottom", y: e.clientY };
  });
  screenEl.addEventListener("pointerup", e => {
    if (!g) return;
    if (g.kind === "top" && e.clientY - g.y > 40) openShade(g.x > g.w / 2 ? "#cc" : "#notif");
    if (g.kind === "bottom" && g.y - e.clientY > 50) (g.y - e.clientY > 180 ? recents() : goHome());
    g = null;
  });

  /* ================= Scheduler: alarms, events, reminders ================= */
  function scheduler() {
    const now = new Date(), today = now.toISOString().slice(0, 10), hm = now.toTimeString().slice(0, 5);
    const alarms = store.get("alarms", []); let ch = false;
    alarms.forEach(a => { if (a.on && a.time === hm && a.last !== today) { a.last = today; ch = true; notify({ app: "clock", icon: "⏰", title: a.label || "Alarm", text: a.time }); beep(988, 300, 5, state.volume / 100); } });
    ch && store.set("alarms", alarms);
    const events = store.get("events", []); ch = false;
    events.forEach(ev => { if (!ev.done && ev.date === today && ev.time && ev.time <= hm) { ev.done = true; ch = true; notify({ app: "calendar", icon: "📅", title: ev.title, text: "Now · " + ev.time }); } });
    ch && store.set("events", events);
    const todos = store.get("todos", []); ch = false;
    todos.forEach(t => { if (!t.done && !t.fired && t.due && new Date(t.due) <= now) { t.fired = true; ch = true; notify({ app: "reminders", icon: "✅", title: "Reminder", text: t.text }); } });
    ch && store.set("todos", todos);
  }
  setInterval(scheduler, 15000);

  /* ================= Install on this device ================= */
  let deferredPrompt = null;
  const UA = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault(); deferredPrompt = e;
    if ($("#installsheet").classList.contains("open")) renderInstall();
    window.dispatchEvent(new Event("bv:changed"));
    if (!store.get("installSuggested", false)) {
      store.set("installSuggested", true);
      setTimeout(() => notify({ action: "install", icon: "📲", title: "Install Blockvile Plus", text: "Add it to your device — it gets its own icon, opens full screen and works offline.", sound: false }), 4000);
    }
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null; store.set("pwaInstalled", true); closeOverlays();
    notify({ icon: "✅", title: "Blockvile is installed", text: "Open it from your home screen or app list any time.", sound: false });
    window.dispatchEvent(new Event("bv:changed"));
  });
  function installStatus() {
    if (BV.android?.available) return "android";
    if (launchedAsApp) return "installed";
    if (BV.embedded) return "embedded";
    if (location.protocol === "file:") return "file";
    if (deferredPrompt) return "prompt";
    if (isIOS) return "ios";
    if (/Firefox\//.test(UA) && !/Android/.test(UA)) return "firefox";
    return "manual";
  }
  const INSTALL_LABEL = { android: "Installed (Android app)", installed: "Installed", embedded: "Open on its own to install", file: "Needs a website to install", prompt: "Ready to install", ios: "Add to Home Screen", firefox: "Use Chrome, Edge or Safari", manual: "From your browser menu" };
  function installApp() { closeOverlays(); renderInstall(); $("#installsheet").classList.add("open"); }
  function renderInstall() {
    const st = installStatus(), url = window.BV_CONFIG?.installUrl || "";
    const perks = `<ul class="inst-perks"><li>📲 Its own icon on your home screen or desktop</li><li>⛶ Opens full screen, like a real system</li><li>✈ Works offline</li><li>⏏ <b>Exit</b> closes it and takes you straight back to your device</li></ul>`;
    const body = {
      android: `<p>✅ Blockvile is installed as an app on this phone.</p><p class="muted">Want Blockvile to run the whole phone for a while? Start a <b>temporary takeover</b> — it ends with <b>Exit</b>, <code>application exit</code> in Terminal, or when the phone restarts.</p>
        <div class="inst-btns"><button class="btn" data-inst="takeover">⛶ Temporarily take over this phone</button></div>`,
      installed: `<p>✅ You're using the installed Blockvile app.</p><p class="muted">Pressing <b>Exit</b> closes Blockvile and takes you back to your device. Open it again from its icon.</p>`,
      prompt: `<p>Install Blockvile Plus on this device:</p>${perks}<div class="inst-btns"><button class="btn" data-inst="prompt">📲 Install</button></div>`,
      ios: `<p>Add Blockvile to your Home Screen:</p>${perks}<ol class="inst-steps"><li>Tap the <b>Share</b> button <span class="inst-ic">⎙</span> in Safari's toolbar.</li><li>Scroll and tap <b>Add to Home Screen</b> <span class="inst-ic">⊞</span>.</li><li>Tap <b>Add</b>. Blockvile appears with your other apps.</li></ol>
        <p class="muted">Using Chrome or another browser? Its Share menu has <b>Add to Home Screen</b> too — or open this page in Safari.</p>`,
      embedded: `<p>Blockvile is shown inside another page, and browsers only install apps opened on their own.</p><div class="inst-btns"><button class="btn" data-inst="newtab">↗ Open Blockvile on its own</button></div>
        <p class="muted">Then tap Install there.</p>`,
      file: `<p>Blockvile is running from a file on this device, so it already works offline — keep the file anywhere and double-click it to open.</p>
        <p class="muted">To install it with its own icon, Blockvile needs to be on a website: put it online (the README shows free GitHub Pages steps), open it there, then choose Install.</p>
        ${url ? `<div class="inst-btns"><button class="btn" data-inst="newtab">↗ Open the online version</button></div>` : ""}`,
      firefox: `<p>Firefox on computers can't install web apps.</p><p class="muted">Open Blockvile in <b>Chrome</b>, <b>Edge</b> or <b>Safari</b> to install it — or press <kbd>${isMac ? "⌘" : "Ctrl"}</kbd>+<kbd>D</kbd> to bookmark it.</p>`,
      manual: `<p>Install Blockvile from your browser:</p>${perks}<ol class="inst-steps"><li>Open your browser's menu (<b>⋮</b> or <b>…</b>).</li><li>Choose <b>Install app</b>, <b>Install Blockvile Plus</b> or <b>Add to Home screen</b>.</li></ol>
        <p class="muted">No install option? It may already be installed on this device, or your browser doesn't support it — Chrome and Edge do.</p>`,
    }[st];
    const canDownload = /^https?:$/.test(location.protocol) && st !== "android";
    $("#install-box").innerHTML = `<div class="inst-head"><img src="icons/logo.svg" alt=""><div><h3>Install Blockvile Plus</h3><small>${INSTALL_LABEL[st]}</small></div><button class="btn ghost" data-inst="close" aria-label="Close">✕</button></div>${body}
      ${canDownload ? `<hr><p class="muted" style="font-size:13px">Prefer a file? Download Blockvile as one HTML file you can keep and open offline on any device.</p><div class="inst-btns"><button class="btn ghost" data-inst="download">💾 Download one-file version</button></div>` : ""}`;
  }
  $("#install-box").addEventListener("click", async e => {
    const k = e.target.closest("[data-inst]")?.dataset.inst; if (!k) return;
    if (k === "close") return closeOverlays();
    if (k === "takeover") return startTakeover();
    if (k === "newtab") return window.open(window.BV_CONFIG?.installUrl || location.href.split("#")[0], "_blank", "noopener");
    if (k === "prompt" && deferredPrompt) {
      const p = deferredPrompt; deferredPrompt = null;
      try { await p.prompt(); const { outcome } = await p.userChoice; if (outcome !== "accepted") toast("Install cancelled — you can install any time from Settings"); }
      catch { toast("Install isn't available right now"); }
      return renderInstall();
    }
    if (k === "download") {
      try {
        const r = await fetch(window.BV_SINGLE_FILE ? location.href.split("#")[0] : "blockvile-plus-os.html", { cache: "no-store" });
        if (!r.ok) throw 0;
        BV.download(new Blob([await r.text()], { type: "text/html" }), "blockvile-plus-os.html"); toast("💾 Downloading Blockvile…");
      } catch { toast("The one-file version isn't available on this site"); }
    }
  });

  /* ================= Spotlight search ================= */
  const ACTIONS = [
    ["🌙", "Toggle dark mode", "dark theme night", toggleDark],
    ["📱", "Phone mode", "mode phone", () => setMode("phone")], ["📲", "Tablet mode", "mode tablet", () => setMode("tablet")], ["💻", "Laptop mode", "mode laptop desktop", () => setMode("laptop")],
    ["🔒", "Lock screen", "lock", () => lock()], ["↻", "Restart", "restart reboot", () => power("restart")], ["⏻", "Shut down", "power off shutdown", () => power("shutdown")],
    ["⏏", "Exit Blockvile Plus OS", "exit quit leave", toggleExit],
    ["⛶", "Temporarily let Blockvile take over this device", "takeover take over full screen whole device kiosk temporary", startTakeover],
    ["⛶", "End the temporary takeover", "end stop takeover give back device application exit", () => { if (!endTakeover()) toast("No temporary takeover is running"); }], ["🔕", "Do not disturb", "dnd silent quiet", () => setFlag("dnd")],
    ["🌅", "Night light", "night light warm", () => setFlag("nightLight")], ["🔋", "Battery saver", "battery saver power", () => setFlag("saver")],
    ["✈", "Airplane mode", "airplane flight", () => setFlag("airplane")], ["⟳", "Rotate screen", "rotate landscape portrait", () => setFlag("landscape")],
    ["⌨", "Keyboard shortcuts", "help shortcuts keys", () => showHelp()], ["⛶", "Full screen", "fullscreen", () => fullscreen()],
    ["❓", "Blockvile Help", "help support how faq guide tutorial", () => open("help")], ["💬", "Send feedback", "feedback bug report idea contact problem", () => open("feedback")],
    ["📲", "Install Blockvile on this device", "install app download add home screen desktop pwa", installApp],
  ];
  let spSel = 0, spItems = [];
  function spotlight() { closeOverlays(); $("#spotlight").classList.add("open"); const i = $("#sp-input"); i.value = ""; spRender(""); i.focus(); }
  function spRender(q) {
    q = q.trim(); const ql = q.toLowerCase(); spItems = []; let html = "";
    const group = (title, items) => { if (!items.length) return; html += `<div class="sp-group">${title}</div>`; items.forEach(it => { html += `<button class="sp-item" data-sp="${spItems.length}"><span class="sp-ic" style="background:${it.bg || "var(--bg)"}">${it.icon}</span>${esc(it.label)}<small>${esc(it.hint || "")}</small></button>`; spItems.push(it); }); };
    const m = safeMath(q);
    if (m !== null) group("Calculator", [{ icon: "🧮", label: `= ${m}`, hint: "Copy", run: () => { navigator.clipboard?.writeText(String(m)).catch(() => { }); toast("Copied " + m); } }]);
    group("Apps", installed().filter(a => !q || a.name.toLowerCase().includes(ql) || (a.keywords || "").includes(ql)).slice(0, q ? 6 : 8).map(a => ({ icon: a.icon, bg: a.bg, label: a.name, hint: "App", run: () => open(a.id) })));
    if (q) {
      group("Settings & actions", ACTIONS.filter(a => (a[1] + " " + a[2]).toLowerCase().includes(ql)).slice(0, 5).map(a => ({ icon: a[0], label: a[1], hint: "Action", run: a[3] })));
      group("Files", fs.search(q).slice(0, 6).map(f => ({ icon: f.type === "dir" ? "📁" : "📄", label: f.path.split("/").pop(), hint: f.path, run: () => f.type === "dir" ? open("files", { path: f.path }) : open("editor", { path: f.path }) })));
      group("Web", [{ icon: "🌐", label: `Search the web for “${q}”`, hint: "Browser", run: () => open("browser", { q }) }]);
    }
    $("#sp-results").innerHTML = html || `<p class="muted center" style="padding:16px">No results</p>`;
    spSel = 0; spHighlight();
  }
  const spHighlight = () => $$(".sp-item").forEach((b, i) => b.classList.toggle("sel", i === spSel));
  $("#sp-input").addEventListener("input", e => spRender(e.target.value));
  $("#sp-input").addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { spSel = Math.min(spItems.length - 1, spSel + 1); spHighlight(); e.preventDefault(); }
    if (e.key === "ArrowUp") { spSel = Math.max(0, spSel - 1); spHighlight(); e.preventDefault(); }
    if (e.key === "Enter" && spItems[spSel]) { closeOverlays(); spItems[spSel].run(); }
  });
  $("#sp-results").addEventListener("click", e => { const b = e.target.closest("[data-sp]"); if (b) { closeOverlays(); spItems[+b.dataset.sp].run(); } });

  /* ================= Help ================= */
  const SHORTCUTS = [
    ["Ctrl+Shift+D", "Dark mode on/off"], ["Ctrl+Shift+E", "Exit / enter OS"], ["Ctrl+K", "Search (Spotlight)"],
    ["Ctrl+Shift+M", "Next device mode"], ["Ctrl+Shift+1 / 2 / 3", "Phone / Tablet / Laptop"], ["Ctrl+Shift+C", "Control centre"],
    ["Ctrl+Shift+N", "Notifications"], ["Ctrl+Shift+A", "App switcher / recents"], ["Ctrl+Shift+L", "Lock"], ["Ctrl+Shift+P", "Power menu"],
    ["Ctrl+Shift+H", "Home"], ["Ctrl+Shift+Q", "Close current app"], ["Ctrl+Shift+↑ / ↓", "Volume up / down"], ["Ctrl+Shift+← / →", "Brightness down / up"],
    ["Alt+← / → / ↑", "Snap window left / right / maximise (laptop)"], ["F1", "Blockvile Help"], ["Ctrl+/", "Keyboard shortcuts"], ["Esc", "Close panels / back"],
  ];
  function showHelp() { closeOverlays(); $("#help-box").innerHTML = `<h3 style="margin-bottom:12px">⌨ Keyboard shortcuts</h3><div class="list">${SHORTCUTS.map(([k, d]) => `<div><span>${d}</span><kbd>${k}</kbd></div>`).join("")}</div><div class="row" style="justify-content:center"><button class="btn" data-open="help">❓ Open Blockvile Help</button></div>`; $("#help").classList.add("open"); }
  const fullscreen = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch { toast("Full screen not available"); } };

  /* ================= Context & menu-bar menus ================= */
  function menu(items, x, y) {
    const m = $("#ctxmenu"); closeOverlays();
    m.innerHTML = items.map((it, i) => it === "-" ? "<hr>" : `<button data-mi="${i}">${it[0]}</button>`).join("");
    m.classList.add("open");
    const r = screenEl.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    m.style.left = Math.min(x - r.left, r.width - mw - 6) + "px"; m.style.top = Math.min(y - r.top, r.height - mh - 6) + "px";
    m.onclick = e => { const b = e.target.closest("[data-mi]"); if (b) { closeOverlays(); items[+b.dataset.mi][1](); } };
  }
  screenEl.addEventListener("contextmenu", e => {
    if (e.target.closest(".win-body") || isLocked()) return;
    e.preventDefault();
    const tile = e.target.closest("[data-app-tile]");
    if (tile) {
      const a = appById(tile.dataset.appTile), inDock = state.dock.includes(a.id), items = [["Open", () => open(a.id)]];
      if (a.native) return menu([...items, [inDock ? "Unpin from dock" : "Pin to dock", () => pin(a.id, !inDock)], ["ℹ App info", () => BV.android.info(a.pkg)], "-",
        ["✖ Remove from home", () => BV.android.unpin(a.pkg)], ["🗑 Uninstall from phone", () => BV.android.uninstall(a.pkg)]], e.clientX, e.clientY);
      if (wins.has(a.id)) items.push(["Close", () => close(a.id)]);
      items.push([inDock ? "Unpin from dock" : "Pin to dock", () => pin(a.id, !inDock)]);
      if (!a.system) items.push("-", ["🗑 Uninstall", () => install(a.id, false)]);
      return menu(items, e.clientX, e.clientY);
    }
    if (e.target.closest("#home") || e.target === screenEl) menu([
      ["📄 New text file", () => open("editor", { path: "" })], ["📁 Open Files", () => open("files")], ["⌨ Open Terminal", () => open("terminal")], "-",
      ["🖼 Change wallpaper", () => open("settings", { section: "display" })], ["◐ Toggle dark mode", toggleDark], ["⚙ Settings", () => open("settings")], "-",
      ["⌨ Keyboard shortcuts", showHelp], ["❓ Help", () => open("help")], ["💬 Send feedback", () => open("feedback")],
    ], e.clientX, e.clientY);
  });
  const MENUS = {
    system: () => [["ℹ About Blockvile Plus", () => open("about")], [isTakeover() ? "⛶ End temporary takeover" : "⛶ Temporarily take over this device…", toggleTakeover], ["⚙ Settings…", () => open("settings")], ["🛍 App Store…", () => open("store")], ["📲 Install on this device…", installApp], "-",
      ["🔒 Lock screen", lock], ["🌙 Sleep", () => power("sleep")], ["↻ Restart…", () => power("restart")], ["⏻ Shut down…", () => power("shutdown")], "-", ["⏏ Exit OS", toggleExit]],
    app: () => { const t = topWin(); return [["📄 New text file", () => open("editor", { path: "" })], ["🔍 Search…", spotlight], "-",
      ["Minimise window", () => t && minimize(t)], ["Close window", () => t && close(t.dataset.app)], ["Close all windows", () => closeAll()]]; },
    view: () => [["📱 Phone mode", () => setMode("phone")], ["📲 Tablet mode", () => setMode("tablet")], ["💻 Laptop mode", () => setMode("laptop")], "-",
      ["◐ Dark mode", toggleDark], ["🌅 Night light", () => setFlag("nightLight")], ["⛶ Full screen", fullscreen]],
    go: () => [["📁 Files", () => open("files")], ["🖥 Desktop folder", () => open("files", { path: "/Desktop" })], ["📄 Documents", () => open("files", { path: "/Documents" })], ["⌨ Terminal", () => open("terminal")], ["📊 Task Manager", () => open("taskmgr")]],
    help: () => [["❓ Blockvile Help", () => open("help")], ["💬 Send feedback…", () => open("feedback")], ["📲 Install on this device…", installApp], "-",
      ["⌨ Keyboard shortcuts", showHelp], ["ℹ About", () => open("about")]],
  };
  $("#menubar").addEventListener("click", e => {
    const b = e.target.closest("[data-menu]"); if (!b) return;
    const wasOpen = b.classList.contains("open"); closeOverlays(); if (wasOpen) return;
    const r = b.getBoundingClientRect(); menu(MENUS[b.dataset.menu](), r.left, r.bottom + 4); b.classList.add("open");
  });

  /* ================= Global click routing ================= */
  document.addEventListener("click", e => {
    if (!e.target.closest("#ctxmenu") && !e.target.closest("#menubar")) $("#ctxmenu").classList.remove("open");
    const k = e.target.closest("[data-kill]"); if (k) { e.stopPropagation(); close(k.dataset.kill, true); $("#recents").classList.remove("open"); recents(); return; }
    const pw = e.target.closest("[data-power]"); if (pw) return power(pw.dataset.power);
    const o = e.target.closest("[data-open]"); if (o && !e.target.closest(".win")) return open(o.dataset.open);
    const a = e.target.closest("[data-action]"); if (!a) return;
    ({
      "toggle-dark": toggleDark, "toggle-exit": toggleExit, takeover: startTakeover, "end-takeover": () => endTakeover(), "open-updates": () => open("updates"), "takeover-toggle": toggleTakeover, "cycle-mode": cycleMode, "set-mode": () => setMode(a.dataset.mode),
      "toggle-flag": () => setFlag(a.dataset.flag), unlock: () => unlock(),
      "lock-torch": () => setFlag("torch"), "lock-camera": () => unlock(() => open("camera")),
      "open-cc": () => openShade("#cc"), "open-notif": () => openShade("#notif"),
      "clear-notifs": () => { notifs = []; saveNotifs(); renderNotifs(); renderAll(); },
      home: goHome, back, recents, "close-all": () => closeAll(), spotlight, power: () => { closeOverlays(); $("#powermenu").classList.add("open"); },
      wake, poweron: powerOn, "host-close": hostClose, "host-back": () => history.back(), install: installApp,
      "toggle-launcher": () => { const l = $("#launcher"), was = l.classList.contains("open"); closeOverlays(); if (!was) { l.classList.add("open"); $("#launcher-search").value = ""; renderLauncher(""); setTimeout(() => $("#launcher-search").focus(), 50); } },
    })[a.dataset.action]?.();
  });
  $$("[data-toggle]").forEach(b => b.addEventListener("click", () => {
    b.classList.toggle("on"); const sm = b.querySelector("small");
    if (b.classList.contains("cc-big") && sm) sm.textContent = b.classList.contains("on") ? (b.dataset.toggle === "wifi" ? "Blockvile-5G" : "On") : "Off";
  }));

  /* ================= Keyboard ================= */
  document.addEventListener("keydown", e => {
    if ($("#sleep").classList.contains("on")) { wake(); return; }
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (isLocked() && $("#lock").classList.contains("pin") && /^[0-9]$/.test(e.key)) return pinKey(e.key);
    if (isLocked() && $("#lock").classList.contains("pin") && e.key === "Backspace") return pinKey("del");
    if (e.key === "Escape") {
      if (anyOverlay()) closeOverlays(); else if (isLocked()) unlock(); else if (!typing) back();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "k") { e.preventDefault(); return spotlight(); }
    if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); return showHelp(); }
    if (e.key === "F1") { e.preventDefault(); return open("help"); }
    if (e.altKey && !typing && state.mode === "laptop" && topWin()) {
      const s = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "max" }[e.key];
      if (s) { e.preventDefault(); return snapWin(topWin(), s); }
      if (e.key === "ArrowDown") { e.preventDefault(); return minimize(topWin()); }
    }
    if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
    const map = {
      KeyD: toggleDark, KeyE: toggleExit, KeyM: cycleMode, KeyL: () => lock(), KeyP: () => { closeOverlays(); $("#powermenu").classList.add("open"); },
      KeyC: () => openShade("#cc"), KeyN: () => openShade("#notif"), KeyA: recents, KeyH: goHome,
      KeyQ: () => { const t = topWin(); t && close(t.dataset.app); },
      Digit1: () => setMode("phone"), Digit2: () => setMode("tablet"), Digit3: () => setMode("laptop"),
      ArrowUp: () => setVolume(state.volume + 10), ArrowDown: () => setVolume(state.volume - 10),
      ArrowRight: () => setBrightness(state.brightness + 10), ArrowLeft: () => setBrightness(state.brightness - 10),
    };
    if (map[e.code]) { e.preventDefault(); map[e.code](); }
  });

  /* ================= Public API for apps ================= */
  async function reset() {
    BV.store.clearAll(); await idb.clear(); fs.reset();
    Object.assign(state, JSON.parse(JSON.stringify(defaults))); state.known = []; applyDefaultOff(); save(); notifs = [];
    apply(); loadWallImg(); renderNotifs(); renderAll(); toast("Settings reset");
  }
  const api = {
    state, store, fs, idb, save, apply, setMode, setWall, setWallpaperBlob, toggleDark, toggleExit, setFlag, power, lock,
    open, close, setTitle, notify, toast, reset, install, pin, apps: () => APPS, installed, isInstalled: id => !state.removed.includes(id),
    refreshApps: () => renderAll(), registerApp, unregisterApp,
    running: () => [...wins.entries()].map(([id, w]) => ({ id, app: appById(id), started: w.started })), bootTime,
    weather, wxInfo, setVolume, setBrightness, showHelp, spotlight, ACCENTS, beep,
    handleBack, home: () => goHome(), installApp, installStatus, installLabel: () => INSTALL_LABEL[installStatus()], isInstalledApp: () => launchedAsApp, shortcuts: SHORTCUTS,
    startTakeover, endTakeover, toggleTakeover, isTakeover,
    afterUnlock(fn) { if (isLocked()) unlockQueue.push(fn); else fn(); },
    enterFromSystem() { if (state.exited) { state.exited = false; save(); apply(); } },
    onBack(id, fn) { const w = wins.get(id); if (w) w.el.__back = fn; },
  };
  window.BlockvileOS = api;

  /* ================= Start ================= */
  if (BV.embedded) root.classList.add("embedded");
  if (state.exited && (launchedAsApp || BV.android?.available)) { state.exited = false; save(); }   // opening the app = coming back in
  if (state.exited) updateHost();
  apply(); loadWallImg(); renderNotifs(); renderAll(); showTakeover();
  if (!state.powered) { $("#boot").classList.add("gone"); $("#off").classList.add("on"); }
  else if (!state.exited) boot(); else $("#boot").classList.add("gone");
  if (!store.get("welcomed", false)) {
    store.set("welcomed", true);
    setTimeout(() => notify({ app: "about", icon: "👋", title: "Welcome to Blockvile Plus", text: "Press Ctrl+K to search · Ctrl+/ for all shortcuts", sound: false }), 2600);
  }
  weather();
  scheduler();
  try { BV.android?.otaBooted?.(); } catch { }   // tells the Android app this (possibly just-updated) version started fine
  if (!store.persistent) setTimeout(() => notify({ app: "settings", icon: "💾", title: "Changes won't be saved", text: "This page isn't allowed to store data, so Blockvile resets when you close it.", sound: false }), 3200);
  // Installable app + offline cache (needs a website: http/https, not a file, not inside another page)
  (async () => {
    if (!/^https?:$/.test(location.protocol) || BV.embedded || window.BlockvileAndroid) return;
    if (window.BV_SINGLE_FILE) { // the one-file version installs when the site also hosts manifest.json (the GitHub Pages workflow does)
      try { const r = await fetch("manifest.json", { cache: "no-store" }); if (!r.ok) return; await r.json(); } catch { return; }
      const l = document.createElement("link"); l.rel = "manifest"; l.href = "manifest.json"; document.head.appendChild(l);
    }
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { });
  })();
  // Links like ?app=videos (app shortcuts) open that app once the screen is unlocked
  const startApp = new URLSearchParams(location.search).get("app");
  if (startApp) unlockQueue.push(() => startApp === "install" ? installApp() : open(startApp));
})();
