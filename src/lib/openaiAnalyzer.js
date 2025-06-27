/**
 * Module pour l'analyse de PDF avec OpenAI GPT-4o
 * Extraction au centime près des données des rapports d'expertise automobile
 */

import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { config } from './config';
import { supabase } from './supabase';

// Configuration for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Analyse un fichier PDF avec OpenAI GPT-4o
 * @param {File} file - Fichier PDF à analyser
 * @param {Function} onProgress - Callback de progression
 * @returns {Promise<Object>} Données structurées extraites du PDF
 */
export async function analyzePdfWithOpenAI(file, onProgress = () => {}) {
  const processingId = Date.now().toString().slice(-6);
  if (import.meta?.env?.DEV) console.log(`[OpenAI:${processingId}] Début analyse du fichier: ${file.name}`);
  
  try {
    onProgress({ status: 'extracting_text', progress: 10 });
    
    // 1. Extraction du texte brut du PDF
    const extractedText = await extractFullTextFromPdf(file, (textProgress) => {
      const mappedProgress = 10 + (textProgress * 30);
      onProgress({ status: 'extracting_text', progress: Math.round(mappedProgress) });
    });
    
    if (extractedText.length < 500) {
      if (import.meta?.env?.DEV) console.log(`[OpenAI:${processingId}] Texte extrait trop court (${extractedText.length} caractères), on utilise l'OCR`);
      onProgress({ status: 'performing_ocr', progress: 40 });
      
      // Si le texte extrait est trop court, on utilise l'OCR
      const ocrText = await performOcrOnPdf(file, (ocrProgress) => {
        const mappedProgress = 40 + (ocrProgress * 30);
        onProgress({ status: 'performing_ocr', progress: Math.round(mappedProgress) });
      });
      
      // 2. Analyse du texte avec GPT-4o via l'Edge Function
      onProgress({ status: 'openai_processing', progress: 70 });
      if (import.meta?.env?.DEV) console.log(`[OpenAI:${processingId}] Analyse du texte OCR (${ocrText.length} caractères) avec GPT-4o`);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Utilisateur non connecté");
      
      const result = await processWithEdgeFunction(ocrText, session.access_token);
      
      // 3. Extraction des détails de main d'œuvre
      onProgress({ status: 'analyzing_labor', progress: 85 });
      const laborLines = extractLaborLines(ocrText);

      if (laborLines.length > 0) {
        const hasT2 = laborLines.some(l => /\bT2\b/i.test(l));
        const hasTP = laborLines.some(l => /\bTP\b|travaux\s*peinture/i.test(l));
        try {
          let laborDetails = await processLaborWithEdgeFunction(laborLines.join('\n'), session.access_token);
          if (laborDetails && laborDetails.length > 0) {
            laborDetails = laborDetails.map(ld => {
              let type = ld.type || '';
              if (/\bTP\b|travaux\s*peinture/i.test(type) || (/T3/i.test(type) && hasTP)) {
                type = 'Peinture';
              }
              return { ...ld, type };
            });

            if (!hasT2) {
              laborDetails = laborDetails.filter(ld => ld.type?.toUpperCase() !== 'T2');
            }

            result.laborDetails = laborDetails;

            const totalHours = laborDetails.reduce((sum, item) => sum + (item.hours || 0), 0);
            const totalCost = laborDetails.reduce((sum, item) => {
              const lineTotal = item.total && (!item.hours || item.hours === 0)
                ? item.total
                : ((item.hours || 0) * (item.rate || 0));
              return sum + lineTotal;
            }, 0);

            result.laborHours = totalHours;
            if (totalHours > 0) {
              result.laborRate = totalCost / totalHours;
            }
          }
        } catch (laborError) {
          console.warn(`[OpenAI:${processingId}] Erreur extraction détails main d'œuvre:`, laborError);
        }
      }
      
      onProgress({ status: 'completed', progress: 100 });
      
      // Ajout du texte source pour référence
      result.text = ocrText;
      
      return result;
    } else {
      // Analyse du texte extrait directement avec GPT-4o
      onProgress({ status: 'openai_processing', progress: 70 });
      if (import.meta?.env?.DEV) console.log(`[OpenAI:${processingId}] Analyse du texte (${extractedText.length} caractères) avec GPT-4o`);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Utilisateur non connecté");
      
      const result = await processWithEdgeFunction(extractedText, session.access_token);
      
      // Extraction des détails de main d'œuvre
      onProgress({ status: 'analyzing_labor', progress: 85 });
      const laborLines = extractLaborLines(extractedText);

      if (laborLines.length > 0) {
        const hasT2 = laborLines.some(l => /\bT2\b/i.test(l));
        const hasTP = laborLines.some(l => /\bTP\b|travaux\s*peinture/i.test(l));
        try {
          let laborDetails = await processLaborWithEdgeFunction(laborLines.join('\n'), session.access_token);
          if (laborDetails && laborDetails.length > 0) {
            laborDetails = laborDetails.map(ld => {
              let type = ld.type || '';
              if (/\bTP\b|travaux\s*peinture/i.test(type) || (/T3/i.test(type) && hasTP)) {
                type = 'Peinture';
              }
              return { ...ld, type };
            });

            if (!hasT2) {
              laborDetails = laborDetails.filter(ld => ld.type?.toUpperCase() !== 'T2');
            }

            result.laborDetails = laborDetails;

            const totalHours = laborDetails.reduce((sum, item) => sum + (item.hours || 0), 0);
            const totalCost = laborDetails.reduce((sum, item) => {
              const lineTotal = item.total && (!item.hours || item.hours === 0)
                ? item.total
                : ((item.hours || 0) * (item.rate || 0));
              return sum + lineTotal;
            }, 0);

            result.laborHours = totalHours;
            if (totalHours > 0) {
              result.laborRate = totalCost / totalHours;
            }
          }
        } catch (laborError) {
          console.warn(`[OpenAI:${processingId}] Erreur extraction détails main d'œuvre:`, laborError);
        }
      }
      
      onProgress({ status: 'completed', progress: 100 });
      
      // Ajout du texte source pour référence
      result.text = extractedText;
      
      return result;
    }
  } catch (error) {
    console.error(`[OpenAI:${processingId}] Erreur analyse PDF:`, error);
    throw error;
  }
}

