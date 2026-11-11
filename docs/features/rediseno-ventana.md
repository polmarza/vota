# Rediseño visual: dirección "Ventana"

**Estado:** Verificada
**Requisitos que cierra:** M-01, M-03, M-04, M-07, M-08, M-09, M-12 (los rehace con el nuevo diseño;
mantiene los requisitos no funcionales: móvil primero, WCAG 2.1 AA y portada en menos de 2 s en 4G)
**Fecha de acuerdo:** 2026-11-11

Verificada el 11-11-2026: 71 tests de navegador pasan en los tres proyectos; Lighthouse (móvil, 4G
simulado, sobre el build) da 100 en rendimiento, accesibilidad, buenas prácticas y SEO, con LCP de
1,5 s; Pol revisó la portada, el test y "Cómo funciona" el 11-11-2026.

## Qué se construye

La web cambia de la dirección editorial en blanco y negro (Instrument Serif) a la propuesta
**Ventana** de `propuestas-diseno/taste/1-ventana/`: una interfaz sobria, de herramienta, en la que
cada pantalla del test se ve dentro de una "ventana" limpia; tipografía Geist con cifras en Geist
Mono y el color reservado a los partidos. Con dos cambios sobre la propuesta: los botones, el foco y
la tinta pasan del azul pizarra `#1f3038` a **negro**, y la marca usa el **icono de puntos de la
propuesta "Recuento"** (tres círculos y un cuadrado redondeado) en la cabecera y el favicon.

Cambian la portada, el cuestionario, los resultados provisional y final, la lista de votaciones y
"Cómo funciona". No cambian el contenido, el cálculo, los datos, el recorrido ni los textos ya
acordados (portada, podios, avisos).

## Decisiones tomadas

- **Ventana con negro en vez de `#1f3038`, e icono de Recuento** (Pol, 2026-11-11), tras ver las
  seis propuestas de `propuestas-diseno/`.
- **El diseño de referencia es una maqueta**: el voto por partido de su votación de ejemplo y sus
  cifras son ilustrativos; en la web todo sale de los datos, como hasta ahora.
- **Portada larga, como la maqueta** (Pol, 2026-11-11): cabecera con navegación, héroe, secciones
  de ejemplo (una pregunta, el resultado, una votación), cómo se calcula, cierre con botón y pie.
- **Los textos nuevos de la maqueta se aceptan de entrada** y se repasan con la web hecha.
- **Se quita el ecualizador** de la portada.
- **El sistema de diseño se reescribe**: fondo gris azulado `#f7f9fa`, marco arena `#d9ccb7` (no se
  asocia a ningún partido), sombras de las ventanas y dos columnas en escritorio.
- **Marca:** "Vota con Criterio", donde la marca es *Vota* y *con Criterio* la coletilla que la une
  a la web de Con Criterio. El logo deja de ser la "V" y pasa a ser el icono de puntos de Recuento.
- **Logo y marca, segundo cambio** (Pol, 2026-11-11): el logo pasa a ser el arco del hemiciclo de la
  propuesta "Fachada" (la silueta del Pleno) y la marca se escribe "vota con criterio", en minúsculas.
- **Se reaprovecha al máximo el kit de Taste Skill** para ser fiel a la maqueta; se puede optimizar
  lo que no cambie el aspecto (quitar componentes que no se usan, por ejemplo).
- **Fuentes:** Geist y Geist Mono, autoalojadas con `@fontsource` (existen los paquetes).
- **Movimiento:** se mantienen todas las animaciones de la maqueta; si alguna sobra, se quita
  después. Todas respetan `prefers-reduced-motion`.
- **Resultado de ejemplo de la portada:** en cada visita se elige al azar uno de los perfiles de
  referencia de `data/perfiles-ejemplo.yaml` y se enseña su resultado real, calculado en el build
  con los mismos datos y el mismo cálculo que el test, nombrando el perfil. Nada de partidos con
  porcentajes inventados: una captura sin contexto no puede atribuir a la web un dato falso.
- **Tests:** se reescriben los que dependan de la estructura o los textos antiguos.
- **Ajustes tras la revisión de Pol** (2026-11-11):
  - **Preguntas frecuentes también en la portada**, en una sección antes del cierre, con el mismo
    texto que "Cómo funciona": las dos páginas usan `src/components/PreguntasFrecuentes.astro`
    (patrón FAQ del kit, todas las respuestas abiertas).
  - **Fuera el filete de tinta** de los colores de partido con poco contraste (Vox, Más Madrid, ERC,
    Junts…): solo lo tenían algunos y parecía un error. Se borran `src/lib/color.ts` y
    `tests/unit/color.test.ts`. Cumple WCAG porque el punto y la barra no son la única forma de
    transmitir la información (nombre y porcentaje en texto al lado); la justificación está en
    `docs/design-system.md` → Contraste.
  - **Selector de perfil** en el resultado de ejemplo: un `<select>` nativo ("Ver otro perfil") con
    los nueve perfiles; al cargar sale uno al azar y el selector lo refleja; al cambiar se ven el
    resultado y la votación de ese perfil sin recargar (todo está ya en el HTML del build).
  - **Fuera el momento *line-carries-colour*** en la sección del resultado (y sus archivos de
    `src/kit/moments/`, que no usaba nada más). En su lugar, fundido al entrar en pantalla y barras
    que crecen desde 0, también al cambiar de perfil; nada con `prefers-reduced-motion`.
