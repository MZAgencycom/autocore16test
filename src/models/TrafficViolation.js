import { supabase } from '../lib/supabase';

export class TrafficViolation {
  static async getAll() {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux infractions");
      }
      
      // Récupérer tous les véhicules de prêt de l'utilisateur
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('loan_vehicles')
        .select('id')
        .eq('user_id', session.user.id);
        
      if (vehiclesError) throw vehiclesError;
      
      if (!vehicles || vehicles.length === 0) {
        return []; // Aucun véhicule, donc aucune infraction
      }
      
      const vehicleIds = vehicles.map(v => v.id);
      
      // Récupérer les infractions pour ces véhicules
      const { data, error } = await supabase
        .from('traffic_violations')
        .select(`
          *,
          loan_vehicles(id, make, model, registration),
          vehicle_loans(id, client_id, clients(id, first_name, last_name))
        `)
        .in('vehicle_id', vehicleIds)
        .order('violation_date', { ascending: false });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting traffic violations:', error);
      throw error;
    }
  }
  
  static async getById(id) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder à cette infraction");
      }
      
      const { data, error } = await supabase
        .from('traffic_violations')
        .select(`
          *,
          loan_vehicles(*, user_id),
          vehicle_loans(id, client_id, clients(id, first_name, last_name, email, phone))
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      // Vérifier que cette infraction concerne un véhicule appartenant à l'utilisateur
      if (data.loan_vehicles.user_id !== session.user.id) {
        throw new Error("Vous n'avez pas l'autorisation d'accéder à cette infraction");
      }
      
      return data;
    } catch (error) {
      console.error('Error getting traffic violation:', error);
      throw error;
    }
  }
  
  static async create(violationData) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour créer une infraction");
      }
      
      // Vérifier que le véhicule appartient à l'utilisateur
      const { data: vehicleCheck, error: vehicleError } = await supabase
        .from('loan_vehicles')
        .select('user_id')
        .eq('id', violationData.vehicleId)
        .single();
        
      if (vehicleError) throw vehicleError;
      
      if (!vehicleCheck || vehicleCheck.user_id !== session.user.id) {
        throw new Error("Véhicule introuvable ou vous n'avez pas l'autorisation d'y accéder");
      }
      
      // Créer l'infraction
      const { data, error } = await supabase
        .from('traffic_violations')
        .insert([{
          vehicle_id: violationData.vehicleId,
          loan_id: violationData.loanId,
          violation_date: violationData.violationDate,
          amount: violationData.amount,
          points_lost: violationData.pointsLost || 0,
          payment_deadline: violationData.paymentDeadline,
          violation_image_url: violationData.violationImageUrl,
          status: violationData.status || 'pending',
          notes: violationData.notes
        }])
        .select();
        
      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Error creating traffic violation:', error);
      throw error;
    }
  }
  
  static async update(id, violationData) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour modifier une infraction");
      }
      
      // Vérifier que l'infraction concerne un véhicule appartenant à l'utilisateur
      const { data: violationCheck, error: violationError } = await supabase
        .from('traffic_violations')
        .select(`
          vehicle_id,
          loan_vehicles(user_id)
        `)
        .eq('id', id)
        .single();
        
      if (violationError) throw violationError;
      
      if (!violationCheck || violationCheck.loan_vehicles.user_id !== session.user.id) {
        throw new Error("Infraction introuvable ou vous n'avez pas l'autorisation de la modifier");
      }
      
      // Mettre à jour l'infraction
      const { data, error } = await supabase
        .from('traffic_violations')
        .update({
          violation_date: violationData.violationDate,
          amount: violationData.amount,
          points_lost: violationData.pointsLost,
          payment_deadline: violationData.paymentDeadline,
          violation_image_url: violationData.violationImageUrl,
          status: violationData.status,
          notes: violationData.notes,
          updated_at: new Date()
        })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Error updating traffic violation:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour supprimer une infraction");
      }
      
      // Vérifier que l'infraction concerne un véhicule appartenant à l'utilisateur
      const { data: violationCheck, error: violationError } = await supabase
        .from('traffic_violations')
        .select(`
          vehicle_id,
          loan_vehicles(user_id)
        `)
        .eq('id', id)
        .single();
        
      if (violationError) throw violationError;
      
      if (!violationCheck || violationCheck.loan_vehicles.user_id !== session.user.id) {
        throw new Error("Infraction introuvable ou vous n'avez pas l'autorisation de la supprimer");
      }
      
      const { error } = await supabase
        .from('traffic_violations')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting traffic violation:', error);
      throw error;
    }
  }
  
  static async updateStatus(id, status) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour modifier une infraction");
      }
      
      // Vérifier que l'infraction concerne un véhicule appartenant à l'utilisateur
      const { data: violationCheck, error: violationError } = await supabase
        .from('traffic_violations')
        .select(`
          vehicle_id,
          loan_vehicles(user_id)
        `)
        .eq('id', id)
        .single();
        
      if (violationError) throw violationError;
      
      if (!violationCheck || violationCheck.loan_vehicles.user_id !== session.user.id) {
        throw new Error("Infraction introuvable ou vous n'avez pas l'autorisation de la modifier");
      }
      
      const { data, error } = await supabase
        .from('traffic_violations')
        .update({
          status: status,
          updated_at: new Date()
        })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Error updating traffic violation status:', error);
      throw error;
    }
  }
  
  static async getByVehicle(vehicleId) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux infractions");
      }
      
      // Vérifier que le véhicule appartient à l'utilisateur
      const { data: vehicleCheck, error: vehicleError } = await supabase
        .from('loan_vehicles')
        .select('user_id')
        .eq('id', vehicleId)
        .eq('user_id', session.user.id)
        .single();
        
      if (vehicleError) throw vehicleError;
      
      if (!vehicleCheck) {
        throw new Error("Véhicule introuvable ou vous n'avez pas l'autorisation d'y accéder");
      }
      
      const { data, error } = await supabase
        .from('traffic_violations')
        .select(`
          *,
          vehicle_loans(id, client_id, clients(id, first_name, last_name))
        `)
        .eq('vehicle_id', vehicleId)
        .order('violation_date', { ascending: false });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting vehicle traffic violations:', error);
      throw error;
    }
  }
  
  static async getByLoan(loanId) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux infractions");
      }
      
      // Vérifier que le prêt concerne un véhicule appartenant à l'utilisateur
      const { data: loanCheck, error: loanError } = await supabase
        .from('vehicle_loans')
        .select(`
          vehicle_id,
          loan_vehicles(user_id)
        `)
        .eq('id', loanId)
        .single();
        
      if (loanError) throw loanError;
      
      if (!loanCheck || loanCheck.loan_vehicles.user_id !== session.user.id) {
        throw new Error("Prêt introuvable ou vous n'avez pas l'autorisation d'y accéder");
      }
      
      const { data, error } = await supabase
        .from('traffic_violations')
        .select('*')
        .eq('loan_id', loanId)
        .order('violation_date', { ascending: false });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting loan traffic violations:', error);
      throw error;
    }
  }

  static async getByClient(clientId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux infractions");
      }

      // Vérifier que le client appartient à l'utilisateur
      const { data: clientCheck, error: clientError } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      if (!clientCheck || clientCheck.user_id !== session.user.id) {
        throw new Error("Client introuvable ou vous n'avez pas l'autorisation d'y accéder");
      }

      const { data, error } = await supabase
        .from('traffic_violations')
        .select(`*, loan_vehicles(id, make, model, registration), vehicle_loans(id, client_id)`) 
        .eq('vehicle_loans.client_id', clientId)
        .order('violation_date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting client traffic violations:', error);
      throw error;
    }
  }
}
