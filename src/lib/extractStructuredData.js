/**
 * Extracteur spécialisé pour les rapports d'expertise automobile
 * Module qui extrait des données structurées à partir de texte OCR
 */

import { parseNumber, calculateLinesTotalHT, parseLaborTable } from '../utils/invoiceUtils.js';

// Pseudo-code pour Codex
// if (line.includes("Ingrédients peinture HT")) {
//   extractHeuresEtMontant(line); // 100,00 et 600,00
//   addToMainOeuvre("Ingrédients peinture", heures, montant / heures, montant);
// }
//
// if (line.includes("Forfait")) {
//   const montant = extractMontant(line);
//   addToMainOeuvre("Forfait", null, null, montant);
// }

// Extract structured data from OCR text with comprehensive part detection
export function extractStructuredData(text) {
  const processingId = Date.now().toString().slice(-6);

  // Pré-analyse d'éventuelles lignes de main d'oeuvre pour déduire la présence
  // d'ingrédients peinture dans la main d'oeuvre (utile pour éviter les doublons)
  const initialLaborRows = parseLaborTable(text);
  const ingredientHTLine = text.match(/\bIng(?:r(?:[ée]dients?)?)?\.?\s+peinture\s*(?:HT)?\s*[:\-]?\s*(\d+[,.]\d+)/i);
  const ingredientHTTTCLine = text.match(/Ingr[eé]dients\s+peinture\s+HT\s+([\d,.]+)[\s€]+([\d,.]+)/i);

  // Recherche spécifique du format BCA avec heures et montant sur la même ligne
  // ou éventuellement séparés sur la ligne suivante
  let ingredientBCADetails = null;
  if (!ingredientHTTTCLine) {
    const bcaLines = text.split(/\n/);
    for (let i = 0; i < bcaLines.length; i++) {
      const l = bcaLines[i];
      if (/ingr[eé]dients?\s+peinture\s*HT/i.test(l)) {
        let nums = l.match(/\d+[,.]\d+/g);
        if (!nums || nums.length < 2) {
          // Les valeurs peuvent être sur la ligne suivante
          if (i + 1 < bcaLines.length) {
            const nextNums = bcaLines[i + 1].match(/\d+[,.]\d+/g);
            if (nextNums && nextNums.length >= 2) {
              nums = nextNums;
            }
          }
        }
        if (nums && nums.length >= 2) {
          const h = parseNumber(nums[0]);
          const total = parseNumber(nums[nums.length - 1]);
          if (!isNaN(h) && h > 0 && !isNaN(total)) {
            ingredientBCADetails = { hours: h, total, rate: Math.round((total / h) * 100) / 100 };
            break;
          }
        }
      }
    }
  }

  let ingredientLaborDetectedEarly =
    initialLaborRows.some(r => /ingr[eé]dients?/i.test(r.label)) ||
    /ingr[eé]dients?[^\n]*\d+(?:[,.]\d+)?\s*h/i.test(text) ||
    !!ingredientHTLine ||
    !!ingredientHTTTCLine ||
    !!ingredientBCADetails;

  // Recherche de lignes contenant les mots "m\u00e9tal" ou "vernis" pour capturer
  // des main d'oeuvre de type "Ingr\u00e9dient M\u00e9tal Vernis" ou similaires
  let metalVernisDetails = null;
  for (const line of text.split(/\n/)) {
    if (/(?:ingr[eé]dients?|poste)?[^\n]*(m[ée]tal|vernis)/i.test(line)) {
      const nums = line.match(/-?\d+[\d.,]*/g);
      if (nums && nums.length >= 2) {
        if (nums.length >= 3) {
          metalVernisDetails = {
            hours: parseNumber(nums[0]),
            rate: parseNumber(nums[1]),
            total: parseNumber(nums[2])
          };
        } else {
          metalVernisDetails = {
            hours: 1,
            rate: parseNumber(nums[0]),
            total: parseNumber(nums[1])
          };
        }
        break;
      }
    }
  }
  
  // Initialize data object with all required fields
  const data = {
    client: {
      name: null,
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      address: null, // Champ pour stocker l'adresse du client
    },
    vehicle: {
      make: null,
      model: null,
      registration: null,
      vin: null,
      year: null,
      mileage: null,
    },
    insurer: {
      name: null,
      policyNumber: null,
      claimNumber: null,
      contact: null,
      address: null
    },
    report: {}, // Add missing report property
    parts: [],
    laborHours: null,
    laborRate: null,
    laborTotal: null,
    linesTotalHT: null,
    totalHT: null,
    totalTTC: null,
    taxRate: 0.2,
    taxAmount: null
  };
  
  if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Starting extraction from text:`, text.substring(0, 200) + "...");

  // Extraction de blocs r\u00e9sum\u00e9 type BCA (Main d\u2019\u0153uvre HT, Pi\u00e8ces HT, Ingr\u00e9dients peinture HT, Forfait HT)
  const summaryLines = {};
  for (const line of text.split(/\n/)) {
    const m = line.match(/^(Main d[’' ]?oeuvre\s*HT|Pi[èe]ces\s*HT|Ingr[eé]dients?\s+peinture\s*HT|Forfait\s*HT)\s*[.:]*\s*(\d+[\d\s.,]*)/i);
    if (m) {
      const key = m[1].toLowerCase();
      if (/main/.test(key)) summaryLines.mo = parseNumber(m[2]);
      else if (/pi[èe]ces/.test(key)) summaryLines.pieces = parseNumber(m[2]);
      else if (/ingr/.test(key)) summaryLines.ing = parseNumber(m[2]);
      else if (/forfait/.test(key)) summaryLines.forfait = parseNumber(m[2]);
    }
  }

  if (summaryLines.mo && !data.laborTotal) {
    data.laborTotal = summaryLines.mo;
  }
  if (summaryLines.pieces && !data.linesTotalHT) {
    data.linesTotalHT = summaryLines.pieces;
  }
  if (summaryLines.ing !== undefined) {
    const amt = summaryLines.ing;
    data.laborDetails = data.laborDetails || [];
    data.laborDetails.push({ type: 'Ingrédients peinture', hours: 1, rate: amt, total: amt });
    data.laborTotal = (data.laborTotal || 0) + amt;
  }
  if (summaryLines.forfait !== undefined) {
    const amt = summaryLines.forfait;
    data.laborDetails = data.laborDetails || [];
    data.laborDetails.push({ type: 'Forfait', hours: null, rate: null, total: amt });
    data.laborTotal = (data.laborTotal || 0) + amt;
  }
  
  // Regex pattern for French "ASSURÉ" field (common in insurance reports)
  const assureMatch = text.match(/ASSURÉ\s*:\s*([A-Za-zÀ-ÿ\s]+)|ASSURE\s*:\s*([A-Za-zÀ-ÿ\s]+)|ASSURÉ?\.?\s*:?\s*([A-Za-zÀ-ÿ\s]+)|Assuré\s*:?\s*([A-Za-zÀ-ÿ\s]+)|Assuré[\r\n]+([A-Za-zÀ-ÿ\s]+)/i);
  if (assureMatch) {
    const fullName = (assureMatch[4] || assureMatch[3] || assureMatch[2] || assureMatch[1] || assureMatch[5]).trim();
    const nameParts = fullName.split(' ');
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found insured name:`, fullName);
    
    // Assume last name is uppercase and first name is title case in French documents
    if (nameParts.length >= 2) {
      // Check if first part is all uppercase (likely a last name)
      if (nameParts[0] === nameParts[0].toUpperCase() && nameParts[0] !== nameParts[0].toLowerCase()) {
        data.client.lastName = nameParts[0].trim();
        data.client.firstName = nameParts.slice(1).join(' ').trim();
      } else {
        // Otherwise use default approach
        data.client.firstName = nameParts[0].trim();
        data.client.lastName = nameParts.slice(1).join(' ').trim();
      }
    } else {
      // Single name part
      data.client.lastName = fullName;
      data.client.firstName = 'Unknown';
    }
    
    if (data.client.firstName && data.client.lastName) {
      data.client.name = `${data.client.firstName} ${data.client.lastName}`;
    } else if (data.client.firstName || data.client.lastName) {
      data.client.name = data.client.firstName || data.client.lastName;
    }
  } else {
    // Fallback to other patterns if ASSURÉ is not found
    const nameMatches = text.match(/(?:M\.|Mme|Monsieur|Madame)\s+([A-Z\s]+)\s+([A-Za-zÀ-ÿ]+)|([A-Za-zÀ-ÿ]+)\s+([A-Z\s]+)|Client:?\s*([A-Za-zÀ-ÿ\s]+)/i);
    if (nameMatches) {
      if (nameMatches[1] && nameMatches[2]) {
        data.client.lastName = nameMatches[1].trim();
        data.client.firstName = nameMatches[2].trim();
      } else if (nameMatches[3] && nameMatches[4]) {
        data.client.firstName = nameMatches[3].trim();
        data.client.lastName = nameMatches[4].trim();
      } else if (nameMatches[5]) {
        // Format "Client: Nom Prénom"
        const fullName = nameMatches[5].trim().split(' ');
        if (fullName.length >= 2) {
          data.client.firstName = fullName[0];
          data.client.lastName = fullName.slice(1).join(' ');
        } else {
          data.client.lastName = fullName[0];
          data.client.firstName = 'Unknown';
        }
      }
      
      if (data.client.firstName && data.client.lastName) {
        data.client.name = `${data.client.firstName} ${data.client.lastName}`;
      } else if (data.client.firstName || data.client.lastName) {
        data.client.name = data.client.firstName || data.client.lastName;
      }
    } else {
      // Default values to ensure non-null
      data.client.firstName = 'Unknown';
      data.client.lastName = 'Unknown';
    }
  }
  
  // Search for email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    data.client.email = emailMatch[0];
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found email:`, data.client.email);
  }
  
  // Search for phone number (French formats)
  const phoneMatch = text.match(/(?:0|\+33|0033)\s*[1-9](?:[\s.-]*\d{2}){4}|TÉLÉ?:?\s*(\d{10})|TEL[\.:]?\s*(\d{10})|TEL[\.:]?\s*([0-9]{2}[\s.-]+[0-9]{2}[\s.-]+[0-9]{2}[\s.-]+[0-9]{2}[\s.-]+[0-9]{2})/i);
  if (phoneMatch) {
    data.client.phone = phoneMatch[3] || phoneMatch[2] || phoneMatch[1] || phoneMatch[0];
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found phone:`, data.client.phone);
  }
  
  // Search for client address - NOUVELLE FONCTIONNALITÉ
  const addressPatterns = [
    // Différents formats d'adresse courants dans les rapports
    /Adresse\s*:?\s*([A-Za-z0-9\s,.-]+(?:\d{5})?(?:\s[A-Za-zÀ-ÿ-]+)?)/i,
    /Domicile\s*:?\s*([A-Za-z0-9\s,.-]+(?:\d{5})?(?:\s[A-Za-zÀ-ÿ-]+)?)/i,
    /Domicilié\s*(?:à|au)?\s*:?\s*([A-Za-z0-9\s,.-]+(?:\d{5})?(?:\s[A-Za-zÀ-ÿ-]+)?)/i,
    /Adresse client\s*:?\s*([A-Za-z0-9\s,.-]+(?:\d{5})?(?:\s[A-Za-zÀ-ÿ-]+)?)/i,
    /Coordonnées\s*:?\s*(?:[A-Za-zÀ-ÿ\s]+)?(?:\d{10}|\+\d{11}|(?:\d{2}[\s.-]){4}\d{2})?\s*([A-Za-z0-9\s,.-]+(?:\d{5})?(?:\s[A-Za-zÀ-ÿ-]+)?)/i
  ];
  
  // Essayer chaque pattern d'adresse
  for (const pattern of addressPatterns) {
    const addressMatch = text.match(pattern);
    if (addressMatch && addressMatch[1]) {
      data.client.address = addressMatch[1].trim();
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found address:`, data.client.address);
      break;
    }
  }
  
  // Si aucun pattern spécifique n'a fonctionné, rechercher des blocs qui ressemblent à une adresse
  if (!data.client.address) {
    // Rechercher les codes postaux (5 chiffres en France) suivis d'une ville
    const postalCodeMatch = text.match(/(\d{5})\s+([A-Za-zÀ-ÿ\s-]+?)(?:\s*$|\s*\n)/);
    if (postalCodeMatch) {
      // Remonter quelques lignes avant pour trouver l'adresse complète
      const lines = text.split('\n');
      const postalCodeText = postalCodeMatch[0];
      let postalCodeLineIndex = -1;
      
      // Trouver la ligne qui contient le code postal
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(postalCodeText)) {
          postalCodeLineIndex = i;
          break;
        }
      }
      
      // Si on a trouvé la ligne, chercher l'adresse dans les 3 lignes précédentes
      if (postalCodeLineIndex > 0) {
        // Récupérer jusqu'à 3 lignes avant le code postal
        const startLine = Math.max(0, postalCodeLineIndex - 3);
        const addressLines = [];
        
        // Collecter les lignes qui semblent faire partie de l'adresse
        for (let i = startLine; i <= postalCodeLineIndex; i++) {
          // Exclure les lignes qui ne semblent pas être des adresses
          const line = lines[i].trim();
          if (line && 
              !line.includes('ASSURÉ') && 
              !line.includes('Email') && 
              !line.includes('Téléphone') && 
              !line.includes('ASSURANCE') &&
              !line.toLowerCase().includes('police')) {
            addressLines.push(line);
          }
        }
        
        // Assembler l'adresse complète
        if (addressLines.length > 0) {
          data.client.address = addressLines.join(', ');
          if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found address from postal code context:`, data.client.address);
        }
      }
    }
  }
  
  // Extract insurance information
  const insurerMatch = text.match(/ASSURANCE\s*:\s*([A-Za-zÀ-ÿ0-9\s-]+)|ASSURANCE\s*([A-Za-zÀ-ÿ0-9\s-]+)|Assurance\s*:?\s*([A-Za-zÀ-ÿ0-9\s-]+)|ASSUREUR\s*:?\s*([A-Za-zÀ-ÿ0-9\s-]+)|Assureur[\s\n]+([\w\s-]+)/i);
  if (insurerMatch) {
    data.insurer.name = (insurerMatch[5] || insurerMatch[4] || insurerMatch[3] || insurerMatch[1] || insurerMatch[2]).trim();
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found insurer:`, data.insurer.name);
  }
  
  const policyNumberMatch = text.match(/N°\s*(?:de)?\s*police\s*:\s*([A-Za-z0-9-]+)|N°\s*POLICE\s*:\s*([A-Za-z0-9-]+)|police\s*n[°o]?\s*:?\s*([A-Za-z0-9-]+)|Police\s*:?\s*([A-Za-z0-9-]+)|N°\s*Police:?\s*([A-Za-z0-9-]+)/i);
  if (policyNumberMatch) {
    data.insurer.policyNumber = (policyNumberMatch[5] || policyNumberMatch[4] || policyNumberMatch[3] || policyNumberMatch[2] || policyNumberMatch[1]).trim();
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found policy number:`, data.insurer.policyNumber);
  }
  
  const claimNumberMatch = text.match(/N°\s*(?:de)?\s*sinistre\s*:\s*([A-Za-z0-9-]+)|N°\s*SINISTRE\s*:\s*([A-Za-z0-9-]+)|sinistre\s*n[°o]?\s*:?\s*([A-Za-z0-9-]+)|Sinistre\s*:?\s*([A-Za-z0-9-]+)/i);
  if (claimNumberMatch) {
    data.insurer.claimNumber = (claimNumberMatch[4] || claimNumberMatch[3] || claimNumberMatch[2] || claimNumberMatch[1]).trim();
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found claim number:`, data.insurer.claimNumber);
  }
  
  // Vehicle information
  
  // Common car brands
  const carBrands = ['Renault', 'Peugeot', 'Citroën', 'Toyota', 'Volkswagen', 'BMW', 'Mercedes', 'Audi', 'Ford', 'Opel', 'Fiat', 'Hyundai', 'Kia', 'Nissan', 'Dacia'];
  
  // Search for make/model
  for (const brand of carBrands) {
    const regex = new RegExp(`${brand}\\s+([A-Za-z0-9\\s]+)`, 'i');
    const match = text.match(regex);
    if (match) {
      data.vehicle.make = brand;
      data.vehicle.model = match[1].trim();
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found vehicle make/model:`, data.vehicle.make, data.vehicle.model);
      break;
    }
  }
  
  // Direct search by VÉHICULE keyword
  const vehicleSection = text.match(/VÉHICULE:?\s*([^\n]+)|Véhicule:?\s*([^\n]+)|VEHICULE:?\s*([^\n]+)/i);
  if (vehicleSection && !data.vehicle.make) {
    const vehicleInfo = (vehicleSection[3] || vehicleSection[2] || vehicleSection[1]).trim();
    for (const brand of carBrands) {
      if (vehicleInfo.includes(brand)) {
        data.vehicle.make = brand;
        const modelPart = vehicleInfo.split(brand)[1].trim();
        data.vehicle.model = modelPart.split(/\s+/).slice(0, 2).join(' ');
        if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found vehicle from VEHICULE section:`, data.vehicle.make, data.vehicle.model);
        break;
      }
    }
  }
  
  // Also search by Marque/Modèle pattern
  const marqueMatch = text.match(/Marque\s*:?\s*([A-Za-z]+)/i);
  const modeleMatch = text.match(/Modèle\s*:?\s*([^\n:]+?)(?:\s*:|$)/i);
  
  if (marqueMatch) {
    data.vehicle.make = marqueMatch[1].trim();
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found vehicle make from Marque field:`, data.vehicle.make);
  }
  
  if (modeleMatch) {
    data.vehicle.model = modeleMatch[1].trim();
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found vehicle model from Modèle field:`, data.vehicle.model);
  }
  
  // License plate (French format)
  const regMatch = text.match(/[A-Z]{2}[\s-][0-9]{3}[\s-][A-Z]{2}|[0-9]{1,4}\s*[A-Z]{1,3}\s*[0-9]{1,2}|Immatriculation:?\s*([A-Z0-9\s-]+)|Immat:?\s*([A-Z0-9\s-]+)|Immatriculation\s*:?\s+([A-Z0-9\s-]+)|F\s+[A-Z]{2}[-\s][0-9]{3}[-\s][A-Z]{2}/i);
  if (regMatch) {
    data.vehicle.registration = regMatch[3] ? regMatch[3].trim() : 
                               regMatch[2] ? regMatch[2].trim() : 
                               regMatch[1] ? regMatch[1].trim() : 
                               regMatch[0].replace(/Immatriculation:?\s*/i, '').replace(/Immat:?\s*/i, '').trim();
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found registration:`, data.vehicle.registration);
  }
  
  // VIN (17 characters)
  const vinMatch = text.match(/[A-HJ-NPR-Z0-9]{17}|VIN:?\s*([A-Z0-9]+)|Numéro série\s*:?\s*([A-Z0-9]+)/i);
  if (vinMatch) {
    data.vehicle.vin = vinMatch[2] ? vinMatch[2].trim() : 
                      vinMatch[1] ? vinMatch[1].trim() : 
                      vinMatch[0];
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found VIN:`, data.vehicle.vin);
  }
  
  // Mileage
  const mileageMatch = text.match(/(\d{1,3}(?:\s?\d{3})*)\s?(?:km|kilometres|kilomètres)|Kilométrage:?\s*(\d{1,3}(?:\s?\d{3})*)/i);
  if (mileageMatch) {
    data.vehicle.mileage = mileageMatch[2] ? parseInt(mileageMatch[2].replace(/\s/g, '')) : 
                          parseInt(mileageMatch[1].replace(/\s/g, ''));
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found mileage:`, data.vehicle.mileage);
  }

  // **** ANALYSE DES TOTAUX GÉNÉRAUX AVANT D'EXTRAIRE LES DÉTAILS ****
  // C'est critique de récupérer d'abord les montants totaux exacts
  
  // Extraction des totaux HT, TVA, TTC depuis les sections "Total Général" ou "Sous Total Général"
  const totalHtTtcSection = text.match(/(?:Total\s+[gG]énéral|TOTAL\s+GENERAL|Sous\s+total\s+general|TOTAL)[\s\S]*?(\d+[,.]\d+)[\s\S]*?(\d+[,.]\d+)[\s\S]*?(\d+[,.]\d+)/i);
  if (totalHtTtcSection) {
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found general total section`);
    
    // Structure classique: Total HT, TVA, Total TTC
    data.totalHT = parseFloat(totalHtTtcSection[1].replace(',', '.'));
    data.taxAmount = parseFloat(totalHtTtcSection[2].replace(',', '.'));
    data.totalTTC = parseFloat(totalHtTtcSection[3].replace(',', '.'));
    
    // Vérifier cohérence
    if (Math.abs((data.totalHT + data.taxAmount) - data.totalTTC) > 0.1) {
      // Si incohérent, peut-être un format différent (HT, TTC, TVA)
      data.totalHT = parseFloat(totalHtTtcSection[1].replace(',', '.'));
      data.totalTTC = parseFloat(totalHtTtcSection[2].replace(',', '.'));
      data.taxAmount = parseFloat(totalHtTtcSection[3].replace(',', '.'));
      
      // Nouvelle vérification
      if (Math.abs((data.totalHT + data.taxAmount) - data.totalTTC) > 0.1) {
        // Encore incohérent, on prend une autre décision
        if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Inconsistent values in total section, trying alternative extraction`);
      }
    }
    
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Extracted totals: HT=${data.totalHT}€, TVA=${data.taxAmount}€, TTC=${data.totalTTC}€`);
  }
  
  // Si pas de section trouvée, chercher individuellement
  if (!data.totalHT) {
    // Rechercher le montant HT spécifiquement
    const htMatch = text.match(/Total\s+HT\s*:?\s*(\d+[,.]\d+)|Total\s+H\.T\.\s*:?\s*(\d+[,.]\d+)|TOTAL\s+HT\s*:?\s*(\d+[,.]\d+)|HT\s+(\d+[,.]\d+)/i);
    if (htMatch) {
      data.totalHT = parseFloat((htMatch[4] || htMatch[3] || htMatch[2] || htMatch[1]).replace(',', '.'));
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found Total HT specifically:`, data.totalHT);
    }
  }
  
  if (!data.totalTTC) {
    // Rechercher le montant TTC spécifiquement
    const ttcMatch = text.match(/Total\s+TTC\s*:?\s*(\d+[,.]\d+)|Total\s+T\.T\.C\.\s*:?\s*(\d+[,.]\d+)|TOTAL\s+TTC\s*:?\s*(\d+[,.]\d+)|TTC\s+(\d+[,.]\d+)|PRICE\s+TTC\s*:?\s*(\d+[,.]\d+)/i);
    if (ttcMatch) {
      data.totalTTC = parseFloat((ttcMatch[5] || ttcMatch[4] || ttcMatch[3] || ttcMatch[2] || ttcMatch[1]).replace(',', '.'));
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found Total TTC specifically:`, data.totalTTC);
    }
  }
  
  if (!data.taxAmount) {
    // Rechercher le montant TVA spécifiquement
    const tvaMatch = text.match(/TVA\s*:?\s*(\d+[,.]\d+)|Montant\s+TVA\s*:?\s*(\d+[,.]\d+)|TVA\s+(\d+[,.]\d+)%\s+(\d+[,.]\d+)/i);
    if (tvaMatch) {
      // Si format TVA xx% suivi du montant
      if (tvaMatch[3] && tvaMatch[4]) {
        data.taxRate = parseFloat(tvaMatch[3].replace(',', '.')) / 100;
        data.taxAmount = parseFloat(tvaMatch[4].replace(',', '.'));
      } else {
        data.taxAmount = parseFloat((tvaMatch[2] || tvaMatch[1]).replace(',', '.'));
      }
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found TVA amount specifically:`, data.taxAmount);
    }
  }
  
  // Recherche explicite des totaux dans les sections vétusté déduite/non déduite
  if (!data.totalHT || !data.totalTTC || !data.taxAmount) {
    const vetusteSection = text.match(/Vétusté[\s\S]*?déduite[\s\S]*?(\d+[,.]\d+)[\s\S]*?(\d+[,.]\d+)[\s\S]*?(\d+[,.]\d+)/i);
    if (vetusteSection) {
      const possibleHT = parseFloat(vetusteSection[1].replace(',', '.'));
      const possibleTVA = parseFloat(vetusteSection[2].replace(',', '.'));
      const possibleTTC = parseFloat(vetusteSection[3].replace(',', '.'));
      
      // Vérifier cohérence
      if (Math.abs((possibleHT + possibleTVA) - possibleTTC) < 1) {
        // Cohérent, on peut utiliser ces valeurs
        data.totalHT = possibleHT;
        data.taxAmount = possibleTVA;
        data.totalTTC = possibleTTC;
        if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Extracted totals from vétusté section: HT=${data.totalHT}€, TVA=${data.taxAmount}€, TTC=${data.totalTTC}€`);
      }
    }
  }
  
  // Rechercher la section SOUS TOTAL GENERAL avec des valeurs précises
  const sousTotal = text.match(/SOUS\s+TOTAL\s+GENERAL[\s\S]*?(\d+[,.]\d+)[\s\S]*?(\d+[,.]\d+)[\s\S]*?(\d+[,.]\d+)/i);
  if (sousTotal) {
    const possibleHT = parseFloat(sousTotal[1].replace(',', '.'));
    const possibleTVA = parseFloat(sousTotal[2].replace(',', '.'));
    const possibleTTC = parseFloat(sousTotal[3].replace(',', '.'));
    
    // Vérifier cohérence et utiliser si c'est plus précis
    if (Math.abs((possibleHT + possibleTVA) - possibleTTC) < 1) {
      // Si nos totaux actuels ne sont pas définis ou s'il y a une incohérence
      if (!data.totalHT || !data.taxAmount || !data.totalTTC || 
          Math.abs((data.totalHT + data.taxAmount) - data.totalTTC) > 1) {
        data.totalHT = possibleHT;
        data.taxAmount = possibleTVA;
        data.totalTTC = possibleTTC;
        if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Extracted more precise totals from SOUS TOTAL GENERAL: HT=${data.totalHT}€, TVA=${data.taxAmount}€, TTC=${data.totalTTC}€`);
      }
    }
  }

  // Montant global main d'oeuvre
  const moTotal = text.match(/Main d'?oeuvre\s+HT\s*:?\s*([\d\s.,]+\d)/i);
  if (moTotal) {
    const total = parseNumber(moTotal[1]);
    if (!isNaN(total)) {
      data.laborTotal = total;
    }
  }

  // Ligne récapitulative « Ingrédients peinture HT » hors tableau ou format BCA
  if (!data.laborDetails?.some(l => /ingr[eé]dients/i.test(l.type))) {
    if (ingredientBCADetails) {
      data.laborDetails = data.laborDetails || [];
      data.laborDetails.push({
        type: 'Ingrédients peinture',
        hours: ingredientBCADetails.hours,
        rate: ingredientBCADetails.rate,
        total: ingredientBCADetails.total
      });
      data.laborTotal = (data.laborTotal || 0) + ingredientBCADetails.total;
    } else if (ingredientHTTTCLine) {
      const ht = parseNumber(ingredientHTTTCLine[1]);
      const ttc = parseNumber(ingredientHTTTCLine[2]);
      let amt = ht;
      if (isNaN(amt) && !isNaN(ttc)) {
        amt = Math.round((ttc / (1 + data.taxRate)) * 100) / 100;
      }
      if (!isNaN(amt)) {
        data.laborDetails = data.laborDetails || [];
        data.laborDetails.push({
          type: 'Ingrédients peinture',
          hours: 1,
          rate: amt,
          total: amt
        });
        data.laborTotal = (data.laborTotal || 0) + amt;
      }
    } else if (ingredientHTLine) {
      const amt = parseNumber(ingredientHTLine[1]);
      if (!isNaN(amt)) {
        data.laborDetails = data.laborDetails || [];
        data.laborDetails.push({
          type: 'Ingrédients peinture',
          hours: 1,
          rate: amt,
          total: amt
        });
        data.laborTotal = (data.laborTotal || 0) + amt;
      }
    }
  }

  if (metalVernisDetails && !data.laborDetails?.some(l => /m[ée]tal\s+vernis/i.test(l.type))) {
    data.laborDetails = data.laborDetails || [];
    data.laborDetails.push({
      type: 'Ingrédient Métal Vernis',
      hours: metalVernisDetails.hours,
      rate: metalVernisDetails.rate,
      total: metalVernisDetails.total
    });
    data.laborTotal = (data.laborTotal || 0) + metalVernisDetails.total;
  }

  // Montant global pieces de rechange
  const spareMatch = text.match(/PI[ÈE]CES?\s+DE\s+RECHANGE\s*([\d\s.,]+\d)/i);
  if (spareMatch && !data.parts.some(p => /rechange/i.test(p.description))) {
    const price = parseNumber(spareMatch[1]);
    if (!isNaN(price)) {
      data.parts.push({
        description: 'Pièces de rechange',
        quantity: 1,
        unitPrice: price,
        operation: 'E',
        category: 'piece'
      });
    }
  }

  // ----- Détection des remises globales -----
  const percentDiscount = text.match(/(?:remise|rabais|r[ée]duction|abattement)\s*:?[-\s]*(\d+(?:[,.]\d+)?)\s*%/i);
  const amountDiscount = text.match(/(?:remise|rabais|r[ée]duction|abattement)\s*:?[-\s]*(-?\d+(?:[,.]\d+)?)/i);

  let discountValue = null;
  let discountLabel = null;

  if (percentDiscount && data.totalHT) {
    const pct = parseNumber(percentDiscount[1]);
    if (!isNaN(pct)) {
      discountValue = Math.round(data.totalHT * pct) / 100;
      discountLabel = `Remise ${pct}%`;
    }
  } else if (amountDiscount) {
    const amt = parseNumber(amountDiscount[1]);
    if (!isNaN(amt)) {
      discountValue = amt;
      discountLabel = amountDiscount[0].replace(/\s*[-+]?(\d+[,.]\d*).*/, '').trim();
    }
  }

  if (discountValue !== null && discountValue !== 0) {
    data.parts.push({
      description: discountLabel || 'Remise',
      quantity: 1,
      unitPrice: -discountValue,
      reference: null,
      operation: 'D',
      category: 'discount'
    });
    data.totalHTAfterDiscount = data.totalHT != null ? Math.round((data.totalHT - discountValue) * 100) / 100 : null;
  } else {
    data.totalHTAfterDiscount = data.totalHT;
  }

  // ----- Extraction des tableaux comportant une colonne Remise/Rem./Réduc. -----
  const lines = text.split(/\n/);

  // Détection simple du format Alliance Experts
  const hasAllianceRem = lines.some(l => /%\s*Rem\.?/i.test(l));
  const allianceHeader = lines.find(l => /%\s*Rem\.?/i.test(l)) || '';
  const hasAllianceNet = /net/i.test(allianceHeader);
  if (hasAllianceRem) {
    for (const line of lines) {
      if (!line.includes('!')) continue;
      const cols = line.split('!').map(c => c.trim());
      if (cols.length < 9) continue;
      const qty = parseNumber(cols[1]);
      const description = cols[2];
      const reference = cols[3] || null;
      const operation = cols[4] || null;
      const price = parseNumber(cols[5]);
      const remiseStr = cols[7];
      const netCandidate = hasAllianceNet && cols.length > 8 ? parseNumber(cols[8]) : NaN;
      if (isNaN(qty) || isNaN(price) || !description) continue;
      let unit = !isNaN(netCandidate) ? netCandidate : price;
      let comment;
      const remiseVal = parseNumber(remiseStr);
      if (!isNaN(remiseVal) && isNaN(netCandidate)) {
        unit = Math.round(price * (1 - remiseVal / 100) * 100) / 100;
        const pctLabel = remiseStr.includes('%') ? remiseStr : `${remiseStr} %`;
        comment = `Remise appliquée : ${pctLabel} (quantité : ${qty})`;
      }
      if (!data.parts.some(p => p.description === description && Math.abs(parseNumber(p.unitPrice) - unit) < 0.01)) {
        data.parts.push({
          description,
          quantity: qty,
          unitPrice: unit,
          reference,
          operation,
          remise: remiseStr || null,
          comment,
          category: determineCategoryFromDescription(description)
        });
      }
    }
  } else {
    // Recherche d'un en-tête contenant une colonne de remise dans un tableau générique
    let headerIdx = -1;
    let delimiter = null;
    let idxQty = -1;
    let idxDesc = -1;
    let idxPrice = -1;
    let idxRemise = -1;
    let idxNet = -1;

    const discountRegex = /%?\s*(?:rem(?:ise)?\.?|r[ée]duc(?:tion)?|rabais)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!discountRegex.test(line)) continue;
      const delim = line.includes('!') ? '!' : null;
      const cells = delim ? line.split('!').map(c => c.trim()) : line.trim().split(/\s{2,}/);
      const rem = cells.findIndex(c => discountRegex.test(c));
      if (rem === -1) continue;
      const qty = cells.findIndex(c => /qt[ée]|quant/i.test(c));
      const desc = cells.findIndex(c => /libell|design|descr/i.test(c));
      let price = cells.findIndex(c => /(?:pu|p\.u\.|montant|mnt|prix)/i.test(c));
      if (price === -1) price = cells.findIndex(c => /ht\b/i.test(c));
      const net = cells.findIndex(c => /net/i.test(c));
      if (desc !== -1 && price !== -1) {
        headerIdx = i;
        delimiter = delim ? '!' : 'space';
        idxQty = qty;
        idxDesc = desc;
        idxPrice = price;
        idxRemise = rem;
        idxNet = net;
        break;
      }
    }

    if (headerIdx !== -1) {
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (delimiter === '!' && !line.includes('!')) break;
        if (delimiter === 'space' && !/\s{2,}/.test(line)) {
          if (line.trim() === '') continue;
          break;
        }
        const cells = delimiter === '!' ? line.split('!').map(c => c.trim()) : line.trim().split(/\s{2,}/);
        if (cells.length <= Math.max(idxDesc, idxPrice, idxRemise, idxQty, idxNet)) continue;
        const description = cells[idxDesc];
        const price = parseNumber(cells[idxPrice]);
        const qty = idxQty !== -1 ? parseNumber(cells[idxQty]) : 1;
        const remiseStr = cells[idxRemise];
        const netStr = idxNet !== -1 ? cells[idxNet] : undefined;
        if (!description || isNaN(price)) continue;
        let unit = !netStr ? price : parseNumber(netStr);
        let comment;
        const remiseVal = parseNumber(remiseStr);
        if (!isNaN(remiseVal) && (isNaN(unit) || unit === price)) {
          unit = Math.round(price * (1 - remiseVal / 100) * 100) / 100;
          const pctLabel = remiseStr.includes('%') ? remiseStr : `${remiseStr} %`;
          comment = `Remise appliquée : ${pctLabel} (quantité : ${qty})`;
        }
        if (isNaN(unit)) unit = price;
        if (!data.parts.some(p => p.description === description && Math.abs(parseNumber(p.unitPrice) - unit) < 0.01)) {
          data.parts.push({
            description,
            quantity: isNaN(qty) ? 1 : qty,
            unitPrice: unit,
            remise: remiseStr || null,
            comment,
            category: determineCategoryFromDescription(description)
          });
        }
      }
    }
  }

  // ***** EXTRACTION DES PIÈCES *****
  // Plusieurs méthodes complémentaires pour s'assurer de capturer toutes les pièces
  
  // Méthode 1: Recherche des pièces spécifiques mentionnées par l'utilisateur
  const specificPartsList = [
    'BRAS DE SUSPENSION A', 'PNEUMATIQUE AV D D', 'JANTE AV D D',
    'AGRAFES', 'DECHETS', 'MONTAGE EQUILIBRAGE', 'SPOILER AR',
    'PEINTURE DEGRE 3 PAR', 'REMISE EN ETAT PARE'
  ];
  
  // Première passe: chercher les pièces spécifiques mentionnées par l'utilisateur
  for (const partName of specificPartsList) {
    // Créer une regex qui cherche le nom de la pièce suivi d'un montant
    const regex = new RegExp(`${partName}[\\s\\S]*?(\\d+[,.]+\\d+)\\s*(?:€|HT|\\s*%|\\s)`, 'i');
    const match = text.match(regex);
    
    if (match) {
      const price = parseFloat(match[1].replace(',', '.'));
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found specific part ${partName} with price ${price}€`);
      
      // Vérifier si cette pièce n'est pas déjà dans la liste
      if (!data.parts.some(p => p.description.includes(partName))) {
        data.parts.push({
          description: partName,
          quantity: 1,
          unitPrice: price,
          reference: null,
          operation: 'E', // Par défaut
          category: 'piece'
        });
      }
    } else {
      // Si pas de prix trouvé, chercher juste le nom pour voir s'il est mentionné
      const existsRegex = new RegExp(`${partName}`, 'i');
      const exists = text.match(existsRegex);
      
      if (exists && !data.parts.some(p => p.description.includes(partName))) {
        if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found specific part ${partName} without clear price`);
        
        // Chercher un prix à proximité
        const nearbyPriceRegex = new RegExp(`${partName}[\\s\\S]{0,50}?(\\d+[,.]+\\d+)`, 'i');
        const nearbyMatch = text.match(nearbyPriceRegex);
        
        const price = nearbyMatch ? parseFloat(nearbyMatch[1].replace(',', '.')) : 0;
        
        data.parts.push({
          description: partName,
          quantity: 1,
          unitPrice: price,
          reference: null,
          operation: 'E', // Par défaut
          category: 'piece'
        });
      }
    }
  }

  // Méthode 2: Extraction tabulaire pour les tableaux structurés couramment trouvés dans les rapports
  // Format: "Description | Quantité | Prix unitaire HT | Total HT"
  const tabulatedPartsRegex = /([A-ZÀ-ÿ\s\d-]+)\s+(\d+(?:[,.]\d+)?)\s*%?\s+(\d+[,.]\d+)\s+(\d+[,.]\d+)/g;
  let partMatch;
  while ((partMatch = tabulatedPartsRegex.exec(text)) !== null) {
    const description = partMatch[1].trim();
    const quantity = parseFloat(partMatch[2]) || 1;
    const unitPrice = parseFloat(partMatch[3].replace(',', '.'));
    const totalPrice = parseFloat(partMatch[4].replace(',', '.'));
    
    // Vérifier que ce n'est pas une ligne de total et qu'on n'a pas déjà cette pièce
    if (!description.toLowerCase().includes('total') && 
        !description.toLowerCase().includes('libellé') &&
        !data.parts.some(p => p.description === description && Math.abs(p.unitPrice - unitPrice) < 0.01)) {
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found tabulated part: ${description} - ${unitPrice}€ x ${quantity} = ${totalPrice}€`);
      
      data.parts.push({
        description: description,
        quantity: quantity,
        unitPrice: unitPrice,
        reference: null,
        operation: null,
        category: determineCategoryFromDescription(description)
      });
    }
  }

  // Format: "Qty Description PU Total"
  const qtyFirstRegex = /(\d+)\s+([A-ZÀ-ÿ\s-]+)\s+(\d+[,.]\d+)\s+(\d+[,.]\d+)/g;
  while ((partMatch = qtyFirstRegex.exec(text)) !== null) {
    const quantity = parseFloat(partMatch[1]);
    const description = partMatch[2].trim();
    const unitPrice = parseFloat(partMatch[3].replace(',', '.'));
    const totalPrice = parseFloat(partMatch[4].replace(',', '.'));

    if (!description.toLowerCase().includes('total') &&
        !data.parts.some(p => p.description === description && Math.abs(p.unitPrice - unitPrice) < 0.01)) {
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found qty-first part: ${description} - ${unitPrice}€ x ${quantity} = ${totalPrice}€`);

      data.parts.push({
        description,
        quantity,
        unitPrice,
        reference: null,
        operation: null,
        category: determineCategoryFromDescription(description)
      });
    }
  }
  
  // Méthode 3: Recherche spécifique pour les tableaux de "Pièces par choc"
  const piecesParChocSection = text.match(/Pièces\s+par\s+choc[\s\S]*?(?=Ingrédients|Forfait|Total)/i);
  if (piecesParChocSection) {
    const piecesSection = piecesParChocSection[0];
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found 'Pièces par choc' section`);
    
    // Rechercher tous les types de lignes possibles dans cette section
    const piecesLinesRegex = /([A-ZÀ-ÿ\s\d-]+)\s+(?:\d+[,.]\d+\s*%\s*)?(?:\d+[,.]\d+\s*)?(\d+[,.]\d+)\s+(?:\d+[,.]\d+\s*%\s*)?/g;
    
    let piecesMatch;
    while ((piecesMatch = piecesLinesRegex.exec(piecesSection)) !== null) {
      const description = piecesMatch[1].trim();
      const price = parseFloat(piecesMatch[2].replace(',', '.'));
      
      if (price > 0 && !description.toLowerCase().includes('libellé') && 
          !description.toLowerCase().includes('abatt') && !description.toLowerCase().includes('remise')) {
        // Éviter les duplicats
        if (!data.parts.some(p => p.description === description && Math.abs(p.unitPrice - price) < 0.01)) {
          if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found part in 'Pièces par choc': ${description} - ${price}€`);
          
          data.parts.push({
            description: description,
            quantity: 1,
            unitPrice: price,
            reference: null,
            operation: 'E', // Par défaut pour les pièces
            category: 'piece'
          });
        }
      }
    }
  }
  
  // Méthode 4: Recherche de paires "description + prix" partout dans le texte pour les pièces manquantes
  for (const partName of specificPartsList) {
    // Chercher toutes les occurrences du nom de la pièce suivi d'un nombre à virgule
    const globalRegex = new RegExp(`${partName}[\\s\\S]*?(\\d+[,.]+\\d+)`, 'gi');
    let globalMatch;
    
    while ((globalMatch = globalRegex.exec(text)) !== null) {
      const price = parseFloat(globalMatch[1].replace(',', '.'));
      
      // Éviter les duplicats
      if (price > 0 && !data.parts.some(p => p.description === partName && Math.abs(p.unitPrice - price) < 0.01)) {
        if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found part globally: ${partName} - ${price}€`);
        
        data.parts.push({
          description: partName,
          quantity: 1,
          unitPrice: price,
          reference: null,
          operation: 'E', // Par défaut
          category: 'piece'
        });
      }
    }
  }

  // ***** EXTRACTION SPÉCIALE PIÈCES IMPORTANTES *****
  // Recherche ciblée pour BRAS DE SUSPENSION, PNEUMATIQUE et JANTE
  const criticalPartsRegex = /(BRAS\s+DE\s+SUSPENSION[A-Z\s]*|PNEUMATIQUE[A-Z\s\d]*|JANTE[A-Z\s\d]*)\s+(?:\d+[,.]\d+\s*%\s*)?(?:\d+[,.]\d+\s*)?(\d+[,.]\d+)/gi;
  
  let criticalMatch;
  while ((criticalMatch = criticalPartsRegex.exec(text)) !== null) {
    const description = criticalMatch[1].trim();
    const price = parseFloat(criticalMatch[2].replace(',', '.'));
    
    if (price > 0 && !data.parts.some(p => p.description === description && Math.abs(p.unitPrice - price) < 0.01)) {
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found critical part: ${description} - ${price}€`);
      
      data.parts.push({
        description: description,
        quantity: 1,
        unitPrice: price,
        reference: null,
        operation: 'E',
        category: 'piece'
      });
    }
  }
  
  // Format spécifique pour PNEUMATIQUE AV D D
  const pneumaticMatch = text.match(/PNEUMATIQUE\s+AV\s+D\s+D[\s\S]*?(\d+[,.]\d+)/i);
  if (pneumaticMatch && !data.parts.some(p => p.description.includes('PNEUMATIQUE AV D D'))) {
    const price = parseFloat(pneumaticMatch[1].replace(',', '.'));
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found PNEUMATIQUE AV D D with price ${price}€`);
    
    data.parts.push({
      description: 'PNEUMATIQUE AV D D',
      quantity: 1,
      unitPrice: price,
      reference: null,
      operation: 'E',
      category: 'piece'
    });
  }
  
  // Format spécifique pour JANTE AV D D
  const janteMatch = text.match(/JANTE\s+AV\s+D\s+D[\s\S]*?(\d+[,.]\d+)/i);
  if (janteMatch && !data.parts.some(p => p.description.includes('JANTE AV D D'))) {
    const price = parseFloat(janteMatch[1].replace(',', '.'));
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found JANTE AV D D with price ${price}€`);
    
    data.parts.push({
      description: 'JANTE AV D D',
      quantity: 1,
      unitPrice: price,
      reference: null,
      operation: 'E',
      category: 'piece'
    });
  }
  
  // ***** EXTRACTION DES INGRÉDIENTS DE PEINTURE *****
  // Rechercher "Ingrédients peintures par choc" et les lignes associées
  const peintureSection = text.match(/Ingrédients\s+peintures[\s\S]*?(?=Forfait|Total|TOTAL)/i);
  if (peintureSection) {
    const peintureText = peintureSection[0];
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found paint ingredients section`);
    
    // Format: "Libellé | Quantité | P.U. | HT brut"
    const peintureItemsRegex = /(Opaque\s+vernis|[A-Za-zÀ-ÿ\s]+\s+vernis|Base\s+mate|Teinte[s]?\s+[A-Za-zÀ-ÿ\s]*)\s+(?:\d+[,.]\d+)?\s+(?:\d+[,.]\d+)?\s+(\d+[,.]\d+)/gi;
    
    let peintureMatch;
    while ((peintureMatch = peintureItemsRegex.exec(peintureText)) !== null) {
      const description = peintureMatch[1].trim();
      const price = parseFloat(peintureMatch[2].replace(',', '.'));

      if (
        !ingredientLaborDetectedEarly &&
        price > 0 &&
        !data.parts.some(p => p.description === description && Math.abs(p.unitPrice - price) < 0.01)
      ) {
        if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found paint ingredient: ${description} - ${price}€`);

        data.parts.push({
          description: description,
          quantity: 1,
          unitPrice: price,
          reference: null,
          operation: 'P', // P pour Peinture
          category: 'peinture'
        });
      }
    }
    
    // Recherche spécifique pour Opaque vernis
    const opaqueMatch = text.match(/Opaque\s+vernis[\s\S]*?(\d+[,.]\d+)/i);
    if (
      opaqueMatch &&
      !ingredientLaborDetectedEarly &&
      !data.parts.some(p => p.description.includes('Opaque vernis'))
    ) {
      const price = parseFloat(opaqueMatch[1].replace(',', '.'));
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found Opaque vernis with price ${price}€`);
      
      data.parts.push({
        description: 'Opaque vernis',
        quantity: 1,
        unitPrice: price,
        reference: null,
        operation: 'P',
        category: 'peinture'
      });
    }
  }
  
  // ***** EXTRACTION DES FORFAITS *****
  // Rechercher "Forfait par choc" et les lignes associées
  const forfaitSection = text.match(/Forfait\s+par\s+choc[\s\S]*?(?=Total|TOTAL|Main)/i);
  if (forfaitSection) {
    const forfaitText = forfaitSection[0];
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found flat-rate section`);

    const forfaitItemsRegex =
      /(Autre\s+opération\s+forfaitaire|Forfait[A-Za-zÀ-ÿ\s]*)(?:\s+-)?(?:\s+\d+(?:[,.]\d+)?\s+)?(\d+[,.]\d+)/gi;

    let forfaitMatch;
    while ((forfaitMatch = forfaitItemsRegex.exec(forfaitText)) !== null) {
      const description = forfaitMatch[1].trim();
      const price = parseFloat(forfaitMatch[2].replace(',', '.'));

      if (price > 0) {
        if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found flat-rate: ${description} - ${price}€`);

        data.laborDetails = data.laborDetails || [];
        data.laborDetails.push({ type: description, hours: '-', rate: '-', total: price });
      }
    }

    const autreOpMatch = text.match(/Autre\s+opération\s+forfaitaire[\s\S]*?(\d+[,.]\d+)/i);
    if (autreOpMatch) {
      const price = parseFloat(autreOpMatch[1].replace(',', '.'));
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found Autre opération forfaitaire with price ${price}€`);

      data.laborDetails = data.laborDetails || [];
      data.laborDetails.push({ type: 'Autre opération forfaitaire', hours: '-', rate: '-', total: price });
    }
  }

  // Ligne simple "FORFAIT(S) <montant>" hors tableau ou lignes séparées par des tirets
  if (!data.laborDetails || !data.laborDetails.some(l => /FORFAIT/i.test(l.type))) {
    const forfaitRegex = /FORFAIT(?:S|\(S\))?[^\d\n]{0,20}(\d+(?:[,.]\d+)?)(?!\s*h)/i;
    let forfaitSimple = text.replace(/\n/g, ' ').match(forfaitRegex);

    if (!forfaitSimple) {
      // Parcourir les lignes pour détecter "Forfait" suivi d'un montant sur la même ligne
      for (const line of text.split(/\n/)) {
        if (/FORFAIT/i.test(line)) {
          const nums = line.match(/-?\d+(?:[.,]\d+)?/g);
          if (nums && nums.length === 1) {
            forfaitSimple = [null, nums[0]];
            break;
          }
        }
      }
    }

    if (forfaitSimple) {
      const price = parseFloat(forfaitSimple[1].replace(',', '.'));
      if (!isNaN(price)) {
        if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found simple forfait: ${price}€`);
        data.laborDetails = data.laborDetails || [];
        data.laborDetails.push({ type: 'FORFAITS', hours: '-', rate: '-', total: price });
      }
    }
  }

  // ***** DETECTION DES LIGNES ALPHAEXPERT SUR UNE SEULE LIGNE *****
  const alphaExpertRegex = /([A-Za-zÀ-ÿœŒ()'\-\s]+?)\s*[–-]\s*(\d+[,.]\d+)\s*h\s*[–-]\s*(\d+[,.]\d+)\s*(?:€|euros)?\/?h?\s*[–-]\s*(\d+[,.]\d+)/gi;
  const alphaSimpleAmount = /(INGR[ÉE]DIENTS?\s+PEINTURE|PEINTURE)\s*[–-]\s*(\d+[,.]\d+)/gi;
  let alphaMatch;
  let autoInterpreted = false;

  while ((alphaMatch = alphaExpertRegex.exec(text)) !== null) {
    const label = alphaMatch[1].trim();
    const hours = parseNumber(alphaMatch[2]);
    const rate = parseNumber(alphaMatch[3]);
    const total = parseNumber(alphaMatch[4]);

    if (/ingr[eé]dients/i.test(label)) {
      // Traiter les lignes d'ingrédients comme de la main d'œuvre
      data.laborHours = (data.laborHours || 0) + (isNaN(hours) ? 0 : hours);
      if (!data.laborRate && !isNaN(rate)) {
        data.laborRate = rate;
      }
      data.laborDetails = data.laborDetails || [];
      data.laborDetails.push({ type: label, hours, rate, total });
    } else {
      data.laborHours = (data.laborHours || 0) + (isNaN(hours) ? 0 : hours);
      if (!data.laborRate && !isNaN(rate)) {
        data.laborRate = rate;
      }
    }

    autoInterpreted = true;
  }

  while ((alphaMatch = alphaSimpleAmount.exec(text)) !== null) {
    const label = alphaMatch[1].trim();
    const amount = parseNumber(alphaMatch[2]);
    if (
      !ingredientLaborDetectedEarly &&
      !data.parts.some(p => p.description.toUpperCase() === label.toUpperCase())
    ) {
      data.parts.push({
        description: label,
        quantity: 1,
        unitPrice: amount,
        operation: 'P',
        category: 'peinture'
      });
    }
    autoInterpreted = true;
  }

  if (autoInterpreted) {
    data.warnings = data.warnings || [];
    if (!data.warnings.includes('auto_interpreted')) {
      data.warnings.push('auto_interpreted');
    }
  }

  // ***** EXTRACTION DE LA MAIN D'ŒUVRE *****
  if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Extracting labor hours and rate`);
  
  // Rechercher les lignes de main d'œuvre par qualification (T1, T2, Peinture)
  const mainOeuvreSection = text.match(/Main\s+d'oeuvre\s+par\s+choc[\s\S]*?(?=Pièces|Ingrédients|Forfait|TOTAL|Total)/i);
  if (mainOeuvreSection) {
    const moText = mainOeuvreSection[0];
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found 'Main d'oeuvre par choc' section`);
    
    // Extraire les lignes de main d'œuvre avec Nbr heures, P.U., HT brut
    const moLinesRegex = /(Tôlerie\s+T\d|Peinture\s+[A-Z]+\d?|T\d|PEINT\d)\s+(\d+[,.]\d+)\s+(\d+[,.]\d+)\s+(\d+[,.]\d+)/gi;
    
    let totalHours = 0;
    let totalMO = 0;
    let moMatch;
    
    while ((moMatch = moLinesRegex.exec(moText)) !== null) {
      const qualification = moMatch[1].trim();
      const hours = parseFloat(moMatch[2].replace(',', '.'));
      const rate = parseFloat(moMatch[3].replace(',', '.'));
      const total = parseFloat(moMatch[4].replace(',', '.'));
      
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found labor line: ${qualification} - ${hours}h at ${rate}€/h = ${total}€`);
      
      totalHours += hours;
      totalMO += total;
      
      // Conserver le dernier taux horaire trouvé si pas déjà défini
      if (!data.laborRate && rate > 0) {
        data.laborRate = rate;
      }
    }
    
    // Mise à jour des heures totales de main d'œuvre
    if (totalHours > 0) {
      data.laborHours = totalHours;
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Total labor: ${totalHours}h for ${totalMO}€`);
    }
  }
  
  // Si on n'a pas trouvé les heures de MO dans la section dédiée, chercher ailleurs
  if (!data.laborHours) {
    // Rechercher les heures explicites
    const hoursMatch = text.match(/Main\s+d'oeuvre\s*:?\s*(\d+(?:[,.]\d+)?)\s*h/i);
    if (hoursMatch) {
      data.laborHours = parseFloat(hoursMatch[1].replace(',', '.'));
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found explicit labor hours: ${data.laborHours}h`);
    } else {
      // Chercher dans la section "Sous total par choc" si disponible
      const sousTotal = text.match(/Sous\s+total\s+par\s+choc[\s\S]*?Main\s+d'oeuvre[\s\S]*?(\d+[,.]\d+)/i);
      if (sousTotal) {
        const totalMO = parseFloat(sousTotal[1].replace(',', '.'));
        
        if (totalMO > 0 && data.laborRate) {
          // Estimer les heures à partir du total et du taux
          data.laborHours = Math.round((totalMO / data.laborRate) * 10) / 10; // Arrondir à 1 décimale
          if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Estimated labor hours from total: ${data.laborHours}h`);
        }
      } else {
        // Dernière tentative avec un pattern générique
        const genericHoursMatch = text.match(/(\d+[,.]\d+)\s*h(?:eures?)?[\s\S]*?(?:x|×)\s*(\d+[,.]\d+)/i);
        if (genericHoursMatch) {
          data.laborHours = parseFloat(genericHoursMatch[1].replace(',', '.'));
          data.laborRate = parseFloat(genericHoursMatch[2].replace(',', '.'));
          if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found generic labor: ${data.laborHours}h at ${data.laborRate}€/h`);
        }
      }
    }
  }
  
  // Rechercher explicitement le nombre d'heures 4.5 qui apparaît dans la facture finale
  const specificHoursMatch = text.match(/(\d+[,.]\d+)\s*h(?:eures)?/i);
  if (specificHoursMatch && !data.laborHours) {
    const possibleHours = parseFloat(specificHoursMatch[1].replace(',', '.'));
    if (possibleHours > 0) {
      if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Found explicit labor hours: ${possibleHours}h`);
      data.laborHours = possibleHours;
    }
  }

  // Recherche d'un tableau de main d'oeuvre complet dans tout le texte
  if (!data.laborDetails || data.laborDetails.length === 0) {
    const laborRows = parseLaborTable(text);
    if (laborRows.length > 0) {
      data.laborDetails = laborRows.map(r => ({
        type: r.label,
        hours: r.hours,
        rate: r.rate,
        total: r.montantHT
      }));
      if (!data.laborHours) {
        data.laborHours = laborRows.reduce((sum, r) => sum + (isNaN(r.hours) ? 0 : r.hours), 0);
      }
      if (!data.laborRate) {
        const lr = laborRows.find(r => !isNaN(r.rate));
        if (lr) data.laborRate = lr.rate;
      }
      if (!data.laborTotal) {
        data.laborTotal = laborRows.reduce((sum, r) => sum + (isNaN(r.montantHT) ? 0 : r.montantHT), 0);
      }
    }
  }

  // Capture lines like "FORFAITS 3h 75 225" that may not be in table format
  if (!data.laborDetails || !data.laborDetails.some(ld => /FORFAIT/i.test(ld.type))) {
    for (const line of text.split(/\n/)) {
      if (/FORFAIT/i.test(line)) {
        const nums = line.match(/-?\d+(?:[.,]\d+)?/g);
        if (nums && nums.length >= 3) {
          const parsed = nums.map(n => parseNumber(n));
          const [hours, rate, ht, tva, ttc] = [parsed[0], parsed[1], parsed[2], parsed[3], parsed[4]];
          const label = line.replace(/\d.*$/, '').trim() || 'FORFAITS';
          data.laborDetails = data.laborDetails || [];
          data.laborDetails.push({ type: label, hours, rate, total: ht, ht, tva, ttc });
          if (!data.laborHours) data.laborHours = hours;
          if (!data.laborRate) data.laborRate = rate;
          if (!data.laborTotal) data.laborTotal = ht;
          break;
        }
      }
    }
  }

  // Detect standalone "FORFAITS" line even outside tables
  if (!data.laborDetails || !data.laborDetails.some(ld => /^FORFAITS$/i.test(ld.type))) {
    const forfaitMatch = text.match(/FORFAIT(?:S|\(S\))?\s+(\d+(?:[.,]\d{2})?)/i);
    if (forfaitMatch) {
      const amount = parseNumber(forfaitMatch[1]);
      data.laborDetails = data.laborDetails || [];
      data.laborDetails.push({ type: 'FORFAITS', hours: '-', rate: '-', total: amount });
    }
  }

  // Détection générique "Forfait" avec un montant sur la ligne
  if (!data.laborDetails || !data.laborDetails.some(ld => /^Forfait$/i.test(ld.type))) {
    for (const line of text.split(/\n/)) {
      if (/Forfait(?!aire)/i.test(line)) {
        const m = line.match(/(\d+[,.]\d+)/);
        if (m) {
          const amount = parseNumber(m[1]);
          data.laborDetails = data.laborDetails || [];
          data.laborDetails.push({ type: 'Forfait', hours: '-', rate: '-', total: amount });
          break;
        }
      }
    }
  }
  
  // Définir un taux horaire par défaut si aucun n'a été trouvé
  if (!data.laborRate) {
    data.laborRate = 70; // Valeur par défaut
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Using default labor rate: ${data.laborRate}€/h`);
  }
  
  // ***** CALCULS FINAUX ET VÉRIFICATION DE COHÉRENCE *****
  
  // Vérifier que nous avons bien les totaux HT, TVA, TTC
  if (!data.totalHT && !data.totalTTC) {
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] No totals found, attempting to calculate from parts`);
    
    // Calculer le total HT à partir des pièces et de la main d'œuvre
    let calculatedHT = data.parts.reduce((sum, part) => sum + (part.quantity * part.unitPrice), 0);
    calculatedHT += (data.laborHours || 0) * (data.laborRate || 0);
    
    data.totalHT = Math.round(calculatedHT * 100) / 100;
    data.taxAmount = Math.round(data.totalHT * data.taxRate * 100) / 100;
    data.totalTTC = Math.round((data.totalHT + data.taxAmount) * 100) / 100;
    
    if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Calculated totals: HT=${data.totalHT}€, TVA=${data.taxAmount}€, TTC=${data.totalTTC}€`);
  } else {
    // Calculer les valeurs manquantes si nécessaire
    if (!data.totalHT && data.totalTTC && data.taxAmount) {
      data.totalHT = Math.round((data.totalTTC - data.taxAmount) * 100) / 100;
    } else if (!data.taxAmount && data.totalHT && data.totalTTC) {
      data.taxAmount = Math.round((data.totalTTC - data.totalHT) * 100) / 100;
    } else if (!data.totalTTC && data.totalHT && data.taxAmount) {
      data.totalTTC = Math.round((data.totalHT + data.taxAmount) * 100) / 100;
    }
    
    // Calculer/corriger le taux de TVA si possible
    if (data.totalHT && data.taxAmount && data.totalHT > 0) {
      data.taxRate = Math.round((data.taxAmount / data.totalHT) * 100) / 100;
    }
  }
  
  // Ajouter le reste des valeurs aux pièces correspondantes
  // Par exemple, si besoin d'expliciter 'Opaque vernis' comme ingrédient peinture
  categorizePartsFromDescription(data.parts);

  // Si des ingrédients peinture sont déjà comptés en main d'oeuvre, ne pas les ajouter en pièces
  // Detect labor lines referring to paint ingredients even when no "h" is present
  // by matching any line containing "ingrédients" followed by at least two numbers
  const ingredientLaborRegex =
    /ingr[eé]dients?[^\n]*\d+(?:[,.]\d+)?(?:[^\n]*\s+\d+(?:[,.]\d+)?)+/i;
  const ingredientLaborPresent =
    ingredientLaborDetectedEarly ||
    (data.laborDetails && data.laborDetails.some(ld => /ingr[eé]dients?/i.test(ld.type))) ||
    ingredientLaborRegex.test(text);

  if (ingredientLaborPresent) {
    const laborAmounts = (data.laborDetails || [])
      .filter(ld => /ingr[eé]dients?/i.test(ld.type) && !isNaN(parseNumber(ld.total)))
      .map(ld => parseNumber(ld.total));
    data.parts = data.parts.filter(p => {
      const desc = (p.description || '').trim();
      if (/^ingr[eé]dients?\s+peinture$/i.test(desc) && parseNumber(p.quantity) === 1) {
        const amt = parseNumber(p.unitPrice);
        if (laborAmounts.some(a => Math.abs(a - amt) < 0.01)) {
          return false;
        }
      }
      return !/ingr[eé]dients?/i.test(desc);
    });
  }

  // Calculs complémentaires pour vérification
  data.linesTotalHT = calculateLinesTotalHT(data.parts);
  const hours = parseNumber(data.laborHours);
  const rate = parseNumber(data.laborRate);
  if (!isNaN(hours) && !isNaN(rate) && data.laborTotal == null) {
    data.laborTotal = Math.round(hours * rate * 100) / 100;
  }
  if (
    data.laborTotal != null &&
    data.laborHours &&
    (!data.laborRate || isNaN(rate) || Math.abs(rate * hours - data.laborTotal) > 0.01)
  ) {
    data.laborRate = Math.round((data.laborTotal / parseNumber(data.laborHours)) * 100) / 100;
    data.debug = data.debug || {};
    data.debug.adjustments = data.debug.adjustments || [];
    data.debug.adjustments.push(`laborRate inferred ${data.laborRate}`);
  }
  data.linesTotalHT = Math.round((data.linesTotalHT + (data.laborTotal || 0)) * 100) / 100;

  data.missingTerms = [];
  if (/Peinture\s+a\s+pr[eé]voir/i.test(text)) {
    data.missingTerms.push('Peinture');
  }

  if (data.totalHT != null && data.taxAmount != null && data.totalTTC != null) {
    const ht = parseNumber(data.totalHT);
    const tva = parseNumber(data.taxAmount);
    const ttc = parseNumber(data.totalTTC);
    data.totalsVerified = Math.abs(ht + tva - ttc) <= 0.01;
    if (!data.totalsVerified) {
      data.warnings = data.warnings || [];
      if (!data.warnings.includes('totals mismatch')) {
        data.warnings.push('totals mismatch');
      }
    }
  }

  data.debugSummary = { partCount: data.parts.length, totalsMatch: !!data.totalsVerified };
  
  if (import.meta?.env?.DEV) console.log(`[OCR:${processingId}] Final extraction results:`, {
    totalHT: data.totalHT,
    taxAmount: data.taxAmount,
    totalTTC: data.totalTTC,
    taxRate: data.taxRate,
    partsCount: data.parts.length,
    laborHours: data.laborHours,
    linesTotalHT: data.linesTotalHT,
    laborTotal: data.laborTotal,
    totalsVerified: data.totalsVerified,
    missingTerms: data.missingTerms
  });
  
  return data;
}

// Fonction pour déterminer la catégorie d'une pièce à partir de sa description
function determineCategoryFromDescription(description) {
  if (!description) return 'piece';
  
  const desc = description.toLowerCase();
  
  // Ingrédients peinture
  if (desc.includes('opaque') || desc.includes('vernis') || 
      desc.includes('teinte') || desc.includes('base mate') || 
      desc.includes('apprêt') || desc.includes('diluant')) {
    return 'peinture';
  }
  
  // Forfaits
  if (desc.includes('forfait') || desc.includes('autre opération') || 
      desc.includes('opération forfaitaire')) {
    return 'forfait';
  }
  
  // Par défaut, c'est une pièce
  return 'piece';
}

// Fonction pour catégoriser les pièces en fonction de leur description
function categorizePartsFromDescription(parts) {
  for (const part of parts) {
    if (!part.category) {
      part.category = determineCategoryFromDescription(part.description);
    }
  }
}