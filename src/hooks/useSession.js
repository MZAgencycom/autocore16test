// hooks/useSession.js
import { useState, useEffect, useCallback } from 'react';
import { sessionManager } from '../lib/session-manager'; // ⚠️ CHANGEZ LE CHEMIN SI NÉCESSAIRE
import { toast } from 'react-hot-toast';

export function useSession() {
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);

  useEffect(() => {
    // Charger la session actuelle
    setCurrentSession(sessionManager.getCurrentSession());
    setIsSessionValid(sessionManager.isSessionValid());

    // Écouter les événements du NOUVEAU SessionManager
    const unsubscribe = sessionManager.addListener((event, data) => {
      console.log('[useSession] Événement reçu:', event);
      
      switch (event) {
        case 'session_refreshed':
          setIsSessionValid(true);
          setIsRefreshing(false);
          setCurrentSession(data);
          console.log('[useSession] Session rafraîchie automatiquement');
          break;
          
        case 'session_verified':
          setIsSessionValid(true);
          setIsRefreshing(false);
          setCurrentSession(data);
          console.log('[useSession] Session vérifiée après retour d\'onglet');
          break;
          
        case 'session_expired':
          setIsSessionValid(false);
          setIsRefreshing(false);
          setCurrentSession(null);
          toast.error('Session expirée. Veuillez vous reconnecter.');
          console.log('[useSession] Session expirée');
          break;
          
        default:
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Fonction pour exécuter une opération avec session valide
  const executeWithValidSession = useCallback(async (operation, options = {}) => {
    const { 
      showLoadingToast = false,
      loadingMessage = 'Opération en cours...',
      successMessage = 'Opération réussie',
      errorMessage = 'Une erreur est survenue'
    } = options;

    let toastId;
    
    try {
      if (showLoadingToast) {
        toastId = toast.loading(loadingMessage);
      }
      
      setIsRefreshing(true);
      
      // Utiliser le wrapper du NOUVEAU sessionManager
      const result = await sessionManager.withValidSession(async (validSession) => {
        // Passer la session à l'opération si elle en a besoin
        return await operation(validSession);
      });
      
      if (showLoadingToast && toastId) {
        toast.success(successMessage, { id: toastId });
      }
      
      return result;
      
    } catch (error) {
      console.error('[useSession] Erreur:', error);
      
      if (showLoadingToast && toastId) {
        toast.error(error.message || errorMessage, { id: toastId });
      }
      
      throw error;
      
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Rafraîchir manuellement la session
  const refreshSession = useCallback(async () => {
    try {
      setIsRefreshing(true);
      // Utiliser forceRefresh au lieu de refreshSession
      const newSession = await sessionManager.forceRefresh();
      setCurrentSession(newSession);
      setIsSessionValid(true);
      toast.success('Session rafraîchie');
      return newSession;
    } catch (error) {
      setIsSessionValid(false);
      setCurrentSession(null);
      toast.error('Impossible de rafraîchir la session');
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    // États existants (compatibilité)
    isSessionValid,
    isRefreshing,
    
    // Nouvelles données
    currentSession,
    user: currentSession?.user || null,
    
    // Méthodes existantes (compatibilité)
    executeWithValidSession,
    refreshSession
  };
}
