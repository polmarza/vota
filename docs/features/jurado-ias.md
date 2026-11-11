# Jurado de IAs

**Estado:** Verificada
**Requisitos que cierra:** M-10
**Fecha de acuerdo:** 2026-10-27

Verificada el 11-11-2026: `tests/unit/data/jurado.test.ts` pasa, y las deliberaciones sobre la herencia
(`data/jurado/herencia.json`) y el catálogo (`data/jurado/catalogo.json`) están guardadas con sus
rondas y su historial.

## Qué se construye

La herramienta que somete el trabajo editorial de Claude a cinco modelos de cinco empresas
distintas, como pide M-10. `pnpm data:jurado` se lanza en local desde la terminal: envía cada
elemento a revisar a los cinco jueces a través de OpenRouter, con el mismo prompt, y guarda en
`data/jurado/` el veredicto de cada uno (de acuerdo, en desacuerdo o no lo sabe), sus razones, el
modelo exacto, la fecha, el prompt y un hash del elemento revisado. Si el elemento cambia, su
veredicto caduca.

Se estrena con la **herencia de partidos** (`data/partidos/partidos.yaml`): cada regla de
asignación, cada diputado sin partido y la regla general. Después revisará las fichas del catálogo
con el mismo mecanismo; eso, y hacer que el build falle sin veredicto vigente, va con la feature
del catálogo.

## Decisiones tomadas

- **Jueces**, fijados en `docs/architecture.md` el 26-10-2026: `openai/gpt-6.1-sol`,
  `google/gemini-4-argon`, `mistralai/mistral-large-4-0`, `deepseek/deepseek-v4-pro-0813` y
  `x-ai/grok-4.7`. Claude no es juez porque es quien propone.
- **Pregunta a ciegas, diputado a diputado:** a cada juez se le pregunta "¿de qué partido era esta
  persona cuando votó en esta legislatura?" sin decirle qué ha asignado Claude, y su respuesta se
  compara después con la asignación. Para las formaciones de un solo partido (PSOE, PP, ERC…) la
  pregunta es por la lista: "¿de qué partido son los elegidos en la lista X?". Unos 120 elementos.
- **Contexto suficiente:** los jueces no navegan, así que cada pregunta lleva todo lo necesario:
  la regla general (el partido de cuando votó; partidos que no concurren e independientes no cuentan
  para nadie), lista electoral, circunscripción, grupos con fechas, fechas de alta y baja y la
  biografía del Congreso, más la lista cerrada de partidos posibles, "ninguno" y "no lo sé". Las
  dudas se exponen como preguntas abiertas, sin sugerir la respuesta de Claude.
- **Aprobación:** un elemento queda aprobado si al menos 3 jueces dan la misma respuesta que la
  asignación. "No lo sé", otra respuesta o un juez sin respuesta no cuentan como acuerdo. Un juez
  que falla o devuelve un formato inválido se reintenta 2 veces.
- **Segunda ronda:** lo que no se aprueba vuelve a los cinco jueces con las respuestas y razones de
  la primera ronda, anónimas. Si al menos 3 coinciden en un partido, esa es la asignación (Claude
  corrige `partidos.yaml` con lo que diga el jurado, aunque contradiga su propuesta). Si no hay
  consenso, los votos de ese diputado no se atribuyen a nadie y el caso se publica como "sin
  consenso".
- **Presupuesto:** Pol ha limitado la cuenta de OpenRouter a 50 $. El script lleva la cuenta del
  coste que devuelve OpenRouter y se para al superar 10 $ por ejecución (`--presupuesto`).
- **Respuesta estructurada** (`response_format` con esquema JSON) y temperatura baja donde el
  modelo lo admita, para que el veredicto sea comparable y repetible.
- **La clave** se lee de `.env.local` (`OPENROUTER_API_KEY`) con `process.loadEnvFile`; nunca se
  imprime ni va en argumentos.
- **Caché:** un elemento cuyo hash no ha cambiado y ya tiene los cinco veredictos no se vuelve a
  enviar, salvo con `--forzar`. Si el hash cambia, el veredicto anterior se conserva en
  `historial`.

## Resultado de la primera deliberación (27-10-2026)

122 elementos, 4,19 $. Aprobados 102, decididos por el jurado en contra de la propuesta 12 y sin
consenso 8. Aplicados a `partidos.yaml`: 10 decisiones (Bueno Pinto y Roselló → IU; Cortés, López
Domínguez, García Puig y Márquez → Podemos; Mena → Comuns; Andala → Más Madrid; Alonso-Cuevillas y
Santos Maraver → sin partido) y 7 diputados de la XV sin consenso, que pasan a sin partido.

