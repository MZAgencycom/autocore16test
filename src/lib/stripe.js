import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from './stripeClient';

let stripePromise;
export const getStripe = async () => {
  if (!stripePromise) {
    try {
      stripePromise = await loadStripe(
        import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
      );
    } catch (e) {
      console.warn('⚠️ Stripe bloqué (Adblock ?)');
      stripePromise = null;
    }
  }
  return stripePromise;
};

/**
 * Récupère l’instance Stripe ou la charge si nécessaire
 */
export const getStripe = async () => {
  if (!stripePromise) {
    try {
      stripePromise = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
    } catch (e) {
      console.warn('⚠️ Stripe bloqué (Adblock ?)');
      stripePromise = null;
    }
  }
  return stripePromise;
};

/**
 * Redirige vers Stripe Checkout avec le priceId donné
 */
export const redirectToCheckout = async (priceId, mode = 'subscription') => {
  try {
    const { url } = await createCheckoutSession(priceId, mode);

    if (url) {
      window.location.href = url;
    } else {
      throw new Error('Échec de création de session Stripe');
    }
  } catch (error) {
    console.error('Erreur redirection checkout :', error);
    throw error;
  }
}
};
