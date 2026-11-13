// Regroupement des cancers associés à un gène (carte « Cancers liés à ce gène »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupCancers, isGenericDisease, strengthOf } from '../src/cancers.js';

const row = (name, score, extra = {}) => ({ id: `id_${name}`, name, score, ...extra });

test('les termes généraux sont reconnus', () => {
  for (const n of ['cancer', 'neoplasm', 'carcinoma', 'Tumor', 'secondary malignant neoplasm', 'hereditary neoplastic syndrome']) {
    assert.ok(isGenericDisease(n), n);
  }
  for (const n of ['breast cancer', 'ovarian carcinoma', 'Lynch syndrome']) assert.ok(!isGenericDisease(n), n);
});

test('chaque cancer va à son organe', () => {
  const g = groupCancers([
    row('breast cancer', 0.84), row('ovarian carcinoma', 0.7), row('colorectal cancer', 0.6),
    row('uveal melanoma', 0.55), row('melanoma', 0.5), row('pancreatic cancer', 0.5),
    row('Hodgkin lymphoma', 0.5), row('chronic myeloid leukemia', 0.5), row('prostate carcinoma', 0.5),
  ]);
  const keys = Object.fromEntries(g.map((x) => [x.key, x.rows.map((r) => r.name)]));
  assert.deepEqual(keys.sein, ['breast cancer']);
  assert.deepEqual(keys.ovaire, ['ovarian carcinoma']);
  assert.deepEqual(keys.colon, ['colorectal cancer']);
  assert.deepEqual(keys.oeil, ['uveal melanoma'], 'le mélanome de l\'uvée va à l\'œil, pas à la peau');
  assert.deepEqual(keys.peau, ['melanoma']);
  assert.deepEqual(keys.pancreas, ['pancreatic cancer']);
  assert.deepEqual(keys.ganglions, ['Hodgkin lymphoma']);
  assert.deepEqual(keys.sang, ['chronic myeloid leukemia']);
  assert.deepEqual(keys.prostate, ['prostate carcinoma']);
});

test('les termes généraux, les tumeurs bénignes et les liens faibles sont écartés', () => {
  const g = groupCancers([row('breast cancer', 0.8), row('cancer', 0.78), row('neoplasm', 0.7),
    row('benign neoplasm of stomach', 0.6), row('ovarian cancer', 0.2)]);
  assert.deepEqual(g.map((x) => x.key), ['sein']);
});

test('la carte n\'apparaît que si un lien atteint 0,5', () => {
  assert.deepEqual(groupCancers([row('familial atypical multiple mole melanoma syndrome', 0.43)]), []);
  assert.equal(groupCancers([row('familial atypical multiple mole melanoma syndrome', 0.43), row('breast cancer', 0.5)]).length, 2);
});

test('les groupes vont du lien le plus fort au plus faible, « autres » à la fin', () => {
  const g = groupCancers([row('colorectal cancer', 0.5), row('rare tumor syndrome of nowhere', 0.9), row('breast cancer', 0.7)]);
  assert.deepEqual(g.map((x) => x.key), ['sein', 'colon', 'autres']);
});

test('une forme héréditaire est signalée, et les doublons de libellé fusionnés', () => {
  const g = groupCancers([
    row('hereditary breast carcinoma', 0.66),
    row('breast cancer', 0.84, { label: 'Cancer du sein' }),
    row('breast carcinoma', 0.7, { label: 'Cancer du sein' }),
  ]);
  const sein = g.find((x) => x.key === 'sein');
  assert.equal(sein.rows.filter((r) => r.label === 'Cancer du sein').length, 1);
  assert.ok(sein.rows.find((r) => r.name === 'hereditary breast carcinoma').hereditary);
  assert.equal(sein.rows[0].label, 'Cancer du sein', 'les noms français passent devant');
});

test('la force du lien suit les seuils', () => {
  assert.equal(strengthOf(0.9)[1], 'Lien fort');
  assert.equal(strengthOf(0.65)[1], 'Lien fort');
  assert.equal(strengthOf(0.55)[1], 'Lien moyen');
  assert.equal(strengthOf(0.45)[1], 'Lien plus faible');
});
