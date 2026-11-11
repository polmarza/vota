# Web: portada, cuestionario y resultado

**Estado:** En construcción
**Requisitos que cierra:** M-01, M-02, M-03, M-04, M-07, M-08, M-09, M-12
**Fecha de acuerdo:** 2026-10-27

## Qué se construye

La web que ve el visitante en `vota.concriterio.blog`, en Astro estático y siguiendo
`docs/design-system.md` (dirección editorial en blanco y negro, tercera versión de la maqueta).

Empieza por la **portada**: cabecera con el logo y "vota con *criterio*", titular en Instrument
Serif, botón "Empezar el test", enlace a "Cómo funciona" y el ecualizador animado con un color por
partido. Sigue con el **cuestionario** en dos bloques (provincia con autocompletado y opciones que
avanzan solas), el **resultado provisional**, el bloque ampliado y el **resultado final**: los dos
podios con color, logo y nombre de cada partido y, debajo, las votaciones que lo explican. Cierra
con la página **"Cómo funciona"** y la comprobación de que ninguna respuesta sale del navegador.

El cálculo vive en `src/lib/afinidad/` como código puro, según `docs/data-model.md`.

## Decisiones tomadas

- **Orden de construcción:** portada primero, porque es lo único que no depende del catálogo.
  Las filas siguen el recorrido del visitante.
- **Astro 7 estático, sin framework de UI**, CSS propio con los tokens del design system y
  fuentes autoalojadas con `@fontsource` (`docs/architecture.md`).
- **Selector de provincia con autocompletado**, sin panel; controles a 16 px como mínimo.
- **Texto de la portada provisional:** se construye con el de la maqueta y se cambia después como
  ajuste de copy, sin tocar la ficha.
- **Ecualizador:** una barra por partido de `data/partidos/partidos.yaml` que tenga color. Los
  colores se añaden ahora a ese archivo (aproximación a los oficiales) y se verifican antes del
  lanzamiento.
- **Datos en `pnpm dev`:** la web lee `data/`. Mientras no haya catálogo, usa el de
  `tests/fixtures/` y muestra un aviso visible de "datos de ejemplo"; el build de producción falla si
  no hay catálogo real.
- **Preguntas:** esta feature redacta un primer `data/preguntas.yaml` con el bloque básico; la
  feature del catálogo lo ajusta (quita las que no use ninguna votación y añade el bloque ampliado).
- **Logos:** hasta tener los SVG oficiales, cada partido se identifica con un círculo de su color con
  sus siglas, además del nombre. Conseguir los logos y comprobar su uso queda fuera de esta feature.
- **Enlace al catálogo** desde "Cómo funciona": apunta a `data/catalogo/` en GitHub hasta que exista
  el explorador (S-01).
- **"Cómo funciona"** incluye una sección de preguntas frecuentes.
- **Escritorio y accesibilidad:** los e2e se ejecutan en móvil (375 px) y escritorio (1280 px), y
  `tests/e2e/accesibilidad.spec.ts` pasa axe por portada, pregunta, resultado y "Cómo funciona" y
  completa el test solo con teclado.
- **Sin mínimo por partido** (11-11-2026): todos compiten igual en los podios; la fila muestra
  cuántas votaciones cuentan ("7 de 7").
- **Empates** (28-10-2026): si los diputados de un partido votan divididos a partes iguales, esa
  votación no cuenta para él, y en la lista de votaciones del resultado se indica "votó dividido"
  (ver `docs/data-model.md` → Cálculo de afinidad).

## Cobertura

| Requisito | Se implementa en | Se valida con |
|-----------|------------------|---------------|
| M-01 | `src/pages/index.astro`, `src/components/Cabecera.astro`, `src/components/Ecualizador.astro`, `src/styles/`: portada | revisión humana: la portada en `pnpm dev` a 375 px y a 1280 px; cabecera, titular, botón negro siempre visible, enlace a "Cómo funciona" y ecualizador con un color por partido sin repetir, como en `docs/design-system.md` |
| M-01 | `src/pages/test.astro`, `src/components/Pregunta.astro`, `src/components/SelectorProvincia.astro`, `src/lib/perfil/`: cuestionario | `tests/e2e/cuestionario.spec.ts` |
| M-12 | `src/lib/afinidad/`, resultado provisional en `src/pages/test.astro` | `tests/unit/afinidad.test.ts`, `tests/e2e/cuestionario.spec.ts` |
| M-02 | `src/lib/afinidad/`: filtro por candidaturas de la provincia | `tests/unit/afinidad.test.ts`, `tests/e2e/cuestionario.spec.ts` |
| M-03 | `src/lib/afinidad/`, `src/components/Podio.astro`, `src/components/FilaPartido.astro` | `tests/unit/afinidad.test.ts`, `tests/e2e/cuestionario.spec.ts` |
| M-04 | `src/components/ListaVotaciones.astro` | `tests/e2e/cuestionario.spec.ts` |
| M-09 | `src/components/AvisoAlcance.astro` en ambos resultados | `tests/e2e/cuestionario.spec.ts` |
| M-07 | `src/pages/como-funciona.astro` | revisión humana: "Cómo funciona" en `pnpm dev`; explica selección y etiquetado de votaciones, cálculo del porcentaje, jurado de IAs, partidos nuevos o sin historial, limitaciones y firma, y enlaza al catálogo |
| M-08 | Todo el cuestionario y el resultado en el cliente, sin red | `tests/e2e/privacidad.spec.ts` |
| M-01 | Accesibilidad de portada, cuestionario, resultado y "Cómo funciona" | `tests/e2e/accesibilidad.spec.ts` |

## Fuera de esta feature

- Imagen para compartir (S-02), explorador del catálogo (S-01) y pesos por tema (S-03).
- El contenido del catálogo, las preguntas definitivas y las candidaturas reales.
- Los logos oficiales de los partidos.
- Vercel Web Analytics y el despliegue: los configura Pol cuando la web esté lista.
- Lenguas cooficiales (C-02) y comparar partidos (C-01).
