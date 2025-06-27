import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateTotals, sanitizeParts, safeAdd } from '../src/utils/invoiceUtils.js';
import { calculateLinesTotalHT, checkTotalConsistency, extractKeywordAmounts, findMismatchLine, aggregateLaborInfo, parseLaborTable } from '../src/utils/invoiceUtils.js';

test('load invoice keeps total unchanged', () => {
  const items = [{ description: 'p', quantity: 2, unitPrice: 10 }];
  const labor = [{ hours: 1, rate: 50 }];
  const taxRate = 20;
  const first = calculateTotals(items, labor, taxRate);
  const second = calculateTotals(items, labor, taxRate);
  assert.equal(second.total, first.total);
});

test('adding an item increases total', () => {
  const items = [{ description: 'p', quantity: 1, unitPrice: 10 }];
  const labor = [];
  const taxRate = 20;
  const initial = calculateTotals(items, labor, taxRate).total;
  const updated = calculateTotals([...items, { description: 'q', quantity: 1, unitPrice: 5 }], labor, taxRate).total;
  assert.ok(updated > initial);
});

test('removing an item decreases total', () => {
  const items = [
    { description: 'a', quantity: 2, unitPrice: 10 },
    { description: 'b', quantity: 1, unitPrice: 5 }
  ];
  const labor = [];
  const taxRate = 20;
  const initial = calculateTotals(items, labor, taxRate).total;
  const updated = calculateTotals(items.slice(0,1), labor, taxRate).total;
  assert.ok(updated < initial);
});

test('line discount reduces totals', () => {
  const items = [{ description: 'a', quantity: 1, unitPrice: 100, discount: 10 }];
  const res = calculateTotals(items, [], 0);
  assert.equal(res.subtotal, 90);
});

test('changing tax rate updates total', () => {
  const items = [{ description: 'p', quantity: 1, unitPrice: 100 }];
  const labor = [];
  const result20 = calculateTotals(items, labor, 20).total;
  const result10 = calculateTotals(items, labor, 10).total;
  assert.ok(result10 < result20);
});

test('function does not mutate input arrays', () => {
  const items = [{ description: 'p', quantity: 1, unitPrice: 10 }];
  const labor = [];
  const copyItems = [...items];
  calculateTotals(items, labor, 20);
  assert.deepEqual(items, copyItems);
});

test('totals are rounded to two decimals', () => {
  const items = [{ description: 'p', quantity: 1, unitPrice: 0.333 }];
  const labor = [];
  const result = calculateTotals(items, labor, 20);
  assert.equal(result.subtotal, 0.33);
  assert.equal(result.tax, 0.07);
  assert.equal(result.total, 0.4);
});

test('comma decimals are handled', () => {
  const items = [{ description: 'p', quantity: '1', unitPrice: '10,5' }];
  const labor = [];
  const result = calculateTotals(items, labor, 20);
  assert.equal(result.subtotal, 10.5);
  assert.equal(result.tax, 2.1);
  assert.equal(result.total, 12.6);
});

test('space separated thousands are handled', () => {
  const items = [{ description: 'p', quantity: '1', unitPrice: '1 234,56' }];
  const labor = [];
  const result = calculateTotals(items, labor, 20);
  assert.equal(result.subtotal, 1234.56);
  assert.equal(result.tax, 246.91);
  assert.equal(result.total, 1481.47);
});

test('dot and comma thousand separators are handled', () => {
  const items = [
    { description: 'a', quantity: '1', unitPrice: '1.234,56' },
    { description: 'b', quantity: '1', unitPrice: '1,234.56' }
  ];
  const labor = [];
  const result = calculateTotals(items, labor, 0);
  assert.equal(result.subtotal, 2469.12);
});

test('string tax rate is parsed', () => {
  const items = [{ description: 'p', quantity: 1, unitPrice: 100 }];
  const labor = [];
  const result = calculateTotals(items, labor, '20,5');
  assert.equal(result.tax, 20.5);
  assert.equal(result.total, 120.5);
});

test('removing zero value items keeps total stable', () => {
  const items = [
    { description: 'valid', quantity: 1, unitPrice: 100 },
    { description: 'zero1', quantity: 1, unitPrice: 0 },
    { description: 'zero2', quantity: 0, unitPrice: 10 }
  ];
  const labor = [];
  const initial = calculateTotals(items, labor, 20).total;
  const filtered = items.filter(i => i.description === 'valid');
  const updated = calculateTotals(filtered, labor, 20).total;
  assert.equal(updated, initial);
});

