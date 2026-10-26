# Design System

<!-- Fuente de verdad visual del proyecto.
     Consultar antes de crear cualquier componente nuevo.
     Actualizar cuando se añadan nuevos patrones, componentes o se modifique la identidad visual. -->

**Principio rector: la interfaz es neutral; el color solo aparece cuando habla de un partido.**
En una herramienta electoral, cualquier color de marca se lee como un guiño político (el morado de
Con Criterio, por ejemplo, se asocia a Podemos y Sumar). Por eso toda la web es blanco y negro y
los colores de los partidos aparecen únicamente en el resultado y en la animación de la portada,
todos con el mismo tratamiento.

---

## Paleta de colores

| Rol | Nombre | Hex |
|-----|--------|-----|
| Primary | Tinta | `#0B0B0B` |
| Background | Blanco | `#FFFFFF` |
| Surface | Gris aviso (cajas de aviso) | `#F4F4F4` |
| Text primary | Tinta | `#0B0B0B` |
| Text secondary | Gris texto | `#555555` |
| Text muted | Gris pista (pies, ayudas) | `#777777` |
| Border | Gris borde (opciones, campos) | `#D6D6D6` |
| Track | Fondo de barras y progreso | `#EFEFEF` |
| Disabled | Botón inactivo | `#CFCFCF` |
| Error | Tinta + texto explícito | `#0B0B0B` |

- **No hay color de acento.** El estado activo se marca invirtiendo: fondo tinta, texto blanco.
- **No hay rojo ni verde de estado.** El rojo y el verde son colores de partido. Los errores se
  comunican con texto e icono (`ti-alert-circle`), no con color.
- **Colores de partido:** cada partido tiene uno, su color oficial, definido en el catálogo
  (`data-model.md`), nunca en el CSS. No se repiten dentro de una misma vista. Siempre van
  acompañados del nombre y el logo del partido, para que nadie dependa del color (daltonismo).
- Contraste mínimo WCAG AA: texto `#555555` sobre blanco cumple (7,5:1); `#777777` solo para
  texto ≥ 11 px no esencial.

---

## Tipografía

- **Display / Headings:** Instrument Serif (Google Fonts, autoalojada), redonda y cursiva.
- **Body / UI:** Inter (autoalojada), con la pila del sistema como respaldo
  (`-apple-system, system-ui, "Segoe UI", Roboto, sans-serif`).

| Nivel | Fuente | Tamaño (móvil) | Peso | Uso |
|-------|--------|----------------|------|-----|
| Wordmark | Instrument Serif | 21px | 400 | "vota con *criterio*", siempre en minúsculas, *criterio* en cursiva |
| H1 portada | Instrument Serif | 46px / 0,98 | 400 | Titular; las palabras clave en cursiva |
| H2 pregunta | Instrument Serif | 30px / 1,05 | 400 | Enunciado de cada pregunta |
| H2 resultado | Instrument Serif | 26px | 400 | "Te han *favorecido*", "Te han *perjudicado*" |
| Body | Inter | 15px / 1,55 | 400 | Texto corrido |
| Control | Inter | 16px | 400 | Opciones de respuesta, campo de provincia y sus sugerencias; todos iguales y nunca por debajo de 16px (evita el zoom automático de iOS) |
| Subtítulo de ayuda | Inter | 12,5px / 1,45 | 400 | Aclaración bajo la pregunta |
| Etiqueta | Inter | 12px | 400–500 | Progreso, metadatos |
| Cifra | Inter | 15px | 600 | Porcentajes del resultado |
| Caption | Inter | 10,5–11px | 400 | Subtítulo del wordmark, pies |

- La cursiva de Instrument Serif es el recurso expresivo: se usa en una o dos palabras por
  titular, nunca en párrafos.
- En escritorio los tamaños de display escalan con `clamp()`; el body no pasa de 17px.

---

## Espaciado y grid

- Escala base de 4px: 4, 8, 12, 16, 20, 24, 32, 48, 64.
- Márgenes laterales de 22px en móvil; en escritorio, columna central de máx. 560px (la
  experiencia es la misma que en móvil, centrada).
- Una sola columna en todas las pantallas. No hay grid de varias columnas.

---

## Estilo de componentes

- **Border radius:** 10px en botones, opciones, campos y lista de sugerencias; 8px en el logo;
  2px en la parte superior de las barras de la portada; 5px en las
  barras del resultado.
