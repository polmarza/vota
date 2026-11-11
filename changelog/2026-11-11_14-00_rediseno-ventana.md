# Rediseño visual "Ventana"

**Fecha:** 2026-11-11 14:00
**Tipo:** Feature
**Requisitos:** capa visual de M-01, M-03, M-04, M-09 y M-12 (ficha `docs/features/rediseno-ventana.md`)

## Qué se hizo
- La web pasa de la dirección editorial en blanco y negro a la propuesta "Ventana" de
  `propuestas-diseno/taste/1-ventana/`, con tinta negra en lugar de azul pizarra y el icono de
  puntos de la propuesta "Recuento" como logo de Vota con Criterio.
- Portada larga: héroe con la primera pregunta en una ventana sobre el marco arena, una pregunta de
  ejemplo, un resultado y una votación de ejemplo, cierre y pie. El resultado de ejemplo es el real
  de uno de los nueve perfiles de referencia (`data/perfiles-ejemplo.yaml`), elegido al azar en cada
  visita y calculado en el build con los mismos datos que el test.
- Cuestionario, resultados, lista de votaciones y "Cómo funciona" con el nuevo sistema.
- Geist y Geist Mono autoalojadas; kit de Taste Skill en `src/kit/` (lo que se usa).
- Colores de partido con poco contraste sobre el fondo nuevo: filete de tinta, sin cambiar el color.
- Fuera el ecualizador de la portada.
- Ajustes tras la revisión de Pol: preguntas frecuentes también en la portada (componente
  `PreguntasFrecuentes.astro`, única fuente para las dos páginas); fuera el filete de tinta de los
  colores de partido (y `src/lib/color.ts` con su test); selector "Ver otro perfil" en el resultado
  de ejemplo; el momento *line-carries-colour* deja paso a un fundido al entrar en pantalla y barras
  que crecen desde 0 (también al cambiar de perfil, nada con movimiento reducido).

## Qué se modificó
- `src/styles/global.css`, `src/kit/`, `src/layouts/Base.astro`, `src/components/` (Cabecera, Pie,
  Pregunta, SelectorProvincia; Ecualizador borrado), `src/pages/`, `src/scripts/resultado.ts`,
  `src/lib/datos.ts`, `src/lib/color.ts`, `public/favicon.svg`
- `data/perfiles-ejemplo.yaml` (antes `tests/fixtures/perfiles.yaml`)
- `docs/design-system.md` reescrito; `docs/architecture.md`, `docs/testing.md`, `docs/catalogo.md`,
  fichas `web.md`, `catalogo.md` y `rediseno-ventana.md`
- Tests: `tests/e2e/cuestionario.spec.ts`, `tests/e2e/accesibilidad.spec.ts`,
  `tests/unit/color.test.ts`, `tests/unit/data/catalogo-real.test.ts`

## Por qué
Pol eligió esta dirección entre seis propuestas hechas con Impeccable y Taste Skill: más clara como
herramienta y neutral (ningún color de interfaz se asocia a un partido). Pendiente: revisión humana
de portada y "Cómo funciona", y Lighthouse antes del PR.
- Las preguntas del test ya no llevan la barra de navegador simulada (tres puntos y «Tus respuestas no salen de tu navegador»): tenía sentido como maqueta en la portada, no dentro del test (pedido por Pol, 11-11-2026). La portada la conserva.
- El pie queda siempre al fondo de la ventana en páginas cortas, como el test (pedido por Pol, 11-11-2026).
- Portada: secciones a la medida de su contenido (fuera la regla del kit de una sección por pantalla), marco arena ceñido a la ventana, sin los rótulos «Pantalla N» y con una explicación de por qué se pregunta por tu vida y no por tu opinión (pedido por Pol, 11-11-2026).
