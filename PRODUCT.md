# PRODUCT.md — Adolphus

Contexto de producto para trabajo de diseño. Capturado en conversación y contrastado
con `index.html`.

## Qué es

SaaS de gestión de válvulas industriales y sus repuestos: qué activos hay instalados,
dónde, en qué estado de calibración, qué órdenes de trabajo los tocan y qué repuestos
requieren.

Se está construyendo contra los requerimientos de un cliente concreto, pero con vara
de producto vendible: la entrega tiene que verse profesional, no como una herramienta
interna que quedó bien.

**Las tres modalidades conviven y ninguna se descarta:**

1. **Herramienta interna** — un operador gestiona su propio parque de válvulas
2. **Servicio a clientes** — una empresa de mantenimiento gestiona el parque de varios
3. **Producto licenciable** — se vende a otras empresas

Que las tres estén vivas a la vez es la restricción de diseño central de este proyecto.
No hay un único usuario al que optimizar.

## El trabajo que hace

Una válvula industrial se calibra en ciclos. Si se pasa la fecha, el activo queda fuera
de norma. El trabajo real de la aplicación es **que nadie descubra tarde que una válvula
venció.**

Todo lo demás — catálogo, despieces, órdenes, solicitudes de repuestos — existe para
sostener ese ciclo. El encabezado de la página de calendario lo dice sin rodeos:
`Horizonte de calibración`.

De ahí sale la tesis de color declarada en el código:

> `color es información, nunca decoración`
> `El único color saturado de la interfaz es el estado del activo`

Los cuatro estados (`--sel`, `--ok`, `--due`, `--late`) son el producto. Cualquier otro
color saturado en pantalla compite con la única señal que importa.

## Audiencias

Las tres modalidades implican tres perfiles con necesidades opuestas. El código ya
distingue roles `admin` y `cliente`, y tiene una pantalla de importación de
levantamiento de campo, así que las tres están presentes:

| Perfil | Contexto | Presión sobre el diseño |
| --- | --- | --- |
| Técnico en campo | Junto al equipo, móvil o tablet, luz variable | Densidad compacta, targets grandes, tema oscuro real |
| Planificador | Escritorio, sesiones largas, tablas densas | Densidad cozy, atajos, vistas de mucho listado |
| Cliente externo | Consulta esporádica, sin entrenamiento | Menos densidad, señalización explícita, estados vacíos que enseñan |

El sistema ya responde a esta tensión con `[data-density]` (`cozy` / `compact`) y
`[data-theme]` (claro / oscuro). Son perillas de perfil, no preferencias cosméticas:
esa es la razón por la que existen y por la que conviene mantenerlas.

## Registro

**Producto**, no marca. El diseño sirve al trabajo: la pantalla se lee de un vistazo,
la tipografía es funcional (IBM Plex Sans + Mono, `tabular-nums`), y la personalidad
sale de la precisión, no de la expresión.

Esto no está reñido con "verse profesional". Para una herramienta industrial, verse
profesional *es* verse precisa: alineación, cifras que forman columna, estados legibles
sin leyenda, densidad que respeta al operador. No es agregar carácter visual.

## Superficies

12 secciones, una activa por vez sobre un rail lateral colapsable:

inicio · clientes · activos · calendario · órdenes de trabajo · solicitudes de repuestos ·
repuestos · catálogo y despieces · importación · usuarios y accesos · reportes · ajustes

La aplicación es un único `index.html` autocontenido con PWA (`manifest.webmanifest`,
apple-touch-icon, theme-color).

## Restricciones asumidas

- **Un solo archivo.** Todo vive en `index.html`. Cualquier propuesta que exija un paso
  de build cambia el modelo de despliegue: hay que plantearlo explícitamente.
- **Dependencias externas.** Fuentes desde `fonts.googleapis.com` y `xlsx` desde
  `cdnjs.cloudflare.com`. Bloquean render y atan la app a red de terceros — relevante
  para un técnico en planta con conectividad pobre.
- **Español.** Toda la interfaz. Si la modalidad 3 avanza, la i18n es trabajo pendiente
  y no está contemplada.
- **Identidad ya comprometida.** Hay tokens de marca en producción. Preservarlos gana
  sobre proponer paleta nueva.

## Estado

Ver [DESIGN.md](DESIGN.md) para el sistema visual implementado y las desviaciones
detectadas sin corregir.
