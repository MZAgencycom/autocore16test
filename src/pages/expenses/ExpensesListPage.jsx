import { useEffect, useState } from 'react';
import { Coins, Plus, FileText, BarChart2 } from 'lucide-react';
import { supabase, refreshSessionIfNeeded } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';
import AddExpenseModal from '../../components/expenses/AddExpenseModal';
import { Button } from '../../components/ui/button';

const ExpensesListPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('expenses')
          .select('id, description, amount, date, expense_categories(name), clients(id, first_name, last_name)')
          .order('date', { ascending: false });
        if (error) throw error;
        setExpenses(data || []);
      } catch (err) {
        console.error('Error loading expenses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  const handleSave = async ({ file, text, category, amount }) => {
    try {
      setLoading(true);
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const ext = file.name.split('.').pop();
      const fileName = `expense_${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      await refreshSessionIfNeeded();

      const timeout = setTimeout(() => {
        setLoading(false);
        alert('Temps dépassé. Veuillez réessayer.');
      }, 15000);

      const { data: inserted, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id, // Add the user_id field for RLS policy
          amount: amount || 0,
          date: new Date().toISOString().split('T')[0],
          description: text.slice(0, 100),
          vendor_name: null,
          receipt_url: uploadData.path,
          receipt_text: text,
          status: 'pending'
        })
        .select()
        .single();

      clearTimeout(timeout);
      if (error) throw error;
      setExpenses((prev) => [inserted, ...prev]);
    } catch (err) {
      console.error('Error saving expense:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amt || 0);

  const formatDate = (dt) =>
    dt ? new Intl.DateTimeFormat('fr-FR').format(new Date(dt)) : '-';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Coins className="h-6 w-6 mr-2 text-primary" />
          Dépenses
        </h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="flex items-center">
            <Link to="/dashboard/expenses/stats">
              <BarChart2 className="h-4 w-4 mr-2" /> Statistiques
            </Link>
          </Button>
          <Button onClick={() => setShowModal(true)} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" /> Nouvelle dépense
          </Button>
        </div>
      </div>
      <div className="bg-card rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Chargement...</div>
        ) : expenses.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">Aucune dépense pour le moment</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left bg-muted/40">
                <th className="p-3">Date</th>
                <th className="p-3">Description</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3">Client</th>
                <th className="p-3 text-right">Montant</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-t">
                  <td className="p-3">{formatDate(exp.date)}</td>
                  <td className="p-3">{exp.description}</td>
                  <td className="p-3">{exp.expense_categories?.name || '-'}</td>
                  <td className="p-3">
                    {exp.clients ? `${exp.clients.last_name} ${exp.clients.first_name}` : '-'}
                  </td>
                  <td className="p-3 text-right">{formatCurrency(exp.amount)}</td>
                  <td className="p-3 text-right">
                    <Link
                      to={`/dashboard/expenses/${exp.id}`}
                      className="text-primary flex items-center"
                    >
                      <FileText className="h-4 w-4 mr-1" /> Détails
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AddExpenseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />
    </div>
  );
};

export default ExpensesListPage;