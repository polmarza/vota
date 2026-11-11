# Backlog de mejoras

<!-- Ideas de mejora que no entran en el sprint actual pero que no queremos perder.
     No es un compromiso, es un repositorio de ideas.
     Añadir una entrada cada vez que surja una idea durante el desarrollo. -->

---

## Formato de entrada

```
### [MEJORA-XX] Título de la idea
**Área:** Frontend / Backend / UX / Infraestructura / Negocio
**Prioridad estimada:** Alta / Media / Baja
**Origen:** De dónde salió la idea (conversación, feedback de usuario, etc.)

Descripción breve de la mejora y por qué aportaría valor.
```

---

### [MEJORA-01] Añadir la XII legislatura (2016-2019) al catálogo
**Área:** Datos / Neutralidad
**Prioridad estimada:** Media
**Origen:** Conversación con Pol (11-11-2026), tras el veredicto "desequilibrado" del jurado sobre el conjunto.

Con la XII entrarían votaciones bajo un Gobierno del PP (hasta junio de 2018) y otro del PSOE, y el
"sí" dejaría de seguir siempre la agenda del mismo bloque, que es la objeción principal del jurado.
Comprobado el 11-11-2026: los datos abiertos de la XII (96 días, del 27-09-2016 al 28-02-2019) tienen
el mismo formato JSON y la ingesta actual los lee sin cambios; también existe `odsDiputados12`. El
trabajo está en la herencia (unos 72 diputados de las coaliciones de Unidos Podemos y decidir si CDC
cuenta como Junts) y en 20-25 fichas nuevas con su jurado (unos 10-15 $ en total). La X (2011-2015)
quedaría para después: Vox, Podemos, Cs y Sumar no existían en el Congreso.
