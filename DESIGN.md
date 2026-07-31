# DESIGN.md — Adolphus

Sistema visual de `index.html`. Documenta lo que el código ya hace, no una propuesta.
Derivado por lectura directa del bloque `:root` y las reglas de componente.

## Registro

**Producto.** Es una herramienta de gestión (activos, órdenes de trabajo, calibraciones),
no una superficie de marca. El diseño sirve al producto: la pantalla se lee de un vistazo
y el color transporta estado, no personalidad.

Tesis del sistema, declarada en el propio código:

> `TOKENS — color es información, nunca decoración.`
> `El único color saturado de la interfaz es el estado del activo.`

Esa frase es la regla que gobierna todo lo demás. Cualquier cambio que introduzca un
color saturado que no signifique estado la rompe.

## Color

OKLCH en toda la paleta. Estrategia: **restrained** — neutrales tintados más acento
funcional, sin superficie saturada.

Los neutrales llevan croma 0.003–0.013 hacia hue 250–258 (azul), no hacia el cálido.
Es un tinte deliberado hacia el hue de marca, no un beige por defecto.

### Neutrales (claro)

| Token | Valor | Rol |
| --- | --- | --- |
| `--bg` | `oklch(0.972 0.003 250)` | Fondo de aplicación |
| `--surface` | `oklch(1 0 0)` | Superficie base |
| `--surface-2` / `--surface-3` | `0.978` / `0.955` | Elevación por tono |
| `--ink` | `oklch(0.235 0.012 255)` | Texto principal |
| `--ink-2` / `--ink-3` | `0.455` / `0.530` | Secundario / terciario |
| `--line` / `--line-2` | `0.905` / `0.945` | Bordes, divisores |

### Estado — el único color saturado

Cada estado es un par: color de tinta y fondo de pastilla.

| Estado | Tinta | Fondo | Significado |
| --- | --- | --- | --- |
| `--sel` | `oklch(0.505 0.160 258)` | `--sel-bg` | Selección, foco, acento |
| `--ok` | `oklch(0.520 0.118 158)` | `--ok-bg` | Al día |
| `--due` | `oklch(0.530 0.128 72)` | `--due-bg` | Por vencer |
| `--late` | `oklch(0.545 0.185 24)` | `--late-bg` | Vencido |

Los cuatro se mantienen en L 0.505–0.545 en claro: misma luminosidad percibida, así que
ninguno grita más fuerte que otro. La jerarquía la da el hue, no el peso.

### Tema oscuro

`[data-theme="dark"]` reasigna la paleta completa, no la invierte. Las tintas de estado
suben a L 0.70–0.80 y los fondos bajan a L ~0.30, preservando el contraste en ambos
sentidos. Las sombras se redefinen a negro puro con alfa mayor.

## Tipografía

- **Sans:** IBM Plex Sans (400/500/600/700) — cuerpo e interfaz
- **Mono:** IBM Plex Mono (400/500/600) — clase `.mono`, para códigos e identificadores

Un solo superfamiliar en dos anchos. Es un emparejamiento por eje de contraste
(sans + mono), no dos sans parecidas.

`font-variant-numeric: tabular-nums` global en `body` y en todos los controles de
formulario: las cifras alinean en columna en tablas y listados.

### Escala — seis pasos

| Token | Tamaño | Uso |
| --- | --- | --- |
| `--t-1` | 11px | Etiquetas, pastillas |
| `--t-2` | 12.5px | Secundario |
| `--t-3` | 13.5px | Cuerpo y tablas |
| `--t-4` | 17px | Subtítulo |
| `--t-5` | 24px | Título de página |
| `--t-6` | 32px | Cifra destacada |

El código documenta por qué son seis:

> `Antes convivían trece tamaños entre 10 y 19 px y nada destacaba.`

Seis pasos con salto real entre ellos. Añadir un séptimo tamaño intermedio deshace
justamente lo que esta escala arregló.

## Espaciado y forma

- **Espaciado:** `--sp-1` a `--sp-7` → 4 / 8 / 12 / 16 / 24 / 32 / 48px
- **Radios:** `--r-1` 5px, `--r-2` 8px, `--r-3` 12px, `--r-pill` 99px

Los radios topan en 12px para contenedores; la píldora queda para pastillas y tags.
Ningún radio de tarjeta pasa de 16px.

## Elevación

Tres niveles, no uno. Las sombras se construyen sobre `--ink` con alfa, no sobre negro,
así que se integran con el tinte azul de los neutrales.

| Token | Uso |
| --- | --- |
| `--e-1` | Reposo, separación mínima |
| `--e-2` | Tarjeta elevada |
| `--e-3` | Panel flotante |
| `--shadow-pop` | Popovers |
| `--shadow-over` | Overlays y drawers |

## Movimiento

| Token | Curva / valor | Uso |
| --- | --- | --- |
| `--ease` | `cubic-bezier(.22,.61,.36,1)` | Transiciones cortas |
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | Entradas, salida exponencial |
| `--fast` / `--med` / `--slow` | 130 / 220 / 340ms | Escala de duración |

Salidas exponenciales, sin bounce ni elastic.

`prefers-reduced-motion: reduce` colapsa toda animación y transición a 0.01ms de forma
global. No es opcional y ya está cubierto.

## Capas

Escala semántica, sin valores arbitrarios:

```
--z-sticky:20 → --z-rail:30 → --z-scrim:40 → --z-drawer:50 → --z-modal:60 → --z-toast:70
```

## Densidad

`[data-density]` conmuta entre `cozy` (por defecto) y `compact`, ajustando `--row-h`
(38px → 30px) y `--font-d` (13.5px → 12.5px). Es una preferencia de operador para
listados largos, no un breakpoint.

## Foco

```css
:focus-visible{ outline:2px solid var(--sel); outline-offset:2px }
```

Con una nota deliberada en el código: *"el anillo sigue la forma del elemento en lugar
de imponer la suya"* — el radio se hereda salvo en controles que ya lo definen.

## Shell

Grid de dos columnas a altura completa. Rail lateral de 222px que colapsa a 56px
(`.app.rail-min`), ocultando etiquetas y dejando solo iconografía. El contenido son
12 secciones `.page` con una sola activa (`.on`).

Superficies: inicio, clientes, activos, calendario, órdenes de trabajo, solicitudes,
repuestos, catálogo, importación, usuarios, reportes, ajustes.

## Estado del sistema frente a las reglas

Verificado por lectura del archivo. Lo que ya cumple:

- OKLCH en toda la paleta
- Escala z-index semántica
- Curvas ease-out exponenciales, sin bounce
- `prefers-reduced-motion` global
- `tabular-nums` en cuerpo y controles
- Radios por debajo del techo de 16px en tarjetas
- Sin texto con gradiente (`background-clip:text`: 0 ocurrencias)
- Emparejamiento tipográfico por eje de contraste

Desviaciones detectadas, sin corregir (fuera del alcance de `init`):

- Un `border-left` ≥3px como acento — la regla lo prohíbe como franja lateral
- Un `z-index:100` literal, pese a existir la escala semántica
- Dos usos de `backdrop-filter` — permitidos solo si son puntuales y con propósito
- Fuentes y `xlsx` cargados desde CDN externo (`fonts.googleapis.com`,
  `cdnjs.cloudflare.com`); bloquean render y atan la app a red de terceros
- Un PNG en base64 de ~1.85 MB embebido en línea, el 78% del peso del archivo

Ninguna se tocó en esta pasada. `/impeccable audit` o `/impeccable polish` son los
comandos que corresponden.
