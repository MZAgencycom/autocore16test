import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Report } from '../../models/Report';
import { Invoice } from '../../models/Invoice';
import { ArrowLeft, Download, Send, Pencil, AlertCircle, CheckCircle, Clock, X, Calendar, CircleDollarSign, User, Car, FileText, ClipboardCheck, ReceiptText, Building, Phone, Mail, Share2, Loader, Bell, Info, Hash, Tag, PenTool as Tool, ChevronRight, ScrollText } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import EmailSender from '../communication/EmailSender';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import InvoiceGenerator from './InvoiceGenerator';
import downloadFile from '../../utils/downloadFile';

const ReportDetail = () => {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
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
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);

  const openInvoiceGenerator = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      await supabase.auth.refreshSession();
    }
    setShowInvoiceGenerator(true);
  };

  // Display an error if the loading takes too long
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setError('Temps de chargement dépassé. Veuillez réessayer.');
        setIsLoading(false);
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const warningMessages = {
    'expertName missing': "Nom de l'expert non détecté",
    'reportNumber missing': 'Numéro de rapport manquant',
    'parts list empty': 'Aucune pièce détectée',
    'totals incomplete': 'Totaux incomplets',
    'small supplies missing': 'Petites fournitures manquantes',
    'discount missing': 'Remise non détectée',
    'totals mismatch': 'Écart de totaux'
  };

  const translateWarning = (w) => warningMessages[w] || w;

  const navigate = useNavigate();

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
    const loadReportDetails = async () => {
      try {
        setIsLoading(true);
        const reportData = await Report.getById(reportId);
        
        if (reportData) {
          setReport(reportData);
          setPreviousStatus(reportData.status);
          if (import.meta?.env?.DEV) console.log('Chargement terminé', reportData);
        } else {
          throw new Error('Rapport introuvable');
        }
      } catch (error) {
        console.error('Error fetching report details:', error);
        setError(error.message || 'Impossible de charger les détails du rapport');
      } finally {
        setIsLoading(false);
      }
    };

    if (reportId) {
      loadReportDetails();
    }
  }, [reportId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setError('Temps de chargement dépassé. Veuillez rafraîchir.');
        setIsLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Fonction pour télécharger le PDF du rapport
  const downloadReport = async () => {
    try {
      if (report?.file_url) {
        await downloadFile(report.file_url, 'rapport.pdf');
      }
    } catch (err) {
      console.error('Failed to download report:', err);
    }
  };

  // Formater la date de manière lisible
  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  // Navigation vers la page du client
  const goToClient = () => {
    if (report?.client_id) {
      navigate(`/dashboard/clients/${report.client_id}`);
    }
  };

  // Format monétaire
  const formatCurrency = (value) => {
    if (!value) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error || "Rapport introuvable"}</p>
          </div>
          <Link to="/dashboard/reports" className="text-sm underline mt-2 inline-block">
            Retour à la liste des rapports
          </Link>
        </div>
      </div>
    );
  }

  // Extraction des données du rapport
  const extractedData = report.extracted_data || {};
  const clientData = {
    firstName: report.clients?.first_name || extractedData.client?.firstName,
    lastName: report.clients?.last_name || extractedData.client?.lastName,
    email: report.clients?.email || extractedData.client?.email,
    phone: report.clients?.phone || extractedData.client?.phone
  };
  
  const vehicleData = {
    make: report.vehicles?.make || extractedData.vehicle?.make,
    model: report.vehicles?.model || extractedData.vehicle?.model,
    registration: report.vehicles?.registration || extractedData.vehicle?.registration,
    vin: report.vehicles?.vin || extractedData.vehicle?.vin,
    year: report.vehicles?.year || extractedData.vehicle?.year,
    mileage: report.vehicles?.mileage || extractedData.vehicle?.mileage
  };
  
  const insurerData = extractedData.insurer || {};
  const partsData = extractedData.parts || [];
  const laborHours = extractedData.laborHours || report.labor_hours || 0;
  const laborRate = extractedData.laborRate || 70;
  const laborDetails = extractedData.laborDetails || [];
  
  // Totaux financiers
  const totalHT = extractedData.totalHT || 0;
  const taxAmount = extractedData.taxAmount || 0;
  const totalTTC = extractedData.totalTTC || 0;

  return (
    <div className="p-6">
      {/* Warning for missing fields */}
      {extractedData.missingFields && extractedData.missingFields.length > 0 && (
        <div className="bg-amber-100 text-amber-800 p-4 rounded-lg mb-6">
          <p className="font-medium mb-1">
            ⚠️ Veuillez relire attentivement les lignes générées. Certains 
            éléments peuvent nécessiter un ajout manuel. Notre IA s'améliore 
            continuellement pour vous offrir des résultats optimaux.
          </p>
          <ul className="list-disc list-inside text-sm">
            {extractedData.missingFields.map((w, i) => (
              <li key={i}>{translateWarning(w)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Entête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <Link to="/dashboard/reports" className="text-muted-foreground hover:text-foreground flex items-center mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux rapports
          </Link>
          <h1 className="text-2xl font-bold">Rapport d'expertise</h1>
          <p className="text-muted-foreground">
            Détails du rapport importé le {formatDate(report.created_at)}
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            className="btn-outline"
            onClick={downloadReport}
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger PDF
          </button>
          <button
            className="btn-primary"
            onClick={openInvoiceGenerator}
          >
            <ScrollText className="h-4 w-4 mr-2" />
            Générer une facture
          </button>
        </div>
      </div>
      
      {/* Contenu principal */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Informations générales */}
        <div className="md:col-span-8 space-y-6">
          {/* Carte d'informations principales */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-primary/10 text-primary mr-3">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {report.file_name || `Rapport #${reportId.substring(0, 8)}`}
                  </h2>
                  {report.status === 'analyzed' ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">✅ Analysé</span>
                      <span className="text-gray-600 text-sm">
                        👉 <span className="font-medium text-blue-600">Pense à cliquer sur</span>{' '}
                        <span className="font-semibold text-pink-500">"Générer une facture"</span> pour tout vérifier.
                        <span className="ml-1">Notre IA t’assiste avec 💡 mais ne remplace pas tes yeux d’expert 👀.</span>
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400">
                        En attente d'analyse
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {/* Infos client */}
              <div className="space-y-2">
                <div className="flex items-center text-muted-foreground mb-2">
                  <User className="h-4 w-4 mr-2" />
                  <h3 className="font-medium">Informations client</h3>
                </div>
                <div 
                  className="p-3 bg-muted/20 rounded-md cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={goToClient}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{clientData.firstName} {clientData.lastName}</p>
                      <div className="text-sm text-muted-foreground mt-1">
                        {clientData.email && <p>{clientData.email}</p>}
                        {clientData.phone && <p>{clientData.phone}</p>}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
              
              {/* Infos véhicule */}
              <div className="space-y-2">
                <div className="flex items-center text-muted-foreground mb-2">
                  <Car className="h-4 w-4 mr-2" />
                  <h3 className="font-medium">Véhicule</h3>
                </div>
                <div className="p-3 bg-muted/20 rounded-md">
                  <p className="font-medium">{vehicleData.make} {vehicleData.model}</p>
                  <div className="text-sm text-muted-foreground mt-1">
                    {vehicleData.registration && <p>Immatriculation: {vehicleData.registration}</p>}
                    {vehicleData.vin && <p>VIN: {vehicleData.vin}</p>}
                    {vehicleData.year && <p>Année: {vehicleData.year}</p>}
                    {vehicleData.mileage && <p>Kilométrage: {vehicleData.mileage} km</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Détails du rapport - Pièces détachées */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">Pièces détachées</h3>
            
            {partsData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="py-2 text-left">Description</th>
                      <th className="py-2 text-center">Quantité</th>
                      <th className="py-2 text-right">Prix unitaire</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {partsData.map((part, index) => {
                      const unitPrice = part.unitPrice || 0;
                      const quantity = part.quantity || 1;
                      const total = unitPrice * quantity;
                      
                      return (
                        <tr key={index}>
                          <td className="py-3">{part.description}</td>
                          <td className="py-3 text-center">{quantity}</td>
                          <td className="py-3 text-right">
                            {formatCurrency(unitPrice)}
                            {part.remise && (
                              <span className="ml-1 text-xs text-muted-foreground">({part.remise} de remise appliquée)</span>
                            )}
                          </td>
                          <td className="py-3 text-right">{formatCurrency(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-muted/20 rounded-md">
                <Tool className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  Aucune pièce détachée n'a été détectée dans ce rapport.
                </p>
              </div>
            )}
          </div>
          
          {/* Détails du rapport - Main d'oeuvre */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">Main d'oeuvre</h3>
            
            {laborDetails && laborDetails.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="py-2 text-left">Type</th>
                      <th className="py-2 text-center">Heures</th>
                      <th className="py-2 text-right">Taux horaire</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {laborDetails.map((labor, index) => (
                      <tr key={index}>
                        <td className="py-3">{labor.type}</td>
                        <td className="py-3 text-center">{labor.hours} h</td>
                        <td className="py-3 text-right">{formatCurrency(labor.rate)}/h</td>
                        <td className="py-3 text-right">{formatCurrency(
                          labor.total && (!labor.hours || labor.hours === 0)
                            ? labor.total
                            : labor.hours * labor.rate
                        )}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/10 font-medium">
                      <td className="py-3">Total main d'oeuvre</td>
                      <td className="py-3 text-center">{laborHours} h</td>
                      <td className="py-3 text-right">-</td>
                      <td className="py-3 text-right">{formatCurrency(laborDetails.reduce((sum, item) => sum + ((item.total && (!item.hours || item.hours === 0)) ? item.total : (item.hours * item.rate)), 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex justify-between items-center py-3 px-4 bg-muted/10 rounded-md">
                <div>
                  <span className="font-medium">Total main d'oeuvre:</span>
                  <p className="text-muted-foreground text-sm">{laborHours} heures à {formatCurrency(laborRate)}/h</p>
                </div>
                <div className="text-right font-medium">
                  {formatCurrency(laborHours * laborRate)}
                </div>
              </div>
            )}
            
            {/* Totaux */}
            {(totalHT > 0 || totalTTC > 0) && (
              <div className="mt-6 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total HT:</span>
                    <span className="font-medium">{formatCurrency(totalHT)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TVA (20%):</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t">
                    <span>Total TTC:</span>
                    <span>{formatCurrency(totalTTC)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Sidebar d'informations complémentaires */}
        <div className="md:col-span-4 space-y-6">
          {/* Métadonnées du rapport */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-base font-medium mb-4">Détails du rapport</h3>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="bg-muted/30 p-2 rounded-md mr-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Date d'analyse</p>
                  <p className="font-medium">{formatDate(report.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-muted/30 p-2 rounded-md mr-3">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Identifiant</p>
                  <p className="font-medium">{reportId.substring(0, 8)}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-muted/30 p-2 rounded-md mr-3">
                  <Tag className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Fichier source</p>
                  <p className="font-medium truncate">{report.file_name}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-muted/30 p-2 rounded-md mr-3">
                  <Tool className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Nombre de pièces</p>
                  <p className="font-medium">{partsData.length || report.parts_count || 0}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-muted/30 p-2 rounded-md mr-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Temps de main d'œuvre</p>
                  <p className="font-medium">{laborHours} heures</p>
                  {laborDetails && laborDetails.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {laborDetails.map((labor, index) => (
                        <p key={index}>{labor.type}: {labor.hours}h à {formatCurrency(labor.rate)}/h</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Informations d'assurance si disponibles */}
          {(insurerData.name || insurerData.policyNumber || insurerData.claimNumber) && (
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-base font-medium mb-4">Assurance</h3>
              
              <div className="space-y-3">
                {insurerData.name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Assureur</p>
                    <p className="font-medium">{insurerData.name}</p>
                  </div>
                )}
                
                {insurerData.policyNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">N° de police</p>
                    <p className="font-medium">{insurerData.policyNumber}</p>
                  </div>
                )}
                
                {insurerData.claimNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">N° de sinistre</p>
                    <p className="font-medium">{insurerData.claimNumber}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Actions rapides */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-base font-medium mb-4">Actions rapides</h3>
            
            <div className="space-y-3">
              <button 
                className="w-full btn-outline flex items-center justify-center py-2"
                onClick={downloadReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger le PDF
              </button>
              
              <button
                className="w-full btn-outline flex items-center justify-center py-2"
                onClick={() => navigate(`/dashboard/emails?client=${report.client_id}&vehicle=${report.vehicle_id}`)}
              >
                <Send className="h-4 w-4 mr-2" />
                Envoyer au client
              </button>
              
              <button
                className="w-full btn-primary flex items-center justify-center py-2"
                onClick={openInvoiceGenerator}
              >
                <ScrollText className="h-4 w-4 mr-2" />
                Générer une facture
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de génération de facture */}
      {showInvoiceGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <InvoiceGenerator
              report={{
                id: report.id,
                client: {
                  id: report.client_id,
                  firstName: clientData.firstName,
                  lastName: clientData.lastName,
                  email: clientData.email,
                  phone: clientData.phone
                },
                vehicle: {
                  id: report.vehicle_id,
                  make: vehicleData.make,
                  model: vehicleData.model,
                  registration: vehicleData.registration,
                  vin: vehicleData.vin
                },
                insurer: insurerData,
                parts: partsData,
                laborHours: laborHours,
                laborRate: laborRate,
                laborDetails: laborDetails,
                totalHT: totalHT,
                totalTTC: totalTTC,
                taxAmount: taxAmount
              }}
              onClose={() => setShowInvoiceGenerator(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDetail;