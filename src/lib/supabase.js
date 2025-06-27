import supabaseClient, { refreshSessionIfNeeded } from './supabaseClient.js';

// Re-export as both default and named export for compatibility
export const supabase = supabaseClient;
export { refreshSessionIfNeeded };
export default supabaseClient;
