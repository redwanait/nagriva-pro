/* ════════════════════════════════════════════════════════
   NAGRIVA — Auth Route Guard
   Protects pages from unauthenticated access.
   Include this on any page that requires login.
   Also handles admin-role protection.
   ════════════════════════════════════════════════════════ */

'use strict';

(async function protectPage() {
  /* Don't guard public/auth pages */
  var currentPage = window.location.pathname.split('/').pop();
  var publicPages = ['login.html', 'signup.html', 'forgot-password.html', 'reset-password.html', 'index.html', ''];
  if (publicPages.indexOf(currentPage) !== -1) return;

  try {
    var { data: { session } } = await window.supabaseClient.auth.getSession();

    if (!session) {
      var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = 'login.html?redirect=' + returnUrl;
      return;
    }

    /* Check admin-only pages */
    var adminPages = ['admin-dashboard.html'];

    if (adminPages.indexOf(currentPage) !== -1) {
      var { data: profile, error } = await window.supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || !profile || profile.role !== 'admin') {
        window.location.href = 'dashboard.html';
      }
    }
  } catch (e) {
    var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = 'login.html?redirect=' + returnUrl;
  }
})();
