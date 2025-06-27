import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, X } from 'lucide-react';

const ConfirmDeleteModal = ({ isOpen, onCancel, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          className="bg-card rounded-lg shadow-xl w-full max-w-md px-6 py-4"
          initial={{ scale: 0.8, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 40 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <h3 className="text-lg font-bold">Supprimer le rapport</h3>
            </div>
            <button className="p-1 rounded-md hover:bg-muted" onClick={onCancel}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-4">Souhaitez-vous vraiment supprimer ce rapport ?</p>
          <div className="flex justify-end space-x-3">
            <button onClick={onCancel} className="btn-outline">Annuler</button>
            <button
              onClick={onConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-md"
            >
              Supprimer définitivement
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConfirmDeleteModal;
