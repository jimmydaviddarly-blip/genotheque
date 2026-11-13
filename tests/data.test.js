// Données embarquées (public/data) : une régénération qui tournerait mal se voit ici avant la publication.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => JSON.parse(readFileSync(new URL(`../public/data/${p}`, import.meta.url), 'utf8'));
const date = /^\d{4}-\d{2}-\d{2}$/;

test('le dictionnaire de gènes est complet', () => {
  const d = lire('dictionnaire.json');
  assert.ok(d.length >= 30000, `${d.length} gènes`);
  const brca1 = d.find((e) => e[0] === 'BRCA1');
  assert.ok(brca1 && /BRCA1/i.test(brca1[1]));
  assert.ok(d.every((e) => Array.isArray(e) && typeof e[0] === 'string' && e[0] && typeof e[1] === 'string'));
});

test('les chiffres clés et les versions des données sont présents', () => {
  const c = lire('chiffres.json');
  assert.ok(c.genes >= 30000 && c.rares >= 10000 && c.symptoms >= 10000 && c.clingen >= 3000 && c.drugs >= 1500, JSON.stringify(c));
  for (const k of ['orphanet', 'hpoFr', 'clingen', 'cpic', 'bdpm']) assert.match(c.versions[k], date, `version ${k}`);
});

test('la base des médicaments a sa date et des marques', () => {
  const b = lire('bdpm.json');
  assert.match(b.date, date);
  assert.ok(Object.keys(b.subs).length >= 1500);
  const [marque, cis] = Object.values(b.subs)[0][0];
  assert.equal(typeof marque, 'string');
  assert.ok(Number.isInteger(cis));
});

test('ClinGen, CPIC et Orphanet contiennent ce qu\'on attend', () => {
  const cg = lire('clingen.json');
  assert.match(cg.date, date);
  assert.ok(cg.entries.length >= 3000 && cg.entries.every((e) => e.length === 5));
  assert.ok(Array.isArray(cg.byGene.BRCA1) || Array.isArray(cg.byGene.CFTR));
  assert.ok(lire('cpic.json').genes.CYP2D6.length > 5);
  assert.ok(Object.keys(lire('orpha/fiches.json')).length >= 10000);
  assert.ok(lire('orpha/index.json').length >= 30);
  assert.equal(lire('familles/index.json').length, 12);
});

test('les symptômes sont traduits', () => {
  assert.ok(Object.keys(lire('hpo_fr.json')).length >= 10000);
});
