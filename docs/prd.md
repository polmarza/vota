# Product Requirements Document (PRD)

<!-- Fuente de verdad sobre qué construimos y por qué.
     Actualizar este archivo cuando cambie el alcance, las funcionalidades o el usuario objetivo.
     Si algo se mueve a "fuera de alcance", no borrar: mover a la sección correspondiente. -->

---

## Resumen ejecutivo

**Vota con Criterio** (en `vota.concriterio.blog`) es una web que te dice a qué
partido te convendría votar en las elecciones generales según **lo que cada partido ha votado de
verdad en el Congreso**, no según lo que promete en su programa.

Respondes preguntas anónimas sobre tu situación (vivienda, trabajo, ingresos,
provincia, hijos, personas a cargo…). La web cruza tu perfil con una selección de votaciones de las
dos últimas legislaturas (XIV y XV) que afectan a personas como tú, incluidas las que afectan
solo a tu comunidad autónoma, y te devuelve los partidos que más te han favorecido y los que más
te han perjudicado, con las votaciones que lo explican, enlazadas a la fuente oficial.

Existe ahora porque hay elecciones generales el 29 de noviembre de 2026 y porque los programas
electorales no se cumplen. Lo firma Pol Marzà bajo el paraguas de Con Criterio, con la metodología
a la vista. La selección y el etiquetado de las votaciones los hace Claude y los revisa un jurado
de modelos de IA de otras empresas, para que no dependan del criterio político de nadie en
particular. Está pensado para crecer: en cada nueva convocatoria se añade la legislatura que acaba.

---

## Problema que resuelve

Decidir el voto con información fiable es difícil. Los programas electorales son promesas que a
menudo no se cumplen, los debates hablan de grandes temas y no de tu caso, y consultar las
votaciones del Congreso a mano es inviable: hay miles por legislatura, con títulos técnicos y sin
explicar a quién afectan.

Los tests de afinidad que existen preguntan por tus opiniones ("¿estás de acuerdo con…?") y las
comparan con lo que dicen los partidos. Nadie te dice qué ha hecho cada partido con las leyes que
te tocan a ti.

---

## Usuario objetivo

Cualquier persona con derecho a voto en las generales, sin conocimientos políticos ni técnicos
especiales. Entra desde redes, la newsletter de Con Criterio o un enlace compartido, casi siempre
desde el móvil, y dedica unos cinco minutos.

**Persona: Laura, 34 años, Valencia.** Alquila un piso, trabaja por cuenta ajena y tiene un hijo de
tres años. Vota, pero cada vez duda más y no se fía de lo que dicen en campaña.
- *Motivación:* saber qué partido ha defendido de verdad a gente en su situación.
- *Frustración que resuelve:* no tiene tiempo de leerse programas ni el Diario de Sesiones, y no se
  cree lo que prometen.

---

## Funcionalidades core (MoSCoW)

### MUST

- **[M-01] Cuestionario en dos bloques** — Dado un visitante en la portada, cuando pulsa
  "Empezar" y responde el bloque básico (unas 10 preguntas: provincia, vivienda, situación
  laboral, tramo de ingresos, edad, hijos, personas dependientes o con discapacidad a cargo…),
  entonces llega al resultado provisional (M-12). Desde ahí puede seguir con el bloque ampliado
  (las preguntas que hagan falta para cubrir el resto del catálogo) y llegar al resultado final
  (M-03). Cada pregunta existe porque al menos una votación del catálogo depende de ella; no se
  pregunta nada que no se use.
  *Negativo:* dado un visitante que no ha respondido la provincia, cuando intenta avanzar,
  entonces ve un aviso de que esa pregunta es obligatoria y no avanza. El resto de preguntas admite
  "Prefiero no responder".

- **[M-12] Resultado provisional** — Dado un visitante que ha terminado el bloque básico, cuando
  avanza, entonces ve los dos podios (favorables y desfavorables) marcados como provisionales,
  calculados igual que en M-03 con las respuestas que tiene, con la proporción del catálogo que ya
  cubre ("basado en 14 de las 41 votaciones que podrían afectarte"), un botón para compartirlo y
  otro para seguir con el bloque ampliado sin perder sus respuestas.
  *Negativo:* dado un visitante en el resultado provisional, cuando lo comparte, entonces la imagen
  indica que es provisional.

