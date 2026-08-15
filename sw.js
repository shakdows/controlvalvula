/* Service Worker · Adolphus
   ------------------------------------------------------------
   Guarda la aplicación en el equipo para que abra sin señal en planta.

   La regla es una: PRIMERO LA CACHÉ, la red después y por detrás.
   Antes era al revés —se pedía a la red y sólo si fallaba se miraba la
   caché— y ahí estaba el fallo que dejaba el portal colgado en la
   pantalla de arranque: en planta el celular no está «desconectado»,
   está CON antena y SIN datos, así que la petición no falla, se queda
   esperando medio minuto o más. Un técnico con la válvula en la mano
   no espera medio minuto: cierra la aplicación.

   Ahora la aplicación abre de la caché al instante, y si hay internet
   se actualiza sola por detrás para la próxima vez.
   ============================================================ */
const CACHE = 'adolphus-v3';

/* Ninguna petición a la red puede tardar más que esto. Sin este tope,
   una antena que no lleva a ninguna parte cuelga la promesa para
   siempre y la caché nunca llega a responder. */
const TOPE_MS = 3500;

const conTope = (req, ms = TOPE_MS) => new Promise((ok, mal) => {
  const t = setTimeout(() => mal(new Error('sin respuesta a tiempo')), ms);
  fetch(req).then(r => { clearTimeout(t); ok(r); },
                  e => { clearTimeout(t); mal(e); });
});

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
  // la hoja de fuentes y la librería de Excel: se guardan en la primera
  // carga con internet para que la letra y el importar/exportar sigan
  // funcionando en planta sin señal
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

/* Terceros que sí interceptamos: si no lo hiciéramos, sin señal el
   navegador se pondría a esperarlos él por su cuenta y volveríamos al
   mismo cuelgue. Interceptados, se resuelven de la caché o se rinden
   en seguida — y la aplicación tira igual, con la letra del sistema. */
const TERCEROS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

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

/* Refresca por detrás sin que nadie espere por ello. */
function refrescarDetras(req) {
  conTope(req).then(r => {
    if (r && r.status === 200 && r.type !== 'opaque')
      caches.open(CACHE).then(c => c.put(req, r.clone()));
  }).catch(() => {});
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const propio = url.origin === location.origin;
  if (!propio && !TERCEROS.includes(url.hostname)) return;   // el resto, que lo vea el navegador

  /* ABRIR LA APLICACIÓN. Lo primero es que abra; lo segundo, que esté
     al día. Nunca al revés. */
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(hit => {
        if (hit) {                       // abre ya, y se actualiza por detrás
          e.waitUntil(conTope(req).then(r => {
            if (r && r.ok) return caches.open(CACHE).then(c => c.put('./index.html', r.clone()));
          }).catch(() => {}));
          return hit;
        }
        // primera visita: no hay nada guardado, hay que ir a la red
        return conTope(req, 12000).then(r => {
          caches.open(CACHE).then(c => c.put('./index.html', r.clone()));
          return r;
        }).catch(() => caches.match('./') || new Response(
          '<!doctype html><meta charset="utf-8"><title>Adolphus</title>' +
          '<body style="font:16px/1.5 system-ui;padding:40px;color:#1b2a4a">' +
          '<h1>Adolphus</h1><p>Esta es la primera vez que abres el portal en este equipo y no hay señal.' +
          ' Ábrelo una vez con internet y a partir de ahí funciona sin él.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
      })
    );
    return;
  }

  /* TODO LO DEMÁS. De la caché si está, y se refresca por detrás. */
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) { refrescarDetras(req); return hit; }
      return conTope(req).then(r => {
        if (r && r.status === 200 && r.type !== 'opaque')
          caches.open(CACHE).then(c => c.put(req, r.clone()));
        return r;
      }).catch(() => {
        /* Sin señal y sin copia. Para la hoja de fuentes se devuelve un
           CSS vacío: la página se pinta con la letra del sistema, que es
           infinitamente mejor que no pintarse. */
        if (url.hostname === 'fonts.googleapis.com')
          return new Response('/* sin señal */', { headers: { 'Content-Type': 'text/css' } });
        return new Response('', { status: 504, statusText: 'sin señal' });
      });
    })
  );
});

// Permite activar una versión nueva sin esperar a cerrar todas las pestañas.
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