/**
 * Extrait le texte complet d'un fichier PDF
 * @param {File} file - Fichier PDF
 * @param {Function} onProgress - Callback de progression
 * @returns {Promise<string>} Texte extrait
 */
async function extractFullTextFromPdf(file, onProgress = () => {}) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let extractedText = '';
    const numPages = pdf.numPages;
    if (import.meta?.env?.DEV) console.log(`PDF chargé avec ${numPages} pages`);
    
    // Traiter toutes les pages, jusqu'à 10 maximum
    const maxPages = Math.min(numPages, 10);
    
    for (let i = 1; i <= maxPages; i++) {
      onProgress((i-1) / maxPages);
      if (import.meta?.env?.DEV) console.log(`Traitement page ${i}/${maxPages}`);
      
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      extractedText += pageText + '\n\n';
      if (import.meta?.env?.DEV) console.log(`Page ${i}: ${pageText.length} caractères extraits`);
    }
    
    onProgress(1.0);
    return extractedText.trim();
  } catch (error) {
    console.error('Erreur extraction texte du PDF:', error);
    return '';
  }
}

/**
 * Effectue une OCR sur un fichier PDF
 * @param {File} file - Fichier PDF
 * @param {Function} onProgress - Callback de progression
 * @returns {Promise<string>} Texte extrait par OCR
 */
