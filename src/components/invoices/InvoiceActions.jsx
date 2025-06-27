import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Download, Send, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import { supabase } from '../../lib/supabase';

const InvoiceActions = ({ invoice, onDownloadStart, onDownloadComplete, onSendClick }) => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Ouvrir la page de détail
  const handleViewClick = () => {
    navigate(`/dashboard/invoices/${invoice.id}`);
  };

  // Télécharger la facture en PDF
  const handleDownloadClick = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      onDownloadStart && onDownloadStart(invoice.id);

      // Récupérer les données complètes de la facture avec les relations
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients(id, first_name, last_name, email, phone),
          vehicles(id, make, model, registration, vin)
        `)
        .eq('id', invoice.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Facture introuvable");

      // Récupérer le profil utilisateur pour les informations d'entreprise
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session non trouvée");

      const { data: userProfile, error: profileError } = await supabase
        .from('users_extended')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      // Créer un élément HTML pour la facture
      const invoiceElement = document.createElement('div');
      invoiceElement.className = "invoice-pdf";
      invoiceElement.style.width = '210mm';
      invoiceElement.style.padding = '20mm';
      invoiceElement.style.backgroundColor = 'white';
      invoiceElement.style.color = '#333';
      invoiceElement.style.fontFamily = 'sans-serif';

      // Structure de la facture basée sur le template selectionné
      invoiceElement.innerHTML = `
        <div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            ${userProfile?.logo_url ? `
              <img src="${userProfile.logo_url}" alt="Logo" style="max-height: 80px; margin-bottom: 10px;">
            ` : ''}
            <div style="font-size: 18px; font-weight: bold;">${userProfile?.company_name || 'Votre Entreprise'}</div>
            <div style="font-size: 14px;">
              ${userProfile?.address_street || ''}<br>
              ${userProfile?.address_zip_code || ''} ${userProfile?.address_city || ''}<br>
              ${userProfile?.phone ? `Tél: ${userProfile.phone}<br>` : ''}
              ${userProfile?.siret ? `SIRET: ${userProfile.siret}<br>` : ''}
              ${userProfile?.vat_number ? `TVA: ${userProfile.vat_number}` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0;">FACTURE</h1>
            <div style="font-weight: bold; margin: 5px 0;">${data.invoice_number}</div>
            <div>Date: ${new Date(data.issue_date).toLocaleDateString('fr-FR')}</div>
            <div>Échéance: ${new Date(data.due_date).toLocaleDateString('fr-FR')}</div>
          </div>
        </div>

        <div style="margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div style="padding: 15px; background-color: #f9f9f9; border-radius: 5px; border: 1px solid #eee;">
            <div style="font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; color: #666;">CLIENT</div>
            <div style="font-weight: bold;">${data.clients.first_name} ${data.clients.last_name}</div>
            ${data.clients.email ? `<div>${data.clients.email}</div>` : ''}
            ${data.clients.phone ? `<div>${data.clients.phone}</div>` : ''}
          </div>
          <div style="padding: 15px; background-color: #f9f9f9; border-radius: 5px; border: 1px solid #eee;">
            <div style="font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; color: #666;">VÉHICULE</div>
            <div style="font-weight: bold;">${data.vehicles.make} ${data.vehicles.model}</div>
            ${data.vehicles.registration ? `<div>Immatriculation: ${data.vehicles.registration}</div>` : ''}
            ${data.vehicles.vin ? `<div>VIN: ${data.vehicles.vin}</div>` : ''}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; page-break-inside: avoid;">
          <thead>
            <tr style="border-bottom: 1px solid #eee; text-align: left;">
              <th style="padding: 10px; font-weight: bold;">Description</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Remise (%)</th>
              <th style="padding: 10px; text-align: center; font-weight: bold;">Qté</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Prix Unit.</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.parts.map((part, index) => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${part.description}</td>
                <td style="padding: 10px; text-align: right;">${part.discount ?? 0}</td>
                <td style="padding: 10px; text-align: center;">${part.quantity}</td>
                <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(part.unitPrice)}</td>
                <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(part.quantity * part.unitPrice * (1 - (part.discount || 0) / 100))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${data.laborDetails && data.laborDetails.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; page-break-inside: avoid;">
          <thead>
            <tr style="border-bottom: 1px solid #eee; background-color: #f5f5f5;">
              <th style="padding: 10px; font-weight: bold;" colspan="4">Main d'œuvre</th>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <th style="padding: 10px; font-weight: bold;">Type</th>
              <th style="padding: 10px; text-align: center; font-weight: bold;">Heures</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Taux horaire</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.laborDetails.map(labor => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${labor.type}</td>
                <td style="padding: 10px; text-align: center;">${labor.hours} h</td>
                <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(labor.rate)}/h</td>
                <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(labor.total && (!labor.hours || labor.hours === 0) ? labor.total : labor.hours * labor.rate)}</td>
              </tr>
            `).join('')}
            <tr style="border-bottom: 1px solid #eee; background-color: #f5f5f5; font-weight: bold;">
              <td style="padding: 10px;">Total main d'œuvre</td>
              <td style="padding: 10px; text-align: center;">${data.labor_hours} h</td>
              <td style="padding: 10px; text-align: right;">-</td>
              <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(data.laborDetails.reduce((sum, item) => sum + ((item.total && (!item.hours || item.hours === 0)) ? item.total : (item.hours * item.rate)), 0))}</td>
            </tr>
          </tbody>
        </table>
        ` : `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; page-break-inside: avoid;">
          <thead>
            <tr style="border-bottom: 1px solid #eee; text-align: left;">
              <th style="padding: 10px; font-weight: bold;" colspan="4">Main d'œuvre</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold;">Main d'œuvre</td>
              <td style="padding: 10px; text-align: center;">${data.labor_hours} h</td>
              <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(data.labor_rate)}/h</td>
              <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(data.labor_hours * data.labor_rate)}</td>
            </tr>
          </tbody>
        </table>
        `}

        <div style="display: flex; justify-content: flex-end; margin-bottom: 30px; page-break-inside: avoid;">
          <div style="width: 200px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Sous-total:</span>
              <span style="font-weight: medium;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(data.subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>TVA (${(data.tax_rate * 100).toFixed(0)}%):</span>
              <span style="font-weight: medium;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(data.tax_amount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 5px; border-top: 1px solid #eee; font-weight: bold;">
              <span>Total:</span>
              <span>${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(data.total)}</span>
            </div>
          </div>
        </div>

        ${data.insurer && (data.insurer.name || data.insurer.claimNumber || data.insurer.policyNumber) ? `
        <div style="margin-bottom: 30px; page-break-inside: avoid;">
          <h3 style="font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; color: #666;">INFORMATIONS ASSURANCE</h3>
          <div style="font-size: 14px; padding: 10px; background-color: #f9f9f9; border-radius: 5px; border: 1px solid #eee;">
            ${data.insurer.name ? `<div style="margin-bottom: 5px;"><strong>Assureur:</strong> ${data.insurer.name}</div>` : ''}
            ${data.insurer.policyNumber ? `<div style="margin-bottom: 5px;"><strong>N° de Police:</strong> ${data.insurer.policyNumber}</div>` : ''}
            ${data.insurer.claimNumber ? `<div style="margin-bottom: 5px;"><strong>N° de Sinistre:</strong> ${data.insurer.claimNumber}</div>` : ''}
          </div>
        </div>
        ` : ''}

        <div style="margin-bottom: 30px; page-break-inside: avoid;">
          <h3 style="font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; color: #666;">INFORMATIONS DE PAIEMENT</h3>
          <div style="font-size: 14px;">
            <div style="font-weight: medium; margin-bottom: 5px;">Mode de règlement: ${data.payment_method || 'Virement bancaire'}</div>
            ${userProfile?.iban ? `<div>IBAN: ${userProfile.iban}</div>` : ''}
            <div>Échéance: ${new Date(data.due_date).toLocaleDateString('fr-FR')}</div>
          </div>
        </div>

        ${data.notes ? `
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <h3 style="font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; color: #666;">NOTES</h3>
            <div style="font-size: 14px; padding: 10px; background-color: #f9f9f9; border-radius: 5px;">${data.notes}</div>
          </div>
        ` : ''}

        <div style="font-size: 12px; text-align: center; color: #666; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; page-break-inside: avoid;">
          ${data.legal_text || "Cette facture est émise conformément aux articles L441-3 et L441-9 du Code de commerce. Le non-paiement à l'échéance entraînera des pénalités conformément à la loi en vigueur."}
          ${data.insurer && data.insurer.claimNumber ? `<div style="margin-top:5px;">Tous droits à indemnités subrogés au profit de la carrosserie ${userProfile?.company_name || ''}, notifiés par pli recommandé le ${new Date(data.issue_date).toLocaleDateString('fr-FR')}</div>` : ''}
          ${userProfile?.rcs_number ? `<div style="margin-top: 5px;">${userProfile.rcs_number} ${userProfile.ape_code ? `- APE ${userProfile.ape_code}` : ''}</div>` : ''}
        </div>
      `;

      // Configurer les options de génération PDF
      const options = {
        margin: 0,
        filename: `Facture_${data.invoice_number}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false 
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Ajouter l'élément à la page temporairement
      document.body.appendChild(invoiceElement);

      // Générer le PDF
      await html2pdf().from(invoiceElement).set(options).save();

      // Supprimer l'élément après génération
      document.body.removeChild(invoiceElement);
      
      onDownloadComplete && onDownloadComplete(invoice.id, true);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      setError(error.message);
      onDownloadComplete && onDownloadComplete(invoice.id, false, error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="p-1 rounded hover:bg-muted transition-colors text-primary"
        onClick={handleViewClick}
        title="Voir les détails"
      >
        <Eye className="h-4 w-4" />
      </motion.button>
      
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="p-1 rounded hover:bg-muted transition-colors"
        onClick={handleDownloadClick}
        disabled={isGenerating}
        title="Télécharger PDF"
      >
        {isGenerating ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </motion.button>
      
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="p-1 rounded hover:bg-muted transition-colors"
        onClick={onSendClick}
        disabled={!invoice.clients?.email}
        title={invoice.clients?.email ? "Envoyer par email" : "Client sans email"}
      >
        <Send className="h-4 w-4" />
      </motion.button>
    </div>
  );
};

export default InvoiceActions;