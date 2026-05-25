const NAGRIVA_Clients = (() => {
  let clients = [];
  let orders = [];
  let filters = { search: '', sort: 'name' };
  let onChangeCallbacks = [];
  let realtimeChannel = null;
  let _loading = false;
  let _error = null;

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
    return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function fetchClients() {
    const { data: profiles, error: profilesError } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false });
    if (profilesError) throw profilesError;

    const allOrders = await NAGRIVA_OrdersAPI.fetchOrdersForClientStats();

    orders = allOrders || [];

    return (profiles || []).map(profile => {
      const clientOrders = (allOrders || []).filter(o =>
        o.user_id === profile.id || o.client_id === profile.id
      );
      const totalSpent = clientOrders.reduce((sum, o) => sum + Number(o.budget || 0), 0);
      const completedOrders = clientOrders.filter(o => o.status === 'completed').length;
      const lastOrder = clientOrders.length > 0 ? clientOrders[0] : null;

      return {
        id: profile.id,
        name: profile.full_name || 'Unknown',
        email: profile.email || '',
        phone: profile.phone || '',
        company: profile.company || '',
        avatarUrl: profile.avatar_url || '',
        role: profile.role,
        createdAt: profile.created_at,
        lastActive: profile.last_active || profile.updated_at || profile.created_at,
        orderCount: clientOrders.length,
        totalSpent: totalSpent,
        completedOrders: completedOrders,
        lastOrderDate: lastOrder ? lastOrder.created_at : null,
        lastOrderStatus: lastOrder ? lastOrder.status : null,
        profile: profile
      };
    });
  }

  async function init(containerEl) {
    _loading = true;
    _error = null;
    if (containerEl) containerEl.innerHTML = renderSkeleton();
    try {
      clients = await fetchClients();
      _loading = false;
      if (containerEl) renderClients(containerEl);
      notifyChange();
      setupRealtime();
    } catch (err) {
      _loading = false;
      _error = err;
      console.error('[Clients] init failed:', err);
      if (containerEl) {
        containerEl.innerHTML = `
          <div class="orders-empty">
            <div class="orders-empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <h3>Failed to Load Clients</h3>
            <p>${err.message || 'Could not connect to database.'}</p>
            <button class="btn btn-primary empty-new-order-btn" style="margin-top:20px;" onclick="NAGRIVA_Clients.init(document.getElementById('clientsContainer'))">
              <i class="fas fa-sync"></i> Retry
            </button>
          </div>`;
      }
      NAGRIVA_Toast.error('Connection Error', 'Could not load clients from database.');
    }
  }

  function setupRealtime() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    realtimeChannel = window.supabaseClient
      .channel('admin-clients-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        async () => {
          try {
            clients = await fetchClients();
            notifyChange();
            const container = document.getElementById('clientsContainer');
            if (container) renderClients(container);
          } catch (e) {
            console.warn('[Clients] Realtime sync error:', e.message || e);
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async () => {
          try {
            clients = await fetchClients();
            notifyChange();
            const container = document.getElementById('clientsContainer');
            if (container) renderClients(container);
          } catch (e) {
            console.warn('[Clients] Realtime order sync error:', e.message || e);
          }
        }
      )
      .subscribe();
  }

  async function createClient(data) {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const id = crypto.randomUUID();

    const { error: profileError } = await window.supabaseClient
      .from('profiles')
      .insert({
        id,
        full_name: data.full_name,
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
        role: 'client'
      });
    if (profileError) throw profileError;

    clients = await fetchClients();
    notifyChange();
    NAGRIVA_Toast.success('Client Created', `${data.full_name} added successfully`);
    return { id };
  }

  async function updateClient(id, data) {
    const updates = {};
    if (data.full_name !== undefined) updates.full_name = data.full_name;
    if (data.email !== undefined) updates.email = data.email;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.company !== undefined) updates.company = data.company;

    const { error } = await window.supabaseClient
      .from('profiles')
      .update(updates)
      .eq('id', id);
    if (error) throw error;

    clients = await fetchClients();
    notifyChange();
    NAGRIVA_Toast.success('Client Updated', `${data.full_name || 'Client'} updated successfully`);
    return true;
  }

  async function deleteClient(id) {
    const { error } = await window.supabaseClient
      .from('profiles')
      .delete()
      .eq('id', id);
    if (error) throw error;

    clients = clients.filter(c => c.id !== id);
    notifyChange();
    NAGRIVA_Toast.info('Client Removed', 'Client has been removed.');
    return true;
  }

  function getClients() {
    return [...clients];
  }

  function setSearch(query) {
    filters.search = (query || '').toLowerCase().trim();
    return getFilteredClients();
  }

  function setSort(sort) {
    filters.sort = sort || 'name';
    return getFilteredClients();
  }

  function getFilteredClients() {
    let result = [...clients];
    if (filters.search) {
      const q = filters.search;
      result = result.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q)
      );
    }
    if (filters.sort === 'recent') {
      result.sort((a, b) => new Date(b.lastActive || 0) - new Date(a.lastActive || 0));
    } else if (filters.sort === 'orders') {
      result.sort((a, b) => b.orderCount - a.orderCount);
    } else if (filters.sort === 'spent') {
      result.sort((a, b) => b.totalSpent - a.totalSpent);
    } else {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return result;
  }

  function getStats() {
    const total = clients.length;
    const activeClients = clients.filter(c => {
      if (!c.lastOrderDate) return false;
      const daysSince = (Date.now() - new Date(c.lastOrderDate).getTime()) / 86400000;
      return daysSince < 90;
    }).length;
    const totalRevenue = clients.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgOrderValue = total > 0 ? Math.round(totalRevenue / clients.reduce((sum, c) => sum + Math.max(c.orderCount, 1), 0)) : 0;
    return { total, activeClients, totalRevenue, avgOrderValue };
  }

  function onChange(cb) {
    onChangeCallbacks.push(cb);
    return () => {
      onChangeCallbacks = onChangeCallbacks.filter(fn => fn !== cb);
    };
  }

  function notifyChange() {
    const stats = getStats();
    onChangeCallbacks.forEach(fn => fn([...clients], stats));
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
          <h3>No matching clients</h3>
          <p>No clients match your current search. Try different keywords or clear your filters to see all clients.</p>
        </div>`;
    }
    return `
      <div class="orders-empty">
        <div class="orders-empty-icon"><i class="fas fa-users"></i></div>
        <h3>No clients yet</h3>
        <p>Clients will appear here once they sign up or you create their accounts. Manage all client relationships and projects from this view.</p>
      </div>`;
  }

  function renderTableRow(client) {
    const statusDot = client.lastOrderStatus
      ? `<span class="badge ${client.lastOrderStatus === 'completed' ? 'badge-success' : client.lastOrderStatus === 'in_progress' ? 'badge-info' : client.lastOrderStatus === 'revision' ? 'badge-warning' : 'badge-neutral'}">${client.lastOrderStatus ? (client.lastOrderStatus.charAt(0).toUpperCase() + client.lastOrderStatus.slice(1).replace('_', ' ')) : 'None'}</span>`
      : '<span class="badge badge-neutral">No orders</span>';
    return `
      <tr data-id="${client.id}">
        <td>
          <div class="td-user">
            <div class="td-avatar ${getAvatarClass(client.name)}">${getInitials(client.name)}</div>
            <div>
              <div class="td-name">${escapeHtml(client.name)}</div>
              <div class="td-email">${escapeHtml(client.email)}${client.company ? ' &middot; ' + escapeHtml(client.company) : ''}</div>
            </div>
          </div>
        </td>
        <td><span class="td-amount" style="font-weight:500;color:var(--white);">${client.orderCount}</span></td>
        <td><span class="td-amount">${formatCurrency(client.totalSpent)}</span></td>
        <td>${statusDot}</td>
        <td><span style="color:var(--gray2);font-size:0.78rem;">${formatDate(client.lastOrderDate)}</span></td>
        <td>
          <div class="td-actions">
            <button class="td-action-btn" data-action="view-client" title="View Profile"><i class="fas fa-eye"></i></button>
            <button class="td-action-btn" data-action="edit-client" title="Edit"><i class="fas fa-pen"></i></button>
            <button class="td-action-btn danger" data-action="delete-client" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }

  function renderClients(container) {
    if (!container) return;
    if (_loading) {
      container.innerHTML = renderSkeleton();
      return;
    }
    const filtered = getFilteredClients();
    const countEl = document.getElementById('clientsCount');
    if (countEl) {
      countEl.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${clients.length}</strong> clients`;
    }
    if (clients.length === 0) {
      container.innerHTML = renderEmpty(false);
      return;
    }
    if (filtered.length === 0) {
      container.innerHTML = renderEmpty(true);
      return;
    }
    container.innerHTML = `
      <div class="orders-table-wrap">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Status</th>
              <th>Last Order</th>
              <th style="width:120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(c => renderTableRow(c)).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderClientProfile(client) {
    const clientOrders = orders.filter(o =>
      o.user_id === client.id || o.client_id === client.id
    );
    const ordersHtml = clientOrders.length > 0
      ? clientOrders.slice(0, 10).map(o => `
        <div class="activity-item" style="cursor:pointer;" data-order-id="${o.id}">
          <div class="activity-dot-wrap">
            <div class="activity-dot ${o.status === 'completed' ? 'teal' : o.status === 'in_progress' ? 'blue' : o.status === 'revision' ? 'orange' : 'gray'}"></div>
          </div>
          <div class="activity-content">
            <div class="activity-text"><strong>${escapeHtml(o.service_type || o.service || 'Order')}</strong> — ${formatCurrency(o.budget)}</div>
            <div class="activity-time">${formatDate(o.created_at)} &middot; ${o.status ? o.status.replace('_', ' ') : 'pending'}</div>
          </div>
        </div>`).join('')
      : '<div style="color:var(--gray3);padding:12px 0;">No orders yet.</div>';

    return `
      <div class="confirm-modal-overlay active" id="clientProfileModal">
        <div class="confirm-modal" style="max-width:560px;">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
            <div class="td-avatar ${getAvatarClass(client.name)}" style="width:48px;height:48px;font-size:1rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;">${getInitials(client.name)}</div>
            <div style="flex:1;">
              <h3 style="font-family:'Syne',sans-serif;font-weight:600;font-size:1.1rem;color:var(--white);">${escapeHtml(client.name)}</h3>
              <p style="color:var(--gray2);font-size:0.78rem;">${escapeHtml(client.email)}${client.company ? ' &middot; ' + escapeHtml(client.company) : ''}</p>
            </div>
            <button class="order-modal-close" id="profileModalClose"><i class="fas fa-times"></i></button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
            <div class="card" style="padding:16px;text-align:center;">
              <div style="font-size:1.3rem;font-weight:700;color:var(--white);font-family:'Syne',sans-serif;">${client.orderCount}</div>
              <div style="font-size:0.72rem;color:var(--gray2);">Total Orders</div>
            </div>
            <div class="card" style="padding:16px;text-align:center;">
              <div style="font-size:1.3rem;font-weight:700;color:var(--accent);font-family:'Syne',sans-serif;">${formatCurrency(client.totalSpent)}</div>
              <div style="font-size:0.72rem;color:var(--gray2);">Total Spent</div>
            </div>
          </div>
          <div class="card" style="padding:16px;">
            <div class="card-title" style="margin-bottom:12px;">Order History</div>
            <div class="activity-feed">${ordersHtml}</div>
          </div>
          <div class="confirm-modal-actions" style="margin-top:16px;">
            <button class="btn btn-secondary" id="profileModalCloseBtn">Close</button>
          </div>
        </div>
      </div>`;
  }

  function destroy() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    onChangeCallbacks = [];
    clients = [];
    orders = [];
  }

  return {
    init,
    createClient,
    updateClient,
    deleteClient,
    getClients,
    getFilteredClients,
    getStats,
    setSearch,
    setSort,
    onChange,
    renderClients,
    renderClientProfile,
    getInitials,
    getAvatarClass,
    formatDate,
    formatCurrency,
    escapeHtml,
    destroy,
    get loading() { return _loading; },
    get error() { return _error; }
  };
})();
