/* Blockvile Plus OS — system libraries: settings store, blob storage (IndexedDB), virtual file system */
(() => {
  /* ---------- Key/value store (localStorage, safe) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("bv:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("bv:" + k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem("bv:" + k); } catch { } },
    clearAll() { try { Object.keys(localStorage).filter(k => k.startsWith("bv:")).forEach(k => localStorage.removeItem(k)); } catch { } },
  };

  /* ---------- Blob storage (IndexedDB) for photos, music, recordings, wallpaper ---------- */
  const STORES = ["photos", "music", "recordings", "kv"];
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error("no idb"));
      const r = indexedDB.open("blockvile-plus", 1);
      r.onupgradeneeded = () => STORES.forEach(s => r.result.objectStoreNames.contains(s) || r.result.createObjectStore(s, { keyPath: "id" }));
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const tx = (s, mode, fn) => db().then(d => new Promise((res, rej) => {
    const t = d.transaction(s, mode), st = t.objectStore(s); const out = fn(st);
    t.oncomplete = () => res(out && "result" in out ? out.result : undefined); t.onerror = () => rej(t.error);
  }));
  const idb = {
    put: (s, rec) => tx(s, "readwrite", st => st.put({ date: Date.now(), ...rec, id: rec.id || (Date.now() + "-" + Math.random().toString(36).slice(2, 7)) })),
    get: (s, id) => tx(s, "readonly", st => st.get(id)),
    all: (s) => tx(s, "readonly", st => st.getAll()).then(a => (a || []).sort((x, y) => y.date - x.date)),
    del: (s, id) => tx(s, "readwrite", st => st.delete(id)),
    clear: () => Promise.all(STORES.map(s => tx(s, "readwrite", st => st.clear()))).catch(() => { }),
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

  window.BV = { store, idb, fs, esc, safeMath, beep, fmtSize, download };
  window.BV_APPS = window.BV_APPS || [];
})();