- **Bordes:** 1px. Tinta para separar la cabecera y para el estado activo; `#D6D6D6` en reposo.
- **Sombras:** ninguna. Nunca decorativas.
- **Iconos:** Tabler Icons outline, 18–20px.
- **Botón principal:** fondo tinta y texto blanco **siempre visibles**, no solo al pasar el ratón.
  Inactivo: fondo `#CFCFCF`. Un único botón principal por pantalla.
- **Movimiento:** transiciones de 150–500 ms con `ease`. Todo movimiento se desactiva con
  `prefers-reduced-motion: reduce`.

---

## Tono visual

Editorial y sobrio, como la portada de un buen periódico: blanco, negro, mucho aire y una serif
con carácter que da personalidad sin tomar partido. Debe transmitir rigor y confianza: aquí hay
datos, no opinión. La vida la ponen la tipografía, la cursiva y, en la portada, el ecualizador de
colores de todos los partidos a la vez.

**No debe parecer:** propaganda ni campaña (nada de mayúsculas gritonas ni colores de marca), un
test de revista de los de "¿qué personaje eres?", ni una web institucional gris.

---

## Componentes definidos

### Cabecera
Logo (cuadrado tinta de 30px, radio 8px, "v" blanca en Instrument Serif) + wordmark
"vota con *criterio*" + subtítulo "elecciones generales · 29 de noviembre". Filete inferior de
1px tinta. En la pantalla de resultado añade a la derecha el icono de compartir (`ti-share`).

### Ecualizador de partidos
Fila de barras en la parte inferior de la portada, una por partido del catálogo con su color,
sin repetir, ancladas a una línea base y con alturas que cambian cada ~0,5 s. Barras anchas
(separación 4px), radio superior de 2px. Decorativo: `aria-hidden="true"`. Estático con
`prefers-reduced-motion`.

### Opción de respuesta
Bloque de ancho completo, borde `#D6D6D6`, texto tinta. Al marcarla se invierte (fondo tinta,
texto blanco) y la pregunta avanza sola tras ~0,4 s. No usar para la provincia.

### Selector de provincia (autocompletado)
Campo de texto con autocompletado, sin panel ni lista desplegable completa.
- Desde la primera letra aparecen debajo las provincias que coinciden, en orden alfabético.
- La búsqueda ignora acentos, mayúsculas y la "ñ" frente a la "n": "a" encuentra Álava, Albacete,
  Alicante, Almería, Asturias, Ávila y A Coruña; "bar" encuentra Barcelona.
- Coincide con el inicio del nombre o de cualquiera de sus palabras ("coru" → A Coruña,
  "palmas" → Las Palmas, "tenerife" → Santa Cruz de Tenerife), y con los nombres alternativos
  habituales (Araba, Vizcaya, Guipúzcoa, Gerona, Lérida, Orense, La Coruña, Baleares).
- Se navega con flechas y Enter, y con el patrón ARIA `combobox` + `listbox`.
- Al elegir una, el campo muestra el nombre oficial y se activa "Siguiente" (la única pregunta que
  no avanza sola). Un texto que no corresponde a ninguna provincia no permite avanzar.
- Texto del campo a 16px como mínimo: con menos, Safari en iPhone hace zoom al enfocarlo.

### Pregunta
Etiqueta de progreso ("Vivienda · 2 de 10") con "← Atrás" a la izquierda, barra de progreso de
3px, enunciado en serif y, solo cuando la pregunta puede generar dudas, un subtítulo de ayuda. No
se muestra el número de pregunta en grande.

### Fila de partido (resultado)
Logo del partido (26px), nombre, porcentaje a la derecha y barra de 10px en el color del partido.
Se usa en los podios "Te han *favorecido*" y "Te han *perjudicado*", tres filas cada uno.

### Caja de aviso
Fondo `#F4F4F4`, radio 10px, texto 11px. Para el aviso de alcance (M-09) y la explicación del
porcentaje.

### Imagen para compartir
Versión del resultado en formato vertical (1080×1350) con cabecera, los dos podios y la URL. No
incluye ninguna respuesta del cuestionario.

---

## Referencias visuales

- Maquetas iteradas en la sesión del 26 de octubre de 2026 (dirección "A · Editorial", tercera
  versión). Se descartaron la dirección "papeleta" (monoespaciada) y la "grotesca" (mayúsculas
  gruesas), por sonar más a campaña.
- Portadas de prensa editorial: filetes finos, serif de titular, mucho blanco.