async function performOcrOnPdf(file, onProgress = () => {}) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let extractedText = '';
    const numPages = pdf.numPages;
    
    // Pour des raisons de performance, limiter à 5 pages maximum
    const maxPages = Math.min(numPages, 5);
    
    // Initialiser le worker Tesseract pour le français
    const worker = await createWorker('fra');
    
    for (let i = 1; i <= maxPages; i++) {
      onProgress((i-1) / maxPages);
      
      // Extraire et rendre la page
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Scale élevé pour meilleure OCR
      
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      
      await page.render({
        canvasContext: context,
        viewport
      }).promise;
      
      // OCR de la page
      const { data } = await worker.recognize(canvas);
      extractedText += data.text + '\n\n';
      
      if (import.meta?.env?.DEV) console.log(`OCR page ${i}: ${data.text.length} caractères extraits`);
    }
    
    // Libérer les ressources
    await worker.terminate();
    
    onProgress(1.0);
    return extractedText.trim();
  } catch (error) {
    console.error('Erreur OCR du PDF:', error);
    return '';
  }
}

/**
 * Traite le texte avec l'Edge Function OpenAI
 * @param {string} text - Texte à analyser
 * @param {string} token - Token d'authentification
 * @returns {Promise<Object>} Données structurées
 */
async function processWithEdgeFunction(text, token) {
  try {
    const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-pdf`;
    
    if (import.meta?.env?.DEV) console.log(`Appel Edge Function OpenAI: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Edge Function: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Erreur Edge Function: ${data.error}`);
    }
    
    return data.extractedData;
  } catch (error) {
    console.error('Erreur appel Edge Function:', error);
    throw error;
  }
}

/**
 * Extrait les lignes contenant des informations de main d'œuvre
 * @param {string} text - Texte du PDF
 * @returns {string[]} Lignes contenant des informations de main d'œuvre
 */
function extractLaborLines(text) {
  // Diviser le texte en lignes
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  // Mots clés relatifs à la main d'œuvre
  const laborKeywords = ['t1', 't2', 't3', 'tôlerie', 'tolerie', 'peint', 'peinture', 
    'main d\'oeuvre', 'main-d\'oeuvre', 'main d\'œuvre', 'mo', 'heures'];
  
  // Filtrer les lignes contenant des informations de main d'œuvre
  return lines.filter(line => {
    const lowercaseLine = line.toLowerCase();
    return laborKeywords.some(keyword => lowercaseLine.includes(keyword)) &&
           // Chercher un pattern de nombres qui pourrait indiquer des heures/taux
           /\d+[.,]\d+\s*(?:h|€|€\/h|euros)|\d+[.,]\d+\s*[xX]\s*\d+[.,]\d+/.test(line);
  });
}

/**
 * Traite les détails de main d'œuvre avec l'Edge Function
 * @param {string} laborText - Texte des lignes de main d'œuvre
 * @param {string} token - Token d'authentification
 * @returns {Promise<Array>} Détails de main d'œuvre
 */
async function processLaborWithEdgeFunction(laborText, token) {
  try {
    const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gpt-labor`;
    
    if (import.meta?.env?.DEV) console.log(`Appel Edge Function Labor: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt: laborText })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Edge Function Labor: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Erreur Edge Function Labor: ${data.error}`);
    }
    
    // Si aucun détail n'a été extrait, retourner un tableau vide
    if (!data.output || data.output === 'IGNORER') {
      return [];
    }
    
    // Si c'est un objet unique, le transformer en tableau
    if (!Array.isArray(data.output)) {
      return [normalizeLabor(data.output)];
    }
    
    // Normaliser chaque élément du tableau
    return data.output.map(normalizeLabor);
  } catch (error) {
    console.error('Erreur appel Edge Function Labor:', error);
    throw error;
  }
}

/**
 * Normalise un objet de main d'œuvre
 * @param {Object} labor - Objet de main d'œuvre
 * @returns {Object} Objet normalisé
 */
function normalizeLabor(labor) {
  return {
    type: labor.type || 'MO',
    hours: typeof labor.hours === 'number' ? labor.hours : parseFloat(labor.hours || 0),
    rate: typeof labor.rate === 'number' ? labor.rate : parseFloat(labor.rate || 0),
    total: typeof labor.total === 'number' ? labor.total : 
           (typeof labor.amount === 'number' ? labor.amount : parseFloat(labor.amount || labor.total || 0))
  };
}