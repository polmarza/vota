# Rediseño visual: dirección "Ventana"

**Estado:** En construcción
**Requisitos que cierra:** ninguno nuevo. Rehace la capa visual de M-01, M-03, M-04, M-09 y M-12, y
debe mantener los requisitos no funcionales (móvil primero, WCAG 2.1 AA, portada en menos de 2 s en
4G, privacidad M-08).
**Fecha de acuerdo:** 2026-11-11

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

## Cobertura

| Requisito | Se implementa en | Se valida con |
|-----------|------------------|---------------|
| R-1 · Sistema visual: tokens de Ventana con tinta negra, Geist y Geist Mono autoalojadas, icono de puntos en cabecera y favicon; `docs/design-system.md` reescrito | `src/styles/global.css`, `src/kit/` (kit de Taste Skill copiado de la propuesta), `src/layouts/Base.astro`, `src/components/Cabecera.astro`, `src/components/Pie.astro`, `public/favicon.svg`, `docs/design-system.md` | revisión humana: portada y test en la vista previa a 375 px y 1280 px; fondo `#f7f9fa`, botones negros, Geist en titulares y texto, cifras en Geist Mono y el icono de puntos junto a "Vota con Criterio" |
| R-2 · Portada con la estructura de Ventana: titular centrado, botón y la primera pregunta asomando en una ventana sobre el marco arena; resultado de ejemplo con selector de perfil, y preguntas frecuentes antes del cierre | `src/pages/index.astro`, `src/components/PreguntasFrecuentes.astro`, `data/perfiles-ejemplo.yaml` (resultado de ejemplo) | `tests/e2e/cuestionario.spec.ts` (desde la portada se llega a la primera pregunta y a "Cómo funciona"; el resultado de ejemplo nombra el perfil y es real; el selector cambia de perfil sin recargar; las preguntas frecuentes son las de "Cómo funciona") y revisión humana: portada a 375 px; el titular, la entradilla y el botón se ven sin desplazar y la ventana asoma debajo |
| R-3 · Cuestionario: cada pregunta en su ventana, opciones con su marca de selección, progreso "Vivienda · 2 de 8" | `src/components/Pregunta.astro`, `src/components/SelectorProvincia.astro`, `src/pages/test.astro` | `tests/e2e/cuestionario.spec.ts` (M-01) |
| R-4 · Resultado provisional y final: los dos podios en tarjetas con punto de color, nombre, votaciones contadas, porcentaje en Geist Mono y barra; aviso de alcance; botón para seguir | `src/scripts/resultado.ts`, `src/pages/test.astro` | `tests/e2e/cuestionario.spec.ts` (M-12, M-03, M-09) |
| R-5 · Lista de votaciones: fecha y tipo en mono, título, por qué te afecta, voto de cada partido en rejilla de píldoras y enlace al Congreso | `src/scripts/resultado.ts` | `tests/e2e/cuestionario.spec.ts` (M-04) |
| R-6 · "Cómo funciona" con el nuevo sistema | `src/pages/como-funciona.astro` | revisión humana: la página a 375 px; se lee en una columna, con los mismos títulos y textos que ahora |
| R-7 · Accesibilidad AA en todas las pantallas, incluidos los colores de partido sobre el fondo nuevo (sin filete: el nombre y el porcentaje van en texto al lado, `docs/design-system.md` → Contraste) | todo lo anterior | `tests/e2e/accesibilidad.spec.ts` |
| R-8 · Rendimiento y movimiento: portada en menos de 2 s en 4G; animaciones desactivadas con `prefers-reduced-motion` | `src/styles/global.css`, `src/kit/motion.css`, `src/pages/index.astro` (fundido y barras del resultado de ejemplo) | no verificable por interfaz: el tiempo de carga es una medición; se comprueba con Lighthouse (móvil, 4G simulado) sobre `pnpm preview` antes del PR. El movimiento reducido del resultado de ejemplo (sin fundido ni barras creciendo) lo comprueba `tests/e2e/cuestionario.spec.ts` |
| R-9 · Las respuestas siguen sin salir del navegador | sin cambios | `tests/e2e/privacidad.spec.ts` (M-08) |

## Fuera de esta feature

- Cambios de textos, del cálculo, de los datos o del recorrido del test.
- Modo oscuro.
