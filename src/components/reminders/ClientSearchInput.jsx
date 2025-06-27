import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  User, 
  Car, 
  Mail, 
  Phone, 
  Plus,
  Loader
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ClientSearchInput = ({ 
  onClientSelect, 
  initialValue = null, 
  placeholder = "Rechercher un client...",
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(initialValue);
  const [showResults, setShowResults] = useState(false);
  
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  
  useEffect(() => {
    // Initialize with initial value if provided
    if (initialValue) {
      setSelectedClient(initialValue);
    }
  }, [initialValue]);
  
  useEffect(() => {
    // Handle clicks outside of the component to close results
    function handleClickOutside(event) {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target) && 
        resultsRef.current && 
        !resultsRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
    // Search when term changes (with debounce)
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);
    
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);
  
  const performSearch = async () => {
    if (!searchTerm) return;
    
    setIsLoading(true);
    
    try {
      // Search in clients table
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          id, 
          first_name, 
          last_name, 
          email, 
          phone,
          vehicles (
            id, 
            make, 
            model, 
            registration
          )
        `)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(5);
      
      if (error) throw error;
      
      const formattedResults = clients.map(client => ({
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email || '',
        phone: client.phone || '',
        vehicles: client.vehicles || []
      }));
      
      setResults(formattedResults);
    } catch (error) {
      console.error('Error searching clients:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelect = (client) => {
    setSelectedClient(client);
    setShowResults(false);
    setSearchTerm('');
    
    if (onClientSelect) {
      onClientSelect(client);
    }
  };
  
  const clearSelection = () => {
    setSelectedClient(null);
    setSearchTerm('');
    
    if (onClientSelect) {
      onClientSelect(null);
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      {!selectedClient ? (
        // Search input
        <div className="relative\" ref={inputRef}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            className="w-full pl-9 py-2 border rounded-md"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
          />
          
          {searchTerm && (
            <button 
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      ) : (
        // Selected client display
        <div className="border rounded-md p-3 relative">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center font-medium">
                {selectedClient.name}
                <span className="ml-2 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-xs rounded-full">
                  Client CRM
                </span>
              </div>
              
              <div className="flex flex-col space-y-0.5 mt-1">
                {selectedClient.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-3 w-3 mr-1.5" />
                    <span>{selectedClient.email}</span>
                  </div>
                )}
                
                {selectedClient.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-3 w-3 mr-1.5" />
                    <span>{selectedClient.phone}</span>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              className="p-1 hover:bg-muted/50 rounded-full"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* Display selected client's vehicles if available */}
          {selectedClient.vehicles && selectedClient.vehicles.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex flex-wrap gap-1">
                {selectedClient.vehicles.map(vehicle => (
                  <div 
                    key={vehicle.id}
                    className="inline-flex items-center text-xs px-2 py-1 bg-muted/30 rounded"
                  >
                    <Car className="h-3 w-3 mr-1.5" />
                    <span>
                      {vehicle.make} {vehicle.model} {vehicle.registration ? `(${vehicle.registration})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Search results dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div 
            className="absolute z-50 mt-1 w-full bg-card rounded-md shadow-lg border overflow-hidden"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            ref={resultsRef}
          >
            {isLoading ? (
              <div className="p-4 text-center">
                <Loader className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Recherche en cours...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-60 overflow-y-auto">
                {results.map(client => (
                  <div 
                    key={client.id}
                    className="p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => handleSelect(client)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2">
                          {client.first_name?.[0] || ''}{client.last_name?.[0] || ''}
                        </div>
                        <div>
                          <div className="font-medium">{client.name}</div>
                          {client.email && <div className="text-sm text-primary">{client.email}</div>}
                          {client.phone && <div className="text-xs text-muted-foreground">{client.phone}</div>}
                        </div>
                      </div>
                      
                      {client.vehicles && client.vehicles.length > 0 && (
                        <div className="text-xs bg-muted/30 px-2 py-1 rounded flex items-center">
                          <Car className="h-3 w-3 mr-1" />
                          <span>{client.vehicles.length} véhicule{client.vehicles.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                    
                    {client.vehicles && client.vehicles.length > 0 && (
                      <div className="mt-2 text-xs flex flex-wrap gap-1">
                        {client.vehicles.slice(0, 2).map(v => (
                          <span key={v.id} className="px-1.5 py-0.5 bg-muted/30 rounded">
                            {v.make} {v.model} {v.registration ? `(${v.registration})` : ''}
                          </span>
                        ))}
                        {client.vehicles.length > 2 && (
                          <span className="px-1.5 py-0.5 bg-muted/30 rounded">
                            +{client.vehicles.length - 2} autre{client.vehicles.length - 2 > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : searchTerm.length >= 2 ? (
              <div className="p-4 text-center">
                <p className="text-muted-foreground mb-2">Aucun résultat pour "{searchTerm}"</p>
                <button className="btn-outline text-xs py-1 px-2 flex items-center mx-auto">
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter un client
                </button>
              </div>
            ) : (
              <div className="p-4 text-center">
                <User className="h-12 w-12 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-muted-foreground">
                  Tapez au moins 2 caractères pour rechercher
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientSearchInput;