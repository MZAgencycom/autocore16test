import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Client } from '../../models/Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Car, 
  FileText,
  ScrollText,
  Mail,
  Trash2,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Clock,
  SlidersHorizontal
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ClientList = () => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterActive, setFilterActive] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState(null);
  const [minInvoices, setMinInvoices] = useState(0);
  const [minReports, setMinReports] = useState(0);
  const [minVehicles, setMinVehicles] = useState(0);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    loadClients();
  }, []);
  
  const loadClients = async () => {
    try {
      setIsLoading(true);
      const data = await Client.getAll();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Impossible de charger la liste des clients');
    } finally {
      setIsLoading(false);
    }
  };
  
  const filteredAndSortedClients = () => {
    // First apply search filter
    let filtered = clients.filter(client => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchLower) ||
        (client.email && client.email.toLowerCase().includes(searchLower)) ||
        (client.phone && client.phone.toLowerCase().includes(searchLower))
      );
      
      // Apply numeric filters if active
      const meetsInvoiceFilter = filterActive ? (client.invoices?.count || 0) >= minInvoices : true;
      const meetsReportFilter = filterActive ? (client.reports?.count || 0) >= minReports : true;
      const meetsVehicleFilter = filterActive ? (client.vehicles?.count || 0) >= minVehicles : true;
      
      return matchesSearch && meetsInvoiceFilter && meetsReportFilter && meetsVehicleFilter;
    });
    
    // Then apply sort
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === 'date') {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        comparison = dateA - dateB;
      } else if (sortBy === 'invoices') {
        comparison = (a.invoices?.count || 0) - (b.invoices?.count || 0);
      } else if (sortBy === 'reports') {
        comparison = (a.reports?.count || 0) - (b.reports?.count || 0);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };
  
  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and reset direction to asc
      setSortBy(field);
      setSortDirection('asc');
    }
  };
  
  const handleDelete = async (clientId, e) => {
    e.stopPropagation();
    e.preventDefault();
    setClientToDelete(clients.find(c => c.id === clientId));
    setShowDeleteConfirm(true);
  };
  
  const confirmDelete = async () => {
    if (!clientToDelete) return;
    
    try {
      await Client.delete(clientToDelete.id);
      
      // Update local state to reflect deletion
      setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
      
      // Show success notification
      setNotification({
        type: 'success',
        message: `Le client ${clientToDelete.first_name} ${clientToDelete.last_name} a été supprimé`
      });
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
      
      setShowDeleteConfirm(false);
      setClientToDelete(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      
      // Show error notification
      setNotification({
        type: 'error',
        message: `Erreur lors de la suppression du client: ${error.message}`
      });
      
      // Hide notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };
  
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setClientToDelete(null);
  };
  
  const navToInvoices = (clientId, e) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/dashboard/invoices?client=${clientId}`);
  };
  
  const navToMessages = (client, e) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/dashboard/emails?client=${client.id}&email=${client.email || ''}&name=${client.first_name} ${client.last_name}`);
  };
  
  const resetFilters = () => {
    setMinInvoices(0);
    setMinReports(0);
    setMinVehicles(0);
    setFilterActive(false);
    setShowFilters(false);
  };
  
  const applyFilters = () => {
    setFilterActive(true);
    setShowFilters(false);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        <p>{error}</p>
        <button 
          onClick={loadClients}
          className="mt-2 text-sm underline"
        >
          Réessayer
        </button>
      </div>
    );
  }
  
  const clientsToDisplay = filteredAndSortedClients();
  
  return (
    <div className="bg-card rounded-lg border relative">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border ${
              notification.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' 
                : 'bg-destructive/10 text-destructive border-destructive/20'
            }`}
          >
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              <span>{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {showDeleteConfirm && clientToDelete && (
          <motion.div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-card rounded-lg shadow-xl max-w-md w-full p-6 border"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-bold mb-2">Confirmer la suppression</h3>
              <p className="mb-1">Êtes-vous sûr de vouloir supprimer ce client ?</p>
              <p className="font-medium mb-2">{clientToDelete.first_name} {clientToDelete.last_name}</p>
              
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-md mb-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Attention</p>
                    <p className="text-sm">Cette action est irréversible et supprimera également :</p>
                    <ul className="text-sm list-disc ml-5 mt-1">
                      {(clientToDelete.vehicles?.count > 0) && (
                        <li>{clientToDelete.vehicles.count} véhicule(s)</li>
                      )}
                      {(clientToDelete.reports?.count > 0) && (
                        <li>{clientToDelete.reports.count} rapport(s) d'expertise</li>
                      )}
                      {(clientToDelete.invoices?.count > 0) && (
                        <li>{clientToDelete.invoices.count} facture(s)</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  className="btn-outline"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-md"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-lg">Liste des clients</h3>
          <Link to="/dashboard/clients/add" className="btn-primary py-1 px-3 text-sm">
            Ajouter un client
          </Link>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Rechercher un client..."
              className="pl-9 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <div className="relative">
              <button 
                className={`p-2 border rounded-md hover:bg-muted/50 transition-colors flex items-center ${showFilters ? 'bg-muted/50' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Filtres</span>
                {filterActive && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full"></span>
                )}
              </button>
              
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 z-10 bg-card border rounded-md shadow-md p-4 w-64"
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm mb-1">Minimum de factures</label>
                        <input
                          type="number"
                          min="0"
                          value={minInvoices}
                          onChange={(e) => setMinInvoices(parseInt(e.target.value) || 0)}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-1">Minimum de rapports</label>
                        <input
                          type="number"
                          min="0"
                          value={minReports}
                          onChange={(e) => setMinReports(parseInt(e.target.value) || 0)}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-1">Minimum de véhicules</label>
                        <input
                          type="number"
                          min="0"
                          value={minVehicles}
                          onChange={(e) => setMinVehicles(parseInt(e.target.value) || 0)}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-2 pt-2">
                        <button
                          onClick={resetFilters}
                          className="btn-outline text-xs py-1 px-2"
                        >
                          Réinitialiser
                        </button>
                        <button
                          onClick={applyFilters}
                          className="btn-primary text-xs py-1 px-2"
                        >
                          Appliquer
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="relative">
              <button
                className="p-2 border rounded-md hover:bg-muted/50 transition-colors flex items-center"
                onClick={() => {
                  const nextSortField = sortBy === 'name' ? 'date' : 
                                      sortBy === 'date' ? 'invoices' :
                                      sortBy === 'invoices' ? 'reports' : 'name';
                  handleSort(nextSortField);
                }}
              >
                <Clock className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Trier par</span>
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Sort options bar */}
        <div className="mt-3 flex items-center text-xs text-muted-foreground">
          <span>Trier par:</span>
          <button 
            className={`ml-2 px-2 py-1 rounded ${sortBy === 'name' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}`}
            onClick={() => handleSort('name')}
          >
            Nom {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            className={`ml-2 px-2 py-1 rounded ${sortBy === 'date' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}`}
            onClick={() => handleSort('date')}
          >
            Date {sortBy === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            className={`ml-2 px-2 py-1 rounded ${sortBy === 'invoices' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}`}
            onClick={() => handleSort('invoices')}
          >
            Factures {sortBy === 'invoices' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            className={`ml-2 px-2 py-1 rounded ${sortBy === 'reports' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}`}
            onClick={() => handleSort('reports')}
          >
            Rapports {sortBy === 'reports' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          
          {filterActive && (
            <div className="ml-auto flex items-center">
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center">
                Filtres actifs
                <button 
                  onClick={resetFilters}
                  className="ml-1 hover:text-primary/80"
                >
                  ×
                </button>
              </span>
            </div>
          )}
        </div>
      </div>
      
      {clientsToDisplay.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <User className="h-12 w-12 text-muted-foreground opacity-50 mb-2" />
          {searchTerm || filterActive ? (
            <>
              <h3 className="font-medium">Aucun client trouvé</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Aucun client ne correspond à votre recherche ou aux filtres appliqués.
              </p>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  resetFilters();
                }}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Réinitialiser la recherche et les filtres
              </button>
            </>
          ) : (
            <>
              <h3 className="font-medium">Aucun client</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez votre premier client pour commencer.
              </p>
              <Link to="/dashboard/clients/add" className="mt-4 btn-primary text-sm">
                Ajouter un client
              </Link>
            </>
          )}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="divide-y"
        >
          {clientsToDisplay.map((client, index) => (
            <motion.div 
              key={client.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: index * 0.05, duration: 0.3 }
              }}
              whileHover={{ backgroundColor: 'rgba(var(--muted), 0.3)' }}
              className="p-4 transition-colors"
            >
              <div className="flex justify-between">
                <Link to={`/dashboard/clients/${client.id}`} className="flex-1 group">
                  <div className="flex items-start space-x-3">
                    <motion.div 
                      className="bg-primary/10 text-primary h-10 w-10 rounded-full flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    >
                      <span className="font-medium text-sm">
                        {client.first_name?.[0] || ''}{client.last_name?.[0] || ''}
                      </span>
                    </motion.div>
                    
                    <div>
                      <h4 className="font-medium group-hover:text-primary transition-colors">
                        {client.first_name} {client.last_name}
                      </h4>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {client.email && <span>{client.email}</span>}
                        {client.phone && <span>{client.phone}</span>}
                      </div>
                      
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">
                          Client depuis {new Date(client.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
                
                <div className="flex flex-col md:flex-row items-end md:items-center">
                  <div className="flex space-x-3 text-sm text-muted-foreground mb-2 md:mb-0 md:mr-6">
                    <motion.div 
                      className="flex items-center cursor-pointer hover:text-primary transition-colors" 
                      title="Véhicules"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Car className="h-3 w-3 mr-1" />
                      <span>{client.vehicles.count}</span>
                    </motion.div>
                    
                    <motion.div 
                      className="flex items-center cursor-pointer hover:text-primary transition-colors" 
                      title="Rapports"
                      whileHover={{ scale: 1.05 }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      <span>{client.reports.count}</span>
                    </motion.div>
                    
                    <motion.div 
                      className="flex items-center cursor-pointer hover:text-primary transition-colors" 
                      title="Factures"
                      whileHover={{ scale: 1.05 }}
                    >
                      <ScrollText className="h-3 w-3 mr-1" />
                      <span>{client.invoices.count}</span>
                    </motion.div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => navToInvoices(client.id, e)}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Voir les factures"
                    >
                      <ScrollText className="h-4 w-4" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => navToMessages(client, e)}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Envoyer un message"
                    >
                      <Mail className="h-4 w-4" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1, color: '#ef4444' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => handleDelete(client.id, e)}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                      title="Supprimer le client"
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default ClientList;