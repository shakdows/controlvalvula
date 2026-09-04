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
const CACHE = 'adolphus-v109';

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
/* La aplicación se guarda bajo la dirección por la que se entra —la
   raíz del sitio—, no bajo «index.html». En Vercel no son lo mismo:
   con cleanUrls, /index.html RE-DIRIGE a /. Guardarla por ese nombre
   dejaba en la caché una respuesta redirigida, y una redirección no se
   puede devolver como respuesta a una navegación: el navegador corta
   con ERR_FAILED. Eso era el «no se puede acceder a este sitio». */
const CASA = new URL('./', self.registration.scope).toString();
/* La nota que dice «hay una versión nueva ya bajada». Vive en la
   propia caché para que la aplicación la lea al arrancar. */
const AVISO = new URL('__version-nueva', self.registration.scope).toString();

const APP = [
  './',
  './manifest.webmanifest',
  // renombrados a -v2: el nombre nuevo no puede estar en ninguna caché
  // vieja, así el celular no puede volver a fabricar el icono antiguo
  './icons/icon-192-v2.png',
  './icons/icon-512-v2.png',
  './icons/icon-maskable-512-v2.png',
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

/* Guarda una copia LIMPIA: si la respuesta vino de una redirección se
   rehace desde su contenido, porque tal cual no sirve para navegar. */
async function guardarLimpio(c, clave, r) {
  if (!r || !r.ok) return;
  if (r.redirected) r = new Response(await r.blob(), {
    status: 200, headers: { 'Content-Type': r.headers.get('Content-Type') || 'text/html; charset=utf-8' }
  });
  await c.put(clave, r);
}

/* Lo de casa y lo de fuera. Sin lo de casa no se abre nada; lo de
   fuera son adornos que se pueden esperar. */
const ES_DE_FUERA = u => /^https?:\/\//.test(u);
const APP_CASA   = APP.filter(u => !ES_DE_FUERA(u));
const APP_FUERA  = APP.filter(ES_DE_FUERA);

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // la casa primero, y limpia: es lo único sin lo que no se abre nada
    await conTope(CASA, 20000).then(r => guardarLimpio(c, CASA, r)).catch(() => {});
    /* Y los archivos propios, con tope: en planta una petición puede
       quedarse colgada con antena y sin datos, y mientras cuelga el
       guardián no toma el mando — que es justo cuando hace falta.
       cache:'reload' — directo del servidor, sin pasar por la caché
       del navegador: que instalar una versión traiga los archivos de
       esa versión. */
    await Promise.all(APP_CASA.map(u =>
      conTope(new Request(u, { cache: 'reload' }), 8000)
        .then(r => r && r.ok ? c.put(u, r) : null).catch(() => null)));
    /* MANDO YA. Lo imprescindible está guardado; a partir de este
       momento, si se va la señal, la aplicación abre. */
    await self.skipWaiting();
    /* Y lo de fuera —la hoja de letras y la librería de Excel— se baja
       por detrás, sin que nadie espere por ello. Si no llega, la
       aplicación abre igual: con la letra del sistema y sin el
       importar/exportar hasta que vuelva a haber señal. */
    APP_FUERA.forEach(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null));
  })());
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
  if (req.url === AVISO) return;                 // nota interna: no se sirve
  const url = new URL(req.url);
  const propio = url.origin === location.origin;
  if (!propio && !TERCEROS.includes(url.hostname)) return;   // el resto, que lo vea el navegador

  /* ABRIR LA APLICACIÓN. Lo primero es que abra; lo segundo, que esté
     al día. Nunca al revés. */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      /* Se busca por la casa, y si no, por cualquier copia guardada:
         da igual si se entró por «/», por «/index.html» o con algo
         detrás del signo de interrogación. */
      const hit = await c.match(CASA, { ignoreSearch: true })
               || await c.match('./index.html', { ignoreSearch: true })
               || await c.match(req, { ignoreSearch: true });
      if (hit) {                         // abre ya, y se actualiza por detrás
        /* Y si lo que baja NO es lo mismo que se está enseñando, se
           avisa a la aplicación: en el celular no se cierra nunca, así
           que esperar a «la próxima vez» era esperar días. */
        /* La copia para comparar se saca AQUÍ, antes de devolver la
           respuesta: en cuanto se devuelve, el navegador empieza a
           leerle el cuerpo y ya no se puede clonar. */
        const copia = hit.clone();
        e.waitUntil((async () => {
          try {
            const r = await conTope(req);
            if (!r || !r.ok) return;
            const nuevo = await r.clone().text();
            const viejo = await copia.text().catch(() => '');
            await guardarLimpio(c, CASA, r);
            /* Se deja una nota en la caché en vez de fiarlo todo al
               aviso: mientras se navega, la página nueva todavía no
               es «cliente» del guardián y el mensaje se pierde. La
               nota es un puñado de bytes y la lee la aplicación en
               cuanto arranca. */
            if (viejo && nuevo && viejo !== nuevo) {
              await c.put(AVISO, new Response(String(Date.now()),
                { headers: { 'Content-Type': 'text/plain' } }));
              const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
              cs.forEach(cl => cl.postMessage({ tipo: 'version-nueva' }));
            } else if (viejo && nuevo) {
              await c.delete(AVISO);      // ya está al día: se quita la nota
            }
          } catch (_) {}
        })());
        return hit;
      }
      // primera visita: no hay nada guardado, hay que ir a la red
      try {
        const r = await conTope(req, 12000);
        e.waitUntil(guardarLimpio(c, CASA, r.clone()).catch(() => {}));
        return r;
      } catch (_) {
        return new Response(
          '<!doctype html><meta charset="utf-8"><title>Adolphus</title>' +
          '<body style="font:16px/1.5 system-ui;padding:40px;color:#1b2a4a">' +
          '<h1>Adolphus</h1><p>Esta es la primera vez que abres el portal en este equipo y no hay señal.' +
          ' Ábrelo una vez con internet y a partir de ahí funciona sin él.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
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