test('sanitizeParts converts values and drops empty labels', () => {
  const parts = [
    { description: 'A', quantity: '2', unitPrice: '5' },
    { description: '', quantity: '1', unitPrice: '10' }
  ];
  const sanitized = sanitizeParts(parts);
  assert.equal(sanitized.length, 1);
  assert.equal(typeof sanitized[0].quantity, 'number');
  assert.equal(typeof sanitized[0].unitPrice, 'number');
});

test('sanitizeParts parses comma decimals and spaces', () => {
  const parts = [
    { description: 'A', quantity: '1', unitPrice: '1 234,56' },
    { description: 'B', quantity: '2', unitPrice: '5,5' }
  ];
  const sanitized = sanitizeParts(parts);
  assert.equal(sanitized[0].unitPrice, 1234.56);
  assert.equal(sanitized[1].unitPrice, 5.5);
});

test('sanitizeParts defaults quantity to one when missing', () => {
  const parts = [{ description: 'A', unitPrice: 10 }];
  const [sanitized] = sanitizeParts(parts);
  assert.equal(sanitized.quantity, 1);
});

test('sanitizeParts prioritizes montantHT when present', () => {
  const parts = [
    { description: 'A', quantite: 1, unitPrice: 100, remise: 20, montantHT: 80 }
  ];
  const [sanitized] = sanitizeParts(parts);
  assert.equal(sanitized.unitPrice, 80);
  assert.equal(sanitized.comment, 'Importé avec remise 20');
});

test('sanitizeParts uses htNet when available', () => {
  const parts = [
    { description: 'B', quantite: 1, unitPrice: 126.36, htNet: 75.82, remise: '40%' }
  ];
  const [sanitized] = sanitizeParts(parts);
  assert.equal(sanitized.unitPrice, 75.82);
  assert.equal(sanitized.comment, 'Importé avec remise 40%');
});

test('sanitizeParts handles netHT field', () => {
  const parts = [
    { description: 'C', quantite: 1, unitPrice: 100, netHT: 80, remise: '20%' }
  ];
  const [sanitized] = sanitizeParts(parts);
  assert.equal(sanitized.unitPrice, 80);
  assert.equal(sanitized.comment, 'Importé avec remise 20%');
});

test('sanitizeParts subtracts discount when net amount missing', () => {
  const parts = [
    { description: 'D', quantite: 1, unitPrice: 100, remise: 20 }
  ];
  const [sanitized] = sanitizeParts(parts);
  assert.equal(sanitized.unitPrice, 80);
  assert.equal(sanitized.comment, 'Importé avec remise 20');
});

test('sanitizeParts handles percentage discount without net amount', () => {
  const parts = [
    { description: 'E', quantite: 1, unitPrice: 200, remise: '10%' }
  ];
  const [sanitized] = sanitizeParts(parts);
  assert.equal(sanitized.unitPrice, 180);
  assert.equal(sanitized.comment, 'Importé avec remise 10%');
});
test('sanitizeParts preserves existing comment when no remise', () => {
  const parts = [
    { description: 'F', quantite: 1, unitPrice: 50, comment: 'Remise 5%' }
  ];
  const [sanitized] = sanitizeParts(parts);
  assert.equal(sanitized.comment, 'Remise 5%');
});

test('negative price items reduce total', () => {
  const parts = [
    { description: 'A', quantity: 1, unitPrice: 100 },
    { description: 'Discount', quantity: 1, unitPrice: -10 }
  ];
  const labor = [];
  const result = calculateTotals(parts, labor, 20);
  assert.equal(result.subtotal, 90);
  assert.equal(result.tax, 18);
  assert.equal(result.total, 108);
});

test('calculateLinesTotalHT computes total from generic lines', () => {
  const lines = [
    { designation: 'A', quantite: 1, montantHT: 50 },
    { designation: 'B', quantite: 2, montantHT: 25 }
  ];
  const total = calculateLinesTotalHT(lines);
  assert.equal(total, 100);
});

test('checkTotalConsistency detects mismatch', () => {
  const lines = [
    { designation: 'A', quantite: 1, montantHT: 50 }
  ];
  assert.ok(checkTotalConsistency(50, lines));
  assert.ok(!checkTotalConsistency(40, lines));
});

test('safeAdd fixes floating point issues', () => {
  assert.equal(safeAdd(1.9999999, 0.0000001), 2);
  assert.equal(safeAdd(0.1, 0.2), 0.3);
});

