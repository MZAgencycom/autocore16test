// lib/session-manager.js - VERSION OPTIMISÉE CONNECTIVITÉ
import { supabase } from './supabase';

class SessionManager {
  constructor() {
    if (SessionManager.instance) {
      return SessionManager.instance;
    }
    
    SessionManager.instance = this;
    
    this.refreshTimer = null;
    this.isRefreshing = false;
    this.isInitialized = false;
    this.initializationPromise = null;
    this.currentSession = null;
    this.listeners = new Set();

    this.handleVisibilityChange = this._handleVisibilityChange.bind(this);
    
    // Configuration optimisée pour connectivité difficile
    this.REFRESH_MARGIN = 15 * 60 * 1000; // 15 min avant expiration (très conservateur)
    this.MIN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min minimum entre tentatives
    this.CHECK_INTERVAL = 10 * 60 * 1000; // Vérifier toutes les 10 minutes (très espacé)
    this.SESSION_TIMEOUT = 60 * 1000; // 60 secondes de timeout (plus long)
    this.MAX_RETRIES = 2; // Maximum 2 tentatives
    this.RETRY_DELAY = 5000; // 5 secondes entre retry
    
    this.lastRefreshTime = 0;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 2;
    this.isInErrorState = false;
    this.connectionQuality = 'unknown';
    
    console.log('[SessionManager] 🔧 VERSION OPTIMISÉE - Connectivité difficile');
  }

