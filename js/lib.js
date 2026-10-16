/* Blockvile Plus OS — system libraries: settings store, blob storage (IndexedDB), virtual file system */
(() => {
  /* ---------- Key/value store (localStorage, safe) ---------- */
  // Some embeds (sandboxed iframes, blocked third-party storage) don't allow saving.
  // Then Blockvile keeps everything in memory, so it still works — it just resets when the page closes.
  let LS = null;
  try { const t = window.localStorage; t.setItem("bv:__t", "1"); t.removeItem("bv:__t"); LS = t; } catch { }
  const mem = new Map();
  const store = {
    persistent: !!LS,
    get(k, d) { try { const v = LS ? LS.getItem("bv:" + k) : (mem.has(k) ? mem.get(k) : null); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { const j = JSON.stringify(v); if (LS) LS.setItem("bv:" + k, j); else mem.set(k, j); return true; } catch { return false; } },
    del(k) { try { LS ? LS.removeItem("bv:" + k) : mem.delete(k); } catch { } },
    clearAll() { try { if (LS) Object.keys(LS).filter(k => k.startsWith("bv:")).forEach(k => LS.removeItem(k)); mem.clear(); } catch { } },
  };

  /* ---------- Blob storage (IndexedDB) for photos, music, recordings, wallpaper ---------- */
  const STORES = ["photos", "music", "recordings", "kv"];
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      let r;
      try { if (!window.indexedDB) return rej(new Error("no idb")); r = indexedDB.open("blockvile-plus", 1); } catch (e) { return rej(e); }
      r.onupgradeneeded = () => STORES.forEach(s => r.result.objectStoreNames.contains(s) || r.result.createObjectStore(s, { keyPath: "id" }));
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const tx = (s, mode, fn) => db().then(d => new Promise((res, rej) => {
    const t = d.transaction(s, mode), st = t.objectStore(s); const out = fn(st);
    t.oncomplete = () => res(out && "result" in out ? out.result : undefined); t.onerror = () => rej(t.error);
  }));
  // Memory fallback when IndexedDB is blocked (e.g. some embeds)
  const memDB = Object.fromEntries(STORES.map(s => [s, new Map()]));
  let useMem = false;
  const safe = (real, fake) => (...a) => useMem ? Promise.resolve(fake(...a)) : real(...a).catch(() => { useMem = true; return fake(...a); });
  const newId = () => Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  const idb = {
    put: safe((s, rec) => tx(s, "readwrite", st => st.put({ date: Date.now(), ...rec, id: rec.id || newId() })),
              (s, rec) => { const r = { date: Date.now(), ...rec, id: rec.id || newId() }; memDB[s].set(r.id, r); return r.id; }),
    get: safe((s, id) => tx(s, "readonly", st => st.get(id)), (s, id) => memDB[s].get(id)),
    all: safe((s) => tx(s, "readonly", st => st.getAll()).then(a => (a || []).sort((x, y) => y.date - x.date)),
              (s) => [...memDB[s].values()].sort((x, y) => y.date - x.date)),
    del: safe((s, id) => tx(s, "readwrite", st => st.delete(id)), (s, id) => { memDB[s].delete(id); }),
    clear: () => { STORES.forEach(s => memDB[s].clear()); return useMem ? Promise.resolve() : Promise.all(STORES.map(s => tx(s, "readwrite", st => st.clear()))).catch(() => { }); },
  };

  /* ---------- Virtual file system (persisted) ---------- */
  const seed = () => ({
    type: "dir", children: {
      Desktop: { type: "dir", children: { "Read me.txt": { type: "file", content: "Welcome to Blockvile Plus OS!\n\nTry the Terminal: type 'help'.\nPress Ctrl+K to search anything.", mtime: Date.now() } } },
      Documents: { type: "dir", children: { "Ideas.txt": { type: "file", content: "My ideas:\n- \n", mtime: Date.now() } } },
      Downloads: { type: "dir", children: {} },
      Music: { type: "dir", children: {} },
      Pictures: { type: "dir", children: {} },
    }
  });
  let tree = store.get("fs", null) || seed();
  const persist = () => store.set("fs", tree);
  const norm = (p, cwd = "/") => {
    const parts = (p.startsWith("/") ? p : cwd.replace(/\/$/, "") + "/" + p).split("/");
    const out = [];
    for (const x of parts) { if (!x || x === ".") continue; if (x === "..") out.pop(); else out.push(x); }
    return "/" + out.join("/");
  };
  const walk = p => { let n = tree; for (const x of norm(p).split("/").filter(Boolean)) { if (!n || n.type !== "dir") return null; n = n.children[x]; } return n || null; };
  const parent = p => { const a = norm(p).split("/").filter(Boolean); const name = a.pop(); return { dir: walk("/" + a.join("/")), name }; };
  const fs = {
    norm, stat: p => walk(p),
    exists: p => !!walk(p),
    isDir: p => walk(p)?.type === "dir",
    list(p) { const n = walk(p); if (!n || n.type !== "dir") throw new Error("Not a folder: " + p);
      return Object.entries(n.children).map(([name, v]) => ({ name, type: v.type, size: v.type === "file" ? v.content.length : Object.keys(v.children).length, mtime: v.mtime || 0 }))
        .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1)); },
    read(p) { const n = walk(p); if (!n) throw new Error("No such file: " + p); if (n.type !== "file") throw new Error("Is a folder: " + p); return n.content; },
    write(p, content) { const { dir, name } = parent(p); if (!dir || dir.type !== "dir" || !name) throw new Error("Bad path: " + p);
      if (dir.children[name]?.type === "dir") throw new Error("Is a folder: " + p);
      dir.children[name] = { type: "file", content: String(content), mtime: Date.now() };
      if (!persist()) { throw new Error("Storage full"); } },
    mkdir(p) { const { dir, name } = parent(p); if (!dir || dir.type !== "dir" || !name) throw new Error("Bad path: " + p);
      if (dir.children[name]) throw new Error("Already exists: " + name); dir.children[name] = { type: "dir", children: {}, mtime: Date.now() }; persist(); },
    rm(p) { const { dir, name } = parent(p); if (!dir?.children?.[name]) throw new Error("No such file: " + p); delete dir.children[name]; persist(); },
    rename(p, newName) { const { dir, name } = parent(p); if (!dir?.children?.[name]) throw new Error("No such file: " + p);
      if (!newName || newName.includes("/")) throw new Error("Bad name"); if (dir.children[newName]) throw new Error("Already exists: " + newName);
      dir.children[newName] = dir.children[name]; delete dir.children[name]; persist(); },
    search(q) { q = q.toLowerCase(); const out = [];
      (function rec(n, p) { for (const [k, v] of Object.entries(n.children)) { const fp = p + "/" + k; if (k.toLowerCase().includes(q)) out.push({ path: fp, type: v.type }); if (v.type === "dir") rec(v, fp); } })(tree, "");
      return out; },
    usage: () => JSON.stringify(tree).length,
    reset() { tree = seed(); persist(); },
  };

  /* ---------- Small utilities ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function safeMath(expr) { // only numbers and + - * / ( ) . % ^ — no names, no code
    const e = String(expr).replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\^/g, "**").trim();
    if (!e || !/^[\d\s+\-*/().%]+$/.test(e) || !/\d/.test(e) || !/[+\-*/%]/.test(e)) return null;
    try { const v = Function(`"use strict";return (${e})`)(); return typeof v === "number" && isFinite(v) ? +v.toPrecision(12) : null; } catch { return null; }
  }
  let actx = null;
  function beep(freq = 880, ms = 180, times = 1, vol = 0.6) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < times; i++) {
        const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * (ms / 1000 + 0.12);
        o.frequency.value = freq; o.type = "sine"; g.gain.setValueAtTime(vol * 0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + ms / 1000);
      }
    } catch { }
  }
  const fmtSize = n => n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(1) + " MB";
  const download = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };

  /* ---------- In-OS dialogs (embeds often block the browser's own prompt/confirm boxes) ---------- */
  function dialog({ title, text, value, input, okText = "OK", cancelText = "Cancel", danger = false }) {
    return new Promise(resolve => {
      const host = document.getElementById("screen") || document.body;
      const d = document.createElement("div");
      d.className = "bv-dialog";
      d.innerHTML = `<form class="bv-dialog-box" role="dialog" aria-modal="true"><p></p>${text ? `<small class="bv-dialog-text"></small>` : ""}${input ? `<input class="field" autocomplete="off">` : ""}
        <div class="bv-dialog-btns"><button type="button" class="btn ghost" data-x></button><button class="btn${danger ? " danger" : ""}">${okText}</button></div></form>`;
      d.querySelector("p").textContent = title;
      d.querySelector("[data-x]").textContent = cancelText;
      if (text) d.querySelector(".bv-dialog-text").textContent = text;
      const inp = d.querySelector("input"); if (inp) inp.value = value ?? "";
      const done = v => { d.remove(); document.removeEventListener("keydown", esc, true); resolve(v); };
      const esc = e => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); done(input ? null : false); } };
      document.addEventListener("keydown", esc, true);
      d.querySelector("[data-x]").onclick = () => done(input ? null : false);
      d.addEventListener("pointerdown", e => { if (e.target === d) done(input ? null : false); });
      d.querySelector("form").onsubmit = e => { e.preventDefault(); done(input ? inp.value : true); };
      host.appendChild(d);
      setTimeout(() => { if (inp) { inp.focus(); inp.select(); } else d.querySelector("form button:last-child").focus(); }, 20);
    });
  }
  const ask = (title, value = "") => dialog({ title, value, input: true });
  const confirmBox = (title, opts = {}) => dialog({ title, text: opts.text, okText: opts.ok || "OK", cancelText: opts.cancel || "Cancel", danger: !!opts.danger });

  // Sandboxed embeds block real form submission. Blockvile's forms never navigate anyway, so Enter and
  // submit buttons fire a plain "submit" event instead — this works the same everywhere.
  const fakeSubmit = (form, e) => { e.preventDefault(); form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); };
  document.addEventListener("keydown", e => {
    const t = e.target;
    if (e.key !== "Enter" || e.isComposing || !t.form || !(t instanceof HTMLInputElement) || /^(button|submit|checkbox|radio|file)$/.test(t.type)) return;
    fakeSubmit(t.form, e);
  }, true);
  document.addEventListener("click", e => {
    const b = e.target.closest?.("button, input[type=submit]");
    if (!b || !b.form || (b.tagName === "BUTTON" && b.type !== "submit")) return;
    fakeSubmit(b.form, e);
  }, true);

  let embedded = false; try { embedded = window.self !== window.top; } catch { embedded = true; }

  window.BV = { store, idb, fs, esc, safeMath, beep, fmtSize, download, ask, confirm: confirmBox, embedded, isMemoryIdb: () => useMem };
  window.BV_APPS = window.BV_APPS || [];
})();
