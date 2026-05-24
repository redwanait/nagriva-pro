const NAGRIVA_AdminOrders = (() => {
  const STATUS = {
    pending:     { label: 'Pending',     color: '#f59e0b', cls: 'pending',   progress: 10  },
    in_progress: { label: 'In Progress', color: '#3b82f6', cls: 'active',    progress: 60  },
    review:      { label: 'Review',      color: '#a855f7', cls: 'revision',  progress: 85  },
    delivered:   { label: 'Delivered',   color: '#10b981', cls: 'completed', progress: 100 },
    cancelled:   { label: 'Cancelled',   color: '#ef4444', cls: 'pending',   progress: 0   },
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
      orderNumber: row.order_number || '',
      projectTitle: row.project_title || '',
      serviceType: row.service_type || '',
      budget: Number(row.budget) || 0,
      projectDescription: row.project_description || '',
      additionalNotes: row.additional_notes || '',
      status: row.status || 'pending',
      deadline: row.deadline || '',
      createdAt: row.created_at || new Date().toISOString(),
      progress: (STATUS[row.status] && STATUS[row.status].progress) || STATUS.pending.progress,
    };
  }

  function mapToDB(data) {
    const mapped = {
      project_title: data.projectTitle,
      service_type: data.serviceType,
      budget: Number(data.budget) || 0,
      project_description: data.projectDescription || '',
      additional_notes: data.additionalNotes || '',
      status: data.status || 'pending',
      deadline: data.deadline || '',
      order_number: generateAdminOrderNumber()
    };
    if (data.userId) mapped.user_id = data.userId;
    if (data.userEmail) mapped.user_email = data.userEmail;
    return mapped;
  }

  function generateAdminOrderNumber() {
    var year = new Date().getFullYear();
    var seq = Date.now().toString().slice(-4);
    var rand = Math.floor(10 + Math.random() * 90);
    return 'NRV-' + year + '-' + seq + rand;
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
    const { data, error } = await window.supabaseClient
      .from('orders')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapFromDB);
  }

  async function init(containerEl) {
    _loading = true;
    _error = null;
    if (containerEl) containerEl.innerHTML = renderSkeleton();
    try {
      orders = await fetchAllOrders();
      _loading = false;
      if (containerEl) renderOrders(containerEl, 'table');
      notifyChange();
      setupRealtime();
    } catch (err) {
      _loading = false;
      _error = err;
      console.error('Failed to load orders:', err);
      if (containerEl) {
        containerEl.innerHTML = `
          <div class="orders-empty">
            <div class="orders-empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <h3>Failed to Load Orders</h3>
            <p>${err.message || 'Could not connect to database. Please check your connection and try again.'}</p>
            <button class="btn btn-primary empty-new-order-btn" style="margin-top:20px;" onclick="NAGRIVA_AdminOrders.init(document.getElementById('ordersContainer'))">
              <i class="fas fa-sync"></i> Retry
            </button>
          </div>`;
      }
      showToast('error', 'Connection Error', 'Could not load orders from database.');
    }
  }

  function setupRealtime() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
    }
    realtimeChannel = window.supabaseClient
      .channel('admin-orders-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async () => {
          try {
            orders = await fetchAllOrders();
            notifyChange();
            const container = document.getElementById('ordersContainer');
            if (container) renderOrders(container, currentViewMode || 'table');
          } catch (e) {
            console.warn('Realtime sync error:', e);
          }
        }
      )
      .subscribe();
  }

  let currentViewMode = 'table';

  async function createOrder(data, _attempt) {
    _attempt = _attempt || 0;
    if (_attempt > 5) throw new Error('Failed to generate unique order number');
    const payload = mapToDB(data);
    const { data: inserted, error } = await window.supabaseClient
      .from('orders')
      .insert(payload)
      .select('*, profiles(full_name)')
      .single();
    if (error) {
      if (error.code === '23505') {
        return createOrder(data, _attempt + 1);
      }
      throw error;
    }
    const order = mapFromDB(inserted);
    orders.unshift(order);
    notifyChange();
    showToast('success', 'Order Created', `${order.projectTitle} \u2014 ${order.serviceType} (${formatCurrency(order.budget)})`);
    return order;
  }

  async function updateOrder(id, updates) {
    const payload = {};
    if (updates.projectTitle !== undefined) payload.project_title = updates.projectTitle;
    if (updates.serviceType !== undefined) payload.service_type = updates.serviceType;
    if (updates.budget !== undefined) payload.budget = Number(updates.budget);
    if (updates.deadline !== undefined) payload.deadline = updates.deadline;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.additionalNotes !== undefined) payload.additional_notes = updates.additionalNotes;

    const { data: updated, error } = await window.supabaseClient
      .from('orders')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    const order = mapFromDB(updated);
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) orders[idx] = order;
    notifyChange();
    showToast('success', 'Order Updated', `${order.projectTitle} \u2014 ${order.serviceType} updated successfully`);
    return order;
  }

  async function deleteOrder(id) {
    const { error } = await window.supabaseClient
      .from('orders')
      .delete()
      .eq('id', id);
    if (error) throw error;

    const idx = orders.findIndex(o => o.id === id);
    let removed = null;
    if (idx !== -1) removed = orders.splice(idx, 1)[0];
    notifyChange();
    if (removed) {
      showToast('info', 'Order Deleted', `${removed.projectTitle} \u2014 ${removed.serviceType}`);
    }
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
        (o.serviceType || '').toLowerCase().includes(q) ||
        (o.orderNumber || '').toLowerCase().includes(q)
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
    const revision = orders.filter(o => o.status === 'review').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const revenue = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.budget || 0), 0);
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.budget || 0), 0);
    return { total, active, revision, completed: delivered, pending, revenue, totalRevenue };
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
    return `
      <tr data-id="${order.id}">
        <td>
          <div class="td-client">
            <div class="td-avatar ${getAvatarClass(order.projectTitle, 'table')}">${getInitials(order.projectTitle)}</div>
            <div class="td-client-info">
              <div class="td-name">${order.projectTitle}</div>
              <div class="td-email">${order.orderNumber}</div>
            </div>
          </div>
        </td>
        <td><span class="td-service">${order.serviceType}</span></td>
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
    return `
      <div class="card order-card" data-id="${order.id}">
        <div class="order-top">
          <div class="order-client">
            <div class="order-cavatar ${getAvatarClass(order.projectTitle, 'card')}">${getInitials(order.projectTitle)}</div>
            <div class="order-cinfo">
              <h4>${order.projectTitle}</h4>
              <span>${order.orderNumber}</span>
            </div>
          </div>
          ${renderStatusBadge(order.status)}
        </div>
        <div class="order-service">${order.serviceType}</div>
        <div class="order-meta">
          <span class="order-deadline"><i class="far fa-calendar-alt"></i>Due ${formatDate(order.deadline)}</span>
          <span class="order-amount">${formatCurrency(order.budget)}</span>
        </div>
        <div class="order-progress">
          <div class="progress-track">
            <div class="progress-bar" style="width:${cfg.progress}%;${order.status === 'in_progress' ? 'background:linear-gradient(90deg,#3b82f6,#6366f1)' : ''}${order.status === 'review' ? 'background:linear-gradient(90deg,#a855f7,#d946ef)' : ''}${order.status === 'pending' ? 'background:linear-gradient(90deg,#f59e0b,#f97316)' : ''}"></div>
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
        <div class="orders-empty">
          <div class="orders-empty-icon"><i class="fas fa-search"></i></div>
          <h3>No orders match your search</h3>
          <p>Try different keywords or clear your filters to see all orders.</p>
        </div>`;
    }
    return `
      <div class="orders-empty">
        <div class="orders-empty-icon"><i class="fas fa-shopping-bag"></i></div>
        <h3>No orders yet</h3>
        <p>Create your first order to start managing client projects from one place.</p>
        <button class="btn btn-primary empty-new-order-btn" style="margin-top:20px;">
          <i class="fas fa-plus"></i> Create Order
        </button>
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
