import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Invoice } from '../../models/Invoice';
import { ArrowLeft, Download, Send, Pencil, AlertCircle, CheckCircle, Clock, X, Calendar, CircleDollarSign, User, Car, FileText, ClipboardCheck, ReceiptText, Building, Phone, Mail, Share2, Loader, Bell, Info, Hash, Tag, PenTool as Tool, ChevronRight } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import EmailSender from '../communication/EmailSender';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';

const InvoiceDetail = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusChangeAnimation, setStatusChangeAnimation] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showEmailSender, setShowEmailSender] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Show an error if loading takes too long
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setError('Temps de chargement dépassé. Veuillez réessayer.');
        setIsLoading(false);
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const invoiceRef = useRef(null);

  // Charger les informations de profil utilisateur
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const { data, error } = await supabase
          .from('users_extended')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) throw error;
        
        setUserProfile(data);
        
        // Set logo preview if available
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      }
    };
    
    loadUserProfile();
  }, []);

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setIsLoading(true);
        const invoiceData = await Invoice.getById(invoiceId);
        
        if (invoiceData) {
          setInvoice(invoiceData);
          setPreviousStatus(invoiceData.status);
        } else {
          throw new Error('Facture introuvable');
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la facture:', error);
        setError(error.message || 'Impossible de charger les détails de la facture');
      } finally {
        setIsLoading(false);
      }
    };

    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  // Mettre à jour le statut de la facture
  const updateStatus = async (newStatus) => {
    if (!invoice || newStatus === invoice.status) return;
    
    try {
      setPreviousStatus(invoice.status);
      
      // Mettre à jour l'affichage immédiatement pour une meilleure UX
      setInvoice(prev => ({
        ...prev,
        status: newStatus
      }));
      
      // Déclencher l'animation
      setStatusChangeAnimation(true);
      
      // Mettre à jour en base de données
      await Invoice.updateStatus(invoice.id, newStatus);
      
      // Afficher un message de succès
      setSuccessMessage(`Statut de la facture mis à jour : ${getStatusLabel(newStatus)}`);
      setShowSuccess(true);
      
      // Masquer le message après 3 secondes
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      
      // En cas d'erreur, revenir au statut précédent
      setInvoice(prev => ({
        ...prev,
        status: previousStatus
      }));
      
      setError('Erreur lors de la mise à jour du statut de la facture');
    } finally {
      // Terminer l'animation après 800ms
      setTimeout(() => {
        setStatusChangeAnimation(false);
      }, 800);
    }
  };

  // Générer le PDF de la facture
  const generatePDF = async () => {
    if (!invoice) return;
    
    try {
      setIsPdfGenerating(true);
      setError(null);
      
      // Créer un tout nouveau contenu pour le PDF au lieu de cloner
      const pdfContent = document.createElement('div');
      pdfContent.style.width = '210mm';
      pdfContent.style.padding = '20mm';
      pdfContent.style.position = 'relative';

      // Définir les couleurs en fonction du template et de la couleur choisie
      const accentMap = {
        blue: '#3b82f6',
        violet: '#8b5cf6',
        gray: '#6b7280'
      };

      const accentColor = accentMap[invoice.template_color] || '#3b82f6';

      const templateStyles = {
        white: {
          background: '#ffffff',
          text: '#000000',
          sectionBg: '#f9f9f9',
          border: '#eeeeee'
        },
        carbon: {
          background: '#1f1f1f',
          text: '#ffffff',
          sectionBg: '#2d2d2d',
          border: '#444444'
        },
        tech: {
          background: '#eef4ff',
          text: '#000000',
          sectionBg: '#ffffff',
          border: accentColor
        }
      };

      const tpl = templateStyles[invoice.template] || templateStyles.white;

      pdfContent.style.backgroundColor = tpl.background;
      pdfContent.style.color = tpl.text;
      pdfContent.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      
      // Structure de base pour tous les templates
      pdfContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            ${userProfile?.logo_url ? `<img src="${userProfile.logo_url}" alt="Logo" style="max-height: 80px; margin-bottom: 10px;">` : ''}
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
            <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: ${accentColor};">FACTURE</h1>
            <div style="font-weight: bold; margin: 5px 0;">${invoice.invoice_number}</div>
            <div>Date: ${new Date(invoice.issue_date).toLocaleDateString('fr-FR')}</div>
            <div>Échéance: ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="width: 48%; padding: 15px; background-color: ${tpl.sectionBg}; border-radius: 5px; border: 1px solid ${tpl.border};">
            <div style="font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; color: #666;">CLIENT</div>
            <div style="font-weight: bold;">${invoice.clients.first_name} ${invoice.clients.last_name}</div>
            ${invoice.clients.address ? `<div>${invoice.clients.address}</div>` : ''}
            ${invoice.clients.email ? `<div>${invoice.clients.email}</div>` : ''}
            ${invoice.clients.phone ? `<div>${invoice.clients.phone}</div>` : ''}
          </div>
          <div style="width: 48%; padding: 15px; background-color: ${tpl.sectionBg}; border-radius: 5px; border: 1px solid ${tpl.border};">
            <div style="font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; color: #666;">VÉHICULE</div>
            <div style="font-weight: bold;">${invoice.vehicles.make} ${invoice.vehicles.model}</div>
            ${invoice.vehicles.registration ? `<div>Immatriculation: ${invoice.vehicles.registration}</div>` : ''}
            ${invoice.vehicles.vin ? `<div>VIN: ${invoice.vehicles.vin}</div>` : ''}
            ${invoice.vehicles.mileage ? `<div>Kilométrage: ${invoice.vehicles.mileage} km</div>` : ''}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; page-break-inside: avoid;">
          <thead>
            <tr style="border-bottom: 1px solid ${tpl.border}; text-align: left; background-color: ${accentColor}; color: #ffffff;">
              <th style="padding: 10px; font-weight: bold;">Description</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Remise (%)</th>
              <th style="padding: 10px; text-align: center; font-weight: bold;">Qté</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Prix Unit.</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.parts.map((part, index) => `
              <tr style="border-bottom: 1px solid ${tpl.border};">
                <td style="padding: 10px;">
                  ${part.description}${part.comment ? `<br><span style="font-size:12px;color:#666;">${part.comment}</span>` : ''}
                </td>
                <td style="padding: 10px; text-align: right;">${part.discount ?? 0}</td>
                <td style="padding: 10px; text-align: center;">${part.quantity}</td>
                <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(part.unitPrice)}</td>
                <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(part.quantity * part.unitPrice * (1 - (part.discount || 0) / 100))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${invoice.laborDetails && invoice.laborDetails.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; page-break-inside: avoid;">
          <thead>
            <tr style="border-bottom: 1px solid ${tpl.border}; background-color: ${tpl.sectionBg};">
              <th style="padding: 10px; font-weight: bold;" colspan="4">Main d'œuvre</th>
            </tr>
            <tr style="border-bottom: 1px solid ${tpl.border};">
              <th style="padding: 10px; font-weight: bold;">Type</th>
              <th style="padding: 10px; text-align: center; font-weight: bold;">Heures</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Taux horaire</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.laborDetails.map(labor => `
              <tr style="border-bottom: 1px solid ${tpl.border};">
                <td style="padding: 10px;">${labor.type}</td>
                <td style="padding: 10px; text-align: center;">${labor.hours} h</td>
                <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(labor.rate)}/h</td>
                <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(labor.total && (!labor.hours || labor.hours === 0) ? labor.total : labor.hours * labor.rate)}</td>
              </tr>
            `).join('')}
            <tr style="border-bottom: 1px solid ${tpl.border}; background-color: ${tpl.sectionBg}; font-weight: bold;">
              <td style="padding: 10px;">Total main d'œuvre</td>
              <td style="padding: 10px; text-align: center;">${invoice.labor_hours} h</td>
              <td style="padding: 10px; text-align: right;">-</td>
              <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.laborDetails.reduce((sum, item) => sum + ((item.total && (!item.hours || item.hours === 0)) ? item.total : (item.hours * item.rate)), 0))}</td>
            </tr>
          </tbody>
        </table>
        ` : `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; page-break-inside: avoid;">
          <thead>
            <tr style="border-bottom: 1px solid ${tpl.border}; text-align: left;">
              <th style="padding: 10px; font-weight: bold;" colspan="4">Main d'œuvre</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: ${tpl.sectionBg};">
              <td style="padding: 10px; font-weight: bold;">Main d'œuvre</td>
              <td style="padding: 10px; text-align: center;">${invoice.labor_hours} h</td>
              <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.labor_rate)}/h</td>
              <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.labor_hours * invoice.labor_rate)}</td>
            </tr>
          </tbody>
        </table>
        `}

        <div style="display: flex; justify-content: flex-end; margin-bottom: 30px; page-break-inside: avoid;">
          <div style="width: 200px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Sous-total:</span>
              <span style="font-weight: medium;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>TVA (${(invoice.tax_rate * 100).toFixed(0)}%):</span>
              <span style="font-weight: medium;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.tax_amount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 5px; border-top: 1px solid ${tpl.border}; font-weight: bold;">
              <span>Total:</span>
              <span>${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.total)}</span>
            </div>
          </div>
        </div>

        ${invoice.insurer && (invoice.insurer.name || invoice.insurer.claimNumber || invoice.insurer.policyNumber) ? `
        <div style="margin-bottom: 30px; page-break-inside: avoid;">
          <h3 style="font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; color: #666;">INFORMATIONS ASSURANCE</h3>
          <div style="font-size: 14px; padding: 10px; background-color: ${tpl.sectionBg}; border-radius: 5px; border: 1px solid ${tpl.border};">
            ${invoice.insurer.name ? `<div style="margin-bottom: 5px;"><strong>Assureur:</strong> ${invoice.insurer.name}</div>` : ''}
            ${invoice.insurer.policyNumber ? `<div style="margin-bottom: 5px;"><strong>N° de Police:</strong> ${invoice.insurer.policyNumber}</div>` : ''}
            ${invoice.insurer.claimNumber ? `<div style="margin-bottom: 5px;"><strong>N° de Sinistre:</strong> ${invoice.insurer.claimNumber}</div>` : ''}
          </div>
        </div>
        ` : ''}

        <div style="margin-bottom: 30px; page-break-inside: avoid;">
          <h3 style="font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; color: #666;">INFORMATIONS DE PAIEMENT</h3>
          <div style="font-size: 14px;">
            <div style="font-weight: medium; margin-bottom: 5px;">Mode de règlement: ${invoice.payment_method || 'Virement bancaire'}</div>
            ${userProfile?.iban ? `<div>IBAN: ${userProfile.iban}</div>` : ''}
            <div>Échéance: ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}</div>
          </div>
        </div>

        ${invoice.notes ? `
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <h3 style="font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; color: #666;">NOTES</h3>
            <div style="font-size: 14px; padding: 10px; background-color: ${tpl.sectionBg}; border-radius: 5px;">${invoice.notes}</div>
          </div>
        ` : ''}

        <div style="font-size: 12px; text-align: center; color: #666; margin-top: 30px; padding-top: 15px; border-top: 1px solid ${tpl.border}; page-break-inside: avoid;">
          ${invoice.legal_text || "Cette facture est émise conformément aux articles L441-3 et L441-9 du Code de commerce. Le non-paiement à l'échéance entraînera des pénalités conformément à la loi en vigueur."}
          ${invoice.insurer && invoice.insurer.claimNumber ? `<div style="margin-top:5px;">Tous droits à indemnités subrogés au profit de la carrosserie ${userProfile?.company_name || ''}, notifiés par pli recommandé le ${new Date(invoice.issue_date).toLocaleDateString('fr-FR')}</div>` : ''}
          ${userProfile?.rcs_number ? `<div style="margin-top: 5px;">${userProfile.rcs_number} ${userProfile.ape_code ? `- APE ${userProfile.ape_code}` : ''}</div>` : ''}
        </div>
        ${userProfile?.stamp_url ? `<img src="${userProfile.stamp_url}" style="position:absolute; bottom:20mm; right:20mm; width:40mm; height:auto;" />` : ''}
      `;
      
      // Configurer les options de génération PDF
      const options = {
        margin: 0,
        filename: `Facture_${invoice.invoice_number}.pdf`,
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
      document.body.appendChild(pdfContent);

      // Générer le PDF
      await html2pdf().from(pdfContent).set(options).save();

      // Supprimer l'élément après génération
      document.body.removeChild(pdfContent);
      
      // Afficher un message de succès
      setSuccessMessage('Facture téléchargée avec succès');
      setShowSuccess(true);
      
      // Masquer le message après 3 secondes
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      setError('Erreur lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Envoyer la facture par email
  const sendInvoice = () => {
    setShowEmailSender(true);
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Générée';
      case 'sent': return 'Envoyée';
      case 'waiting_payment': return 'Paiement en attente';
      case 'paid': return 'Encaissée';
      default: return 'Générée';
    }
  };

  // Obtenir la couleur du statut
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-600';
      case 'sent': return 'bg-blue-500/10 text-blue-600';
      case 'waiting_payment': return 'bg-orange-500/10 text-orange-600';
      case 'paid': return 'bg-emerald-500/10 text-emerald-600';
      default: return 'bg-amber-500/10 text-amber-600';
    }
  };

  // Formater un montant en euros
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Formater une date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  // Navigation vers la page du client
  const goToClient = () => {
    if (invoice?.client_id) {
      navigate(`/dashboard/clients/${invoice.client_id}`);
    }
  };

  // Calculer le total des heures de main d'œuvre à partir des détails
  const calculateLaborTotal = () => {
    if (!invoice || !invoice.laborDetails || !Array.isArray(invoice.laborDetails)) {
      return invoice?.labor_hours * invoice?.labor_rate || 0;
    }
    
    return invoice.laborDetails.reduce((total, labor) => {
      const line = labor.total && (!labor.hours || labor.hours === 0)
        ? labor.total
        : (labor.hours * labor.rate);
      return total + line;
    }, 0);
  };

  // Naviguer vers la page d'édition de la facture
  const handleEditInvoice = () => {
    navigate(`/dashboard/invoices/edit/${invoiceId}`);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error || "Facture introuvable"}</span>
        </div>
        <Link to="/dashboard/invoices" className="text-sm underline mt-4 inline-block">
          Retour à la liste des factures
        </Link>
      </div>
    );
  }

  // Préparer les données pour l'email
  const emailData = {
    recipient: {
      name: `${invoice.clients.first_name} ${invoice.clients.last_name}`,
      email: invoice.clients.email || ''
    },
    vehicle: {
      make: invoice.vehicles.make,
      model: invoice.vehicles.model,
      registration: invoice.vehicles.registration || ''
    },
    invoice: {
      invoice_number: invoice.invoice_number,
      total: invoice.total
    }
  };

  // Calculer le total correct de main d'œuvre
  const laborTotal = calculateLaborTotal();

  return (
    <div className="p-6">
      {/* Message de succès */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed top-4 right-4 z-50 bg-emerald-500/10 text-emerald-600 p-4 rounded-lg shadow-lg border border-emerald-200"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>{successMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <Link to="/dashboard/invoices" className="text-muted-foreground hover:text-foreground flex items-center mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux factures
          </Link>
          <h1 className="text-2xl font-bold">Facture {invoice.invoice_number}</h1>
          <p className="text-muted-foreground">
            Émise le {formatDate(invoice.issue_date)}
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            className="btn-outline"
            onClick={generatePDF}
            disabled={isPdfGenerating}
          >
            {isPdfGenerating ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                Génération...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </>
            )}
          </button>
          
          <button 
            className="btn-outline"
            onClick={sendInvoice}
            disabled={!invoice.clients?.email}
            title={!invoice.clients?.email ? "Le client n'a pas d'adresse email" : ""}
          >
            <Send className="h-4 w-4 mr-2" />
            Envoyer par email
          </button>
          <button 
            className="btn-primary"
            onClick={handleEditInvoice}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Colonne de gauche: Détails de la facture */}
        <div className="md:col-span-2 space-y-6">
          {/* Aperçu de la facture */}
          <div className="bg-card rounded-lg border">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-lg">Détails de la facture</h3>
                
                {/* Menu déroulant pour le statut avec animation */}
                <div className="relative">
                  <motion.div
                    animate={statusChangeAnimation ? {
                      scale: [1, 1.1, 1],
                      y: [0, -5, 0]
                    } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <select
                      value={invoice.status}
                      onChange={(e) => updateStatus(e.target.value)}
                      className={`rounded-full px-3 py-1.5 text-sm ${getStatusColor(invoice.status)} border-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                    >
                      <option value="pending">Générée</option>
                      <option value="sent">Envoyée</option>
                      <option value="waiting_payment">Paiement en attente</option>
                      <option value="paid">Encaissée</option>
                    </select>
                  </motion.div>
                </div>
              </div>
            </div>
            
            {/* Contenu de la facture */}
            <div className="p-6" ref={invoiceRef}>
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-start">
                  {userProfile?.logo_url && (
                    <img 
                      src={userProfile.logo_url} 
                      alt="Logo" 
                      className="h-16 mr-4 object-contain"
                    />
                  )}
                  <div>
                    <div className="text-xl font-bold mb-1">{userProfile?.company_name || 'Votre Entreprise'}</div>
                    <div className="text-sm">
                      {userProfile?.address_street && `${userProfile.address_street}`}<br/>
                      {userProfile?.address_zip_code && userProfile?.address_city && 
                        `${userProfile.address_zip_code} ${userProfile.address_city}`}<br/>
                      {userProfile?.phone && `Tél: ${userProfile.phone}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {userProfile?.siret && `SIRET: ${userProfile.siret}`}<br/>
                      {userProfile?.vat_number && `TVA: ${userProfile.vat_number}`}<br/>
                      {userProfile?.ape_code && `APE: ${userProfile.ape_code}`}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <h1 className="text-2xl font-bold mb-1">FACTURE</h1>
                  <div className="text-xl">{invoice.invoice_number}</div>
                  
                  <div className="text-sm text-muted-foreground mt-2 mb-1">Date d'émission</div>
                  <div className="font-medium">{formatDate(invoice.issue_date)}</div>
                  
                  <div className="text-sm text-muted-foreground mt-2 mb-1">Date d'échéance</div>
                  <div className="font-medium">{formatDate(invoice.due_date)}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-4 bg-muted/10 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1 uppercase">Client</div>
                  <div className="font-medium">{invoice.clients.first_name} {invoice.clients.last_name}</div>
                  {/* Affichage de l'adresse du client si disponible */}
                  {invoice.clients.address && (
                    <div className="text-sm">{invoice.clients.address}</div>
                  )}
                  {invoice.clients.email && <div className="text-sm">{invoice.clients.email}</div>}
                  {invoice.clients.phone && <div className="text-sm">{invoice.clients.phone}</div>}
                </div>
                
                <div className="p-4 bg-muted/10 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1 uppercase">Véhicule</div>
                  <div className="font-medium">{invoice.vehicles.make} {invoice.vehicles.model}</div>
                  {invoice.vehicles.registration && <div className="text-sm">Immatriculation: {invoice.vehicles.registration}</div>}
                  {invoice.vehicles.vin && <div className="text-sm">VIN: {invoice.vehicles.vin}</div>}
                  {/* Affichage du kilométrage du véhicule si disponible */}
                  {invoice.vehicles.mileage && <div className="text-sm">Kilométrage: {invoice.vehicles.mileage} km</div>}
                </div>
              </div>
              
              {/* Tableau des articles */}
              <div className="mb-8 invoice-table">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="py-2 px-3 text-left">Description</th>
                      <th className="py-2 px-3 text-right">Remise (%)</th>
                      <th className="py-2 px-3 text-center">Quantité</th>
                      <th className="py-2 px-3 text-right">Prix unitaire</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoice.parts && invoice.parts.map((part, index) => (
                      <tr key={index}>
                        <td className="py-3 px-3">
                          {part.description}
                          {part.comment && (
                            <div className="text-xs text-muted-foreground">{part.comment}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">{part.discount ?? 0}</td>
                        <td className="py-3 px-3 text-center">{part.quantity}</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(part.unitPrice)}</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(part.quantity * part.unitPrice * (1 - (part.discount || 0) / 100))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Tableau détaillé de la main d'œuvre */}
              {invoice.laborDetails && invoice.laborDetails.length > 0 ? (
                <div className="mb-8 invoice-table">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="py-2 px-3 text-left" colSpan="4">Main d'œuvre</th>
                      </tr>
                      <tr>
                        <th className="py-2 px-3 text-left">Type</th>
                        <th className="py-2 px-3 text-center">Heures</th>
                        <th className="py-2 px-3 text-right">Taux horaire</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invoice.laborDetails.map((labor, index) => (
                        <tr key={index}>
                          <td className="py-3 px-3">{labor.type}</td>
                          <td className="py-3 px-3 text-center">{labor.hours} h</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(labor.rate)}/h</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(
                            labor.total && (!labor.hours || labor.hours === 0)
                              ? labor.total
                              : labor.hours * labor.rate
                          )}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted/10">
                        <td className="py-3 px-3 font-medium">Total main d'œuvre</td>
                        <td className="py-3 px-3 text-center">{invoice.labor_hours} h</td>
                        <td className="py-3 px-3 text-right">-</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(laborTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mb-8 invoice-table">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="py-2 px-3 text-left">Main d'œuvre</th>
                        <th className="py-2 px-3 text-center">Heures</th>
                        <th className="py-2 px-3 text-right">Taux horaire</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr className="bg-muted/10">
                        <td className="py-3 px-3 font-medium">Main d'œuvre</td>
                        <td className="py-3 px-3 text-center">{invoice.labor_hours} h</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(invoice.labor_rate)}/h</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(invoice.labor_hours * invoice.labor_rate)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Totaux */}
              <div className="flex justify-end mb-6 invoice-total">
                <div className="w-64">
                  <div className="flex justify-between py-1">
                    <div className="text-muted-foreground">Sous-total:</div>
                    <div className="font-medium text-foreground">{formatCurrency(invoice.subtotal)}</div>
                  </div>
                  <div className="flex justify-between py-1">
                    <div className="text-muted-foreground">TVA ({(invoice.tax_rate * 100).toFixed(0)}%):</div>
                    <div className="font-medium text-foreground">{formatCurrency(invoice.tax_amount)}</div>
                  </div>
                  <div className="flex justify-between py-2 border-t mt-1">
                    <div className="font-bold text-foreground">Total:</div>
                    <div className="font-bold text-foreground">{formatCurrency(invoice.total)}</div>
                  </div>
                </div>
              </div>
              
              {/* Informations d'assurance */}
              {invoice.insurer && (invoice.insurer.name || invoice.insurer.claimNumber || invoice.insurer.policyNumber) && (
                <div className="mb-6 p-4 bg-muted/10 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Informations d'assurance</h4>
                  <div className="space-y-1">
                    {invoice.insurer.name && (
                      <p className="text-sm"><span className="font-medium">Assureur:</span> {invoice.insurer.name}</p>
                    )}
                    {invoice.insurer.policyNumber && (
                      <p className="text-sm"><span className="font-medium">N° de Police:</span> {invoice.insurer.policyNumber}</p>
                    )}
                    {invoice.insurer.claimNumber && (
                      <p className="text-sm"><span className="font-medium">N° de Sinistre:</span> {invoice.insurer.claimNumber}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Informations de paiement */}
              <div className="bg-muted/10 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-medium mb-2">Informations de paiement</h4>
                <div className="text-sm">
                  <p>Mode de règlement: {invoice.payment_method || 'Virement bancaire'}</p>
                  <p className="mb-2">Date d'échéance: {formatDate(invoice.due_date)}</p>
                  {userProfile?.iban && (
                    <p className="font-medium">IBAN: {userProfile.iban}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{invoice.legal_text}</p>
                </div>
              </div>
              
              {/* Notes */}
              {invoice.notes && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Notes</h4>
                  <p className="text-sm whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
              
              {/* Information de l'entreprise */}
              <div className="text-xs text-gray-500 mt-6 text-center border-t pt-4">
                {userProfile?.rcs_number && `${userProfile.rcs_number}`}
                {userProfile?.rcs_number && userProfile?.ape_code && ` - `}
                {userProfile?.ape_code && `APE ${userProfile.ape_code}`}
              </div>
            </div>
          </div>
          
          {/* Historique des statuts */}
          {invoice.status_history && invoice.status_history.length > 0 && (
            <div className="bg-card rounded-lg border p-6">
              <h3 className="font-medium mb-4">Historique des statuts</h3>
              
              <div className="space-y-4">
                {invoice.status_history.map((entry, index) => (
                  <div key={index} className="flex items-start">
                    <div className="relative mr-4">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        entry.status === 'paid' ? 'bg-emerald-500/20 text-emerald-600' :
                        entry.status === 'waiting_payment' ? 'bg-orange-500/20 text-orange-600' :
                        entry.status === 'sent' ? 'bg-blue-500/20 text-blue-600' :
                        'bg-amber-500/20 text-amber-600'
                      }`}>
                        {entry.status === 'paid' && <CheckCircle className="h-4 w-4" />}
                        {entry.status === 'waiting_payment' && <Clock className="h-4 w-4" />}
                        {entry.status === 'sent' && <Send className="h-4 w-4" />}
                        {entry.status === 'pending' && <FileText className="h-4 w-4" />}
                      </div>
                      {index < invoice.status_history.length - 1 && (
                        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-muted-foreground/20"></div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium">Statut: {getStatusLabel(entry.status)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(entry.timestamp)} • {new Date(entry.timestamp).toLocaleTimeString('fr-FR')}
                      </p>
                      {entry.previous && (
                        <p className="text-xs mt-1">
                          Précédent: {getStatusLabel(entry.previous)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Colonne de droite: Informations contextuelles */}
        <div className="space-y-6">
          {/* Statut et montant */}
          <div className="bg-card rounded-lg border p-6">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Statut actuel</h3>
              <div className={`text-lg font-semibold ${
                invoice.status === 'paid' ? 'text-emerald-600' :
                invoice.status === 'waiting_payment' ? 'text-orange-600' :
                invoice.status === 'sent' ? 'text-blue-600' :
                'text-amber-600'
              }`}>
                {getStatusLabel(invoice.status)}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Montant total</h3>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(invoice.total)}</div>
              <div className="text-xs text-muted-foreground">
                Dont TVA: {formatCurrency(invoice.tax_amount)}
              </div>
            </div>
          </div>
          
          {/* Informations clés */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-medium mb-4">Informations</h3>
            
            <div className="space-y-4">
              <div className="flex">
                <div className="bg-muted/30 p-2 rounded mr-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Date d'émission</h4>
                  <p className="text-sm">{formatDate(invoice.issue_date)}</p>
                </div>
              </div>
              
              <div className="flex">
                <div className="bg-muted/30 p-2 rounded mr-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Date d'échéance</h4>
                  <p className="text-sm">{formatDate(invoice.due_date)}</p>
                </div>
              </div>
              
              <div className="flex">
                <div className="bg-muted/30 p-2 rounded mr-3">
                  <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Mode de paiement</h4>
                  <p className="text-sm">{invoice.payment_method || 'Virement bancaire'}</p>
                  {userProfile?.iban && (
                    <p className="text-xs text-muted-foreground mt-1">IBAN: {userProfile.iban}</p>
                  )}
                </div>
              </div>
              
              <div className="flex">
                <div className="bg-muted/30 p-2 rounded mr-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Client</h4>
                  <p className="text-sm">{invoice.clients.first_name} {invoice.clients.last_name}</p>
                </div>
              </div>
              
              <div className="flex">
                <div className="bg-muted/30 p-2 rounded mr-3">
                  <Car className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Véhicule</h4>
                  <p className="text-sm">{invoice.vehicles.make} {invoice.vehicles.model}</p>
                </div>
              </div>
              
              {invoice.report_id && (
                <div className="flex">
                  <div className="bg-muted/30 p-2 rounded mr-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Rapport d'expertise</h4>
                    <Link 
                      to={`/dashboard/reports/${invoice.report_id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Voir le rapport associé
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Actions rapides */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-medium mb-4">Actions rapides</h3>
            
            <div className="space-y-3">
              <button 
                className="w-full btn-outline flex items-center justify-center py-2"
                onClick={generatePDF}
                disabled={isPdfGenerating}
              >
                {isPdfGenerating ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger le PDF
                  </>
                )}
              </button>
              
              <button 
                className="w-full btn-outline flex items-center justify-center py-2"
                onClick={sendInvoice}
                disabled={!invoice.clients.email}
              >
                <Send className="h-4 w-4 mr-2" />
                Envoyer par email
              </button>
              
              {invoice.status === 'pending' && (
                <button 
                  className="w-full btn-outline flex items-center justify-center py-2"
                  onClick={() => updateStatus('sent')}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Marquer comme envoyée
                </button>
              )}
              
              {invoice.status === 'sent' && (
                <button 
                  className="w-full btn-outline flex items-center justify-center py-2"
                  onClick={() => updateStatus('waiting_payment')}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Marquer en attente de paiement
                </button>
              )}
              
              {(invoice.status === 'sent' || invoice.status === 'waiting_payment') && (
                <button 
                  className="w-full btn-primary flex items-center justify-center py-2"
                  onClick={() => updateStatus('paid')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marquer comme encaissée
                </button>
              )}
              
              {invoice.status === 'paid' && (
                <div className="flex items-center justify-center text-emerald-600 bg-emerald-500/10 p-2 rounded-md">
                  <Info className="h-4 w-4 mr-2" />
                  <span className="text-sm">Facture déjà encaissée</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Informations d'assurance si disponibles */}
          {invoice.insurer && (invoice.insurer.name || invoice.insurer.policyNumber || invoice.insurer.claimNumber) && (
            <div className="bg-card rounded-lg border p-6">
              <h3 className="font-medium mb-4">Assurance</h3>
              <div className="space-y-2">
                {invoice.insurer.name && (
                  <div>
                    <h4 className="text-sm text-muted-foreground">Assureur</h4>
                    <p className="font-medium">{invoice.insurer.name}</p>
                  </div>
                )}
                
                {invoice.insurer.policyNumber && (
                  <div>
                    <h4 className="text-sm text-muted-foreground">N° de police</h4>
                    <p>{invoice.insurer.policyNumber}</p>
                  </div>
                )}
                
                {invoice.insurer.claimNumber && (
                  <div>
                    <h4 className="text-sm text-muted-foreground">N° de sinistre</h4>
                    <p>{invoice.insurer.claimNumber}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Informations de l'entreprise */}
          {userProfile && (
            <div className="bg-card rounded-lg border p-6">
              <h3 className="font-medium mb-4">Informations entreprise</h3>
              <div className="space-y-2">
                {userProfile.company_name && (
                  <div>
                    <h4 className="text-sm text-muted-foreground">Entreprise</h4>
                    <p className="font-medium">{userProfile.company_name}</p>
                  </div>
                )}
                
                {userProfile.siret && (
                  <div>
                    <h4 className="text-sm text-muted-foreground">SIRET</h4>
                    <p>{userProfile.siret}</p>
                  </div>
                )}
                
                {userProfile.vat_number && (
                  <div>
                    <h4 className="text-sm text-muted-foreground">TVA</h4>
                    <p>{userProfile.vat_number}</p>
                  </div>
                )}
                
                {userProfile.ape_code && (
                  <div>
                    <h4 className="text-sm text-muted-foreground">Code APE</h4>
                    <p>{userProfile.ape_code}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Module d'envoi d'email */}
      {showEmailSender && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl border max-w-4xl w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Envoyer la facture par email</h2>
              <button 
                onClick={() => setShowEmailSender(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <EmailSender
                recipient={emailData.recipient}
                vehicle={emailData.vehicle}
                invoice={emailData.invoice}
                preselectedTemplate="invoice"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetail;