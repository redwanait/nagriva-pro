/* ════════════════════════════════════════════════════════
   NAGRIVA — Admin Authentication Helpers
   Reusable vanilla JS helpers for route protection,
   role verification, and secure session handling.

   🔐 SECURITY: Role is verified against `public.profiles`
   on every check. Supabase RLS enforces access control
   at the database level — non-admin queries are rejected
   regardless of client-side logic.
   ════════════════════════════════════════════════════════ */

'use strict';

const NagrivaAdminAuth = (() => {
  /* ─── Cache to avoid redundant Supabase queries ─── */
  let _cachedUser = null;
  let _cachedProfile = null;
  let _cachedRole = null;
  let _lastFetch = 0;
  var CACHE_TTL = 30000;

  function invalidateCache() {
    _cachedUser = null;
    _cachedProfile = null;
    _cachedRole = null;
    _lastFetch = 0;
  }

  /* ─── Get current Supabase user ─── */
  async function getCurrentUser(forceRefresh) {
    if (!forceRefresh && _cachedUser && Date.now() - _lastFetch < CACHE_TTL) {
      return _cachedUser;
    }
    try {
      var { data: { user } } = await window.supabaseClient.auth.getUser();
      _cachedUser = user || null;
      _lastFetch = Date.now();
      return _cachedUser;
    } catch (_) {
      return null;
    }
  }

  /* ─── Get full profile from `profiles` table ─── */
  async function getProfile(userId, forceRefresh) {
    if (!userId) return null;
    if (!forceRefresh && _cachedProfile && _cachedProfile.id === userId && Date.now() - _lastFetch < CACHE_TTL) {
      return _cachedProfile;
    }
    try {
      var { data, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) return null;
      _cachedProfile = data;
      _cachedRole = data && data.role || null;
      _lastFetch = Date.now();
      return data;
    } catch (_) {
      return null;
    }
  }

  /* ─── Get current user's role: 'admin', 'client', or null ─── */
  async function getCurrentUserRole(forceRefresh) {
    if (!forceRefresh && _cachedRole && Date.now() - _lastFetch < CACHE_TTL) {
      return _cachedRole;
    }
    var user = await getCurrentUser(forceRefresh);
    if (!user) return null;
    var profile = await getProfile(user.id, forceRefresh);
    return profile && profile.role || null;
  }

  /* ─── Returns true if current user is admin ─── */
  async function isAdmin(forceRefresh) {
    var role = await getCurrentUserRole(forceRefresh);
    return role === 'admin';
  }

  /* ─── Redirects non-admin users. Returns {user, profile} if admin. ─── */
  async function requireAdmin() {
    var user = await getCurrentUser();
    if (!user) {
      var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = '/pages/login.html?redirect=' + returnUrl;
      return null;
    }

    var profile = await getProfile(user.id);
    if (!profile || profile.role !== 'admin') {
      window.location.href = '/pages/unauthorized.html';
      return null;
    }

    return { user: user, profile: profile };
  }

  /* ─── Loading overlay ─── */
  function showAuthLoading(container) {
    var target = container || document.body;
    var overlay = document.createElement('div');
    overlay.className = 'admin-auth-loading';
    overlay.id = 'adminAuthLoading';
    overlay.innerHTML =
      '<div class="admin-auth-loading-spinner">' +
        '<div class="admin-auth-spinner-ring"></div>' +
        '<span>Verifying access...</span>' +
      '</div>';
    target.appendChild(overlay);
    return overlay;
  }

  function hideAuthLoading() {
    var el = document.getElementById('adminAuthLoading');
    if (el) el.remove();
  }

  /* ─── Fallback UI for unauthorized users ─── */
  function showUnauthorized(container, title, message, buttonText, buttonUrl) {
    title = title || 'Access Denied';
    message = message || 'You do not have permission to access this area.';
    buttonText = buttonText || 'Go to Dashboard';
    buttonUrl = buttonUrl || '/pages/dashboard.html';

    var target = container || document.body;
    target.innerHTML =
      '<div class="admin-unauthorized">' +
        '<div class="admin-unauthorized-card">' +
          '<div class="admin-unauthorized-icon">🔒</div>' +
          '<h2 class="admin-unauthorized-title">' + title + '</h2>' +
          '<p class="admin-unauthorized-message">' + message + '</p>' +
          '<a href="' + buttonUrl + '" class="admin-unauthorized-btn">' +
            buttonText +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</a>' +
        '</div>' +
      '</div>';
  }

  /* ─── Full admin page guard: loading → check → redirect or fallback ─── */
  async function guardAdminPage(options) {
    options = options || {};
    var container = options.container || null;
    var fallback = options.fallback || false;

    showAuthLoading(container);

    try {
      var user = await getCurrentUser();
      if (!user) {
        hideAuthLoading();
        if (fallback) {
          showUnauthorized(container,
            'Authentication Required',
            'Please sign in to access this page.',
            'Sign In',
            '/pages/login.html?redirect=' + encodeURIComponent(window.location.pathname)
          );
          return false;
        }
        var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = '/pages/login.html?redirect=' + returnUrl;
        return false;
      }

      var profile = await getProfile(user.id);
      if (!profile || profile.role !== 'admin') {
        hideAuthLoading();
        if (fallback) {
          showUnauthorized(container,
            'Admin Access Only',
            'You need administrator privileges to access this area.',
            'Go Home',
            '/pages/unauthorized.html'
          );
          return false;
        }
        window.location.href = '/pages/unauthorized.html';
        return false;
      }

      hideAuthLoading();
      return { user: user, profile: profile };
    } catch (_) {
      hideAuthLoading();
      if (fallback) {
        showUnauthorized(container,
          'Error',
          'An error occurred while verifying your access. Please try again.',
          'Go Home',
          '/index.html'
        );
        return false;
      }
      window.location.href = '/pages/login.html';
      return false;
    }
  }

  /* ─── Keep cache in sync with auth state ─── */
  function initAuthListener() {
    window.supabaseClient.auth.onAuthStateChange(function(event) {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        invalidateCache();
      }
    });
  }

  /* ─── Public API ─── */
  return {
    getCurrentUser: getCurrentUser,
    getProfile: getProfile,
    getCurrentUserRole: getCurrentUserRole,
    isAdmin: isAdmin,
    requireAdmin: requireAdmin,
    guardAdminPage: guardAdminPage,
    showAuthLoading: showAuthLoading,
    hideAuthLoading: hideAuthLoading,
    showUnauthorized: showUnauthorized,
    invalidateCache: invalidateCache,
    initAuthListener: initAuthListener
  };
})();

NagrivaAdminAuth.initAuthListener();
