import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkActionPermission, getUserSubscriptionTier } from '../../lib/subscriptionManager';
import SubscriptionLimitModal from './SubscriptionLimitModal';

// Create context
const SubscriptionContext = createContext(null);

export const SubscriptionProvider = ({ children }) => {
  const navigate = useNavigate();
  const [currentTier, setCurrentTier] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modalConfig, setModalConfig] = useState({
    reason: null,
    details: {},
    upgradePriceId: null
  });
  
  // Load subscription tier on initial render
  useEffect(() => {
    const loadSubscriptionTier = async () => {
      setIsLoading(true);
      try {
        const tier = await getUserSubscriptionTier();
        setCurrentTier(tier);
        setLoadError(null);
      } catch (error) {
        console.error('Error loading subscription tier:', error);
        setLoadError('Failed to load subscription information. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSubscriptionTier();
  }, []);
  
  // Check if an action is allowed based on subscription
  const checkActionAllowed = useCallback(async (actionType) => {
    try {
      const result = await checkActionPermission(actionType);
      
      if (!result.canProceed) {
        setModalConfig({
          reason: result.reason,
          details: {
            currentCount: result.currentCount,
            limit: result.limit,
            feature: result.feature
          },
          upgradePriceId: result.upgrade
        });
        setIsModalOpen(true);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error checking if ${actionType} is allowed:`, error);
      return true; // Default to allowing in case of error
    }
  }, []);
  
  // Function to close modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  
  return (
    <SubscriptionContext.Provider
      value={{
        currentTier,
        checkActionAllowed,
        isLoading,
        loadError
      }}
    >
      {children}
      
      <SubscriptionLimitModal
        isOpen={isModalOpen}
        onClose={closeModal}
        reason={modalConfig.reason}
        details={modalConfig.details}
        upgradePriceId={modalConfig.upgradePriceId}
      />
    </SubscriptionContext.Provider>
  );
};

// Hook for convenient access to the subscription context
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// HOC to protect features that require specific subscription tiers
export const withSubscriptionCheck = (Component, actionType) => {
  return function WrappedComponent(props) {
    const { checkActionAllowed, isLoading, loadError } = useSubscription();
    const navigate = useNavigate();
    const [isAllowed, setIsAllowed] = useState(null);

    const checkAccess = useCallback(async () => {
      const allowed = await checkActionAllowed(actionType);
      setIsAllowed(allowed);

      if (!allowed) {
        // Will show the modal, which is managed by the subscription provider
      }
    }, [checkActionAllowed]);

    useEffect(() => {
      if (!isLoading && !loadError) {
        checkAccess();
      }
    }, [isLoading, loadError, checkAccess]);
    
    if (isLoading || isAllowed === null) {
      // Still checking, show loading state
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
        </div>
      );
    }
    
    if (loadError) {
      // Show error state
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{loadError}</p>
          <button
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
            onClick={checkAccess}
          >
            Reload Page
          </button>
        </div>
      );
    }
    
    if (isAllowed === false) {
      // We're not allowed, but the modal is shown and managed by the context
      // Render null or a placeholder
      return (
        <div className="p-4">
          {/* This will be shown briefly before modal appears */}
          <p className="text-muted-foreground">Vérification de votre abonnement...</p>
        </div>
      );
    }
    
    // Allowed, render the component
    return <Component {...props} />;
  };
};