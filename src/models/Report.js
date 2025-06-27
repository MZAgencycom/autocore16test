import { supabase } from '../lib/supabase';

export class Report {
  static async create(reportData) {
    try {
      // Get authenticated user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour importer un rapport");
      }

      // Vérifier que le client appartient à l'utilisateur actuel
      const { data: clientData, error: clientCheckError } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', reportData.clientId)
        .single();
        
      if (clientCheckError) throw clientCheckError;
      if (!clientData || clientData.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à créer un rapport pour ce client");
      }

      // Vérifier que le véhicule appartient au client et donc à l'utilisateur actuel
      const { data: vehicleData, error: vehicleCheckError } = await supabase
        .from('vehicles')
        .select('client_id')
        .eq('id', reportData.vehicleId)
        .single();
        
      if (vehicleCheckError) throw vehicleCheckError;
      if (!vehicleData || vehicleData.client_id !== reportData.clientId) {
        throw new Error("Vous n'êtes pas autorisé à créer un rapport pour ce véhicule");
      }

      const { data, error } = await supabase
        .from('reports')
        .insert([{
          client_id: reportData.clientId,
          vehicle_id: reportData.vehicleId,
          file_url: reportData.fileUrl,
          file_name: reportData.fileName,
          status: reportData.status || 'pending',
          extracted_data: reportData.extractedData,
          parts_count: reportData.partsCount,
          labor_hours: reportData.laborHours,
          created_at: new Date()
        }])
        .select();
        
      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  }
  
  static async getAll(filter = null) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder aux rapports");
      }
      
      let query = supabase
        .from('reports')
        .select(`
          *,
          clients(*),
          vehicles(*)
        `)
        .order('created_at', { ascending: false });
        
      if (filter === 'analyzed') {
        query = query.eq('status', 'analyzed');
      } else if (filter === 'pending') {
        query = query.eq('status', 'pending');
      }
      
      const { data, error } = await query;
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting reports:', error);
      throw error;
    }
  }
  
  static async getById(id) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour accéder à ce rapport");
      }
      
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          clients(*),
          vehicles(*)
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error getting report:', error);
      throw error;
    }
  }
  
  static async updateStatus(id, status) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour modifier un rapport");
      }

      // Vérifier que le rapport appartient à un client de l'utilisateur
      const { data: reportCheck, error: checkError } = await supabase
        .from('reports')
        .select('client_id, clients!inner(user_id)')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;
      if (!reportCheck || reportCheck.clients.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à modifier ce rapport");
      }
      
      const { data, error } = await supabase
        .from('reports')
        .update({
          status: status,
          updated_at: new Date()
        })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating report status:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      // Verify session exists first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour supprimer un rapport");
      }

      // Vérifier que le rapport appartient à un client de l'utilisateur
      const { data: reportCheck, error: checkError } = await supabase
        .from('reports')
        .select('client_id, clients!inner(user_id)')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;
      if (!reportCheck || reportCheck.clients.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à supprimer ce rapport");
      }
      
      // Supprimer le fichier du stockage d'abord
      const { data: report } = await supabase
        .from('reports')
        .select('file_url')
        .eq('id', id)
        .single();
        
      if (report && report.file_url) {
        const filePath = report.file_url.split('/').pop();
        const { error: storageError } = await supabase
          .storage
          .from('reports')
          .remove([filePath]);
          
        if (storageError) console.error('Error removing report file:', storageError);
      }
      
      // Ensuite supprimer l'enregistrement
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }

  // Obtenir des statistiques sur les rapports
  static async getStatistics() {
    try {
      // Vérifier qu'on a un utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Utilisateur non connecté");
      }

      // Nombre total de rapports de l'utilisateur
      const { count: totalCount, error: countError } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .in('client_id', supabase.from('clients').select('id').eq('user_id', session.user.id));
        
      if (countError) throw countError;

      // Nombre de rapports analysés de l'utilisateur
      const { count: analyzedCount, error: analyzedError } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'analyzed')
        .in('client_id', supabase.from('clients').select('id').eq('user_id', session.user.id));
        
      if (analyzedError) throw analyzedError;

      // Nombre de rapports en attente de l'utilisateur
      const { count: pendingCount, error: pendingError } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .in('client_id', supabase.from('clients').select('id').eq('user_id', session.user.id));
        
      if (pendingError) throw pendingError;
      
      // Rapports par mois (pour les statistiques)
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('reports')
        .select('created_at')
        .in('client_id', supabase.from('clients').select('id').eq('user_id', session.user.id))
        .order('created_at', { ascending: false });
        
      if (monthlyError) throw monthlyError;
      
      // Transformer les données pour les statistiques mensuelles
      const monthlyStats = {};
      
      if (monthlyData) {
        monthlyData.forEach(report => {
          const date = new Date(report.created_at);
          const monthYear = `${date.getFullYear()}-${date.getMonth()+1}`;
          
          if (!monthlyStats[monthYear]) {
            monthlyStats[monthYear] = 0;
          }
          
          monthlyStats[monthYear] += 1;
        });
      }

      return {
        total: totalCount || 0,
        analyzed: analyzedCount || 0,
        pending: pendingCount || 0,
        monthly: monthlyStats
      };
    } catch (error) {
      console.error('Error getting report statistics:', error);
      throw error;
    }
  }
}