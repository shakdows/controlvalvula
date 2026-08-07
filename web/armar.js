/* Arma el sitio corporativo a partir de la plantilla, inyectando los
   recursos de marca que ya viven en la aplicación (index.html): el
   logotipo y las fotos reales de producto. Así hay una sola fuente de
   verdad para la marca y el sitio no se desincroniza de la app.

   Uso:  node web/armar.js            → web/index.html (video enlazado)
         node web/armar.js --incrusta → web/index.html con el video incrustado
                                        (archivo único para enviar por correo)
*/
'use strict';
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const plantilla = fs.readFileSync(path.join(__dirname, 'plantilla.html'), 'utf8');

/* ── datos de contacto: se cambian aquí y quedan en todo el sitio ── */
const CONTACTO = {
  correo: 'ventas@adolphus.pe',
  whatsapp: '51900000000'          // ← reemplazar por el número real, sin + ni espacios
};

/* ── recursos tomados de la app ─────────────────────────────────── */
const logo = app.match(/const LOGO=`([\s\S]*?)`;/)[1];
const foto = clave => {
  const m = app.match(new RegExp(' ' + clave + ':"(data:image\\/jpeg;base64,[^"]+)"'));
  if (!m) throw new Error('falta la foto: ' + clave);
  return m[1];
};

const incrusta = process.argv.includes('--incrusta');
/* A dónde apunta "Acceso de clientes". Por defecto la app del repositorio;
   con --portal=<ruta> se puede apuntar a otro archivo (p. ej. para enviar
   el sitio y el portal juntos en una carpeta). */
const argPortal = process.argv.find(a => a.startsWith('--portal='));
const portal = argPortal ? argPortal.slice('--portal='.length) : '../index.html';
const video = incrusta
  ? 'data:video/mp4;base64,' + fs.readFileSync(path.join(raiz, 'video/presentacion.mp4')).toString('base64')
  : '../video/presentacion.mp4';

const salida = plantilla
  .split('__LOGO__').join(logo)
  .split('__VIDEO__').join(video)
  .split('__FOTO_CONTROL__').join(foto('control'))
  .split('__FOTO_SEGURIDAD__').join(foto('seguridad'))
  .split('__FOTO_MARIPOSA__').join(foto('mariposa'))
  .split('__FOTO_CUCHILLA__').join(foto('cuchilla'))
  .split('__FOTO_PINCH__').join(foto('pinch'))
  .split('__CORREO__').join(CONTACTO.correo)
  .split('__WA__').join(CONTACTO.whatsapp)
  .split('href="../index.html"').join('href="' + portal + '"');

const pendientes = salida.match(/__[A-Z_]+__/g);
if (pendientes) throw new Error('quedaron marcadores sin reemplazar: ' + [...new Set(pendientes)].join(', '));

const argSalida = process.argv.find(a => a.startsWith('--salida='));
const destino = argSalida ? argSalida.slice('--salida='.length) : path.join(__dirname, 'index.html');
fs.writeFileSync(destino, salida);
console.log('escrito', path.relative(raiz, destino), (fs.statSync(destino).size / 1048576).toFixed(2) + ' MB',
  incrusta ? '(video incrustado)' : '(video enlazado)');
