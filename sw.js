// Guarda a "casca" do app no celular para abrir sem internet. Os dados ficam no IndexedDB.
const CACHE = 'cf26-app-v9';
const SHELL = [
  './', 'index.html', 'app.css', 'app.js', 'config.js', 'lousa.js', 'manifest.webmanifest',
  'fonts/roboto-latin-400-normal.woff2', 'fonts/roboto-latin-500-normal.woff2', 'fonts/roboto-latin-700-normal.woff2',
  'fonts/josefin-sans-latin-400-normal.woff2', 'fonts/josefin-sans-latin-600-normal.woff2', 'fonts/josefin-sans-latin-700-normal.woff2',
  'fonts/cormorant-garamond-latin-600-italic.woff2',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // rede primeiro (pega a versão nova), com limite de 4s; sem rede, usa o que está guardado
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const r = await Promise.race([fetch(e.request), new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), 4000))]);
      if (r && r.ok) cache.put(e.request, r.clone());
      return r;
    } catch (err) {
      return (await cache.match(e.request, { ignoreSearch: true })) || (await cache.match('index.html'));
    }
  })());
});
