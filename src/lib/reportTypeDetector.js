export function detectReportType(text = '') {
  const lower = text.toLowerCase();
  if (/ceci n['’]est pas un ordre de r[ée]paration/i.test(lower) || /bca\s+expertise/i.test(lower) || /montant\s+r[ée]paration\s+ttc/i.test(lower)) {
    return 'BCA';
  }
  if (/\b[ée]metteur\b/.test(lower)) {
    return 'Independent';
  }
  if (/liste\s+des\s+p[ée]ces|qt[ée]|libell[ée]|r[ée]f\./i.test(lower)) {
    return 'StructuredPDF';
  }
  return 'Generic';
}
