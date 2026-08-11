// Offline cache for Mise.
//
// The page itself is fetched network-first: a redeploy must reach the phone
// on the next load, and a cached copy is only a fallback for when there is
// no signal. Static files are served cache-first and refreshed in the
// background. Bump CACHE whenever the shell changes.
const CACHE = "mise-v25";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Lets the page ask for an immediate update.
self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Anything on another domain — relays, the API, fonts — goes straight to
  // the network. Handling it here only adds a way for it to break.
  if (url.origin !== self.location.origin) return;

  // The link fetcher must always be live.
  if (url.pathname.includes("/.netlify/functions/")) return;

  const isPage = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isPage) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // Only a real page is worth keeping. A 404 or a maintenance page is
          // still HTML, and caching one makes it the offline app.
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html").then((hit) => hit || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
