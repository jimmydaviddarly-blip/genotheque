// Traductions et typographie française.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// i18n.js lit le document et le stockage du navigateur : on les simule, en français.
globalThis.document = { documentElement: {} };
const memoire = { 'genotheque-langue': 'fr' };
globalThis.localStorage = { getItem: (k) => memoire[k] ?? null, setItem: (k, v) => { memoire[k] = v; } };
const { t, tn, pct, setLang, appName } = await import('../src/i18n.js');
const { EN } = await import('../src/i18n-en.js');

test('typographie française : espaces insécables avant la ponctuation haute', () => {
  assert.equal(t('Voir ?'), 'Voir ?');
  assert.equal(t('Attention !'), 'Attention !');
  assert.equal(t('Transmission :'), 'Transmission :');
  assert.equal(t('un « mot » rare'), 'un « mot » rare');
  assert.match(pct('5'), /^5\s%$/);
});

test('les pluriels suivent le nombre', () => {
  assert.equal(tn(1, '{n} gène', '{n} gènes'), '1 gène');
  assert.equal(tn(2, '{n} gène', '{n} gènes'), '2 gènes');
  assert.equal(tn(0, '{n} gène', '{n} gènes'), '0 gène');
});

test('les variables sont remplacées', () => {
  assert.equal(t('Gène {genes}', { genes: 'BRCA1' }), 'Gène BRCA1');
});

test('en anglais : traduction, nom sans accents, pas de typographie française', () => {
  setLang('en');
  assert.equal(appName(), 'Genotheque');
  assert.equal(t('Classification inconnue.'), 'Unknown classification.');
  assert.equal(pct('5'), '5%');
  assert.equal(t('texte sans traduction ?'), 'texte sans traduction ?', 'un texte non traduit reste tel quel');
  setLang('fr');
  assert.equal(appName(), 'Génothèque');
});

test('chaque traduction anglaise garde les mêmes variables que le texte français', () => {
  const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  const defauts = Object.entries(EN).filter(([fr, en]) => vars(fr) !== vars(en));
  assert.deepEqual(defauts.map(([fr]) => fr), [], 'variables différentes entre le français et l\'anglais');
});

test('aucune traduction anglaise n\'est vide', () => {
  const vides = Object.entries(EN).filter(([, en]) => typeof en !== 'string' || !en.trim());
  assert.deepEqual(vides.map(([fr]) => fr), []);
});
