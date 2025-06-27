import { supabase } from '../lib/supabase';
import { sessionManager } from '../lib/session-manager';
import { toast } from 'react-hot-toast';

export class Invoice {
  static async create(invoiceData) {
    try {
      // Vérifier qu'on a un utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour créer une facture");
      }
      
      // Vérifier que le client appartient à l'utilisateur actuel
      const { data: clientData, error: clientCheckError } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', invoiceData.clientId)
        .single();
      
      if (clientCheckError) throw clientCheckError;
      if (!clientData || clientData.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à créer une facture pour ce client");
      }
      
      // Calculer le total des heures de main d'œuvre à partir des détails
      let totalLaborHours = invoiceData.laborHours;
      if (invoiceData.laborDetails && invoiceData.laborDetails.length > 0) {
        totalLaborHours = invoiceData.laborDetails.reduce(
          (sum, detail) => sum + (parseFloat(detail.hours) || 0),
          0
        );
      }
      
      await sessionManager.refreshIfNeeded()

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          client_id: invoiceData.clientId,
          vehicle_id: invoiceData.vehicleId,
          report_id: invoiceData.reportId,
          invoice_number: invoiceData.invoiceNumber,
          issue_date: invoiceData.issueDate || new Date(),
          due_date: invoiceData.dueDate,
          parts: invoiceData.parts,
          labor_hours: totalLaborHours,
          labor_rate: invoiceData.laborRate,
          laborDetails: invoiceData.laborDetails, // Ensure the correct column name is used
          subtotal: invoiceData.subtotal,
          tax_rate: invoiceData.taxRate || 0.2, // 20% par défaut
          tax_amount: invoiceData.taxAmount || 0,
          total: invoiceData.total,
          status: invoiceData.status || 'pending',
          notes: invoiceData.notes,
          template: invoiceData.template || 'white',
          template_color: invoiceData.templateColor || 'blue',
          insurer: invoiceData.insurer,
          legal_text: invoiceData.legalText || 'Cette facture est émise conformément aux articles L441-3 et L441-9 du Code de commerce. Le non-paiement à l\'échéance entraînera des pénalités conformément à la loi en vigueur.',
          payment_method: invoiceData.paymentMethod || 'Virement bancaire',
          created_at: new Date()
        }])
        .select();
        
      if (error) {
        if (error.status === 401 || error.message?.includes('JWT')) {
          toast.error("Votre session a expiré, veuillez recharger la page.");
          throw new Error('SESSION_EXPIRED');
        }
        throw error;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }
  
  static async update(id, invoiceData) {
    try {
      // Vérifier qu'on a un utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour modifier une facture");
      }
      
      // Vérifier que le client appartient à l'utilisateur actuel
      const { data: clientData, error: clientCheckError } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', invoiceData.clientId)
        .single();
      
      if (clientCheckError) throw clientCheckError;
      if (!clientData || clientData.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à modifier une facture pour ce client");
      }
      
      // Vérifier que la facture appartient à l'utilisateur actuel
      const { data: invoiceCheck, error: invoiceCheckError } = await supabase
        .from('invoices')
        .select('id, client_id, clients(user_id)')
        .eq('id', id)
        .single();
      
      if (invoiceCheckError) throw invoiceCheckError;
      if (!invoiceCheck || invoiceCheck.clients.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à modifier cette facture");
      }
      
      // Calculer le total des heures de main d'œuvre à partir des détails
      let totalLaborHours = invoiceData.laborHours;
      if (invoiceData.laborDetails && invoiceData.laborDetails.length > 0) {
        totalLaborHours = invoiceData.laborDetails.reduce(
          (sum, detail) => sum + (parseFloat(detail.hours) || 0),
          0
        );
      }
      
      await sessionManager.refreshIfNeeded()

      const { data, error } = await supabase
        .from('invoices')
        .update({
          client_id: invoiceData.clientId,
          vehicle_id: invoiceData.vehicleId,
          report_id: invoiceData.reportId,
          invoice_number: invoiceData.invoiceNumber,
          issue_date: invoiceData.issueDate,
          due_date: invoiceData.dueDate,
          parts: invoiceData.parts,
          labor_hours: totalLaborHours,
          labor_rate: invoiceData.laborRate,
          laborDetails: invoiceData.laborDetails,
          subtotal: invoiceData.subtotal,
          tax_rate: invoiceData.taxRate,
          tax_amount: invoiceData.taxAmount,
          total: invoiceData.total,
          status: invoiceData.status,
          notes: invoiceData.notes,
          template: invoiceData.template,
          template_color: invoiceData.templateColor,
          insurer: invoiceData.insurer,
          payment_method: invoiceData.paymentMethod,
          updated_at: new Date()
        })
        .eq('id', id)
        .select();
        
      if (error) {
        if (error.status === 401 || error.message?.includes('JWT')) {
          toast.error("Votre session a expiré, veuillez recharger la page.");
          throw new Error('SESSION_EXPIRED');
        }
        throw error;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }
  
  static async getAll() {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux factures");
      }
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients!inner(*),
          vehicles!inner(*)
        `)
        .order('issue_date', { ascending: false });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting invoices:', error);
      throw error;
    }
  }
  
  static async getById(id) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder à cette facture");
      }
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients!inner(*),
          vehicles!inner(*),
          reports(*)
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      // Ensure the laborDetails property exists
      if (!data.laborDetails && data.extracted_data?.laborDetails) {
        data.laborDetails = data.extracted_data.laborDetails;
      }
      
      // Si laborDetails est toujours null et qu'il y a un report associé, essayer de le récupérer
      if (!data.laborDetails && data.report_id) {
        try {
          const { data: reportData, error: reportError } = await supabase
            .from('reports')
            .select('extracted_data')
            .eq('id', data.report_id)
            .single();
          
          if (!reportError && reportData && reportData.extracted_data?.laborDetails) {
            data.laborDetails = reportData.extracted_data.laborDetails;
          }
        } catch (e) {
          console.warn('Failed to retrieve labor details from report:', e);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error getting invoice:', error);
      throw error;
    }
  }
  
  static async getNextInvoiceNumber() {
    try {
      // Vérifier qu'on a un utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Utilisateur non connecté");
      }
      
      try {
        // First, get all client IDs for the current user
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', session.user.id);
          
        if (clientsError) throw clientsError;
        
        // Ensure clientsData is an array and extract IDs
        const clientIds = Array.isArray(clientsData) ? clientsData.map(client => client.id) : [];
        
        // If no clients found, return default invoice number
        if (clientIds.length === 0) {
          return 'F-' + new Date().getFullYear() + '-001';
        }
        
        // Now get the latest invoice using the client IDs
        const { data, error } = await supabase
          .from('invoices')
          .select('invoice_number')
          .in('client_id', clientIds)
          .order('invoice_number', { ascending: false })
          .limit(1);
          
        if (error) throw error;
        
        // Check if data is an array and not empty before accessing its elements
        if (!Array.isArray(data) || data.length === 0) {
          return 'F-' + new Date().getFullYear() + '-001';
        }
        
        // Extraction du nombre à partir du dernier numéro de facture
        const lastNumber = data[0].invoice_number;
        const match = lastNumber.match(/F-\d{4}-(\d{3})/);
        
        if (match) {
          const nextNumber = parseInt(match[1]) + 1;
          return `F-${new Date().getFullYear()}-${nextNumber.toString().padStart(3, '0')}`;
        } else {
          return 'F-' + new Date().getFullYear() + '-001';
        }
      } catch (queryError) {
        console.error('Error querying invoice numbers:', queryError);
        // Fallback to a safe default format with random number to ensure uniqueness
        return `F-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`;
      }
    } catch (error) {
      console.error('Error getting next invoice number:', error);
      // Return a safe default value if anything fails
      return 'F-' + new Date().getFullYear() + '-001';
    }
  }
  
  static async updateStatus(id, status) {
    try {
      // Vérifier d'abord que la facture appartient à l'utilisateur actuel
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Utilisateur non connecté");
      }
      
      const { data: invoiceCheck, error: checkError } = await supabase
        .from('invoices')
        .select('id, client_id, clients!inner(user_id)')
        .eq('id', id)
        .single();
      
      if (checkError) throw checkError;
      if (!invoiceCheck || invoiceCheck.clients.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à modifier cette facture");
      }
      
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: status,
          updated_at: new Date()
        })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      // Vérifier qu'on a un utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Utilisateur non connecté");
      }
      
      // Récupérer uniquement les factures de l'utilisateur actuel
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*, clients!inner(user_id)')
        .eq('clients.user_id', session.user.id);

      if (error) throw error;

      // Calculer les statistiques
      const total = invoices.length;
      const totalAmount = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
      
      // Par statut
      const byStatus = {
        pending: {
          count: 0,
          amount: 0
        },
        sent: {
          count: 0,
          amount: 0
        },
        waiting_payment: {
          count: 0,
          amount: 0
        },
        paid: {
          count: 0,
          amount: 0
        }
      };

      invoices?.forEach(invoice => {
        // Statut par défaut si non spécifié
        const status = invoice.status || 'pending';
        
        if (byStatus[status]) {
          byStatus[status].count += 1;
          byStatus[status].amount += (invoice.total || 0);
        }
      });

      return {
        total,
        totalAmount,
        byStatus
      };
    } catch (error) {
      console.error('Error getting invoice statistics:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      // Vérifier d'abord que la facture appartient à l'utilisateur actuel
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Utilisateur non connecté");
      }
      
      const { data: invoiceCheck, error: checkError } = await supabase
        .from('invoices')
        .select('id, client_id, clients!inner(user_id)')
        .eq('id', id)
        .single();
      
      if (checkError) throw checkError;
      if (!invoiceCheck || invoiceCheck.clients.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à supprimer cette facture");
      }
      
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }
}