/* Service Worker · Adolphus
   Guarda la aplicación en el equipo para que abra sin señal en planta.
   Estrategia: la app se sirve desde la caché y se actualiza en segundo
   plano cuando hay internet (stale-while-revalidate). */
const CACHE = 'adolphus-v1';
const APP = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './video/presentacion.mp4',
  './img/valvulas/control.jpg',
  './img/valvulas/seguridad.jpg',
  './img/valvulas/mariposa.jpg',
  './img/valvulas/cuchilla.jpg',
  './img/valvulas/pinch.jpg'
];

self.addEventListener('install', e => {
  // addAll falla entero si un archivo no está; se cachea uno a uno.
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(APP.map(u => c.add(u).catch(() => null)))
  ).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // no interceptar terceros

  // La navegación siempre debe poder abrir, con o sin señal.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        caches.open(CACHE).then(c => c.put('./index.html', r.clone()));
        return r;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => {
      if (r && r.status === 200) caches.open(CACHE).then(c => c.put(req, r.clone()));
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});

// Permite activar una versión nueva sin esperar a cerrar todas las pestañas.
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
