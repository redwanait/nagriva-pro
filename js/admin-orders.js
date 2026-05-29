const NAGRIVA_AdminOrders = (() => {
  const STATUS = {
    pending:     { label: 'Pending',     color: '#f59e0b', cls: 'pending',   progress: 10  },
    in_progress: { label: 'In Progress', color: '#3b82f6', cls: 'active',    progress: 60  },
    revision:    { label: 'Revision',    color: '#a855f7', cls: 'revision',  progress: 85  },
    completed:   { label: 'Completed',   color: '#10b981', cls: 'completed', progress: 100 },
  };

  const STATUS_KEYS = Object.keys(STATUS);

  let orders = [];
  let filters = { search: '', status: '', sort: 'newest' };
  let onChangeCallbacks = [];
  let realtimeChannel = null;
  let _loading = false;
  let _error = null;

  function mapFromDB(row) {
    return {
      id: row.id,
      clientName: row.client_name || '',
      clientEmail: row.client_email || '',
      clientId: row.client_id || null,
      service: row.service || '',
      budget: Number(row.budget) || 0,
      status: row.status || 'pending',
      projectTitle: row.project_title || '',
      deadline: row.deadline || '',
      additionalNotes: row.additional_notes || '',
      createdAt: row.created_at || new Date().toISOString(),
      progress: (STATUS[row.status] && STATUS[row.status].progress) || STATUS.pending.progress,
    };
  }

  function mapToDB(data) {
    return {
      client_name: data.clientName || '',
      client_email: data.clientEmail || '',
      client_id: data.clientId || null,
      service: data.service || '',
      budget: Number(data.budget) || 0,
      status: data.status || 'pending',
      project_title: data.projectTitle || '',
      deadline: data.deadline || '',
      additional_notes: data.additionalNotes || '',
    };
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(amount) {
    return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  function getAvatarClass(name, prefix) {
    const classes = (prefix === 'table')
      ? ['a1','a2','a3','a4','a5','a6']
      : ['oca1','oca2','oca3','oca4','oca5','oca6'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
    return classes[Math.abs(hash) % classes.length];
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

  function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML = `
      <div class="toast-icon ${type}"><i class="fas ${icons[type] || icons.info}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close"><i class="fas fa-times"></i></button>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    });
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  async function fetchAllOrders() {
    try {
      const data = await NAGRIVA_OrdersAPI.fetchAllOrders();
      return (data || []).map(mapFromDB);
    } catch (error) {
      console.error('[AdminOrders] fetchAllOrders failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status: error.status,
        statusText: error.statusText
      });
      throw error;
    }
  }

  let _fetchInProgress = false;

  async function init(containerEl) {
    if (_fetchInProgress) return;
    _loading = true;
    _error = null;
    _fetchInProgress = true;
    if (containerEl) containerEl.innerHTML = renderSkeleton();

    const timeout = setTimeout(() => {
      if (_loading) {
        _loading = false;
        _fetchInProgress = false;
        _error = new Error('Loading timed out');
        console.error('[AdminOrders] Loading timed out');
        if (containerEl) {
          containerEl.innerHTML = NAGRIVA_EmptyState.render({
            icon: 'fas fa-exclamation-triangle',
            title: 'Failed to Load Orders',
            description: 'Request timed out. Please check your connection and try again.',
            variant: 'error',
            primaryCta: { icon: 'fas fa-sync', label: 'Retry', onclick: 'NAGRIVA_AdminOrders.init(document.getElementById(\'ordersContainer\'))' }
          });
        }
        showToast('error', 'Connection Error', 'Orders request timed out.');
      }
    }, 20000);

    try {
      orders = await fetchAllOrders();
      clearTimeout(timeout);
      _loading = false;
      _fetchInProgress = false;
      if (containerEl) renderOrders(containerEl, 'table');
      notifyChange();
      setupRealtime();
      setupProfilesRealtime();
    } catch (err) {
      clearTimeout(timeout);
      _loading = false;
      _fetchInProgress = false;
      _error = err;
      console.error('[AdminOrders] init failed:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        status: err.status
      });
      if (containerEl) {
        const detailMsg = err.hint || err.details || '';
        const desc = (err.message || 'Could not connect to database. Please check your connection and try again.') + (detailMsg ? ' ' + detailMsg : '');
        containerEl.innerHTML = NAGRIVA_EmptyState.render({
          icon: 'fas fa-exclamation-triangle',
          title: 'Failed to Load Orders',
          description: desc,
          variant: 'error',
          primaryCta: { icon: 'fas fa-sync', label: 'Retry', onclick: 'NAGRIVA_AdminOrders.init(document.getElementById(\'ordersContainer\'))' }
        });
      }
      showToast('error', 'Connection Error', 'Could not load orders from database.');
    }
  }

  function setupRealtime() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    realtimeChannel = window.supabaseClient
      .channel('admin-orders-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          try {
            const fresh = await fetchAllOrders();
            orders = fresh;
            notifyChange();
            const container = document.getElementById('ordersContainer');
            if (container) renderOrders(container, currentViewMode || 'table');
          } catch (e) {
            console.warn('[AdminOrders] Realtime sync error:', e.message || e);
          }
        }
      )
      .subscribe(function(status) {
        if (status === 'SUBSCRIBED') {
          console.log('[AdminOrders] Realtime channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[AdminOrders] Realtime channel error');
        } else if (status === 'TIMED_OUT') {
          console.warn('[AdminOrders] Realtime channel timed out');
        }
      });
  }

  let profilesChannel = null;

  function setupProfilesRealtime() {
    if (profilesChannel) {
      window.supabaseClient.removeChannel(profilesChannel);
      profilesChannel = null;
    }
    profilesChannel = window.supabaseClient
      .channel('admin-orders-profiles')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        async () => {
          try {
            // Re-fetch orders so client names/emails stay synced
            const fresh = await fetchAllOrders();
            orders = fresh;
            notifyChange();
            const container = document.getElementById('ordersContainer');
            if (container) renderOrders(container, currentViewMode || 'table');
          } catch (e) {
            console.warn('[AdminOrders] Profiles realtime sync error:', e.message || e);
          }
        }
      )
      .subscribe();
  }

  let currentViewMode = 'table';

  let _createInProgress = false;

  async function createOrder(data) {
    if (_createInProgress) throw new Error('A create operation is already in progress');
    _createInProgress = true;
    const payload = mapToDB(data);
    const inserted = await NAGRIVA_OrdersAPI.createOrder(payload);
    _createInProgress = false;
    const order = mapFromDB(inserted);
    orders.unshift(order);
    notifyChange();
    showToast('success', 'Order Created', `${order.clientName || order.projectTitle} \u2014 ${order.service} (${formatCurrency(order.budget)})`);

    if (typeof NAGRIVA_ActivityLogsTrigger !== 'undefined') {
      NAGRIVA_ActivityLogsTrigger.orderCreated(inserted, inserted.user_id || null).catch(function(e) {
        console.warn('[AdminOrders] Failed to trigger activity log:', e.message);
      });
    }

    if (typeof NAGRIVA_NotificationTriggers !== 'undefined') {
      const targetUserId = order.clientId || inserted.client_id;
      if (targetUserId) {
        NAGRIVA_NotificationTriggers.newOrder(inserted, targetUserId).catch(function(e) {
          console.warn('[AdminOrders] Failed to trigger new-order notification:', e.message);
        });
      }
      NAGRIVA_NotificationTriggers.notifyAdmins(
        'Order Created by Admin',
        (order.clientName || 'A client') + ' order for ' + order.service + ' was created.',
        '/pages/order-tracking.html?id=' + order.id,
        { order_id: order.id, trigger: 'new_order', source: 'admin_panel' }
      ).catch(function(e) {
        console.warn('[AdminOrders] Failed to notify admins:', e.message);
      });
    }

    return order;
  }

  let _updateInProgress = false;
  let _deleteInProgress = false;

  async function updateOrder(id, updates) {
    if (_updateInProgress) throw new Error('An update operation is already in progress');
    _updateInProgress = true;
    const payload = {};
    if (updates.clientName !== undefined) payload.client_name = updates.clientName;
    if (updates.clientEmail !== undefined) payload.client_email = updates.clientEmail;
    if (updates.clientId !== undefined) payload.client_id = updates.clientId || null;
    if (updates.service !== undefined) payload.service = updates.service;
    if (updates.budget !== undefined) payload.budget = Number(updates.budget);
    if (updates.deadline !== undefined) payload.deadline = updates.deadline;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.projectTitle !== undefined) payload.project_title = updates.projectTitle;
    if (updates.additionalNotes !== undefined) payload.additional_notes = updates.additionalNotes;

    const updated = await NAGRIVA_OrdersAPI.updateOrder(id, payload);
    _updateInProgress = false;

    const order = mapFromDB(updated);
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) orders[idx] = order;
    notifyChange();
    showToast('success', 'Order Updated', `${order.clientName || order.projectTitle} \u2014 ${order.service} updated successfully`);

    if (typeof NAGRIVA_ActivityLogsTrigger !== 'undefined') {
      var targetUserId = order.clientId || updated.client_id;
      if (updates.status) {
        NAGRIVA_ActivityLogsTrigger.statusChanged(updated, targetUserId || null, updates.status).catch(function(e) {
          console.warn('[AdminOrders] Failed to trigger status-change activity log:', e.message);
        });
      } else {
        NAGRIVA_ActivityLogsTrigger.orderUpdated(updated, targetUserId || null, 'Order details updated for ' + order.service).catch(function(e) {
          console.warn('[AdminOrders] Failed to trigger order-update activity log:', e.message);
        });
      }
    }

    if (typeof NAGRIVA_NotificationTriggers !== 'undefined') {
      var targetUserId = order.clientId || updated.client_id;
      if (targetUserId && updates.status) {
        NAGRIVA_NotificationTriggers.statusChanged(updated, targetUserId, updates.status).catch(function(e) {
          console.warn('[AdminOrders] Failed to trigger status-change notification:', e.message);
        });
      } else if (targetUserId && (updates.projectTitle || updates.budget || updates.deadline)) {
        NAGRIVA_NotificationTriggers.orderUpdated(updated, targetUserId, 'Your order details have been updated.').catch(function(e) {
          console.warn('[AdminOrders] Failed to trigger order-update notification:', e.message);
        });
      }
    }

    return order;
  }

  async function deleteOrder(id) {
    if (!id) {
      console.error('[AdminOrders] deleteOrder called with invalid id:', id);
      showToast('error', 'Delete Failed', 'Invalid order ID. Cannot delete without a valid identifier.');
      throw new Error('Invalid order ID: ' + JSON.stringify(id));
    }

    if (_deleteInProgress) {
      console.warn('[AdminOrders] deleteOrder already in progress, skipping duplicate for id:', id);
      throw new Error('A delete operation is already in progress');
    }
    _deleteInProgress = true;

    console.debug('[AdminOrders] deleteOrder — starting deletion for id:', id);

    let apiSuccess = false;
    try {
      await NAGRIVA_OrdersAPI.deleteOrder(id);
      apiSuccess = true;
      console.debug('[AdminOrders] deleteOrder — API delete succeeded for id:', id);
    } catch (err) {
      _deleteInProgress = false;
      console.error('[AdminOrders] deleteOrder failed:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        status: err.status,
        id: id,
      });
      showToast('error', 'Delete Failed', err.message || 'Could not delete order. Please check your permissions and try again.');
      throw err;
    }

    const idx = orders.findIndex(o => o.id === id);
    let removed = null;
    if (idx !== -1) removed = orders.splice(idx, 1)[0];
    notifyChange();

    if (removed) {
      showToast('success', 'Order Deleted', `${removed.clientName || removed.projectTitle} \u2014 ${removed.service}`);
    }

    try {
      const fresh = await fetchAllOrders();
      orders = fresh;
      notifyChange();

      const stillExists = fresh.some(function(o) { return o.id === id; });
      if (stillExists) {
        console.warn('[AdminOrders] Order id', id, 'still present in DB after delete — possible RLS/permission issue');
        showToast('warning', 'Sync Warning', 'Order was removed from the list but may still exist in the database. Refresh to confirm.');
      } else {
        console.debug('[AdminOrders] Verified: order id', id, 'successfully removed from database.');
      }
    } catch (refreshErr) {
      console.warn('[AdminOrders] Re-fetch after delete failed:', refreshErr.message || refreshErr);
    }

    _deleteInProgress = false;
    return true;
  }

  function getOrder(id) {
    return orders.find(o => o.id === id) || null;
  }

  function getAllOrders() {
    return [...orders];
  }

  function setSearch(query) {
    filters.search = (query || '').toLowerCase().trim();
    return getFilteredOrders();
  }

  function setStatusFilter(status) {
    filters.status = status || '';
    return getFilteredOrders();
  }

  function setSort(sort) {
    filters.sort = sort || 'newest';
    return getFilteredOrders();
  }

  function getFilteredOrders() {
    let result = [...orders];
    if (filters.search) {
      const q = filters.search;
      result = result.filter(o =>
        (o.projectTitle || '').toLowerCase().includes(q) ||
        (o.clientName || '').toLowerCase().includes(q) ||
        (o.service || '').toLowerCase().includes(q)
      );
    }
    if (filters.status && STATUS[filters.status]) {
      result = result.filter(o => o.status === filters.status);
    }
    if (filters.sort === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return result;
  }

  function getStats() {
    const total = orders.length;
    const active = orders.filter(o => o.status === 'in_progress').length;
    const revision = orders.filter(o => o.status === 'revision').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const revenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + Number(o.budget || 0), 0);
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.budget || 0), 0);
    return { total, active, revision, completed, pending, revenue, totalRevenue };
  }

  function onChange(cb) {
    onChangeCallbacks.push(cb);
    return () => {
      onChangeCallbacks = onChangeCallbacks.filter(fn => fn !== cb);
    };
  }

  function notifyChange() {
    const stats = getStats();
    onChangeCallbacks.forEach(fn => fn([...orders], stats));
  }

  function renderStatusBadge(status) {
    const cfg = STATUS[status];
    if (!cfg) return '<span class="order-status-badge pending"><span class="status-dot"></span>Unknown</span>';
    return `<span class="order-status-badge ${cfg.cls}"><span class="status-dot"></span>${cfg.label}</span>`;
  }

  function renderTableRow(order) {
    const displayName = order.clientName || order.projectTitle || 'Unknown Client';
    const subtitle = order.clientEmail || order.projectTitle;
    return `
      <tr data-id="${order.id}">
        <td>
          <div class="td-client">
            <div class="td-avatar ${getAvatarClass(displayName, 'table')}">${getInitials(displayName)}</div>
            <div class="td-client-info">
              <div class="td-name">${displayName}</div>
              <div class="td-email">${subtitle}</div>
            </div>
          </div>
        </td>
        <td><span class="td-service">${order.service}</span></td>
        <td>${renderStatusBadge(order.status)}</td>
        <td><span class="td-amount">${formatCurrency(order.budget)}</span></td>
        <td><span class="td-date">${formatDate(order.deadline)}</span></td>
        <td>
          <div class="td-actions">
            <button class="td-action-btn" data-action="edit" title="Edit">
              <i class="fas fa-pen"></i>
            </button>
            <button class="td-action-btn danger" data-action="delete" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }

  function renderCard(order) {
    const cfg = STATUS[order.status] || STATUS.pending;
    const displayName = order.clientName || order.projectTitle || 'Unknown Client';
    const subtitle = order.clientEmail || order.projectTitle;
    return `
      <div class="card order-card" data-id="${order.id}">
        <div class="order-top">
          <div class="order-client">
            <div class="order-cavatar ${getAvatarClass(displayName, 'card')}">${getInitials(displayName)}</div>
            <div class="order-cinfo">
              <h4>${displayName}</h4>
              <span>${subtitle}</span>
            </div>
          </div>
          ${renderStatusBadge(order.status)}
        </div>
        <div class="order-service">${order.service}</div>
        <div class="order-meta">
          <span class="order-deadline"><i class="far fa-calendar-alt"></i>Due ${formatDate(order.deadline)}</span>
          <span class="order-amount">${formatCurrency(order.budget)}</span>
        </div>
        <div class="order-progress">
          <div class="progress-track">
            <div class="progress-bar" style="width:${cfg.progress}%;${order.status === 'in_progress' ? 'background:linear-gradient(90deg,#3b82f6,#6366f1)' : ''}${order.status === 'revision' ? 'background:linear-gradient(90deg,#a855f7,#d946ef)' : ''}${order.status === 'pending' ? 'background:linear-gradient(90deg,#f59e0b,#f97316)' : ''}"></div>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span class="progress-name">Progress</span>
            <span class="progress-pct">${cfg.progress}%</span>
          </div>
        </div>
        <div class="order-actions">
          <button class="btn btn-secondary btn-sm order-card-action" data-action="edit"><i class="fas fa-pen"></i> Edit</button>
          <button class="btn btn-secondary btn-sm order-card-action danger-action" data-action="delete"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>`;
  }

  function renderSkeleton() {
    let html = '<div class="orders-skeleton">';
    for (let i = 0; i < 5; i++) {
      html += `
        <div class="orders-skeleton-row">
          <div class="orders-skeleton-bar row"><div class="orders-skeleton-bar circle"></div><div><div class="orders-skeleton-bar w60"></div><div class="orders-skeleton-bar w40" style="margin-top:6px;"></div></div></div>
          <div class="orders-skeleton-bar w50"></div>
          <div class="orders-skeleton-bar w40"></div>
          <div class="orders-skeleton-bar w30"></div>
          <div class="orders-skeleton-bar w40"></div>
        </div>`;
    }
    html += '</div>';
    return html;
  }

  function renderEmpty(filtered) {
    if (filtered) {
      return `
        <div class="ne ne-search">
          <div class="ne-icon"><i class="fas fa-search"></i></div>
          <h3 class="ne-title">No matching orders</h3>
          <p class="ne-desc">No orders match your current search. Try adjusting your keywords or clearing your filters to see all orders.</p>
        </div>`;
    }
    return `
      <div class="ne">
        <div class="ne-icon"><i class="fas fa-shopping-bag"></i></div>
        <h3 class="ne-title">No orders yet</h3>
        <p class="ne-desc">Create your first order to start managing client projects from one place. All order activity and updates will appear here in real time.</p>
        <div class="ne-actions">
          <button class="ne-btn ne-btn-primary empty-new-order-btn">
            <i class="fas fa-plus"></i> Create Order
          </button>
        </div>
      </div>`;
  }

  function renderOrders(container, viewMode) {
    if (!container) return;
    if (_loading) {
      container.innerHTML = renderSkeleton();
      return;
    }
    currentViewMode = viewMode || 'table';
    const filtered = getFilteredOrders();
    const countEl = document.getElementById('ordersCount');
    if (countEl) {
      countEl.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${orders.length}</strong> orders`;
    }
    if (orders.length === 0) {
      container.innerHTML = renderEmpty(false);
      return;
    }
    if (filtered.length === 0) {
      container.innerHTML = renderEmpty(true);
      return;
    }
    if (viewMode === 'card') {
      container.innerHTML = '<div class="orders-grid-view">' + filtered.map(o => renderCard(o)).join('') + '</div>';
    } else {
      container.innerHTML = `
        <div class="orders-table-wrap">
          <table class="orders-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Deadline</th>
                <th style="width:80px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(o => renderTableRow(o)).join('')}
            </tbody>
          </table>
        </div>`;
    }
  }

  function destroy() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    if (profilesChannel) {
      window.supabaseClient.removeChannel(profilesChannel);
      profilesChannel = null;
    }
    onChangeCallbacks = [];
    orders = [];
  }

  return {
    STATUS,
    STATUS_KEYS,
    init,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrder,
    getAllOrders,
    getFilteredOrders,
    getStats,
    setSearch,
    setStatusFilter,
    setSort,
    onChange,
    renderOrders,
    renderStatusBadge,
    formatDate,
    formatCurrency,
    timeAgo,
    getInitials,
    getAvatarClass,
    destroy,
    orders,
    get loading() { return _loading; },
    get error() { return _error; },
  };
})();
