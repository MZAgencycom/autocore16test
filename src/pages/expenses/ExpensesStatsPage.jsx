import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { Coins, BarChart2 } from 'lucide-react';
import { Button } from '../../components/ui/button';

const ExpensesStatsPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount, date, expense_categories(name, color)');
      if (!error) {
        setExpenses(data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const categoryData = () => {
    const map = {};
    expenses.forEach((e) => {
      const name = e.expense_categories?.name || 'Autres';
      const color = e.expense_categories?.color || '#6366f1';
      if (!map[name]) map[name] = { name, total: 0, color };
      map[name].total += Number(e.amount) || 0;
    });
    return Object.values(map);
  };

  const monthlyData = () => {
    const map = {};
    expenses.forEach((e) => {
      if (!e.date) return;
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleString('fr-FR', { month: 'short' });
      if (!map[key]) map[key] = { name: label, total: 0, date: new Date(d.getFullYear(), d.getMonth(), 1) };
      map[key].total += Number(e.amount) || 0;
    });
    return Object.values(map).sort((a,b) => a.date - b.date).slice(-6);
  };

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  const catData = categoryData();
  const monthData = monthlyData();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center">
          <BarChart2 className="h-6 w-6 mr-2 text-primary" />
          Statistiques dépenses
        </h1>
        <Button asChild variant="secondary">
          <Link to="/dashboard/expenses">Retour</Link>
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Coins className="h-5 w-5 mr-2" /> Répartition par catégorie
          </h2>
          {catData.length === 0 ? (
            <p className="text-center text-muted-foreground">Aucune dépense</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {catData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart2 className="h-5 w-5 mr-2" /> Dépenses mensuelles
          </h2>
          {monthData.length === 0 ? (
            <p className="text-center text-muted-foreground">Aucune dépense</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpensesStatsPage;
