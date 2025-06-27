export function parseNumber(value) {
  if (typeof value === 'string') {
    let normalized = value.replace(/\s/g, '');
    const comma = normalized.lastIndexOf(',');
    const dot = normalized.lastIndexOf('.');
    if (comma > dot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) return NaN;
    return Math.round(parsed * 100) / 100;
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return NaN;
  return Math.round(parsed * 100) / 100;
}

function roundToTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function safeAdd(a, b) {
  return roundToTwo(parseNumber(a) + parseNumber(b));
}

export function recalculateTotal(items = [], labor = [], taxRate = 0) {
  const rate = parseNumber(taxRate);
  const normalizedRate = rate > 1 ? rate / 100 : rate;
  if (!Array.isArray(items) || !Array.isArray(labor) || isNaN(normalizedRate)) {
    return { totalHT: 0, tva: 0, totalTTC: 0 };
  }

  const sanitizedItems = sanitizeParts(items);
  const validItems = sanitizedItems.filter((item) => {
    const quantity = parseNumber(item.quantity);
    const price = parseNumber(item.unitPrice || item.price);
    return !isNaN(quantity) && !isNaN(price);
  });

  const validLabor = (labor || [])
    .map((task) => ({
      hours: parseNumber(task.hours),
      rate: parseNumber(task.rate),
      total: parseNumber(task.total),
      discount: parseNumber(task.remise)
    }))
    .filter((task) => (
      (!isNaN(task.hours) && task.hours > 0 && !isNaN(task.rate)) ||
      (!isNaN(task.total) && task.total !== 0)
    ));

  const itemTotal = validItems.reduce((acc, item) => {
    const unit = parseNumber(item.unitPrice || item.price);
    const qty = parseNumber(item.quantity);
    const disc = parseNumber(item.discount);
    const pct = !isNaN(disc) ? Math.min(Math.max(disc, 0), 100) : 0;
    const line = roundToTwo(
      (isNaN(unit) ? 0 : unit) * (isNaN(qty) ? 0 : qty) * (1 - pct / 100)
    );
    return safeAdd(acc, line);
  }, 0);

  const laborTotal = validLabor.reduce((acc, task) => {
    let line;
    if (!isNaN(task.total) && (isNaN(task.hours) || task.hours === 0)) {
      line = roundToTwo(task.total);
    } else {
      line = roundToTwo(parseNumber(task.hours) * parseNumber(task.rate));
    }
    if (!isNaN(task.discount)) {
      line = safeAdd(line, -task.discount);
    }
    return safeAdd(acc, line);
  }, 0);

  const totalHT = safeAdd(itemTotal, laborTotal);
  const tva = roundToTwo(totalHT * normalizedRate);
  const totalTTC = safeAdd(totalHT, tva);

  return { totalHT, tva, totalTTC };
}

export function calculateTotals(items = [], labor = [], taxRate = 0) {
  const { totalHT, tva, totalTTC } = recalculateTotal(items, labor, taxRate);
  return { subtotal: totalHT, tax: tva, total: totalTTC };
}

function getNetAmount(p) {
  const fields = [
    'montantHT',
    'montant_ht',
    'htNet',
    'ht_net',
    'montantHTNet',
    'net_ht',
    'netHT',
    'netHt',
    'htnet',
    'netht',
    'montant_net_ht',
    'vetusteDeduite'
  ];
  for (const f of fields) {
    if (p[f] !== undefined) {
      const val = parseNumber(p[f]);
      if (!isNaN(val)) return val;
    }
  }
  return undefined;
}

export function sanitizeParts(parts = []) {
  return (parts || [])
    .filter((p) => {
      const label = p.description || p.label || '';
      const trimmed = label.trim();
      if (!trimmed) return false;
      if (/^tva\b.*$/i.test(trimmed)) return false;
      if (/taux/i.test(trimmed)) return false;
      if (/^\d+[\d\s.,]*\s*%$/.test(trimmed)) return false;
      if (/ingr[eé]dients?\s*(peinture|m[ée]tal\s*vernis)/i.test(trimmed)) return false;
      return true;
    })
    .map((p) => {
      let qty = p.quantity;
      if (qty === undefined || qty === null || qty === '') {
        qty = 1;
      }
      qty = parseNumber(qty);
      if (isNaN(qty)) qty = 1;
      const netAmount = getNetAmount(p);
      let rawUnit;
      let unit;
      if (p.price !== undefined) {
        rawUnit = parseNumber(p.price);
        const discountRaw = parseNumber(p.remise);
        const isPercent =
          typeof p.remise === 'string' && p.remise.includes('%') && !isNaN(discountRaw);
        const discount = isPercent ? (rawUnit * discountRaw) / 100 : discountRaw;
        unit = !isNaN(discount) ? safeAdd(rawUnit, -discount) : rawUnit;
      } else if (p.remise !== undefined) {
        rawUnit = parseNumber(p.unitPrice);
        const discountRaw = parseNumber(p.remise);
        const isPercent =
          typeof p.remise === 'string' && p.remise.includes('%') && !isNaN(discountRaw);
        const discount = isPercent ? (rawUnit * discountRaw) / 100 : discountRaw;
        unit = !isNaN(discount) ? safeAdd(rawUnit, -discount) : rawUnit;
      } else {
        rawUnit = parseNumber(p.unitPrice);
        unit = rawUnit;
      }

      if (netAmount !== undefined) {
        unit = netAmount;
      }

      const priceField = unit;

      const comment =
        p.remise !== undefined && p.remise !== null && p.remise !== ''
          ? p.comment || `Importé avec remise ${p.remise}`
          : p.comment;

      const result = {
        ...p,
        quantity: qty,
        unitPrice: unit,
        price: priceField,
        comment,
      };

      delete result.remise;
      return result;
    })
    .filter(p => !isNaN(p.unitPrice));
}

export function calculateLinesTotalHT(lines = []) {
  return lines.reduce((sum, line) => {
    const qty = parseNumber(line.quantite ?? line.quantity ?? 1);
    const price = parseNumber(line.montantHT ?? line.unitPrice ?? line.prixUnitaire ?? line.price);
    if (!isNaN(qty) && !isNaN(price)) {
      return safeAdd(sum, qty * price);
    }
    return sum;
  }, 0);
}

export function checkTotalConsistency(reportTotalHT, lines = []) {
  const total = calculateLinesTotalHT(lines);
  const expected = parseNumber(reportTotalHT);
  if (isNaN(expected)) return false;
  return Math.abs(total - expected) <= 0.01;
}

// Extract the last numeric amount appearing on lines containing given keywords
// `text` is an OCR output with potentially multiple lines. For each keyword,
// the function searches lines that include it (case-insensitive) and returns
// the last number found on that line as a parsed value. This is useful to grab
// amounts from simple tables such as:
// "T1 0,50 62,00 31,00" or "FORFAITS 111,05".
export function extractKeywordAmounts(text = '', keywords = []) {
  if (typeof text !== 'string' || !Array.isArray(keywords)) return {};
  const amounts = {};
  const lines = text.split(/\n/);

  for (const keyword of keywords) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, 'i');

    for (const line of lines) {
      if (regex.test(line)) {
        const numbers = line.match(/\d+[,.]\d+/g);
        if (numbers && numbers.length) {
          const last = numbers[numbers.length - 1];
          amounts[keyword] = parseNumber(last);
          break;
        }
      }
    }
  }

  return amounts;
}

