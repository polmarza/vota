# Design System

<!-- Fuente de verdad visual del proyecto.
     Consultar antes de crear cualquier componente nuevo.
     Actualizar cuando se añadan nuevos patrones, componentes o se modifique la identidad visual. -->

**Principio rector: la interfaz es neutral; el color solo aparece cuando habla de un partido.**
En una herramienta electoral, cualquier color de marca se lee como un guiño político (el morado de
Con Criterio, por ejemplo, se asocia a Podemos y Sumar, y **no se usa nunca**). Por eso la web es
negro sobre un gris azulado muy claro, con un único tono cálido (el marco arena de la portada) que
no se asocia a ningún partido, y los colores de los partidos aparecen solo en sus puntos, sus
barras y su fila de voto, todos con el mismo tratamiento.

La dirección es **Ventana** (`propuestas-diseno/taste/1-ventana/`, elegida por Pol el 11-11-2026,
ficha en `docs/features/rediseno-ventana.md`): una interfaz sobria, de herramienta, en la que cada
pantalla del test se ve dentro de una "ventana" limpia con sombra. La web se construye sobre el kit
de Taste Skill de esa propuesta, copiado en `src/kit/`; los componentes propios están en
`src/styles/global.css`. Cambios sobre la maqueta: tinta, botones y foco en negro (no en el pizarra
`#1f3038`) y el arco del hemiciclo de la propuesta "Fachada" como logo, con la marca en minúsculas.

---

## Paleta de colores

| Rol | Nombre | Hex |
|-----|--------|-----|
| Background | Fondo | `#F7F9FA` |
| Surface | Superficie (sección del resultado, fondo de los podios, pistas de barras, opción marcada) | `#ECF0F2` |
| Primary / Text primary | Tinta (texto, botones, foco, opción marcada, píldora "Sí") | `#0A0A0A` |
| Text secondary | Gris (rótulos, ayudas, detalles, "Prefiero no responder") | `#5E6B71` |
| Marco | Arena (solo el marco de la ventana del héroe) | `#D9CCB7` |
| Border | Tinta al 14–25 % (ventanas, opciones, píldoras); tinta al 11 % (filetes) | — |
| Inverse | Superficies invertidas del kit: fondo `#0A0A0A`, texto `#F7F9FA` | — |
| Disabled | Botón inactivo: superficie y texto gris | `#ECF0F2` / `#5E6B71` |
| Error | Tinta + texto explícito | `#0A0A0A` |

- La paleta vive en `:root` de `src/styles/global.css` como `--p-*` (las variables que lee el kit).
- **No hay color de acento.** El acento del kit es la tinta.
- **No hay rojo ni verde de estado.** El rojo y el verde son colores de partido. Los errores se
  comunican con texto, no con color.
- **Colores de partido:** cada partido tiene uno, su color oficial, en `data/partidos/partidos.yaml`
  (`data-model.md`), **nunca en el CSS**: llega al HTML como `--c` en línea. No se repiten. Siempre
  van con el nombre o las siglas del partido en tinta al lado, para que nadie dependa del color
  (daltonismo).
- **Contraste:** todo el texto cumple AA (gris `#5E6B71` sobre el fondo, 5,2:1; sobre la superficie,
  4,8:1). Los colores de partido van **tal cual, sin filete**, aunque algunos no lleguen a 3:1 sobre
  el fondo (Vox, Más Madrid, ERC, Junts, EH Bildu, BNG, CC, NC, Més, PRC). Hasta el 2026-11-11 esos
  llevaban un filete de tinta alrededor del punto y la barra; Pol lo quitó porque, al tenerlo solo
  algunos partidos, parecía un error. **Por qué cumple WCAG 2.1 AA:** el 1.4.11 (contraste de lo que
  no es texto, 3:1) solo se exige a los elementos gráficos *necesarios para entender* el contenido.
  El punto y la barra no lo son: el nombre o las siglas del partido y su porcentaje van siempre al
  lado en texto con contraste AA, así que la información no se pierde aunque el color no se
  distinga (es también lo que pide el 1.4.1, uso del color). Lo comprueba axe en
  `tests/e2e/accesibilidad.spec.ts`.

---

## Tipografía

- **Display, texto y UI:** Geist (`@fontsource-variable/geist`, autoalojada), titulares a 500 con
  interletrado negativo (−0,035 em).
- **Cifras y rótulos técnicos:** Geist Mono (`@fontsource-variable/geist-mono`): progreso, porcentajes,
  fechas y tipo de cada votación, píldoras de voto.
- Sin peticiones a Google Fonts.

