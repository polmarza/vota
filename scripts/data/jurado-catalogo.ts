// pnpm data:jurado-catalogo — el jurado de IAs revisa, a ciegas, las fichas de data/catalogo/.
//
//   pnpm data:jurado-catalogo                   revisa todo lo pendiente (primera y segunda ronda)
//   pnpm data:jurado-catalogo --limite 2        solo los dos primeros elementos pendientes
//   pnpm data:jurado-catalogo --solo XV-49-19   solo los elementos cuyo id empieza así
//   pnpm data:jurado-catalogo --presupuesto 5   para al gastar 5 $ en esta ejecución (por defecto, 10)
//   pnpm data:jurado-catalogo --forzar          vuelve a preguntar aunque ya haya veredicto
//
// Tres tipos de elemento (docs/catalogo.md, apartado 4):
//   <ficha>:efecto:<n>   para quien cumple la condición, ¿el Sí le favorece, le perjudica o no le afecta?
//   <ficha>:fidelidad    ¿el resumen y "qué significa el sí" describen bien la iniciativa?
//   catalogo:conjunto    ¿la selección está equilibrada?
// Los jueces no ven la etiqueta de Claude ni el voto de ningún partido. Los veredictos se guardan en
// data/jurado/catalogo.json. Necesita OPENROUTER_API_KEY en .env.local.

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { construirElementos } from './elementos-catalogo.ts';
import { clienteOpenRouter, deliberar, evaluar, type Registro } from './jurado.ts';

const RAIZ = join(import.meta.dirname, '..', '..');
const DATA = join(RAIZ, 'data');
const SALIDA = join(DATA, 'jurado', 'catalogo.json');

const { values: args } = parseArgs({
  options: {
    limite: { type: 'string' },
    solo: { type: 'string' },
    presupuesto: { type: 'string', default: '10' },
    forzar: { type: 'boolean', default: false },
  },
});

try {
  process.loadEnvFile(join(RAIZ, '.env.local'));
} catch {
  // Sin .env.local: la clave puede venir del entorno del shell.
}
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.log('Falta OPENROUTER_API_KEY en .env.local o en el entorno.');
  process.exit(1);
}

let elementos = construirElementos();
if (args.solo) elementos = elementos.filter((e) => e.id.startsWith(args.solo!));
const previos: Registro[] = existsSync(SALIDA) ? JSON.parse(await readFile(SALIDA, 'utf8')) : [];

console.log(`Catálogo: ${elementos.length} elementos para el jurado.`);
await mkdir(join(DATA, 'jurado'), { recursive: true });
const { registros, gastado } = await deliberar(clienteOpenRouter(apiKey), elementos, previos, {
  presupuesto: Number(args.presupuesto),
  forzar: args.forzar,
  limite: args.limite ? Number(args.limite) : Infinity,
  alGuardar: (todos) => writeFile(SALIDA, JSON.stringify(todos, null, 1) + '\n'),
  registrar: (l) => console.log(l),
});

const cuenta = new Map<string, number>();
for (const r of registros) {
  const res = evaluar(r).resultado;
  cuenta.set(res, (cuenta.get(res) ?? 0) + 1);
}
console.log(`\nResultado: ${[...cuenta].map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`Coste de esta ejecución: ${gastado.toFixed(4)} $`);
for (const [titulo, filtro] of [
  ['El jurado decide algo distinto de lo propuesto (hay que corregir la ficha):', 'decidido'],
  ['Sin consenso tras dos rondas (el efecto se quita; la ficha no se publica si es de fidelidad):', 'sin-consenso'],
] as const) {
  const lista = registros.filter((r) => r.resultado === filtro);
  if (!lista.length) continue;
  console.log(`\n${titulo}`);
  for (const r of lista) console.log(`  ${r.id}: ${r.esperado}${r.decision ? ` → ${r.decision}` : ''}`);
}
