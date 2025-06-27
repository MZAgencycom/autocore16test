export default class InvoiceBugDetector {
  analyzeInvoice(invoice) {
    const analysis = {
      invoiceId: invoice.id,
      riskLevel: 'LOW',
      suspiciousPatterns: [],
      recommendations: []
    };

    const decimalAnalysis = this.analyzeDecimalPrices(invoice.items || []);
    if (decimalAnalysis.hasSuspiciousDecimals) {
      analysis.suspiciousPatterns.push('SUSPICIOUS_DECIMALS');
      analysis.riskLevel = 'HIGH';
    }

    const complexityAnalysis = this.analyzeComplexity(invoice.items || []);
    if (complexityAnalysis.isComplex) {
      analysis.suspiciousPatterns.push('HIGH_COMPLEXITY');
      analysis.riskLevel = 'CRITICAL';
    }

    return analysis;
  }

  analyzeDecimalPrices(items) {
    const suspiciousDecimals = [];
    const problemPatterns = [/\.\d{3,}$/,/\.99[5-9]$/,/\.00[1-4]$/];

    items.forEach(item => {
      const priceStr = item.price.toString();
      problemPatterns.forEach(pattern => {
        if (pattern.test(priceStr)) {
          suspiciousDecimals.push({
            itemId: item.id,
            price: item.price,
            description: item.description
          });
        }
      });
    });

    return {
      hasSuspiciousDecimals: suspiciousDecimals.length > 0,
      suspiciousItems: suspiciousDecimals
    };
  }

  analyzeComplexity(items) {
    return {
      isComplex: items.length > 10
    };
  }
}
