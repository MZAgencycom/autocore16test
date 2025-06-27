import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging for environment variables
if (import.meta?.env?.DEV) console.log('Supabase URL:', supabaseUrl);
if (import.meta?.env?.DEV) console.log('Supabase Key exists:', !!supabaseAnonKey);

// More robust validation
const isValidSupabaseUrl = supabaseUrl &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseUrl.includes('supabase.co');

const isValidSupabaseKey = supabaseAnonKey && 
  supabaseAnonKey !== 'your-anon-key' && 
  supabaseAnonKey.length > 50; // JWT tokens are typically longer than 50 characters

if (!isValidSupabaseUrl) {
  console.error('⚠️ Supabase URL not properly configured:', supabaseUrl);
}

if (!isValidSupabaseKey) {
  console.error('⚠️ Supabase Anon Key not properly configured. Key length:', supabaseAnonKey?.length);
}

// Create a single supabase client for interacting with your database
let supabaseClient;
let isUsingMock = false;

if (isValidSupabaseUrl && isValidSupabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'X-Client-Info': 'autocore-ai-webapp'
        }
      }
    });
    if (import.meta?.env?.DEV) console.log('✅ Supabase client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    supabaseClient = createMockClient();
    isUsingMock = true;
  }
} else {
  console.warn('⚠️ Using mock Supabase client due to invalid credentials');
  supabaseClient = createMockClient();
  isUsingMock = true;
}

// Listen for auth state changes but avoid automatic reloads
if (supabaseClient && typeof window !== 'undefined') {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      console.warn('Utilisateur déconnecté.');
    }

    if (event === 'TOKEN_REFRESHED') {
      console.log('Token actualisé.');
      // Pas de reload automatique ici
    }
  });
}

// Create a mock client that provides graceful fallback for development
function createMockClient() {
  console.warn('⚠️ Using mock Supabase client. Database operations will not work.');
  
  const mockError = new Error('Supabase client not properly configured. Please check your environment variables.');
  
  return {
    auth: {
      signInWithPassword: async () => ({
        error: mockError,
        data: { user: null, session: null }
      }),
      signUp: async () => ({
        error: mockError,
        data: { user: null, session: null }
      }),
      signInWithOAuth: async () => ({
        error: mockError,
        data: null
      }),
      getUser: async () => ({
        error: mockError,
        data: { user: null }
      }),
      getSession: async () => ({
        error: mockError,
        data: { session: null }
      }),
      refreshSession: async () => ({
        error: mockError,
        data: { session: null }
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } }
      }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: mockError }),
      updateUser: async () => ({ error: mockError })
    },
    from: (table) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ error: mockError, data: null }),
          maybeSingle: async () => ({ error: mockError, data: null }),
          order: () => ({
            range: async () => ({ error: mockError, data: [] })
          })
        }),
        order: () => ({
          range: async () => ({ error: mockError, data: [] })
        })
      }),
      insert: async () => ({ error: mockError, data: null }),
      update: () => ({
        eq: () => ({ error: mockError, data: null })
      }),
      delete: () => ({
        eq: () => ({ error: mockError, data: null })
      }),
      upsert: async () => ({ error: mockError, data: null })
    }),
    storage: {
      from: () => ({
        upload: async () => ({ error: mockError, data: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'mock-url' } }),
        remove: async () => ({ error: mockError, data: null })
      })
    }
  };
}

// Refresh the session if it has expired before performing critical writes
// VERSION AMÉLIORÉE avec vérification proactive de l'expiration
export async function refreshSessionIfNeeded(client = supabaseClient) {
  if (import.meta?.env?.DEV) console.log('🔄 Checking session validity');
  
  try {
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error) {
      console.error('[Supabase] Erreur lors de la récupération de session:', error);
      throw error;
    }
    
    if (!session) {
      console.warn('[Supabase] Aucune session active');
      return null;
    }
    
    // NOUVEAU - Vérifier si le token est proche de l'expiration
    const expiresAt = session.expires_at * 1000; // Convertir en millisecondes
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    if (import.meta?.env?.DEV) {
      console.log(`[Supabase] Token expire dans ${Math.floor(timeUntilExpiry / 1000 / 60)} minutes`);
    }
    
    // Si moins de 5 minutes avant expiration, rafraîchir
    if (timeUntilExpiry < 5 * 60 * 1000) {
      console.log('[Supabase] Token proche de l\'expiration, rafraîchissement...');
      const { data: { session: newSession }, error: refreshError } = await client.auth.refreshSession();
      
      if (refreshError) {
        console.error('[Supabase] Erreur lors du rafraîchissement:', refreshError);
        throw refreshError;
      }
      
      console.log('[Supabase] Session rafraîchie avec succès');
      return newSession;
    }
    
    return session;
  } catch (err) {
    console.error('[Supabase] Failed to refresh session:', err);
    throw err;
  }
}

// Legacy alias kept for backward compatibility
export const refreshSessionIfExpired = refreshSessionIfNeeded;

// Export as both named and default export for compatibility
export const supabase = supabaseClient;
export const usingMockSupabase = isUsingMock;
export default supabaseClient;