test('extractKeywordAmounts finds amounts for keywords', () => {
  const text = `T1 0,50 62,00 31,00\nT2 1,00 80,00 80,00\nPEINTURE 2,00 80,00 160,00\nINGREDIENTS (Mét. Vern.) 23,20\nPIECES DE RECHANGE 681,64\nFORFAITS 111,05\nPETITES FOURNITURES 5,00`;
  const keywords = ['T1', 'T2', 'PEINTURE', 'INGREDIENTS (Mét. Vern.)', 'PIECES DE RECHANGE', 'FORFAITS', 'PETITES FOURNITURES'];
  const amounts = extractKeywordAmounts(text, keywords);
  assert.equal(amounts['T1'], 31.00);
  assert.equal(amounts['T2'], 80.00);
  assert.equal(amounts['PEINTURE'], 160.00);
  assert.equal(amounts['INGREDIENTS (Mét. Vern.)'], 23.20);
  assert.equal(amounts['PIECES DE RECHANGE'], 681.64);
  assert.equal(amounts['FORFAITS'], 111.05);
  assert.equal(amounts['PETITES FOURNITURES'], 5.00);
});

test('findMismatchLine detects first mismatch', () => {
  const expected = [
    { description: 'A', unitPrice: 10 },
    { description: 'B', unitPrice: 20 }
  ];
  const actual = [
    { description: 'A', unitPrice: 10 },
    { description: 'B', unitPrice: 25 }
  ];
  const res = findMismatchLine(expected, actual);
  assert.equal(res, 'B 20');
});

test('findMismatchLine returns null when identical', () => {
  const expected = [{ description: 'A', unitPrice: 10 }];
  const actual = [{ description: 'A', unitPrice: 10 }];
  assert.equal(findMismatchLine(expected, actual), null);
});

test('extractKeywordAmounts handles full keyword list', () => {
  const text = `T1 0,50 62,00 31,00\nT2 1,00 80,00 80,00\nT3 1,00 50,00 50,00\nTP 0,25 100,00 25,00\nForfait 20,00\nMain d'oeuvre 4,00 70,00 280,00\nPièces 123,45\nIngrédients 12,34\nréparation 40,00\nmontant réparation 41,00\nforfaits 5,00\nfournitures 3,00\nfourniture 2,00\npetites fournitures 1,00\npièces de rechanges 15,00\nIngr.(MV) 8,00\npeinture 9,00\nIngr.(Op) 10,00\nRECYCLAGE 4,00\npreparation 6,00\nMain d'oeuvre globale 60,00\nPièces de rechange 61,00\nIngrédients peinture 7,00\nIngrédient Métal vernis 11,00\nHors élément SGC 2,00\nAutre opération forfaitaire 13,00`;
  const keywords = ['T1','T2','T3','TP','Forfait','Main d\'oeuvre','Pièces','Ingrédients','réparation','montant réparation','forfaits','fournitures','fourniture','petites fournitures','pièces de rechanges','Ingr.(MV)','peinture','Ingr.(Op)','RECYCLAGE','preparation','Main d\'oeuvre globale','Pièces de rechange','Ingrédients peinture','Ingrédient Métal vernis','Pièces','Hors élément SGC','Autre opération forfaitaire'];
  const amounts = extractKeywordAmounts(text, keywords);
  assert.equal(amounts['T1'], 31.00);
  assert.equal(amounts['T2'], 80.00);
  assert.equal(amounts['T3'], 50.00);
  assert.equal(amounts['TP'], 25.00);
  assert.equal(amounts['Forfait'], 20.00);
  assert.equal(amounts["Main d'oeuvre"], 280.00);
  assert.equal(amounts['Pièces'], 123.45);
  assert.equal(amounts['Ingrédients'], 12.34);
  assert.equal(amounts['réparation'], 40.00);
  assert.equal(amounts['montant réparation'], 41.00);
  assert.equal(amounts['forfaits'], 5.00);
  assert.equal(amounts['fournitures'], 3.00);
  assert.equal(amounts['fourniture'], 2.00);
  assert.equal(amounts['petites fournitures'], 1.00);
  assert.equal(amounts['pièces de rechanges'], 15.00);
  assert.equal(amounts['Ingr.(MV)'], 8.00);
  assert.equal(amounts['peinture'], 9.00);
  assert.equal(amounts['Ingr.(Op)'], 10.00);
  assert.equal(amounts['RECYCLAGE'], 4.00);
  assert.equal(amounts['preparation'], 6.00);
  assert.equal(amounts["Main d'oeuvre globale"], 60.00);
  assert.equal(amounts['Pièces de rechange'], 61.00);
  assert.equal(amounts['Ingrédients peinture'], 7.00);
  assert.equal(amounts['Ingrédient Métal vernis'], 11.00);
  assert.equal(amounts['Hors élément SGC'], 2.00);
  assert.equal(amounts['Autre opération forfaitaire'], 13.00);
});

