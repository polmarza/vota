// pnpm data:partidos — valida data/partidos/partidos.yaml contra los diputados descargados y escribe
// data/partidos/diputados-<leg>.json con el partido de cada diputado.
//
// Falla si el archivo de partidos tiene errores. Avisa (sin fallar) de los diputados de coalición
// que aún no tienen partido y de las formaciones que nadie cubre.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { Legislatura } from './congreso.ts';
import {
  esquemaPartidos,
  formacionesSinCubrir,
  pendientesDeAsignar,
  validarPartidos,
  type DiputadoOficial,
} from './partidos.ts';

const DATA = join(import.meta.dirname, '..', '..', 'data');

const datos = esquemaPartidos.parse(parse(await readFile(join(DATA, 'partidos', 'partidos.yaml'), 'utf8')));
const diputados = {
  XIV: JSON.parse(await readFile(join(DATA, 'raw', 'XIV', 'diputados.json'), 'utf8')) as DiputadoOficial[],
  XV: JSON.parse(await readFile(join(DATA, 'raw', 'XV', 'diputados.json'), 'utf8')) as DiputadoOficial[],
};

const errores = validarPartidos(datos, diputados);
if (errores.length) {
  console.log(`partidos.yaml tiene ${errores.length} error(es):`);
  for (const e of errores) console.log(`  ${e}`);
  process.exit(1);
}

const pendientes = pendientesDeAsignar(datos, diputados);
const sinCubrir = formacionesSinCubrir(datos, diputados);

for (const leg of ['XIV', 'XV'] as Legislatura[]) {
  const reglas = datos.partidos.flatMap((p) => (p.herencia[leg] ?? []).map((r) => ({ id: p.id, r })));
  const sinPartido = new Set(datos.sinPartido.filter((s) => s.legislatura === leg).map((s) => s.formacion));
  const sinPartidoPorNombre = new Set(datos.diputadosSinPartido.filter((d) => d.legislatura === leg).map((d) => d.diputado));
  const pendientesLeg = new Set(pendientes.filter((p) => p.legislatura === leg).map((p) => p.nombre));
  const filas = [...new Map(diputados[leg].map((d) => [d.NOMBRE, d])).values()]
    .sort((a, b) => a.NOMBRE.localeCompare(b.NOMBRE, 'es'))
    .map((d) => {
      const porNombre = reglas.filter(({ r }) => r.diputados?.includes(d.NOMBRE));
      const candidatas = porNombre.length ? porNombre : reglas.filter(({ r }) => r.formaciones?.includes(d.FORMACIONELECTORAL));
      const partido = pendientesLeg.has(d.NOMBRE)
        ? 'pendiente'
        : sinPartido.has(d.FORMACIONELECTORAL) || sinPartidoPorNombre.has(d.NOMBRE)
          ? 'sin-partido'
          : ([...new Set(candidatas.map((c) => c.id))].join(',') || null);
      return { nombre: d.NOMBRE, formacion: d.FORMACIONELECTORAL, circunscripcion: d.CIRCUNSCRIPCION ?? '', partido };
    });
  await writeFile(join(DATA, 'partidos', `diputados-${leg}.json`), JSON.stringify(filas, null, 1) + '\n');
  const cuenta = new Map<string, number>();
  for (const f of filas) cuenta.set(String(f.partido), (cuenta.get(String(f.partido)) ?? 0) + 1);
  console.log(`${leg}: ${filas.length} diputados → ${[...cuenta].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${n}`).join(' · ')}`);
}

if (pendientes.length) {
  console.log(`\nDiputados de coalición sin partido asignado (${pendientes.length}):`);
  for (const p of pendientes) console.log(`  ${p.legislatura}  ${p.formacion.padEnd(22)} ${p.nombre} (${p.circunscripcion})`);
}
const conDudas = datos.partidos.flatMap((p) =>
  (['XIV', 'XV'] as const).flatMap((leg) => (p.herencia[leg] ?? []).filter((r) => r.dudas).map((r) => ({ id: p.id, leg, r }))),
);
if (conDudas.length) {
  console.log(`\nAsignaciones con dudas para el jurado (${conDudas.length}):`);
  for (const { id, leg, r } of conDudas) console.log(`  ${leg}  ${id.padEnd(12)} ${(r.diputados ?? r.formaciones ?? []).join('; ')} — ${r.dudas}`);
}
if (sinCubrir.length) {
  console.log('\nFormaciones que no cubre ninguna regla:');
  for (const s of sinCubrir) console.log(`  ${s.legislatura}  ${s.formacion} (${s.diputados} diputados)`);
}
