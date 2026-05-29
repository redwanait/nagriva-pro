/* ════════════════════════════════════════════════════════
   NAGRIVA — Premium Notifications Dropdown
   notifications-dropdown.js
   Standalone component — injects into navbar
════════════════════════════════════════════════════════ */

const NAGRIVA_NotificationsDropdown = (() => {
  'use strict';

  let _initialized = false;
  let _open = false;
  let _notifications = [];
  let _unreadCount = 0;
  let _loading = true;
  let _error = null;
  let _unsubInsert = null;
  let _unsubUpdate = null;
  let _unsubChange = null;
  let _currentUserId = null;

  /* ─── DOM refs ─── */
  let _bell = null;
  let _badge = null;
  let _dropdown = null;
  let _list = null;
  let _markAllBtn = null;

  /* ─── Helpers ─── */
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = Date.now();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getTypeIcon(type) {
    const map = {
      project_update: 'M13 2L2 14h9l-1 8 11-12h-9l1-8z',
      message: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
      payment: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z',
      report: 'M18 20V10M12 20V4M6 20v-6',
      milestone: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6',
      status: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      invoice_created: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      invoice_updated: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      invoice_paid: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z',
      invoice_overdue: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      invoice_deleted: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
    };
    return map[type] || 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0';
  }

  function getTypeColor(type) {
    const map = {
      project_update: 'teal',
      message: 'blue',
      payment: 'green',
      report: 'orange',
      milestone: 'purple',
      file: 'orange',
      status: 'blue',
      invoice_created: 'teal',
      invoice_updated: 'blue',
      invoice_paid: 'green',
      invoice_overdue: 'orange',
      invoice_deleted: 'gray'
    };
    return map[type] || 'teal';
  }

  /* ─── Inject bell into navbar ─── */
  function injectBell() {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return false;

    const userAvatar = document.getElementById('userAvatar');
    if (!userAvatar) return false;

    _bell = document.createElement('button');
    _bell.className = 'notif-bell';
    _bell.id = 'notifBell';
    _bell.setAttribute('aria-label', 'Notifications');
    _bell.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>' +
        '<path d="M13.73 21a2 2 0 01-3.46 0"/>' +
      '</svg>';

    _badge = document.createElement('span');
    _badge.className = 'notif-bell-badge';
    _badge.id = 'notifBellBadge';
    _badge.textContent = '0';
    _bell.appendChild(_badge);

    navRight.insertBefore(_bell, userAvatar);

    _bell.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });

    return true;
  }

  /* ─── Create dropdown DOM ─── */
  function createDropdown() {
    if (_dropdown) return;

    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    /* Overlay to catch clicks outside */
    const overlay = document.createElement('div');
    overlay.className = 'notif-dropdown-overlay';
    overlay.id = 'notifDropdownOverlay';
    overlay.addEventListener('click', close);

    /* Dropdown panel */
    _dropdown = document.createElement('div');
    _dropdown.className = 'notif-dropdown';
    _dropdown.id = 'notifDropdown';

    _dropdown.innerHTML =
      '<div class="notif-dropdown-header">' +
        '<div class="notif-dropdown-title">' +
          'Notifications' +
          '<span class="notif-dropdown-count" id="notifDDCount">0</span>' +
        '</div>' +
        '<div class="notif-dropdown-actions">' +
          '<button class="notif-mark-all-btn" id="notifMarkAllBtn">Mark all read</button>' +
        '</div>' +
      '</div>' +
      '<div class="notif-dropdown-list" id="notifDDList"></div>' +
      '<div class="notif-dropdown-footer">' +
        '<button class="notif-view-all-btn" id="notifViewAllBtn">' +
          'View all notifications' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
        '</button>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(_dropdown);

    _list = document.getElementById('notifDDList');
    _markAllBtn = document.getElementById('notifMarkAllBtn');

    _markAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleMarkAllRead();
    });

    document.getElementById('notifViewAllBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      close();
      const target = document.querySelector('.user-dropdown-item[onclick*="notifications"], a[href*="notifications"]');
      if (target) {
        target.click();
      } else {
        window.location.href = '/pages/notifications.html';
      }
    });

    /* Close on Escape */
    document.addEventListener('keydown', _onKeyDown);
  }

  function _onKeyDown(e) {
    if (e.key === 'Escape' && _open) close();
  }

  /* ─── Position dropdown ─── */
  function positionDropdown() {
    if (!_bell || !_dropdown) return;
    const rect = _bell.getBoundingClientRect();
    _dropdown.style.position = 'fixed';
    _dropdown.style.top = (rect.bottom + 8) + 'px';
    _dropdown.style.right = (window.innerWidth - rect.right + 8) + 'px';
  }

  /* ─── Toggle ─── */
  function toggle() {
    _open ? close() : open();
  }

  function open() {
    if (_open) return;
    _open = true;

    createDropdown();
    positionDropdown();

    _bell.classList.add('active');

    /* Get the overlay */
    const overlay = document.getElementById('notifDropdownOverlay');
    if (overlay) overlay.style.pointerEvents = 'all';

    requestAnimationFrame(() => {
      _dropdown.classList.add('open');
    });

    /* Refresh data if stale */
    if (!_loading && _notifications.length === 0 && !_error) {
      loadNotifications();
    }
  }

  function close() {
    if (!_open) return;
    _open = false;

    _bell.classList.remove('active');

    if (_dropdown) _dropdown.classList.remove('open');

    const overlay = document.getElementById('notifDropdownOverlay');
    if (overlay) overlay.style.pointerEvents = 'none';
  }

  /* ─── Load notifications ─── */
  async function loadNotifications() {
    if (!_currentUserId) {
      try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;
        _currentUserId = user.id;
      } catch {
        return;
      }
    }

    _loading = true;
    _error = null;
    renderSkeletons();

    try {
      if (typeof NAGRIVA_NotificationsAPI !== 'undefined') {
        _notifications = await NAGRIVA_NotificationsAPI.fetchNotifications(_currentUserId);
      } else {
        const { data, error } = await window.supabaseClient
          .from('notifications')
          .select('*')
          .eq('user_id', _currentUserId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        _notifications = data || [];
      }
      _unreadCount = _notifications.filter(n => !n.is_read).length;
      _loading = false;
      render();
      updateBadge();
    } catch (err) {
      _loading = false;
      _error = err;
      console.error('[NotificationsDropdown] Load error:', err);
      renderError(err);
    }
  }

  /* ─── Mark as read ─── */
  async function handleMarkRead(id) {
    try {
      if (typeof NAGRIVA_NotificationsAPI !== 'undefined') {
        await NAGRIVA_NotificationsAPI.markAsRead(id);
      } else {
        await window.supabaseClient
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id);
      }
      const n = _notifications.find(n => n.id === id);
      if (n && !n.is_read) {
        n.is_read = true;
        _unreadCount = Math.max(0, _unreadCount - 1);
      }
      render();
      updateBadge();
    } catch (err) {
      console.error('[NotificationsDropdown] Mark read error:', err);
    }
  }

  /* ─── Mark all as read ─── */
  async function handleMarkAllRead() {
    if (!_currentUserId || _unreadCount === 0) return;

    _markAllBtn.disabled = true;

    try {
      if (typeof NAGRIVA_NotificationsAPI !== 'undefined') {
        await NAGRIVA_NotificationsAPI.markAllAsRead(_currentUserId);
      } else {
        await window.supabaseClient
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', _currentUserId)
          .eq('is_read', false);
      }
      _notifications.forEach(n => { n.is_read = true; });
      _unreadCount = 0;
      render();
      updateBadge();
    } catch (err) {
      console.error('[NotificationsDropdown] Mark all read error:', err);
    } finally {
      _markAllBtn.disabled = false;
    }
  }

  /* ─── Render ─── */
  function render() {
    if (!_list) return;

    if (_error) {
      renderError(_error);
      return;
    }

    if (_notifications.length === 0) {
      renderEmpty();
      return;
    }

    const items = _notifications.slice(0, 10);

    _list.innerHTML = items.map(n => {
      const isUnread = !n.is_read;
      return (
        '<div class="notif-dd-item' + (isUnread ? ' unread' : '') + '" data-id="' + n.id + '" data-link="' + escapeHtml(n.link || '') + '">' +
          '<div class="notif-dd-icon ' + getTypeColor(n.type) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + getTypeIcon(n.type) + '"/></svg>' +
          '</div>' +
          '<div class="notif-dd-content">' +
            '<div class="notif-dd-title">' + escapeHtml(n.title) + '</div>' +
            '<div class="notif-dd-message">' + escapeHtml(n.message) + '</div>' +
            '<div class="notif-dd-time">' +
              '<span class="notif-dd-unread-dot"></span>' +
              timeAgo(n.created_at) +
            '</div>' +
          '</div>' +
          (isUnread
            ? '<button class="notif-dd-mark-btn" data-action="mark-read" data-id="' + n.id + '" title="Mark as read">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
              '</button>'
            : '') +
        '</div>'
      );
    }).join('');

    /* Event delegation for mark-as-read buttons */
    _list.querySelectorAll('[data-action="mark-read"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (id) handleMarkRead(id);
      });
    });

    /* Click on notification item */
    _list.querySelectorAll('.notif-dd-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="mark-read"]')) return;
        const id = item.dataset.id;
        const link = item.dataset.link;

        /* Auto-mark as read on click */
        const n = _notifications.find(n => n.id === id);
        if (n && !n.is_read) {
          handleMarkRead(id);
        }

        if (link) {
          close();
          window.location.href = link;
        }
      });
    });

    const countLabel = document.getElementById('notifDDCount');
    if (countLabel) {
      countLabel.textContent = _unreadCount > 0 ? _unreadCount : '';
    }

    _markAllBtn.disabled = _unreadCount === 0;
  }

  /* ─── Empty State ─── */
  function renderEmpty() {
    if (!_list) return;
    _list.innerHTML = NAGRIVA_EmptyState.render({
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
      title: 'All caught up!',
      description: 'You\'re up to date. New notifications will appear here as they arrive.',
      variant: 'sm'
    });
    const countLabel = document.getElementById('notifDDCount');
    if (countLabel) countLabel.textContent = '';
    if (_markAllBtn) _markAllBtn.disabled = true;
  }

  /* ─── Skeletons ─── */
  function renderSkeletons() {
    if (!_list) return;
    _list.innerHTML =
      '<div class="notif-dd-skeleton">' +
        Array.from({ length: 4 }, () =>
          '<div class="notif-dd-skeleton-item">' +
            '<div class="notif-dd-skel-icon"></div>' +
            '<div class="notif-dd-skel-content">' +
              '<div class="notif-dd-skel-line w65 h12"></div>' +
              '<div class="notif-dd-skel-line w40 h10"></div>' +
              '<div class="notif-dd-skel-line w25 h8 mb0"></div>' +
            '</div>' +
          '</div>'
        ).join('') +
      '</div>';
  }

  /* ─── Error State ─── */
  function renderError(err) {
    if (!_list) return;
    _list.innerHTML = NAGRIVA_EmptyState.render({
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      title: 'Connection issue',
      description: escapeHtml(err && err.message ? err.message : 'Could not load notifications.'),
      variant: 'error'
    });
  }

  /* ─── Update badge ─── */
  function updateBadge() {
    if (!_badge) return;
    _badge.textContent = _unreadCount > 9 ? '9+' : _unreadCount;

    if (_unreadCount > 0) {
      _badge.classList.add('show');
    } else {
      _badge.classList.remove('show');
    }
  }

  /* ─── Realtime integration ─── */
  function setupRealtime() {
    if (!_currentUserId) return;

    /* Use realtime module if available */
    if (typeof NAGRIVA_NotificationsRealtime !== 'undefined') {
      NAGRIVA_NotificationsRealtime.subscribe(_currentUserId);

      _unsubInsert = NAGRIVA_NotificationsRealtime.onInsert((notification) => {
        _notifications.unshift(notification);
        if (!notification.is_read) {
          _unreadCount++;
          _badge.classList.add('pulse');
          _bell.classList.add('ring');
          setTimeout(() => {
            _bell.classList.remove('ring');
            _badge.classList.remove('pulse');
          }, 600);
        }
        updateBadge();
        if (_open) render();
      });

      _unsubUpdate = NAGRIVA_NotificationsRealtime.onUpdate((notification) => {
        const idx = _notifications.findIndex(n => n.id === notification.id);
        if (idx !== -1) {
          const wasUnread = !_notifications[idx].is_read;
          const nowRead = notification.is_read;
          _notifications[idx] = notification;
          if (wasUnread && nowRead) {
            _unreadCount = Math.max(0, _unreadCount - 1);
          } else if (!wasUnread && !nowRead) {
            _unreadCount++;
          }
        }
        updateBadge();
        if (_open) render();
      });

      return;
    }

    /* Fallback: manual subscription */
    try {
      const channel = window.supabaseClient
        .channel('notifications-dropdown-' + _currentUserId)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + _currentUserId },
          (payload) => {
            const n = payload.new;
            _notifications.unshift(n);
            if (!n.is_read) {
              _unreadCount++;
              _badge.classList.add('pulse');
              _bell.classList.add('ring');
              setTimeout(() => {
                _bell.classList.remove('ring');
                _badge.classList.remove('pulse');
              }, 600);
            }
            updateBadge();
            if (_open) render();
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + _currentUserId },
          (payload) => {
            const n = payload.new;
            const idx = _notifications.findIndex(x => x.id === n.id);
            if (idx !== -1) {
              const wasUnread = !_notifications[idx].is_read;
              _notifications[idx] = n;
              if (wasUnread && n.is_read) {
                _unreadCount = Math.max(0, _unreadCount - 1);
              }
            }
            updateBadge();
            if (_open) render();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[NotificationsDropdown] Realtime fallback error:', e);
    }
  }

  /* ─── Sync visibility with auth state ─── */
  function syncVisibility() {
    if (!_bell) return;
    const userAvatar = document.getElementById('userAvatar');
    const isVisible = userAvatar && userAvatar.classList.contains('visible');
    _bell.style.display = isVisible ? '' : 'none';
  }

  /* ─── Observe auth state changes ─── */
  function watchAuthState() {
    syncVisibility();

    const observer = new MutationObserver(() => {
      syncVisibility();
    });

    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
      observer.observe(userAvatar, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ─── Window reposition ─── */
  function onWindowResize() {
    if (_open) positionDropdown();
  }

  /* ─── Init ─── */
  let _initAttempts = 0;
  const MAX_INIT_ATTEMPTS = 10;

  async function init() {
    if (_initialized) return;

    if (_initAttempts >= MAX_INIT_ATTEMPTS) {
      console.warn('[NotificationsDropdown] Navbar not found after ' + MAX_INIT_ATTEMPTS + ' attempts — page likely uses a different layout (e.g. admin topbar). Skipping.');
      return;
    }

    const hasNavbar = document.getElementById('navbar');
    if (!hasNavbar) {
      console.warn('[NotificationsDropdown] No #navbar found — page uses different layout. Skipping initialization.');
      return;
    }

    const injected = injectBell();
    if (!injected) {
      _initAttempts++;
      setTimeout(init, 500);
      return;
    }

    createDropdown();

    /* Get current user */
    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (user) {
        _currentUserId = user.id;
      }
    } catch {
      /* Not authenticated; bell hidden until auth */
    }

    /* Load data if user is authenticated */
    if (_currentUserId) {
      await loadNotifications();
      setupRealtime();
    }

    watchAuthState();

    window.addEventListener('resize', onWindowResize);

    /* Re-observe on auth state change (Supabase) */
    if (window.supabaseClient) {
      window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          _currentUserId = session.user.id;
          _bell.style.display = '';
          loadNotifications();
          setupRealtime();
        } else if (event === 'SIGNED_OUT') {
          _currentUserId = null;
          _notifications = [];
          _unreadCount = 0;
          _bell.style.display = 'none';
          updateBadge();
          close();
        }
      });
    }

    _initialized = true;
  }

  function destroy() {
    if (_unsubInsert) { _unsubInsert(); _unsubInsert = null; }
    if (_unsubUpdate) { _unsubUpdate(); _unsubUpdate = null; }
    if (_unsubChange) { _unsubChange(); _unsubChange = null; }

    if (typeof NAGRIVA_NotificationsRealtime !== 'undefined') {
      NAGRIVA_NotificationsRealtime.unsubscribe();
    }

    window.removeEventListener('resize', onWindowResize);
    document.removeEventListener('keydown', _onKeyDown);

    if (_bell && _bell.parentNode) _bell.parentNode.removeChild(_bell);
    if (_dropdown && _dropdown.parentNode) _dropdown.parentNode.removeChild(_dropdown);

    const overlay = document.getElementById('notifDropdownOverlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);

    _initialized = false;
    _open = false;
    _bell = null;
    _badge = null;
    _dropdown = null;
    _list = null;
    _markAllBtn = null;
    _notifications = [];
    _unreadCount = 0;
  }

  /* ─── Public API ─── */
  return {
    init,
    destroy,
    open,
    close,
    toggle,
    refresh: loadNotifications,
    get isOpen() { return _open; },
    get notifications() { return [..._notifications]; },
    get unreadCount() { return _unreadCount; }
  };
})();

/* ─── Auto-init after dynamic navbar loads ─── */
(function autoInit() {
  function start() {
    NAGRIVA_NotificationsDropdown.init();
  }
  if (document.getElementById('navbar')) {
    start();
  } else {
    document.addEventListener('navbar:loaded', start, { once: true });
  }
})();
