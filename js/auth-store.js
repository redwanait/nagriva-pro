/* ════════════════════════════════════════════════════════
   Nagriva — Centralized Auth State Store
   Observable state manager for authentication.
   Drives all auth flows: email/password, Google OAuth,
   session persistence, loading/error states, and logout.
   ════════════════════════════════════════════════════════ */

'use strict';

const NagrivaAuthStore = (() => {
  let _state = {
    user: null,
    session: null,
    loading: true,
    error: null,
    initialized: false
  };

  const _listeners = [];

  /* ─── Public state accessors ─── */
  function getState() {
    return { ..._state };
  }

  function getUser() {
    return _state.user;
  }

  function getSession() {
    return _state.session;
  }

  function isLoading() {
    return _state.loading;
  }

  function isAuthenticated() {
    return !!_state.user;
  }

  /* ─── Observer pattern ─── */
  function subscribe(fn) {
    _listeners.push(fn);
    return function unsubscribe() {
      var idx = _listeners.indexOf(fn);
      if (idx !== -1) _listeners.splice(idx, 1);
    };
  }

  function _notify() {
    var snapshot = getState();
    _listeners.forEach(function(fn) {
      try { fn(snapshot); } catch (e) {
        console.warn('[AuthStore] listener error:', e);
      }
    });
  }

  function _setState(partial) {
    Object.assign(_state, partial);
    _notify();
  }

  /* ─── Init: restore session + listen for changes ─── */
  async function init() {
    console.log('[DEBUG AuthStore] init() called');
    _setState({ loading: true });
    try {
      var { data: { session } } = await window.supabaseClient.auth.getSession();
      console.log('[DEBUG AuthStore] init getSession result:', session ? 'session exists (user: ' + session.user.id + ')' : 'no session');
      _setState({
        session: session,
        user: session?.user ?? null,
        loading: false,
        initialized: true
      });
    } catch (err) {
      console.log('[DEBUG AuthStore] init getSession error:', err.message || err);
      _setState({ loading: false, error: err, initialized: true });
    }

    window.supabaseClient.auth.onAuthStateChange(function(event, session) {
      console.log('[DEBUG AuthStore] onAuthStateChange event:', event, 'session:', session ? session.user.id : null);
      _setState({
        session: session,
        user: session?.user ?? null,
        loading: false,
        initialized: true
      });
    });
  }

  /* ─── Sign In (Email/Password) ─── */
  async function signIn(email, password) {
    console.log('[DEBUG AuthStore] signIn called');
    _setState({ loading: true, error: null });
    try {
      var { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });
      if (error) {
        console.log('[DEBUG AuthStore] signIn error:', error.message || error);
        _setState({ loading: false, error: error });
        return { error: error };
      }
      console.log('[DEBUG AuthStore] signIn success. session:', data.session ? 'EXISTS' : 'NULL');
      _setState({
        loading: false,
        session: data.session,
        user: data.session?.user ?? null
      });
      return { data: data };
    } catch (err) {
      console.log('[DEBUG AuthStore] signIn exception:', err.message || err);
      _setState({ loading: false, error: err });
      return { error: err };
    }
  }

  /* ─── Sign Up ─── */
  async function signUp(email, password, options) {
    console.log('[DEBUG AuthStore] signUp called, options.emailRedirectTo:', options?.emailRedirectTo || 'NONE');
    _setState({ loading: true, error: null });
    try {
      var { data, error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: options || {}
      });
      if (error) {
        console.log('[DEBUG AuthStore] signUp error:', error.message || error);
        _setState({ loading: false, error: error });
        return { error: error };
      }
      var nextUser = data.session?.user ?? data.user ?? null;
      console.log('[DEBUG AuthStore] signUp success. session:', data.session ? 'EXISTS' : 'NULL', 'user:', nextUser?.id);
      console.log('[DEBUG AuthStore] signUp data.user:', data.user?.id, 'data.session?.user?.id:', data.session?.user?.id);
      _setState({
        loading: false,
        session: data.session,
        user: nextUser
      });
      return { data: data };
    } catch (err) {
      console.log('[DEBUG AuthStore] signUp exception:', err.message || err);
      _setState({ loading: false, error: err });
      return { error: err };
    }
  }

  /* ─── Google OAuth ─── */
  async function signInWithGoogle(redirectTo) {
    _setState({ loading: true, error: null });
    try {
      var { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo || window.location.origin + '/pages/dashboard.html'
        }
      });
      if (error) {
        _setState({ loading: false, error: error });
        return { error: error };
      }
      return {};
    } catch (err) {
      _setState({ loading: false, error: err });
      return { error: err };
    }
  }

  /* ─── Sign Out ─── */
  async function signOut() {
    try {
      await window.supabaseClient.auth.signOut();
    } catch (_) {}
    _setState({ session: null, user: null, loading: false, error: null });
  }

  /* ─── Forgot Password ─── */
  async function resetPassword(email) {
    _setState({ loading: true, error: null });
    try {
      var redirectTo = window.location.origin + '/pages/reset-password.html';
      var { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo
      });
      _setState({ loading: false });
      if (error) {
        _setState({ error: error });
        return { error: error };
      }
      return {};
    } catch (err) {
      _setState({ loading: false, error: err });
      return { error: err };
    }
  }

  /* ─── Public API ─── */
  return {
    init: init,
    getState: getState,
    getUser: getUser,
    getSession: getSession,
    isLoading: isLoading,
    isAuthenticated: isAuthenticated,
    subscribe: subscribe,
    signIn: signIn,
    signUp: signUp,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    resetPassword: resetPassword
  };
})();

window.NagrivaAuthStore = NagrivaAuthStore;

/* ─── Auto-init on load ─── */
if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
  NagrivaAuthStore.init();
}