| Nivel | Fuente | Tamaño | Peso | Uso |
|-------|--------|--------|------|-----|
| Marca | Geist | 20–22px | 500 | "Vota con Criterio" junto al icono de puntos |
| H1 | Geist | 38px (390) → 72px (1440) | 500 | Titular de la portada y de "Cómo funciona" |
| H2 | Geist | 30px → 48px | 500 | Títulos de sección, "Tu resultado" |
| Pregunta | Geist | 26px → 34px (22px en la ventana del móvil) | 500 | Enunciado de cada pregunta |
| H3 podio / votación | Geist | 28px (22px en móvil) | 500 | "Estuvieron de tu lado", "Votaron en tu contra", título de votación |
| Lead | Geist | 18–20px | 400 | Entradillas, cobertura del resultado |
| Body | Geist | 16px / 1,55 | 400 | Texto corrido |
| Control | Geist | 16–18px | 400 | Opciones, campo de provincia: nunca por debajo de 16px (evita el zoom de iOS) |
| Rótulo | Geist | 13px | 500 | "Pantalla 2 · Una pregunta", pies |
| Contador | Geist Mono | 13–14px | 500 | "Vivienda · 2 de 8", "25 %", "27 ene 2026 · Real decreto-ley" |
| Porcentaje | Geist Mono | 22px | 500 | Cifras de los podios, con cifras tabulares |

- Los porcentajes se escriben con espacio: "95 %".
- Sin cursivas expresivas: la voz la ponen el peso 500 y el interletrado de Geist.

---

## Espaciado y grid

- Escala de 4/8px del kit: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 (`--s-1` a `--s-10`).
- Un `.wrap` de 1280px máximo con 80px de margen lateral en escritorio, 48 en tableta y 24 en móvil;
  rejilla de 12 columnas.
- **Dos columnas en escritorio** (≥ 1024px): la pregunta a la izquierda (5/12) y las opciones a la
  derecha (7/12); los dos podios lado a lado; en cada votación, título y votos a la izquierda y "por
  qué te afecta" a la derecha; en "Cómo funciona", títulos a la izquierda y texto a la derecha. En
  móvil, una columna.
- **Portada:** una sección por pantalla (ritmo del kit): cabecera fija, héroe que ocupa la primera
  pantalla y secciones de una pantalla con su rótulo y su h2 arriba. El resultado de ejemplo crece
  si el nombre del perfil lo pide.
- **Test y "Cómo funciona":** una columna de contenido bajo la cabecera fija (`.interior`), sin el
  ritmo de pantallas.

---

## Estilo de componentes

- **Radios:** 8px en botones y campos, 12px en opciones y ventana del héroe, 20px en ventanas,
  podios y marco; 999px en píldoras.
- **Sombras:** solo en las ventanas (`0 24px 48px -32px` de tinta al 35 %) y en la ventana del
  héroe; nunca decorativas en otro sitio.
- **Botones:** sólidos. Principal: fondo tinta, texto fondo, siempre visible. Secundario: contorno
  fino. El grande del cierre ocupa todo el ancho. Inactivo: superficie y texto gris.
- **Foco:** contorno de 2px en tinta.
- **Iconos:** flecha del kit (`.m-arrow`) en los botones de avance; nada más.
- **Movimiento** (`src/kit/motion.css`, `motion.js`): entrada del héroe (el titular línea a línea,
  luego entradilla, botones y ventana), la flecha de los botones y las transiciones de 180ms del kit.
  En el resultado de ejemplo de la portada, cada bloque (rótulo, nombre del perfil, podios y aviso)
  entra con un **fundido** de 600ms la primera vez que asoma en pantalla y las **barras de los podios
  crecen desde 0** hasta su porcentaje (900ms, escalonadas 80ms por fila); al cambiar de perfil con
  el selector, lo mismo. Está en `src/pages/index.astro` (CSS y el script del selector), en móvil y
  en escritorio. Todo se desactiva con `prefers-reduced-motion: reduce`: se ve el estado final
  directamente. Ya no se usa ningún momento del kit (el *line-carries-colour* de la sección del
  resultado se quitó el 2026-11-11); `src/kit/moments/` conserva solo el cargador.

---

## Tono visual

Una herramienta, no un mitin: gris azulado claro, tinta negra, cifras en monoespaciada y las
pantallas del test enseñadas dentro de ventanas limpias, como un producto que se deja mirar por
dentro. Debe transmitir rigor y confianza: aquí hay datos, no opinión.

**No debe parecer:** propaganda ni campaña (nada de mayúsculas gritonas ni colores de marca), un
test de revista de los de "¿qué personaje eres?", ni una web institucional gris.

---

## Componentes definidos

### Cabecera (`Cabecera.astro`)
Fija, sobre el fondo. Marca a la izquierda: el **arco del hemiciclo** (la silueta del Pleno del
Congreso, `.mark[data-mark="arc"]`; en `public/favicon.svg`, en blanco sobre un cuadrado negro) y
"vota con criterio", siempre en minúsculas, donde *vota* es la marca y *con criterio* la coletilla
que la une a la web de Con Criterio. En títulos de página y textos corridos se escribe "Vota con
Criterio". Enlaces
Test, Resultado, Votaciones y Cómo funciona; botón "Empezar el test" a la derecha (no dentro del
test). En móvil, los enlaces van en un menú.

### Héroe de la portada
Pastilla "Elecciones generales · 29 de noviembre", titular centrado, entradilla, botón principal y
secundario ("Cómo funciona") y, debajo, la **ventana** con la primera pregunta del test sobre el
marco arena, asomando.

