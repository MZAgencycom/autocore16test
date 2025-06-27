import { useState, useMemo, useCallback } from 'react';
import InvoiceCalculator from '../utils/InvoiceCalculator.js';

export default function useInvoiceCalculator(initialItems = []) {
  const [items, setItems] = useState(() => [...initialItems]);
  const [originalSubtotal] = useState(() => {
    const calc = new InvoiceCalculator();
    return calc.calculateInvoiceTotal(initialItems).subtotal;
  });

  const calculator = useMemo(() => new InvoiceCalculator(), []);

  const totals = useMemo(() => {
    return calculator.calculateInvoiceTotal(items);
  }, [items, calculator]);

  const addItem = useCallback(newItem => {
    if (!newItem || typeof newItem.price !== 'number') return false;
    setItems(prev => [
      ...prev,
      {
        ...newItem,
        id: newItem.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        _added: true
      }
    ]);
    return true;
  }, []);

  const removeItem = useCallback(itemId => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const resetToOriginal = useCallback(() => setItems([...initialItems]), [initialItems]);

  return { items, totals, originalSubtotal, addItem, removeItem, resetToOriginal };
}
