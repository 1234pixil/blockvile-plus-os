// Blockvile Plus OS — offline support for the installed app.
// Pages and files are served from the cache straight away and refreshed in the background.
const C = "blockvile-plus-v7";
const FILES = ["./", "index.html", "blockvile-plus-os.html", "privacy.html", "manifest.json", "css/style.css",
  "js/config.js", "js/lib.js", "js/android.js", "js/apps.js", "js/apps-media.js", "js/apps-store.js", "js/apps-video.js", "js/apps-help.js", "js/os.js",
  "icons/logo.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => e.waitUntil(
  caches.open(C).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => { })))).then(() => self.skipWaiting())
));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;   // YouTube, weather etc. go straight to the network
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
