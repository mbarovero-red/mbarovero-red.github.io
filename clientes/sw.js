'use strict';
// Subir VERSION cada vez que se cambien archivos de la app.
const VERSION = 'redmas-clientes-v11';
const ARCHIVOS = [
  './', 'index.html', 'app.css', 'app.js', 'manifest.json', 'privacidad.html',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // config.json: primero la red (estado actualizado), si no hay conexión, lo último guardado.
  if (req.url.endsWith('/config.json') || req.url.includes('/config.json?')) {
    e.respondWith(
      fetch(req).then((r) => {
        const copia = r.clone();
        caches.open(VERSION).then((c) => c.put(req, copia));
        return r;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Resto: caché primero, red como respaldo.
  e.respondWith(
    caches.match(req, { ignoreSearch: req.mode === 'navigate' })
      .then((r) => r || fetch(req))
  );
});
