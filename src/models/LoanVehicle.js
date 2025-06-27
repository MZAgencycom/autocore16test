import { supabase } from '../lib/supabase';

export class LoanVehicle {
  static async getAll() {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux véhicules de prêt");
      }
      
      const { data, error } = await supabase
        .from('loan_vehicles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting loan vehicles:', error);
      throw error;
    }
  }
  
  static async getById(id) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder à ce véhicule");
      }
      
      const { data, error } = await supabase
        .from('loan_vehicles')
        .select(`
          *,
          vehicle_damages(*)
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      // Récupérer également les prêts associés à ce véhicule
      const { data: loans, error: loansError } = await supabase
        .from('vehicle_loans')
        .select(`
          *,
          clients(id, first_name, last_name)
        `)
        .eq('vehicle_id', id)
        .order('created_at', { ascending: false });
        
      if (loansError) throw loansError;
      
      // Combiner les données
      return {
        ...data,
        loans: loans || []
      };
    } catch (error) {
      console.error('Error getting loan vehicle:', error);
      throw error;
    }
  }
  
  static async create(vehicleData) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour créer un véhicule de prêt");
      }
      
      const { data, error } = await supabase
        .from('loan_vehicles')
        .insert([{
          user_id: session.user.id,
          make: vehicleData.make,
          model: vehicleData.model,
          registration: vehicleData.registration,
          chassis_number: vehicleData.chassisNumber,
          engine_number: vehicleData.engineNumber,
          initial_mileage: parseInt(vehicleData.initialMileage) || 0,
          current_mileage: parseInt(vehicleData.currentMileage) || 0,
          color: vehicleData.color,
          fuel_level: parseInt(vehicleData.fuelLevel) || 50,
          status: vehicleData.status || 'available',
          registration_doc_url: vehicleData.registrationDocUrl,
          insurance_doc_url: vehicleData.insuranceDocUrl,
          front_image_url: vehicleData.frontImageUrl,
          rear_image_url: vehicleData.rearImageUrl,
          left_side_image_url: vehicleData.leftSideImageUrl,
          right_side_image_url: vehicleData.rightSideImageUrl,
          notes: vehicleData.notes
        }])
        .select();
        
      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Error creating loan vehicle:', error);
      throw error;
    }
  }
  
  static async update(id, vehicleData) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour modifier un véhicule de prêt");
      }
      
      const { data, error } = await supabase
        .from('loan_vehicles')
        .update({
          make: vehicleData.make,
          model: vehicleData.model,
          registration: vehicleData.registration,
          chassis_number: vehicleData.chassisNumber,
          engine_number: vehicleData.engineNumber,
          initial_mileage: parseInt(vehicleData.initialMileage) || 0,
          current_mileage: parseInt(vehicleData.currentMileage) || 0,
          color: vehicleData.color,
          fuel_level: parseInt(vehicleData.fuelLevel) || 50,
          status: vehicleData.status,
          registration_doc_url: vehicleData.registrationDocUrl,
          insurance_doc_url: vehicleData.insuranceDocUrl,
          front_image_url: vehicleData.frontImageUrl,
          rear_image_url: vehicleData.rearImageUrl,
          left_side_image_url: vehicleData.leftSideImageUrl,
          right_side_image_url: vehicleData.rightSideImageUrl,
          notes: vehicleData.notes,
          updated_at: new Date()
        })
        .eq('id', id)
        .eq('user_id', session.user.id)
        .select();
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Véhicule introuvable ou vous n'avez pas les permissions nécessaires");
      }
      
      return data[0];
    } catch (error) {
      console.error('Error updating loan vehicle:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour supprimer un véhicule de prêt");
      }
      
      // Vérifier s'il y a des prêts actifs pour ce véhicule
      const { data: activeLoans, error: loansError } = await supabase
        .from('vehicle_loans')
        .select('id')
        .eq('vehicle_id', id)
        .is('actual_end_date', null);
        
      if (loansError) throw loansError;
      
      if (activeLoans && activeLoans.length > 0) {
        throw new Error("Impossible de supprimer ce véhicule car il est actuellement prêté");
      }
      
      const { error } = await supabase
        .from('loan_vehicles')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting loan vehicle:', error);
      throw error;
    }
  }
  
  static async updateStatus(id, status) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour modifier un véhicule de prêt");
      }
      
      const { data, error } = await supabase
        .from('loan_vehicles')
        .update({
          status: status,
          updated_at: new Date()
        })
        .eq('id', id)
        .eq('user_id', session.user.id)
        .select();
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Véhicule introuvable ou vous n'avez pas les permissions nécessaires");
      }
      
      return data[0];
    } catch (error) {
      console.error('Error updating loan vehicle status:', error);
      throw error;
    }
  }
  
  static async addDamage(vehicleId, damageData) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour ajouter un dommage");
      }
      
      // Vérifier que le véhicule appartient à l'utilisateur
      const { data: vehicleCheck, error: vehicleError } = await supabase
        .from('loan_vehicles')
        .select('id')
        .eq('id', vehicleId)
        .eq('user_id', session.user.id)
        .single();
        
      if (vehicleError) throw vehicleError;
      
      if (!vehicleCheck) {
        throw new Error("Véhicule introuvable ou vous n'avez pas les permissions nécessaires");
      }
      
      const { data, error } = await supabase
        .from('vehicle_damages')
        .insert([{
          vehicle_id: vehicleId,
          loan_id: damageData.loanId,
          body_part: damageData.bodyPart,
          damage_type: damageData.damageType,
          severity: damageData.severity || 'minor',
          description: damageData.description,
          image_url: damageData.imageUrl
        }])
        .select();
        
      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Error adding damage:', error);
      throw error;
    }
  }
  
  static async getDamages(vehicleId) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux dommages");
      }
      
      // Vérifier que le véhicule appartient à l'utilisateur
      const { data: vehicleCheck, error: vehicleError } = await supabase
        .from('loan_vehicles')
        .select('id')
        .eq('id', vehicleId)
        .eq('user_id', session.user.id)
        .single();
        
      if (vehicleError) throw vehicleError;
      
      if (!vehicleCheck) {
        throw new Error("Véhicule introuvable ou vous n'avez pas les permissions nécessaires");
      }
      
      const { data, error } = await supabase
        .from('vehicle_damages')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting damages:', error);
      throw error;
    }
  }
  
  static async getAvailableVehicles() {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux véhicules disponibles");
      }
      
      const { data, error } = await supabase
        .from('loan_vehicles')
        .select('*')
        .eq('status', 'available')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting available vehicles:', error);
      throw error;
    }
  }
}