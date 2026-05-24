/* ════════════════════════════════════════════════════════
   NAGRIVA — Auth Route Guard
   Protects pages from unauthenticated access.
   Include on any page that requires login.
   Admin-only pages also verify role against public.profiles.

   🔐 SECURITY: Role is verified by querying `profiles`
   directly. Even if client code is bypassed, Supabase
   RLS blocks non-admin database operations.
   ════════════════════════════════════════════════════════ */

'use strict';

(async function protectPage() {
  var currentPage = window.location.pathname.split('/').pop();
  var publicPages = ['login.html', 'signup.html', 'forgot-password.html', 'reset-password.html', 'index.html', ''];
  if (publicPages.indexOf(currentPage) !== -1) return;

  var adminPages = ['admin-dashboard.html'];

  var authRequiredPages = [
    'dashboard.html',
    'profile.html',
    'settings.html',
    'notifications.html',
    'submit-order.html',
    'order-tracking.html',
    'client-portal.html'
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

  /* ─── Graceful fallback for unauthorized access ─── */
  function showUnauthorizedFallback() {
    removeLoading();
    var title = isAdminPage ? 'Admin Access Only' : 'Authentication Required';
    var message = isAdminPage
      ? 'You need administrator privileges to access this area.'
      : 'Please sign in to access this page.';
    var btnText = isAdminPage ? 'Go to Dashboard' : 'Sign In';
    var btnUrl = isAdminPage
      ? 'dashboard.html'
      : 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);

    document.body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:32px;background:#040404;">' +
        '<div style="max-width:420px;width:100%;text-align:center;">' +
          '<div style="font-size:3rem;margin-bottom:20px;">🔒</div>' +
          '<h1 style="font-family:\'Syne\',sans-serif;font-size:1.5rem;font-weight:700;color:#fff;margin-bottom:8px;">' + title + '</h1>' +
          '<p style="color:#a1a1aa;font-size:0.9rem;margin-bottom:28px;line-height:1.6;">' + message + '</p>' +
          '<a href="' + btnUrl + '" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:10px;background:#00f5c4;color:#040404;font-weight:600;font-size:0.85rem;text-decoration:none;">' +
            btnText +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</a>' +
        '</div>' +
      '</div>';
  }

  try {
    var { data: { session } } = await window.supabaseClient.auth.getSession();

    if (!session) {
      removeLoading();
      if (isAdminPage) {
        showUnauthorizedFallback();
        return;
      }
      var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = 'login.html?redirect=' + returnUrl;
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
        showUnauthorizedFallback();
        return;
      }
    }

    removeLoading();
  } catch (e) {
    removeLoading();
    if (isAdminPage) {
      showUnauthorizedFallback();
      return;
    }
    var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = 'login.html?redirect=' + returnUrl;
  }
})();
