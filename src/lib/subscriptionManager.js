import { supabase } from './supabase';
import { getProductByPriceId } from '../stripe-config';
import { createCheckoutSession } from './stripeClient';

// Constants for subscription limits
export const SUBSCRIPTION_LIMITS = {
  // Trial users get Pro features with limits
  trial: {
    reportsLimit: 10,
    invoicesLimit: 10,
    hasAssistant: true,
    hasLoanVehicles: true,
    name: 'Essai gratuit',
    description: '7 jours gratuits'
  },
  // Starter plan
  starter: {
    reportsLimit: 10,
    invoicesLimit: 15,
    hasAssistant: false,
    hasLoanVehicles: false,
    name: 'Starter',
    price: '29€/mois'
  },
  // Pro plan
  pro: {
    reportsLimit: 50,
    invoicesLimit: Infinity,
    hasAssistant: true,
    hasLoanVehicles: true,
    name: 'Pro',
    price: '79€/mois'
  },
  // Enterprise plan
  enterprise: {
    reportsLimit: Infinity,
    invoicesLimit: Infinity,
    hasAssistant: true,
    hasLoanVehicles: true,
    name: 'Enterprise',
    price: '199€/mois'
  }
};

// Price IDs for upgrade links
export const UPGRADE_PRICE_IDS = {
  starter: "price_1RQxKMDhvHX38AogFdD6mseD", // Starter plan
  pro: "price_1RQxMWDhvHX38AogRq5vtcHR",     // Pro plan
  enterprise: "price_1RQxOCDhvHX38Aoghn4UB3Wu" // Enterprise plan
};

// Trial duration in days
const TRIAL_DURATION_DAYS = 7;

/**
 * Get the current user's subscription information
 * @returns The subscription object or null
 */
export const getUserSubscription = async () => {
  try {
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return null;
    }
    
    if (!session) {
      if (import.meta?.env?.DEV) console.log('No active session found');
      return null;
    }

    // Get subscription info from view
    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error.message || error);
    // Return null instead of throwing to prevent app crashes
    return null;
  }
};

/**
 * Get the current user's subscription tier
 * @returns {Promise<string>} The subscription tier (trial, starter, pro, enterprise)
 */
export const getUserSubscriptionTier = async () => {
  try {
    const subscription = await getUserSubscription();
    
    // If no subscription or it's not active, check if user is in trial period
    if (!subscription || !isSubscriptionActive(subscription)) {
      const isInTrial = await checkTrialPeriod();
      return isInTrial ? 'trial' : null;
    }

    // Get the product from price_id to determine tier
    const product = getProductByPriceId(subscription.price_id);
    
    if (!product) return null;
    
    // Map product name to tier
    if (product.name.toLowerCase().includes('starter')) {
      return 'starter';
    } else if (product.name.toLowerCase().includes('pro')) {
      return 'pro';
    } else if (product.name.toLowerCase().includes('enterprise')) {
      return 'enterprise';
    }
    
    // Default to null if no matching tier
    return null;
  } catch (error) {
    console.error('Error determining subscription tier:', error.message || error);
    return null;
  }
};

/**
 * Check if user is within the trial period
 * @returns {Promise<boolean>} True if user is in trial period
 */
export const checkTrialPeriod = async () => {
  try {
    // Get user creation date
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error during trial check:', sessionError);
      return false;
    }
    
    if (!session) {
      if (import.meta?.env?.DEV) console.log('No active session found during trial check');
      return false;
    }
    
    // Use the creation date directly from the session instead of admin API
    const createdAt = new Date(session.user.created_at);
    const now = new Date();
    
    // Check if user has an active subscription
    const subscription = await getUserSubscription();
    
    // If user has an active subscription, they're not in trial
    if (subscription && isSubscriptionActive(subscription)) {
      return false;
    }
    
    // Calculate days since creation
    const diffTime = Math.abs(now - createdAt);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= TRIAL_DURATION_DAYS;
  } catch (error) {
    console.error('Error checking trial period:', error.message || error);
    return false;
  }
};

