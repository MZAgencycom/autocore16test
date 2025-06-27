import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Coins } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import downloadFile from '../../utils/downloadFile';

const ExpenseDetailPage = () => {
  const { id } = useParams();
  const [expense, setExpense] = useState(null);

  useEffect(() => {
    const loadExpense = async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, expense_categories(name), clients(first_name, last_name)')
        .eq('id', id)
        .single();
      if (!error) {
        setExpense(data);
      } else {
        console.error('Error loading expense:', error);
      }
    };
    loadExpense();
  }, [id]);

  if (!expense) {
    return <div className="p-6">Chargement...</div>;
  }

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amt || 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center mb-6">
        <Coins className="h-6 w-6 mr-2 text-primary" />
        Détail dépense
      </h1>
      <div className="bg-card border rounded-lg p-6 space-y-3">
        <div>
          <strong>Description:</strong> {expense.description || '-'}
        </div>
        <div>
          <strong>Date:</strong> {expense.date || '-'}
        </div>
        <div>
          <strong>Montant:</strong> {formatCurrency(expense.amount)}
        </div>
        <div>
          <strong>Catégorie:</strong> {expense.expense_categories?.name || '-'}
        </div>
        <div>
          <strong>Client:</strong>{' '}
          {expense.clients ? `${expense.clients.first_name} ${expense.clients.last_name}` : '-'}
        </div>
        {expense.receipt_url && (
          <div>
            <button
              onClick={async () => {
                const url = supabase.storage
                  .from('receipts')
                  .getPublicUrl(expense.receipt_url).data.publicUrl;
                await downloadFile(url, 'justificatif.pdf');
              }}
              className="text-primary underline"
            >
              Voir justificatif
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseDetailPage;
