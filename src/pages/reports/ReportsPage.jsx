import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import withTimeout from '../../utils/withTimeout';
import downloadFile from '../../utils/downloadFile';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, FileText, User, Car, Hash, Gauge, Eye } from 'lucide-react';
import ReportUploader from '../../components/reports/ReportUploader.jsx';
import ConfirmDeleteModal from '../../components/reports/ConfirmDeleteModal.jsx';
import { Report } from '../../models/Report';

const statusInfo = {
  to_invoice: { label: 'À facturer', color: 'bg-blue-500/10 text-blue-500' },
  dispute: { label: 'En litige', color: 'bg-yellow-500/10 text-yellow-500' },
  finalized: { label: 'Finalisé', color: 'bg-emerald-500/10 text-emerald-500' },
  archived: { label: 'Archivé', color: 'bg-red-500/10 text-red-500' },
  analyzed: { label: 'Analysé', color: 'bg-emerald-500/10 text-emerald-500' },
  pending: { label: 'En attente', color: 'bg-amber-500/10 text-amber-500' }
};

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  // Filters for history
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [make, setMake] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#upload') {
      setShowUploader(true);
    }
  }, [location]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await withTimeout(Report.getAll(), 10000, 'timeout');
        setReports(data || []);
      } catch (err) {
        console.error('Error loading reports:', err);
        toast.error(err.message || 'Échec de chargement des rapports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDeleteClick = (id) => {
    setReportToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;
    try {
      await Report.delete(reportToDelete);
      setReports((prev) => prev.filter((r) => r.id !== reportToDelete));
    } catch (err) {
      console.error('Error deleting report:', err);
    } finally {
      setShowDeleteConfirm(false);
      setReportToDelete(null);
    }
  };

  const filtered = reports.filter((r) => {
    const term = search.toLowerCase();
    const matchesTerm =
      !term ||
      (r.file_name || '').toLowerCase().includes(term) ||
      `${r.clients?.first_name || ''} ${r.clients?.last_name || ''}`.toLowerCase().includes(term) ||
      (r.vehicles?.registration || '').toLowerCase().includes(term) ||
      (r.vehicles?.vin || '').toLowerCase().includes(term) ||
      (r.id || '').toLowerCase().includes(term) ||
      new Date(r.created_at).toLocaleDateString('fr-FR').includes(term);

    const date = new Date(r.created_at);
    const afterStart = !startDate || date >= new Date(startDate);
    const beforeEnd = !endDate || date <= new Date(endDate);
    const statusMatch = status === 'all' || r.status === status;
    const makeMatch = !make || `${r.vehicles?.make || ''} ${r.vehicles?.model || ''}`.toLowerCase().includes(make.toLowerCase());
    return matchesTerm && afterStart && beforeEnd && statusMatch && makeMatch;
  });

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const recentReports = reports.slice(0, 30);
  const pendingReports = reports.filter(r => r.status === 'pending');

  const Card = ({ report }) => {
    const { label, color } = statusInfo[report.status] || statusInfo.pending;
    const truncatedVin = report.vehicles?.vin ? `${report.vehicles.vin.slice(0,8)}...` : '';
    const mileage = report.vehicles?.mileage ? `${report.vehicles.mileage.toLocaleString('fr-FR')} km` : '-';
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        onClick={() => navigate(`/dashboard/reports/${report.id}`)}
        className="relative cursor-pointer border rounded-lg p-4 hover:bg-muted/20 transition-colors overflow-hidden"
      >
        <div className="absolute top-2 right-2 flex justify-end gap-2 z-10">
          {report.file_url && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await downloadFile(report.file_url, 'rapport.pdf');
              }}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              title="Télécharger"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(report.id); }}
            className="p-1.5 rounded-md hover:bg-muted text-destructive"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {report.file_url && !/\.pdf$/i.test(report.file_url) && (
          <img
            src={report.file_url}
            alt="aperçu rapport"
            className="mb-3 h-24 w-full object-cover rounded"
          />
        )}
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-primary/10 text-primary rounded">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3
                className="font-medium text-sm max-w-[200px] truncate"
                title={report.file_name}
              >
                {report.file_name || `Rapport #${report.id.substring(0,8)}`}
              </h3>
            </div>
            <div className="flex items-center mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${color}`}>{label}</span>
              <span className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleDateString()}</span>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span className="truncate">{report.clients?.first_name} {report.clients?.last_name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Car className="h-3 w-3" />
                <span className="truncate">{report.vehicles?.make} {report.vehicles?.model}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Hash className="h-3 w-3" />
                <span>{truncatedVin}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Gauge className="h-3 w-3" />
                <span>{mileage}</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileText className="h-3 w-3" />
                <span>{report.vehicles?.registration}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-6 space-y-8">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowUploader(true)}
        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow-lg text-base font-semibold transition-transform hover:scale-105 flex items-center gap-2"
      >
        <Sparkles className="h-4 w-4" />
        <span>Analyser un rapport</span>
      </motion.button>

      <div>
        <h2 className="text-xl font-semibold mb-4">Rapports récents</h2>
        {loading ? (
          <div className="flex justify-center py-12">Chargement...</div>
        ) : recentReports.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {recentReports.map((r) => (<Card key={r.id} report={r} />))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">Aucun rapport</div>
        )}
      </div>

      {pendingReports.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Rapports en attente d'analyse</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {pendingReports.map((r) => (<Card key={r.id} report={r} />))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Historique des rapports</h2>
        <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 mb-4">
          <input
            type="search"
            placeholder="Rechercher par fichier, client, numéro ou date"
            className="flex-1 border rounded-md p-2"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="border rounded-md p-2" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">Tous</option>
            <option value="to_invoice">À facturer</option>
            <option value="dispute">En litige</option>
            <option value="finalized">Finalisé</option>
            <option value="archived">Archivé</option>
            <option value="analyzed">Analysé</option>
            <option value="pending">En attente</option>
          </select>
          <input type="text" placeholder="Marque/Modèle" className="border rounded-md p-2" value={make} onChange={(e) => { setMake(e.target.value); setPage(1); }} />
          <input type="date" className="border rounded-md p-2" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
          <input type="date" className="border rounded-md p-2" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
        </div>
        {paginated.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {paginated.map((r) => (<Card key={r.id} report={r} />))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">Aucun résultat</div>
        )}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center space-x-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded-md" disabled={page === 1}>Précédent</button>
            <span className="px-3 py-1">Page {page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 border rounded-md" disabled={page === totalPages}>Suivant</button>
          </div>
        )}
      </div>


      <AnimatePresence>
        {showUploader && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
          <motion.div
            className="relative w-full max-w-3xl mx-auto bg-card rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.8, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 40, opacity: 0 }}
          >
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowUploader(false)} className="p-1 rounded-md hover:bg-muted">
                  ✕
                </button>
              </div>
              <ReportUploader showReportLists={false} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default ReportsPage;
