# Las pruebas del portal

Antes de subir un cambio se pasan estas pruebas. Abren el portal en un
navegador de verdad, hacen lo que haría una persona y miran lo que sale
en la pantalla y en el papel.

## Cómo se pasan

Hace falta un servidor que sirva la carpeta y el navegador de pruebas:

```
python3 -m http.server 8991 --directory .
node pruebas/humo.cjs
```

`humo.cjs` es la obligatoria: recorre las 17 páginas con los cuatro
perfiles (gerencia, técnico, comercial y cliente) y avisa de cualquier
error de JavaScript. Si ésa falla, no se sube nada.

Las demás miran una cosa cada una:

| Prueba | Qué vigila |
| --- | --- |
| `formato.cjs` | El informe, apartado por apartado, contra el DVAD-SER-002 de la casa |
| `comentarios.cjs` | Las tres casillas de conclusiones y cómo entra lo escrito en el papel |
| `conclufijas.cjs` | Que lo fijo del formato no se pueda borrar desde el portal |
| `membretes.cjs` | El membrete de los cuatro papeles y que ninguno feche su versión con el día |
| `recep.cjs` | El protocolo de recepción AXAD-SER-007 |
| `salida.cjs` | El paso a la prueba de salida |
| `piemant.cjs` | El pie de mantenimiento y su botón |
| `trescuadros.cjs` | Los tres cuadros visibles del mantenimiento |
| `marcas.cjs` · `sellos.cjs` | Arenado y pintura: las marcas de cada pieza y su fecha y hora |
| `nopisa.cjs` | Que una subida a la nube no pise las fotos recién tomadas |
| `encargado.cjs` | Que no se vuelva a preguntar quién hace el trabajo |
| `extras.cjs` · `etiqueta.cjs` · `tablero.cjs` | El tablero, las etiquetas y los pasos añadidos |
| `selcli.cjs` | Que los clientes salgan en la tablet y en el celular |
| `horas.cjs` · `pestanahoras.cjs` | Las horas hombre y su pestaña de gerencia |
| `importar.cjs` | Subir el listado de válvulas de un cliente desde un Excel o un CSV |
| `trasactualizar.cjs` · `buscarver.cjs` · `actualizar.cjs` | Actualizar el portal y volver a entrar |
| `orden2.cjs` | Una orden con varias válvulas |
| `pruebafinal.cjs` | La prueba de salida: que no se pierda el trabajo, sus dos cuadros y la tolerancia |
| `nosepierde.cjs` | Que una llamada o cerrar la aplicación no se lleve lo último escrito |
| `certificado.cjs` | El certificado AXAD-SER-003 y su botón en la tarjeta |
| `listado.cjs` | Subir el listado de válvulas de la casa: una línea, una válvula con su ensayo |
| `numeroorden.cjs` | El número de orden a mano, con su recomendación y sus topes, y el nombre del cliente |

Y dos que no juzgan nada, sólo enseñan cómo quedó:

- `verinforme.cjs` → deja el informe en `/tmp/informe.pdf`
- `vercuadro.cjs` → una foto del cuadro de conclusiones

## Al escribir una prueba nueva

- **Siembra tus propios datos.** No hay clientes ni válvulas de ejemplo:
  se retiraron. Una prueba que espera encontrarlos falla sin que nada
  esté roto.
- **Comprueba que falla antes de arreglar.** Una prueba que pasa igual
  con el fallo dentro no vigila nada.
