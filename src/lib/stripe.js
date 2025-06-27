import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from './stripeClient';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * Redirects to Stripe Checkout for the specified product
 * @param {string} priceId - The Stripe Price ID
 * @param {string} mode - 'subscription' or 'payment'
 * @returns {Promise<void>} - Redirects to Stripe Checkout
 */
export async function redirectToCheckout(priceId, mode = 'subscription') {
  try {
    // Create a checkout session using our Edge Function
    const { url } = await createCheckoutSession(
      priceId,
      mode
    );

    // Redirect to Stripe Checkout
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('Failed to create checkout session');
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
}

export { stripePromise };