// Find the first line in expectedParts that does not have a matching
// description and unit price in actualParts. Returns the description and
// expected price formatted as a string or null when everything matches.
export function findMismatchLine(expectedParts = [], actualParts = []) {
  for (const expected of expectedParts) {
    const expDesc = expected.description;
    const expPrice = parseNumber(expected.unitPrice ?? expected.price);
    const match = actualParts.find(p => p.description === expDesc);
    if (!match) {
      if (!isNaN(expPrice)) {
        return `${expDesc} ${expPrice}`;
      }
      return expDesc;
    }
    const actPrice = parseNumber(match.unitPrice ?? match.price);
    if (!isNaN(expPrice) && !isNaN(actPrice) && Math.abs(expPrice - actPrice) > 0.01) {
      return `${expDesc} ${expPrice}`;
    }
  }
  return null;
}

// Compare extracted report data with exported invoice data and
// return a list of fields that do not match. The comparison is
// tolerant to small numeric differences (<=0.01).
export function findExportDiscrepancies(extracted = {}, invoice = {}) {
  if (!extracted || !invoice) return [];

  const mismatches = [];
  const eq = (a, b) => Math.abs(parseNumber(a) - parseNumber(b)) <= 0.01;

  if (extracted.totalHT !== undefined && !eq(extracted.totalHT, invoice.subtotal)) {
    mismatches.push('Total HT');
  }
  if (extracted.taxAmount !== undefined && !eq(extracted.taxAmount, invoice.tax_amount)) {
    mismatches.push('TVA');
  }
  if (extracted.totalTTC !== undefined && !eq(extracted.totalTTC, invoice.total)) {
    mismatches.push('Total TTC');
  }
  if (extracted.laborHours !== undefined && !eq(extracted.laborHours, invoice.labor_hours)) {
    mismatches.push('Heures MO');
  }
  if (extracted.laborRate !== undefined && !eq(extracted.laborRate, invoice.labor_rate)) {
    mismatches.push('Taux MO');
  }

  const hasSuppliesExtracted = (extracted.parts || []).some(p => /fourniture/i.test(p.description || ''));
  const hasSuppliesInvoice = (invoice.parts || []).some(p => /fourniture/i.test(p.description || ''));
  if (hasSuppliesExtracted && !hasSuppliesInvoice) mismatches.push('Petites fournitures');

  const hasDiscountExtracted = (extracted.parts || []).some(p => /remise/i.test(p.description || '') || parseNumber(p.unitPrice) < 0);
  const hasDiscountInvoice = (invoice.parts || []).some(p => /remise/i.test(p.description || '') || parseNumber(p.unitPrice) < 0);
  if (hasDiscountExtracted && !hasDiscountInvoice) mismatches.push('Remise');

  if (extracted.report?.reportNumber && !invoice.report?.reportNumber) {
    mismatches.push('Numéro rapport');
  }

  return mismatches;
}