- **[M-02] Partidos según tu circunscripción** — Dado un visitante que ha elegido una provincia,
  cuando ve el resultado, entonces solo aparecen los partidos que se presentan en esa provincia el
  29 de noviembre de 2026 y que tienen historial de votaciones en el Congreso en la XIV o la XV.
  *Negativo:* dado un visitante de Madrid, cuando ve el resultado, entonces no aparecen partidos
  que solo concurren en otras comunidades (p. ej. PNV, BNG o CC).
  *Negativo:* dado un partido que ya no se presenta (p. ej. Ciudadanos, si no concurre) o que se
  presenta por primera vez, cuando se muestra el resultado, entonces no aparece.

- **[M-03] Podio favorable y desfavorable** — Dado un perfil completo, cuando el visitante envía
  el cuestionario, entonces ve en una sola pantalla el podio de los 3 partidos cuyas votaciones
  más han favorecido a su perfil y, por separado, los 3 que más lo han perjudicado, cada uno con
  su color, su logo y su nombre. El porcentaje del podio favorable es la proporción de votaciones
  que afectan al perfil en las que el partido votó a su favor ("18 de 23 = 78%"); el del
  desfavorable, la proporción en las que votó en su contra. Los porcentajes no suman 100.
  *Negativo:* dado un perfil al que afectan menos de 5 votaciones del catálogo, cuando se calcula,
  entonces se muestra un aviso de que no hay datos suficientes en lugar del podio.
  *Negativo:* dada una provincia donde se presentan menos de 6 partidos con historial, cuando se
  muestra el resultado, entonces ningún partido aparece a la vez en los dos podios.

- **[M-04] Votaciones que explican tu resultado** — Dado un resultado, cuando el visitante baja
  por debajo de los podios, entonces ve la lista de votaciones que afectan a su perfil: título en
  lenguaje claro, fecha, por qué le afecta, qué votó cada partido y un enlace a la votación en la
  web del Congreso.

- **[M-05] Catálogo de votaciones curado** — Dado el catálogo publicado, cuando se revisa cualquier
  votación, entonces tiene: identificador oficial del Congreso, legislatura, fecha, título oficial,
  resumen en lenguaje claro, perfiles a los que afecta, si les favorece o les perjudica, y una
  justificación de esa etiqueta. Primera versión: 40–60 votaciones de las legislaturas XIV y XV.
  *Negativo:* dada una votación sin justificación o sin enlace oficial, cuando se genera la web,
  entonces la generación falla y la votación no se publica.

- **[M-11] Votaciones territoriales** — Dada una votación del catálogo que afecta solo a una o
  varias comunidades autónomas (financiación, deuda, inversiones, competencias…), cuando un
  visitante de una de esas comunidades ve su resultado, entonces esa votación cuenta en su
  puntuación y aparece en su lista. La etiqueta indica, para cada comunidad afectada, si le
  favorece o le perjudica.
  *Negativo:* dado un visitante de una comunidad a la que la votación no afecta según su
  etiqueta, cuando ve su resultado, entonces esa votación no cuenta ni aparece.

- **[M-06] Votos por partido sacados de los datos oficiales** — Dada una votación del catálogo,
  cuando se generan los datos, entonces el voto de cada partido (a favor, en contra, abstención)
  se calcula a partir del voto nominal de sus diputados en los datos abiertos del Congreso, no del
  grupo parlamentario, y no se escribe a mano. El voto del partido es el que emitió la mayoría de
  sus diputados presentes.
  *Negativo:* dado un partido cuyos diputados votaron dividido, cuando se muestra esa votación,
  entonces aparece marcado como "voto dividido" con el desglose.

- **[M-07] Metodología pública** — Dado cualquier visitante, cuando entra en "Cómo funciona",
  entonces ve explicado cómo se eligen las votaciones, cómo se etiquetan, cómo se calcula la
  puntuación, qué limitaciones tiene, por qué no aparecen los partidos nuevos o sin historial y
  quién lo firma, con enlace al catálogo completo.

- **[M-08] Anonimato total** — Dado un visitante que responde el cuestionario, cuando ve el
  resultado, entonces ninguna de sus respuestas se ha enviado a ningún servidor: el cálculo ocurre
  en su navegador y no hay registro, cookies de seguimiento ni analítica que reciba respuestas.

- **[M-09] Aviso de alcance** — Dado un resultado, cuando se muestra, entonces aparece visible un
  aviso de que es una herramienta orientativa basada solo en votaciones del Congreso, que no tiene
  en cuenta ideología ni programas y que no es una recomendación de voto.

