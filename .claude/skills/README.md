# UI Skills

Skills de [ui-skills](https://www.ui-skills.com) (autor: ibelick, MIT), instaladas
localmente desde el paquete npm `ui-skills@0.2.4`.

## Por qué están copiadas aquí y no se usan vía CLI

El CLI (`npx ui-skills start | categories | list | get`) descarga su registro desde
`https://www.ui-skills.com/skills/registry.json`. En entornos con política de egreso
restringida ese host puede estar bloqueado (403 en el CONNECT), y entonces los cuatro
comandos fallan igual. Las skills viajan dentro del propio tarball de npm, así que
copiarlas aquí las deja usables sin depender de ese host.

## Skills

| Skill | Uso |
| --- | --- |
| `baseline-ui` | Pasada rápida de limpieza: espaciado, jerarquía, tipografía, layout |
| `improve-ui` | Auditoría read-only de una superficie + planes en `design-plans/` |
| `fixing-accessibility` | ARIA, foco, teclado, contraste, errores de formulario |
| `fixing-metadata` | Títulos, meta description, canonical, Open Graph, JSON-LD, robots |
| `fixing-motion-performance` | Layout thrashing, compositor, scroll-linked, blur |
| `ui-skills-root` | Capa de routing (equivale a `ui-skills start`) |

`ui-skills-root` indica consultar el CLI para elegir skill. Con el host bloqueado esa
parte no funciona: elegí a mano de la tabla de arriba.

## Actualizar

```bash
npm pack ui-skills
tar xzf ui-skills-*.tgz
cp -R package/skills/. .claude/skills/
```

Se omitió `improve-ui/agents/openai.yaml` del upstream: es un manifiesto específico de
Codex/ChatGPT y no aplica a Claude Code.

## No confundir con `frontend-design`

`.claude/skills/frontend-design` es un symlink a `../../.agents/skills/frontend-design`,
no forma parte de UI Skills. Viene de `anthropics/skills` (Apache 2.0) vía
`npx skills add`, que instala en `.agents/skills/` (layout multi-agente) y symlinkea
hacia cada agente. Su versión queda fijada en `skills-lock.json` de la raíz; se
actualiza con ese CLI, no con el `cp` de arriba.
