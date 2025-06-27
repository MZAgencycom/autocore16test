export default class InvoiceCalculator {
  constructor() {
    this.precision = 100;
  }

  calculateInvoiceTotal(items = [], taxRate = 0.20) {
    const validItems = this.getValidItems(items);
    const subtotalCents = validItems.reduce((sum, item) => {
      const itemTotalCents = Math.round((item.price * item.quantity) * this.precision);
      return sum + itemTotalCents;
    }, 0);

    const subtotal = subtotalCents / this.precision;
    const taxAmount = Math.round(subtotal * taxRate * this.precision) / this.precision;
    const total = Math.round((subtotal + taxAmount) * this.precision) / this.precision;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      itemCount: validItems.length
    };
  }

  getValidItems(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(item => {
      return item &&
             typeof item.price === 'number' &&
             typeof item.quantity === 'number' &&
             item.price >= 0 &&
             item.quantity > 0 &&
             !item._deleted &&
             item.id !== null &&
             item.id !== undefined;
    });
  }
}
