/* ════════════════════════════════════════════════════════
   NAGRIVA — Client Details Drawer
   client-drawer.js
   ════════════════════════════════════════════════════════ */

const NAGRIVA_ClientDrawer = (() => {
  let _drawerEl = null;
  let _overlayEl = null;
  let _bodyEl = null;
  let _clientId = null;
  let _profile = null;
  let _orders = [];
  let _activities = [];
  let _loading = false;
  let _error = null;
  let _realtimeChannel = null;
  let _initialized = false;
  let _open = false;

  function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  function getAvatarClass(name) {
    const classes = ['a1','a2','a3','a4','a5','a6'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
    return classes[Math.abs(hash) % classes.length];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '$0';
    return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
    return formatDate(dateStr);
  }

  function getStatusConfig(status) {
    const map = {
      pending:     { dot: 'orange', cls: 'pending',     label: 'Pending' },
      in_progress: { dot: 'blue',   cls: 'in_progress', label: 'In Progress' },
      review:      { dot: 'orange', cls: 'pending',     label: 'Review' },
      revision:    { dot: 'orange', cls: 'revision',    label: 'Revision' },
      delivered:   { dot: 'teal',   cls: 'completed',   label: 'Delivered' },
      completed:   { dot: 'teal',   cls: 'completed',   label: 'Completed' },
      cancelled:   { dot: 'gray',   cls: 'neutral',     label: 'Cancelled' }
    };
    return map[status] || { dot: 'gray', cls: 'neutral', label: status || 'Unknown' };
  }

  function getStatusBadge(status) {
    const cfg = getStatusConfig(status);
    return `<span class="cd-order-status ${cfg.cls}">${cfg.label}</span>`;
  }

  /* ─── Fetch client profile ─── */
  async function fetchProfile(clientId) {
    const { data, error } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', clientId)
      .single();
    if (error) throw error;
    return data;
  }

  /* ─── Fetch all orders for client ─── */
  async function fetchOrders(clientId) {
    const { data, error } = await window.supabaseClient
      .from('orders')
      .select('*')
      .or(`user_id.eq.${clientId},client_id.eq.${clientId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /* ─── Fetch activity for client's orders ─── */
  async function fetchActivity(orders) {
    if (!orders || orders.length === 0) return [];
    const orderIds = orders.slice(0, 20).map(o => o.id);
    const { data, error } = await window.supabaseClient
      .from('activity_log')
      .select('*')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) {
      console.warn('[ClientDrawer] Activity fetch error:', error.message);
      return [];
    }
    return data || [];
  }

  async function fetchData(clientId) {
    _loading = true;
    _error = null;
    renderSkeleton();
    try {
      const [profile, orders] = await Promise.all([
        fetchProfile(clientId),
        fetchOrders(clientId)
      ]);
      _profile = profile;
      _orders = orders;

      const activities = await fetchActivity(orders);
      _activities = activities;

      _loading = false;
      renderContent();
      setupRealtime(clientId);
    } catch (err) {
      _loading = false;
      _error = err;
      console.error('[ClientDrawer] fetch failed:', err);
      renderError(err);
    }
  }

  /* ─── Render skeleton ─── */
  function renderSkeleton() {
    if (!_bodyEl) return;
    _bodyEl.innerHTML = `
      <div class="cd-skeleton">
        <div class="cd-skeleton-row">
          <div class="cd-skeleton-circle"></div>
          <div style="flex:1;">
            <div class="cd-skeleton-line w70 h24 mb8"></div>
            <div class="cd-skeleton-line w50 h10"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0;">
          <div class="cd-skeleton-line h32"></div>
          <div class="cd-skeleton-line h32"></div>
          <div class="cd-skeleton-line h32"></div>
          <div class="cd-skeleton-line h32"></div>
        </div>
        <div class="cd-skeleton-line w40 h10 mb12"></div>
        <div class="cd-skeleton-line w100 h10 mb8"></div>
        <div class="cd-skeleton-line w100 h10 mb8"></div>
        <div class="cd-skeleton-line w60 h10 mb16"></div>
        <div class="cd-skeleton-line w40 h10 mb12"></div>
        <div class="cd-skeleton-line w100 h10 mb8"></div>
        <div class="cd-skeleton-line w50 h10"></div>
      </div>`;
  }

  /* ─── Render content ─── */
  function renderContent() {
    if (!_bodyEl || !_profile) return;

    const name = _profile.full_name || 'Unknown';
    const email = _profile.email || '';
    const avatarUrl = _profile.avatar_url || '';

    const totalOrders = _orders.length;
    const totalRevenue = _orders.reduce((sum, o) => sum + Number(o.budget || 0), 0);
    const completedOrders = _orders.filter(o =>
      o.status === 'completed' || o.status === 'delivered'
    ).length;
    const latestOrder = _orders.length > 0 ? _orders[0] : null;
    const lastActive = _profile.last_active || _profile.updated_at || _profile.created_at;

    const recentOrders = _orders.slice(0, 5);

    const avatarHtml = avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" alt="" class="cd-avatar-img" />`
      : `<div class="td-avatar ${getAvatarClass(name)}" style="width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;color:var(--bg);">${getInitials(name)}</div>`;

    const ordersHtml = recentOrders.length > 0
      ? recentOrders.map(o => {
          const cfg = getStatusConfig(o.status);
          return `
            <div class="cd-order-item">
              <div class="cd-order-dot ${cfg.dot}"></div>
              <div class="cd-order-info">
                <div class="cd-order-service">
                  ${escapeHtml(o.project_title || o.service_type || o.service || 'Order')}
                  <span class="cd-order-amount">${formatCurrency(o.budget)}</span>
                </div>
                <div class="cd-order-meta">
                  <span>${formatDate(o.created_at)}</span>
                  ${getStatusBadge(o.status)}
                </div>
              </div>
            </div>`;
        }).join('')
      : NAGRIVA_EmptyState.render({ icon: 'fas fa-shopping-bag', title: 'No orders yet', description: 'This client hasn\'t placed any orders yet.', variant: 'sm' });

    const activityHtml = _activities.length > 0
      ? _activities.map(a => {
          const icon = a.action === 'order_created' || a.action === 'status_changed'
            ? 'fa-sync-alt'
            : a.action === 'message_sent'
              ? 'fa-comment'
              : a.action === 'file_uploaded'
                ? 'fa-file-upload'
                : 'fa-clock';
          return `
            <div class="cd-activity-item">
              <div class="cd-activity-icon"><i class="fas ${icon}"></i></div>
              <div class="cd-activity-content">
                <div class="cd-activity-text">${escapeHtml(a.description || a.action || 'Activity')}</div>
                <div class="cd-activity-time">${timeAgo(a.created_at)}</div>
              </div>
            </div>`;
        }).join('')
      : NAGRIVA_EmptyState.render({ icon: 'fas fa-history', title: 'No recent activity', description: 'No recent activity recorded for this client.', variant: 'sm' });

    const statusBadge = latestOrder
      ? getStatusBadge(latestOrder.status)
      : '<span class="cd-badge cd-badge-neutral"><span class="cd-badge-dot"></span>No orders yet</span>';

    _bodyEl.innerHTML = `
      <div class="cd-profile">
        ${avatarHtml}
        <div class="cd-profile-info">
          <div class="cd-profile-name">${escapeHtml(name)}</div>
          <div class="cd-profile-email">${escapeHtml(email)}</div>
          <div class="cd-profile-meta">
            ${statusBadge}
            <span class="cd-last-active"><i class="fas fa-clock"></i> ${timeAgo(lastActive)}</span>
          </div>
        </div>
      </div>

      <div class="cd-stats">
        <div class="cd-stat-card">
          <div class="cd-stat-value">${totalOrders}</div>
          <div class="cd-stat-label">Total Orders</div>
        </div>
        <div class="cd-stat-card">
          <div class="cd-stat-value accent">${formatCurrency(totalRevenue)}</div>
          <div class="cd-stat-label">Total Revenue</div>
        </div>
        <div class="cd-stat-card">
          <div class="cd-stat-value">${completedOrders}</div>
          <div class="cd-stat-label">Completed</div>
        </div>
        <div class="cd-stat-card">
          <div class="cd-stat-value">${_orders.length > 0 ? _orders.filter(o => o.status === 'in_progress' || o.status === 'review').length : 0}</div>
          <div class="cd-stat-label">In Progress</div>
        </div>
      </div>

      <div class="cd-section">
        <div class="cd-section-header">
          <div class="cd-section-title">Recent Orders</div>
          <span class="cd-section-count">${_orders.length} total</span>
        </div>
        <div id="cd-recent-orders">${ordersHtml}</div>
      </div>

      <div class="cd-section">
        <div class="cd-section-header">
          <div class="cd-section-title">Recent Activity</div>
        </div>
        <div id="cd-activity-feed">${activityHtml}</div>
      </div>`;
  }

  /* ─── Render error ─── */
  function renderError(err) {
    if (!_bodyEl) return;
    _bodyEl.innerHTML = NAGRIVA_EmptyState.render({
      icon: 'fas fa-exclamation-triangle',
      title: 'Failed to Load Client',
      description: escapeHtml(err.message || 'Could not connect to database.'),
      variant: 'error',
      primaryCta: { icon: 'fas fa-sync', label: 'Retry', onclick: '' }
    });
    const retry = _bodyEl.querySelector('#cdRetryBtn');
    if (retry) {
      retry.addEventListener('click', () => {
        if (_clientId) fetchData(_clientId);
      });
    }
  }

  /* ─── Realtime ─── */
  function setupRealtime(clientId) {
    teardownRealtime();
    _realtimeChannel = window.supabaseClient
      .channel('client-drawer-' + clientId)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders',
          filter: 'user_id=eq.' + clientId },
        async () => {
          if (_clientId === clientId && _open) {
            try {
              const orders = await fetchOrders(clientId);
              _orders = orders;
              if (_open && _clientId === clientId) renderContent();
            } catch (e) {
              console.warn('[ClientDrawer] Realtime orders sync:', e.message);
            }
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles',
          filter: 'id=eq.' + clientId },
        async () => {
          if (_clientId === clientId && _open) {
            try {
              const profile = await fetchProfile(clientId);
              _profile = profile;
              if (_open && _clientId === clientId) renderContent();
            } catch (e) {
              console.warn('[ClientDrawer] Realtime profile sync:', e.message);
            }
          }
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        async (payload) => {
          if (!_open || _clientId !== clientId) return;
          try {
            const orderIds = _orders.slice(0, 20).map(o => o.id);
            if (orderIds.includes(payload.new.order_id)) {
              const activities = await fetchActivity(_orders);
              _activities = activities;
              if (_open && _clientId === clientId) renderContent();
            }
          } catch (e) {
            console.warn('[ClientDrawer] Realtime activity sync:', e.message);
          }
        }
      )
      .subscribe();
  }

  function teardownRealtime() {
    if (_realtimeChannel) {
      window.supabaseClient.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }
  }

  /* ─── Open / Close ─── */
  function open(clientId) {
    if (!_initialized) init();
    if (!clientId) return;
    if (_clientId === clientId && _open) return;

    _clientId = clientId;
    _open = true;

    document.body.style.overflow = 'hidden';
    _overlayEl.classList.add('active');
    _drawerEl.classList.add('open');

    fetchData(clientId);
  }

  function close() {
    _open = false;
    _clientId = null;
    _profile = null;
    _orders = [];
    _activities = [];
    teardownRealtime();

    document.body.style.overflow = '';
    _overlayEl.classList.remove('active');
    _drawerEl.classList.remove('open');

    if (_bodyEl) {
      _bodyEl.innerHTML = '';
    }
  }

  /* ─── Init: create DOM structure ─── */
  function init() {
    if (_initialized) return;

    _overlayEl = document.createElement('div');
    _overlayEl.className = 'cd-overlay';
    _overlayEl.id = 'cdOverlay';

    _drawerEl = document.createElement('div');
    _drawerEl.className = 'cd-drawer';
    _drawerEl.id = 'cdDrawer';
    _drawerEl.innerHTML = `
      <div class="cd-header">
        <div class="cd-header-title">Client <span>Details</span></div>
        <button class="cd-close-btn" id="cdCloseBtn"><i class="fas fa-times"></i></button>
      </div>
      <div class="cd-body" id="cdBody"></div>`;

    document.body.appendChild(_overlayEl);
    document.body.appendChild(_drawerEl);

    _bodyEl = _drawerEl.querySelector('#cdBody');

    const closeBtn = _drawerEl.querySelector('#cdCloseBtn');
    closeBtn.addEventListener('click', close);

    _overlayEl.addEventListener('click', function(e) {
      if (e.target === _overlayEl) close();
    });

    document.addEventListener('keydown', _onKeyDown);

    _initialized = true;
  }

  function _onKeyDown(e) {
    if (e.key === 'Escape' && _open) {
      close();
    }
  }

  function destroy() {
    teardownRealtime();
    if (_drawerEl && _drawerEl.parentNode) _drawerEl.parentNode.removeChild(_drawerEl);
    if (_overlayEl && _overlayEl.parentNode) _overlayEl.parentNode.removeChild(_overlayEl);
    document.removeEventListener('keydown', _onKeyDown);
    _drawerEl = null;
    _overlayEl = null;
    _bodyEl = null;
    _initialized = false;
    _open = false;
    _clientId = null;
    _profile = null;
    _orders = [];
    _activities = [];
  }

  return {
    init,
    open,
    close,
    destroy,
    get isOpen() { return _open; },
    get clientId() { return _clientId; }
  };
})();
