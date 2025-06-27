import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { sessionManager } from '../lib/session-manager';

const DiagnosticPanel = () => {
  const [results, setResults] = useState({});

  useEffect(() => {
    const runDiagnostic = async () => {
      console.log('\ud83d\udd0d === DIAGNOSTIC COMPLET D\u00c9MARR\u00c9 ===');
      const diagnosticResults = {};

      // Test 1: Variables d'environnement
      diagnosticResults.env = {
        stripe: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'PR\u00c9SENT' : 'MANQUANT',
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'PR\u00c9SENT' : 'MANQUANT',
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'PR\u00c9SENT' : 'MANQUANT',
        mode: import.meta.env.MODE
      };

      // Test 2: Connectivit\u00e9 Supabase basique
      try {
        const startTime = Date.now();
        const { data, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 10s')), 10000))
        ]);
        const duration = Date.now() - startTime;

        diagnosticResults.supabaseAuth = {
          status: error ? 'ERREUR' : 'OK',
          duration: `${duration}ms`,
          error: error?.message || null,
          session: !!data?.session
        };
      } catch (err) {
        diagnosticResults.supabaseAuth = {
          status: 'TIMEOUT/ERREUR',
          error: err.message
        };
      }

      // Test 3: Test API donn\u00e9es
      try {
        const startTime = Date.now();
        const { data, error } = await Promise.race([
          supabase.from('invoices').select('id').limit(1),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 15s')), 15000))
        ]);
        const duration = Date.now() - startTime;

        diagnosticResults.dataAPI = {
          status: error ? 'ERREUR' : 'OK',
          duration: `${duration}ms`,
          error: error?.message || null,
          dataCount: data?.length || 0
        };
      } catch (err) {
        diagnosticResults.dataAPI = {
          status: 'TIMEOUT/ERREUR',
          error: err.message
        };
      }

      // Test 4: SessionManager
      try {
        const sessionValid = sessionManager.isSessionValid();
        const currentSession = sessionManager.getCurrentSession();

        diagnosticResults.sessionManager = {
          isValid: sessionValid,
          hasSession: !!currentSession,
          userEmail: currentSession?.user?.email || 'N/A',
          isInitialized: sessionManager.isInitialized || false
        };
      } catch (err) {
        diagnosticResults.sessionManager = {
          status: 'ERREUR',
          error: err.message
        };
      }

      setResults(diagnosticResults);
      console.log('\ud83d\udd0d R\u00c9SULTATS DIAGNOSTIC:', diagnosticResults);
    };

    runDiagnostic();
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#fff',
      border: '2px solid #333',
      padding: '15px',
      maxWidth: '400px',
      fontSize: '12px',
      zIndex: 9999,
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <h3>\ud83d\udd0d DIAGNOSTIC SYST\u00c8ME</h3>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  );
};

export default DiagnosticPanel;