- **La ventana del héroe es la primera pregunta de verdad** (Pol, 2026-11-11): en vez de la maqueta
  "¿En qué provincia votas?" con "Madrid", el visitante escribe su provincia en la ventana (el mismo
  autocompletado que en `/test`), pulsa "Siguiente" y el test sigue en la segunda pregunta **sin
  cambiar de documento**, para no tener que guardar la provincia entre páginas (M-08). La dirección
  pasa a `/test` con `history.pushState`, sin respuestas; "Atrás" en la primera pregunta o el botón
  atrás del navegador vuelven a la portada con la provincia puesta; recargar en `/test` carga el
  test normal. El cuestionario pasa a `src/components/Cuestionario.astro` con su comportamiento en
  `src/scripts/cuestionario.ts`, y el del selector de provincia a
  `src/scripts/selector-provincia.ts`, montados en las dos páginas. Coste: la portada pasa de
  55,3 kB (8,8 kB gzip) a 296,7 kB (31,7 kB gzip) con 76 fichas, por el JSON de datos del cuestionario
  (`docs/architecture.md` → Decisiones técnicas, 2026-11-11).

## Cobertura

Los requisitos del PRD que esta feature vuelve a construir con el nuevo diseño; la columna central
dice qué parte del rediseño los toca.

| Requisito | Se implementa en | Se valida con |
|-----------|------------------|---------------|
| M-01 | Sistema visual (tokens con tinta negra, Geist y Geist Mono autoalojadas, logo del hemiciclo y marca «vota con criterio»): `src/styles/global.css`, `src/kit/`, `src/layouts/Base.astro`, `src/components/Cabecera.astro`, `src/components/Pie.astro`, `public/favicon.svg`, `docs/design-system.md` | revisión humana: portada y test en la vista previa a 375 px y 1280 px; fondo `#f7f9fa`, botones negros, Geist en titulares y texto, cifras en Geist Mono y el arco del hemiciclo junto a «vota con criterio» |
| M-01 | Portada larga (héroe con la primera pregunta en una ventana sobre el marco arena, resultado de ejemplo real con selector de perfil, preguntas frecuentes, cierre): `src/pages/index.astro`, `src/components/PreguntasFrecuentes.astro`, `data/perfiles-ejemplo.yaml` | `tests/e2e/cuestionario.spec.ts` |
| M-01 | La ventana del héroe es la primera pregunta: provincia con autocompletado y "Siguiente", que sigue el test en la segunda pregunta en el mismo documento (dirección `/test` sin respuestas; "Atrás" y el botón atrás del navegador vuelven a la portada): `src/pages/index.astro`, `src/components/Cuestionario.astro`, `src/components/SelectorProvincia.astro`, `src/scripts/cuestionario.ts`, `src/scripts/selector-provincia.ts` | `tests/e2e/cuestionario.spec.ts` |
| M-08 | La portada con el cuestionario abierto: ni peticiones, ni almacenamiento, ni respuestas en la URL | `tests/e2e/privacidad.spec.ts` |
| M-01 | Accesibilidad AA de la portada con la lista de sugerencias abierta y con el cuestionario abierto | `tests/e2e/accesibilidad.spec.ts` |
| M-01 | El paso de la portada al test a 375 px y 1280 px: la ventana cabe con su "Siguiente" (en fila desde 640 px), el cambio entra con un fundido corto y sin él con movimiento reducido | revisión humana: la portada en la vista previa a 375 px y 1280 px, elegir provincia, "Siguiente" y volver; la ventana se ve entera, la segunda pregunta aparece sin salto y el test se ve igual que en `/test` |
| M-01 | Cuestionario (cada pregunta en su ventana, marca de selección, progreso que cuenta solo las preguntas que aplican): `src/components/Pregunta.astro`, `src/components/SelectorProvincia.astro`, `src/pages/test.astro` | `tests/e2e/cuestionario.spec.ts` |
| M-01 | Accesibilidad AA en todas las pantallas, incluidos los colores de partido sobre el fondo nuevo | `tests/e2e/accesibilidad.spec.ts` |
| M-01 | Rendimiento: portada en menos de 2 s en 4G; animaciones desactivadas con `prefers-reduced-motion` (`src/kit/motion.css`, `src/pages/index.astro`) | no verificable por interfaz: el tiempo de carga es una medición; se comprueba con Lighthouse (móvil, 4G simulado) sobre `pnpm preview` antes del PR. El movimiento reducido del resultado de ejemplo lo comprueba `tests/e2e/cuestionario.spec.ts` |
| M-12 | Resultados provisional y final (podios en tarjetas con punto de color, votaciones contadas, porcentaje en mono y barra; botón para seguir): `src/scripts/resultado.ts`, `src/pages/test.astro` | `tests/e2e/cuestionario.spec.ts` |
| M-03 | Aviso con menos de 5 votaciones y cobertura, con el estilo nuevo: `src/scripts/resultado.ts` | `tests/e2e/cuestionario.spec.ts` |
| M-09 | Aviso de alcance en el pie del resultado: `src/scripts/resultado.ts` | `tests/e2e/cuestionario.spec.ts` |
| M-04 | Lista de votaciones (fecha y tipo en mono, por qué te afecta, voto de cada partido en píldoras, enlace al Congreso): `src/scripts/resultado.ts` | `tests/e2e/cuestionario.spec.ts` |
| M-07 | "Cómo funciona" con el sistema nuevo y las preguntas frecuentes compartidas con la portada: `src/pages/como-funciona.astro` | revisión humana: la página a 375 px; se lee en una columna, con las secciones de método, jurado, limitaciones y preguntas frecuentes |
| M-08 | Sin cambios: las respuestas siguen sin salir del navegador | `tests/e2e/privacidad.spec.ts` |

## Fuera de esta feature

- Cambios de textos, del cálculo, de los datos o del recorrido del test.
- Modo oscuro.
