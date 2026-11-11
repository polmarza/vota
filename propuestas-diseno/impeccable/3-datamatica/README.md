# 3 · Datamática

**Dirección:** los votos como datos puros, en blanco y negro.

**La idea:** cada votación del catálogo es una barra en un código de barras colocado en su fecha
real (71 votaciones, 2020-2026). El resultado es la tira de cada partido: una celda por votación,
rellena con su color cuando votó a tu favor (o en tu contra).

**Tipografías:** Martian Mono (Google Fonts), una sola familia en su eje de anchura: ancha y de
peso extremo (150 y 800) para el lema, estrecha para el texto corrido.

**Paleta:**

| Rol | Hex |
|---|---|
| Fondo | `#000000` |
| Tinta, filetes y estado activo | `#ffffff` |

Sin grises. El único estado activo es la inversión (fondo blanco, texto negro). El color solo
aparece en la muestra y las celdas de cada partido, siempre con un filete blanco para que se lea
también sobre negro.

**Por qué encaja:** es la neutralidad llevada al extremo: blanco y negro absolutos, y el color
reservado a los partidos. El campo de barras de la portada demuestra el mecanismo antes de leer
nada (son las votaciones reales en su fecha), y las tiras de celdas dejan contar a ojo cuántas
votaciones hay detrás de cada porcentaje.

**Señas:** código de barras de las 71 votaciones con eje de años; barra de cobertura «23 de 31»;
opciones que se invierten al marcarlas; tiras de celdas por partido. Las barras de la portada
aparecen de izquierda a derecha al cargar (desactivado con `prefers-reduced-motion`).
