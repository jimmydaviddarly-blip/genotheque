// Fréquences d'un allèle dans les projets de populations (dbSNP via MyVariant).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cohortFrequencies, bestAllele } from '../src/cohorts.js';

test('les projets sont classés par région avec leur fréquence', () => {
  const alleles = [{ allele: 'A', freq: { '1000g': 0.246, topmed: 0.291, alspac: 0.334, qatari: 0.2, exac: 0.3 } }];
  const g = cohortFrequencies(alleles, 'A');
  assert.deepEqual(g.map((x) => x.group), ['Monde', 'Amérique du Nord', 'Europe', 'Asie et Moyen-Orient']);
  assert.equal(g[0].items[0].name, '1000 Genomes');
  assert.equal(g[0].items[0].freq, 0.246);
  const noms = g.flatMap((x) => x.items.map((i) => i.name));
  assert.ok(!noms.includes('ExAC'), 'ExAC est déjà couvert par gnomAD : écarté');
});

test('une fréquence invalide est ignorée', () => {
  const alleles = [{ allele: 'A', freq: { '1000g': 0.1, hapmap: 1.5, sgdp_prj: 'abc', topmed: -0.2, alspac: 0.3 } }];
  const noms = cohortFrequencies(alleles, 'A').flatMap((x) => x.items.map((i) => i.name));
  assert.deepEqual(noms, ['1000 Genomes', 'ALSPAC']);
});

test('moins de deux projets : pas de carte', () => {
  assert.deepEqual(cohortFrequencies([{ allele: 'A', freq: { '1000g': 0.1 } }], 'A'), []);
  assert.deepEqual(cohortFrequencies([{ allele: 'A', freq: {} }], 'A'), []);
  assert.deepEqual(cohortFrequencies([], 'A'), []);
  assert.deepEqual(cohortFrequencies(undefined, 'A'), []);
});

test('un allèle absent de la liste ne donne rien', () => {
  assert.deepEqual(cohortFrequencies([{ allele: 'T', freq: { '1000g': 0.9, hapmap: 0.9 } }], 'G'), []);
});

test('une fréquence nulle est gardée (allèle absent du projet)', () => {
  const g = cohortFrequencies([{ allele: 'A', freq: { '1000g': 0, hapmap: 0.04 } }], 'A');
  assert.equal(g[0].items[0].freq, 0);
});

test('parmi plusieurs allèles, on garde celui mesuré dans le plus de projets', () => {
  const hits = [
    { alt: 'C', alleles: [{ allele: 'C', freq: { '1000g': 0.1, hapmap: 0.2 } }] },
    { alt: 'A', alleles: [{ allele: 'A', freq: { '1000g': 0.1, hapmap: 0.2, topmed: 0.3, alspac: 0.4 } }] },
    { alt: '', alleles: [] },
  ];
  assert.equal(bestAllele(hits).alt, 'A');
  assert.equal(bestAllele([{ alt: '', alleles: [] }]), null);
});
