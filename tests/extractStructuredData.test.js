import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractStructuredData } from '../src/lib/extractStructuredData.js';

test('totals verification passes with matching amounts', () => {
  const text = `TOTAL HT : 100,00\nTVA : 20,00\nTOTAL TTC : 120,00`;
  const data = extractStructuredData(text);
  assert.equal(data.totalsVerified, true);
});

test('totals verification fails when amounts mismatch', () => {
  const text = `TOTAL HT : 100,00\nTVA : 20,00\nTOTAL TTC : 119,00`;
  const data = extractStructuredData(text);
  assert.equal(data.totalsVerified, false);
  assert.ok(data.warnings.includes('totals mismatch'));
});

test('zero amount line is preserved', () => {
  const text = `ROULEMENT 1 0,00 0,00\nTOTAL HT : 0,00\nTVA : 0,00\nTOTAL TTC : 0,00`;
  const data = extractStructuredData(text);
  const line = data.parts.find(p => p.description.includes('ROULEMENT'));
  assert.ok(line);
  assert.equal(line.unitPrice, 0);
});

test('single line totals are parsed', () => {
  const text = 'ROULEMENT 1 50,00 50,00\nTOTAL HT 50,00 TVA 10,00 TOTAL TTC 60,00';
  const data = extractStructuredData(text);
  assert.equal(data.totalHT, 50);
  assert.equal(data.taxAmount, 10);
  assert.equal(data.totalTTC, 60);
});

test('global labor amount is used when present', () => {
  const text = `Main d'oeuvre HT : 100,00 €\nDEPOSE PARE-CHOC 1 50,00 50,00\nTOTAL HT : 150,00\nTVA : 30,00\nTOTAL TTC : 180,00`;
  const data = extractStructuredData(text);
  assert.equal(data.laborTotal, 100);
  assert.equal(data.linesTotalHT, 150);
});

test('labor rate inferred from total when missing', () => {
  const text = `Main d'oeuvre : 2 h\nMain d'oeuvre HT : 160,00\nTOTAL HT : 160,00\nTVA : 32,00\nTOTAL TTC : 192,00`;
  const data = extractStructuredData(text);
  assert.equal(data.laborRate, 80);
  assert.equal(data.laborTotal, 160);
  assert.ok(data.debug.adjustments.includes('laborRate inferred 80'));
});

test('multi-structure sections are parsed and debug info populated', () => {
  const text = `PIECES\n2 ROULEMENT 15,00 30,00\nPeinture a prevoir\nTOTAL GENERAL 60,00 12,00 72,00`;
  const data = extractStructuredData(text);
  const part = data.parts.find(p => p.description.includes('ROULEMENT'));
  assert.ok(part);
  assert.equal(part.quantity, 2);
  assert.ok(data.missingTerms.includes('Peinture'));
  assert.equal(data.debugSummary.partCount, data.parts.length);
  assert.equal(typeof data.debugSummary.totalsMatch, 'boolean');
});

test('spare parts total is added as a line', () => {
  const text = `PIÈCES DE RECHANGE 480,21\nTOTAL HT : 480,21\nTVA : 96,04\nTOTAL TTC : 576,25`;
  const data = extractStructuredData(text);
  const spare = data.parts.find(p => /rechange/i.test(p.description));
  assert.ok(spare);
  assert.equal(spare.unitPrice, 480.21);
});

test('paint ingredients line removed when in labor section', () => {
  const text = `Ingrédients (Mét. Vern.) 10h 100,00 1000,00\nINGRÉDIENTS PEINTURE 300,00\nTOTAL HT : 1300,00\nTVA : 260,00\nTOTAL TTC : 1560,00`;
  const data = extractStructuredData(text);
  const ingr = data.parts.find(p => /ingr[eé]dients\s+peinture/i.test(p.description));
  assert.ok(!ingr);
});

test('ingredient line kept when no labor entry exists', () => {
  const text = `INGRÉDIENTS PEINTURE – 300,00\nTOTAL HT : 300,00\nTVA : 60,00\nTOTAL TTC : 360,00`;
  const data = extractStructuredData(text);
  const ingr = data.parts.find(p => /ingr[eé]dients\s+peinture/i.test(p.description));
  assert.ok(ingr);
  assert.equal(ingr.unitPrice, 300);
});

test('percentage global discount is applied', () => {
  const text = `TOTAL HT : 200,00\nRemise 10%\nTVA : 40,00\nTOTAL TTC : 240,00`;
  const data = extractStructuredData(text);
  const discount = data.parts.find(p => /remise/i.test(p.description));
  assert.ok(discount);
  assert.equal(discount.unitPrice, -20);
  assert.match(discount.description, /10%/);
});

