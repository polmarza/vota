# Catálogo de votaciones

**Estado:** En construcción
**Requisitos que cierra:** M-05, M-11, M-10 (revisión de las fichas y bloqueo de publicación), M-01 (preguntas)
**Fecha de acuerdo:** 2026-10-28

## Qué se construye

El corazón editorial de la web: entre 40 y 60 votaciones de la XIV y la XV, cada una en su ficha
de `data/catalogo/`, con qué se votaba explicado en lenguaje claro, qué significaba votar "Sí", a
qué perfiles afectaba, si les favorecía o les perjudicaba y por qué, y el enlace a la fuente
oficial. Claude selecciona y etiqueta; el jurado de cinco IAs revisa cada ficha; Pol no interviene
en la selección ni en las etiquetas.

Con el catálogo se cierran también las preguntas del cuestionario (`data/preguntas.yaml`): el
bloque básico y el ampliado quedan exactamente con las preguntas que alguna votación usa, ni una
más. Las votaciones territoriales (financiación, deuda, inversiones, competencias) llevan el efecto
por comunidad autónoma, y para eso hace falta `data/territorio.yaml` con las 52 provincias y su
comunidad.

Cuando exista, la web deja de usar los datos de ejemplo de `tests/fixtures/`, y el build falla si
una ficha no cumple el esquema, no tiene veredicto vigente del jurado o la mayoría del jurado
discrepa de ella.

## Decisiones tomadas

- **Se parte del perfil, no de las leyes** (Pol, 28-10-2026): para cada pregunta y respuesta del
  cuestionario ("vivo de alquiler") se buscan las votaciones que afectan a quien responde eso, y
  cuenta el sentido del voto de cada partido.
- **Universo: todo lo que se votó, aprobado o no** (Pol, 28-10-2026): leyes, convalidaciones,
  proposiciones de ley de cualquier grupo, tomas en consideración. Lo que importa es qué votó cada
  partido, no si salió adelante.
- **Se etiqueta por el contenido, no por el titular** (Pol, 28-10-2026): el efecto se decide
  leyendo lo que dice el texto. Para lo aprobado, el texto publicado en el BOE; para lo rechazado o
  no aprobado, el texto de la iniciativa en el Boletín Oficial de las Cortes Generales. La ficha
  cita el artículo o la medida concreta en que se basa cada efecto.
- **Selección antes de mirar el voto:** cada votación se elige por lo que dice el texto y a quién
  afecta, antes de consultar cómo votó cada partido; el jurado la revisa sin que se le diga.
- **Equilibrio sin cuotas por partido:** para cada respuesta del cuestionario se buscan votaciones
  de las dos legislaturas y de iniciativas de grupos distintos (Gobierno y oposición). El jurado
  revisa además el catálogo completo con una pregunta aparte (temas o perfiles sobrerrepresentados,
  iniciativas importantes que falten).
- **"Favorece" es el efecto directo del texto** —un derecho, una ayuda, un impuesto, un límite, una
  obligación— para quien cumple la condición. Los efectos indirectos o discutibles no se etiquetan.
- **Una votación por iniciativa:** en una ley aprobada, la votación final (o la de enmiendas del
  Senado si es la última); en un decreto ley, la convalidación; en una iniciativa rechazada, la
  votación en la que cayó.
- **Efectos contrapuestos permitidos:** son reales (alquiler: inquilino frente a arrendador); el
  cálculo ya excluye la votación para quien cumple condiciones contrarias.
- **Jurado a ciegas, efecto a efecto:** "para quien cumple X, ¿el Sí favorece, perjudica o no le
  afecta?", y una pregunta sobre si el resumen y `que_significa_si` son fieles al texto. La
  discrepancia de la mayoría corrige la ficha; sin consenso, el efecto se quita.
- **Descartes:** si quedan menos de 40 fichas o una pregunta sin uso, se buscan más votaciones o se
  quita la pregunta. Nunca se publica una ficha sin aprobar.
- **Perfiles de referencia:** unos 8 perfiles habituales en `tests/fixtures/perfiles.yaml`
  (estudiante de alquiler, pensionista con vivienda propia, autónomo con hijos…); cada uno tiene
  que llegar a 5 votaciones (M-03).
- **Plazo y coste:** catálogo completo y aprobado por el jurado el 13-11-2026 (era el 6-11; el
  lanzamiento pasó al 20-11). Como mucho 15 $ de OpenRouter; se avisa a Pol antes de superarlo.
- **Formato de ficha, efecto y pregunta:** el de `docs/data-model.md` (`cuando`, `el_si`,
  `justificacion`, `ambito`, `que_significa_si`…). El voto de cada partido no se escribe en la ficha:
  sale de `data/votos/` por el id `<leg>-<sesion>-<numero>`.
- **Solo votaciones con voto nominal:** las secretas, por asentimiento o sin JSON (`sinDatos`) no
  pueden entrar.
- **Territoriales incluidas** (M-11), con efecto por comunidad.
- **Sin intervención editorial de Pol:** Pol acuerda el método (esta ficha), no la selección ni las
  etiquetas. Lo que el jurado decida se aplica, como con la herencia.
- **Jurado:** los cinco jueces y el mecanismo de `scripts/data/jurado.ts` (aprobado con 3, segunda
  ronda anónima, historial de veredictos).

## Cobertura

| Requisito | Se implementa en | Se valida con |
|-----------|------------------|---------------|
| M-05 | `scripts/data/catalogo.ts`: esquema Zod de ficha, pregunta y territorio, y validación cruzada (la votación existe en `data/votos` con voto nominal, URL oficial, justificaciones, preguntas y opciones existentes, comunidades válidas, cada pregunta usada por alguna ficha) | `tests/unit/data/catalogo.test.ts` |
| M-05 | `scripts/data/candidatas.ts` (`pnpm data:candidatas`): universo de votaciones candidatas sacado de los datos brutos con un criterio mecánico, y criterios de selección y etiquetado escritos en `docs/catalogo.md` | `tests/unit/data/catalogo.test.ts` |
| M-05, M-11, M-01 | `data/catalogo/*.yaml`, `data/preguntas.yaml`, `data/territorio.yaml`, `tests/fixtures/perfiles.yaml`: las fichas, las preguntas y las provincias | `tests/unit/data/catalogo-real.test.ts` (entre 40 y 60 fichas válidas, toda pregunta usada, cada perfil de referencia con 5 votaciones o más, alguna territorial) |
| M-10 | `scripts/data/jurado-catalogo.ts` (`pnpm data:jurado-catalogo`), `data/jurado/catalogo.json`: deliberación sobre cada ficha | revisión humana: el resumen de la ejecución y `data/jurado/catalogo.json`; cada efecto y cada resumen tienen cinco respuestas con razones, la revisión del conjunto está guardada, y todo lo no aprobado en la primera ronda tiene su segunda ronda, con la ficha corregida según el jurado, descartada o marcada "sin consenso" |
| M-05, M-10 | `src/content.config.ts`, `src/lib/datos.ts`: la web carga el catálogo real y el build falla con una ficha inválida, sin veredicto vigente o con discrepancia del jurado | `tests/unit/data/catalogo.test.ts` |

## Fuera de esta feature

- El cálculo de afinidad, el cuestionario y la lista de votaciones del resultado: feature de la web.
- El explorador del catálogo (S-01) y el peso por temas (S-03).
- Las candidaturas del 29-N (`data/candidaturas/`).
- Que el jurado vote las fechas de los cambios de partido de la herencia (se puede añadir a la misma
  ejecución, pero es otra lista de elementos).
