/* Blockvile Plus OS — Android integration.
   When Blockvile runs inside its Android app, the native side exposes window.BlockvileAndroid.
   This file wraps it as BV.android, adds the "Android Apps" drawer, pins real phone apps to the
   Blockvile home screen, and detects when an app installed from Google Play has finished installing.
   In a normal browser none of this activates. */
(() => {
  const N = window.BlockvileAndroid;
  const { store, esc } = window.BV;
  const A = window.BV_APPS;
  const available = !!N;
  const call = (fn, ...args) => { try { return N[fn](...args); } catch (e) { console.warn("BlockvileAndroid." + fn, e); return null; } };
  const iconCache = new Map();

  const android = {
    available,
    apps() { if (!available) return []; try { return JSON.parse(call("listApps") || "[]"); } catch { return []; } },
    installed: pkg => available && !!call("isInstalled", pkg),
    launch: pkg => available && call("launchApp", pkg),
    openPlay(pkg) { // hand the install to the real Play Store app, and remember it so we can spot when it's done
      if (!available) return false;
      const p = store.get("pendingPlay", []); if (!p.includes(pkg)) store.set("pendingPlay", [...p, pkg]);
      call("openPlayStore", pkg); return true;
    },
    search: q => available && call("openPlaySearch", q),
    uninstall: pkg => available && call("uninstall", pkg),
    info: pkg => available && call("appInfo", pkg),
    icon(pkg) { if (!available) return ""; if (!iconCache.has(pkg)) iconCache.set(pkg, call("getIcon", pkg) || ""); return iconCache.get(pkg); },
    isDefaultLauncher: () => available && !!call("isDefaultLauncher"),
    device() { try { return JSON.parse(call("deviceInfo") || "{}"); } catch { return {}; } },
    // Temporary takeover: Blockvile is the phone's home screen until Exit, `application exit`, or a restart. Never permanent.
    takeover() { if (!available) return {}; try { return JSON.parse(call("takeoverStatus") || "{}"); } catch { return {}; } },
    startTakeover: () => available && call("startTakeover"),
    exitToSystem: () => available && call("exitToSystem"),
    // Updates (web content over the air; native changes go through Google Play)
    ota: () => { if (!available) return null; try { return JSON.parse(call("otaStatus") || "{}"); } catch { return {}; } },
    otaApply: () => available && call("otaApply"),
    otaBooted: () => available && call("otaBooted"),
    playUpdate: () => available && call("playUpdate"),
    // Digital SIM / sign-in helpers
    onWifi: () => available ? !!call("onWifi") : null,
    pendingDeepLink: () => available ? (call("pendingDeepLink") || "") : "",
    // Real device controls
    setBrightness: p => available && call("setBrightness", Math.round(p)),
    setVolume: p => available && call("setVolume", Math.round(p)),
    getVolume: () => available ? call("getVolume") : -1,
    setTorch: on => available && call("setTorch", !!on),
    openPanel: which => available && call("openPanel", which),
    notify: (t, x) => available && call("notify", t || "", x || ""),
    canNotify: () => available && !!call("canNotify"),
    askNotify: () => available && call("askNotifyPermission"),
    setAlarm: (h, m, label) => available && call("setAlarm", h, m, label || ""),
    setTimer: (sec, label) => available && call("setTimer", Math.round(sec), label || ""),
    addCalendarEvent: (title, start, end) => available && call("addCalendarEvent", title || "", start, end),
    vibrate: ms => available && call("vibrate", Math.round(ms)),
    share: (subject, text) => available && call("share", subject || "", text || ""),
    battery() { try { return JSON.parse(call("battery") || "{}"); } catch { return {}; } },
    keepScreenOn: on => available && call("keepScreenOn", !!on),
  };
  window.BV.android = android;
  if (!available) return;

  document.documentElement.classList.add("is-android");

  // Links that would leave the OS open in the phone's real browser / apps
  window.open = url => { if (url) call("openUrl", String(url)); return null; };
  // Things Android's built-in web view doesn't do by itself
  if (!navigator.share) navigator.share = async d => { call("share", (d && d.title) || "", [d && d.text, d && d.url].filter(Boolean).join("\n")); };
  navigator.vibrate = ms => { call("vibrate", Array.isArray(ms) ? (ms[0] || 0) : (+ms || 0)); return true; };
  if (!navigator.getBattery) navigator.getBattery = async () => {
    const b = android.battery(), et = new EventTarget();
    const obj = Object.assign(et, { level: b.level ?? 1, charging: !!b.charging });
    setInterval(() => { const n = android.battery(); if (n.level !== obj.level) { obj.level = n.level; obj.charging = !!n.charging; et.dispatchEvent(new Event("levelchange")); } }, 60000);
    return obj;
  };
  // Downloads go to the phone's Downloads folder
  window.BV.download = (blob, name) => {
    const r = new FileReader();
    r.onload = () => { const where = call("saveFile", String(r.result).split(",")[1] || "", name, blob.type || "application/octet-stream"); window.BlockvileOS?.toast(where ? "⬇ Saved to " + where : "Couldn't save file"); };
    r.readAsDataURL(blob);
  };

  /* ---------- Real phone apps pinned to the Blockvile home screen ---------- */
  const imgIcon = pkg => { const src = android.icon(pkg); return src ? `<img class="nat-ic" src="${src}" alt="">` : "📦"; };
  const nativeApp = (pkg, name) => ({
    id: "nat-" + pkg, name, pkg, native: true, cat: "Android", bg: "transparent", icon: imgIcon(pkg), keywords: "android " + pkg,
    launch: () => android.launch(pkg), render() { },
  });
  const pins = () => store.get("nativePins", []);
  function pin(pkg, name) {
    if (!pins().some(p => p.pkg === pkg)) store.set("nativePins", [...pins(), { pkg, name }]);
    const os = window.BlockvileOS; if (os) os.registerApp(nativeApp(pkg, name)); else A.push(nativeApp(pkg, name));
  }
  function unpin(pkg) { store.set("nativePins", pins().filter(p => p.pkg !== pkg)); window.BlockvileOS?.unregisterApp("nat-" + pkg); }
  android.pin = pin; android.unpin = unpin; android.isPinned = pkg => pins().some(p => p.pkg === pkg);
  pins().forEach(p => { if (android.installed(p.pkg)) A.push(nativeApp(p.pkg, p.name)); });

  /* ---------- Notice when Play finishes installing something ---------- */
  function checkPending() {
    const os = window.BlockvileOS; if (!os) return;
    const pending = store.get("pendingPlay", []); if (!pending.length) return;
    const left = [];
    const all = android.apps();
    pending.forEach(pkg => {
      if (!android.installed(pkg)) return left.push(pkg);
      const name = all.find(a => a.pkg === pkg)?.name || pkg;
      pin(pkg, name);
      os.notify({ app: "nat-" + pkg, icon: "✅", title: "App installed", text: name + " was added to your home screen" });
    });
    store.set("pendingPlay", left);
  }
  function syncPins() { // drop pins for apps that were uninstalled outside Blockvile
    pins().forEach(p => { if (!android.installed(p.pkg)) unpin(p.pkg); });
  }
  const refresh = () => { checkPending(); syncPins(); window.dispatchEvent(new Event("bv:android-apps")); };
  window.addEventListener("bv:resume", refresh);
  window.addEventListener("bv:packages", refresh);

  /* ---------- "Android Apps" — every app installed on the phone ---------- */
  A.push({
    id: "androidapps", name: "Android Apps", icon: "🤖", bg: "linear-gradient(135deg,#34d399,#2563eb)", cat: "System", system: true, dock: true,
    keywords: "apps drawer installed phone android launcher", size: [720, 620],
    render(body, os) {
      let q = "", sheet = null;
      const draw = () => {
        const list = android.apps().filter(a => a.name.toLowerCase().includes(q.toLowerCase()));
        body.innerHTML = `<div class="toolbar"><input class="field" data-q placeholder="Search ${android.apps().length} apps on this phone" value="${esc(q)}" style="flex:1;min-width:160px">
            <button class="btn" data-store>＋ Get apps</button></div>
          <p class="muted" style="font-size:12px;margin:-4px 0 10px">Tap to open · long-press for options</p>
          <div class="nat-grid">${list.map(a => `<button class="app" data-pkg="${esc(a.pkg)}" data-name="${esc(a.name)}"><i class="app-ic" style="background:transparent" data-ic="${esc(a.pkg)}"></i><span>${esc(a.name)}</span></button>`).join("") || `<p class="muted">No apps found</p>`}</div>
          ${sheet ? `<div class="nat-sheet"><div class="nat-sheet-box"><b>${esc(sheet.name)}</b><small>${esc(sheet.pkg)}</small>
            <button data-s="open">▶ Open</button>
            <button data-s="pin">${android.isPinned(sheet.pkg) ? "✖ Remove from Blockvile home" : "📌 Add to Blockvile home"}</button>
            <button data-s="play">🛍 View in Google Play</button>
            <button data-s="info">ℹ App info</button>
            <button data-s="uninstall" class="danger">🗑 Uninstall</button>
            <button data-s="close">Cancel</button></div></div>` : ""}`;
        const qi = body.querySelector("[data-q]"); qi.oninput = () => { q = qi.value; draw(); const n = body.querySelector("[data-q]"); n.focus(); n.setSelectionRange(q.length, q.length); };
        // load icons gradually so the list appears instantly
        const ics = [...body.querySelectorAll("[data-ic]")]; let i = 0;
        const step = () => { const end = Math.min(ics.length, i + 12); for (; i < end; i++) ics[i].innerHTML = imgIcon(ics[i].dataset.ic); if (i < ics.length) requestAnimationFrame(step); };
        step();
      };
      body.addEventListener("click", e => {
        if (e.target.closest("[data-store]")) return os.open("store", { tab: "android" });
        const s = e.target.closest("[data-s]")?.dataset.s;
        if (s) {
          const { pkg, name } = sheet; sheet = null;
          if (s === "open") android.launch(pkg);
          if (s === "pin") android.isPinned(pkg) ? unpin(pkg) : (pin(pkg, name), os.toast("📌 " + name + " added to your home screen"));
          if (s === "play") android.openPlay(pkg);
          if (s === "info") android.info(pkg);
          if (s === "uninstall") android.uninstall(pkg);
          return draw();
        }
        if (e.target.closest(".nat-sheet")) { sheet = null; return draw(); }
        const t = e.target.closest("[data-pkg]"); if (t) android.launch(t.dataset.pkg);
      });
      body.addEventListener("contextmenu", e => { const t = e.target.closest("[data-pkg]"); if (!t) return; e.preventDefault(); sheet = { pkg: t.dataset.pkg, name: t.dataset.name }; draw(); });
      const onApps = () => draw();
      window.addEventListener("bv:android-apps", onApps);
      os.onBack("androidapps", () => { if (sheet) { sheet = null; draw(); return true; } });
      draw();
      return () => window.removeEventListener("bv:android-apps", onApps);
    }
  });

  /* ---------- Real device controls follow Blockvile's controls ---------- */
  window.addEventListener("bv:volume", e => android.setVolume(e.detail));
  window.addEventListener("bv:brightness", e => android.setBrightness(e.detail));
  window.addEventListener("bv:flag", e => { if (e.detail.flag === "torch" && !android.setTorch(e.detail.on) && e.detail.on) window.BlockvileOS?.toast("This phone has no torch"); });
  // Apps can't switch Wi-Fi, Bluetooth, data or airplane mode themselves on Android — open the phone's real controls
  const PANELS = { wifi: "wifi", bluetooth: "bluetooth", data: "data", airplane: "airplane" };
  document.addEventListener("click", e => {
    const t = e.target.closest("#cc [data-toggle], #cc [data-flag='airplane']");
    if (!t) return;
    const which = PANELS[t.dataset.toggle || t.dataset.flag]; if (!which) return;
    e.preventDefault(); e.stopPropagation(); android.openPanel(which);
  }, true);
  // Notifications show on the phone itself while Blockvile is in the background
  window.addEventListener("bv:notify", e => {
    const n = e.detail, os = window.BlockvileOS;
    if (document.hidden && !os?.state.flags.dnd) android.notify(n.title, n.text);
  });

  /* ---------- Temporary takeover (started only by the user's button / `application takeover`) ---------- */
  window.addEventListener("bv:takeover", () => {
    const st = android.takeover(), os = window.BlockvileOS; if (!os) return;
    if (st.active && st.isHome) os.toast("⛶ Temporary takeover on — Exit, application exit or a restart gives the phone back" + (st.previousHome ? " to " + st.previousHome : ""));
    else if (st.active) os.toast("Choose Blockvile when Android asks for a home app to finish starting the takeover");
  });
  window.addEventListener("bv:resume", () => window.dispatchEvent(new Event("bv:takeover-refresh")));

  // run once the OS has started
  window.addEventListener("load", () => setTimeout(() => {
    refresh();
    if (!android.canNotify() && !store.get("askedNotify", false)) { store.set("askedNotify", true); android.askNotify(); }
  }, 800));
})();
