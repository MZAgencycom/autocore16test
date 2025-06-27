import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { extractStructuredData } from './extractStructuredData.js';
import { detectReportType } from './reportTypeDetector.js';
import { analyzePdfWithOpenAI } from './openaiAnalyzer.js';
import { config } from './config.js';
import { parseNumber } from '../utils/invoiceUtils.js';
import cleanupStorage from '../utils/cleanupStorage.js';

export const DEFAULT_SUPPLIES_AMOUNT = config.defaultSuppliesAmount || 10;

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function cleanText(text = '') {
  return text
    .replace(/-\n/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function getPageCount(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

async function extractTextWithPdfjs(file, pageLimit) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = Math.min(pdf.numPages, pageLimit);
  let text = '';
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    text += tc.items.map(it => it.str).join(' ') + '\n\n';
  }
  return { text: cleanText(text), pagesProcessed: pages };
}

async function extractTextWithTesseract(file, pageLimit) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = Math.min(pdf.numPages, pageLimit);
  const worker = await createWorker();
  await worker.load();
  await worker.loadLanguage('fra');
  await worker.initialize('fra');
  let text = '';
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const { data } = await worker.recognize(canvas);
    text += data.text + '\n\n';
  }
  await worker.terminate();
  return { text: cleanText(text), pagesProcessed: pages };
}

export async function analyzePDF(file, onProgress = () => {}) {
  const start = Date.now();
  const summary = { pagesScanned: 0, ocrMethod: 'pdfjs', charsExtracted: 0, totalsFound: false, warnings: [] };

  const pageCount = await getPageCount(file);
  
  let { text, pagesProcessed } = await extractTextWithPdfjs(file, Infinity);
  summary.pagesScanned = pagesProcessed;
  summary.charsExtracted = text.length;
  
  if (file.size > 10 * 1024 * 1024 || pagesProcessed > 10) {
    const result = await extractTextWithPdfjs(file, 5);
    text = result.text;
    summary.pagesScanned = result.pagesProcessed;
    summary.charsExtracted = text.length;
  }

  let reportType = detectReportType(text);
  let data = extractStructuredData(text);
  data.report.reportType = reportType;

  if (text.length < 200 || (data.parts || []).length === 0) {
    const res = await extractTextWithTesseract(file, pageCount);
    summary.ocrMethod = 'tesseract';
    text = res.text;
    summary.pagesScanned = res.pagesProcessed;
    summary.charsExtracted = text.length;
    reportType = detectReportType(text);
    data = extractStructuredData(text);
    data.report.reportType = reportType;
  }

  if (config.enableOpenAI && text.length > 300) {
    try {
      onProgress({ status: 'gpt', progress: 80 });
      const openAiData = await analyzePdfWithOpenAI(file, () => {});
      data = { ...data, ...openAiData };
      summary.ocrMethod = 'openai';
    } catch (e) {
      console.warn('Secondary GPT analysis failed', e);
    }
  }

  data.fullText = text;
  data.text = text;

  data.warnings = data.warnings || [];

  // ---- Automatic inconsistency detection ----
  const ht = parseNumber(data.totalHT);
  const tva = parseNumber(data.taxAmount);
  const ttc = parseNumber(data.totalTTC);
  if (!isNaN(ht) && !isNaN(tva) && !isNaN(ttc)) {
    if (Math.abs(ht + tva - ttc) > 0.01) {
      data.warnings.push('totals incoherent');
    }
  }

  // Compare with manual invoice total when available
  let manualTotal;
  if (data.report && data.report.tracabilite) {
    const trace = data.report.tracabilite;
    const keys = [
      'totalTTC',
      'montantTTC',
      'total',
      'ttc',
      'totalFacture',
      'invoiceTotal',
      'factureTotal'
    ];
    for (const k of keys) {
      if (trace[k] !== undefined) {
        const val = parseNumber(trace[k]);
        if (!isNaN(val)) {
          manualTotal = val;
          break;
        }
      }
    }
  }

  if (manualTotal !== undefined) {
    const diff = Math.round((manualTotal - ttc) * 100) / 100;
    data.debug = data.debug || {};
    data.debug.diff = {
      expectedTTC: ttc,
      actualInvoice: manualTotal,
      delta: diff
    };
    if (Math.abs(diff) > 1) {
      data.anomalyDetected = true;
    }
  }

  // ---- Paint ingredients are no longer auto injected ----
  // If a line explicitly mentioning "Ingrédients peinture" exists in the text,
  // extractStructuredData will have already captured it. Do not add any default
  // entry here, even when a paint section is detected without a matching line.

  // ---- Recalculate totals when missing ----
  if (data.totalHT == null || data.taxAmount == null || data.totalTTC == null) {
    const partTotal = (data.parts || []).reduce((sum, p) => {
      const qty = parseNumber(p.quantity) || 1;
      const price = parseNumber(p.unitPrice);
      if (!isNaN(price)) return sum + qty * Math.abs(price);
      return sum;
    }, 0);

    let laborTotal = 0;
    if (!isNaN(parseNumber(data.mainOeuvreHT))) {
      laborTotal = parseNumber(data.mainOeuvreHT);
    } else if (!isNaN(parseNumber(data.laborHours)) && !isNaN(parseNumber(data.laborRate))) {
      laborTotal = parseNumber(data.laborHours) * parseNumber(data.laborRate);
    }

    const totalHTcalc = Math.round((partTotal + laborTotal) * 100) / 100;
    const rate = parseNumber(data.taxRate);
    const normalized = isNaN(rate) ? 0 : rate > 1 ? rate / 100 : rate;
    const taxCalc = Math.round(totalHTcalc * normalized * 100) / 100;
    const ttcCalc = Math.round((totalHTcalc + taxCalc) * 100) / 100;

    if (data.totalHT == null) data.totalHT = totalHTcalc;
    if (data.taxAmount == null) data.taxAmount = taxCalc;
    if (data.totalTTC == null) data.totalTTC = ttcCalc;
    data.totalsCorrected = true;
  }

  // ---- Warning when supplies mentioned but missing ----
  const supplyMention = /(petites?\s+fournitures?|fourniture|fournitures\s+diverses)/i;
  const hasSuppliesInText = supplyMention.test(text);
  const hasSuppliesLine = (data.parts || []).some(p => /fourniture/i.test(p.description || ''));
  if (hasSuppliesInText && !hasSuppliesLine) {
    const suppliesMatch = text.match(/(?:petites?\s+fournitures?|fournitures?\s+diverses?)\s*(?:[:\-]?\s*)?([\d\s.,]+\d)/i);
    let supplyAmount = DEFAULT_SUPPLIES_AMOUNT;
    if (suppliesMatch) {
      const val = parseNumber(suppliesMatch[1]);
      supplyAmount = isNaN(val) ? 0 : val;
    }
    data.parts.push({
      description: 'Petites fournitures',
      quantity: 1,
      unitPrice: supplyAmount,
      operation: 'E',
      category: 'supply'
    });
  }

  summary.totalsFound = !!(data.totalHT && data.taxAmount && data.totalTTC);
  summary.warnings = data.warnings;
  data.summary = summary;
  const end = Date.now();
  if (import.meta?.env?.DEV) console.log(`analyzePDF done in ${end - start}ms`, summary);

  onProgress({ status: 'completed', progress: 100 });

  cleanupStorage();
  console.log('Analysis completed, storage cleaned');

  return data;
}