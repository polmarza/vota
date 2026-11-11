# Ingesta de datos del Congreso

**Estado:** Verificada

Verificada el 28-10-2026. Queda volver a comprobar antes del lanzamiento si el Congreso ha publicado
el JSON de las 14 votaciones de la XV que solo tienen gráfico.
**Requisitos que cierra:** M-06
**Fecha de acuerdo:** 2026-10-26

## Qué se construye

El pipeline local que trae del Congreso todo lo necesario para saber qué votó cada partido en las
legislaturas XIV y XV, sin escribir un solo voto a mano. Tres pasos que se lanzan desde la
terminal: `pnpm data:ingesta` descarga las votaciones nominales (el voto de cada diputado) y la
lista de diputados con la formación por la que se presentaron; `pnpm data:partidos` construye la
correspondencia diputado → partido a partir de la herencia definida en `data/partidos/`;
`pnpm data:votos` calcula, para cada votación y partido, el sentido de su voto, si votó dividido y
el desglose.

Cuando esto exista, cualquier ficha del catálogo podrá apuntar a una votación oficial y obtener
automáticamente el voto de cada partido, y cualquiera podrá repetir el cálculo desde cero.

Es la primera feature con código, así que también deja montado el proyecto Node + TypeScript
(`package.json`, `tsconfig`, Vitest) que reutilizarán las siguientes. Astro se instala en la
feature de la web, no aquí.

## Decisiones tomadas

- **Fuente verificada el 26-10-2026.** Las votaciones nominales están en JSON por votación en
  `congreso.es/webpublica/opendata/votaciones/Leg{14|15}/Sesion{NNN}/{AAAAMMDD}/Votacion{NNN}/VOT_*.json`,
  con `informacion` (sesión, número, fecha, título, expediente, subgrupo), `totales` (presentes, a
  favor, en contra, abstenciones, no votan) y `votaciones` (asiento, diputado "Apellidos, Nombre",
  grupo, voto). Las rutas no son predecibles (llevan hora): se obtienen de la página de votaciones
  de cada día (`?targetLegislatura=XV&targetDate=DD/MM/AAAA`).
- **Diputados:** `odsDiputados14__*.json` para la XIV y `DiputadosActivos` + `DiputadosDeBaja`
  para la XV, con `FORMACIONELECTORAL`, `GRUPOPARLAMENTARIO` y fechas de alta y baja. Se cruzan con
  las votaciones por el nombre ("Apellidos, Nombre").
- **La XV ya está cerrada:** las bajas del 6-10-2026 confirman la disolución de las Cortes. No
  habrá más votaciones que añadir.
- **El grupo de cada voto cuenta para la herencia:** el JSON de cada votación trae el grupo del
  diputado en ese momento, lo que permite separar, por ejemplo, a los diputados de Podemos elegidos
  en la lista de Sumar cuando votan desde el grupo Mixto.
- **Descarga educada:** peticiones en serie con pausa entre ellas y caché local: lo ya descargado
  no se vuelve a pedir.
- **Sesión del 2-10-2026 sin JSON:** sus dos votaciones (entre ellas la convalidación del Real
  Decreto-ley 26/2026 de vivienda, derogado por 172 a 178) solo tienen un gráfico de totales. Se
  vuelve a comprobar si el Congreso publica el JSON antes del lanzamiento; si no, quedan fuera del
  catálogo. No se reconstruyen votos a mano.
- **Calendario de sesiones:** la página de votaciones de cada legislatura incluye la lista
  completa de días con votaciones (152 en la XV). Se lee de ahí; no se prueban días a ciegas.
- **Se descargan todas las votaciones** de la XIV y la XV, no solo las del catálogo: la selección
  del catálogo se hace mirando el conjunto completo. Se guardan compactadas (un archivo por sesión,
  sin espacios); si el total supera ~100 MB, se comprimen antes de entrar al repositorio.
- **Coincidencia por nombre comprobada:** en cinco votaciones de muestra (XIV 2021, XV 2026), los
  350 nombres de cada una coinciden exactamente con la lista de diputados. La fila 4 lo comprueba
  sobre todas las votaciones y falla si aparece un nombre sin diputado.
- **Partidos a nivel individual:** la herencia se define por partido (Podemos, IU, Compromís, Más
  Madrid, Comuns, BNG…), no por coalición, porque los diputados votan como miembros de su partido.
  Como el Congreso solo da la formación de la lista ("SUMAR", "UP"), la asignación de cada diputado
  elegido en una coalición a su partido se escribe a mano en `data/partidos/` con su fuente, y la
  revisará el jurado en su feature (M-10). Si el 29-N un partido concurre en coalición en alguna
  provincia, se sigue mostrando como partido individual.
