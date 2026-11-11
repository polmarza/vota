# Cómo se elige y se etiqueta el catálogo

Este documento es el método que sigue Claude para construir el catálogo de votaciones
(`data/catalogo/`) y el que se publica, resumido, en "Cómo funciona" (M-07). Lo acordó Pol el
28-10-2026 (`docs/features/catalogo.md`); Pol no interviene en qué votaciones entran ni en cómo se
etiquetan. Cada ficha la revisa el jurado de cinco IAs (M-10).

## 1. El universo: todo lo que se votó

`pnpm data:candidatas` genera `data/candidatas/<leg>.json` a partir de los datos brutos del
Congreso con un criterio mecánico, sin intervención de nadie:

- **Entran** las iniciativas con efecto jurídico: proyectos y proposiciones de ley (de cualquier
  grupo, del Gobierno o de una comunidad autónoma), decretos ley, reformas de estatutos de
  autonomía y Presupuestos Generales del Estado. **Hayan salido adelante o no:** lo que importa es
  qué votó cada partido.
- **No entran** las proposiciones no de ley ni las mociones (no obligan a nada, así que no tienen
  un efecto directo que etiquetar), los tratados internacionales, los estados de alarma, el
  Reglamento del Congreso, las comisiones y subcomisiones, los suplicatorios ni las votaciones
  secretas, por asentimiento o sin voto nominal publicado.
- **Una votación por iniciativa:** la última del Pleno sobre la iniciativa entera. Si se aprobó,
  la votación final (de conjunto, del dictamen o de las enmiendas del Senado si es la última); si
  se devolvió al Gobierno, la de totalidad; si no se admitió a trámite, la toma en consideración;
  en un decreto ley, la convalidación (no la de tramitarlo además como proyecto de ley). En los
  Presupuestos, que se votan título a título, la de totalidad. Las enmiendas sueltas no cuentan, ni las votaciones empatadas, que el
  Reglamento obliga a repetir (si la repetición no tiene datos publicados, la iniciativa no entra).

La lista **no incluye el voto de los partidos** a propósito: las votaciones se eligen por lo que
dicen y a quién afectan, antes de mirar quién votó qué.

Resultado el 28-10-2026: 293 iniciativas en la XIV y 219 en la XV; 255 del Gobierno y 257 de grupos
parlamentarios o comunidades; en 180 no salió el "Sí".

## 2. La selección: se parte del perfil

El cuestionario pregunta por la situación de la persona (vivienda, trabajo, edad, hijos…), no por
lo que piensa. Para cada respuesta posible ("vivo de alquiler") se buscan en el universo las
iniciativas que cambian algo concreto para quien responde eso.

- **Equilibrio:** para cada respuesta se buscan votaciones de las dos legislaturas y de
  iniciativas de proponentes distintos (Gobierno y oposición), no solo leyes del Gobierno. No hay
  cuotas por partido.
- **Relevancia:** se prefieren las iniciativas con efecto amplio y reconocible (una ley de
  vivienda antes que una corrección técnica) y las que dividieron al Congreso; una votación que
  todos los partidos votaron igual no distingue a nadie, pero puede entrar si es importante para un
  perfil.
- **Tamaño:** unas 100 fichas en la primera versión (eran 40–60 hasta el 11-11-2026). Cada pregunta del cuestionario la usa al
  menos una ficha; si una pregunta se queda sin votaciones, se quita.
- **Perfiles de referencia:** cada uno de los perfiles de `data/perfiles-ejemplo.yaml` tiene que
  verse afectado por al menos 5 votaciones (por debajo de eso no se muestra resultado, M-03).
- **Territoriales:** las que afectan solo a unas comunidades (financiación, deuda, inversiones,
  competencias) entran con su efecto comunidad por comunidad (M-11).
- **Un mismo efecto cuenta una sola vez** (desde el 11-11-2026). Si varias votaciones dan el mismo
  efecto directo a la misma persona por la misma medida (la revalorización de las pensiones de un
  mismo año en los presupuestos, en un decreto específico y en un decreto ómnibus; las prórrogas de
  la misma suspensión de desahucios; las de los ERTE), el efecto se queda solo en la votación cuyo
  objeto principal es esa medida: la norma específica antes que los presupuestos o un decreto
  ómnibus y, si no hay ninguna específica (o hay varias), la que la estableció: la primera que salió
  adelante. Un decreto que el Congreso tumbó no estableció nada, así que si otro posterior recoge la
  misma medida y se convalida, cuenta ese (corregido el 11-11-2026 tras la revisión del conjunto por
  el jurado: el subsidio de 2023 y las pensiones de 2025). De las demás se quita. Medidas distintas aunque parecidas no son duplicados: la subida de las pensiones de 2021
  y la de 2023, o la reforma de las pensiones frente a una subida anual. Dos iniciativas
  legislativas populares o proposiciones con el mismo contenido sí lo son, y se queda la primera
  votada. Una ficha que se queda sin efectos sale del catálogo. La regla se aplica por el contenido
  y la fecha de cada votación, nunca por lo que votó cada partido.

## 3. El etiquetado: por lo que dice el texto

- **Se lee el texto, no el titular.** Para lo aprobado, el texto publicado en el BOE; para lo que no
  salió adelante, el de la iniciativa en el Boletín Oficial de las Cortes Generales. La ficha
  enlaza ese texto (`texto`) y cada efecto cita el artículo o la medida en que se basa (`base`).
- **Qué significa "Sí".** Se explica siempre (`que_significa_si`), porque no siempre es apoyar la
  medida: en una enmienda a la totalidad, votar "Sí" es devolver la ley al Gobierno; en un decreto
  ley, votar "Sí" es mantenerlo en vigor.
- **Solo efectos directos.** Un efecto se etiqueta si el texto establece algo concreto para quien
  cumple la condición: un derecho, una ayuda, un impuesto, un límite, una obligación. "Favorece" o
  "perjudica" se refiere a esa persona y a esa medida, no a la economía en general ni a efectos
  indirectos o discutidos.
- **Efectos contrapuestos.** Una misma votación puede favorecer a unos y perjudicar a otros (quien
  alquila y quien arrienda). Se etiquetan los dos; si una persona cumple ambas condiciones, la
  votación no cuenta para ella.
- **Justificación en lenguaje claro.** Cada efecto explica en una o dos frases por qué favorece o
  perjudica; es lo que lee el visitante bajo su resultado (M-04).

## 4. La revisión: el jurado

El jurado revisa cada ficha a ciegas, sin saber qué votó cada partido ni qué propuso Claude:

- **Efecto a efecto:** "para quien cumple esta condición, ¿que saliera el Sí le favorece, le
  perjudica o no le afecta directamente?". Si 3 de 5 coinciden con la etiqueta, se aprueba; si no,
  segunda ronda con las respuestas anónimas, y lo que digan al menos 3 corrige la ficha. Sin
  consenso, el efecto se quita.
- **Fidelidad:** si el resumen y `que_significa_si` describen bien el texto.
- **El conjunto:** una revisión aparte de la lista completa, para detectar temas o perfiles
  sobrerrepresentados o iniciativas importantes que falten.

Una ficha sin veredicto vigente, o con la mayoría del jurado en contra, no se publica: el build
falla. Todos los veredictos, incluidos los que caducaron, se guardan en `data/jurado/`.
