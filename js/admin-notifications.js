const NAGRIVA_Notifications = (() => {
  let notifications = [];
  let unreadCount = 0;
  let onChangeCallbacks = [];
  let realtimeChannel = null;
  let _loading = false;
  let _error = null;
  let _mounted = false;

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getTypeIcon(type) {
    const map = {
      project_update: 'fa-sync',
      message: 'fa-comment',
      payment: 'fa-credit-card',
      report: 'fa-chart-bar',
      milestone: 'fa-trophy',
      file: 'fa-file',
      status: 'fa-tag'
    };
    return map[type] || 'fa-bell';
  }

  function getTypeColor(type) {
    const map = {
      project_update: 'teal',
      message: 'blue',
      payment: 'green',
      report: 'orange',
      milestone: 'purple',
      file: 'orange',
      status: 'blue'
    };
    return map[type] || 'teal';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(title, message, type, link) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icons = {
      project_update: 'fa-sync',
      message: 'fa-comment',
      payment: 'fa-credit-card',
      milestone: 'fa-trophy',
      file: 'fa-file',
      status: 'fa-tag'
    };
    toast.innerHTML = `
      <div class="toast-icon success"><i class="fas ${icons[type] || 'fa-bell'}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
      <button class="toast-close"><i class="fas fa-times"></i></button>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    });
    if (link) {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', function(e) {
        if (e.target.closest('.toast-close')) return;
        if (link) window.location.href = link;
      });
    }
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  }

  async function init() {
    _loading = true;
    _error = null;
    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) {
        _loading = false;
        return;
      }
      const { data } = await window.supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      notifications = data || [];
      unreadCount = notifications.filter(n => !n.is_read).length;
      _loading = false;
      updateBadges();
      notifyChange();
      if (!_mounted) {
        setupRealtime(user.id);
        _mounted = true;
      }
    } catch (err) {
      _loading = false;
      _error = err;
      console.error('[Notifications] init failed:', err);
    }
  }

  function setupRealtime(userId) {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    realtimeChannel = window.supabaseClient
      .channel('admin-notifications-changes')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=eq.' + userId
        },
        (payload) => {
          const notif = payload.new;
          notifications.unshift(notif);
          if (!notif.is_read) {
            unreadCount++;
            showToast(notif.title, notif.message, notif.type, notif.link);
          }
          updateBadges();
          notifyChange();
          const container = document.getElementById('notificationsList');
          if (container) renderNotifications(container);
        }
      )
      .subscribe();
  }

  function updateBadges() {
    const notifDot = document.querySelector('.topbar-btn .notif-dot');
    if (notifDot) {
      notifDot.style.display = unreadCount > 0 ? '' : 'none';
    }
    const sidebarNotif = document.querySelector('.sidebar-item[data-page="notifications"] .badge-count');
    if (sidebarNotif) {
      sidebarNotif.textContent = unreadCount;
      sidebarNotif.style.display = unreadCount > 0 ? '' : 'none';
    }
  }

  function getNotifications() {
    return [...notifications];
  }

  function getUnreadCount() {
    return unreadCount;
  }

  async function markAsRead(notifId) {
    const { error } = await window.supabaseClient
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId);
    if (error) throw error;
    const idx = notifications.findIndex(n => n.id === notifId);
    if (idx !== -1) {
      const wasUnread = !notifications[idx].is_read;
      notifications[idx].is_read = true;
      if (wasUnread) unreadCount = Math.max(0, unreadCount - 1);
    }
    updateBadges();
    notifyChange();
  }

  async function markAllAsRead() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;
    const { error } = await window.supabaseClient
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) throw error;
    notifications.forEach(n => { n.is_read = true; });
    unreadCount = 0;
    updateBadges();
    notifyChange();
    const container = document.getElementById('notificationsList');
    if (container) renderNotifications(container);
  }

  function renderNotifications(container, maxItems) {
    if (!container) return;
    const items = maxItems ? notifications.slice(0, maxItems) : notifications;
    if (items.length === 0) {
      container.innerHTML = `
        <div style="padding:24px;text-align:center;color:var(--gray3);font-size:0.82rem;">
          <i class="fas fa-bell" style="font-size:1.5rem;margin-bottom:8px;display:block;"></i>
          No notifications yet
        </div>`;
      return;
    }
    container.innerHTML = items.map(n => `
      <div class="notif-item" data-id="${n.id}" style="${n.is_read ? '' : 'background:var(--accent-glow);border-radius:var(--r-xs);padding:12px;'}cursor:pointer;">
        <div class="notif-icon-wrap ${getTypeColor(n.type)}"><i class="fas ${getTypeIcon(n.type)}"></i></div>
        <div class="notif-content" onclick="${n.link ? "window.location.href='" + n.link + "'" : ''}">
          <div class="notif-text"><strong>${escapeHtml(n.title)}</strong> — ${escapeHtml(n.message)}</div>
          <div class="notif-time">${formatDate(n.created_at)}${!n.is_read ? ' <span style="color:var(--accent);font-weight:500;">· New</span>' : ''}</div>
        </div>
        ${n.is_read ? '' : '<button class="td-action-btn" data-action="mark-read" data-id="' + n.id + '" title="Mark read" style="flex-shrink:0;"><i class="fas fa-check" style="font-size:0.65rem;"></i></button>'}
      </div>`).join('');
  }

  function onChange(cb) {
    onChangeCallbacks.push(cb);
    return () => {
      onChangeCallbacks = onChangeCallbacks.filter(fn => fn !== cb);
    };
  }

  function notifyChange() {
    onChangeCallbacks.forEach(fn => fn([...notifications], unreadCount));
  }

  function destroy() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    onChangeCallbacks = [];
    notifications = [];
    unreadCount = 0;
    _mounted = false;
  }

  return {
    init,
    markAsRead,
    markAllAsRead,
    getNotifications,
    getUnreadCount,
    renderNotifications,
    onChange,
    formatDate,
    getTypeIcon,
    getTypeColor,
    destroy,
    get loading() { return _loading; },
    get error() { return _error; }
  };
})();