- **Votaciones por asentimiento** (sin voto nominal): se registran marcadas como tales y sin voto
  por partido; no pueden entrar en el catálogo. **Votaciones conjuntas:** se guardan todos los
  expedientes que agrupa la votación.
- **Votaciones secretas** (p. ej. suplicatorios, XV sesión 202 votación 21): el JSON trae los
  totales pero ninguna lista nominal. Se guardan marcadas como `secreta` y no pueden entrar en el
  catálogo.
- **"No vota" incompletos:** el Congreso no siempre lista a todos los que no votaron (XIV sesión 6
  votación 1: 34 en la lista frente a 37 en los totales). Sí, no y abstención tienen que cuadrar
  exactamente; los "no vota" de la lista pueden ser menos que los del total, nunca más.
- **Diputados sin grupo:** al principio de la XIV hay diputados que votan sin grupo asignado (p. ej.
  Medel Pérez y Pita Cárdenes en febrero de 2020). Se guarda tal cual; el partido sale de su
  formación electoral, no del grupo.
- **User-Agent:** el Congreso devuelve 403 a cualquier cliente que no se presente como navegador,
  incluido uno que se identifica como `vota-con-criterio`. Pol autorizó usar `Mozilla/5.0` con la
  pausa entre peticiones. Claude Code bloquea ejecutar la descarga desde el agente, así que la
  lanza Pol en su terminal.
- **Nombres que no casan:** en toda la XV solo uno ("Cuesta Rodríguez, María del Socorro" en las
  votaciones frente a "Cuesta Rodríguez, María" en su ficha). Se resuelve con `alias` en
  `partidos.yaml`, no tocando los datos brutos.
- **Votos sin partido** tras asignar la herencia y las decisiones del jurado: 3,8 % en la XIV y 1,6 % en la XV, todos
  intencionados (PDeCAT, Equo, Foro, Navarra Suma tras romper con UPN, Pita y Ábalos en el Mixto,
  independientes y casos sin consenso del jurado).
- **Voto de partido** (`pnpm data:votos`, 28-10-2026): se calcula para todas las votaciones, no
  solo las del catálogo. Un partido sin diputados en una votación no aparece en ella (no es
  "ausente"). Cuando las dos opciones más votadas por sus diputados empatan, el sentido es
  `empate`: 164 en la XIV y 230 en la XV, casi todos de partidos de dos diputados (CUP, UPN, CC y,
  en la XV, Compromís con Ibáñez y Micó en grupos distintos). Los "ausentes" de Vox y del PRC en la
  XIV (unos 1.900 y 2.400) se concentran en las sesiones de enmiendas a los Presupuestos de 2020,
  2021 y 2022, en las que no votaron.
- **Errores de descarga:** hasta 3 reintentos con espera creciente. Un JSON se da por bueno si se
  puede leer y la suma de votos de sus diputados coincide con sus totales; si no, se reintenta. Lo
  que siga fallando se lista al final y la siguiente ejecución lo vuelve a intentar.

## Cobertura

| Requisito | Se implementa en | Se valida con |
|-----------|------------------|---------------|
| M-06 | `package.json`, `scripts/data/ingesta.ts`: calendario de sesiones, descarga y lectura de los JSON de votaciones y diputados | `tests/unit/data/ingesta.test.ts` |
| M-06 | `scripts/data/partidos.ts`, `data/partidos/partidos.yaml`: herencia por legislatura y correspondencia diputado → partido | `tests/unit/data/partidos.test.ts` |
| M-06 | `scripts/data/votos.ts`: voto por partido (mayoría de presentes, dividido, desglose, ausente) | `tests/unit/data/votos.test.ts` |
| M-06 | `data/raw/`, `data/votos/`: ejecución sobre los datos reales de la XIV y la XV | `tests/unit/data/datos-reales.test.ts` |

## Fuera de esta feature

- Elegir y etiquetar las votaciones del catálogo (fichas, efectos, justificaciones): feature del
  catálogo (M-05, M-11).
- El jurado de IAs (M-10).
- Las candidaturas del 29-N (`data/candidaturas/`) y la web.
- Votaciones del Senado y de legislaturas anteriores a la XIV.
