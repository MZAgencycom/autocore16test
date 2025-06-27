import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  FileSignature, 
  Download, 
  Send, 
  User, 
  Car, 
  Building, 
  Calendar, 
  CircleDollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Loader,
  Eye
} from 'lucide-react';
import downloadFile from '../../utils/downloadFile';

import { supabase } from '../../lib/supabaseClient';

const CessionCreanceDetailPage = () => {
  const { id } = useParams();
  const [cession, setCession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Charger les données de la cession de créance
  useEffect(() => {
    const loadCessionData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('cession_creances')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        setCession(data);
      } catch (error) {
        console.error('Error loading cession data:', error);
        setError(
          error.message ||
            'Une erreur est survenue lors du chargement des données'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadCessionData();
    }
  }, [id]);
  
  // Formater une date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  // Formater un montant en euros
  const formatCurrency = (amount) => {
    if (!amount) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Obtenir le statut de la cession
  const getStatusDetails = (status) => {
    switch(status) {
      case 'draft':
        return { 
          label: 'Brouillon', 
          color: 'bg-amber-500/10 text-amber-600',
          icon: Clock
        };
      case 'sent':
        return { 
          label: 'Envoyée', 
          color: 'bg-blue-500/10 text-blue-600',
          icon: Send
        };
      case 'signed':
        return { 
          label: 'Signée', 
          color: 'bg-emerald-500/10 text-emerald-600',
          icon: CheckCircle
        };
      case 'rejected':
        return { 
          label: 'Rejetée', 
          color: 'bg-red-500/10 text-red-600',
          icon: AlertCircle
        };
      default:
        return { 
          label: 'Inconnue', 
          color: 'bg-gray-500/10 text-gray-600',
          icon: FileSignature
        };
    }
  };
  
  // Télécharger le document
  const downloadDocument = async () => {
    try {
      if (cession?.document_url) {
        await downloadFile(cession.document_url, 'cession.pdf');
      }
    } catch (err) {
      console.error('Failed to download cession document:', err);
    }
  };
  
  // Envoyer par email
  const sendByEmail = () => {
    // Logique d'envoi par email à implémenter
    alert('Envoi par email...');
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
  
  if (error || !cession) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error || "Cession de créance introuvable"}</p>
          </div>
          <Link to="/dashboard/cessions" className="text-sm underline mt-2 inline-block">
            Retour à la liste des cessions
          </Link>
        </div>
      </div>
    );
  }
  
  const statusDetails = getStatusDetails(cession.status);
  const StatusIcon = statusDetails.icon;

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <Link to="/dashboard/cessions" className="text-muted-foreground hover:text-foreground flex items-center mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux cessions
          </Link>
          <h1 className="text-2xl font-bold">Cession de créance</h1>
          <p className="text-muted-foreground">
            Créée le {formatDate(cession.createdAt)}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={downloadDocument}
            className="btn-outline flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </button>
          
          <button 
            onClick={sendByEmail}
            className="btn-primary flex items-center"
          >
            <Send className="h-4 w-4 mr-2" />
            Envoyer par email
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Détails de la cession */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold">Cession de créance</h2>
              <div className={`px-3 py-1 rounded-full text-sm flex items-center ${statusDetails.color}`}>
                <StatusIcon className="h-4 w-4 mr-1.5" />
                {statusDetails.label}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations cessionnaire */}
              <div className="space-y-4">
                <div className="flex items-center mb-2">
                  <User className="h-4 w-4 text-primary mr-2" />
                  <h3 className="text-sm font-medium">Cessionnaire</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nom:</span>
                    <span className="text-sm font-medium">{cession.recipient_name}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Adresse:</span>
                    <span className="text-sm font-medium text-right">{cession.recipient_address}</span>
                  </div>
                </div>
              </div>

              {/* Informations facture */}
              <div className="space-y-4">
                <div className="flex items-center mb-2">
                  <FileSignature className="h-4 w-4 text-primary mr-2" />
                  <h3 className="text-sm font-medium">Facture</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Numéro:</span>
                    <span className="text-sm font-medium">{cession.invoice_number}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Montant:</span>
                    <span className="text-sm font-medium">{formatCurrency(cession.invoice_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations financières */}
              <div className="space-y-4">
                <div className="flex items-center mb-2">
                  <CircleDollarSign className="h-4 w-4 text-primary mr-2" />
                  <h3 className="text-sm font-medium">Détails de la cession</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Montant cédé:</span>
                    <span className="text-sm font-medium">{formatCurrency(cession.amount)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Échéance:</span>
                    <span className="text-sm font-medium">{formatDate(cession.due_date)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center mb-2">
                  <Calendar className="h-4 w-4 text-primary mr-2" />
                  <h3 className="text-sm font-medium">Signature</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date de signature:</span>
                    <span className="text-sm font-medium">{formatDate(cession.signed_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Aperçu du document */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-medium">Aperçu du document</h3>
              <button className="text-primary hover:text-primary/80 transition-colors">
                <Eye className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 flex justify-center">
              {cession.document_url ? (
                <div className="w-full max-w-md border rounded-lg overflow-hidden">
                  <iframe
                    src={cession.document_url}
                    title="Cession de créance"
                    className="w-full aspect-[1/1.414]"
                  ></iframe>
                  <div className="p-2 border-t flex justify-end">
                    <button
                      onClick={downloadDocument}
                      className="btn-outline text-sm py-1.5"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Télécharger
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-muted/10 w-full max-w-md aspect-[1/1.414] flex items-center justify-center">
                  <div className="text-center">
                    <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Aperçu du document de cession de créance
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Informations complémentaires */}
        <div className="space-y-6">
          {/* Statut */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">Statut</h3>
            
            <div className={`p-4 ${statusDetails.color} rounded-lg flex items-center`}>
              <StatusIcon className="h-5 w-5 mr-3" />
              <div>
                <p className="font-medium">{statusDetails.label}</p>
                <p className="text-sm">
                  {cession.status === 'draft' && "Cette cession n'a pas encore été envoyée au client."}
                  {cession.status === 'sent' && "Cette cession a été envoyée au client et est en attente de signature."}
                  {cession.status === 'signed' && "Cette cession a été signée par le client et est valide."}
                  {cession.status === 'rejected' && "Cette cession a été rejetée par le client ou l'assureur."}
                </p>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date de création:</span>
                <span className="text-sm font-medium">{formatDate(cession.createdAt)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date de signature:</span>
                <span className="text-sm font-medium">{formatDate(cession.signatureDate)}</span>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">Actions</h3>
            
            <div className="space-y-3">
              <button 
                onClick={downloadDocument}
                className="w-full btn-outline py-2 flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger le PDF
              </button>
              
              <button 
                onClick={sendByEmail}
                className="w-full btn-primary py-2 flex items-center justify-center"
              >
                <Send className="h-4 w-4 mr-2" />
                Envoyer par email
              </button>
            </div>
          </div>
          
          {/* Informations légales */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">Informations légales</h3>
            
            <div className="space-y-3 text-sm">
              <p>
                La cession de créance est un acte juridique par lequel le client (cédant) transfère à votre entreprise (cessionnaire) sa créance contre l'assureur (débiteur cédé).
              </p>
              
              <p>
                Ce document est conforme aux articles 1321 à 1326 du Code civil français et permet de facturer directement l'assurance pour les réparations effectuées.
              </p>
              
              <p>
                Pour être valable, ce document doit être signé par le client et notifié à l'assureur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CessionCreanceDetailPage;
