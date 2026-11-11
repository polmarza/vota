# Explorador del catálogo y compartir el resultado

**Estado:** En construcción
**Requisitos que cierra:** S-01, S-02
**Fecha de acuerdo:** 2026-11-11

## Qué se construye

**Explorador del catálogo (S-01).** Una página `/votaciones` con todas las votaciones del catálogo:
fecha, legislatura, título, resumen, qué significaba votar «sí», a quién afecta y cómo, el voto de
cada partido y el enlace al Congreso y al texto oficial. Se filtra por tema y por legislatura. Es la
prueba pública de que el catálogo es el que es: cualquiera puede revisar qué se eligió y qué votó
cada partido, sin hacer el test.

**Compartir el resultado (S-02).** En el resultado, un botón "Compartir" genera en el navegador
una imagen vertical con la marca, los dos podios y la dirección de la web, sin ninguna respuesta del
cuestionario. En el móvil abre el menú de compartir del sistema; donde no se puede, la descarga.

## Decisiones tomadas

- Una sola ficha para las dos: son pequeñas, no dependen la una de la otra y se cierran a la vez.
- La imagen se genera con Canvas en el dispositivo (`docs/architecture.md`): el resultado nunca sale
  del navegador salvo que el visitante decida compartir la imagen (M-08).

Explorador (Pol, 2026-11-11; el detalle lo decidió Claude por delegación):
- El enlace "Votaciones" del menú lleva a `/votaciones`.
- Salen todos los partidos que votaron, no solo los que se presentan el 29-N.
- Los partidos van ordenados de izquierda a derecha según una fuente externa citable, no según
  criterio propio: la posición izquierda-derecha (`lrgen`) de la Chapel Hill Expert Survey 2024; los
  partidos que no estén en ella se colocan junto al grupo con el que votaban y se dice en
  "Cómo funciona". El orden se guarda en `data/partidos/partidos.yaml` con su fuente.
- Cada partido es un punto de color con sus siglas y el voto escrito (Sí, No, Abst., dividido), para
  no depender del color.
- Acordeón: cada votación plegada muestra fecha, legislatura, tema y título; al abrirla, resumen
  (recortado a tres líneas con "Ver más" si es largo), qué significaba votar «sí», a quién afecta
  y cómo, el voto de cada partido, el veredicto del jurado y los enlaces al Congreso y al texto.
- Filtros: buscador por texto, tema y legislatura, combinables; el recuento de resultados se anuncia
  a los lectores de pantalla.

Compartir (Pol, 2026-11-11):
- Solo en el resultado final.
- Tarjeta vertical 1080×1350 (4:5): marca, los temas que más afectan a esa persona según las
  votaciones que le cuentan, el partido que más veces votó a su favor y los dos podios, el aviso "no
  es una recomendación de voto" y la dirección de la web.
- El perfil es opcional y está desmarcado por defecto: si el visitante lo marca, la tarjeta añade una
  línea con vivienda, situación laboral, edad e hijos. Nunca entran ingresos, patrimonio, herencias,
  discapacidad ni provincia. Cambia S-02 en el PRD, que decía que la imagen no lleva ninguna
  respuesta.
- La frase es "Votó más veces a tu favor", no "tu partido" ni "deberías votar".
- El texto que acompaña al compartir solo invita a hacer el test, sin nombrar partidos.

## Cobertura

| Requisito | Se implementa en | Se valida con |
|-----------|------------------|---------------|
| S-01 | `src/pages/votaciones.astro`, `src/lib/explorador.ts` y `src/scripts/explorador.ts`: todas las fichas con el voto de cada partido en orden ideológico (`posicion_ideologica` en `data/partidos/partidos.yaml`), filtros por texto, tema y legislatura | `tests/e2e/explorador.spec.ts` |
| S-01 | Aspecto del explorador a 375 px y 1280 px | revisión humana: `/votaciones` en la vista previa a 375 px y 1280 px; se lee sin desplazar en horizontal y el voto de cada partido se distingue sin depender del color |
| S-02 | `src/lib/compartir/` (`tarjeta.ts`, datos; `dibujo.ts`, Canvas), botón en `src/scripts/resultado.ts`: imagen 1080×1350 con los dos podios, Web Share API con archivo y descarga como alternativa | `tests/e2e/compartir.spec.ts` |
| S-02 | La imagen no lleva respuestas salvo que el visitante marque su perfil (y nunca las sensibles), y no sale nada del navegador al generarla | `tests/unit/compartir.test.ts` |
| S-02 | Lo mismo, en el navegador: casilla desmarcada por defecto, línea de perfil sin datos sensibles y ninguna petición de red al generar | `tests/e2e/compartir.spec.ts` |
| S-02 | Aspecto de la imagen | revisión humana: la imagen descargada en móvil y en escritorio; marca, dos podios con color y porcentaje, aviso y dirección legibles en una miniatura de chat |

## Fuera de esta feature

- S-03 (dar más peso a temas).
- Enlaces a un resultado concreto (la URL no puede llevar respuestas, M-08).
