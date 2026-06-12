/* ════════════════════════════════════════════════════════
   Nagriva — Auth Route Guard (Reusable Module)
   Protects pages from unauthenticated access.
   Prevents Flash of Unauthenticated Content (FOUC).
   Works with the blocking loading overlay in <head>.

   🔐 SECURITY: Session is verified via Supabase `getSession()`
   on every page load BEFORE any protected content is shown.
   ════════════════════════════════════════════════════════ */

'use strict';

var NagrivaAuthGuard = (function() {
  var LOGIN_PAGE = 'login.html';
  var UNAUTHORIZED_PAGE = 'unauthorized.html';

  var AUTH_REQUIRED_PAGES = [
    'dashboard.html',
    'profile.html',
    'settings.html',
    'orders.html',
    'audit-history.html',
    'messages.html',
    'files.html',
    'client-files.html',
    'submit-order.html',
    'order-tracking.html',
    'client-portal.html',
    'onboarding-qa.html',
    'checkout.html',
    'order-success.html'
  ];

  var ADMIN_PAGES = [
    'admin-dashboard.html'
  ];

  function getCurrentPage() {
    return window.location.pathname.split('/').pop();
  }

  function isPublicPage(page) {
    var publicPages = [
      'login.html', 'signup.html', 'forgot-password.html',
      'reset-password.html', 'unauthorized.html', 'index.html', ''
    ];
    return publicPages.indexOf(page) !== -1;
  }

  function isProtectedPage(page) {
    return AUTH_REQUIRED_PAGES.indexOf(page) !== -1;
  }

  function isAdminPage(page) {
    return ADMIN_PAGES.indexOf(page) !== -1;
  }

  function redirectToLogin() {
    var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(LOGIN_PAGE + '?redirect=' + returnUrl);
  }

  function redirectToUnauthorized() {
    window.location.replace(UNAUTHORIZED_PAGE);
  }

  function createShellSkeleton() {
    if (document.getElementById('nagGuardOverlay')) return null;
    var el = document.createElement('div');
    el.id = 'nagGuardOverlay';
    if (window.NAGRIVA_Skeleton && window.NAGRIVA_Skeleton.pageShell) {
      el.innerHTML = window.NAGRIVA_Skeleton.pageShell();
    } else {
      el.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#050505;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;';
      el.innerHTML = '<div style="width:40px;height:40px;border:2px solid rgba(250,204,21,0.1);border-top-color:#FACC15;border-radius:50%;animation:nagGuardSpin .8s linear infinite;"></div><span style="color:#a1a1aa;font-size:.85rem;font-family:\'DM Sans\',sans-serif;">Checking access...</span><style>@keyframes nagGuardSpin{to{transform:rotate(360deg)}}</style>';
    }
    return el;
  }

  function removeOverlay() {
    var el = document.getElementById('nagGuardOverlay');
    if (el) {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s cubic-bezier(0.4,0,0.2,1)';
      setTimeout(function() {
        if (el.parentNode) el.parentNode.removeChild(el);
        document.body.classList.add('nag-authenticated');
      }, 350);
    } else {
      document.body.classList.add('nag-authenticated');
    }
  }

  function showOverlay() {
    if (document.getElementById('nagGuardOverlay')) return;
    var el = createShellSkeleton();
    if (el) {
      document.body.insertBefore(el, document.body.firstChild);
    }
  }

  function logError(context, error) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[AuthGuard] ' + context + ':', error ? (error.message || error) : 'unknown error');
    }
  }

  async function checkAuth() {
    var page = getCurrentPage();

    if (isPublicPage(page)) {
      removeOverlay();
      return { authenticated: false, publicPage: true };
    }

    if (!isProtectedPage(page) && !isAdminPage(page)) {
      removeOverlay();
      return { authenticated: false, unprotectedPage: true };
    }

    if (!window.supabaseClient) {
      logError('Supabase client not initialized');
      showOverlay();
      return { authenticated: false, error: 'Supabase client not initialized' };
    }

    try {
      var { data: { session }, error } = await window.supabaseClient.auth.getSession();

      if (error) {
        logError('getSession error', error);
        showOverlay();
        if (isAdminPage(page)) {
          redirectToUnauthorized();
        } else {
          redirectToLogin();
        }
        return { authenticated: false, error: error };
      }

      if (!session) {
        logError('No session found');
        showOverlay();
        if (isAdminPage(page)) {
          redirectToUnauthorized();
        } else {
          redirectToLogin();
        }
        return { authenticated: false };
      }

      if (isAdminPage(page)) {
        try {
          var { data: profile, error: profileError } = await window.supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profileError || !profile || profile.role !== 'admin') {
            logError('Admin access denied for user ' + session.user.id);
            redirectToUnauthorized();
            return { authenticated: false, authorized: false };
          }
        } catch (profileErr) {
          logError('Profile fetch failed', profileErr);
          redirectToUnauthorized();
          return { authenticated: false, error: profileErr };
        }
      }

      removeOverlay();
      return { authenticated: true, session: session, user: session.user };
    } catch (e) {
      logError('Unexpected error during auth check', e);
      showOverlay();
      if (isAdminPage(page)) {
        redirectToUnauthorized();
      } else {
        redirectToLogin();
      }
      return { authenticated: false, error: e };
    }
  }

  async function logout() {
    try {
      if (window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
      }
    } catch (e) {
      logError('Logout error', e);
    }
    window.location.replace(LOGIN_PAGE);
  }

  return {
    checkAuth: checkAuth,
    logout: logout,
    isProtectedPage: isProtectedPage,
    isAdminPage: isAdminPage
  };
})();

(async function protectPage() {
  var result = await NagrivaAuthGuard.checkAuth();
  if (result && result.publicPage) return;
  if (result && result.unprotectedPage) return;
  if (!result || !result.authenticated) return;
  if (typeof window.__nagOnAuthReady === 'function') {
    try { window.__nagOnAuthReady(result.session, result.user); } catch (e) {}
  }
})();
