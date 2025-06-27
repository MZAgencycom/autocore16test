import { supabase } from '../lib/supabase';

export class Cession {
  static async getByClient(clientId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Vous devez être connecté pour accéder aux cessions');
      }

      // Vérifier que le client appartient à l'utilisateur
      const { data: clientCheck, error: clientError } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();
      if (clientError) throw clientError;
      if (!clientCheck || clientCheck.user_id !== session.user.id) {
        throw new Error("Client introuvable ou accès refusé");
      }

      const { data, error } = await supabase
        .from('cession_creances')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting client cessions:', error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Vous devez être connecté pour accéder à cette cession');
      }
      const { data, error } = await supabase
        .from('cession_creances')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting cession:', error);
      throw error;
    }
  }
}

