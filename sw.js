/* Piano Quest — offline support. Once the game has been opened online,
 * it keeps working without a connection (handy for an iPad at the piano). */
const CACHE = 'piano-quest-v3';
const FILES = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/glyphs.js', 'js/curriculum.js', 'js/audio.js', 'js/store.js', 'js/staff.js', 'js/input.js', 'js/session.js', 'js/app.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', event => {
  const fresh = FILES.map(file => new Request(file, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(fresh)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

/* Online, always load the newest version of the game and keep a copy.
 * Offline (or on a very slow connection), fall back to the saved copy. */
function newestFirst(cache, request) {
  const saved = cache.match(request, { ignoreSearch: true });
  const fresh = fetch(request, { cache: 'no-store' }).then(res => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  });
  const slow = new Promise(resolve => setTimeout(resolve, 4000)).then(() => saved);
  return Promise.race([fresh.catch(() => undefined), slow]).then(res => res || saved).then(res => res || fresh);
}

/* Fonts and other outside files rarely change: saved copy first, refreshed in the background. */
function savedFirst(cache, request) {
  return cache.match(request).then(hit => {
    const fresh = fetch(request).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
      return res;
    }).catch(() => hit);
    return hit || fresh;
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const ours = new URL(request.url).origin === self.location.origin;
  event.respondWith(caches.open(CACHE).then(cache => (ours ? newestFirst : savedFirst)(cache, request)));
});
