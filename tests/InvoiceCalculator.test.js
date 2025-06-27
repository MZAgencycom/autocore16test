import assert from 'node:assert/strict';
import { test } from 'node:test';
import InvoiceCalculator from '../src/utils/InvoiceCalculator.js';

test('adding and removing item keeps total stable', () => {
  const calc = new InvoiceCalculator();
  const baseItems = [
    { id: 1, price: 636.345, quantity: 2 }
  ];

  const withExtra = [...baseItems, { id: 2, price: 100, quantity: 1 }];

  const originalTotal = calc.calculateInvoiceTotal(baseItems).total;
  calc.calculateInvoiceTotal(withExtra); // simulate modification
  const afterRemove = calc.calculateInvoiceTotal(baseItems).total;

  assert.ok(Math.abs(afterRemove - originalTotal) < 0.01);
});
