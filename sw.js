// Guarda a "casca" do app no celular para abrir sem internet.
const CACHE = 'cf26-teste-v1';
const SHELL = [
  './', 'index.html', 'app.css', 'app.js', 'config.js', 'manifest.webmanifest',
  'fonts/josefin-sans-latin-400-normal.woff2', 'fonts/josefin-sans-latin-600-normal.woff2',
  'fonts/cormorant-garamond-latin-500-italic.woff2',
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
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // envio para a planilha passa direto
  // rede primeiro (pega versão nova), cai no cache se estiver offline
  e.respondWith(
    fetch(e.request).then((r) => {
      const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
