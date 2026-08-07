/* Service Worker · Adolphus
   Guarda la aplicación en el equipo para que abra sin señal en planta.
   Estrategia: la app se sirve desde la caché y se actualiza en segundo
   plano cuando hay internet (stale-while-revalidate). */
const CACHE = 'adolphus-v2';
/* Sólo lo imprescindible: el video y las fotos de las válvulas ya van
   incrustados dentro del propio index.html, así que precargar los
   archivos sueltos sería bajar 1,4 MB dos veces. En un celular con
   3G en planta, eso se nota. */
const APP = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  // librería de Excel: se guarda en la primera carga con internet para
  // que importar y exportar sigan funcionando en planta sin señal
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
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
  const externoCacheable = APP.includes(req.url);
  if (url.origin !== location.origin && !externoCacheable) return;   // no interceptar otros terceros

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