/**
 * Check if a subscription is active
 * @param {Object} subscription The subscription object
 * @returns {boolean} True if subscription is active
 */
export const isSubscriptionActive = (subscription) => {
  if (!subscription) return false;
  
  return ['active', 'trialing'].includes(subscription.subscription_status);
};

/**
 * Get the days remaining in the trial period
 * @returns {Promise<number>} Days remaining in trial
 */
export const getTrialDaysRemaining = async () => {
  try {
    // Get user creation date
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error during trial days check:', sessionError);
      return 0;
    }
    
    if (!session) {
      if (import.meta?.env?.DEV) console.log('No active session found during trial days check');
      return 0;
    }
    
    const createdAt = new Date(session.user.created_at);
    const now = new Date();
    
    // Calculate days since creation
    const diffTime = Math.abs(now - createdAt);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, TRIAL_DURATION_DAYS - diffDays);
  } catch (error) {
    console.error('Error calculating trial days remaining:', error.message || error);
    return 0;
  }
};

/**
 * Count the total number of reports and invoices for the current user
 * @returns {Promise<Object>} Counts of reports and invoices
 */
export const getUserUsageCounts = async () => {
  try {
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error during usage count check:', sessionError);
      return { reportsCount: 0, invoicesCount: 0 };
    }
    
    if (!session) {
      console.warn("No active session found, returning zero counts");
      return { reportsCount: 0, invoicesCount: 0 };
    }
    
    // Get client IDs for the current user
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', session.user.id);
      
    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
      return { reportsCount: 0, invoicesCount: 0 };
    }
    
    // If no clients found, return zero counts
    if (!clientsData || clientsData.length === 0) {
      if (import.meta?.env?.DEV) console.log("No clients found for user, returning zero counts");
      return { reportsCount: 0, invoicesCount: 0 };
    }
    
    // Extract client IDs
    const clientIds = clientsData.map(client => client.id);
    
    // Count reports
    const { count: reportsCount, error: reportsError } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clientIds);
      
    if (reportsError) {
      console.error("Error counting reports:", reportsError);
      return { reportsCount: 0, invoicesCount: clientsData.length > 0 ? 0 : null };
    }
    
    // Count invoices
    const { count: invoicesCount, error: invoicesError } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clientIds);
      
    if (invoicesError) {
      console.error("Error counting invoices:", invoicesError);
      return { reportsCount: reportsCount || 0, invoicesCount: 0 };
    }
    
    if (import.meta?.env?.DEV) console.log(`User usage: ${reportsCount} reports, ${invoicesCount} invoices`);
    return { 
      reportsCount: reportsCount || 0, 
      invoicesCount: invoicesCount || 0 
    };
  } catch (error) {
    console.error('Error getting usage counts:', error.message || error);
    return { reportsCount: 0, invoicesCount: 0 };
  }
};

/**
 * Get the current usage limits based on subscription tier
 * @returns {Promise<Object>} The usage limits
 */
export const getUserLimits = async () => {
  try {
    const tier = await getUserSubscriptionTier();
    
    if (!tier) {
      // No subscription or trial, redirect to pricing
      return SUBSCRIPTION_LIMITS.trial;
    }
    
    return SUBSCRIPTION_LIMITS[tier];
  } catch (error) {
    console.error('Error getting user limits:', error.message || error);
    // Default to trial limits if error
    return SUBSCRIPTION_LIMITS.trial;
  }
};

/**
 * Check if the user can perform an action based on their subscription
 * @param {string} actionType The type of action ('report', 'invoice', 'assistant', 'loan_vehicles')
 * @returns {Promise<Object>} Object with canProceed flag and upgrade info
 */
