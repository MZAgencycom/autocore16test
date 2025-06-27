import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Car, 
  Pencil, 
  Trash2, 
  FilePlus,
  ScrollText, 
  FileText,
  AlertCircle,
  Plus,
  Calendar,
  Clock,
  Send,
  MessageSquare,
  CheckCircle,
  ArrowRightLeft,
  Eye,
  ChevronDown,
  ChevronRight,
  History,
  Users,
  FileSignature
} from 'lucide-react';
import { Client } from '../../models/Client';
import { Vehicle } from '../../models/Vehicle';
import { VehicleLoan } from '../../models/VehicleLoan';
import { TrafficViolation } from '../../models/TrafficViolation';
import { Cession } from '../../models/Cession';
import { format } from 'date-fns';
import ClientReminderTracker from './ClientReminderTracker';
import ClientEditForm from './ClientEditForm';
import ClientHistory from './ClientHistory';

const ClientDetail = () => {
  const { clientId } = useParams();
  const [client, setClient] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reports, setReports] = useState([]);
  const [cessions, setCessions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  
  // Nouvel état pour l'historique des communications
  const [communications, setCommunications] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [remindersVisible, setRemindersVisible] = useState(true);
  const [reminderSummary, setReminderSummary] = useState(null);

  useEffect(() => {
    const loadClientDetails = async () => {
      try {
        setLoading(true);
        
        // Charger les détails du client
        const clientData = await Client.getById(clientId);
        setClient(clientData);
        if (import.meta?.env?.DEV) console.log('Chargement terminé', clientData);
        
        // Charger les véhicules du client
        const vehiclesData = await Vehicle.getByClientId(clientId);
        setVehicles(vehiclesData);

        // Charger les factures et rapports réels du client (pas de données fictives)
        setInvoices(clientData.invoices || []);
        setReports(clientData.reports || []);

        // Charger les cessions de créance, prêts et infractions
        const cessionsData = await Cession.getByClient(clientId);
        setCessions(cessionsData);

        const loansData = await VehicleLoan.getClientLoans(clientId);
        setLoans(loansData);

        const violationsData = await TrafficViolation.getByClient(clientId);
        setViolations(violationsData);
        
        // Initialiser les communications à un tableau vide - pas de données fictives
        setCommunications([]);
        
        // Initialiser les rappels à venir à un tableau vide - pas de données fictives
        setUpcomingReminders([]);
        
      } catch (error) {
        console.error('Error loading client details:', error);
        setError('Impossible de charger les détails du client');
      } finally {
        setLoading(false);
      }
    };

    loadClientDetails();
  }, [clientId, showEditForm]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setError('Temps de chargement dépassé. Veuillez rafraîchir.');
        setLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [loading]);
  
  useEffect(() => {
    // Update reminder summary when reminders change
    if (upcomingReminders && upcomingReminders.length > 0) {
      const todo = upcomingReminders.filter(r => r.status === 'pending').length;
      const urgent = upcomingReminders.filter(r => r.dueDate && new Date(r.dueDate) < new Date(Date.now() + 86400000)).length;
      
      setReminderSummary({ total: upcomingReminders.length, todo, urgent });
    } else {
      setReminderSummary(null);
    }
  }, [upcomingReminders]);
  
  const handleReminderChange = (updatedReminders) => {
    // In a real implementation, this would trigger a state update and potentially a refetch
    setUpcomingReminders(updatedReminders);
    
    // Calculate new summary data
    const todo = updatedReminders.filter(r => r.status === 'todo' || r.status === 'inprogress').length;
    const urgent = updatedReminders.filter(r => 
      (r.status === 'todo' || r.status === 'inprogress') && 
      (r.priority === 'high' || r.priority === 'urgent')
    ).length;
    
    setReminderSummary({ total: updatedReminders.length, todo, urgent });
  };
  
  const handleEditSuccess = () => {
    setShowEditForm(false);
    // Rafraîchir les données du client
    const refreshClient = async () => {
      try {
        const clientData = await Client.getById(clientId);
        setClient(clientData);
      } catch (error) {
        console.error('Error refreshing client data:', error);
      }
    };
    
    refreshClient();
  };
  
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return 'Date inconnue';
    }
  };
  
  // Get status details (color, label, icon) for communication items
  const getStatusDetails = (status) => {
    switch(status) {
      case 'replied':
        return { 
          color: 'bg-emerald-500/10 text-emerald-500',
          label: 'Répondu',
          icon: CheckCircle
        };
      case 'opened':
        return { 
          color: 'bg-blue-500/10 text-blue-500',
          label: 'Ouvert',
          icon: Eye
        };
      default:
        return { 
          color: 'bg-amber-500/10 text-amber-500',
          label: 'Envoyé',
          icon: Send
        };
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error || "Client introuvable"}</p>
          </div>
          <Link to="/dashboard/clients" className="text-sm underline mt-4 inline-block">
            Retour à la liste des clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with back link and title */}
      <div className="flex items-center space-x-2 mb-6">
        <Link to="/dashboard/clients" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold">Fiche client</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Client info card */}
        <div className="md:col-span-4 lg:col-span-3 space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-semibold mb-3">
                {client.first_name?.[0] || ''}{client.last_name?.[0] || ''}
              </div>
              <h3 className="text-xl font-bold">{client.first_name} {client.last_name}</h3>
              <p className="text-muted-foreground text-sm">
                Client depuis {formatDate(client.created_at)}
              </p>
            </div>
            
            <div className="space-y-3 border-t pt-3">
              {client.email && (
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-muted-foreground mr-2" />
                  <span className="text-sm">{client.email}</span>
                </div>
              )}
              
              {client.phone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                  <span className="text-sm">{client.phone}</span>
                </div>
              )}
              
              {client.address && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                  <span className="text-sm">{client.address}</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between mt-4 pt-4 border-t">
              <Link 
                to={`/dashboard/emails?client=${client.id}&email=${client.email || ''}&name=${client.first_name} ${client.last_name}`}
                className="btn-primary text-xs py-1.5 px-3"
              >
                <Send className="h-3 w-3 mr-1.5" />
                Envoyer un email
              </Link>
              
              <button 
                className="btn-outline text-xs py-1.5 px-3"
                onClick={() => setShowEditForm(true)}
              >
                <Pencil className="h-3 w-3 mr-1.5" />
                Modifier
              </button>
            </div>
          </div>
          
          {/* Vehicles summary */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Véhicules ({vehicles.length})</h3>
              <button className="btn-outline text-xs py-1 px-2">
                <Plus className="h-3 w-3 mr-1" />
                Ajouter
              </button>
            </div>
            
            {vehicles.length === 0 ? (
              <div className="text-center py-6">
                <Car className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground">Aucun véhicule enregistré</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map((vehicle, index) => (
                  <div key={index} className="p-3 border rounded-md hover:bg-muted/10 transition-colors">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium">{vehicle.make} {vehicle.model}</h4>
                        {vehicle.registration && (
                          <p className="text-xs text-muted-foreground">Immatriculation: {vehicle.registration}</p>
                        )}
                      </div>
                      <div className="flex">
                        <button className="p-1 hover:text-primary transition-colors" title="Modifier">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Bouton pour créer un prêt de véhicule */}
                    <div className="mt-2 pt-2 border-t flex justify-end">
                      <Link 
                        to={`/dashboard/loans/create?client=${client.id}`}
                        className="text-xs text-primary hover:underline flex items-center"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Créer un prêt de véhicule
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Rappels programmés - Section collapsible façon Notion */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div 
              className="flex justify-between items-center p-3 border-b cursor-pointer hover:bg-muted/10 transition-colors"
              onClick={() => setRemindersVisible(!remindersVisible)}
            >
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-primary mr-2" />
                <h3 className="font-medium">Suivi et rappels</h3>
                
                {/* Afficher le badge avec nombre de rappels si pertinent */}
                {reminderSummary && reminderSummary.todo > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xxs rounded-full bg-primary/20 text-primary">
                    {reminderSummary.todo} en cours
                  </span>
                )}
                
                {/* Afficher badge "urgent" s'il y a des tâches urgentes */}
                {reminderSummary && reminderSummary.urgent > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xxs rounded-full bg-red-500/20 text-red-500">
                    {reminderSummary.urgent} urgent
                  </span>
                )}
              </div>
              <ChevronDown 
                className={`h-4 w-4 transition-transform ${remindersVisible ? 'rotate-180' : ''}`}
              />
            </div>
            
            {/* Contenu de la section rappels */}
            {remindersVisible && (
              <div className="p-3">
                <ClientReminderTracker 
                  clientId={clientId} 
                  onReminderChange={handleReminderChange}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Main content area */}
        <div className="md:col-span-8 lg:col-span-9">
          {/* Tabs navigation */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="border-b">
              <div className="flex">
                <button 
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'overview' ? 'border-primary' : 'border-transparent'
                  }`}
                  onClick={() => setActiveTab('overview')}
                >
                  Aperçu
                </button>
                <button 
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'invoices' ? 'border-primary' : 'border-transparent'
                  }`}
                  onClick={() => setActiveTab('invoices')}
                >
                  Factures
                </button>
                <button 
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'reports' ? 'border-primary' : 'border-transparent'
                  }`}
                  onClick={() => setActiveTab('reports')}
                >
                  Rapports
                </button>
                <button 
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'communications' ? 'border-primary' : 'border-transparent'
                  } flex items-center`}
                  onClick={() => setActiveTab('communications')}
                >
                  Communications
                  {communications.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-primary/20 text-primary text-xxs rounded-full">
                      {communications.length}
                    </span>
                  )}
                </button>
                <button 
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'history' ? 'border-primary' : 'border-transparent'
                  } flex items-center`}
                  onClick={() => setActiveTab('history')}
                >
                  <History className="h-4 w-4 mr-1.5" />
                  Historique
                </button>
                <button
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'loans' ? 'border-primary' : 'border-transparent'
                  } flex items-center`}
                  onClick={() => setActiveTab('loans')}
                >
                  <Users className="h-4 w-4 mr-1.5" />
                  Prêts de véhicules
                </button>
                <button
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'cessions' ? 'border-primary' : 'border-transparent'
                  } flex items-center`}
                  onClick={() => setActiveTab('cessions')}
                >
                  <FileSignature className="h-4 w-4 mr-1.5" />
                  Cessions
                </button>
                <button
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'violations' ? 'border-primary' : 'border-transparent'
                  } flex items-center`}
                  onClick={() => setActiveTab('violations')}
                >
                  <AlertCircle className="h-4 w-4 mr-1.5" />
                  PV & Infractions
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="p-4 bg-muted/20 rounded-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Factures</p>
                          <p className="text-2xl font-bold">{invoices.length}</p>
                        </div>
                        <div className="p-2 bg-muted/30 rounded">
                          <ScrollText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-muted/20 rounded-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Véhicules</p>
                          <p className="text-2xl font-bold">{vehicles.length}</p>
                        </div>
                        <div className="p-2 bg-muted/30 rounded">
                          <Car className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-muted/20 rounded-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Rapports</p>
                          <p className="text-2xl font-bold">{reports.length}</p>
                        </div>
                        <div className="p-2 bg-muted/30 rounded">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-3">Dernières factures</h3>
                      
                      {invoices.length === 0 ? (
                        <div className="text-center py-6 border rounded-md">
                          <ScrollText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-muted-foreground">Aucune facture</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {invoices.slice(0, 3).map((invoice, index) => (
                            <div key={index} className="p-3 border rounded-md hover:bg-muted/10 transition-colors">
                              <div className="flex justify-between">
                                <div>
                                  <h4 className="font-medium text-sm">{invoice.invoice_number}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(invoice.created_at)}
                                  </p>
                                </div>
                                <div className="font-medium">
                                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.total || 0)}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {invoices.length > 3 && (
                            <Link to={`/dashboard/invoices?client=${client.id}`} className="text-xs text-primary hover:underline flex items-center justify-end mt-2">
                              Voir toutes les factures
                            </Link>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-4 flex justify-end space-x-3">
                        <Link 
                          to={`/dashboard/invoices/create?client=${client.id}`} 
                          className="btn-outline text-xs py-1.5 flex items-center"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Nouvelle facture
                        </Link>
                        
                        <Link 
                          to={`/dashboard/cessions/create?client=${client.id}`} 
                          className="btn-outline text-xs py-1.5 flex items-center"
                        >
                          <FileSignature className="h-3.5 w-3.5 mr-1.5" />
                          Cession de créance
                        </Link>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-3">Derniers rapports</h3>
                      
                      {reports.length === 0 ? (
                        <div className="text-center py-6 border rounded-md">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-muted-foreground">Aucun rapport</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {reports.slice(0, 3).map((report, index) => (
                            <div key={index} className="p-3 border rounded-md hover:bg-muted/10 transition-colors">
                              <div className="flex justify-between">
                                <div>
                                  <h4 className="font-medium text-sm">Rapport #{report.id.substring(0, 8)}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(report.created_at)}
                                  </p>
                                </div>
                                <div className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-500 h-fit rounded-full">
                                  Analysé
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {reports.length > 3 && (
                            <Link to={`/dashboard/reports?client=${client.id}`} className="text-xs text-primary hover:underline flex items-center justify-end mt-2">
                              Voir tous les rapports
                            </Link>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-4 flex justify-end">
                        <button className="btn-outline text-xs py-1.5 flex items-center">
                          <FilePlus className="h-3.5 w-3.5 mr-1.5" />
                          Importer un rapport
                        </button>
                      </div>
                    </div>
                    
                    {/* Afficher les dernières communications - NOUVEAU COMPOSANT */}
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium">Dernières communications</h3>
                        <button 
                          className="text-xs text-primary hover:underline"
                          onClick={() => setActiveTab('communications')}
                        >
                          Voir tout
                        </button>
                      </div>
                      
                      {communications.length === 0 ? (
                        <div className="text-center py-6 border rounded-md">
                          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-muted-foreground">Aucune communication</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {communications.slice(0, 3).map((comm, index) => {
                            const statusDetails = getStatusDetails(comm.status);
                            const StatusIcon = statusDetails.icon;
                            
                            return (
                              <div key={index} className="p-3 border rounded-md hover:bg-muted/10 transition-colors">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium text-sm">{comm.subject}</h4>
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                      {comm.content}
                                    </p>
                                  </div>
                                  <div className={`text-xs px-2 py-0.5 rounded-full flex items-center ${statusDetails.color}`}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    <span>{statusDetails.label}</span>
                                  </div>
                                </div>
                                <div className="mt-2 flex justify-between items-center">
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(comm.sent_at)}
                                  </div>
                                  <div className="text-xs bg-muted/20 px-2 py-0.5 rounded">
                                    {comm.vehicleInfo}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      <div className="mt-4 flex justify-end">
                        <Link
                          to={`/dashboard/emails?client=${client.id}&email=${client.email || ''}&name=${client.first_name} ${client.last_name}`} 
                          className="btn-primary text-xs py-1.5 flex items-center"
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Envoyer un message
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Invoices Tab */}
              {activeTab === 'invoices' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Factures</h3>
                    <div className="flex space-x-3">
                      <Link 
                        to={`/dashboard/invoices/create?client=${client.id}`} 
                        className="btn-primary text-xs py-1.5"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Nouvelle facture
                      </Link>
                      <Link 
                        to={`/dashboard/cessions/create?client=${client.id}`} 
                        className="btn-outline text-xs py-1.5"
                      >
                        <FileSignature className="h-3.5 w-3.5 mr-1.5" />
                        Cession de créance
                      </Link>
                    </div>
                  </div>
                  
                  {invoices.length === 0 ? (
                    <div className="text-center py-12">
                      <ScrollText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-3" />
                      <h4 className="text-lg font-medium">Aucune facture</h4>
                      <p className="text-muted-foreground mt-1">Ce client n'a pas encore de factures</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-xs font-medium text-muted-foreground">Numéro</th>
                            <th className="text-left p-3 text-xs font-medium text-muted-foreground">Véhicule</th>
                            <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                            <th className="text-right p-3 text-xs font-medium text-muted-foreground">Montant</th>
                            <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
                            <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((invoice, index) => (
                            <tr key={index} className="border-b last:border-0 hover:bg-muted/10">
                              <td className="p-3">{invoice.invoice_number}</td>
                              <td className="p-3">{invoice.vehicle_make} {invoice.vehicle_model}</td>
                              <td className="p-3">{formatDate(invoice.created_at)}</td>
                              <td className="p-3 text-right font-medium">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.total || 0)}
                              </td>
                              <td className="p-3 text-center">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                                  {invoice.status || 'En attente'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end space-x-2">
                                  <button className="p-1 rounded hover:bg-muted/30" title="Voir">
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button className="p-1 rounded hover:bg-muted/30" title="Modifier">
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              
              {/* Reports Tab */}
              {activeTab === 'reports' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Rapports</h3>
                    <button className="btn-outline text-xs py-1.5">
                      <FilePlus className="h-3.5 w-3.5 mr-1.5" />
                      Importer un rapport
                    </button>
                  </div>
                  
                  {reports.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-3" />
                      <h4 className="text-lg font-medium">Aucun rapport</h4>
                      <p className="text-muted-foreground mt-1">Ce client n'a pas encore de rapports</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {reports.map((report, index) => (
                        <div key={index} className="border rounded-md p-4 hover:bg-muted/10 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium">Rapport #{report.id.substring(0, 8)}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(report.created_at)}</p>
                            </div>
                            <div className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full">
                              Analysé
                            </div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-3">
                            <p>Véhicule: {report.vehicle_make} {report.vehicle_model}</p>
                            {report.vehicle_registration && <p>Immatriculation: {report.vehicle_registration}</p>}
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <button className="btn-outline text-xs py-0.5 px-2 flex items-center">
                              <Eye className="h-3 w-3 mr-1" />
                              Détails
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Communications Tab - NOUVEAU */}
              {activeTab === 'communications' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Communications</h3>
                    <Link 
                      to={`/dashboard/emails?client=${client.id}&email=${client.email || ''}&name=${client.first_name} ${client.last_name}`} 
                      className="btn-primary text-xs py-1.5"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Envoyer un message
                    </Link>
                  </div>
                  
                  {communications.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30 mb-3" />
                      <h4 className="text-lg font-medium">Aucune communication</h4>
                      <p className="text-muted-foreground mt-1">Aucun historique de communication avec ce client</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <ClientReminderTracker 
                          clientId={clientId} 
                          onReminderChange={handleReminderChange}
                        />
                      </div>
                      
                      <h4 className="text-sm font-medium mb-3">Historique des communications</h4>
                      <div className="space-y-3">
                        {communications.map((comm, index) => {
                          const statusDetails = getStatusDetails(comm.status);
                          const StatusIcon = statusDetails.icon;
                          
                          return (
                            <div key={index} className="p-4 border rounded-md hover:bg-muted/10 transition-colors">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-medium">{comm.subject}</h5>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {comm.content}
                                  </p>
                                </div>
                                <div className={`text-xs px-2 py-1 rounded-full flex items-center ${statusDetails.color}`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  <span>{statusDetails.label}</span>
                                </div>
                              </div>
                              
                              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                                <div className="text-xs text-muted-foreground">
                                  Envoyé le {formatDate(comm.sent_at)}
                                </div>
                                
                                <div className="flex space-x-2">
                                  <button className="p-1 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground" title="Voir">
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button className="p-1 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground" title="Réutiliser">
                                    <ArrowRightLeft className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* History Tab - NOUVEAU */}
              {activeTab === 'history' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium flex items-center">
                      <History className="h-5 w-5 mr-1.5 text-primary" />
                      Historique complet
                    </h3>
                  </div>
                  
                  <ClientHistory clientId={clientId} />
                </div>
              )}
              
              {/* Loan Vehicles Tab - NOUVEAU */}
              {activeTab === 'loans' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium flex items-center">
                      <Users className="h-5 w-5 mr-1.5 text-primary" />
                      Prêts de véhicules
                    </h3>
                    <Link 
                      to={`/dashboard/loans/create?client=${client.id}`}
                      className="btn-primary text-xs py-1.5"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Créer un prêt
                    </Link>
                  </div>
                  
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Car className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Prêts de véhicules pour {client.first_name} {client.last_name}</p>
                        <p className="text-sm mt-1">
                          Vous pouvez créer un nouveau prêt de véhicule pour ce client ou consulter l'historique des prêts.
                        </p>
                        <div className="mt-3 flex space-x-3">
                          <Link 
                            to={`/dashboard/loans/create?client=${client.id}`}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            <Plus className="h-3 w-3 mr-1.5" />
                            Créer un prêt
                          </Link>
                          <Link 
                            to={`/dashboard/loans?client=${client.id}`}
                            className="btn-outline text-xs py-1.5 px-3"
                          >
                            <Eye className="h-3 w-3 mr-1.5" />
                            Voir l'historique
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Historique des prêts */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="p-4 border-b">
                      <h4 className="font-medium">Historique des prêts</h4>
                    </div>

                    {loans.length === 0 ? (
                      <div className="p-6 text-center">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">
                          Les prêts de véhicules pour ce client apparaîtront ici.
                        </p>
                        <Link
                          to={`/dashboard/loans/create?client=${client.id}`}
                          className="btn-primary text-xs py-1.5 px-3 mt-4 inline-flex items-center"
                        >
                          <Plus className="h-3 w-3 mr-1.5" />
                          Créer un prêt
                        </Link>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Véhicule</th>
                              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Période</th>
                              <th className="p-3 text-center text-xs font-medium text-muted-foreground">Statut</th>
                              <th className="p-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loans.map((loan) => (
                              <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/10">
                                <td className="p-3">
                                  {loan.loan_vehicles.make} {loan.loan_vehicles.model}
                                </td>
                                <td className="p-3">
                                  {formatDate(loan.start_date)} - {loan.actual_end_date ? formatDate(loan.actual_end_date) : 'En cours'}
                                </td>
                                <td className="p-3 text-center">
                                  {loan.actual_end_date ? (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted/20">Terminé</span>
                                  ) : (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">En cours</span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <Link to={`/dashboard/loans/${loan.id}`} className="text-xs text-primary hover:underline">
                                    Détails
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'cessions' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium flex items-center">
                      <FileSignature className="h-5 w-5 mr-1.5 text-primary" />
                      Cessions de créance
                    </h3>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="p-4 border-b">
                      <h4 className="font-medium">Cessions</h4>
                    </div>

                    {cessions.length === 0 ? (
                      <div className="p-6 text-center">
                        <FileSignature className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">Aucune cession de créance</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Facture</th>
                              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                              <th className="p-3 text-right text-xs font-medium text-muted-foreground">Montant</th>
                              <th className="p-3 text-center text-xs font-medium text-muted-foreground">Statut</th>
                              <th className="p-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cessions.map(c => (
                              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/10">
                                <td className="p-3">{c.invoice_number}</td>
                                <td className="p-3">{formatDate(c.created_at)}</td>
                                <td className="p-3 text-right">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c.amount)}</td>
                                <td className="p-3 text-center">
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted/20">{c.status}</span>
                                </td>
                                <td className="p-3 text-right">
                                  <Link to={`/dashboard/cessions/${c.id}`} className="text-xs text-primary hover:underline">Voir</Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'violations' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium flex items-center">
                      <AlertCircle className="h-5 w-5 mr-1.5 text-primary" />
                      PV & Infractions
                    </h3>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="p-4 border-b">
                      <h4 className="font-medium">Infractions</h4>
                    </div>

                    {violations.length === 0 ? (
                      <div className="p-6 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">Aucune infraction</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Véhicule</th>
                              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                              <th className="p-3 text-right text-xs font-medium text-muted-foreground">Montant</th>
                              <th className="p-3 text-center text-xs font-medium text-muted-foreground">Statut</th>
                              <th className="p-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {violations.map(v => (
                              <tr key={v.id} className="border-b last:border-0 hover:bg-muted/10">
                                <td className="p-3">{v.loan_vehicles.make} {v.loan_vehicles.model}</td>
                                <td className="p-3">{formatDate(v.violation_date)}</td>
                                <td className="p-3 text-right">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v.amount)}</td>
                                <td className="p-3 text-center">
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted/20">{v.status}</span>
                                </td>
                                <td className="p-3 text-right">
                                  <Link to={`/dashboard/traffic-violations/${v.id}`} className="text-xs text-primary hover:underline">Voir</Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal pour éditer le client */}
      <AnimatePresence>
        {showEditForm && (
          <ClientEditForm 
            client={client} 
            onClose={() => setShowEditForm(false)} 
            onSuccess={handleEditSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientDetail;