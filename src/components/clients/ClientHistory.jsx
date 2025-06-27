import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { Cession } from '../../models/Cession';
import { VehicleLoan } from '../../models/VehicleLoan';
import { TrafficViolation } from '../../models/TrafficViolation';
import {
  Clock,
  UserPlus,
  Car,
  FileText,
  ReceiptText,
  Mail,
  Bell,
  FileSignature,
  Users,
  Search,
  CalendarCheck,
  AlertCircle,
  Check,
  FileEdit,
  Loader,
  Pen,
  X
} from 'lucide-react';

const ClientHistory = ({ clientId }) => {
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Charger l'historique complet du client
  useEffect(() => {
    const loadClientHistory = async () => {
      if (!clientId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // 1. Récupérer les informations de base du client (date de création)
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('created_at, updated_at')
          .eq('id', clientId)
          .single();
          
        if (clientError) throw clientError;
        
        // Ajouter la création du client à l'historique
        const historyData = [
          {
            id: `client-creation-${clientId}`,
            date: clientData.created_at,
            type: 'client_created',
            title: 'Client créé',
            description: 'Création de la fiche client',
            metadata: {}
          }
        ];
        
        // 2. Récupérer les véhicules du client
        const { data: vehicles, error: vehiclesError } = await supabase
          .from('vehicles')
          .select('id, make, model, registration, created_at')
          .eq('client_id', clientId);
          
        if (vehiclesError) throw vehiclesError;
        
        // Ajouter chaque ajout de véhicule à l'historique
        vehicles.forEach(vehicle => {
          historyData.push({
            id: `vehicle-creation-${vehicle.id}`,
            date: vehicle.created_at,
            type: 'vehicle_added',
            title: 'Véhicule ajouté',
            description: `${vehicle.make} ${vehicle.model}${vehicle.registration ? ` (${vehicle.registration})` : ''}`,
            metadata: { vehicle }
          });
        });
        
        // 3. Récupérer les rapports du client
        const { data: reports, error: reportsError } = await supabase
          .from('reports')
          .select('id, file_name, created_at, status, vehicle_id')
          .eq('client_id', clientId);
          
        if (reportsError) throw reportsError;
        
        // Ajouter chaque rapport à l'historique
        reports.forEach(report => {
          // Trouver le véhicule associé
          const vehicle = vehicles.find(v => v.id === report.vehicle_id);
          
          historyData.push({
            id: `report-creation-${report.id}`,
            date: report.created_at,
            type: 'report_imported',
            title: 'Rapport importé',
            description: report.file_name,
            metadata: { 
              report, 
              vehicleInfo: vehicle ? `${vehicle.make} ${vehicle.model}` : null 
            }
          });
        });
        
        // 4. Récupérer les factures du client
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('id, invoice_number, created_at, status, issue_date, vehicle_id, total')
          .eq('client_id', clientId);
          
        if (invoicesError) throw invoicesError;
        
        // Ajouter chaque facture à l'historique
        invoices.forEach(invoice => {
          // Trouver le véhicule associé
          const vehicle = vehicles.find(v => v.id === invoice.vehicle_id);
          
          historyData.push({
            id: `invoice-creation-${invoice.id}`,
            date: invoice.created_at,
            type: 'invoice_created',
            title: 'Facture créée',
            description: `Facture ${invoice.invoice_number}`,
            metadata: { 
              invoice, 
              vehicleInfo: vehicle ? `${vehicle.make} ${vehicle.model}` : null,
              amount: invoice.total
            }
          });
          
          // Si la facture a un historique de statut, ajouter chaque changement
          if (invoice.status_history && Array.isArray(invoice.status_history) && invoice.status_history.length > 0) {
            invoice.status_history.forEach((status, index) => {
              if (index === 0) return; // Ignorer le premier statut (déjà compté dans la création)
              
              historyData.push({
                id: `invoice-status-${invoice.id}-${index}`,
                date: status.timestamp,
                type: 'invoice_status_changed',
                title: 'Statut de facture modifié',
                description: `Facture ${invoice.invoice_number} : ${getStatusLabel(status.previous)} → ${getStatusLabel(status.status)}`,
                metadata: { 
                  invoice,
                  status: status.status, 
                  previousStatus: status.previous
                }
              });
            });
          }
        });
        
        // 5. Récupérer les rappels du client
        const { data: reminders, error: remindersError } = await supabase
          .from('reminders')
          .select('id, title, created_at, status, due_date, completed_at, canceled_at')
          .eq('client_id', clientId);
          
        if (!remindersError && reminders) {
          // Ajouter chaque rappel à l'historique
          reminders.forEach(reminder => {
            // Création du rappel
            historyData.push({
              id: `reminder-creation-${reminder.id}`,
              date: reminder.created_at,
              type: 'reminder_created',
              title: 'Rappel créé',
              description: reminder.title,
              metadata: { reminder }
            });
            
            // Complétion du rappel si applicable
            if (reminder.completed_at) {
              historyData.push({
                id: `reminder-completed-${reminder.id}`,
                date: reminder.completed_at,
                type: 'reminder_completed',
                title: 'Rappel effectué',
                description: reminder.title,
                metadata: { reminder }
              });
            }
            
            // Annulation du rappel si applicable
            if (reminder.canceled_at) {
              historyData.push({
                id: `reminder-canceled-${reminder.id}`,
                date: reminder.canceled_at,
                type: 'reminder_canceled',
                title: 'Rappel annulé',
                description: reminder.title,
                metadata: { reminder }
              });
            }
          });
        }

        // 6. Récupérer les cessions de créance
        const cessions = await Cession.getByClient(clientId);
        cessions.forEach(c => {
          historyData.push({
            id: `cession-${c.id}`,
            date: c.created_at,
            type: 'cession_created',
            title: 'Cession de créance créée',
            description: c.invoice_number,
            metadata: { cession: c, amount: c.amount }
          });
        });

        // 7. Récupérer les prêts de véhicule
        const loans = await VehicleLoan.getClientLoans(clientId);
        loans.forEach(loan => {
          historyData.push({
            id: `loan-${loan.id}`,
            date: loan.start_date,
            type: 'loan_created',
            title: 'Prêt de véhicule',
            description: `${loan.loan_vehicles.make} ${loan.loan_vehicles.model}`,
            metadata: { loan }
          });
        });

        // 8. Récupérer les infractions routières
        const violations = await TrafficViolation.getByClient(clientId);
        violations.forEach(v => {
          historyData.push({
            id: `violation-${v.id}`,
            date: v.violation_date,
            type: 'violation_created',
            title: 'Infraction enregistrée',
            description: `${v.loan_vehicles.make} ${v.loan_vehicles.model}`,
            metadata: { violation: v, amount: v.amount }
          });
        });
        
        // Trier l'historique par date décroissante (du plus récent au plus ancien)
        historyData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setHistoryItems(historyData);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'historique:', err);
        setError('Impossible de charger l\'historique du client');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClientHistory();
  }, [clientId]);
  
  // Formater la date
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
    } catch (err) {
      return 'Date inconnue';
    }
  };
  
  // Formater la date et l'heure
  const formatDateTime = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch (err) {
      return 'Date inconnue';
    }
  };
  
  // Convertir le statut en libellé
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Générée';
      case 'sent': return 'Envoyée';
      case 'waiting_payment': return 'En attente de paiement';
      case 'paid': return 'Payée';
      default: return status;
    }
  };
  
  // Obtenir l'icône en fonction du type d'événement
  const getEventIcon = (type) => {
    switch (type) {
      case 'client_created':
        return <UserPlus className="h-4 w-4" />;
      case 'vehicle_added':
        return <Car className="h-4 w-4" />;
      case 'report_imported':
        return <FileText className="h-4 w-4" />;
      case 'invoice_created':
        return <ReceiptText className="h-4 w-4" />;
      case 'invoice_status_changed':
        return <FileEdit className="h-4 w-4" />;
      case 'reminder_created':
        return <Bell className="h-4 w-4" />;
      case 'reminder_completed':
        return <Check className="h-4 w-4" />;
      case 'reminder_canceled':
        return <X className="h-4 w-4" />;
      case 'cession_created':
        return <FileSignature className="h-4 w-4" />;
      case 'loan_created':
        return <Users className="h-4 w-4" />;
      case 'violation_created':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  
  // Obtenir la couleur en fonction du type d'événement
  const getEventColor = (type) => {
    switch (type) {
      case 'client_created':
        return 'bg-emerald-500/10 text-emerald-500';
      case 'vehicle_added':
        return 'bg-blue-500/10 text-blue-500';
      case 'report_imported':
        return 'bg-amber-500/10 text-amber-500';
      case 'invoice_created':
        return 'bg-violet-500/10 text-violet-500';
      case 'invoice_status_changed':
        return 'bg-indigo-500/10 text-indigo-500';
      case 'reminder_created':
        return 'bg-orange-500/10 text-orange-500';
      case 'reminder_completed':
        return 'bg-emerald-500/10 text-emerald-500';
      case 'reminder_canceled':
        return 'bg-red-500/10 text-red-500';
      case 'cession_created':
        return 'bg-purple-500/10 text-purple-500';
      case 'loan_created':
        return 'bg-teal-500/10 text-teal-500';
      case 'violation_created':
        return 'bg-rose-500/10 text-rose-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };
  
  // Filtrer les éléments d'historique
  const filteredItems = historyItems.filter(item => {
    // Filtre par catégorie
    if (activeFilter !== 'all') {
      if (activeFilter === 'invoices' && !item.type.includes('invoice')) return false;
      if (activeFilter === 'reports' && !item.type.includes('report')) return false;
      if (activeFilter === 'vehicles' && !item.type.includes('vehicle')) return false;
      if (activeFilter === 'reminders' && !item.type.includes('reminder')) return false;
      if (activeFilter === 'cessions' && !item.type.includes('cession')) return false;
      if (activeFilter === 'loans' && !item.type.includes('loan')) return false;
      if (activeFilter === 'violations' && !item.type.includes('violation')) return false;
    }
    
    // Filtre par recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-center">
        <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }
  
  if (historyItems.length === 0) {
    return (
      <div className="text-center py-8 border rounded-md">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <h3 className="font-medium">Aucun historique</h3>
        <p className="text-muted-foreground mt-2">
          L'historique de ce client s'affichera ici.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Filtres et recherche */}
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-2 py-1 text-xs rounded-md ${activeFilter === 'all' ? 'bg-primary/10 text-primary' : 'bg-muted/30 hover:bg-muted/50'}`}
            onClick={() => setActiveFilter('all')}
          >
            Tout l'historique
          </button>
          <button
            className={`px-2 py-1 text-xs rounded-md ${activeFilter === 'invoices' ? 'bg-primary/10 text-primary' : 'bg-muted/30 hover:bg-muted/50'}`}
            onClick={() => setActiveFilter('invoices')}
          >
            Factures
          </button>
          <button
            className={`px-2 py-1 text-xs rounded-md ${activeFilter === 'reports' ? 'bg-primary/10 text-primary' : 'bg-muted/30 hover:bg-muted/50'}`}
            onClick={() => setActiveFilter('reports')}
          >
            Rapports
          </button>
          <button
            className={`px-2 py-1 text-xs rounded-md ${activeFilter === 'vehicles' ? 'bg-primary/10 text-primary' : 'bg-muted/30 hover:bg-muted/50'}`}
            onClick={() => setActiveFilter('vehicles')}
          >
            Véhicules
          </button>
          <button
            className={`px-2 py-1 text-xs rounded-md ${activeFilter === 'reminders' ? 'bg-primary/10 text-primary' : 'bg-muted/30 hover:bg-muted/50'}`}
            onClick={() => setActiveFilter('reminders')}
          >
            Rappels
          </button>
          <button
            className={`px-2 py-1 text-xs rounded-md ${activeFilter === 'cessions' ? 'bg-primary/10 text-primary' : 'bg-muted/30 hover:bg-muted/50'}`}
            onClick={() => setActiveFilter('cessions')}
          >
            Cessions
          </button>
          <button
            className={`px-2 py-1 text-xs rounded-md ${activeFilter === 'loans' ? 'bg-primary/10 text-primary' : 'bg-muted/30 hover:bg-muted/50'}`}
            onClick={() => setActiveFilter('loans')}
          >
            Prêts
          </button>
          <button
            className={`px-2 py-1 text-xs rounded-md ${activeFilter === 'violations' ? 'bg-primary/10 text-primary' : 'bg-muted/30 hover:bg-muted/50'}`}
            onClick={() => setActiveFilter('violations')}
          >
            Infractions
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Rechercher..."
            className="pl-7 pr-3 py-1 text-xs rounded-md bg-muted/20 border-none focus:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Affichage de l'historique */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-muted/20">
            <tr>
              <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                <td className="py-3 px-3 text-sm whitespace-nowrap">
                  {formatDateTime(item.date)}
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${getEventColor(item.type)}`}>
                      {getEventIcon(item.type)}
                    </div>
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-sm">
                  <div className="flex flex-col">
                    <span>{item.description}</span>
                    {item.metadata.vehicleInfo && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {item.metadata.vehicleInfo}
                      </span>
                    )}
                    {item.metadata.amount && (
                      <span className="text-xs mt-1">
                        Montant: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(item.metadata.amount)}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientHistory;