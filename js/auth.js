/* ════════════════════════════════════════════════════════
   Nagriva — Authentication UI Layer
   Manages form binding, password strength, navbar auth UI,
   OAuth buttons, and admin/dev link visibility.
   Delegates all state to NagrivaAuthStore.
   ════════════════════════════════════════════════════════ */

'use strict';

const NagrivaAuth = (() => {
  /* ─── Helpers ─── */
  function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2) || 'U';
  }

  function getDisplayName(user) {
    if (!user) return 'User';
    return user.user_metadata?.full_name || user.email?.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }) || 'User';
  }

  function getAvatarUrl(user) {
    if (!user) return null;
    if (user.user_metadata?.avatar_url) return user.user_metadata.avatar_url;
    return null;
  }

  /* ─── Error Messages ─── */
  const AUTH_ERRORS = {
    'invalid_credentials': 'Invalid email or password. Please try again.',
    'Invalid login credentials': 'Invalid email or password. Please try again.',
    'Email not confirmed': 'Please confirm your email address before signing in. Check your inbox.',
    'email_not_confirmed': 'Please confirm your email address before signing in. Check your inbox.',
    'user_already_exists': 'An account with this email already exists. Try signing in instead.',
    'User already registered': 'An account with this email already exists. Try signing in instead.',
    'weak_password': 'Password is too weak. Use at least 6 characters with a mix of letters and numbers.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
    'invalid_email': 'Please enter a valid email address.',
    'Unable to validate email address: invalid format': 'Please enter a valid email address.',
    'rate_limit': 'Too many attempts. Please wait a moment before trying again.',
    'Too many requests': 'Too many attempts. Please wait a moment before trying again.',
    'network_error': 'Network error. Please check your connection and try again.',
    'Email link is invalid or has expired': 'This reset link is invalid or has expired. Please request a new one.'
  };

  function getAuthErrorMessage(error) {
    if (!error) return 'An unexpected error occurred. Please try again.';
    var message = error.message || error.error_description || error.toString();
    for (var key in AUTH_ERRORS) {
      if (message.toLowerCase().includes(key.toLowerCase())) return AUTH_ERRORS[key];
    }
    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
      return 'Network error. Please check your connection.';
    }
    return message.charAt(0).toUpperCase() + message.slice(1);
  }

  function showError(msgEl, message) {
    if (!msgEl) return;
    msgEl.innerHTML = '';
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', '16'); s.setAttribute('height', '16');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
    msgEl.appendChild(s);
    msgEl.appendChild(document.createTextNode(' ' + message));
    msgEl.className = 'auth-message error show';
  }

  function showSuccess(msgEl, message) {
    if (!msgEl) return;
    msgEl.innerHTML = '';
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', '16'); s.setAttribute('height', '16');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
    msgEl.appendChild(s);
    msgEl.appendChild(document.createTextNode(' ' + message));
    msgEl.className = 'auth-message success show';
  }

  function hideMessage(msgEl) {
    if (msgEl) msgEl.className = 'auth-message';
  }

  /* ─── Send Welcome Email ─── */
  async function sendWelcomeEmail(opts) {
    try {
      var fullName = opts.name || opts.user?.user_metadata?.full_name || opts.email;
      var firstName = fullName.split(' ')[0];
      await window.supabaseClient.functions.invoke('send-email', {
        body: {
          type: 'welcome',
          user_id: opts.user.id,
          email: opts.email,
          full_name: fullName,
          first_name: firstName
        }
      });
    } catch (e) {
      console.warn('[Auth] sendWelcomeEmail error:', e);
    }
  }

  /* ════════════════════════════════════════════
     NAVBAR UI
     ════════════════════════════════════════════ */

  function updateNavbarUI(user) {
    var getStartedBtn = document.getElementById('getStartedBtn');
    var mobileGetStartedBtn = document.getElementById('mobileGetStartedBtn');
    var navUser = document.getElementById('navUser');
    var navAvatar = document.getElementById('navAvatar');
    var navAvatarInitials = document.getElementById('navAvatarInitials');
    var navAvatarImg = document.getElementById('navAvatarImg');
    var navDropdownName = document.getElementById('navDropdownName');
    var navDropdownEmail = document.getElementById('navDropdownEmail');
    var mobileMenuUser = document.getElementById('mobileMenuUser');
    var mobileMenuUserName = document.getElementById('mobileMenuUserName');
    var mobileMenuUserEmail = document.getElementById('mobileMenuUserEmail');

    if (user) {
      if (getStartedBtn) getStartedBtn.style.display = 'none';
      if (mobileGetStartedBtn) mobileGetStartedBtn.style.display = 'none';

      if (navUser) navUser.style.display = '';
      var name = getDisplayName(user);
      var avatarUrl = getAvatarUrl(user);

      if (navAvatarInitials) navAvatarInitials.textContent = getInitials(name);
      if (navDropdownName) navDropdownName.textContent = name;
      if (navDropdownEmail) navDropdownEmail.textContent = user.email || '';

      console.log('[DEBUG auth] updateNavbarUI — user:', user?.id, '| name:', name, '| avatarUrl:', avatarUrl, '| navUser elem:', !!navUser, '| navAvatarImg elem:', !!navAvatarImg, '| navAvatarInitials elem:', !!navAvatarInitials);
      if (navAvatarImg) {
        if (avatarUrl) {
          navAvatarImg.src = avatarUrl;
          navAvatarImg.style.display = 'block';
          if (navAvatarInitials) navAvatarInitials.style.display = 'none';
          console.log('[DEBUG auth] avatar — showing img, hiding initials');
        } else {
          navAvatarImg.style.display = 'none';
          if (navAvatarInitials) navAvatarInitials.style.display = '';
          console.log('[DEBUG auth] avatar — hiding img, showing initials');
        }
      } else {
        console.log('[DEBUG auth] avatar — navAvatarImg element NOT FOUND in DOM');
      }

      if (mobileMenuUser) mobileMenuUser.style.display = '';
      if (mobileMenuUserName) mobileMenuUserName.textContent = name;
      if (mobileMenuUserEmail) mobileMenuUserEmail.textContent = user.email || '';

      updateAdminLinkVisibility(user);
      updatePlanUI();
    } else {
      if (getStartedBtn) getStartedBtn.style.display = '';
      if (mobileGetStartedBtn) mobileGetStartedBtn.style.display = '';
      if (navUser) navUser.style.display = 'none';
      if (mobileMenuUser) mobileMenuUser.style.display = 'none';
    }
  }

  /* ─── Avatar Dropdown ─── */
  function initDropdown() {
    var avatar = document.getElementById('navAvatar');
    var dropdown = document.getElementById('navDropdown');
    if (!avatar || !dropdown) return;

    avatar.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = dropdown.classList.contains('show');
      dropdown.classList.toggle('show');
      avatar.setAttribute('aria-expanded', !isOpen);
    });

    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target) && !avatar.contains(e.target)) {
        dropdown.classList.remove('show');
        avatar.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        dropdown.classList.remove('show');
        avatar.setAttribute('aria-expanded', 'false');
      }
    });

    var handleLogout = function(e) {
      if (dropdown) {
        dropdown.classList.remove('show');
        if (avatar) avatar.setAttribute('aria-expanded', 'false');
      }
      if (!window.NagrivaAuthStore) { window.location.href = '/pages/login.html'; return; }
      NagrivaAuthStore.signOut().then(function() {
        window.location.href = '/pages/login.html';
      });
    };

    document.querySelectorAll('[data-action="logout"], [data-action="logout-mobile"]').forEach(function(item) {
      item.addEventListener('click', handleLogout);
    });
  }

  /* ─── Plan UI ─── */
  function updatePlanUI(planData) {
    var isPro = planData ? planData.isPro : (window.NagrivaPlanManager && window.NagrivaPlanManager.isPro());

    /* Desktop: swap "Join Nagriva Pro" button with "Pro Member" badge */
    var proBtn = document.getElementById('proBtn');
    var proMemberBtn = document.getElementById('proMemberBtn');
    if (proBtn && proMemberBtn) {
      if (isPro) {
        proBtn.style.display = 'none';
        proMemberBtn.style.display = 'inline-flex';
      } else {
        proBtn.style.display = '';
        proMemberBtn.style.display = 'none';
      }
    }

    /* Avatar plan badge */
    var avatarBadge = document.getElementById('navAvatarBadge');
    if (avatarBadge) {
      avatarBadge.style.display = 'inline-flex';
      if (isPro) {
        avatarBadge.className = 'nav-avatar-badge nav-avatar-badge-pro';
        avatarBadge.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M3 20h18"/></svg> PRO';
      } else {
        avatarBadge.className = 'nav-avatar-badge nav-avatar-badge-free';
        avatarBadge.textContent = 'FREE';
      }
    }

    /* Dropdown Pro badge */
    var navProBadge = document.getElementById('navProBadge');
    if (navProBadge) {
      navProBadge.style.display = isPro ? 'inline-flex' : 'none';
    }

    /* Dropdown Free badge */
    var navFreeBadge = document.getElementById('navFreeBadge');
    if (navFreeBadge) {
      navFreeBadge.style.display = isPro ? 'none' : 'inline-flex';
    }

    /* Mobile: swap "Join Nagriva Pro" with "Pro Member" badge */
    var mobileProBtn = document.getElementById('mobileProBtn');
    var mobileProBadge = document.getElementById('mobileProBadge');
    if (mobileProBtn && mobileProBadge) {
      if (isPro) {
        mobileProBtn.style.display = 'none';
        mobileProBadge.style.display = 'inline-flex';
      } else {
        mobileProBtn.style.display = '';
        mobileProBadge.style.display = 'none';
      }
    }
  }

  /* ─── Admin Link Visibility ─── */
  async function updateAdminLinkVisibility(user) {
    var adminLink = document.getElementById('adminNavLink');
    var mobileAdminLink = document.getElementById('mobileAdminNavLink');
    try {
      var session = user && window.NagrivaAuthStore ? (NagrivaAuthStore.getSession() || null) : null;
      if (!session || !user) {
        if (adminLink) adminLink.style.display = 'none';
        if (mobileAdminLink) mobileAdminLink.style.display = 'none';
        return;
      }
      var { data: profile } = await window.supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      var role = profile ? profile.role : 'client';
      var isAdmin = role === 'admin';
      if (adminLink) adminLink.style.display = isAdmin ? '' : 'none';
      if (mobileAdminLink) mobileAdminLink.style.display = isAdmin ? '' : 'none';
    } catch (_) {
      if (adminLink) adminLink.style.display = 'none';
      if (mobileAdminLink) mobileAdminLink.style.display = 'none';
    }
  }

  /* ─── Dev Link Visibility ─── */
  function updateDevLinkVisibility() {
    var devLink = document.getElementById('devNavLink');
    var mobileDevLink = document.getElementById('mobileDevNavLink');
    var isDev = window.location.search.indexOf('dev=true') !== -1 ||
      (function() { try { return localStorage.getItem('nagriva_dev_mode') === 'true'; } catch (e) { return false; } })();
    if (devLink) devLink.style.display = isDev ? '' : 'none';
    if (mobileDevLink) mobileDevLink.style.display = isDev ? '' : 'none';
  }

  /* ════════════════════════════════════════════
     PASSWORD STRENGTH
     ════════════════════════════════════════════ */

  function getPasswordStrength(password) {
    var score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    return score;
  }

  function updatePasswordStrength(password, strengthEl, fillEl, labelEl) {
    if (!strengthEl || !fillEl || !labelEl) return;
    if (!password) {
      strengthEl.classList.remove('visible');
      return;
    }
    strengthEl.classList.add('visible');
    var score = getPasswordStrength(password);
    var levels = ['weak', 'fair', 'good', 'strong'];
    var labels = ['Weak \u2014 Try adding more characters', 'Fair \u2014 Add symbols & numbers', 'Good \u2014 Almost there', 'Strong \u2014 Great password!'];
    if (score === 0) {
      fillEl.className = 'auth-pw-strength-fill weak';
      labelEl.textContent = 'Too short \u2014 min 6 characters';
      labelEl.className = 'auth-pw-strength-label weak';
    } else {
      var idx = Math.min(score - 1, 3);
      fillEl.className = 'auth-pw-strength-fill ' + levels[idx];
      labelEl.textContent = labels[idx];
      labelEl.className = 'auth-pw-strength-label ' + levels[idx];
    }
  }

  function getPasswordRequirements(password) {
    return {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^a-zA-Z0-9]/.test(password)
    };
  }

  /* ════════════════════════════════════════════
     PASSWORD TOGGLE
     ════════════════════════════════════════════ */

  function initPasswordToggles() {
    document.querySelectorAll('.auth-pw-toggle').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var input = btn.parentElement.querySelector('.auth-input');
        if (!input) return;
        var isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';
        btn.innerHTML = isPw
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      });
    });
  }

  /* ════════════════════════════════════════════
     OAUTH — Google
     ════════════════════════════════════════════ */

  function parseOAuthError(err) {
    if (!err) return 'Unable to sign in. Please try again.';
    var msg = err.message || err.error_description || err.toString();
    if (/popup|closed|was blocked/i.test(msg)) {
      return 'Sign-in popup was blocked. Please allow popups for this site and try again.';
    }
    if (/network|fetch|failed to fetch|offline|enotfound|econnrefused|dns/i.test(msg)) {
      return 'Network error. Please check your connection and try again.';
    }
    if (/rate.*limit|too many/i.test(msg)) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    return 'Unable to sign in with Google. Please try again.';
  }

  async function handleGoogleOAuth(btn) {
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    btn.classList.add('loading');

    var form = btn.closest('form');
    var msgEl = form ? form.querySelector('.auth-message') : null;
    if (msgEl) hideMessage(msgEl);

    var params = new URLSearchParams(window.location.search);
    var redirectTarget = params.get('redirect') || '';
    var fromLimit = params.get('from_limit') === '1';

    var redirectPath = window.location.origin + window.location.pathname;
    var rp = new URLSearchParams();
    if (redirectTarget) rp.set('redirect', redirectTarget);
    if (fromLimit) rp.set('from_limit', '1');
    var qs = rp.toString();
    var redirectTo = redirectPath + (qs ? '?' + qs : '');

    var result = await NagrivaAuthStore.signInWithGoogle(redirectTo);
    if (result.error && msgEl) {
      showError(msgEl, parseOAuthError(result.error));
    }

    btn.disabled = false;
    btn.classList.remove('loading');
  }

  function initGoogleOAuth() {
    document.querySelectorAll('.auth-social-btn').forEach(function(btn) {
      if (btn.textContent.includes('Google') || btn.querySelector('path[fill="#4285F4"]') || btn.innerHTML.includes('google')) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          handleGoogleOAuth(btn);
        });
      }
    });
  }

  /* ════════════════════════════════════════════
     INIT — Subscribe to auth store
     ════════════════════════════════════════════ */

  var _initialized = false;

  function init() {
    if (_initialized) return;
    _initialized = true;

    initPasswordToggles();
    initGoogleOAuth();

    /* If store not ready yet, wait for layout.js to inject it */
    if (!window.NagrivaAuthStore) {
      _initialized = false;
      setTimeout(function check () {
        if (window.NagrivaAuthStore) { init(); }
        else { setTimeout(check, 30); }
      }, 30);
      return;
    }

    /* Subscribe to auth state changes from store */
    NagrivaAuthStore.subscribe(function(state) {
      console.log('[DEBUG auth] subscriber fired — loading:', state.loading, '| user:', state.user?.id);
      updateNavbarUI(state.user);
    });

    /* Subscribe to plan changes */
    if (window.NagrivaPlanManager) {
      NagrivaPlanManager.subscribe(function(planState) {
        console.log('[DEBUG auth] plan subscriber fired — plan:', planState.plan);
        updatePlanUI(planState);
      });
    }

    /* If already initialized, show current state */
    if (NagrivaAuthStore.isAuthenticated()) {
      console.log('[DEBUG auth] init — already authenticated, calling updateNavbarUI immediately');
      updateNavbarUI(NagrivaAuthStore.getUser());
    } else {
      console.log('[DEBUG auth] init — not authenticated yet, waiting for subscriber');
    }
  }

  /* ─── Re-init when dynamic navbar loads ─── */
  document.addEventListener('navbar:loaded', function onNavbarLoad() {
    console.log('[DEBUG auth] navbar:loaded event received');
    initDropdown();
    updateDevLinkVisibility();
    if (window.NagrivaAuthStore && NagrivaAuthStore.isAuthenticated()) {
      console.log('[DEBUG auth] navbar:loaded — user is authenticated, updating navbar UI');
      updateNavbarUI(NagrivaAuthStore.getUser());
    } else {
      console.log('[DEBUG auth] navbar:loaded — NOT authenticated (or no store), store:', !!window.NagrivaAuthStore, '| auth:', window.NagrivaAuthStore?.isAuthenticated());
    }
    updatePlanUI();
  });

  /* ════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════ */

  return {
    init: init,
    getUser: function() { return window.NagrivaAuthStore ? NagrivaAuthStore.getUser() : null; },
    getSession: function() { return window.NagrivaAuthStore ? NagrivaAuthStore.getSession() : null; },
    getAuthErrorMessage: getAuthErrorMessage,
    showError: showError,
    showSuccess: showSuccess,
    hideMessage: hideMessage,
    getDisplayName: getDisplayName,
    getInitials: getInitials,
    sendWelcomeEmail: sendWelcomeEmail,
    updatePasswordStrength: updatePasswordStrength,
    getPasswordRequirements: getPasswordRequirements
  };
})();

window.NagrivaAuth = NagrivaAuth;

/* ─── Auto-init ─── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { NagrivaAuth.init(); });
} else {
  NagrivaAuth.init();
}
