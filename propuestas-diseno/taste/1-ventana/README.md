# 1 · Ventana

**La idea.** Cada pantalla del test se enseña dentro de una ventana limpia, como un producto que se deja mirar por dentro: la portada sube la primera pregunta desde un marco de color arena, y la pregunta, el resultado y la votación aparecen tal cual se verían. Es la propuesta más sobria: tipografía técnica, cifras en monoespaciada, y el color solo en los puntos y barras de cada partido.

- **Tipografías:** Geist (titulares a 500 y texto) y Geist Mono (contadores, fechas, porcentajes). Google Fonts.
- **Paleta:** fondo `#f7f9fa`, superficie `#ecf0f2`, tinta `#1f3038` (también es el color de los botones y del foco), gris `#5e6b71` solo para rótulos; marco de la portada arena `#d9ccb7`. Colores de partido solo desde `data/partidos/partidos.yaml`.
- **Por qué encaja:** un gris pizarra casi negro no se asocia a ningún partido; la ventana dice "esto es una herramienta, no un mitin", y el resultado entra con una línea que barre la sección (momento *line-carries-colour*), sin confeti ni "tu partido ideal".
- **Reparto de la skill (taste):** héroe *centred*, nav centrada, cierre *close-type*, pie en columnas, botones *solid*, marca *stack*. La paleta repartida traía acento verde azulado: se sustituyó por la tinta para cumplir el brief.
- **Imágenes:** ninguna fotografía; todo es interfaz en HTML.
- **Comprobado:** checker y finish gate de la skill (`GATE: PASS`, 2 dispensas justificadas en `.taste-skill/waivers.json`), y a 1440, 1280, 1024, 820, 768, 390 y 375 px. Capturas: `escritorio.png` (1280) y `movil.png` (375).
- **Ojo:** el voto por partido de la votación del 27-01-2026 es ilustrativo (prensa), no sale de `data/votos`; en el producto real se pinta desde los datos.
