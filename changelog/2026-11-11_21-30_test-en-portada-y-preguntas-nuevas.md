# El test empieza en la portada y cinco preguntas nuevas

**Fecha:** 2026-11-11 21:30
**Tipo:** Feature
**Requisitos:** M-01, M-05 (fichas `docs/features/rediseno-ventana.md` y `docs/features/catalogo.md`)

## Qué se hizo
- **El test empieza en la portada:** la ventana del héroe es la pregunta de la provincia de verdad. Al
  pulsar «Siguiente», el test sigue en la misma página en la pregunta 2 y la dirección pasa a `/test`
  sin recargar ni guardar nada; «Atrás» y el botón de volver del navegador regresan a la portada.
  El cuestionario es ahora un componente (`Cuestionario.astro`, `src/scripts/cuestionario.ts`) y el
  selector de provincia, un módulo reutilizable.
- **Cinco preguntas nuevas** en el bloque ampliado, salidas de un análisis de qué votaciones con efecto
  directo no se podían asignar a nadie: sector en que trabajas (solo a quien trabaja), número de hijos y
  si los crías sin pareja (solo a quien tiene hijos), perro o gato y sexo.
- **Catálogo: 74 votaciones** aprobadas por el jurado. Entran o vuelven, entre otras, la ley de
  bienestar animal, la de animales como seres sintientes, la ley de familias de Cs, la de conciliación
  del PP, el estatuto de los artistas, los camioneros, las agresiones a sanitarios, los funcionarios de
  prisiones y los sueldos de policías y guardias civiles. Once de las diecisiete votaciones nuevas o
  recuperadas son de grupos parlamentarios, no del Gobierno.

## Qué se modificó
- `src/components/Cuestionario.astro`, `src/scripts/cuestionario.ts`, `src/scripts/selector-provincia.ts`,
  `src/components/SelectorProvincia.astro`, `src/pages/index.astro`, `src/pages/test.astro`
- `data/preguntas.yaml`, `data/catalogo/`, `data/jurado/catalogo.json`
- `src/lib/explorador.ts`, `src/lib/compartir/tarjeta.ts` (tema «Animales»)
- Tests: `tests/e2e/cuestionario.spec.ts`, `privacidad.spec.ts`, `accesibilidad.spec.ts`

## Por qué
Pol pidió que el selector de la portada fuera la primera pregunta y que el test tuviera más preguntas.
El test en la misma página evita guardar la provincia entre páginas (M-08). Las preguntas nuevas
permiten contar votaciones que el jurado había apartado porque el test no sabía a quién afectaban.
Coste del jurado en esta tanda: unos 3,80 $.
- Pregunta frecuente nueva: por qué no hay preguntas sobre el clima, la amnistía o el modelo territorial (a raíz de la pregunta de un usuario).
- Pregunta nueva de catástrofes (DANA de 2024, volcán de La Palma, otro temporal o incendio) con seis
  votaciones de ayudas a quien sufrió daños, aprobadas por el jurado; el catálogo queda en 80
  votaciones. La pregunta frecuente sobre el clima aclara que las grandes leyes no se asignan a nadie
  pero las ayudas concretas sí cuentan (a raíz de una observación de Pol, 11-11-2026).