test('alphaexpert single line detection works', () => {
  const text = `MAIN D’ŒUVRE (REPARATION) – 2,30 h – 70,00 €/h – 161,00 €\nMain-d’œuvre Carrosserie – 3,25 h – 72,00 €/h – 234,00 €\nINGRÉDIENTS PEINTURE – 205,00 €\nPEINTURE – 745,00 €\nTOTAL HT : 1345,00\nTVA : 269,00\nTOTAL TTC : 1614,00`;
  const data = extractStructuredData(text);
  assert.ok(data.warnings.includes('auto_interpreted'));
  assert.equal(Math.round(data.laborHours * 100) / 100, 5.55);
  const ingr = data.parts.find(p => /ingr[eé]dients/i.test(p.description));
  const paint = data.parts.find(p => /^PEINTURE/i.test(p.description));
  assert.ok(ingr);
  assert.equal(ingr.unitPrice, 205);
  assert.ok(paint);
  assert.equal(paint.unitPrice, 745);
});

test('Alliance Experts table discounts are applied', () => {
  const text = `LISTE DES PIECES\n!Qté!Libellé!Réf. Constr.!Opé.!Mnt HT!%Vét.!%Rem.! TVA !\n! 1!ROULEMENT! !E ! 100,00! !50!20,00!`;
  const data = extractStructuredData(text);
  const part = data.parts.find(p => /ROULEMENT/i.test(p.description));
  assert.ok(part);
  assert.equal(part.unitPrice, 50);
  assert.match(part.comment, /Remise appliquée/);
});

test('discount column detected with different order', () => {
  const text = `!Libellé!Mnt HT!%Réduc.!Qté!\n!ROULEMENT!100,00!25!1!`;
  const data = extractStructuredData(text);
  const part = data.parts.find(p => /ROULEMENT/i.test(p.description));
  assert.ok(part);
  assert.equal(part.unitPrice, 75);
  assert.match(part.comment, /25/);
});

test('space separated table with remise column', () => {
  const text = `Libellé  Qté  Mnt HT  Remise\nROULEMENT  1  200,00  50%`;
  const data = extractStructuredData(text);
  const part = data.parts.find(p => /ROULEMENT/i.test(p.description));
  assert.ok(part);
  assert.equal(part.unitPrice, 100);
  assert.match(part.comment, /50/);
});

test('forfaits line extracted', () => {
  const text = `FORFAITS 10,00\nTOTAL HT : 10,00\nTVA : 2,00\nTOTAL TTC : 12,00`;
  const data = extractStructuredData(text);
  const line = data.laborDetails.find(l => /^FORFAITS$/i.test(l.type));
  assert.ok(line);
  assert.equal(line.total, 10);
});

test('forfaits line extracted even when amount is on next line', () => {
  const text = `MAIN D'OEUVE\nFORFAITS\n150,00\nTOTAL HT : 150,00`;
  const data = extractStructuredData(text);
  const line = data.laborDetails.find(l => /^FORFAITS$/i.test(l.type));
  assert.ok(line);
  assert.equal(line.total, 150);
});

test('forfaits line extracted with integer amount', () => {
  const text = `FORFAITS 150\nTOTAL HT : 150,00\nTVA : 30,00\nTOTAL TTC : 180,00`;
  const data = extractStructuredData(text);
  const line = data.laborDetails.find(l => /^FORFAITS$/i.test(l.type));
  assert.ok(line);
  assert.equal(line.total, 150);
});

test('ingredient labor with integer hours removes paint line', () => {
  const text = `Ingrédients (Mét. Vern.) 10 h 100,00 1000,00\nINGRÉDIENTS PEINTURE 300,00`;
  const data = extractStructuredData(text);
  const ingr = data.parts.find(p => /ingr[eé]dients\s+peinture/i.test(p.description));
  assert.ok(!ingr);
});

test('forfait line with quantity column yields correct price', () => {
  const text =
    `! Forfait par choc !\n` +
    `!Libellé Qté P.U. HT brut Taux TVA !\n` +
    `! Autre opération forfaitaire 1.00 111.05 111.05 20.00% !\n` +
    `Total`;
  const data = extractStructuredData(text);
  const line = data.laborDetails.find(l => /Autre opération forfaitaire/i.test(l.type));
  assert.ok(line);
  assert.equal(line.total, 111.05);
});
test('ingredient labor with numbers but no h removes paint line', () => {
  const text =
    `Ingrédients (Mét. Vern.) 2,00 10,00 20,00\nINGRÉDIENTS PEINTURE 300,00`;
  const data = extractStructuredData(text);
  const ingr = data.parts.find(p => /ingr[eé]dients\s+peinture/i.test(p.description));
  assert.ok(!ingr);
});

test('forfaits amount appears in labor details', () => {
  const text = `FORFAITS 111,05 €`;
  const data = extractStructuredData(text);
  const line = data.laborDetails.find(l => /^FORFAITS$/i.test(l.type));
  assert.ok(line);
  assert.equal(line.total, 111.05);
});

test('forfait(s) line extracted regardless of case', () => {
  const text = `forfait(s) 45,00`;
  const data = extractStructuredData(text);
  const line = data.laborDetails.find(l => /^FORFAITS$/i.test(l.type));
  assert.ok(line);
  assert.equal(line.total, 45);
});

test('forfait line with dashes is extracted', () => {
  const text = `Forfait - - - 27,00`;
  const data = extractStructuredData(text);
  const line = data.laborDetails.find(l => /^FORFAITS$/i.test(l.type));
  assert.ok(line);
  assert.equal(line.total, 27);
});

