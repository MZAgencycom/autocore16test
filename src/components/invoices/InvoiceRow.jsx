import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import InvoiceActions from './InvoiceActions';
import EmailSender from '../communication/EmailSender';

const InvoiceRow = ({ invoice, onStatusChange, animating = false }) => {
  const navigate = useNavigate();
  const [showEmailSender, setShowEmailSender] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  // Formater un montant en euros
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Formater une date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  // Préparation des données pour l'email
  const emailData = {
    recipient: {
      name: `${invoice.clients?.first_name} ${invoice.clients?.last_name}`,
      email: invoice.clients?.email || ''
    },
    vehicle: {
      make: invoice.vehicles?.make,
      model: invoice.vehicles?.model,
      registration: invoice.vehicles?.registration || ''
    },
    invoice: {
      invoice_number: invoice.invoice_number,
      total: invoice.total
    }
  };

  const handleSendClick = () => {
    setShowEmailSender(true);
  };

  const handleDownloadStart = (id) => {
    setDownloadingId(id);
    setDownloadError(null);
  };

  const handleDownloadComplete = (id, success, errorMessage) => {
    setDownloadingId(null);
    if (!success) {
      setDownloadError(errorMessage || "Erreur lors du téléchargement");
    }
  };

  return (
    <>
      <motion.tr
        className="hover:bg-muted/20 transition-colors"
        animate={animating ? { backgroundColor: ['rgba(var(--primary), 0.1)', 'rgba(var(--background), 1)'] } : {}}
        transition={{ duration: 0.8 }}
      >
        <td className="py-3 px-3 text-sm whitespace-nowrap">{invoice.invoice_number}</td>
        <td className="py-3 px-3 text-sm">
          <div className="font-medium">{invoice.clients?.first_name} {invoice.clients?.last_name}</div>
        </td>
        <td className="py-3 px-3 text-sm">{invoice.vehicles?.make} {invoice.vehicles?.model}</td>
        <td className="py-3 px-3 text-sm whitespace-nowrap">{formatDate(invoice.issue_date)}</td>
        <td className="py-3 px-3 text-sm text-right whitespace-nowrap font-medium">{formatCurrency(invoice.total)}</td>
        <td className="py-3 px-3 text-sm">
          <InvoiceStatusBadge 
            status={invoice.status} 
            onChange={(value) => onStatusChange(invoice.id, value)}
            isAnimating={animating}
          />
        </td>
        <td className="py-3 px-3 text-sm text-center">
          <InvoiceActions 
            invoice={invoice}
            onDownloadStart={handleDownloadStart}
            onDownloadComplete={handleDownloadComplete}
            onSendClick={handleSendClick}
          />
        </td>
      </motion.tr>

      {/* Module d'envoi d'email */}
      {showEmailSender && (
        <tr>
          <td colSpan="7" className="p-0">
            <div className="bg-muted/5 border-t border-b p-4">
              <EmailSender
                recipient={emailData.recipient}
                vehicle={emailData.vehicle}
                invoice={emailData.invoice}
                preselectedTemplate="invoice"
                onClose={() => setShowEmailSender(false)}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default InvoiceRow;