  // Test de connectivité avec retry et timeout adaptatif
  async _advancedConnectivityTest() {
    const tests = [
      { name: 'Quick test', timeout: 5000 },
      { name: 'Medium test', timeout: 15000 },
      { name: 'Long test', timeout: 30000 }
    ];

    for (const test of tests) {
      try {
        console.log(`[SessionManager] 🔍 ${test.name}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), test.timeout);
        
        const startTime = Date.now();
        const { data, error } = await supabase.auth.getSession();
        const duration = Date.now() - startTime;
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.warn(`[SessionManager] ⚠️ ${test.name} - Erreur:`, error.message);
          continue; // Essayer le test suivant
        }
        
        // Évaluer la qualité de connexion
        if (duration < 2000) {
          this.connectionQuality = 'good';
        } else if (duration < 5000) {
          this.connectionQuality = 'medium';
        } else {
          this.connectionQuality = 'slow';
        }
        
        console.log(`[SessionManager] ✅ ${test.name} réussi (${duration}ms) - Qualité: ${this.connectionQuality}`);
        return true;
        
      } catch (error) {
        console.warn(`[SessionManager] ❌ ${test.name} échoué:`, error.message);
        // Continuer avec le test suivant
      }
    }
    
    console.error('[SessionManager] ❌ Tous les tests de connectivité ont échoué');
    this.connectionQuality = 'poor';
    return false;
  }

  // Initialisation avec gestion de connectivité difficile
  async initialize() {
    if (this.isInitialized) {
      console.log('[SessionManager] ✅ Déjà initialisé');
      return true;
    }

    if (this.initializationPromise) {
      console.log('[SessionManager] ⏳ Initialisation en cours...');
      return this.initializationPromise;
    }

    this.initializationPromise = this._performOptimizedInitialization();
    return this.initializationPromise;
  }

  async _performOptimizedInitialization() {
    try {
      console.log('[SessionManager] 🚀 Initialisation optimisée...');
      
      // Test de connectivité avancé
      const isConnected = await this._advancedConnectivityTest();
      if (!isConnected) {
        console.error('[SessionManager] ❌ Aucune connectivité, mode minimal');
        this.isInErrorState = true;
        this.isInitialized = true;
        return false;
      }
      
      // Adapter les timeouts selon la qualité de connexion
      this._adaptTimeoutsToConnection();
      
      // Charger la session avec retry
      await this._loadSessionWithRetry();
      
      // Démarrer le timer adaptatif
      this._startAdaptiveTimer();
      
      this.isInitialized = true;
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      console.log('[SessionManager] ✅ Initialisation optimisée terminée');
      return true;
      
    } catch (error) {
      console.error('[SessionManager] ❌ Erreur d\'initialisation optimisée:', error);
      this.isInErrorState = true;
      this.isInitialized = true;
      return false;
    } finally {
      this.initializationPromise = null;
    }
  }

  // Adapter les timeouts selon la qualité de connexion
  _adaptTimeoutsToConnection() {
    switch (this.connectionQuality) {
      case 'good':
        this.SESSION_TIMEOUT = 30 * 1000; // 30s
        this.CHECK_INTERVAL = 5 * 60 * 1000; // 5 min
        break;
      case 'medium':
        this.SESSION_TIMEOUT = 60 * 1000; // 60s
        this.CHECK_INTERVAL = 10 * 60 * 1000; // 10 min
        break;
      case 'slow':
        this.SESSION_TIMEOUT = 90 * 1000; // 90s
        this.CHECK_INTERVAL = 15 * 60 * 1000; // 15 min
        break;
      case 'poor':
        this.SESSION_TIMEOUT = 120 * 1000; // 2 min
        this.CHECK_INTERVAL = 20 * 60 * 1000; // 20 min
        break;
    }
    
    console.log(`[SessionManager] ⚙️ Timeouts adaptés - Qualité: ${this.connectionQuality}, Timeout: ${this.SESSION_TIMEOUT/1000}s`);
  }

  // Chargement de session avec retry intelligent
  async _loadSessionWithRetry() {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`[SessionManager] 📥 Tentative ${attempt}/${this.MAX_RETRIES} de chargement...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.SESSION_TIMEOUT);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        clearTimeout(timeoutId);
        
        if (error) {
          throw error;
        }
        
        this.currentSession = session;
        this.consecutiveErrors = 0;
        
        if (session) {
          console.log('[SessionManager] 🟢 Session chargée:', session.user?.email);
        } else {
          console.log('[SessionManager] 🟡 Aucune session');
        }
        
        return session;
        
      } catch (error) {
        console.error(`[SessionManager] ❌ Tentative ${attempt} échouée:`, error.message);
        
        if (attempt < this.MAX_RETRIES) {
          console.log(`[SessionManager] ⏳ Attente ${this.RETRY_DELAY/1000}s avant retry...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        } else {
          console.error('[SessionManager] ❌ Toutes les tentatives de chargement échouées');
          this.consecutiveErrors++;
        }
      }
    }
    
    return null;
  }

  // Timer adaptatif selon la qualité de connexion
  _startAdaptiveTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    console.log(`[SessionManager] ⏰ Timer adaptatif démarré (${this.CHECK_INTERVAL/60000} min)`);
    
    this.refreshTimer = setInterval(() => {
      // Ne rien faire si en erreur, pas de session, ou en cours de rafraîchissement
      if (this.isInErrorState || !this.currentSession || this.isRefreshing) {
        return;
      }
      
      // Vérification adaptative
      this._adaptiveSessionCheck();
      
    }, this.CHECK_INTERVAL);
  }

  // Vérification de session adaptative
  async _adaptiveSessionCheck() {
    try {
      const now = Date.now();
      const expiresAt = this.currentSession.expires_at * 1000;
      const timeUntilExpiry = expiresAt - now;
      
      console.log(`[SessionManager] ⏱️ Session expire dans ${Math.round(timeUntilExpiry / 60000)} min`);
      
      // Adapter la marge de rafraîchissement selon la qualité de connexion
      let adaptiveMargin = this.REFRESH_MARGIN;
      if (this.connectionQuality === 'slow' || this.connectionQuality === 'poor') {
        adaptiveMargin = 20 * 60 * 1000; // 20 min pour connexions lentes
      }
      
      // Rafraîchir seulement si vraiment nécessaire
      if (timeUntilExpiry < adaptiveMargin) {
        console.log('[SessionManager] 🔄 Rafraîchissement adaptatif nécessaire');
        await this._adaptiveRefresh();
      }
      
    } catch (error) {
      console.error('[SessionManager] Erreur de vérification adaptative:', error);
      this.consecutiveErrors++;
      
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error('[SessionManager] 🛑 Trop d\'erreurs, mode dégradé activé');
        this.isInErrorState = true;
        this._stopTimer();
      }
    }
  }

  // Rafraîchissement adaptatif avec retry
  async _adaptiveRefresh() {
    if (this.isRefreshing) {
      console.log('[SessionManager] ⏸️ Rafraîchissement déjà en cours');
      return;
    }

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        this.isRefreshing = true;
        
        console.log(`[SessionManager] 🔄 Rafraîchissement adaptatif ${attempt}/${this.MAX_RETRIES}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.SESSION_TIMEOUT);
        
        const { data: { session }, error } = await supabase.auth.refreshSession();
        clearTimeout(timeoutId);
        
        if (error) {
          throw error;
        }
        
        if (session) {
          this.currentSession = session;
          this.consecutiveErrors = 0;
          console.log('[SessionManager] ✅ Session rafraîchie avec succès');
          this.notifyListeners('session_refreshed', session);
          return session;
        }
        
      } catch (error) {
        console.error(`[SessionManager] ❌ Rafraîchissement ${attempt} échoué:`, error.message);
        
        if (attempt < this.MAX_RETRIES) {
          console.log(`[SessionManager] ⏳ Retry dans ${this.RETRY_DELAY/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        } else {
          this.consecutiveErrors++;
        }
      } finally {
        if (attempt === this.MAX_RETRIES) {
          this.isRefreshing = false;
        }
      }
    }
  }

  // Arrêter le timer
  _stopTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('[SessionManager] Timer arrêté');
    }
  }

  // Méthodes publiques
  getCurrentSession() {
    return this.currentSession;
  }

  isSessionValid() {
    if (!this.currentSession) return false;
    const now = Date.now();
    const expiresAt = this.currentSession.expires_at * 1000;
    return expiresAt > now;
  }

  // Wrapper optimisé pour opérations
  async withValidSession(operation) {
    if (this.isInErrorState) {
      console.warn('[SessionManager] ⚠️ Mode dégradé - opération à risque');
      // Ne pas bloquer complètement, mais avertir
    }

    try {
      if (!this.isSessionValid() && !this.isRefreshing) {
        console.log('[SessionManager] Session invalide, rafraîchissement adaptatif...');
        await this._adaptiveRefresh();
      }
      
      if (!this.currentSession) {
        throw new Error('Aucune session disponible');
      }
      
      return await operation(this.currentSession);
      
    } catch (error) {
      console.error('[SessionManager] Erreur dans withValidSession:', error);
      throw error;
    }
  }

  // Diagnostic de connectivité
  async diagnoseConnectivity() {
    console.log('[SessionManager] 🔍 === DIAGNOSTIC DE CONNECTIVITÉ ===');
    
    const startTime = Date.now();
    const isConnected = await this._advancedConnectivityTest();
    const totalTime = Date.now() - startTime;
    
    console.log('[SessionManager] 📊 Résultats du diagnostic:');
    console.log(`- Connectivité: ${isConnected ? '✅ OK' : '❌ ÉCHOUE'}`);
    console.log(`- Qualité: ${this.connectionQuality}`);
    console.log(`- Temps total: ${totalTime}ms`);
    console.log(`- Erreurs consécutives: ${this.consecutiveErrors}`);
    console.log(`- État d'erreur: ${this.isInErrorState ? '❌ OUI' : '✅ NON'}`);
    
    return {
      connected: isConnected,
      quality: this.connectionQuality,
      totalTime,
      consecutiveErrors: this.consecutiveErrors,
      errorState: this.isInErrorState
    };
  }

  // Reset du mode dégradé
  async resetDegradedMode() {
    console.log('[SessionManager] 🔄 Reset du mode dégradé...');
    this.isInErrorState = false;
    this.consecutiveErrors = 0;
    
    // Re-tester la connectivité
    await this._advancedConnectivityTest();
    this._adaptTimeoutsToConnection();
    
    // Redémarrer le timer si nécessaire
    if (!this.refreshTimer && this.currentSession) {
      this._startAdaptiveTimer();
    }
    
    console.log('[SessionManager] ✅ Mode dégradé reseté');
  }

  // Gestion des écouteurs
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('[SessionManager] Erreur dans écouteur:', error);
      }
    });
  }

  _handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          this.currentSession = null;
          this.notifyListeners('session_expired');
        } else {
          this.currentSession = session;
          this.notifyListeners('session_verified', session);
        }
      }).catch((error) => {
        console.error('[SessionManager] Erreur vérification visibilité:', error);
      });
    }
  }

  // Nettoyage
  cleanup() {
    console.log('[SessionManager] 🧹 Nettoyage optimisé');
    this._stopTimer();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.listeners.clear();
    this.isInitialized = false;
    this.isInErrorState = false;
    this.initializationPromise = null;
  }

  // MÉTHODES DE COMPATIBILITÉ
  startAutoRefresh() { return this.initialize(); }
  stopAutoRefresh() { return this.cleanup(); }
  async refreshSession() { return this._adaptiveRefresh(); }
  async forceRefresh() { return this._adaptiveRefresh(); }
  async refreshIfNeeded() { return this._adaptiveSessionCheck(); }
}

SessionManager.instance = null;
export const sessionManager = new SessionManager();
export default sessionManager;
