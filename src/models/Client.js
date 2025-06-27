import { supabase } from '../lib/supabase';

export class Client {
  static async create(clientData) {
    try {
      // Get the current authenticated user's session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        throw new Error('Vous devez être connecté pour créer un client');
      }
      
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          first_name: clientData.firstName,
          last_name: clientData.lastName,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          created_at: new Date(),
          user_id: sessionData.session.user.id // Ajout explicite du user_id
        }])
        .select('id');
        
      if (error) throw error;
      
      return data[0].id;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }
  
  static async getById(id) {
    try {
      // Verify session exists first
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Vous devez être connecté pour accéder à ce client');
      }
      
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          vehicles(*),
          reports(*),
          invoices(*)
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting client:', error);
      throw error;
    }
  }
  
  static async getAll() {
    try {
      // Verify session exists first
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Vous devez être connecté pour accéder aux clients');
      }
      
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          vehicles(count),
          reports(count),
          invoices(count)
        `)
        .order('last_name', { ascending: true });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting clients:', error);
      throw error;
    }
  }
  
  static async update(id, clientData) {
    try {
      // Verify session exists first
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Vous devez être connecté pour modifier un client');
      }
      
      const { data, error } = await supabase
        .from('clients')
        .update({
          first_name: clientData.firstName,
          last_name: clientData.lastName,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address, // Ajout du champ address
          updated_at: new Date()
        })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      // Verify session exists first
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Vous devez être connecté pour supprimer un client');
      }
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }
  
  static async findDuplicate(firstName, lastName, vehicleRegistration) {
    try {
      // Obtenez d'abord l'ID de l'utilisateur connecté
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Utilisateur non connecté');
      }
      const userId = sessionData.session.user.id;
      
      // Recherche par nom et prénom, seulement parmi les clients de l'utilisateur connecté
      const { data: clientMatches, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId) // Filtrer par user_id
        .ilike('first_name', `%${firstName}%`)
        .ilike('last_name', `%${lastName}%`);
        
      if (clientError) throw clientError;
      
      // Si un véhicule est fourni, vérifier également les correspondances de véhicules
      if (vehicleRegistration && clientMatches.length > 0) {
        const clientIds = clientMatches.map(client => client.id);
        
        const { data: vehicleMatches, error: vehicleError } = await supabase
          .from('vehicles')
          .select('*')
          .in('client_id', clientIds)
          .ilike('registration', `%${vehicleRegistration}%`);
          
        if (vehicleError) throw vehicleError;
        
        if (vehicleMatches.length > 0) {
          return {
            isDuplicate: true,
            clients: clientMatches,
            vehicles: vehicleMatches
          };
        }
      }
      
      return {
        isDuplicate: clientMatches.length > 0,
        clients: clientMatches,
        vehicles: []
      };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      throw error;
    }
  }
  
  // Nouvelle méthode pour récupérer l'historique complet d'un client
  static async getHistory(id) {
    try {
      // Verify session exists first
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Vous devez être connecté pour accéder à cet historique');
      }
      
      // Récupérer les détails du client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
        
      if (clientError) throw clientError;
      
      // Récupérer les véhicules
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('client_id', id);
        
      if (vehiclesError) throw vehiclesError;
      
      // Récupérer les factures
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', id);
        
      if (invoicesError) throw invoicesError;
      
      // Récupérer les rapports
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('client_id', id);
        
      if (reportsError) throw reportsError;
      
      // Récupérer les rappels
      const { data: reminders, error: remindersError } = await supabase
        .from('reminders')
        .select('*')
        .eq('client_id', id);
      
      // Créer un historique combiné
      const history = [
        // Client création
        {
          type: 'client_created',
          title: 'Client créé',
          date: client.created_at,
          details: `${client.first_name} ${client.last_name}`,
          metadata: { client }
        },
        
        // Véhicules
        ...vehicles.map(vehicle => ({
          type: 'vehicle_added',
          title: 'Véhicule ajouté',
          date: vehicle.created_at,
          details: `${vehicle.make} ${vehicle.model}${vehicle.registration ? ` (${vehicle.registration})` : ''}`,
          metadata: { vehicle }
        })),
        
        // Rapports
        ...reports.map(report => ({
          type: 'report_imported',
          title: 'Rapport importé',
          date: report.created_at,
          details: report.file_name || `Rapport #${report.id.substring(0, 8)}`,
          metadata: { report }
        })),
        
        // Factures
        ...invoices.map(invoice => ({
          type: 'invoice_created',
          title: 'Facture créée',
          date: invoice.created_at,
          details: `Facture ${invoice.invoice_number}`,
          metadata: { invoice }
        })),
        
        // Rappels (si disponibles)
        ...(reminders || []).map(reminder => ({
          type: 'reminder_created',
          title: 'Rappel créé',
          date: reminder.created_at,
          details: reminder.title,
          metadata: { reminder }
        }))
      ];
      
      // Trier par date (du plus récent au plus ancien)
      return history.sort((a, b) => new Date(b.date) - new Date(a.date));
      
    } catch (error) {
      console.error('Error getting client history:', error);
      throw error;
    }
  }
}