test('no paint ingredient added when none present', () => {
  const text = `PIÈCES 50,00\nMain d'oeuvre 2 h 70,00 €/h 140,00`;
  const data = extractStructuredData(text);
  const ingr = data.parts.find(p => /ingr[eé]dients/i.test(p.description));
  assert.ok(!ingr);
});

test('ingredient summary line treated as labor', () => {
  const text = `TOTAL HT : 1000,00\nIngrédients peinture HT 100,00\nTVA : 200,00\nTOTAL TTC : 1200,00`;
  const data = extractStructuredData(text);
  const ingrPart = data.parts.find(p => /ingr[eé]dients/i.test(p.description));
  const laborLine = (data.laborDetails || []).find(l => /ingr[eé]dients/i.test(l.type));
  assert.ok(!ingrPart);
  assert.ok(laborLine);
  assert.equal(laborLine.total, 100);
  assert.equal(laborLine.hours, 1);
  assert.equal(laborLine.rate, 100);
});

test('BCA ingredient line with colon treated as 1h labor', () => {
  const text = `Ingrédients peinture HT : 80,00`;
  const data = extractStructuredData(text);
  const laborLine = (data.laborDetails || []).find(l => /ingr[eé]dients/i.test(l.type));
  assert.ok(laborLine);
  assert.equal(laborLine.total, 80);
  assert.equal(laborLine.hours, 1);
  assert.equal(laborLine.rate, 80);
});

test('BCA ingredient line with hours and amount detected', () => {
  const text = `Copier Modifier Ingrédients peinture HT 100,00 600,00`;
  const data = extractStructuredData(text);
  const line = (data.laborDetails || []).find(l => /ingr[eé]dients/i.test(l.type));
  assert.ok(line);
  assert.equal(line.hours, 1);
  assert.equal(line.total, 100);
  assert.equal(line.rate, 100);
});

test('BCA ingredient line split across lines is detected', () => {
  const text = `Ingrédients peinture HT\n100,00 600,00`;
  const data = extractStructuredData(text);
  const line = (data.laborDetails || []).find(l => /ingr[eé]dients/i.test(l.type));
  assert.ok(line);
  assert.equal(line.hours, 1);
  assert.equal(line.total, 100);
  assert.equal(line.rate, 100);
  const part = data.parts.find(p => /ingr[eé]dients/i.test(p.description));
  assert.ok(!part);
});

test('BCA ingredient line with HT and TTC amounts is captured', () => {
  const text = `Ingredients peinture HT 150,00 € 180,00`;
  const data = extractStructuredData(text);
  const line = (data.laborDetails || []).find(l => /ingr[eé]dients/i.test(l.type));
  assert.ok(line);
  assert.equal(line.total, 150);
  const part = data.parts.find(p => /ingr[eé]dients/i.test(p.description));
  assert.ok(!part);
});

test('simple Forfait line is captured', () => {
  const text = `Forfait       27,00`;
  const data = extractStructuredData(text);
  const line = (data.laborDetails || []).find(l => /^Forfait$/i.test(l.type));
  assert.ok(line);
  assert.equal(line.total, 27);
});

test('forfaits line with hours and rate is captured', () => {
  const text = `FORFAITS 3h 75 225`;
  const data = extractStructuredData(text);
  const line = (data.laborDetails || []).find(l => /^FORFAITS$/i.test(l.type));
  assert.ok(line);
  assert.equal(line.hours, 3);
  assert.equal(line.rate, 75);
  assert.equal(line.total, 225);
});

test('metal vernis line in table is extracted', () => {
  const text = `T1 1,00 50,00 50,00\nIngrédient Métal Vernis 2,00 75,00 150,00`;
  const data = extractStructuredData(text);
  const line = (data.laborDetails || []).find(l => /m[ée]tal\s+vernis/i.test(l.type));
  assert.ok(line);
  assert.equal(line.hours, 2);
  assert.equal(line.rate, 75);
  assert.equal(line.total, 150);
});

test('isolated metal vernis line parsed', () => {
  const text = `Ingrédient Métal Vernis 2,00 75,00 150,00`;
  const data = extractStructuredData(text);
  const line = (data.laborDetails || []).find(l => /m[ée]tal\s+vernis/i.test(l.type));
  assert.ok(line);
  assert.equal(line.total, 150);
});

test('metal vernis line alone on page parsed', () => {
  const text = `\fIngrédient Métal Vernis 1,00 70,00 70,00`;
  const data = extractStructuredData(text);
  const line = (data.laborDetails || []).find(l => /m[ée]tal\s+vernis/i.test(l.type));
  assert.ok(line);
  assert.equal(line.hours, 1);
  assert.equal(line.rate, 70);
});

test('metal vernis line without hours parsed', () => {
  const text = `Ingrédient Métal Vernis 75,00 150,00`;
  const data = extractStructuredData(text);
  const line = (data.laborDetails || []).find(l => /m[ée]tal\s+vernis/i.test(l.type));
  assert.ok(line);
  assert.equal(Math.round(line.rate), 75);
  assert.equal(Math.round(line.total), 150);
});
