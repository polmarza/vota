# Catálogo cerrado: 63 votaciones revisadas por el jurado

**Fecha:** 2026-11-11 17:30
**Tipo:** Feature
**Requisitos:** M-05, M-10, M-11, M-01 (ficha `docs/features/catalogo.md`)

## Qué se hizo
- El catálogo pasó de 41 a unas 86 fichas y, tras cinco rondas del jurado de cinco IAs, queda en
  **63 votaciones** con todos sus elementos aprobados: resúmenes corregidos contra el texto oficial,
  extractos literales verificados del BOE o del Boletín de las Cortes, efectos sin consenso quitados
  y fichas apartadas cuando se quedaban sin efectos o sin un resumen fiel.
- **Reequilibrio** tras el veredicto "desequilibrado" del conjunto: regla nueva "un mismo efecto
  cuenta una sola vez" (cuenta en la norma que puso en marcha la medida, no en un decreto que el
  Congreso tumbó), LOMLOE y proposiciones de grupos parlamentarios nuevas.
- **Cuestionario:** pregunta de discapacidad; el contrato solo se pregunta a quien trabaja por
  cuenta ajena; preguntas nuevas sobre quien contrata, patrimonio y herencias, con sus fichas.
- **Transparencia:** "Cómo funciona" publica el veredicto del conjunto tal cual (sigue siendo
  "desequilibrado", por razones estructurales que se explican) y la regla de un efecto por medida.
- Coste total del jurado del catálogo: unos 26,70 $ (OpenRouter).

## Qué se modificó
- `data/catalogo/`, `data/preguntas.yaml`, `data/jurado/catalogo.json`, `data/perfiles-ejemplo.yaml`
- `scripts/data/catalogo.ts` (preguntas condicionales), `scripts/data/elementos-catalogo.ts`
  (extracto en el prompt), `src/lib/perfil/cuestionario.ts`, `src/pages/test.astro`,
  `src/pages/como-funciona.astro`
- `docs/catalogo.md`, `docs/data-model.md`, `docs/prd.md` (M-05, S-02, LOREG)

## Por qué
41 votaciones eran pocas para ocho años de legislatura, y el jurado detectó errores de hecho, medidas
contadas dos veces y huecos en lo que el test podía saber de cada persona. El veredicto del conjunto
se publica aunque no sea favorable: la neutralidad del proyecto depende de no esconderlo.
