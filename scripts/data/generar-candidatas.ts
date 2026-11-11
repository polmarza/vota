// pnpm data:candidatas — genera data/candidatas/<leg>.json: el universo de votaciones entre las que
// se elige el catálogo, una por iniciativa. Es un archivo derivado: no se edita a mano.

import { readdirSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DiaCompacto } from './congreso.ts';
import { candidatas } from './candidatas.ts';

const DATA = join(import.meta.dirname, '..', '..', 'data');
await mkdir(join(DATA, 'candidatas'), { recursive: true });

for (const leg of ['XIV', 'XV'] as const) {
  const dir = join(DATA, 'raw', leg, 'dias');
  const dias = readdirSync(dir).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as DiaCompacto);
  const lista = candidatas(leg, dias);
  await writeFile(join(DATA, 'candidatas', `${leg}.json`), `[\n${lista.map((c) => ' ' + JSON.stringify(c)).join(',\n')}\n]\n`);
  const porTipo = new Map<string, number>();
  for (const c of lista) porTipo.set(c.tipo, (porTipo.get(c.tipo) ?? 0) + 1);
  const gobierno = lista.filter((c) => c.proponente === 'Gobierno').length;
  console.log(
    `${leg}: ${lista.length} iniciativas · ${[...porTipo].map(([t, n]) => `${t} ${n}`).join(' · ')} · ` +
      `${gobierno} del Gobierno, ${lista.length - gobierno} de grupos o comunidades · ${lista.filter((c) => !c.ganoSi).length} en las que no salió el sí`,
  );
}
