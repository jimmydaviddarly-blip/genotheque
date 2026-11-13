// Rapprochement du nom anglais d'un médicament (Open Targets) et de son nom français (BDPM).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drugKey } from '../src/drugkey.js';

test('le même médicament donne la même clé en anglais et en français', () => {
  const paires = [
    ['IMATINIB MESYLATE', "MÉSILATE D'IMATINIB"],
    ['AZITHROMYCIN', 'AZITHROMYCINE'],
    ['WARFARIN', 'WARFARINE'],
    ['LAPATINIB', 'LAPATINIB'],
    ['ACETAMINOPHEN', 'PARACÉTAMOL'],
    ['TRASTUZUMAB', 'Trastuzumab'],
  ];
  for (const [en, fr] of paires) assert.equal(drugKey(en), drugKey(fr), `${en} / ${fr}`);
});

test('deux médicaments différents ont des clés différentes', () => {
  assert.notEqual(drugKey('IMATINIB'), drugKey('DASATINIB'));
  assert.notEqual(drugKey('METFORMIN'), drugKey('METOPROLOL'));
});

test('les sels et les mots courts sont ignorés', () => {
  assert.equal(drugKey('METOPROLOL TARTRATE'), drugKey('METOPROLOL'));
  assert.equal(drugKey('CHLORHYDRATE DE METFORMINE'), drugKey('METFORMIN'));
});
