import { useState } from 'react';
import { Calendar, Plus, Bell, Filter, Clock, ArrowUpDown, ArrowDown, ArrowUp, Search, UserRound, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReminders } from '../components/reminders/RemindersContext';
import ReminderList from '../components/reminders/ReminderList';
import ReminderModal from '../components/reminders/ReminderModal';
import ClientSearchInput from '../components/reminders/ClientSearchInput';
import { supabase } from '../lib/supabase';

const RemindersPage = () => {
  const { updateFilters, filters, loadReminders } = useReminders();
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Charger les clients pour le filtre
  const loadClients = async () => {
    if (clients.length > 0) return; // Déjà chargés
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('last_name', { ascending: true });
        
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddSuccess = (reminder) => {
    if (import.meta?.env?.DEV) console.log("Rappel créé avec succès:", reminder);
    setShowAddModal(false);
    
    // Recharger explicitement les rappels pour s'assurer que le nouveau rappel apparaît
    loadReminders();
  };
  
  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
  };
  
  const handleClientChange = (client) => {
    setSelectedClient(client);
    updateFilters({ clientId: client?.id || null });
  };
  
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Bell className="h-6 w-6 mr-2 text-primary" />
            Rappels et relances
          </h1>
          <p className="text-muted-foreground">
            Gérez vos rappels et suivez vos relances clients
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau rappel
          </button>
        </div>
      </div>
      
      {/* Contenu principal */}
      <div className="bg-card rounded-lg border p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-primary mr-2" />
              <h2 className="font-medium text-lg">Tous les rappels</h2>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="search"
                  placeholder="Rechercher..."
                  className="pl-9 pr-3 py-1.5 text-sm border rounded-md"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    updateFilters({ search: e.target.value });
                  }}
                />
              </div>
              
              <button 
                className="flex items-center space-x-1 px-3 py-1.5 text-sm border rounded-md hover:bg-muted/30"
                onClick={toggleSortOrder}
              >
                <Clock className="h-4 w-4 mr-1" />
                <span>Date</span>
                {sortOrder === 'asc' ? (
                  <ArrowUp className="h-3 w-3 ml-1" />
                ) : (
                  <ArrowDown className="h-3 w-3 ml-1" />
                )}
              </button>
              
              <div className="relative w-56 flex-grow sm:flex-grow-0" onClick={loadClients}>
                <ClientSearchInput
                  onClientSelect={handleClientChange}
                  initialValue={selectedClient}
                  placeholder="Filtrer par client..."
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          <ReminderList />
        </div>
      </div>
      
      {/* Modal pour ajouter un rappel */}
      <AnimatePresence>
        {showAddModal && (
          <ReminderModal
            isOpen={true}
            onClose={() => setShowAddModal(false)}
            onSuccess={handleAddSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RemindersPage;