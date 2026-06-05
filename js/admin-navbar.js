const NAGRIVA_AdminNavbar = (() => {
  'use strict';

  var _state = {
    userId: null,
    profile: null,
    user: null,
    unreadNotifications: 0,
    unreadMessages: 0,
    dropdownOpen: false
  };

  var _unsubscribes = [];
  var _initialized = false;

  /* ════════════════════════════════════
     AVATAR / IMAGE HELPERS
     ════════════════════════════════════ */
  function getInitials(name) {
    if (!name) return 'A';
    return name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2) || 'A';
  }

  function setAvatar(containerId, imgId, initialsId, url, displayName) {
    var container = document.getElementById(containerId);
    var img = document.getElementById(imgId);
    var initials = document.getElementById(initialsId);
    if (!container || !img || !initials) return;

    if (url) {
      container.classList.add('has-image');
      initials.textContent = getInitials(displayName);
      initials.style.display = '';
      img.classList.remove('loaded');
      img.onload = function() {
        img.classList.add('loaded');
        initials.style.display = 'none';
      };
      img.onerror = function() {
        container.classList.remove('has-image');
        img.classList.remove('loaded');
      };
      img.src = url;
    } else {
      container.classList.remove('has-image');
      img.classList.remove('loaded');
      initials.textContent = getInitials(displayName);
      initials.style.display = '';
    }
  }

  function updateUIFromProfile(profile, user) {
    var displayName = profile && profile.full_name
      ? profile.full_name
      : (user && user.email ? user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }) : 'Admin');

    var email = profile && profile.email ? profile.email : (user ? user.email : '');
    var role = profile && profile.role ? profile.role : 'admin';

    var avatarUrl = null;
    if (profile && profile.avatar_url) {
      avatarUrl = profile.avatar_url;
    } else if (user && user.user_metadata && user.user_metadata.avatar_url) {
      avatarUrl = user.user_metadata.avatar_url;
    } else {
      avatarUrl = '../assets/images/team/nagriva-team.webp';
    }

    setAvatar('adminAvatar', 'adminAvatarImg', 'adminAvatarInitials', avatarUrl, displayName);
    setAvatar('dropdownAvatarMini', 'dropdownMiniImg', 'dropdownMiniInitials', avatarUrl, displayName);
    setAvatar('sidebarProfileAvatar', 'sidebarProfileImg', 'sidebarProfileInitials', avatarUrl, displayName);

    var nameEl = document.getElementById('dropdownUserName');
    var roleEl = document.getElementById('dropdownUserRole');
    if (nameEl) nameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);

    var sidebarNameEl = document.getElementById('sidebarProfileName');
    var sidebarRoleEl = document.getElementById('sidebarProfileRole');
    if (sidebarNameEl) sidebarNameEl.textContent = displayName;
    if (sidebarRoleEl) sidebarRoleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  }

  /* ════════════════════════════════════
     LOAD INITIAL DATA
     ════════════════════════════════════ */
  async function loadInitialData() {
    try {
      var supabase = window.supabaseClient;
      var { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAvatar('adminAvatar', 'adminAvatarImg', 'adminAvatarInitials', null, 'Admin');
        return;
      }

      _state.user = user;
      _state.userId = user.id;

      var { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .eq('id', user.id)
        .single();

      if (!error && profile) {
        _state.profile = profile;
      }

      updateUIFromProfile(_state.profile, _state.user);

      var [notifCount, msgCount] = await Promise.all([
        _getUnreadNotificationsCount(user.id),
        _getUnreadMessagesCount()
      ]);

      _state.unreadNotifications = notifCount;
      _state.unreadMessages = msgCount;
      updateNotifBadge(notifCount);
      updateMsgBadge(msgCount);
    } catch (err) {
      console.warn('[AdminNavbar] loadInitialData error:', err);
      setAvatar('adminAvatar', 'adminAvatarImg', 'adminAvatarInitials', null, 'Admin');
    }
  }

  async function _getUnreadNotificationsCount(userId) {
    try {
      var { count, error } = await window.supabaseClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      return error ? 0 : (count || 0);
    } catch (e) { return 0; }
  }

  async function _getUnreadMessagesCount() {
    try {
      var [orderRes, supportRes] = await Promise.all([
        window.supabaseClient
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_role', 'client')
          .eq('is_read', false),
        window.supabaseClient
          .from('support_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_role', 'user')
          .eq('is_read', false)
      ]);
      return (orderRes.count || 0) + (supportRes.count || 0);
    } catch (e) { return 0; }
  }

  /* ════════════════════════════════════
     REALTIME SUBSCRIPTIONS
     ════════════════════════════════════ */
  function subscribeAll() {
    _unsubscribes.forEach(function(fn) { fn(); });
    _unsubscribes = [];

    if (!_state.userId) return;

    /* ── Profile changes ── */
    var profileChan = window.supabaseClient
      .channel('admin-navbar-profile')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'id=eq.' + _state.userId },
        function(payload) {
          _state.profile = payload.new;
          updateUIFromProfile(_state.profile, _state.user);
        }
      )
      .subscribe();
    _unsubscribes.push(function() { window.supabaseClient.removeChannel(profileChan); });

    /* ── Notification changes ── */
    var notifChan = window.supabaseClient
      .channel('admin-navbar-notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + _state.userId },
        function(payload) {
          var n = payload.new;
          if (!n.is_read) {
            _state.unreadNotifications++;
            updateNotifBadge(_state.unreadNotifications);
            showNotifToast(n);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + _state.userId },
        function(payload) {
          var n = payload.new;
          if (n.is_read) {
            _state.unreadNotifications = Math.max(0, _state.unreadNotifications - 1);
            updateNotifBadge(_state.unreadNotifications);
          }
        }
      )
      .subscribe();
    _unsubscribes.push(function() { window.supabaseClient.removeChannel(notifChan); });

    /* ── Order message changes ── */
    var msgChan = window.supabaseClient
      .channel('admin-navbar-messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'sender_role=eq.client' },
        function() {
          _state.unreadMessages++;
          updateMsgBadge(_state.unreadMessages);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: 'is_read=eq.true' },
        function(payload) {
          if (payload.new && payload.old && !payload.old.is_read) {
            _state.unreadMessages = Math.max(0, _state.unreadMessages - 1);
            updateMsgBadge(_state.unreadMessages);
          }
        }
      )
      .subscribe();
    _unsubscribes.push(function() { window.supabaseClient.removeChannel(msgChan); });

    /* ── Support message changes ── */
    var supportChan = window.supabaseClient
      .channel('admin-navbar-support')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: 'sender_role=eq.user' },
        function() {
          _state.unreadMessages++;
          updateMsgBadge(_state.unreadMessages);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_messages', filter: 'is_read=eq.true' },
        function(payload) {
          if (payload.new && payload.old && !payload.old.is_read) {
            _state.unreadMessages = Math.max(0, _state.unreadMessages - 1);
            updateMsgBadge(_state.unreadMessages);
          }
        }
      )
      .subscribe();
    _unsubscribes.push(function() { window.supabaseClient.removeChannel(supportChan); });
  }

  function showNotifToast(notif) {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML =
      '<div class="toast-icon success"><i class="fas fa-bell"></i></div>' +
      '<div class="toast-content">' +
        '<div class="toast-title">' + escapeHtml(notif.title || 'Notification') + '</div>' +
        '<div class="toast-message">' + escapeHtml(notif.message || '') + '</div>' +
      '</div>' +
      '<button class="toast-close"><i class="fas fa-times"></i></button>';
    container.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('visible'); });
    toast.querySelector('.toast-close').addEventListener('click', function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 400);
    });
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 400);
    }, 4500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ════════════════════════════════════
     BADGE UPDATES
     ════════════════════════════════════ */
  function updateNotifBadge(count) {
    var dot = document.getElementById('topbarNotifDot');
    if (dot) {
      dot.style.display = count > 0 ? '' : 'none';
    }
  }

  function updateMsgBadge(count) {
    var badge = document.getElementById('topbarMsgBadge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? '' : 'none';
    }
  }

  /* ════════════════════════════════════
     DROPDOWN
     ════════════════════════════════════ */
  function initDropdown() {
    var avatar = document.getElementById('adminAvatar');
    var dropdown = document.getElementById('avatarDropdown');
    if (!avatar || !dropdown) return;

    avatar.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = dropdown.classList.contains('show');
      dropdown.classList.toggle('show');
      avatar.setAttribute('aria-expanded', !isOpen);
      _state.dropdownOpen = !isOpen;
    });

    avatar.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        avatar.click();
      }
    });

    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target) && !avatar.contains(e.target)) {
        dropdown.classList.remove('show');
        avatar.setAttribute('aria-expanded', 'false');
        _state.dropdownOpen = false;
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        dropdown.classList.remove('show');
        avatar.setAttribute('aria-expanded', 'false');
        _state.dropdownOpen = false;
      }
    });

    /* Dropdown action handlers */
    document.querySelectorAll('.dropdown-item[data-action]').forEach(function(item) {
      item.addEventListener('click', function(e) {
        dropdown.classList.remove('show');
        avatar.setAttribute('aria-expanded', 'false');
        _state.dropdownOpen = false;

        var action = this.dataset.action;

        if (action === 'profile') {
          window.location.href = 'profile.html';
          return;
        }

        if (action === 'settings') {
          switchToSettingsPage();
          return;
        }

        if (action === 'logout') {
          e.preventDefault();
          this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing out...';
          NAGRIVA_AdminNavbar.signOut();
        }
      });
    });
  }

  function switchToSettingsPage() {
    var pages = document.querySelectorAll('.page');
    pages.forEach(function(p) { p.classList.remove('active'); });
    var target = document.getElementById('page-settings');
    if (target) target.classList.add('active');
    var sidebarItems = document.querySelectorAll('.sidebar-item[data-page]');
    sidebarItems.forEach(function(item) { item.classList.remove('active'); });
    var activeItem = document.querySelector('.sidebar-item[data-page="settings"]');
    if (activeItem) activeItem.classList.add('active');
    var topbarTitle = document.querySelector('.topbar-title');
    if (topbarTitle) topbarTitle.innerHTML = 'Settings <span>/ overview</span>';
  }

  /* ════════════════════════════════════
     NOTIFICATION BELL CLICK
     ════════════════════════════════════ */
  function initNotificationBtn() {
    var btn = document.getElementById('topbarNotifBtn');
    if (!btn) return;

    btn.addEventListener('click', function(e) {
      e.stopPropagation();

      if (typeof NAGRIVA_NotificationsDropdown !== 'undefined') {
        NAGRIVA_NotificationsDropdown.toggle();
        return;
      }

      var notifCard = document.querySelector('.notif-list');
      if (notifCard) {
        var card = notifCard.closest('.card');
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.borderColor = 'rgba(59,130,246,0.3)';
          setTimeout(function() { card.style.borderColor = ''; }, 2000);
        }
      }
    });
  }

  /* ════════════════════════════════════
     REFRESH ON TAB VISIBLE
     ════════════════════════════════════ */
  function initVisibilityRefresh() {
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && _state.userId) {
        refreshCounts();
      }
    });
  }

  async function refreshCounts() {
    var [notifCount, msgCount] = await Promise.all([
      _getUnreadNotificationsCount(_state.userId),
      _getUnreadMessagesCount()
    ]);
    _state.unreadNotifications = notifCount;
    _state.unreadMessages = msgCount;
    updateNotifBadge(notifCount);
    updateMsgBadge(msgCount);
  }

  /* ════════════════════════════════════
     PUBLIC SIGN OUT
     ════════════════════════════════════ */
  async function signOut() {
    try {
      await window.supabaseClient.auth.signOut();
    } catch (e) {
      console.warn('[AdminNavbar] signOut error:', e);
    }
    window.location.href = 'login.html';
  }

  /* ════════════════════════════════════
     PUBLIC INIT
     ════════════════════════════════════ */
  /* ════════════════════════════════════
     SIDEBAR PROFILE DROPDOWN
     ════════════════════════════════════ */
  function initSidebarDropdown() {
    var profile = document.getElementById('sidebarProfile');
    var dropdown = document.getElementById('sidebarProfileDropdown');
    if (!profile || !dropdown) return;

    profile.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = dropdown.classList.contains('show');
      dropdown.classList.toggle('show');
      profile.classList.toggle('active', !isOpen);
      profile.setAttribute('aria-expanded', !isOpen);
      _state.dropdownOpen = !isOpen;
    });

    profile.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        profile.click();
      }
    });

    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target) && !profile.contains(e.target)) {
        dropdown.classList.remove('show');
        profile.classList.remove('active');
        profile.setAttribute('aria-expanded', 'false');
        _state.dropdownOpen = false;
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        dropdown.classList.remove('show');
        profile.classList.remove('active');
        profile.setAttribute('aria-expanded', 'false');
        _state.dropdownOpen = false;
      }
    });

    dropdown.querySelectorAll('.sidebar-profile-item[data-action]').forEach(function(item) {
      item.addEventListener('click', function(e) {
        dropdown.classList.remove('show');
        profile.classList.remove('active');
        profile.setAttribute('aria-expanded', 'false');
        _state.dropdownOpen = false;

        var action = this.dataset.action;

        if (action === 'profile') {
          window.location.href = 'profile.html';
          return;
        }

        if (action === 'settings') {
          switchToSettingsPage();
          return;
        }

        if (action === 'notifications') {
          var notifBtn = document.getElementById('topbarNotifBtn');
          if (notifBtn) notifBtn.click();
          return;
        }

        if (action === 'logout') {
          e.preventDefault();
          this.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Signing out...</span>';
          NAGRIVA_AdminNavbar.signOut();
        }
      });
    });
  }

  async function init() {
    if (_initialized) return;
    _initialized = true;

    await loadInitialData();
    subscribeAll();
    initDropdown();
    initSidebarDropdown();
    initNotificationBtn();
    initVisibilityRefresh();
  }

  function destroy() {
    _unsubscribes.forEach(function(fn) { fn(); });
    _unsubscribes = [];
    _initialized = false;
  }

  /* ─── Auto-init ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init: init,
    destroy: destroy,
    signOut: signOut,
    refreshCounts: refreshCounts,
    getState: function() { return { ..._state }; }
  };
})();
