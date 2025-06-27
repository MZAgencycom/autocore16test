import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Send, FileText } from 'lucide-react';

const InvoiceStatusBadge = ({ status, onChange, isAnimating = false }) => {
  const [prevStatus, setPrevStatus] = useState(status);
  
  useEffect(() => {
    // Pour garantir que l'animation se produit même si on revient au même statut
    if (status !== prevStatus) {
      setPrevStatus(status);
    }
  }, [status]);
  
  const getStatusDetails = (statusValue) => {
    switch (statusValue) {
      case 'pending':
        return { 
          label: 'Générée', 
          className: 'bg-amber-500/10 text-amber-600',
          icon: FileText
        };
      case 'sent':
        return { 
          label: 'Envoyée', 
          className: 'bg-blue-500/10 text-blue-600',
          icon: Send
        };
      case 'waiting_payment':
        return { 
          label: 'Paiement en attente', 
          className: 'bg-orange-500/10 text-orange-600',
          icon: Clock
        };
      case 'paid':
        return { 
          label: 'Encaissée', 
          className: 'bg-emerald-500/10 text-emerald-600',
          icon: CheckCircle
        };
      default:
        return { 
          label: 'Générée', 
          className: 'bg-amber-500/10 text-amber-600',
          icon: FileText
        };
    }
  };
  
  const statusDetails = getStatusDetails(status);
  const StatusIcon = statusDetails.icon;
  
  return (
    <div className="flex justify-center">
      <motion.div
        className={`relative ${statusDetails.className} px-3 py-1 rounded-full text-xs flex items-center justify-center min-w-[120px]`}
        animate={isAnimating ? 
          { scale: [1, 1.1, 1], y: [0, -3, 0] } : 
          {}
        }
        transition={{ 
          duration: 0.5,
          ease: "easeInOut"
        }}
      >
        {onChange ? (
          <select
            value={status}
            onChange={(e) => onChange(e.target.value)}
            className={`appearance-none bg-transparent border-none text-xs focus:ring-0 cursor-pointer pl-6 pr-2`}
            style={{ minWidth: "110px" }}
          >
            <option value="pending">Générée</option>
            <option value="sent">Envoyée</option>
            <option value="waiting_payment">Paiement en attente</option>
            <option value="paid">Encaissée</option>
          </select>
        ) : (
          <span className="pl-6">{statusDetails.label}</span>
        )}
        
        <StatusIcon className="absolute left-2.5 h-3.5 w-3.5" />
      </motion.div>
    </div>
  );
};

export default InvoiceStatusBadge;