test('aggregateLaborInfo sums fragmented labor lines', () => {
  const text = `CHOC 1\nMain d'oeuvre 333,00\nCHOC 2\nMO 31,00\nTaux horaire 50,00`;
  const res = aggregateLaborInfo(text);
  assert.equal(res.total, 364.00);
  assert.equal(res.rate, 50.00);
});

test('aggregateLaborInfo subtracts reductions', () => {
  const text = `Main d'oeuvre 100,00\nRemise MO 20,00`;
  const res = aggregateLaborInfo(text);
  assert.equal(res.total, 80.00);
});

test('sanitizeParts ignores VAT only lines', () => {
  const parts = [{ description: 'TVA 20%', quantite: 1, unitPrice: '1' }];
  const sanitized = sanitizeParts(parts);
  assert.equal(sanitized.length, 0);
});

test('sanitizeParts drops lines without price', () => {
  const parts = [{ description: 'INFO', quantite: 1 }];
  const sanitized = sanitizeParts(parts);
  assert.equal(sanitized.length, 0);
});

test('sanitizeParts keeps zero priced items', () => {
  const parts = [{ description: 'A', quantite: 1, unitPrice: 0 }];
  const sanitized = sanitizeParts(parts);
  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0].unitPrice, 0);
});

test('sanitizeParts removes remise and is idempotent', () => {
  const parts = [{ description: 'A', quantity: 1, price: 100, remise: '10%' }];
  const first = sanitizeParts(parts);
  const second = sanitizeParts(first);
  assert.equal(first[0].unitPrice, 90);
  assert.equal(second[0].unitPrice, 90);
  assert.ok(!('remise' in second[0]));
});

test('aggregateLaborInfo detects T1 lines', () => {
  const text = 'T1 1,00 50,00 50,00';
  const res = aggregateLaborInfo(text);
  assert.equal(res.total, 50);
});

test('parseLaborTable extracts labor rows', () => {
  const text = `T1 1,00 60,00 60,00 12,00 72,00\nT2 2,00 70,00 140,00 28,00 168,00`;
  const rows = parseLaborTable(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].label, 'T1');
  assert.equal(rows[0].hours, 1);
  assert.equal(rows[0].rate, 60);
  assert.equal(rows[0].montantHT, 60);
  assert.equal(rows[0].montantTVA, 12);
  assert.equal(rows[0].montantTTC, 72);
  assert.equal(rows[1].label, 'T2');
  assert.equal(rows[1].hours, 2);
  assert.equal(rows[1].rate, 70);
});

test('parseLaborTable handles pipe separators', () => {
  const text = 'PEINTURE | 13,00 | 120,00 | 1 560,00 | 312,00 | 1 872,00';
  const rows = parseLaborTable(text);
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.label, 'PEINTURE');
  assert.equal(row.hours, 13);
  assert.equal(row.rate, 120);
  assert.equal(row.montantHT, 1560);
  assert.equal(row.montantTVA, 312);
  assert.equal(row.montantTTC, 1872);
});

test('parseLaborTable detects forfait lines with custom labels', () => {
  const text = `FORFAIT PEINTURE 1,00 80,00 80,00 16,00 96,00`;
  const rows = parseLaborTable(text);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, 'FORFAIT PEINTURE');
  assert.equal(rows[0].hours, 1);
  assert.equal(rows[0].rate, 80);
  assert.equal(rows[0].montantHT, 80);
  assert.equal(rows[0].montantTVA, 16);
  assert.equal(rows[0].montantTTC, 96);
});

test('parseLaborTable detects generic table on isolated page', () => {
  const text = `\fDEP 0,50 60,00 30,00 6,00 36,00\nREPO 1,00 60,00 60,00 12,00 72,00\nFIN 0,30 60,00 18,00 3,60 21,60`;
  const rows = parseLaborTable(text);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].label, 'DEP');
  assert.equal(rows[1].hours, 1);
  assert.equal(rows[2].montantHT, 18);
});

test('parseLaborTable detects forfait line with hours and rate', () => {
  const text = `FORFAITS 3h 75 225`;
  const rows = parseLaborTable(text);
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.label, 'FORFAITS');
  assert.equal(row.hours, 3);
  assert.equal(row.rate, 75);
  assert.equal(row.montantHT, 225);
});