// Aggregate labor information from raw text by scanning for a wide range of
// keywords. Returns the summed labor amount, detected hourly rate and hours.
// If multiple fragments are found (e.g. MO split across CHOC sections), they
// are added together. Zero value lines do not block processing but are flagged
// via the zeroLines count so a warning can be emitted by the caller.
export function aggregateLaborInfo(text = '') {
  if (typeof text !== 'string') {
    return { total: 0, hours: null, rate: null, zeroLines: 0 };
  }

  const lines = text.split(/\n/);
  const totalRegex = /(Main d'?oeuvre\s+HT|Total\s+MO|MO\s+HT|Forfait\s+MO)/i;
  const globalMatches = [];

  for (const m of text.matchAll(/(?:Main d'?oeuvre\s+HT|Total\s+MO|MO\s+HT|Forfait\s+MO)\s*[:\-]?\s*([\d\s.,]*\d)/gi)) {
    globalMatches.push(parseNumber(m[1]));
  }
  if (globalMatches.length) {
    const total = globalMatches[globalMatches.length - 1];
    return { total: isNaN(total) ? 0 : total, hours: null, rate: null, zeroLines: total === 0 ? 1 : 0 };
  }

  const lineRegex = /(main d'?oeuvre|\bmo\b|forfait mo|d[eé]pose|repose|d[ée]montage|remontage|remise en \w+|r[ée]glage|diagnostic|contr[ôo]le|peinture|peint\d*|t[oô]lerie|carross|redressage|m[ée]canique|pose|\bT\d\b|ingr\.|ingr\.\(op\)|ingr\.\s*mv|op[eé]rateur|pr[ée]paration\s*peinture|forfait|temps|travaux|postes)/i;
  const hoursRegex = /(nbr|nb|nombre)\s*d'?heures?|temps\s*\(h\)|dur[ée]e|temps\s+estim[ée]/i;
  const rateRegex = /(taux\s*horaire|p\.u\.\s*ht|prix\s*unitaire|tarif\s*horaire)/i;
  const ingredientRegex = /(ingr\.?|ingr[eé]dients)/i;
  const hourLikeRegex = /\b\d+[,.]?\d*\s*h/i;

  let total = 0;
  let rate = null;
  let hours = null;
  let zeroLines = 0;

  for (const line of lines) {
    const numbers = line.match(/-?\d+[\d.,]*\d*/g);
    if (!numbers) continue;

    if (ingredientRegex.test(line) && !hourLikeRegex.test(line)) {
      // Skip paint ingredient amounts without duration
      continue;
    }

    if (rateRegex.test(line)) {
      const v = parseNumber(numbers[numbers.length - 1]);
      if (!isNaN(v)) rate = v;
    }

    if (hoursRegex.test(line)) {
      const v = parseNumber(numbers[0]);
      if (!isNaN(v)) hours = v;
    }

    if (lineRegex.test(line)) {
      const v = parseNumber(numbers[numbers.length - 1]);
      if (!isNaN(v)) {
        const isReduction = /remise|r[ée]duc|rabais/i.test(line);
        total = isReduction ? safeAdd(total, -Math.abs(v)) : safeAdd(total, v);
        if (v === 0) zeroLines += 1;
      }
    }
  }

  if (total === 0 && hours !== null && rate !== null) {
    total = parseNumber(hours) * parseNumber(rate);
  }

  return { total: parseNumber(total), hours, rate, zeroLines };
}

export function parseLaborTable(text = '') {
  if (typeof text !== 'string') return [];

  const rows = [];
  const pages = text.split(/\f/);

  const num = '-?\\d+(?:\\s?\\d{3})*(?:[.,]\\d+)?';
  const tableRegex = new RegExp(`^(.+?)\\s+(${num})h?\\s+(${num})\\s+(${num})(?:\\s+(${num}))?(?:\\s+(${num}))?$`, 'i');
  for (const page of pages) {
    for (const raw of page.split(/\n/)) {
      const line = raw.replace(/\|/g, ' ').trim();
      if (!line) continue;

      const tableMatch = line.match(tableRegex);
      if (tableMatch) {
        rows.push({
          label: tableMatch[1].trim(),
          hours: parseNumber(tableMatch[2]),
          rate: parseNumber(tableMatch[3]),
          montantHT: parseNumber(tableMatch[4]),
          montantTVA: parseNumber(tableMatch[5]),
          montantTTC: parseNumber(tableMatch[6])
        });
        continue;
      }

      if (/FORFAIT/i.test(line)) {
        const nums = line.match(/-?\d+(?:[.,]\d+)?/g);
        if (nums && nums.length >= 3) {
          const parsed = nums.map(n => parseNumber(n));
          rows.push({
            label: line.replace(/\d.*$/, '').trim() || 'FORFAITS',
            hours: parseNumber(nums[0].replace(/[hH]/, '')),
            rate: parsed[1],
            montantHT: parsed[2],
            montantTVA: parsed[3],
            montantTTC: parsed[4]
          });
        }
      }
    }
  }

  return rows;
}
