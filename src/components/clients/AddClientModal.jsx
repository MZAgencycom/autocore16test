import { motion, AnimatePresence } from 'framer-motion';
import AddClientForm from './AddClientForm.jsx';

const AddClientModal = ({ isOpen = true, onClose, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-lg shadow-xl w-full max-w-3xl p-6 overflow-y-auto max-h-full"
            onClick={e => e.stopPropagation()}
          >
            <AddClientForm onClose={onClose} onSuccess={onSuccess} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddClientModal;
