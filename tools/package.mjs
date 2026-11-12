// Construit l'appli puis l'empaquette dans release/genes-web-<version>.zip.
// Les chemins internes du zip sont écrits avec des « / » (règle build-package du studio :
// les outils PowerShell écrivent des « \ », invalides sur un hébergement Linux).
// Usage : `npm run package`.
import { execSync } from 'node:child_process';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, crc32 } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const { version } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));

execSync('npx vite build', { cwd: ROOT, stdio: 'inherit' });

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p)); else out.push(p);
  }
  return out;
}

// Zip minimal (méthode « deflate »), sans dépendance.
const local = [];
const central = [];
let offset = 0;
for (const file of (await walk(DIST)).sort()) {
  const name = Buffer.from(relative(DIST, file).split('\\').join('/'), 'utf8');
  const data = await readFile(file);
  const packed = deflateRawSync(data);
  const crc = crc32(data);
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8);
  head.writeUInt32LE(crc, 14); head.writeUInt32LE(packed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(name.length, 26);
  local.push(head, name, packed);
  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8); dir.writeUInt16LE(8, 10);
  dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(packed.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(name.length, 28);
  dir.writeUInt32LE(offset, 42);
  central.push(dir, name);
  offset += 30 + name.length + packed.length;
}
const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10);
end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);

await mkdir(join(ROOT, 'release'), { recursive: true });
const out = join(ROOT, 'release', `genes-web-${version}.zip`);
await writeFile(out, Buffer.concat([...local, centralBuf, end]));
console.log(`${out} : ${central.length / 2} fichiers`);
