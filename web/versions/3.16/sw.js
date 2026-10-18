// Blockvile Plus OS — offline support for the installed app.
// Pages and files are served from the cache straight away and refreshed in the background.
const C = "blockvile-plus-v19";
const FILES = ["./", "index.html", "blockvile-plus-os.html", "privacy.html", "manifest.json", "css/style.css",
  "js/build.js", "js/config.js", "js/lib.js", "js/android.js", "js/apps.js", "js/apps-media.js", "tube.html", "js/apps-web.js", "js/apps-store.js", "js/apps-video.js", "js/apps-help.js", "js/accounts.js", "js/updates.js", "js/apps-sim-ai.js", "js/os.js",
  "icons/logo.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => e.waitUntil(
  caches.open(C).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => { })))).then(() => self.skipWaiting())
));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
// "Update now": fetch every file fresh from the website into the cache, then tell the page to reload.
async function refreshAll() {
  const c = await caches.open(C);
  // optional files (e.g. the one-file copy, some icons) may not exist on every site, so only the core files must succeed
  const core = new Set(["index.html", "js/os.js", "js/lib.js", "css/style.css", "js/build.js"]);
  const res = await Promise.allSettled(FILES.map(async f => { const r = await fetch(f, { cache: "reload" }); if (!r.ok) throw new Error(f); await c.put(f, r); return f; }));
  const bad = FILES.filter((f, i) => res[i].status === "rejected" && core.has(f));
  if (bad.length) throw new Error("missing " + bad.join(", "));
}
self.addEventListener("message", e => {
  if (e.data !== "bv-update") return;
  const to = e.source;
  e.waitUntil(refreshAll().then(() => to && to.postMessage("bv-updated"), () => to && to.postMessage("bv-update-failed")));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.endsWith("/version.json") || url.pathname.endsWith("/versions/index.json")) return;   // always ask the network, so "is there an update?" is never answered from the cache   // YouTube, weather etc. go straight to the network
  e.respondWith(caches.open(C).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
    const fresh = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    const r = await fresh;
    if (r) return r;
    if (req.mode === "navigate") return (await cache.match("index.html")) || (await cache.match("blockvile-plus-os.html")) || Response.error();
    return Response.error();
  }));
});
