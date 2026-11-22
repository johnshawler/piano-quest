// Serves Piano Quest at johnshawler.com/piano-quest straight from the main
// branch of the public GitHub repo, so a push to main updates the site within
// a few minutes. Only the game's own files are served. Copies are kept at
// Cloudflare for two minutes; browsers are told to check back on every load so
// players never get stuck on an old version.
const ORIGIN = 'https://raw.githubusercontent.com/johnshawler/piano-quest/main';
const PREFIX = '/piano-quest';
const ALLOWED = /^\/(index\.html|manifest\.webmanifest|sw\.js|css\/[\w-]+\.css|js\/[\w-]+\.js|icons\/[\w-]+\.(png|svg)|licenses\/[\w-]+\.txt)$/;
const TYPES = {
  html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
  webmanifest: 'application/manifest+json', png: 'image/png', svg: 'image/svg+xml', txt: 'text/plain; charset=utf-8',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    if (url.pathname === PREFIX) return Response.redirect(url.origin + PREFIX + '/', 307);
    let path = url.pathname.slice(PREFIX.length);
    if (path === '/') path = '/index.html';
    if (!ALLOWED.test(path)) return new Response('Not found', { status: 404 });

    const cache = caches.default;
    const key = new Request(url.origin + PREFIX + path);
    let stored = await cache.match(key);
    if (!stored) {
      const upstream = await fetch(ORIGIN + path);
      if (!upstream.ok) return new Response('Not found', { status: upstream.status === 404 ? 404 : 502 });
      stored = new Response(upstream.body, { headers: { 'Cache-Control': 'public, max-age=120' } });
      ctx.waitUntil(cache.put(key, stored.clone()));
    }
    return new Response(stored.body, {
      headers: {
        'Content-Type': TYPES[path.split('.').pop()],
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};
