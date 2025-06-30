// === DEBUG REACT - IMPORTS UNIQUES ===
console.log('=== 🔍 DÉMARRAGE APP DEBUG ===');

import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'

console.log('✅ React importé:', !!React);
console.log('✅ useEffect importé:', !!useEffect);
console.log('✅ useState importé:', !!useState);
console.log('✅ Routes importé:', !!Routes);

// Vérification critique
if (!React) {
  console.error('❌ REACT EST NULL !');
}
if (!useEffect) {
  console.error('❌ useEffect EST NULL !');
}

// === IMPORTS NORMAUX (une seule fois chacun) ===
import ErrorBoundary from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
import OnboardingPage from './pages/OnboardingPage'
import AuthCallback from './pages/AuthCallback'
import PricingPage from './pages/PricingPage'
import CheckoutSuccessPage from './pages/CheckoutSuccessPage'
import CheckoutCancelPage from './pages/CheckoutCancelPage'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import { useAuth } from './contexts/AuthContext'
import AssistantButton from './components/AssistantButton'
import SubscriptionBanner from './components/SubscriptionBanner'
import supabase, { usingMockSupabase } from './lib/supabaseClient'
import { sessionManager } from './lib/session-manager'
import TermsPage from './pages/legal/terms'
import PrivacyPage from './pages/legal/privacy'
import LegalNoticePage from './pages/legal/legal-notice'
import CookiesPage from './pages/legal/cookies'
import { Toaster, toast } from 'react-hot-toast'
import LoadingFallback from './components/LoadingFallback'
const CessionSignPage = lazy(() => import('./pages/cessions/CessionSignPage'))
import ForceRefresh from './pages/ForceRefresh'

// === DEBUG VARIABLES D'ENVIRONNEMENT ===
console.log('=== 🔍 VARIABLES DEBUG ===');
console.log('Mode:', import.meta.env.MODE);
console.log('Stripe Key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'PRÉSENT' : 'MANQUANT');
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'PRÉSENT' : 'MANQUANT');
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'PRÉSENT' : 'MANQUANT');

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { checkSession } = useAuth()

  // Log uniquement lors du retour sur l'onglet actif
  useEffect(() => {
    const handleTabFocus = () => {
      if (document.visibilityState === 'visible') {
        console.log('✅ Session OK, rien à faire en revenant sur l\'onglet');
      }
    };

    document.addEventListener('visibilitychange', handleTabFocus);
    return () => document.removeEventListener('visibilitychange', handleTabFocus);
  }, []);

  console.log('🚀 App component rendu');

  // Initialisation SessionManager
  useEffect(() => {
    if (usingMockSupabase || !supabase) {
      console.warn('[App] Mock Supabase détecté, SessionManager désactivé');
      memoizedCheckSession();
      return;
    }

    const initializeSession = async () => {
      try {
        console.log('[App] Initialisation du SessionManager...');
        await sessionManager.initialize();
        console.log('[App] SessionManager initialisé avec succès');
      } catch (error) {
        console.error('[App] Erreur d\'initialisation du SessionManager:', error);
      } finally {
        memoizedCheckSession();
      }
    };

    initializeSession();

    const unsubscribe = sessionManager.addListener((event, data) => {
      console.log('[App] Événement SessionManager:', event);
      
      switch (event) {
        case 'session_refreshed':
          console.log('[App] Session rafraîchie automatiquement');
          break;
        case 'session_expired':
          console.log('[App] Session expirée');
          toast.error("Votre session a expiré. Veuillez vous reconnecter.");
          if (!['/login', '/force-refresh'].includes(location.pathname)) {
            navigate('/force-refresh');
          }
          break;
        case 'session_verified':
          console.log('[App] Session vérifiée après retour d\'onglet');
          break;
        default:
          break;
      }
    });
    
    return () => {
      unsubscribe();
      sessionManager.cleanup();
    };
  }, [navigate, location.pathname]);

  // Check session initial
  const memoizedCheckSession = useCallback(() => {
    if (usingMockSupabase || !supabase) {
      console.error('Supabase client not initialized - skipping session check');
      return;
    }
    checkSession();
  }, [checkSession]);
  


  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  // Determine page types
  const isAssistantPage = location.pathname.includes('/dashboard/assistant');
  const isPublicPage = !location.pathname.includes('/dashboard');
  const isCheckoutPage = location.pathname.includes('/checkout');


  
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="force-refresh" element={<ForceRefresh />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="checkout/cancel" element={<CheckoutCancelPage />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="onboarding" element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } />
          <Route path="dashboard/*" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <DashboardPage />
                </Suspense>
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route
            path="signature/cession/:token"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <CessionSignPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route path="legal/terms" element={<TermsPage />} />
          <Route path="legal/privacy" element={<PrivacyPage />} />
          <Route path="legal/legal-notice" element={<LegalNoticePage />} />
          <Route path="legal/cookies" element={<CookiesPage />} />
        </Route>
      </Routes>
      
      {/* Floating Assistant Button */}
      {!isAssistantPage && !isPublicPage && <AssistantButton />}
      
      {/* Subscription Banner */}
      {!isPublicPage && !isCheckoutPage && <SubscriptionBanner />}
    </>
  );
}

export default App;
