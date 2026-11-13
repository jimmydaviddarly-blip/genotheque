// Ce que la recherche reconnaît, et surtout ce qu'elle ne doit pas confondre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RS, NOTATION, GENERAL_WORD, CANCER_WORD } from '../src/search-rules.js';

test('un numéro rs est reconnu', () => {
  for (const q of ['rs429358', 'RS334', 'rs1']) assert.ok(RS.test(q), q);
  for (const q of ['rs', 'rs12a', 'brca1', ' rs334']) assert.ok(!RS.test(q), q);
});

test('la notation d\'une mutation est reconnue', () => {
  const oui = ['c.68_69del', 'c.5266dupC', 'BRCA1 c.68_69del', 'TP53:c.743G>A', 'p.Cys61Gly', 'p.(Arg175His)',
    'chr17:43094000', 'NM_007294.4:c.68_69del', 'NP_009225.1', 'ENST00000357654', 'g.43094000A>G'];
  for (const q of oui) assert.ok(NOTATION.test(q), `devrait être reconnue : ${q}`);
});

test('un nom de gène, un rs ou une maladie n\'est pas pris pour une notation', () => {
  const non = ['brca1', 'BRCA1', 'rs429358', 'cancer', 'type 1', 'diabète de type 1', 'her2', 'mucoviscidose',
    'cancer du sein', 'MT-CO1', 'c', 'p.', 'chr', 'ENSG00000012048'];
  for (const q of non) assert.ok(!NOTATION.test(q), `ne devrait pas être reconnue : ${q}`);
});

test('les mots généraux désignent une famille de maladies', () => {
  for (const q of ['cancer', 'Cancers', 'tumeur', 'tumour', 'carcinome', 'leucémie', 'leucemie', 'lymphome', 'maladie', 'syndrome']) {
    assert.ok(GENERAL_WORD.test(q), q);
  }
  for (const q of ['brca1', 'cancer du sein', 'type 1', 'cftr', 'tp53']) assert.ok(!GENERAL_WORD.test(q), q);
});

test('seuls les mots de cancer proposent les cancers par zone du corps', () => {
  for (const q of ['cancer', 'tumeur', 'carcinome', 'lymphome']) assert.ok(CANCER_WORD.test(q), q);
  for (const q of ['maladie', 'syndrome', 'disease']) assert.ok(!CANCER_WORD.test(q), q);
});