### Ventana (`.screen`)
Caja del fondo con borde fino, radio 20px y sombra, con una barra superior de tres puntos y un rótulo
en mono. Contiene una pregunta, la lista de votaciones o una votación de ejemplo.

### Pregunta (`Pregunta.astro`)
Dentro de una ventana: contador "Vivienda · 2 de 8" y porcentaje en mono, barra de progreso de 4px,
enunciado y, si hace falta, subtítulo de ayuda; las opciones a la derecha en escritorio; "← Atrás"
subrayado debajo del enunciado (después de las opciones en el orden del teclado).

### Opción de respuesta
Bloque de ancho completo con su marca de radio de 20px, borde de tinta al 18 %, radio 12px. Marcada:
borde de tinta, fondo superficie y el radio relleno; la pregunta avanza sola tras ~0,4 s.
"Prefiero no responder" va en gris con borde discontinuo. No se usa para la provincia.

### Selector de provincia (autocompletado)
Campo de 52px con borde de tinta al 35 % y sugerencias debajo en una caja con sombra.
- Desde la primera letra aparecen las provincias que coinciden, en orden alfabético.
- La búsqueda ignora acentos, mayúsculas y la "ñ" frente a la "n", coincide con el inicio del nombre
  o de cualquiera de sus palabras y con los nombres alternativos habituales (Araba, Vizcaya,
  Guipúzcoa, Gerona, Lérida, Orense, La Coruña, Baleares).
- Patrón ARIA `combobox` + `listbox`, con flechas y Enter.
- Al elegir una, el campo muestra el nombre oficial y se activa "Siguiente" (la única pregunta que
  no avanza sola).

### Podio (resultado)
Tarjeta del fondo sobre la superficie, radio 20px: título ("Estuvieron de tu lado" / "Votaron en tu
contra"), explicación y tres filas. Cada fila: punto de 12px del color del partido, nombre, "9 de 9
votaciones" en gris, porcentaje en Geist Mono a la derecha y barra de 6px del color del partido.

### Aviso de alcance y cobertura
El aviso (M-09) va al pie del resultado, en texto de 16px, junto al botón de seguir; la cobertura
("Basado en 20 de las 33 votaciones que podrían afectarte") en lead encima de los podios.

### Votación
Fecha y tipo de iniciativa en mono, título, "El sí te favorecía", **"Por qué te afecta:"** y qué
significaba votar sí, el voto de cada partido en una **rejilla de píldoras** (dos columnas en
escritorio, una en móvil: punto y siglas a la izquierda, píldora a la derecha; "Sí" relleno de
tinta, el resto con contorno; el desglose si votó dividido) y el enlace al Congreso.

### Resultado de ejemplo de la portada
El resultado real de uno de los perfiles de `data/perfiles-ejemplo.yaml`, elegido al azar en cada
visita y calculado en el build con el mismo cálculo que el test, nombrando el perfil ("Así le sale
a: estudiante de alquiler en Madrid") y con el rótulo "Un ejemplo real". Nunca cifras inventadas.
Bajo el nombre, un **selector nativo** (`<select>` con la etiqueta "Ver otro perfil", el campo
`.field` del kit) deja elegir cualquiera de los nueve perfiles sin recargar; al cargar refleja el
perfil que ha salido. Los nueve resultados y sus votaciones de ejemplo ya están en el HTML del
build: el selector solo muestra uno y oculta los demás. Sin JavaScript se ve el primero y el
selector no aparece. Se eligió el desplegable y no una fila de píldoras porque los nombres de los
perfiles son largos (hasta 70 caracteres) y nueve píldoras ocuparían media pantalla del móvil.

### Preguntas frecuentes (`PreguntasFrecuentes.astro`)
Las mismas preguntas y respuestas en la portada (sección propia antes del cierre, con el h2 a la
izquierda y las preguntas a la derecha en escritorio) y en "Cómo funciona". El componente es la
única fuente del texto. Usa el patrón FAQ del kit (`.faq > .faq__item`): cada pregunta en un h3 de
500 con su respuesta debajo, todas abiertas, separadas por una raya.

### Cierre y pie (`Pie.astro`)
"Ocho preguntas sobre tu vida", la línea de privacidad y el botón del test a todo el ancho; debajo,
la marca, "Un proyecto de Con Criterio", cuatro columnas de enlaces y la línea legal. En el móvil,
una barra fija repite "Empezar el test" cuando el botón del héroe ha salido de la pantalla.

### Imagen para compartir
Pendiente (S-02): versión vertical del resultado (1080×1350) con la marca, los dos podios y la URL.
No incluye ninguna respuesta del cuestionario.

---

## Referencias visuales

- `propuestas-diseno/taste/1-ventana/` (`index.html`, `escritorio.png`, `movil.png`): la maqueta de
  referencia. Su voto por partido y sus cifras eran ilustrativos; en la web todo sale de los datos.
- `propuestas-diseno/taste/3-recuento/`: origen del icono de puntos.
- La dirección anterior (editorial en blanco y negro con Instrument Serif, octubre de 2026) queda en
  el historial de git.
