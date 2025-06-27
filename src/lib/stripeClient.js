import { supabase } from './supabase';

// Function to create a checkout session
export async function createCheckoutSession(priceId, mode) {
  try {
    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Vous devez être connecté pour effectuer un achat');
    }
    
    // Get the Supabase URL and anon key from environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error('Configuration Supabase manquante');
    }
    
    // Prepare the success and cancel URLs
    const origin = window.location.origin;
    const successUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/checkout/cancel`;
    
    // Call the Supabase Edge Function to create a checkout session
    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        price_id: priceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        mode: mode
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la création de la session de paiement');
    }
    
    const { url, sessionId } = await response.json();
    
    return { url, sessionId };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error(error.message || 'Erreur lors de la création de la session de paiement');
  }
}

// Function to get the current user's subscription
export async function getUserSubscription() {
  try {
    // Add error handling for uninitialized Supabase client
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }
    
    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .maybeSingle();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
}

// Function to get the current user's orders
export async function getUserOrders() {
  try {
    // Add error handling for uninitialized Supabase client
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }
    
    const { data, error } = await supabase
      .from('stripe_user_orders')
      .select('*')
      .order('order_date', { ascending: false });
    
    if (error) {
      console.error('Stripe order fetch error:', error);
      throw error;
    }
    
    if (import.meta?.env?.DEV) console.log("Fetched orders data:", data);
    return data;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return [];
  }
}

// Function to check if a subscription is active
export function isSubscriptionActive(subscription) {
  if (!subscription) return false;
  
  return ['active', 'trialing'].includes(subscription.subscription_status);
}