# Product

<!-- impeccable:product-schema 1 -->

> Escrito sin entrevista: lo redactó un subagente a partir del brief de diseño
> (`brief-diseno.md`), `docs/prd.md` y `docs/design-system.md`. Todo lo de aquí sale de esas
> fuentes; lo que es inferencia va marcado como **[inferido]**.

## Platform

web

## Users

Cualquier persona con derecho a voto en las elecciones generales españolas del 29 de noviembre de
2026, sin conocimientos políticos ni técnicos. Llega desde redes, la newsletter Con Criterio o un
enlace compartido, casi siempre desde el móvil, y dedica unos cinco minutos. Muchos no tienen
interés por la política. Persona del PRD: Laura, 34 años, Valencia, alquila, trabaja por cuenta
ajena, un hijo de tres años; vota pero ya no se fía de lo que se promete en campaña.

## Product Purpose

A partir de preguntas anónimas sobre la vida de la persona (provincia, vivienda, trabajo, edad,
ingresos, hijos, cuidados, transporte; y un bloque ampliado), cruza su perfil con una selección de
votaciones del Congreso de las legislaturas XIV y XV (2019-2026) que le afectan y le enseña qué
partidos votaron a su favor y cuáles en su contra, con cada votación enlazada a la fuente oficial.
Éxito: la persona termina el test, entiende por qué sale cada partido y puede comprobarlo.

## Positioning

Lo que prometen los partidos no compromete; lo que votan queda registrado. No pregunta opiniones
(como los tests de afinidad), pregunta situaciones, y responde con hechos verificables: votos
nominales del Congreso. Lema: «Las promesas vuelan. Los votos se quedan.»

## Operating Context

Móvil primero (375 px), sesión corta, a menudo entre otras pestañas de redes. Cuestionario de 8
preguntas básicas y 4 ampliadas, resultado provisional y final, lista de votaciones con enlace al
Congreso. Sitio estático (Astro), sin cuentas, sin servidor de respuestas.

## Capabilities and Constraints

- Neutralidad no negociable: ningún color de interfaz asociable a un partido (rojo, azul, verde,
  morado, naranja, magenta…); el color se reserva para identificar a cada partido con su color
  oficial (`data/partidos/partidos.yaml`). Nunca el morado de Con Criterio.
- Sin fotos de políticos, logos de partidos, banderas ni hemiciclo coloreado por bloques. Una foto
  del Congreso, de papeletas o de urnas sin personas reconocibles sí vale.
- No es una recomendación de voto: nada de "tu partido ideal", "match", ganadores ni confeti.
- Las respuestas no salen del navegador: sin cookies, sin registro, sin analítica de respuestas.
- Los votos de cada partido salen siempre de los datos abiertos del Congreso, nunca escritos a mano.
- Todo el texto en español.

## Brand Commitments

- Nombre: Vota con Criterio (`vota.concriterio.blog`), proyecto de Con Criterio, firmado por Pol
  Marzà. Código abierto.
- La metodología está a la vista: Claude selecciona y etiqueta, un jurado de cinco modelos de otras
  empresas revisa, Pol no interviene en las etiquetas.
- El aspecto actual (blanco y negro, Instrument Serif con cursivas, Inter) es el incumbente; en un
  rediseño es evidencia, no autoridad. **[inferido]**

## Evidence on Hand

- Votaciones reales con fecha, título, resumen, efecto y voto por partido en `data/catalogo/` y la
  web en local.
- Resultado de ejemplo real (estudiante de alquiler en Madrid): «Basado en 23 de las 31 votaciones
  que podrían afectarte», Más Madrid 100 % (9 de 9), Sumar 100 % (9 de 9), IU 95 % (19 de 20);
  Vox 80 % (16 de 20), PP 65 % (13 de 20), Cs 64 % (7 de 11).
- No hay testimonios, cifras de uso ni prensa: no se inventan.

## Product Principles

1. El dato manda: cada afirmación lleva su votación y su enlace.
2. Neutral por construcción: ningún recurso visual puede leerse como guiño a un partido.
3. Tu vida, no tu opinión: se pregunta por situaciones, no por ideas.
4. Nada sale del navegador.
5. Comprensible para quien no sigue la política. **[inferido de "muchos sin interés por la política"]**

## Accessibility & Inclusion

Contraste WCAG AA, foco visible, controles de 16 px mínimo (zoom de iOS), los partidos nunca se
identifican solo por color (siempre con nombre), movimiento desactivable con
`prefers-reduced-motion`.
