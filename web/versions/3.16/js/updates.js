/* Blockvile Plus OS — software updates. Finds out when a newer version is published and updates in place
   (no re-download): the website/installed app refreshes its cache, the Android app downloads the new web files. */
(() => {
  const { store, esc } = window.BV;
  const CFG = () => window.BV_CONFIG || {};
  const local = () => window.BV_BUILD || { version: CFG().version || "", build: "" };
  const android = () => window.BV.android;
  const isAndroid = () => !!android()?.available;
  const os = () => window.BlockvileOS;
  const HOURS = 6;

  const st = { versions: null, vLoading: false, vError: "", checking: false, remote: null, error: "", last: store.get("updLast", 0), applying: false, pct: 0, msg: "" };
  const emit = () => { document.documentElement.classList.toggle("has-update", updates.available() && !st.applying); window.dispatchEvent(new Event("bv:update")); };

  const cmp = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; } return 0; };

  // The site's top folder: the publisher's website (installUrl), or the site this copy is running from.
  // (An older release runs from <site>/versions/<x.y>/, so its folder is cut off to get back to the top.)
  const archived = () => !isAndroid() && /\/versions\/\d+(\.\d+)*\//.test(location.pathname);
  function siteRoot() {
    const base = CFG().installUrl;
    if (base) { try { return new URL(base.endsWith("/") ? base : base + "/").href; } catch { return ""; } }
    if (!isAndroid() && /^https?:$/.test(location.protocol) && location.origin !== "null") {
      const u = new URL(location.href); u.search = ""; u.hash = "";
      u.pathname = u.pathname.replace(/versions\/\d+(\.\d+)*\/[^/]*$/, "").replace(/[^/]*$/, "");
      return u.href;
    }
    return "";
  }
  const versionUrl = () => { const r = siteRoot(); return r ? r + "version.json" : ""; };
  const nativeApi = () => (isAndroid() ? android().ota()?.api || 1 : 99);
  const otaOn = () => !isAndroid() || !!android().ota()?.enabled;

  const updates = {
    state: st, local,
    configured: () => !!versionUrl(),
    // is a newer version published?
    available() {
      const r = st.remote; if (!r?.build) return false;
      if (r.build === local().build) return false;
      return cmp(r.version, local().version) >= 0;       // never "update" to an older one
    },
    needsStore: () => !!st.remote && (st.remote.native || 1) > nativeApi(),
    async check(manual) {
      const url = versionUrl();
      if (!url) { st.error = isAndroid() ? "The publisher hasn't set the update address yet" : "Updates need the hosted website"; if (manual) emit(); return false; }
      if (st.checking) return updates.available();
      st.checking = true; st.error = ""; emit();
      try {
        const r = await fetch(url + "?t=" + Date.now(), { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        if (typeof j.version !== "string" || !/^[a-f0-9]{12}$/.test(j.build || "")) throw new Error("bad version file");
        st.remote = { version: j.version, build: j.build, native: +j.native || 1, notes: Array.isArray(j.notes) ? j.notes.slice(0, 8).map(String) : [], released: j.released || "" };
        st.last = Date.now(); store.set("updLast", st.last);
      } catch (e) { st.error = navigator.onLine === false ? "You're offline" : "Couldn't reach the update server"; }
      st.checking = false; emit();
      if (updates.available()) announce();
      return updates.available();
    },
    // ---- Versions: every release is kept on the site, so people can go back to an older one or forward to a newer one
    versionsOk: () => isAndroid() ? otaOn() : !!siteRoot(),
    isOlderCopy: () => archived(),
    latest: () => (st.versions || []).slice(-1)[0] || null,
    async versions(force) {
      if (st.versions && !force) return st.versions;
      if (!updates.versionsOk()) { st.vError = isAndroid() ? "The publisher hasn't set the update address yet" : "Switching versions needs the hosted website"; emit(); return []; }
      st.vLoading = true; st.vError = ""; emit();
      try {
        const base = isAndroid() ? CFG().installUrl : siteRoot();
        const r = await fetch(new URL("versions/index.json?t=" + Date.now(), base.endsWith("/") ? base : base + "/").href, { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        st.versions = (Array.isArray(j.versions) ? j.versions : [])
          .filter(v => v && /^\d+(\.\d+){0,3}$/.test(v.version) && /^[a-f0-9]{12}$/.test(v.build || ""))
          .map(v => ({ version: v.version, build: v.build, native: +v.native || 1, released: String(v.released || ""), notes: Array.isArray(v.notes) ? v.notes.slice(0, 4).map(String) : [] }))
          .sort((a, b) => cmp(a.version, b.version));
      } catch (e) { st.vError = navigator.onLine === false ? "You're offline" : "Couldn't load the list of versions"; }
      st.vLoading = false; emit();
      return st.versions || [];
    },
    // why a version can't be used here, or "" if it can
    blocked(v) { return v.native > nativeApi() ? "Needs a newer Android app (Google Play)" : ""; },
    rel(v) { const c = cmp(v, local().version); return c === 0 ? "current" : c < 0 ? "older" : "newer"; },
    async switchTo(ver) {
      if (st.applying) return false;
      const list = await updates.versions(); const e = list.find(x => x.version === ver);
      if (!e) { st.vError = "That version isn't available"; emit(); return false; }
      if (e.version === local().version && !archived()) { os()?.toast("You're already on " + ver); return false; }
      if (updates.blocked(e)) { st.vError = updates.blocked(e); emit(); return false; }
      store.set("updPending", { to: e.version, build: e.build, notes: e.notes, kind: "switch" });
      const latest = updates.latest();
      st.applying = true; st.pct = 0; st.msg = "Switching to " + e.version + "…"; st.vError = ""; emit();
      if (isAndroid()) { android().otaSwitch(e.version); return true; }       // progress arrives as "bv:ota"; the app reloads itself
      setTimeout(() => {
        const root = siteRoot();
        if (latest && e.version === latest.version) { store.del("pin"); location.href = root + "?bvlatest=1"; }
        else { store.set("pin", e.version); location.href = root + "versions/" + e.version + "/index.html"; }
      }, 300);
      return true;
    },
    async apply() {
      if (st.applying) return;
      if (archived()) { await updates.versions(true); const l = updates.latest(); if (l) return updates.switchTo(l.version); }
      if (!updates.available()) return os()?.toast("✅ Blockvile is up to date");
      const target = st.remote.version;
      if (updates.needsStore()) { android()?.playUpdate?.(); return os()?.toast("This update comes through Google Play"); }
      st.applying = true; st.pct = 0; st.msg = "Starting…"; st.error = ""; emit();
      store.set("updPending", { to: target, build: st.remote.build, notes: st.remote.notes || [] });
      if (isAndroid()) {
        if (!otaOn()) { st.applying = false; st.error = "The publisher hasn't set the update address yet"; emit(); return; }
        android().otaApply();                       // progress arrives as "bv:ota"; the app reloads itself when done
        return;
      }
      try {
        const reg = await navigator.serviceWorker?.getRegistration?.();
        const sw = reg?.active || navigator.serviceWorker?.controller;
        if (sw) {
          await new Promise((res, rej) => {
            const t = setTimeout(() => rej(new Error("timeout")), 30000);
            navigator.serviceWorker.addEventListener("message", function f(e) { if (e.data === "bv-updated") { clearTimeout(t); navigator.serviceWorker.removeEventListener("message", f); res(); } else if (e.data === "bv-update-failed") { clearTimeout(t); rej(new Error("failed")); } });
            sw.postMessage("bv-update");
          });
          try { await reg.update(); } catch { }
          location.reload();
        } else {
          // no offline cache (one-file copy, or the browser doesn't allow it): reload past the browser cache
          const u = new URL(location.href); u.searchParams.set("v", st.remote.build); location.replace(u.href);
        }
      } catch (e) { st.applying = false; st.error = "The update didn't finish — check your connection and try again"; store.del("updPending"); emit(); }
    },
    // Short row for Settings that leads to the Software Update app (sw = Settings' switch helper)
    html() {
      const av = updates.available(), r = st.remote;
      return `<div class="h" id="sec-update">Software update</div>
        <div class="list">
          <button data-k="checkUpdate"><span><b>🔄 Check for updates</b><br><small>${st.checking ? "Checking…" : st.applying ? "Updating…" : av ? "Blockvile " + esc(r.version) + " is ready" : st.error ? "⚠️ " + esc(st.error) : "Version " + esc(local().version) + (st.last ? " · last checked " + new Date(st.last).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "")}</small></span><small>›</small></button>
          ${av && !st.applying ? `<button data-k="applyUpdate"><span><b style="color:var(--accent)">⬆️ Update now to ${esc(r.version)}</b><br><small>Nothing installs until you tap this</small></span><small>›</small></button>` : ""}
          <button data-k="openUpdates"><span>OS Update app<br><small>Updates, versions and history</small></span><small>›</small></button>
        </div>`;
    },
    history: () => store.get("updHistory", []),
    kind() { const k = os()?.installStatus?.(); return k === "android" ? "Android app" : k === "installed" ? "Installed app" : BV.embedded ? "Embedded in another page" : "Browser tab"; },
    isApp: () => { const k = os()?.installStatus?.(); return k === "android" || k === "installed"; },
  };

  // Tell the person once per new version
  function announce() {
    const r = st.remote; if (!r || store.get("updNotified", "") === r.build) return;
    store.set("updNotified", r.build);
    os()?.notify({ app: "updates", action: "update", icon: "⬆️", title: "Update available", text: `Blockvile ${r.version} is ready. Tap to update.` });
  }

  // Android reports download progress
  window.addEventListener("bv:ota", e => {
    const d = e.detail || {};
    if (d.state === "downloading") { st.applying = true; st.pct = d.pct || 0; st.msg = d.msg || ""; }
    else if (d.state === "error") { st.applying = false; st.error = d.msg || "Update failed"; store.del("updPending"); }
    else if (d.state === "done") { st.msg = "Restarting…"; }
    emit();
  });

  // Checking is automatic (shortly after start, and when you come back after a few hours). Installing never is.
  async function autoCheck(first) {
    if (!updates.configured()) return;
    if (!first && Date.now() - st.last < HOURS * 36e5) return;
    await updates.check(false);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) autoCheck(false); });

  // After an update: say so
  function justUpdated() {
    const p = store.get("updPending", null); if (!p) return;
    store.del("updPending");
    if (p.build && local().build === p.build) {     // only say so if the new version is really the one running now
      store.set("updHistory", [{ version: local().version, build: local().build, date: new Date().toISOString(), notes: p.notes || [], kind: p.kind || "" }, ...store.get("updHistory", [])].slice(0, 12));
      setTimeout(() => os()?.notify({ app: "updates", action: "update", icon: "✅", title: p.kind === "switch" ? "Version switched" : "Blockvile updated", text: "You're on version " + local().version + (p.notes?.length ? " — " + p.notes[0] : ""), sound: false }), 1500);
    }
  }

  window.BV.updates = updates;

  /* ================= Software Update app ================= */
  window.BV_APPS.push({
    id: "updates", name: "OS Update", icon: "⬆️", bg: "linear-gradient(135deg,#22c55e,#0ea5e9)", cat: "System", system: true, size: [460, 580],
    keywords: "os update switch version older newer downgrade rollback versions upgrade software update new version install latest check patch app update",
    render(body, os) {
      const when = t => { if (!t) return "never"; const m = (Date.now() - t) / 6e4; return m < 1 ? "just now" : m < 60 ? Math.floor(m) + " min ago" : m < 1440 ? Math.floor(m / 60) + " h ago" : new Date(t).toLocaleDateString(); };
      let tab = "update", confirmV = "";
      const draw = () => {
        if (tab === "versions") return drawVersions();
        const l = local(), r = st.remote, av = updates.available(), store_ = updates.needsStore();
        const ota = isAndroid() ? android().ota() || {} : null;
        const state = st.applying ? "busy" : st.error ? "err" : st.checking ? "check" : av ? "new" : r ? "ok" : "idle";
        const title = { busy: "Updating…", err: "Couldn't update", check: "Checking for updates…", new: "Update available", ok: "Blockvile is up to date", idle: "Check for updates" }[state];
        const sub = { busy: esc(st.msg || "Working…"), err: esc(st.error), check: "Looking for a newer version…", new: `Blockvile Plus ${esc(r?.version || "")} is ready`, ok: `Version ${esc(l.version)} is the latest`, idle: `You have version ${esc(l.version)}` }[state];
        const ic = { busy: "⏳", err: "⚠️", check: "🔄", new: "⬆️", ok: "✅", idle: "⬆️" }[state];
        const history = updates.history();
        body.innerHTML = `<div class="upd">${tabs()}
          <div class="upd-hero ${state}"><div class="upd-ic">${ic}</div><h2>${title}</h2><p>${sub}</p>
            ${st.applying ? `<div class="upd-bar"><i style="width:${Math.max(6, st.pct)}%"></i></div>` : ""}
            ${av && !st.applying ? `<button class="btn" data-u="now">${store_ ? "Update on Google Play" : "Update now"}</button>` : ""}
            ${!av && !st.applying ? `<button class="btn ${r ? "ghost" : ""}" data-u="check" ${st.checking ? "disabled" : ""}>${st.checking ? "Checking…" : "Check for updates"}</button>` : ""}
            ${state === "err" && av && !st.applying ? "" : ""}</div>
          ${av && r?.notes?.length ? `<div class="upd-card"><b>What's new in ${esc(r.version)}</b><ul>${r.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
          ${av && store_ ? `<p class="muted" style="font-size:13px;margin:0 4px 14px">This release changes the Android app itself, so it comes through Google Play.</p>` : ""}
          ${!updates.isApp() && !isAndroid() ? `<div class="upd-card"><b>You're using a browser tab</b><p class="muted" style="margin:6px 0 10px;font-size:13px">Install Blockvile as an app to get its own icon, offline use and updates that apply to the app itself.</p><button class="btn ghost" data-u="install">📲 Install the app</button></div>` : ""}
          <p class="muted" style="font-size:13px;margin:0 4px 14px">Updates never install by themselves. Blockvile tells you when one is ready, and nothing changes until you tap <b>Update now</b>.</p>
          <div class="h2">About this install</div>
          <div class="list">
            <div><span>Running as</span><b>${esc(updates.kind())}</b></div>
            <div><span>Version</span><b>${esc(l.version)}${l.build ? ` <small>(${esc(l.build)})</small>` : ""}</b></div>
            ${ota ? `<div><span>Android app</span><b>${esc(ota.version || "")}${ota.build ? ` <small>+ update ${esc(ota.build)}</small>` : ""}</b></div>` : ""}
            <div><span>Updates come from</span><b style="font-size:13px">${esc((() => { try { return new URL(versionUrl()).host; } catch { return "not set"; } })())}</b></div>
            <div><span>Last checked</span><b>${when(st.last)}</b></div>
          </div>
          ${history.length ? `<div class="h2">Update history</div><div class="list">${history.map(h => `<div><span>${h.kind === "switch" ? "Switched to " : ""}Blockvile ${esc(h.version)}<br><small>${esc(h.notes?.[0] || "")}</small></span><small>${new Date(h.date).toLocaleDateString()}</small></div>`).join("")}</div>` : ""}
        </div>`;
      };
      const tabs = () => `<div class="upd-tabs"><button class="${tab === "update" ? "on" : ""}" data-u="tab-update">Update</button><button class="${tab === "versions" ? "on" : ""}" data-u="tab-versions">Versions</button></div>`;
      const drawVersions = () => {
        const list = st.versions || [], cur = local().version, latest = updates.latest();
        const rows = list.slice().reverse().map(v => {
          const rel = updates.rel(v.version), bad = updates.blocked(v), isCur = rel === "current" && !updates.isOlderCopy();
          const tag = isCur ? "Current" : latest && v.version === latest.version ? "Latest" : rel === "older" ? "Older" : "Newer";
          const act = isCur ? "" : bad ? `<small class="muted">${esc(bad)}</small>`
            : confirmV === v.version ? `<button class="btn" data-u="go" data-v="${esc(v.version)}">Confirm</button>` : `<button class="btn ghost" data-u="ask" data-v="${esc(v.version)}">${rel === "older" ? "Switch back" : "Switch"}</button>`;
          return `<div class="upd-ver"><span><b>Blockvile ${esc(v.version)}</b> <em class="upd-tag ${tag.toLowerCase()}">${tag}</em><br><small>${esc(v.released)}${v.notes[0] ? " · " + esc(v.notes[0]) : ""}</small></span>${act}</div>`;
        }).join("");
        body.innerHTML = `<div class="upd">${tabs()}
          <div class="upd-card"><b>Choose your version</b><p class="muted" style="margin:6px 0 0;font-size:13px">You're on <b>${esc(cur)}</b>${updates.isOlderCopy() ? " (an older copy)" : ""}. Move to an older version if a new one doesn't suit you, or to a newer one any time. Your apps, files and settings stay as they are. Older versions may be missing newer features and fixes, so switch back to the latest when you can.</p></div>
          ${st.applying ? `<div class="upd-hero busy"><div class="upd-ic">⏳</div><h2>Switching…</h2><p>${esc(st.msg || "")}</p><div class="upd-bar"><i style="width:${Math.max(6, st.pct)}%"></i></div></div>` : ""}
          ${st.vError ? `<p class="er" style="margin:0 4px 10px">⚠️ ${esc(st.vError)}</p>` : ""}
          ${st.vLoading ? `<p class="muted" style="margin:0 4px">Loading versions…</p>` : rows ? `<div class="list">${rows}</div>` : st.vError ? "" : `<p class="muted" style="margin:0 4px">No versions found.</p>`}
          <p class="muted" style="font-size:13px;margin:12px 4px">Terminal: <code>switch version</code> shows this list, <code>switch version 3.15 now</code> switches.</p>
          <button class="btn ghost" data-u="reload" ${st.vLoading ? "disabled" : ""}>Refresh list</button>
        </div>`;
      };
      const on = () => { if (!body.isConnected) return window.removeEventListener("bv:update", on); draw(); };
      window.addEventListener("bv:update", on);
      body.addEventListener("click", async e => {
        const b = e.target.closest("[data-u]"); if (!b) return;
        const a = b.dataset.u;
        if (a === "check") { const has = await updates.check(true); if (!has && !st.error) os.toast("✅ Blockvile is up to date"); draw(); }
        if (a === "now") updates.apply();
        if (a === "tab-update" || a === "tab-versions") { tab = a === "tab-update" ? "update" : "versions"; confirmV = ""; draw(); if (tab === "versions" && !st.versions) updates.versions(); return; }
        if (a === "reload") { await updates.versions(true); return; }
        if (a === "ask") { confirmV = b.dataset.v; return draw(); }
        if (a === "go") { confirmV = ""; await updates.switchTo(b.dataset.v); return draw(); }
        if (a === "install") os.installApp();
      });
      draw();
      if (updates.configured() && (!st.last || Date.now() - st.last > 60000)) updates.check(false);   // opening the app checks
    }
  });
  window.addEventListener("load", () => { emit(); justUpdated(); setTimeout(() => autoCheck(true), 6000); });
})();