- **[M-10] Revisión por un jurado de IAs** — Dado el catálogo etiquetado (selección y etiquetas
  hechas por Claude, sin intervención editorial de Pol), cuando se prepara la publicación,
  entonces cada votación ha sido revisada por al menos 3 modelos de empresas distintas, que
  valoran si la etiqueta es correcta y neutral, y su veredicto queda guardado junto a la votación.
  *Negativo:* dada una votación en la que la mayoría del jurado discrepa de la etiqueta, cuando se
  genera la web, entonces no se publica hasta que se corrige o se descarta, y la discrepancia
  queda registrada en la metodología.

### SHOULD

- **[S-01] Explorador del catálogo** — Dado cualquier visitante, cuando entra en el catálogo,
  entonces puede ver todas las votaciones con el voto de cada partido y filtrarlas por tema y por
  legislatura.
- **[S-02] Compartir el resultado** — Dado un resultado, cuando el visitante pulsa "Compartir",
  (icono arriba a la derecha), entonces se genera una imagen descargable con los dos podios que no
  incluye ninguna de sus respuestas, y en móvil se abre el menú de compartir del sistema.
- **[S-03] Dar más peso a lo que te importa** — Dado el final del cuestionario, cuando el visitante
  marca qué temas le importan más (vivienda, empleo, familia, fiscalidad…), entonces las
  votaciones de esos temas pesan el doble en su puntuación y el resultado lo indica.

### COULD

- **[C-01] Comparar dos partidos** — Dado un resultado, cuando el visitante elige dos partidos,
  entonces ve lado a lado cómo votó cada uno en las votaciones que le afectan.
- **[C-02] Otras lenguas cooficiales** — Dado un visitante, cuando cambia el idioma a catalán,
  gallego o euskera, entonces toda la interfaz y el catálogo se muestran en esa lengua.

### WON'T (esta versión)

- Senado, parlamentos autonómicos ni elecciones municipales o europeas.
- Legislaturas anteriores a la XIV.
- Programas electorales o declaraciones de los partidos.
- Cuentas de usuario, guardar respuestas o historial.
- Encuesta o estimación de voto agregada.

---

## Flujos de usuario principales

**Hacer el test:** el visitante llega a la portada, lee en una frase qué hace la web y por qué es
distinta, y pulsa "Empezar". Responde las preguntas de una en una, con barra de progreso y la
opción "Prefiero no responder" donde aplica. Tras el bloque básico ve un resultado provisional
que puede compartir; si sigue con el bloque ampliado, llega al resultado final: dos podios con los
partidos de su provincia, los 3 que más le han favorecido y los 3 que más le han perjudicado, con
el aviso de alcance.

**Entender el resultado:** bajo los podios ve las votaciones que afectan a su perfil, por qué le
afectan y qué votó cada partido. Desde cualquier votación puede ir a la fuente oficial del
Congreso.

**Comprobar la metodología:** desde la portada o el resultado entra en "Cómo funciona", lee cómo se
ha hecho y puede recorrer el catálogo completo.

---

## Requisitos no funcionales

- **Móvil primero:** usable de principio a fin en un móvil de 360 px de ancho.
- **Rendimiento:** web estática; la portada carga en menos de 2 s en 4G.
- **Accesibilidad:** WCAG 2.1 AA (contraste, navegación por teclado, lector de pantalla en el
  cuestionario).
- **Privacidad:** ningún dato del cuestionario sale del navegador (ver M-08).
- **Neutralidad verificable:** cada etiqueta del catálogo es trazable hasta su fuente y su
  justificación; el código y el catálogo son públicos.
- **SEO y redes:** título, descripción e imagen Open Graph cuidados; el tráfico llega compartido.
- **Fecha límite:** las elecciones son el 29 de noviembre de 2026. La web debe estar en
  producción antes del inicio de la campaña (13 de noviembre). Antes del 24 de noviembre se
  confirma que no entra en la prohibición de publicar sondeos de los cinco días previos (LOREG,
  art. 69).

---

## Fuera de alcance (explícito)

- Senado: decidido centrarse en el Congreso en la primera versión.
- Más de dos legislaturas: se añadirán en convocatorias futuras.
- Valorar ideología u opiniones del usuario: se pregunta por su situación, no por lo que piensa.
- Backend o base de datos en servidor: todo se calcula en el navegador.
