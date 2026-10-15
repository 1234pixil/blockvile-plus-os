// Offline cache so Blockvile Plus OS works without internet once installed
const C = "blockvile-plus-v3";
const FILES = ["./", "index.html", "css/style.css", "js/lib.js", "js/os.js", "js/apps.js", "js/apps-media.js", "icons/logo.svg", "manifest.json"];
self.addEventListener("install", e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES))));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))));
self.addEventListener("fetch", e => { if (new URL(e.request.url).origin === location.origin) e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
