import { supabase } from '../lib/supabase';

export class Vehicle {
  static async create(clientId, vehicleData) {
    try {
      // Vérifier d'abord que le client appartient à l'utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour créer un véhicule");
      }
      
      const { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();
        
      if (clientCheckError) throw clientCheckError;
      if (!clientCheck || clientCheck.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à ajouter un véhicule à ce client");
      }
      
      const { data, error } = await supabase
        .from('vehicles')
        .insert([{
          client_id: clientId,
          make: vehicleData.make,
          model: vehicleData.model,
          registration: vehicleData.registration,
          vin: vehicleData.vin,
          year: vehicleData.year,
          mileage: vehicleData.mileage,
          created_at: new Date()
        }])
        .select();
        
      if (error) throw error;
      
      // Return only the ID instead of the entire vehicle object
      return data[0].id;
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }
  
  static async getByClientId(clientId) {
    try {
      // Vérifier d'abord que le client appartient à l'utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux véhicules");
      }
      
      const { data: clientCheck, error: clientCheckError } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();
        
      if (clientCheckError) throw clientCheckError;
      if (!clientCheck || clientCheck.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à accéder aux véhicules de ce client");
      }
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting vehicles:', error);
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
        .from('vehicles')
        .select(`
          *,
          clients!inner(*),
          reports(*)
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting vehicle:', error);
      throw error;
    }
  }
  
  static async update(id, vehicleData) {
    try {
      // Vérifier d'abord que le véhicule appartient à un client de l'utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour modifier un véhicule");
      }
      
      const { data: vehicleCheck, error: vehicleCheckError } = await supabase
        .from('vehicles')
        .select('client_id, clients!inner(user_id)')
        .eq('id', id)
        .single();
        
      if (vehicleCheckError) throw vehicleCheckError;
      if (!vehicleCheck || vehicleCheck.clients.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à modifier ce véhicule");
      }
      
      const { data, error } = await supabase
        .from('vehicles')
        .update({
          make: vehicleData.make,
          model: vehicleData.model,
          registration: vehicleData.registration,
          vin: vehicleData.vin,
          year: vehicleData.year,
          mileage: vehicleData.mileage,
          updated_at: new Date()
        })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      // Vérifier d'abord que le véhicule appartient à un client de l'utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour supprimer un véhicule");
      }
      
      const { data: vehicleCheck, error: vehicleCheckError } = await supabase
        .from('vehicles')
        .select('client_id, clients!inner(user_id)')
        .eq('id', id)
        .single();
        
      if (vehicleCheckError) throw vehicleCheckError;
      if (!vehicleCheck || vehicleCheck.clients.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à supprimer ce véhicule");
      }
      
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  }
}