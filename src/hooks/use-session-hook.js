// hooks/useSession.js
import { useState, useEffect, useCallback } from 'react';
import { sessionManager } from '../lib/sessionManager';
import { toast } from 'react-hot-toast';

export function useSession() {
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Écouter les événements de session
    const unsubscribe = sessionManager.addListener((event, data) => {
      switch (event) {
        case 'refreshed':
          setIsSessionValid(true);
          setIsRefreshing(false);
          break;
        case 'error':
          setIsSessionValid(false);
          setIsRefreshing(false);
          if (data?.message?.includes('reconnecter')) {
            toast.error('Session expirée. Veuillez vous reconnecter.');
          }
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
      
      // Utiliser le wrapper du sessionManager
      const result = await sessionManager.withValidSession(operation);
      
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
      await sessionManager.refreshSession();
      setIsSessionValid(true);
      toast.success('Session rafraîchie');
    } catch (error) {
      setIsSessionValid(false);
      toast.error('Impossible de rafraîchir la session');
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    isSessionValid,
    isRefreshing,
    executeWithValidSession,
    refreshSession
  };
}