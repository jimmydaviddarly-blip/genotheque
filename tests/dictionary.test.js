// Aide à l'écriture d'un nom de gène, sur le vrai dictionnaire embarqué (30 698 gènes).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Le dictionnaire est chargé par fetch dans le navigateur : ici on le lit sur le disque.
globalThis.fetch = async (url) => ({
  ok: true,
  json: async () => JSON.parse(readFileSync(new URL(`../public/data/${String(url).replace('./data/', '')}`, import.meta.url), 'utf8')),
});
const { suggest, completion, preloadDictionary } = await import('../src/dictionary.js');

before(async () => { await preloadDictionary(); });

test('un symbole exact arrive en premier', async () => {
  for (const sym of ['BRCA1', 'TP53', 'CFTR', 'EGFR']) assert.equal((await suggest(sym))[0].symbol, sym);
});

test('un autre nom est reconnu et signalé (HER2 pour ERBB2)', async () => {
  const r = (await suggest('her2'))[0];
  assert.equal(r.symbol, 'ERBB2');
  assert.ok(r.via, 'on dit par quel autre nom on l\'a trouvé');
});

test('une faute de frappe est corrigée (lettres inversées, lettre oubliée)', async () => {
  const inversees = (await suggest('egrf')).find((x) => x.symbol === 'EGFR');
  assert.ok(inversees && inversees.typo, 'EGRF → EGFR');
  assert.ok((await suggest('erb2')).some((x) => x.symbol === 'ERBB2'), 'ERB2 → ERBB2');
});

test('un début de nom propose les gènes qui commencent ainsi', async () => {
  const syms = (await suggest('erbb')).map((x) => x.symbol);
  assert.ok(syms.includes('ERBB2') && syms.includes('ERBB3'));
});

test('un mot du nom officiel est trouvé', async () => {
  assert.ok((await suggest('insulin')).length > 0);
});

test('la saisie vide ne propose rien, et le nombre de suggestions est limité', async () => {
  assert.deepEqual(await suggest(''), []);
  assert.ok((await suggest('ca', 5)).length <= 5);
});

test('la complétion propose la fin du symbole le plus court', () => {
  assert.equal(completion('brc'), 'BRCA1');
  assert.equal(completion('erb'), 'ERBB2');
  assert.equal(completion('BRCA1'), null, 'rien si la saisie est déjà un symbole complet');
  assert.equal(completion('b'), null, 'rien sous deux lettres');
  assert.equal(completion('brc a'), null, 'rien si la saisie contient un espace');
});
