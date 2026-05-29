/* ════════════════════════════════════════════════════════
   NAGRIVA — Supabase Authentication
   Handles sign in, sign up, forgot password, session
   management, and UI state for the auth system.
   ════════════════════════════════════════════════════════ */

'use strict';

const NagrivaAuth = (() => {
  /* ─── State ─── */
  let currentSession = null;
  let currentUser = null;
  let authInitialized = false;

  /* ─── DOM Refs ─── */
  const refs = {};

  function cacheRefs() {
    refs.overlay = document.getElementById('authOverlay');
    refs.backdrop = document.getElementById('authBackdrop');
    refs.modal = document.getElementById('authModal');
    refs.closeBtn = document.getElementById('authCloseBtn');

    refs.tabs = document.querySelectorAll('.auth-tab');
    refs.forms = document.querySelectorAll('.auth-form');

    refs.signInForm = document.getElementById('signInForm');
    refs.signUpForm = document.getElementById('signUpForm');
    refs.forgotForm = document.getElementById('forgotForm');

    refs.signinSubmit = document.getElementById('signinSubmit');
    refs.signupSubmit = document.getElementById('signupSubmit');
    refs.forgotSubmit = document.getElementById('forgotSubmit');

    refs.signinMsg = document.getElementById('signinMessage');
    refs.signupMsg = document.getElementById('signupMessage');
    refs.forgotMsg = document.getElementById('forgotMessage');

    refs.forgotSuccess = document.getElementById('forgotSuccess');
    refs.forgotFormWrap = document.getElementById('forgotFormWrap');

    refs.authBtn = document.getElementById('authBtn');
    refs.userAvatar = document.getElementById('userAvatar');
    refs.userName = document.getElementById('userName');
    refs.userImg = document.getElementById('userImg');

    refs.dropdown = document.getElementById('userDropdown');
    refs.dropdownName = document.getElementById('dropdownName');
    refs.dropdownEmail = document.getElementById('dropdownEmail');
    refs.dropdownAvatar = document.getElementById('dropdownAvatar');
    refs.signoutBtn = document.getElementById('signoutBtn');

    refs.bookBtn = document.getElementById('bookBtn');
    refs.mobileAuthBtn = document.getElementById('mobileAuthBtn');
    refs.mobileAuthText = document.getElementById('mobileAuthText');

    refs.pwStrength = document.getElementById('passwordStrength');
    refs.pwStrengthFill = document.getElementById('passwordStrengthFill');
    refs.pwStrengthLabel = document.getElementById('passwordStrengthLabel');
    refs.termsCheckbox = document.getElementById('termsCheckbox');
  }

  /* ─── Helpers ─── */
  function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  function getDisplayName(user) {
    if (!user) return 'User';
    return user.user_metadata?.full_name || user.email?.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'User';
  }

  function getEmailFromInput(form) {
    const input = form.querySelector('.auth-input[type="email"], .auth-input[name="email"]');
    return input ? input.value.trim() : '';
  }

  function getPasswordFromInput(form) {
    const input = form.querySelector('.auth-input[type="password"], .auth-input[name="password"]');
    return input ? input.value.trim() : '';
  }

  function getConfirmPassword(form) {
    const input = form.querySelector('.auth-input[name="confirmPassword"]');
    return input ? input.value.trim() : '';
  }

  function getNameFromInput(form) {
    const input = form.querySelector('.auth-input[name="name"]');
    return input ? input.value.trim() : '';
  }

  function showError(msgEl, message) {
    const icon = msgEl.querySelector('svg') || (() => {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('width', '16'); s.setAttribute('height', '16');
      s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
      s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
      s.setAttribute('stroke-linecap', 'round');
      s.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
      return s;
    })();
    msgEl.innerHTML = '';
    msgEl.appendChild(icon);
    msgEl.appendChild(document.createTextNode(message));
    msgEl.className = 'auth-message error show';
  }

  function showSuccess(msgEl, message) {
    const icon = msgEl.querySelector('svg') || (() => {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('width', '16'); s.setAttribute('height', '16');
      s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
      s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
      s.setAttribute('stroke-linecap', 'round');
      s.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
      return s;
    })();
    msgEl.innerHTML = '';
    msgEl.appendChild(icon);
    msgEl.appendChild(document.createTextNode(message));
    msgEl.className = 'auth-message success show';
  }

  function hideMessage(msgEl) {
    if (msgEl) msgEl.className = 'auth-message';
  }

  /* ─── Password Strength ─── */
  function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    return score;
  }

  function updatePasswordStrength(password) {
    if (!refs.pwStrength || !refs.pwStrengthFill || !refs.pwStrengthLabel) return;
    if (!password) {
      refs.pwStrength.classList.remove('visible');
      return;
    }
    refs.pwStrength.classList.add('visible');
    const score = getPasswordStrength(password);
    const levels = ['weak', 'fair', 'good', 'strong'];
    const labels = ['Weak — Try adding more characters', 'Fair — Add symbols & numbers', 'Good — Almost there', 'Strong — Great password!'];
    if (score === 0) {
      refs.pwStrengthFill.className = 'auth-pw-strength-fill weak';
      refs.pwStrengthLabel.textContent = 'Too short — min 6 characters';
      refs.pwStrengthLabel.className = 'auth-pw-strength-label weak';
    } else {
      const idx = Math.min(score - 1, 3);
      refs.pwStrengthFill.className = 'auth-pw-strength-fill ' + levels[idx];
      refs.pwStrengthLabel.textContent = labels[idx];
      refs.pwStrengthLabel.className = 'auth-pw-strength-label ' + levels[idx];
    }
  }

  function resetPasswordStrength() {
    if (!refs.pwStrength) return;
    refs.pwStrength.classList.remove('visible');
  }

  /* ─── Supabase Error Messages ─── */
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
    'Email link is invalid or has expired': 'This reset link is invalid or has expired. Please request a new one.',
    'Email not confirmed': 'Please check your email and confirm your account before signing in.',
  };

  function getAuthErrorMessage(error) {
    if (!error) return 'An unexpected error occurred. Please try again.';

    const message = error.message || error.error_description || error.toString();

    for (const [key, value] of Object.entries(AUTH_ERRORS)) {
      if (message.toLowerCase().includes(key.toLowerCase())) return value;
    }

    if (message.toLowerCase().includes('email') && message.toLowerCase().includes('exist')) {
      return 'An account with this email already exists.';
    }
    if (message.toLowerCase().includes('password') && message.toLowerCase().includes('characters')) {
      return 'Password must be at least 6 characters long.';
    }
    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
      return 'Network error. Please check your connection.';
    }

    return message.charAt(0).toUpperCase() + message.slice(1);
  }

  /* ─── UI Update ─── */
  function updateUI() {
    /* If user-avatar.js is loaded, it handles the avatar UI exclusively */
    if (typeof NAGRIVA_UserAvatar !== 'undefined') {
      if (currentSession && currentUser) {
        if (refs.authBtn) refs.authBtn.style.display = 'none';
        if (refs.mobileAuthBtn) refs.mobileAuthBtn.style.display = 'none';
        if (refs.bookBtn) refs.bookBtn.style.display = 'none';
      } else {
        if (refs.authBtn) refs.authBtn.style.display = '';
        if (refs.mobileAuthBtn) refs.mobileAuthBtn.style.display = '';
        if (refs.bookBtn) refs.bookBtn.style.display = '';
      }
      return;
    }

    if (currentSession && currentUser) {
      const displayName = getDisplayName(currentUser);
      const avatarUrl = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null;

      if (refs.authBtn) refs.authBtn.style.display = 'none';
      if (refs.userAvatar) refs.userAvatar.classList.add('visible');
      if (refs.userName) refs.userName.textContent = displayName;

      if (typeof ProfileAvatar !== 'undefined') {
        ProfileAvatar.setAvatarImage(refs.userImg, avatarUrl, displayName);
      } else if (refs.userImg) {
        refs.userImg.textContent = getInitials(displayName);
      }

      if (refs.dropdownName) refs.dropdownName.textContent = displayName;
      if (refs.dropdownEmail) refs.dropdownEmail.textContent = currentUser.email || '';

      if (typeof ProfileAvatar !== 'undefined') {
        ProfileAvatar.setAvatarImage(refs.dropdownAvatar, avatarUrl, displayName);
      } else if (refs.dropdownAvatar) {
        refs.dropdownAvatar.textContent = getInitials(displayName);
      }

      if (refs.mobileAuthBtn) refs.mobileAuthBtn.style.display = 'none';

      /* Ensure Book a Call CTA stays visible for authenticated users */
      if (refs.bookBtn) refs.bookBtn.style.display = '';

      /* Update admin link visibility */
      updateAdminLinkVisibility();
    } else {
      if (refs.authBtn) refs.authBtn.style.display = '';
      if (refs.userAvatar) refs.userAvatar.classList.remove('visible');
      if (refs.bookBtn) refs.bookBtn.style.display = '';
      if (refs.mobileAuthBtn) {
        refs.mobileAuthBtn.style.display = '';
        if (refs.mobileAuthText) refs.mobileAuthText.textContent = 'Sign In';
      }
      /* Hide admin link when logged out */
      var adminLink = document.getElementById('adminNavLink');
      if (adminLink) adminLink.style.display = 'none';
    }
  }

  /* ─── Modal Controls ─── */
  function openModal(tab) {
    if (!refs.overlay) return;
    refs.overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      refs.overlay.classList.add('active');
    });
    document.body.style.overflow = 'hidden';
    switchTab(tab || 'signin');
  }

  function closeModal() {
    if (!refs.overlay) return;
    refs.overlay.classList.remove('active');
    document.body.style.overflow = '';
    hideMessage(refs.signinMsg);
    hideMessage(refs.signupMsg);
    hideMessage(refs.forgotMsg);
    refs.forgotSuccess.classList.remove('show');
    if (refs.forgotFormWrap) refs.forgotFormWrap.style.display = '';
    setTimeout(() => {
      if (!refs.overlay.classList.contains('active')) {
        refs.overlay.style.display = 'none';
      }
    }, 500);
  }

  const FORM_IDS = { signin: 'signInForm', signup: 'signUpForm', forgot: 'forgotForm' };

  function switchTab(tabId) {
    hideMessage(refs.signinMsg);
    hideMessage(refs.signupMsg);

    refs.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    refs.forms.forEach(f => f.classList.toggle('active', f.id === (FORM_IDS[tabId] || '')));

    if (refs.forgotSuccess) refs.forgotSuccess.classList.remove('show');
    if (refs.forgotFormWrap) refs.forgotFormWrap.style.display = '';

    resetPasswordStrength();

    const titles = {
      signin: ['Welcome Back', 'Sign in to access your dashboard and manage your projects.'],
      signup: ['Create Your Account', 'Join NAGRIVA and start growing your digital presence.'],
      forgot: ['Reset Password', 'Enter your email and we\'ll send you a reset link.']
    };
    const titleEl = document.getElementById('authTitle');
    const subEl = document.getElementById('authSubtitle');
    if (titleEl && titles[tabId]) titleEl.textContent = titles[tabId][0];
    if (subEl && titles[tabId]) subEl.textContent = titles[tabId][1];
  }

  function openForgotPassword() {
    switchTab('forgot');
    if (refs.forgotSuccess) refs.forgotSuccess.classList.remove('show');
    if (refs.forgotFormWrap) refs.forgotFormWrap.style.display = '';
    hideMessage(refs.forgotMsg);
  }

  /* ════════════════════════════════════════════
     SUPABASE AUTH OPERATIONS
  ════════════════════════════════════════════ */

  /* ─── Sign In ─── */
  async function handleSignIn(e) {
    e.preventDefault();
    hideMessage(refs.signinMsg);

    const email = getEmailFromInput(refs.signInForm);
    const password = getPasswordFromInput(refs.signInForm);

    if (!email) { showError(refs.signinMsg, 'Please enter your email address'); return; }
    if (!password) { showError(refs.signinMsg, 'Please enter your password'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { showError(refs.signinMsg, 'Please enter a valid email address'); return; }

    refs.signinSubmit.classList.add('loading');

    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });

      if (error) {
        showError(refs.signinMsg, getAuthErrorMessage(error));
        refs.signinSubmit.classList.remove('loading');
        return;
      }

      if (data.session) {
        closeModal();
        refs.signInForm.reset();
        /* ── Role-based redirect: admin users go to admin dashboard ── */
        try {
          const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .single();
          if (profile?.role === 'admin') {
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect');
            if (redirect && !redirect.includes('admin')) {
              window.location.href = redirect;
            } else {
              window.location.href = '/pages/admin-dashboard.html';
            }
          } else {
            window.location.href = getRedirectUrl();
          }
        } catch {
          window.location.href = getRedirectUrl();
        }
        return;
      } else {
        showError(refs.signinMsg, 'Unable to sign in. Please try again.');
      }
    } catch (err) {
      showError(refs.signinMsg, getAuthErrorMessage(err));
    }

    refs.signinSubmit.classList.remove('loading');
  }

  /* ─── Sign Up ─── */
  async function handleSignUp(e) {
    e.preventDefault();
    hideMessage(refs.signupMsg);

    const name = getNameFromInput(refs.signUpForm);
    const email = getEmailFromInput(refs.signUpForm);
    const password = getPasswordFromInput(refs.signUpForm);
    const confirm = getConfirmPassword(refs.signUpForm);

    if (!name) { showError(refs.signupMsg, 'Please enter your full name'); return; }
    if (!email) { showError(refs.signupMsg, 'Please enter your email address'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { showError(refs.signupMsg, 'Please enter a valid email address'); return; }
    if (!password) { showError(refs.signupMsg, 'Please create a password'); return; }
    if (password.length < 6) { showError(refs.signupMsg, 'Password must be at least 6 characters'); return; }
    if (password !== confirm) { showError(refs.signupMsg, 'Passwords do not match'); return; }
    if (refs.termsCheckbox && !refs.termsCheckbox.checked) { showError(refs.signupMsg, 'Please agree to the Terms of Service'); return; }

    refs.signupSubmit.classList.add('loading');

    try {
      const { data, error } = await window.supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name }
        }
      });

      if (error) {
        showError(refs.signupMsg, getAuthErrorMessage(error));
        refs.signupSubmit.classList.remove('loading');
        return;
      }

      /* Check if email confirmation is required */
      if (data?.user?.identities?.length === 0) {
        showError(refs.signupMsg, 'An account with this email already exists.');
        refs.signupSubmit.classList.remove('loading');
        return;
      }

      /* Trigger activity log for new client registration */
      if (data.user && typeof NAGRIVA_ActivityLogsTrigger !== 'undefined') {
        NAGRIVA_ActivityLogsTrigger.clientRegistered(data.user).catch(function(e) {
          console.warn('[Auth] Failed to trigger client-registered activity log:', e.message);
        });
      }

      /* Trigger new-client notification for admins */
      if (data.user && typeof NAGRIVA_NotificationTriggers !== 'undefined') {
        NAGRIVA_NotificationTriggers.newClient(data.user).catch(function(e) {
          console.warn('[Auth] Failed to trigger new-client notification:', e.message);
        });
      }

      /* If session is null, email confirmation is enabled */
      if (!data.session) {
        showSuccess(refs.signupMsg,
          'Account created! Check your email for a confirmation link. You can close this window.'
        );
        refs.signupSubmit.classList.remove('loading');
        refs.signUpForm.reset();
        return;
      }

      /* Auto-logged in (email confirmation disabled) */
      showSuccess(refs.signupMsg, 'Account created successfully!');
      setTimeout(() => {
        closeModal();
        refs.signUpForm.reset();
        window.location.href = '/pages/dashboard.html';
      }, 800);
    } catch (err) {
      showError(refs.signupMsg, getAuthErrorMessage(err));
    }

    refs.signupSubmit.classList.remove('loading');
  }

  /* ─── Forgot Password ─── */
  async function handleForgot(e) {
    e.preventDefault();
    hideMessage(refs.forgotMsg);
    if (refs.forgotSuccess) refs.forgotSuccess.classList.remove('show');
    if (refs.forgotFormWrap) refs.forgotFormWrap.style.display = '';

    const email = getEmailFromInput(refs.forgotForm);

    if (!email) { showError(refs.forgotMsg, 'Please enter your email address'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { showError(refs.forgotMsg, 'Please enter a valid email address'); return; }

    refs.forgotSubmit.classList.add('loading');

    try {
      const redirectTo = window.location.origin + '/pages/reset-password.html';
      const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo
      });

      if (error) {
        showError(refs.forgotMsg, getAuthErrorMessage(error));
        refs.forgotSubmit.classList.remove('loading');
        return;
      }

      refs.forgotSubmit.classList.remove('loading');
      if (refs.forgotFormWrap) refs.forgotFormWrap.style.display = 'none';
      if (refs.forgotSuccess) refs.forgotSuccess.classList.add('show');
    } catch (err) {
      showError(refs.forgotMsg, getAuthErrorMessage(err));
      refs.forgotSubmit.classList.remove('loading');
    }
  }

  /* ─── Sign Out ─── */
  async function handleSignOut() {
    closeDropdown();

    try {
      await window.supabaseClient.auth.signOut();
    } catch (_) {
      /* Force local state cleanup even if API call fails */
    }

    currentSession = null;
    currentUser = null;
    updateUI();

    /* Redirect to sign in page after sign-out */
    window.location.href = '/pages/signin.html';
  }

  /* ─── Session & Auth State ─── */
  async function initSession() {
    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      currentSession = session;
      currentUser = session?.user ?? null;
      updateUI();
    } catch (_) {
      updateUI();
    }

    /* Listen for auth state changes in real time */
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        currentSession = session;
        currentUser = session?.user ?? null;
        updateUI();
      }

      if (event === 'SIGNED_OUT') {
        currentSession = null;
        currentUser = null;
        updateUI();
      }

      if (event === 'USER_UPDATED') {
        currentSession = session;
        currentUser = session?.user ?? null;
        updateUI();
      }
    });

    authInitialized = true;
  }

  /* ════════════════════════════════════════════
     EVENT BINDING
  ════════════════════════════════════════════ */

  function initPasswordToggles() {
    document.querySelectorAll('.auth-pw-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('.auth-input');
        if (!input) return;
        const isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';
        btn.innerHTML = isPw
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      });
    });
  }

  function initTabs() {
    refs.tabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
  }

  function initPasswordStrength() {
    const pwInput = refs.signUpForm?.querySelector('.auth-input[name="password"]');
    if (pwInput) {
      pwInput.addEventListener('input', () => updatePasswordStrength(pwInput.value));
    }
  }

  function initForgotLinks() {
    document.querySelectorAll('.auth-forgot-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openForgotPassword();
      });
    });
  }

  function initFormFooterLinks() {
    document.querySelectorAll('.auth-switch-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab || 'signin';
        switchTab(target);
      });
    });
  }

  function initModalControls() {
    // Auth button now links to login.html directly via <a href>
    // No need for modal-based click handler

    if (refs.mobileAuthBtn) {
      // Mobile auth link uses <a href> natively
    }

    if (refs.closeBtn) refs.closeBtn.addEventListener('click', closeModal);
    if (refs.backdrop) refs.backdrop.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && refs.overlay?.classList.contains('active')) closeModal();
    });
  }

  function closeDropdown() {
    if (refs.dropdown) refs.dropdown.classList.remove('open');
    if (refs.userAvatar) refs.userAvatar.setAttribute('aria-expanded', 'false');
  }

  function openDropdown() {
    if (refs.dropdown) refs.dropdown.classList.add('open');
    if (refs.userAvatar) refs.userAvatar.setAttribute('aria-expanded', 'true');
    /* Close notification dropdown if open */
    if (typeof NAGRIVA_NotificationsDropdown !== 'undefined') {
      NAGRIVA_NotificationsDropdown.close();
    }
  }

  function _onDropdownKeydown(e) {
    if (e.key === 'Escape') closeDropdown();
  }

  function _onDropdownOutsideClick(e) {
    if (refs.userAvatar && !refs.userAvatar.contains(e.target) && refs.dropdown?.classList.contains('open')) {
      closeDropdown();
    }
  }

  function initDropdown() {
    if (refs.userAvatar) {
      refs.userAvatar.addEventListener('click', function(e) {
        e.stopPropagation();
        if (refs.dropdown?.classList.contains('open')) {
          closeDropdown();
        } else {
          openDropdown();
        }
      });
      refs.userAvatar.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          if (refs.dropdown?.classList.contains('open')) {
            closeDropdown();
          } else {
            openDropdown();
          }
        }
      });
    }

    if (refs.signoutBtn) {
      refs.signoutBtn.addEventListener('click', handleSignOut);
    }

    document.addEventListener('keydown', _onDropdownKeydown);
    document.addEventListener('click', _onDropdownOutsideClick);
  }

  /* ════════════════════════════════════════════
     OAUTH — Google & GitHub
   ════════════════════════════════════════════ */

  async function handleGoogleSignIn() {
    try {
      const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/pages/dashboard.html'
        }
      });
      if (error) {
        console.error('Google OAuth error:', error.message);
      }
    } catch (err) {
      console.error('Google OAuth error:', err.message || err);
    }
  }

  function initGoogleOAuth() {
    document.querySelectorAll('.ap-social-btn, .auth-social-btn').forEach(function(btn) {
      if (btn.textContent.trim().includes('Google')) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          handleGoogleSignIn();
        });
      }
    });
  }

  async function handleGitHubSignIn() {
    try {
      const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin + '/pages/dashboard.html'
        }
      });
      if (error) {
        console.error('GitHub OAuth error:', error.message);
      }
    } catch (err) {
      console.error('GitHub OAuth error:', err.message || err);
    }
  }

  function initGitHubOAuth() {
    document.querySelectorAll('.ap-social-btn, .auth-social-btn').forEach(function(btn) {
      if (btn.textContent.trim().includes('GitHub')) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          handleGitHubSignIn();
        });
      }
    });
  }

  /* ─── Handle Redirect After Login ─── */
  function getRedirectUrl() {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      return decodeURIComponent(redirect);
    }
    /* Default: regular users go to dashboard, admin detection
       is handled in the sign-in handler above. */
    return '/pages/dashboard.html';
  }

  function handleRedirect() {
    const params = new URLSearchParams(window.location.search);
    const requireLogin = params.get('requireLogin');
    const redirect = params.get('redirect');

    if (requireLogin === 'true') {
      const dest = redirect ? '/pages/login.html?redirect=' + encodeURIComponent(redirect) : '/pages/login.html';
      window.location.href = dest;
    }
  }

  /* ─── Dropdown Navigation Links ─── */
  function initDropdownNav() {
    var NAV_MAP = {
      'profile': '/pages/profile.html',
      'dashboard': '/pages/dashboard.html',
      'notifications': '/pages/notifications.html',
      'settings': '/pages/settings.html',
      'admin': '/pages/admin-dashboard.html',
      'onboarding-qa': '/pages/onboarding-qa.html'
    };
    document.querySelectorAll('.user-dropdown-item[data-nav]').forEach(function(item) {
      var nav = item.getAttribute('data-nav');
      var href = NAV_MAP[nav];
      if (href) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          closeDropdown();
          window.location.href = href;
        });
      }
    });
  }

  /* ─── Show admin link only for admin users ─── */
  async function updateAdminLinkVisibility() {
    var adminLink = document.getElementById('adminNavLink');
    var mobileAdminLink = document.getElementById('mobileAdminNavLink');
    try {
      var session = currentSession || (await window.supabaseClient.auth.getSession()).data.session;
      if (!session) {
        if (adminLink) adminLink.style.display = 'none';
        if (mobileAdminLink) mobileAdminLink.style.display = 'none';
        return;
      }
      var { data: profile } = await window.supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      var isAdmin = profile && profile.role === 'admin';
      if (adminLink) adminLink.style.display = isAdmin ? '' : 'none';
      if (mobileAdminLink) mobileAdminLink.style.display = isAdmin ? '' : 'none';
    } catch (_) {
      if (adminLink) adminLink.style.display = 'none';
      if (mobileAdminLink) mobileAdminLink.style.display = 'none';
    }
  }

  /* ─── Show dev link only in dev mode ─── */
  function updateDevLinkVisibility() {
    var devLink = document.getElementById('devNavLink');
    var mobileDevLink = document.getElementById('mobileDevNavLink');
    var isDev = window.location.search.indexOf('dev=true') !== -1 ||
                (function () { try { return localStorage.getItem('nagriva_dev_mode') === 'true' } catch (e) { return false } })();
    if (devLink) devLink.style.display = isDev ? '' : 'none';
    if (mobileDevLink) mobileDevLink.style.display = isDev ? '' : 'none';
  }

  /* ─── Re-bind navbar-specific events after navbar loads ─── */
  function initNavbarUI() {
    cacheRefs();
    initDropdown();
    initDropdownNav();
    updateUI();
    updateDevLinkVisibility();
  }

  /* ─── Init ─── */
  async function init() {
    cacheRefs();
    initTabs();
    initPasswordToggles();
    initPasswordStrength();
    initForgotLinks();
    initFormFooterLinks();
    initModalControls();
    initGoogleOAuth();
    initGitHubOAuth();

    /* Wire form submissions — only in modal context (standalone pages have their own handlers) */
    if (refs.overlay) {
      if (refs.signInForm) refs.signInForm.addEventListener('submit', handleSignIn);
      if (refs.signUpForm) refs.signUpForm.addEventListener('submit', handleSignUp);
      if (refs.forgotForm) refs.forgotForm.addEventListener('submit', handleForgot);
    }

    /* Initialize session and auth listener */
    await initSession();

    /* Handle redirect after login params */
    handleRedirect();
  }

  /* ─── Re-init navbar-dependent UI when the dynamic navbar loads ─── */
  document.addEventListener('navbar:loaded', function onNavbarLoad() {
    initNavbarUI();
  });

  /* ─── Public API ─── */
  return {
    init,
    getSession: () => currentSession,
    getUser: () => currentUser,
    openModal,
    closeModal
  };
})();

/* ─── Auto-initialize on DOM ready ─── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NagrivaAuth.init());
} else {
  NagrivaAuth.init();
}