**Sin aplicar, pendientes de Pol**, porque el fallo está en la pregunta, no en el criterio del jurado:

- **EH Bildu (XIV y XV) → "ninguno".** Los jueces aplicaron la regla "en una coalición cuenta el
  partido concreto" y respondieron Sortu, Alternatiba o EA. Pero EH Bildu está inscrita como
  federación desde 2017 y es quien concurre el 29-N; aplicarlo dejaría a EH Bildu sin historial.
- **ERC-S (XIV) sin consenso.** Se preguntó por la lista entera y dentro iba Nuet (Sobiranistes);
  la pregunta debía ser diputado a diputado.
- **Cambios a mitad de legislatura.** Se preguntó por el partido al empezar a votar; Alonso-Cuevillas
  entró en Junts en julio de 2020 y sus votos posteriores no se han preguntado.

## Segunda deliberación (27-10-2026)

Para corregir esos tres fallos se cambiaron las preguntas: la regla distingue entre coalición
electoral y partido o federación con afiliación propia; ERC-S se pregunta diputado a diputado; y
se añade una pregunta por el partido en la última votación, para los diputados de coalición, los
que cambiaron de grupo y los que tienen una regla con fechas. 256 elementos, 9,96 $. Aprobados 225,
decididos 17 y sin consenso 14. EH Bildu queda aprobada en las dos legislaturas.

Aplicado a `partidos.yaml`:

- **Cambios a mitad de legislatura.** Cuando el partido inicial y el final difieren, se escriben
  reglas con fechas, y el mes del cambio no cuenta para nadie: Alonso-Cuevillas (ninguno → Junts,
  julio de 2020), Sayas (UPN → ninguno → PP, diciembre de 2022), Errejón (Más Madrid → Sumar,
  noviembre de 2023), Gil de Reboleño (IU → Sumar) y Santos Maraver (ninguno → Sumar), estos dos en
  marzo de 2024. Cambronero, Fernández-Roca y Fuentes Curbelo dejan de contar el día que salen de su
  partido. Ortega Smith cuenta para Vox mientras vota desde su grupo. **El jurado fijó los
  partidos, no las fechas:** los meses salen de sus razones y llevan `dudas`.
- **Otras decisiones:** Fernández Pérez → CC; Martínez Barbero → Sumar; Alonso Cantorné → Comuns.
- **Sin consenso → sin partido:** Cortés, Pérez Merino, Martín Urriza y Cofiño. También Medel
  Pérez: el jurado la sitúa en IU al empezar, pero no hay consenso sobre su partido al final y no
  consta ningún cambio.
- Votos sin partido: XIV 3,8 % (antes 2,7 %) y XV 1,6 % (antes 0,6 %).

**Inestabilidad.** Entre las dos deliberaciones cambian los casos dudosos de Sumar y de Unidas
Podemos (Cortés: Podemos y después sin consenso; Gil de Reboleño: sin consenso y después IU). Los
jueces no navegan, y en los diputados poco conocidos algún modelo afirma militancias que los demás
no confirman.

**Historial (28-10-2026).** Cuando un elemento cambia, su veredicto caduca pero no se borra:
`deliberar` lo pasa a `historial`, de más antiguo a más reciente. La primera deliberación se
recuperó en `herencia.json` desde la copia: 121 elementos la llevan en su historial. El registro
`XIV:lista:ERC-S` sigue en el archivo como constancia, aunque ese elemento ya no se pregunta.

## Cobertura

| Requisito | Se implementa en | Se valida con |
|-----------|------------------|---------------|
| M-10 | `scripts/data/jurado.ts`: cliente de OpenRouter, prompt, respuesta estructurada, reintentos, caché por hash y recuento de mayoría | `tests/unit/data/jurado.test.ts` |
| M-10 | `scripts/data/jurado-herencia.ts`, `data/jurado/herencia.json`: deliberación sobre la herencia de partidos, en una o dos rondas | revisión humana: el resumen de `pnpm data:jurado` y `data/jurado/herencia.json`; cada elemento tiene cinco respuestas con razones, y todo elemento no aprobado en la primera ronda tiene su segunda ronda, con `partidos.yaml` corregido según el jurado o el caso marcado "sin consenso" |

## Fuera de esta feature

- Revisar las fichas del catálogo y bloquear el build sin veredicto vigente: feature del catálogo.
- Publicar los veredictos y discrepancias en "Cómo funciona": feature de la web (M-07).
- Que el jurado proponga asignaciones para diputados que no están en `partidos.yaml`.