export const checkActionPermission = async (actionType) => {
  try {
    const tier = await getUserSubscriptionTier();
    
    // No subscription or trial, redirect to pricing
    if (!tier) {
      return {
        canProceed: false,
        reason: 'no_subscription',
        upgrade: UPGRADE_PRICE_IDS.pro
      };
    }
    
    const limits = SUBSCRIPTION_LIMITS[tier];
    const counts = await getUserUsageCounts();
    
    if (actionType === 'report') {
      // Check if report limit reached
      if (counts.reportsCount >= limits.reportsLimit) {
        return {
          canProceed: false,
          reason: 'report_limit',
          currentCount: counts.reportsCount,
          limit: limits.reportsLimit,
          upgrade: tier === 'starter' ? UPGRADE_PRICE_IDS.pro : UPGRADE_PRICE_IDS.enterprise
        };
      }
    } else if (actionType === 'invoice') {
      // Check if invoice limit reached
      if (counts.invoicesCount >= limits.invoicesLimit) {
        return {
          canProceed: false,
          reason: 'invoice_limit',
          currentCount: counts.invoicesCount,
          limit: limits.invoicesLimit,
          upgrade: tier === 'starter' ? UPGRADE_PRICE_IDS.pro : UPGRADE_PRICE_IDS.enterprise
        };
      }
    } else if (actionType === 'assistant') {
      // Check if assistant is available
      if (!limits.hasAssistant) {
        return {
          canProceed: false,
          reason: 'feature_not_available',
          feature: 'assistant',
          upgrade: UPGRADE_PRICE_IDS.pro
        };
      }
    } else if (actionType === 'loan_vehicles') {
      // Check if loan vehicles module is available
      if (!limits.hasLoanVehicles) {
        return {
          canProceed: false,
          reason: 'feature_not_available',
          feature: 'loan_vehicles',
          upgrade: UPGRADE_PRICE_IDS.pro
        };
      }
    }
    
    // Action is permitted
    return { 
      canProceed: true,
      currentCounts: counts,
      limits
    };
  } catch (error) {
    console.error(`Error checking permission for ${actionType}:`, error.message || error);
    return { canProceed: true }; // Fallback to allowing action in case of error
  }
};

/**
 * Redirect to Stripe checkout for upgrade
 * @param {string} priceId The price ID for the plan to upgrade to
 * @returns {Promise<void>}
 */
export const redirectToUpgrade = async (priceId) => {
  try {
    const { url } = await createCheckoutSession(priceId, 'subscription');
    
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (error) {
    console.error('Error redirecting to upgrade:', error.message || error);
    throw error;
  }
};

/**
 * Get remaining quotas for dashboard display
 * @returns {Promise<Object>} Remaining quotas and limits
 */
export const getRemainingQuotas = async () => {
  try {
    const tier = await getUserSubscriptionTier();
    if (!tier) return null;
    
    const limits = SUBSCRIPTION_LIMITS[tier];
    const counts = await getUserUsageCounts();
    
    return {
      tier,
      reports: {
        used: counts.reportsCount,
        total: limits.reportsLimit,
        remaining: limits.reportsLimit === Infinity ? 'Illimité' : Math.max(0, limits.reportsLimit - counts.reportsCount),
        percentage: limits.reportsLimit === Infinity ? 0 : Math.min(100, Math.round((counts.reportsCount / limits.reportsLimit) * 100)),
        isUnlimited: limits.reportsLimit === Infinity
      },
      invoices: {
        used: counts.invoicesCount,
        total: limits.invoicesLimit,
        remaining: limits.invoicesLimit === Infinity ? 'Illimité' : Math.max(0, limits.invoicesLimit - counts.invoicesCount),
        percentage: limits.invoicesLimit === Infinity ? 0 : Math.min(100, Math.round((counts.invoicesCount / limits.invoicesLimit) * 100)),
        isUnlimited: limits.invoicesLimit === Infinity
      },
      hasAssistant: limits.hasAssistant,
      hasLoanVehicles: limits.hasLoanVehicles,
      daysRemaining: tier === 'trial' ? await getTrialDaysRemaining() : null
    };
  } catch (error) {
    console.error('Error getting remaining quotas:', error.message || error);
    return null;
  }
};