import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectReportType } from '../src/lib/reportTypeDetector.js';

const bcaText = `ATTENTION : CECI N'EST PAS UN ORDRE DE RÉPARATION\nBCA Expertise\nMontant réparation TTC : 999,99`;

const structuredText = `Liste des pieces\nQté Libellé Réf.`;

test('BCA reports are detected', () => {
  assert.equal(detectReportType(bcaText), 'BCA');
});

test('Structured PDF reports are detected', () => {
  assert.equal(detectReportType(structuredText), 'StructuredPDF');
});
