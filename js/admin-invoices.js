const NAGRIVA_AdminInvoices = (() => {
  'use strict';

  const STATUS = {
    pending:  { label: 'Pending',  color: '#f59e0b', cls: 'pending' },
    paid:     { label: 'Paid',     color: '#2563EB', cls: 'paid' },
    overdue:  { label: 'Overdue',  color: '#ef4444', cls: 'overdue' },
    cancelled:{ label: 'Cancelled',color: '#71717a', cls: 'cancelled' },
    refunded: { label: 'Refunded', color: '#818cf8', cls: 'refunded' },
  };
  const STATUS_KEYS = Object.keys(STATUS);

  let invoices = [];
  let filters = { search: '', status: '', client: '' };
  let onChangeCallbacks = [];
  let realtimeChannel = null;
  let _loading = false;
  let _error = null;

  function mapFromDB(row) {
    const client = row.client;
    const order = row.order;
    return {
      id: row.id,
      invoiceNumber: row.invoice_number || '',
      clientId: row.client_id || null,
      clientName: (client && client.full_name) || '',
      clientEmail: (client && client.email) || '',
      orderId: row.order_id || null,
      orderNumber: (order && order.order_number) || '',
      orderService: (order && order.service_type) || '',
      amount: Number(row.amount) || 0,
      tax: Number(row.tax) || 0,
      total: Number(row.total) || 0,
      status: row.status || 'pending',
      issuedDate: row.issued_date || '',
      dueDate: row.due_date || '',
      paidDate: row.paid_date || null,
      notes: row.notes || '',
      createdAt: row.created_at || new Date().toISOString(),
    };
  }

  function mapToDB(data) {
    return {
      client_id: data.clientId || null,
      order_id: data.orderId || null,
      amount: Number(data.amount) || 0,
      tax: Number(data.tax) || 0,
      status: data.status || 'pending',
      due_date: data.dueDate || '',
      issued_date: data.issuedDate || new Date().toISOString().split('T')[0],
      paid_date: data.paidDate || null,
      notes: data.notes || '',
    };
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(amount) {
    return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

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

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
    return formatDate(dateStr);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function fetchAllInvoices() {
    try {
      const result = await NAGRIVA_InvoicesAPI.fetchInvoices({ per_page: 200 });
      return (result.data || []).map(mapFromDB);
    } catch (error) {
      console.error('[AdminInvoices] fetchAllInvoices failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
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
    try {
      invoices = await fetchAllInvoices();
      _loading = false;
      _fetchInProgress = false;
      if (containerEl) renderInvoices(containerEl);
      notifyChange();
      setupRealtime();
    } catch (err) {
      _loading = false;
      _fetchInProgress = false;
      _error = err;
      console.error('[AdminInvoices] init failed:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
      });
      if (containerEl) {
        const detailMsg = err.hint || err.details || '';
        const desc = (err.message || 'Could not connect to database.') + (detailMsg ? ' ' + detailMsg : '');
        containerEl.innerHTML = NAGRIVA_EmptyState.render({
          icon: 'fas fa-exclamation-triangle',
          title: 'Failed to Load Invoices',
          description: desc,
          variant: 'error',
          primaryCta: { icon: 'fas fa-sync', label: 'Retry', onclick: 'NAGRIVA_AdminInvoices.init(document.getElementById(\'invoicesContainer\'))' }
        });
      }
      NAGRIVA_Toast.error('Connection Error', 'Could not load invoices from database.');
    }
  }

  function setupRealtime() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    realtimeChannel = window.supabaseClient
      .channel('admin-invoices-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        async () => {
          try {
            const fresh = await fetchAllInvoices();
            invoices = fresh;
            notifyChange();
            const container = document.getElementById('invoicesContainer');
            if (container) renderInvoices(container);
          } catch (e) {
            console.warn('[AdminInvoices] Realtime sync error:', e.message || e);
          }
        }
      )
      .subscribe(function(status) {
        if (status === 'SUBSCRIBED') {
          console.log('[AdminInvoices] Realtime channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[AdminInvoices] Realtime channel error');
        } else if (status === 'TIMED_OUT') {
          console.warn('[AdminInvoices] Realtime channel timed out');
        }
      });
  }

  let _createInProgress = false;

  async function createInvoice(data) {
    if (_createInProgress) throw new Error('A create operation is already in progress');
    _createInProgress = true;
    try {
      const payload = {
        order_id: data.orderId,
        client_id: data.clientId,
        amount: Number(data.amount),
        tax: Number(data.tax || 0),
        status: data.status || 'pending',
        due_date: data.dueDate,
        issued_date: data.issuedDate || new Date().toISOString().split('T')[0],
        paid_date: data.status === 'paid' ? (data.paidDate || new Date().toISOString()) : null,
        notes: data.notes || '',
      };
      const inserted = await NAGRIVA_InvoicesAPI.createInvoice(payload);
      const invoice = mapFromDB(inserted);
      invoices.unshift(invoice);
      notifyChange();

      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (user) {
        if (typeof NAGRIVA_InvoiceNotifications !== 'undefined') {
          NAGRIVA_InvoiceNotifications.invoiceCreated(invoice, user.id);
        }
        if (typeof NAGRIVA_InvoiceActivity !== 'undefined') {
          NAGRIVA_InvoiceActivity.invoiceCreated(invoice, user.id);
        }
      }

      NAGRIVA_Toast.success('Invoice Created', `Invoice ${invoice.invoiceNumber} — ${formatCurrency(invoice.total)}`);
      return invoice;
    } finally {
      _createInProgress = false;
    }
  }

  let _updateInProgress = false;

  async function updateInvoice(id, data) {
    if (_updateInProgress) throw new Error('An update operation is already in progress');
    _updateInProgress = true;
    try {
      const payload = {};
      if (data.amount !== undefined) payload.amount = Number(data.amount);
      if (data.tax !== undefined) payload.tax = Number(data.tax);
      if (data.status !== undefined) payload.status = data.status;
      if (data.dueDate !== undefined) payload.due_date = data.dueDate;
      if (data.issuedDate !== undefined) payload.issued_date = data.issuedDate;
      if (data.notes !== undefined) payload.notes = data.notes;
      if (data.paidDate !== undefined) payload.paid_date = data.paidDate;
      else if (data.status === 'paid') payload.paid_date = new Date().toISOString();

      if (data.amount !== undefined || data.tax !== undefined) {
        const curr = invoices.find(i => i.id === id);
        const amt = data.amount !== undefined ? Number(data.amount) : (curr ? curr.amount : 0);
        const tx = data.tax !== undefined ? Number(data.tax) : (curr ? curr.tax : 0);
        payload.total = amt + tx;
      }

      const prev = invoices.find(i => i.id === id);
      const oldStatus = prev ? prev.status : null;

      const updated = await NAGRIVA_InvoicesAPI.updateInvoice(id, payload);
      const invoice = mapFromDB(updated);
      const idx = invoices.findIndex(i => i.id === id);
      if (idx !== -1) invoices[idx] = invoice;
      notifyChange();

      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (user) {
        const newStatus = invoice.status;
        if (oldStatus && oldStatus !== newStatus) {
          if (typeof NAGRIVA_InvoiceNotifications !== 'undefined') {
            if (newStatus === 'paid') {
              NAGRIVA_InvoiceNotifications.invoicePaid(invoice, user.id);
            } else if (newStatus === 'overdue') {
              NAGRIVA_InvoiceNotifications.invoiceOverdue(invoice, user.id);
            } else {
              NAGRIVA_InvoiceNotifications.invoiceStatusChanged(invoice, user.id, oldStatus, newStatus);
            }
          }
          if (typeof NAGRIVA_InvoiceActivity !== 'undefined') {
            if (newStatus === 'paid') {
              NAGRIVA_InvoiceActivity.invoicePaid(invoice, user.id);
            } else {
              NAGRIVA_InvoiceActivity.invoiceUpdated(invoice, user.id, 'Invoice ' + invoice.invoiceNumber + ' status changed to ' + newStatus);
            }
          }
        } else {
          if (typeof NAGRIVA_InvoiceActivity !== 'undefined') {
            NAGRIVA_InvoiceActivity.invoiceUpdated(invoice, user.id);
          }
        }
      }

      NAGRIVA_Toast.success('Invoice Updated', `Invoice ${invoice.invoiceNumber} updated successfully`);
      return invoice;
    } finally {
      _updateInProgress = false;
    }
  }

  async function deleteInvoice(id) {
    const idx = invoices.findIndex(i => i.id === id);
    const removed = idx !== -1 ? invoices[idx] : null;

    if (removed) {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (user && typeof NAGRIVA_InvoiceActivity !== 'undefined') {
        await NAGRIVA_InvoiceActivity.invoiceDeleted(removed, user.id);
      }
    }

    await NAGRIVA_InvoicesAPI.deleteInvoice(id);
    if (idx !== -1) invoices.splice(idx, 1);
    notifyChange();
    if (removed) {
      NAGRIVA_Toast.info('Invoice Deleted', `Invoice ${removed.invoiceNumber} deleted`);
    }
    return true;
  }

  function getInvoice(id) {
    return invoices.find(i => i.id === id) || null;
  }

  function getAllInvoices() {
    return [...invoices];
  }

  function setSearch(query) {
    filters.search = (query || '').toLowerCase().trim();
    return getFilteredInvoices();
  }

  function setStatusFilter(status) {
    filters.status = status || '';
    return getFilteredInvoices();
  }

  function setClientFilter(client) {
    filters.client = client || '';
    return getFilteredInvoices();
  }

  function getFilteredInvoices() {
    let result = [...invoices];
    if (filters.search) {
      const q = filters.search;
      result = result.filter(i =>
        (i.invoiceNumber || '').toLowerCase().includes(q) ||
        (i.clientName || '').toLowerCase().includes(q) ||
        (i.orderNumber || '').toLowerCase().includes(q)
      );
    }
    if (filters.status && STATUS[filters.status]) {
      result = result.filter(i => i.status === filters.status);
    }
    if (filters.client) {
      result = result.filter(i =>
        (i.clientName || '').toLowerCase().includes(filters.client.toLowerCase())
      );
    }
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return result;
  }

  function getStats() {
    const stats = {
      totalCount: invoices.length,
      totalAmount: 0,
      pendingCount: 0,
      pendingAmount: 0,
      paidCount: 0,
      paidAmount: 0,
      overdueCount: 0,
      overdueAmount: 0,
      cancelledCount: 0,
      cancelledAmount: 0,
    };
    invoices.forEach(i => {
      const t = i.total || i.amount;
      stats.totalAmount += t;
      if (i.status === 'pending') { stats.pendingCount++; stats.pendingAmount += t; }
      else if (i.status === 'paid') { stats.paidCount++; stats.paidAmount += t; }
      else if (i.status === 'overdue') { stats.overdueCount++; stats.overdueAmount += t; }
      else if (i.status === 'cancelled') { stats.cancelledCount++; stats.cancelledAmount += t; }
    });
    return stats;
  }

  function onChange(cb) {
    onChangeCallbacks.push(cb);
    return () => {
      onChangeCallbacks = onChangeCallbacks.filter(fn => fn !== cb);
    };
  }

  function notifyChange() {
    const stats = getStats();
    onChangeCallbacks.forEach(fn => fn([...invoices], stats));
  }

  // ─── Render Functions ───

  function renderStatusBadge(status) {
    const cfg = STATUS[status];
    if (!cfg) return '<span class="inv-status-badge pending"><span class="status-dot"></span>Unknown</span>';
    return `<span class="inv-status-badge ${cfg.cls}"><span class="status-dot"></span>${cfg.label}</span>`;
  }

  function renderTableRow(invoice) {
    const displayName = invoice.clientName || 'Unknown Client';
    const isOverdue = invoice.status === 'overdue';
    return `
      <tr data-id="${invoice.id}">
        <td><span class="inv-td-inv-num">${escapeHtml(invoice.invoiceNumber || '\u2014')}</span></td>
        <td>
          <div class="inv-td-client">
            <div class="inv-td-avatar ${getAvatarClass(displayName)}">${getInitials(displayName)}</div>
            <div class="inv-td-client-info">
              <div class="inv-td-name">${escapeHtml(displayName)}</div>
              <div class="inv-td-email">${escapeHtml(invoice.clientEmail || '')}</div>
            </div>
          </div>
        </td>
        <td><span class="inv-td-order">${escapeHtml(invoice.orderNumber || '\u2014')}</span></td>
        <td><span class="inv-td-amount">${formatCurrency(invoice.total || invoice.amount)}</span></td>
        <td>${renderStatusBadge(invoice.status)}</td>
        <td><span class="inv-td-date${isOverdue ? ' overdue' : ''}">${formatDate(invoice.dueDate)}</span></td>
        <td><span class="inv-td-date">${formatDate(invoice.createdAt)}</span></td>
        <td>
          <div class="inv-td-actions">
            <button class="inv-td-action-btn" data-action="edit-invoice" title="Edit">
              <i class="fas fa-pen"></i>
            </button>
            <button class="inv-td-action-btn danger" data-action="delete-invoice" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
            <button class="inv-td-action-btn" data-action="download-invoice-pdf" title="Download PDF">
              <i class="fas fa-file-pdf"></i>
            </button>
            <button class="inv-td-action-btn" data-action="print-invoice" title="Print">
              <i class="fas fa-print"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }

  function renderSkeleton() {
    let html = '<div class="inv-skeleton">';
    for (let i = 0; i < 5; i++) {
      html += `
        <div class="inv-skeleton-row">
          <div class="inv-skeleton-bar w40"></div>
          <div class="inv-skeleton-bar row"><div class="inv-skeleton-bar circle"></div><div><div class="inv-skeleton-bar w60"></div><div class="inv-skeleton-bar w40" style="margin-top:6px;"></div></div></div>
          <div class="inv-skeleton-bar w50"></div>
          <div class="inv-skeleton-bar w40"></div>
          <div class="inv-skeleton-bar w30"></div>
          <div class="inv-skeleton-bar w40"></div>
          <div class="inv-skeleton-bar w40"></div>
        </div>`;
    }
    html += '</div>';
    return html;
  }

  function renderEmpty(filtered) {
    if (filtered) {
      return NAGRIVA_EmptyState.render({
        icon: 'fas fa-search',
        title: 'No matching invoices',
        description: 'No invoices match your current search. Try adjusting your keywords or clearing your filters to see all invoices.',
        variant: 'search'
      });
    }
    return NAGRIVA_EmptyState.render({
      icon: 'fas fa-file-invoice-dollar',
      title: 'No invoices yet',
      description: 'Generate your first invoice to start tracking payments, due dates, and revenue. Every invoice you create will appear here.',
      primaryCta: { icon: 'fas fa-plus', label: 'Create Invoice', onclick: 'NAGRIVA_Invoices.openCreateModal()' }
    });
  }

  function renderStats() {
    const stats = getStats();
    const totalEl = document.getElementById('invTotalAmount');
    const pendingEl = document.getElementById('invPendingAmount');
    const paidEl = document.getElementById('invPaidCount');
    const overdueEl = document.getElementById('invOverdueCount');
    const pendingCountEl = document.getElementById('invPendingCount');
    const paidAmountEl = document.getElementById('invPaidAmount');
    const overdueAmountEl = document.getElementById('invOverdueAmount');

    if (totalEl) totalEl.textContent = formatCurrency(stats.totalAmount);
    if (pendingEl) pendingEl.textContent = formatCurrency(stats.pendingAmount);
    if (paidEl) paidEl.textContent = stats.paidCount;
    if (overdueEl) overdueEl.textContent = stats.overdueCount;
    if (pendingCountEl) pendingCountEl.textContent = stats.pendingCount;
    if (paidAmountEl) paidAmountEl.textContent = formatCurrency(stats.paidAmount);
    if (overdueAmountEl) overdueAmountEl.textContent = formatCurrency(stats.overdueAmount);
  }

  function renderInvoices(container) {
    if (!container) return;
    if (_loading) {
      container.innerHTML = renderSkeleton();
      return;
    }
    const filtered = getFilteredInvoices();
    const countEl = document.getElementById('invoicesCount');
    if (countEl) {
      countEl.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${invoices.length}</strong> invoices`;
    }
    if (invoices.length === 0) {
      container.innerHTML = renderEmpty(false);
      return;
    }
    if (filtered.length === 0) {
      container.innerHTML = renderEmpty(true);
      return;
    }
    container.innerHTML = `
      <div class="inv-table-wrap">
        <table class="inv-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Order</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Created</th>
              <th style="width:80px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(i => renderTableRow(i)).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function destroy() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    onChangeCallbacks = [];
    invoices = [];
  }

  // ─── Invoice Modal ───

  function openInvoiceModal(prefill) {
    const isEditing = !!prefill;
    const statusOptions = STATUS_KEYS.map(k =>
      `<option value="${k}"${prefill && prefill.status === k ? ' selected' : ''}>${STATUS[k].label}</option>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'inv-modal-overlay';
    overlay.id = 'invoiceModal';
    overlay.innerHTML = `
      <div class="inv-modal">
        <div class="inv-modal-glow"></div>
        <div class="inv-modal-header">
          <div>
            <h2>${isEditing ? 'Edit Invoice' : 'New Invoice'}</h2>
            <p>${isEditing ? 'Update invoice details and status.' : 'Create a new invoice for a client order.'}</p>
          </div>
          <button class="inv-modal-close" id="invModalClose">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="inv-modal-body">
          <form id="invForm" autocomplete="off">
            <div class="inv-form-grid">
              <div class="inv-form-field full-width">
                <label>Client <span class="required">*</span></label>
                <div class="client-search-wrap${prefill && prefill.clientId ? ' has-selected' : ''}" id="inv_clientSearchWrap">
                  <input type="text" id="inv_clientSearch" placeholder="Search existing clients..." autocomplete="off" value="${escapeHtml(prefill ? prefill.clientName || '' : '')}" />
                  <input type="hidden" id="inv_clientId" value="${prefill ? prefill.clientId || '' : ''}" />
                  <i class="fas fa-chevron-down client-search-icon" id="inv_clientSearchIcon"></i>
                  <button class="client-search-clear${prefill && prefill.clientId ? ' visible' : ''}" id="inv_clientSearchClear" type="button"><i class="fas fa-times"></i></button>
                  <div class="client-search-dropdown" id="inv_clientDropdown"></div>
                </div>
              </div>
              <div class="inv-form-field full-width">
                <label>Order <span class="required">*</span></label>
                <select id="inv_orderId" required>
                  <option value="">Select an order...</option>
                </select>
              </div>
              <div class="inv-form-field">
                <label>Amount ($) <span class="required">*</span></label>
                <input type="number" id="inv_amount" step="0.01" min="0" placeholder="0.00" value="${prefill ? prefill.amount : ''}" required />
                <span class="field-error">Amount is required</span>
              </div>
              <div class="inv-form-field">
                <label>Tax ($)</label>
                <input type="number" id="inv_tax" step="0.01" min="0" placeholder="0.00" value="${prefill ? prefill.tax : ''}" />
              </div>
              <div class="inv-form-field">
                <label>Status <span class="required">*</span></label>
                <select id="inv_status" required>
                  ${statusOptions}
                </select>
              </div>
              <div class="inv-form-field">
                <label>Due Date <span class="required">*</span></label>
                <input type="date" id="inv_dueDate" value="${prefill && prefill.dueDate ? prefill.dueDate.split('T')[0] : ''}" required />
                <span class="field-error">Due date is required</span>
              </div>
              <div class="inv-form-field full-width">
                <label>Notes</label>
                <textarea id="inv_notes" placeholder="Optional notes about this invoice..." rows="3">${escapeHtml(prefill ? prefill.notes || '' : '')}</textarea>
              </div>
            </div>
          </form>
        </div>
        <div class="inv-modal-footer">
          <button class="btn btn-secondary" id="invModalCancel">Cancel</button>
          <button class="btn btn-primary" id="invModalSubmit">
            <i class="fas ${isEditing ? 'fa-save' : 'fa-plus'}"></i> <span>${isEditing ? 'Save Changes' : 'Create Invoice'}</span>
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    // ─── Populate Orders ───
    const orderSelect = overlay.querySelector('#inv_orderId');
    if (typeof NAGRIVA_AdminOrders !== 'undefined') {
      const allOrders = NAGRIVA_AdminOrders.getAllOrders();
      allOrders.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = (o.orderNumber || o.projectTitle || 'Untitled') + ' \u2014 ' + (o.clientName || 'Unknown');
        opt.dataset.clientId = o.clientId || '';
        opt.dataset.clientName = o.clientName || '';
        if (isEditing && prefill.orderId === o.id) opt.selected = true;
        orderSelect.appendChild(opt);
      });
    }

    // Auto-fill client from order selection
    orderSelect.addEventListener('change', function() {
      const selected = this.options[this.selectedIndex];
      const clientId = selected ? selected.dataset.clientId : '';
      const clientName = selected ? selected.dataset.clientName : '';
      if (clientId) {
        const searchInput = document.getElementById('inv_clientSearch');
        const clientIdField = document.getElementById('inv_clientId');
        const wrap = document.getElementById('inv_clientSearchWrap');
        const clearBtn = document.getElementById('inv_clientSearchClear');
        if (searchInput) searchInput.value = clientName || '';
        if (clientIdField) clientIdField.value = clientId;
        if (wrap) wrap.classList.add('has-selected');
        if (clearBtn) clearBtn.classList.add('visible');
      }
    });

    // ─── Client Search ───
    let _clientOptions = [];

    async function loadClientOptions() {
      try {
        const { data } = await window.supabaseClient
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'client')
          .order('full_name');
        _clientOptions = (data || []).map(p => ({
          id: p.id,
          name: p.full_name || 'Unknown',
          email: p.email || ''
        }));
      } catch (_) {
        _clientOptions = [];
      }
    }

    function renderDropdown(filterText) {
      const dropdown = document.getElementById('inv_clientDropdown');
      const wrap = document.getElementById('inv_clientSearchWrap');
      if (!dropdown || !wrap) return;
      const q = (filterText || '').toLowerCase().trim();
      const filtered = q
        ? _clientOptions.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
        : _clientOptions;
      const selectedId = document.getElementById('inv_clientId')?.value || '';
      if (filtered.length === 0) {
        dropdown.innerHTML = NAGRIVA_EmptyState.render({ icon: 'fas fa-search', title: 'No clients found', description: 'No clients match your search.', variant: 'inline' });
      } else {
        dropdown.innerHTML = filtered.map(c => {
          const isSelected = c.id === selectedId;
          return `<div class="client-search-option${isSelected ? ' selected' : ''}" data-id="${c.id}" data-name="${c.name.replace(/"/g, '&quot;')}" data-email="${c.email}">
            <div class="cso-avatar ${getAvatarClass(c.name)}">${getInitials(c.name)}</div>
            <div class="cso-info">
              <div class="cso-name">${c.name}</div>
              <div class="cso-email">${c.email || 'No email'}</div>
            </div>
            <div class="cso-check"><i class="fas fa-check"></i></div>
          </div>`;
        }).join('');
      }
    }

    function selectClient(id, name) {
      const searchInput = document.getElementById('inv_clientSearch');
      const clientIdField = document.getElementById('inv_clientId');
      const wrap = document.getElementById('inv_clientSearchWrap');
      const clearBtn = document.getElementById('inv_clientSearchClear');
      if (!searchInput || !clientIdField) return;
      clientIdField.value = id || '';
      if (name && searchInput) searchInput.value = name;
      if (wrap) wrap.classList.toggle('has-selected', !!id);
      if (clearBtn) clearBtn.classList.toggle('visible', !!id);
      closeDropdown();
    }

    function closeDropdown() {
      const dd = document.getElementById('inv_clientDropdown');
      if (dd) dd.classList.remove('open');
    }

    function openDropdown() {
      const dd = document.getElementById('inv_clientDropdown');
      if (dd) {
        renderDropdown(document.getElementById('inv_clientSearch')?.value || '');
        dd.classList.add('open');
      }
    }

    loadClientOptions();

    const searchInput = overlay.querySelector('#inv_clientSearch');
    const clientIdField = overlay.querySelector('#inv_clientId');
    const clearBtn = overlay.querySelector('#inv_clientSearchClear');
    const dropdown = overlay.querySelector('#inv_clientDropdown');
    const wrap = overlay.querySelector('#inv_clientSearchWrap');

    if (searchInput) {
      searchInput.addEventListener('focus', openDropdown);
      searchInput.addEventListener('input', function() {
        const val = this.value;
        const currentId = clientIdField?.value;
        if (currentId) {
          const matched = _clientOptions.find(c => c.id === currentId && c.name === val);
          if (!matched) {
            clientIdField.value = '';
            if (wrap) wrap.classList.remove('has-selected');
            if (clearBtn) clearBtn.classList.remove('visible');
          }
        }
        renderDropdown(val);
        const dd = document.getElementById('inv_clientDropdown');
        if (dd) dd.classList.add('open');
      });
    }

    if (dropdown) {
      dropdown.addEventListener('click', function(e) {
        const opt = e.target.closest('.client-search-option');
        if (!opt) return;
        selectClient(opt.dataset.id, opt.dataset.name);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        selectClient('', '');
        if (searchInput) searchInput.value = '';
        searchInput?.focus();
      });
    }

    // Close dropdown on outside click
    const outsideHandler = function(e) {
      if (wrap && !wrap.contains(e.target)) closeDropdown();
    };
    document.addEventListener('mousedown', outsideHandler);

    // Keyboard nav
    if (searchInput) {
      searchInput.addEventListener('keydown', function(e) {
        const items = dropdown ? dropdown.querySelectorAll('.client-search-option') : [];
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const highlighted = dropdown?.querySelector('.highlighted');
          if (!highlighted && items.length > 0) {
            items[0].classList.add('highlighted');
          } else if (highlighted) {
            highlighted.classList.remove('highlighted');
            const next = highlighted.nextElementSibling;
            if (next && next.classList.contains('client-search-option')) {
              next.classList.add('highlighted');
            } else if (items.length > 0) {
              items[0].classList.add('highlighted');
            }
          }
          const hl = dropdown?.querySelector('.highlighted');
          if (hl) hl.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const highlighted = dropdown?.querySelector('.highlighted');
          if (!highlighted && items.length > 0) {
            items[items.length - 1].classList.add('highlighted');
          } else if (highlighted) {
            highlighted.classList.remove('highlighted');
            const prev = highlighted.previousElementSibling;
            if (prev && prev.classList.contains('client-search-option')) {
              prev.classList.add('highlighted');
            } else if (items.length > 0) {
              items[items.length - 1].classList.add('highlighted');
            }
          }
          const hl = dropdown?.querySelector('.highlighted');
          if (hl) hl.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          const highlighted = dropdown?.querySelector('.highlighted');
          if (highlighted) {
            e.preventDefault();
            selectClient(highlighted.dataset.id, highlighted.dataset.name);
          }
        } else if (e.key === 'Escape') {
          closeDropdown();
        }
      });
    }

    // ─── Modal Actions ───
    function closeModal() {
      overlay.classList.remove('active');
      setTimeout(() => {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.removeEventListener('mousedown', outsideHandler);
      }, 400);
      document.body.style.overflow = '';
    }

    overlay.querySelector('#invModalClose').addEventListener('click', closeModal);
    overlay.querySelector('#invModalCancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
    });

    overlay.querySelector('#invModalSubmit').addEventListener('click', async function() {
      const formFields = {
        clientIdField: overlay.querySelector('#inv_clientId'),
        orderId: overlay.querySelector('#inv_orderId'),
        amount: overlay.querySelector('#inv_amount'),
        tax: overlay.querySelector('#inv_tax'),
        status: overlay.querySelector('#inv_status'),
        dueDate: overlay.querySelector('#inv_dueDate'),
        notes: overlay.querySelector('#inv_notes'),
      };

      overlay.querySelectorAll('.inv-form-field').forEach(el => el.classList.remove('has-error'));
      let isValid = true;

      const clientId = formFields.clientIdField?.value || '';
      if (!clientId) {
        const wrap = document.getElementById('inv_clientSearchWrap');
        if (wrap) wrap.closest('.inv-form-field')?.classList.add('has-error');
        isValid = false;
      }

      const orderId = formFields.orderId.value;
      if (!orderId) {
        formFields.orderId.closest('.inv-form-field')?.classList.add('has-error');
        isValid = false;
      }

      const amount = parseFloat(formFields.amount.value);
      if (!formFields.amount.value.trim() || isNaN(amount) || amount <= 0) {
        formFields.amount.closest('.inv-form-field')?.classList.add('has-error');
        isValid = false;
      }

      const dueDate = formFields.dueDate.value;
      if (!dueDate) {
        formFields.dueDate.closest('.inv-form-field')?.classList.add('has-error');
        isValid = false;
      }

      if (!isValid) return;

      this.disabled = true;
      const originalHtml = this.innerHTML;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

      try {
        const data = {
          clientId: clientId,
          orderId: orderId,
          amount: amount,
          tax: parseFloat(formFields.tax.value) || 0,
          status: formFields.status.value,
          dueDate: dueDate,
          notes: formFields.notes.value.trim() || '',
        };

        if (isEditing && prefill) {
          await updateInvoice(prefill.id, data);
          closeModal();
          NAGRIVA_Toast.success('Invoice Updated', `Invoice updated successfully`);
        } else {
          await createInvoice(data);
          closeModal();
          showToast('success', 'Invoice Created', `Invoice created successfully`);
        }
        const container = document.getElementById('invoicesContainer');
        if (container) renderInvoices(container);
        renderStats();
      } catch (err) {
        console.error('Invoice operation failed:', err);
        this.disabled = false;
        this.innerHTML = originalHtml;
        showToast('error', 'Operation Failed', err.message || 'Something went wrong. Please try again.');
      }
    });

    document.body.style.overflow = 'hidden';
  }

  function showConfirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-modal-overlay';
      overlay.innerHTML = `
        <div class="confirm-modal">
          <div class="confirm-modal-icon"><i class="fas fa-exclamation-triangle"></i></div>
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="confirm-modal-actions">
            <button class="btn btn-secondary" id="confirmCancel">Cancel</button>
            <button class="btn btn-primary" id="confirmOk" style="background:var(--danger);color:#fff;">Delete</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      function close() {
        overlay.classList.remove('active');
        setTimeout(() => { overlay.remove(); }, 300);
      }

      overlay.querySelector('#confirmCancel').addEventListener('click', () => { close(); resolve(false); });
      overlay.querySelector('#confirmOk').addEventListener('click', () => { close(); resolve(true); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) { close(); resolve(false); } });
      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') { close(); resolve(false); document.removeEventListener('keydown', escHandler); }
      });
    });
  }

  return {
    STATUS,
    STATUS_KEYS,
    init,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoice,
    getAllInvoices,
    getFilteredInvoices,
    getStats,
    setSearch,
    setStatusFilter,
    setClientFilter,
    onChange,
    renderInvoices,
    renderStats,
    renderStatusBadge,
    formatDate,
    formatCurrency,
    timeAgo,
    getInitials,
    openInvoiceModal,
    showConfirm,
    destroy,
    get loading() { return _loading; },
    get error() { return _error; },
  };
})();
