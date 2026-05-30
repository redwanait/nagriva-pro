/* ════════════════════════════════════════════════════════
   NAGRIVA — Auth Route Guard
   Protects pages from unauthenticated and unauthorized access.
   Admin-only pages redirect to /pages/unauthorized.html.

   🔐 SECURITY: Role is verified by querying `profiles`
   directly from Supabase on every page load.
   ════════════════════════════════════════════════════════ */

'use strict';

(async function protectPage() {
  var currentPage = window.location.pathname.split('/').pop();
  var publicPages = ['login.html', 'signup.html', 'forgot-password.html', 'reset-password.html', 'unauthorized.html', 'index.html', ''];
  if (publicPages.indexOf(currentPage) !== -1) return;

  /* ─── Pages that require any authenticated session ─── */
  var authRequiredPages = [
    'dashboard.html',
    'profile.html',
    'settings.html',
    'notifications.html',
    'submit-order.html',
    'order-tracking.html',
    'client-portal.html',
    'client-files.html',
    'onboarding-qa.html'
  ];

  /* ─── Pages that require admin role ─── */
  var adminPages = [
    'admin-dashboard.html'
  ];

  var isAdminPage = adminPages.indexOf(currentPage) !== -1;
  var isAuthRequired = authRequiredPages.indexOf(currentPage) !== -1 || isAdminPage;
  if (!isAuthRequired) return;

  /* ─── Loading overlay ─── */
  var loadingOverlay = (function() {
    var el = document.createElement('div');
    el.id = 'authGuardLoading';
    el.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(4,4,4,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;transition:opacity 0.3s ease;';
    el.innerHTML = '<div style="width:40px;height:40px;border:2px solid rgba(0,245,196,0.1);border-top-color:#00f5c4;border-radius:50%;animation:agSpin 0.8s linear infinite;"></div><span style="color:#a1a1aa;font-size:0.85rem;font-family:\'DM Sans\',sans-serif;">Checking access...</span><style>@keyframes agSpin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(el);
    return el;
  })();

  function removeLoading() {
    if (loadingOverlay && loadingOverlay.parentNode) {
      loadingOverlay.style.opacity = '0';
      setTimeout(function() {
        if (loadingOverlay && loadingOverlay.parentNode) {
          loadingOverlay.parentNode.removeChild(loadingOverlay);
        }
      }, 300);
    }
  }

  function redirectToUnauthorized() {
    removeLoading();
    window.location.href = 'unauthorized.html';
  }

  function redirectToLogin() {
    removeLoading();
    var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = 'login.html?redirect=' + returnUrl;
  }

  try {
    var { data: { session } } = await window.supabaseClient.auth.getSession();

    if (!session) {
      removeLoading();
      if (isAdminPage) {
        redirectToUnauthorized();
        return;
      }
      redirectToLogin();
      return;
    }

    /* ─── Admin-only page: verify role in profiles table ─── */
    if (isAdminPage) {
      var { data: profile, error } = await window.supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || !profile || profile.role !== 'admin') {
        removeLoading();
        redirectToUnauthorized();
        return;
      }
    }

    removeLoading();
  } catch (e) {
    removeLoading();
    if (isAdminPage) {
      redirectToUnauthorized();
      return;
    }
    redirectToLogin();
  }
})();
