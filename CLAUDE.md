# Adolphus · portal de válvulas

Aplicación de un solo archivo: `index.html` (todo dentro, un único
`<script>`) y `sw.js` (el guardián que la deja abrir sin señal en
planta). Se publica en `controlvalvula.vercel.app` desde la rama
`main` de GitHub.

## Cómo se trabaja aquí

- **Yo subo los archivos a GitHub.** El usuario no los sube a mano: al
  hacerlo genera commits que sólo cambian el fin de línea y chocan con
  los míos. Vercel despliega solo desde `main`.
- **Cada cambio sube el número de `CACHE` en `sw.js`** (`adolphus-vNN`).
  Sin eso los equipos siguen abriendo la versión vieja de su caché.
- **Antes de subir**: comprobar la sintaxis del `<script>` y pasar
  `humo.cjs` (recorre las 16 páginas con los cuatro perfiles).
- **Nada se borra sin que él lo pida.** Vaciar datos, la nube o una
  empresa es siempre decisión suya.

## Cómo quiere las cosas

**Los papeles que se entregan** (informe DVAD-SER-002, certificado,
protocolo AXAD-084, prueba de salida):

- Letra grande: se imprimen y se leen en papel, no en pantalla. El
  cuerpo del informe va a 14 px (≈10,5 pt), como su Word.
- Sin renglones en blanco ni rayas para rellenar a mano: sale lo que se
  escribió en el portal y nada más. Un apartado sin contenido no se
  imprime.
- **Fechas y personas: nombre · fecha · hora**, sin verbos delante
  («La dispara…», «Probó…») y sin la «h» detrás de la hora.
- El logotipo lleva las letras: triángulo rojo, «adolphus» y su lema en
  azul `#102d69`.
- La orden de compra del cliente **sólo** aparece en su casilla del
  cuadro de firmas de la carátula. En ningún otro sitio del papel.

**Los números.** Son dos y no se mezclan:

- `mat`/`n`/`num` → el correlativo de la casa, **siempre con `PSV-`
  delante**. Lo pone el sistema, nadie lo teclea. Cada válvula de la
  orden es una línea: `PSV-393-001`, `PSV-393-002`.
- `oc` → la orden de compra del cliente. Es dato suyo.

Meter la orden de compra en `mat` envenena el correlativo: se calcula
del mayor que exista, y un `450006785` hace que la casa numere desde
cuatrocientos cincuenta millones. Hay tope (`TOPE_OS`) y una migración
(`migrarNumeros`) que repara las órdenes que se guardaron así.

**El personal.** Los nombres se eligen de una lista, nunca se escriben
libres: el mismo hombre acababa como «Jose Rojas», «J. Rojas» y «jose
rojas» en tres papeles del mismo trabajo. Están en `TECNICOS`.
La cadena de aprobación del informe está en `INFORME_FIRMAS` y es fija.

**El equipo patrón** lo pone gerencia una sola vez, en Ajustes ·
Organización. No es tarea del que ensaya.

## Cosas que se rompieron una vez y no deben repetirse

- **Lo que viaja a la nube tiene que guardarse también en el equipo.**
  `NUBE_MAESTROS` y `fotoDatos()` deben decir lo mismo: si algo se sube
  pero no se guarda, al recargar vuelve de fábrica y se sube ENCIMA de
  lo bueno.
- **El marcador de sincronización no se adelanta con el eco de una
  subida.** Eso dejaba a cada equipo ciego a lo que hacían los demás.
- **El espejo (`ESPEJO`) no se vacía para «reparar» nada**: hacerlo
  resucita lo que otro equipo dio de baja.
- **Primero se baja y después se sube.** Al revés, un equipo que estuvo
  desconectado escribe encima sus copias viejas.
- **Dentro de una plantilla (comillas invertidas), `\s` se queda en una
  `s`.** Hay que doblar la barra.
- **En el HTML de la página, `${...}` es texto literal**: el `<script>`
  empieza mucho más abajo.
