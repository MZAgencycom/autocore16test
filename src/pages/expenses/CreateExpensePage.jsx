import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Loader } from 'lucide-react';
import { analyzePDF } from '../../lib/ocr';
import { supabase, refreshSessionIfNeeded } from '../../lib/supabaseClient';
import { Client } from '../../models/Client';
import { Select, SelectItem, SelectValue } from '../../components/ui/select';

const CreateExpensePage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .order('last_name', { ascending: true });
      if (!error) {
        setClients(data || []);
      }
    };
    loadClients();
  }, []);

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);
    setError(null);
    
    try {
      setLoading(true);
      const result = await analyzePDF(selected, () => {});
      
      // Safely extract text from the result object
      if (result && result.text && typeof result.text === 'string' && !description) {
        setDescription(result.text.slice(0, 100));
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError(`Erreur lors de l'analyse du fichier: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      const ext = file.name.split('.').pop();
      const fileName = `expense_${Date.now()}.${ext}`;
      
      // Upload to the 'reports' bucket which exists and is accessible
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      await refreshSessionIfNeeded();

      const timeout = setTimeout(() => {
        setLoading(false);
        alert('Temps dépassé. Veuillez réessayer.');
      }, 15000);

      const { data, error: insertErr } = await supabase
        .from('expenses')
        .insert({
          amount: parseFloat(amount) || 0,
          date: date || new Date().toISOString().split('T')[0],
          description: description || `Dépense du ${new Date().toLocaleDateString()}`,
          client_id: clientId || null,
          receipt_url: uploadData?.path,
          receipt_text: null
        })
        .select()
        .single();

      clearTimeout(timeout);
        
      if (insertErr) throw insertErr;
      
      navigate(`/dashboard/expenses/${data.id}`);
    } catch (err) {
      console.error('Error saving expense:', err);
      setError(`Erreur lors de l'enregistrement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center mb-6">
        <Coins className="h-6 w-6 mr-2 text-primary" />
        Nouvelle dépense
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium mb-1">Justificatif</label>
          <input 
            type="file" 
            accept="image/*,application/pdf" 
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          {loading && (
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Analyse du fichier en cours...
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description de la dépense"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Montant TTC (€)</label>
          <input
            type="number"
            step="0.01"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Client</label>
          <Select
            value={clientId}
            onValueChange={setClientId}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <SelectValue placeholder="Sélectionner un client" />
            <SelectItem value="">Aucun</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.last_name} {client.first_name}
              </SelectItem>
            ))}
          </Select>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          disabled={loading || !file}
        >
          {loading ? (
            <>
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Enregistrement...
            </>
          ) : (
            'Enregistrer'
          )}
        </button>
      </form>
    </div>
  );
};

export default CreateExpensePage;