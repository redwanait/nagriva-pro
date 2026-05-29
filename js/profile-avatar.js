/* ════════════════════════════════════════════════════════
   NAGRIVA — Centralized Avatar System
   Handles avatar display, upload, and sync across the
   entire website. Auto-initializes on every page.
   ════════════════════════════════════════════════════════ */

'use strict';

const ProfileAvatar = (() => {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE = 2 * 1024 * 1024;
  const BUCKET = 'avatars';

  let currentUser = null;

  /* ─── Helpers ─── */
  function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  function getDisplayName(u) {
    if (!u) return 'User';
    return u.user_metadata?.full_name || u.email?.split('@')[0] || 'User';
  }

  function getAvatarUrl(u) {
    if (!u) return null;
    return u.user_metadata?.avatar_url || u.user_metadata?.picture || null;
  }

  /* ─── Toast ─── */
  function showToast(message, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    var icons = {
      success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = '<span class="toast-icon">' + (icons[type] || icons.info) + '</span><span class="toast-msg">' + message + '</span>';
    container.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('show'); });

    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3500);
  }

  /* ─── Storage Bucket Setup ─── */
  async function ensureBucket() {
    try {
      var { data: buckets, error } = await window.supabaseClient.storage.listBuckets();
      if (error) throw error;
      if (!buckets || !buckets.some(function(b) { return b.name === BUCKET; })) {
        var { error: createError } = await window.supabaseClient.storage.createBucket(BUCKET, {
          public: true,
          fileSizeLimit: MAX_SIZE
        });
        if (createError) throw createError;
      }
    } catch (err) {
      console.warn('[ProfileAvatar] Bucket setup:', err.message);
    }
  }

  /* ════════════════════════════════════════════
     CORE RENDERER — used by EVERY avatar
  ════════════════════════════════════════════ */
  function setAvatarImage(container, url, displayName) {
    if (!container) return;
    container.innerHTML = '';
    if (url) {
      container.classList.add('has-image');
      var img = document.createElement('img');
      img.onload = function() { img.classList.add('loaded'); };
      img.onerror = function() {
        container.classList.remove('has-image');
        container.innerHTML = '';
        container.textContent = getInitials(displayName);
      };
      img.src = url;
      img.alt = '';
      img.loading = 'lazy';
      container.appendChild(img);
    } else {
      container.classList.remove('has-image');
      container.textContent = getInitials(displayName);
    }
  }

  /* ─── Refresh ALL avatars on the page ─── */
  function refreshAll() {
    var user = NagrivaAuth.getUser();
    if (!user) return;
    currentUser = user;
    var displayName = getDisplayName(user);
    var avatarUrl = getAvatarUrl(user);
    setAvatarImage(document.getElementById('userImg'), avatarUrl, displayName);
    setAvatarImage(document.getElementById('dropdownAvatar'), avatarUrl, displayName);
    setAvatarImage(document.getElementById('profileAvatar'), avatarUrl, displayName);
    /* Also notify user-avatar.js (navbar avatar) to re-fetch from profiles table */
    if (typeof NAGRIVA_UserAvatar !== 'undefined' && typeof NAGRIVA_UserAvatar.refreshProfile === 'function') {
      NAGRIVA_UserAvatar.refreshProfile();
    }
  }

  /* ════════════════════════════════════════════
     UPLOAD (profile.html only)
  ════════════════════════════════════════════ */
  function validateFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('Invalid file type. Please upload JPG, PNG, or WebP images only.', 'error');
      return false;
    }
    if (file.size > MAX_SIZE) {
      showToast('File too large. Maximum size is 2MB.', 'error');
      return false;
    }
    return true;
  }

  async function handleUpload(file) {
    if (!validateFile(file)) return;

    var fileExt = file.name.split('.').pop();
    var filePath = currentUser.id + '/' + Date.now() + '.' + fileExt;

    var btn = document.getElementById('changePhotoBtn');
    if (btn) btn.classList.add('loading');

    try {
      var { error: uploadError } = await window.supabaseClient.storage
        .from(BUCKET)
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      var { data: { publicUrl } } = window.supabaseClient.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      var { data: updateData, error: updateError } = await window.supabaseClient.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      /* Use the server response directly — always has the latest metadata */
      if (updateData?.user) {
        currentUser = updateData.user;
      }

      try {
        await window.supabaseClient
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', currentUser.id);
      } catch (_) {}

      refreshAll();

      showToast('Profile photo updated successfully.', 'success');
    } catch (err) {
      console.error('[ProfileAvatar]', err);
      showToast(err.message || 'Failed to upload photo. Please try again.', 'error');
    }

    if (btn) btn.classList.remove('loading');
  }

  function initFileInput() {
    var input = document.getElementById('avatarInput');
    if (!input) return;

    input.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        handleUpload(this.files[0]);
      }
      this.value = '';
    });

    var btn = document.getElementById('changePhotoBtn');
    if (btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        input.click();
      });
    }
  }

  /* ════════════════════════════════════════════
     FULL SETUP — called on init & SIGNED_IN
   ════════════════════════════════════════════ */
  function setup() {
    currentUser = NagrivaAuth.getUser();
    if (!currentUser) return;
    refreshAll();
    initFileInput();
    ensureBucket();
  }

  /* ════════════════════════════════════════════
     INIT & AUTO-LOAD (no polling)
   ════════════════════════════════════════════ */
  async function init() {
    currentUser = NagrivaAuth.getUser();
    if (!currentUser) return;

    var container = document.getElementById('navbar-container');
    if (container && container.children.length > 0) {
      setup();
    }
  }

  function initAuthListener() {
    window.supabaseClient.auth.onAuthStateChange(function(event) {
      if (event === 'SIGNED_IN') {
        onNavbarReady();
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        currentUser = NagrivaAuth.getUser();
        if (currentUser) {
          refreshAll();
        }
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        refreshAll();
      }
    });
  }

  /* ─── Called when navbar is guaranteed to be in the DOM ─── */
  function onNavbarReady() {
    currentUser = NagrivaAuth.getUser();
    if (currentUser) {
      setup();
    }
  }

  /* ─── Auto-init ─── */
  function autoInit() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        init();
        if (window.supabaseClient) initAuthListener();
      });
    } else {
      init();
      if (window.supabaseClient) initAuthListener();
    }

    /* If user is already signed in but navbar loaded after profile-avatar,
       wait for the dynamic navbar to appear before rendering avatars */
    document.addEventListener('navbar:loaded', onNavbarReady);
  }

  autoInit();

  /* ════════════════════════════════════════════
     PUBLIC API
  ════════════════════════════════════════════ */
  return {
    setAvatarImage: setAvatarImage,
    refreshAll: refreshAll,
    showToast: showToast,
    getInitials: getInitials,
    getDisplayName: getDisplayName,
    getAvatarUrl: getAvatarUrl,
    init: init
  };
})();
