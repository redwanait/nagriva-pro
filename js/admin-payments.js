const NAGRIVA_Payments = (() => {
  const STATUS = {
    pending:  { label: 'Pending',  color: '#f59e0b', cls: 'pending' },
    paid:     { label: 'Paid',     color: '#F59E0B', cls: 'paid' },
    refunded: { label: 'Refunded', color: '#F59E0B', cls: 'refunded' },
    failed:   { label: 'Failed',   color: '#ef4444', cls: 'failed' },
  };
  const STATUS_KEYS = Object.keys(STATUS);

  let payments = [];
  let paymentHistory = [];
  let filterPayments = [];
  let filters = { search: '', status: '', sort: 'newest' };
  let onChangeCallbacks = [];
  let realtimeChannel = null;
  let _loading = false;
  let _error = null;

  function mapFromDB(row) {
    return {
      id: row.id,
      orderId: row.order_id || null,
      clientId: row.client_id || null,
      amount: Number(row.amount) || 0,
      currency: row.currency || 'MAD',
      status: row.status || 'pending',
      paymentMethod: row.payment_method || '',
      paymentIntent: row.payment_intent || '',
      paidAt: row.paid_at || null,
      notes: row.notes || '',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || null,
      clientName: row.client_name || '',
      clientEmail: row.client_email || '',
      orderNumber: row.order_number || '',
      projectTitle: row.project_title || '',
      service: row.service || '',
    };
  }

  function mapToDB(data) {
    return {
      order_id: data.orderId || null,
      client_id: data.clientId || null,
      amount: Number(data.amount) || 0,
      currency: data.currency || 'MAD',
      status: data.status || 'pending',
      payment_method: data.paymentMethod || '',
      payment_intent: data.paymentIntent || '',
      paid_at: data.paidAt || null,
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

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
    return formatDate(dateStr);
  }

  function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  function getAvatarClass(name) {
    const classes = ['pa1','pa2','pa3','pa4','pa5','pa6'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
    return classes[Math.abs(hash) % classes.length];
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function applyFilters() {
    filterPayments = payments.filter(p => {
      if (filters.status && p.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const name = (p.clientName || '').toLowerCase();
        const orderNum = (p.orderNumber || '').toLowerCase();
        const project = (p.projectTitle || '').toLowerCase();
        if (!name.includes(q) && !orderNum.includes(q) && !project.includes(q)) return false;
      }
      return true;
    });
    filterPayments.sort((a, b) => {
      if (filters.sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (filters.sort === 'amount') return b.amount - a.amount;
      if (filters.sort === 'amount-asc') return a.amount - b.amount;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  function getStats() {
    const stats = {
      totalRevenue: 0, pendingAmount: 0, paidAmount: 0, refundedAmount: 0, failedAmount: 0,
      totalCount: payments.length, paidCount: 0, pendingCount: 0, refundedCount: 0, failedCount: 0,
    };
    payments.forEach(p => {
      stats.totalRevenue += (p.status === 'paid' ? p.amount : 0);
      stats.paidAmount += (p.status === 'paid' ? p.amount : 0);
      stats.pendingAmount += (p.status === 'pending' ? p.amount : 0);
      stats.refundedAmount += (p.status === 'refunded' ? p.amount : 0);
      stats.failedAmount += (p.status === 'failed' ? p.amount : 0);
      if (p.status === 'paid') stats.paidCount++;
      if (p.status === 'pending') stats.pendingCount++;
      if (p.status === 'refunded') stats.refundedCount++;
      if (p.status === 'failed') stats.failedCount++;
    });
    return stats;
  }

  function getMonthlyRevenue() {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.getFullYear() + '-' + d.getMonth();
      const label = d.toLocaleString('en-US', { month: 'short' });
      months.push({ key, label, revenue: 0, count: 0 });
    }
    payments.forEach(p => {
      if (p.status !== 'paid' || !p.paidAt) return;
      const d = new Date(p.paidAt);
      const key = d.getFullYear() + '-' + d.getMonth();
      const found = months.find(m => m.key === key);
      if (found) {
        found.revenue += p.amount;
        found.count++;
      }
    });
    return months;
  }

  function getMethodDistribution() {
    const counts = {};
    payments.forEach(p => {
      const method = p.paymentMethod || 'Unknown';
      counts[method] = (counts[method] || 0) + 1;
    });
    return counts;
  }

  // ─── Render Functions ───

  function renderSkeleton(container) {
    if (!container) return;
    let html = '';
    for (let i = 0; i < 6; i++) {
      html += '<tr class="pay-skeleton-row">' +
        '<td><div class="pay-skeleton-line w50"></div></td>' +
        '<td><div class="pay-skeleton-line w60"></div></td>' +
        '<td><div class="pay-skeleton-line w40"></div></td>' +
        '<td><div class="pay-skeleton-line w35"></div></td>' +
        '<td><div class="pay-skeleton-line w45"></div></td>' +
        '<td><div class="pay-skeleton-line w30"></div></td>' +
      '</tr>';
    }
    container.innerHTML = '<table><thead><tr><th>Order</th><th>Client</th><th>Amount</th><th>Status</th><th>Method</th><th>Date</th></tr></thead><tbody>' + html + '</tbody></table>';
  }

  function renderEmpty(container, filtered) {
    if (!container) return;
    container.innerHTML = filtered
      ? NAGRIVA_EmptyState.render({
          icon: 'fas fa-search',
          title: 'No matching payments',
          description: 'No payments match your current search. Try adjusting your filters to see all records.',
          variant: 'search'
        })
      : NAGRIVA_EmptyState.render({
          icon: 'fas fa-credit-card',
          title: 'No payments yet',
          description: 'Start tracking revenue by recording your first payment. All payment activity will appear here in real time.'
        });
  }

  function renderError(container, err) {
    if (!container) return;
    const msg = (err && err.message) || 'Failed to load payments.';
    container.innerHTML = NAGRIVA_EmptyState.render({
      icon: 'fas fa-exclamation-triangle',
      title: 'Error loading payments',
      description: msg,
      variant: 'error',
      primaryCta: { icon: 'fas fa-sync', label: 'Retry', onclick: 'NAGRIVA_Payments.retry()' }
    });
  }

  function renderPayments(container) {
    if (!container) return;
    if (_loading) { renderSkeleton(container); return; }
    if (_error) { renderError(container, _error); return; }

    applyFilters();
    const countEl = document.getElementById('paymentsCount');
    if (countEl) {
      const total = payments.length;
      const shown = filterPayments.length;
      countEl.textContent = shown === total
        ? total + ' payment' + (total !== 1 ? 's' : '')
        : 'Showing ' + shown + ' of ' + total + ' payment' + (total !== 1 ? 's' : '');
    }

    if (filterPayments.length === 0) {
      renderEmpty(container, payments.length > 0);
      return;
    }

    container.innerHTML = '<div class="payments-table-wrap"><table><thead><tr>' +
      '<th>Order</th><th>Client</th><th>Amount</th><th>Status</th><th>Method</th><th>Date</th>' +
      '</tr></thead><tbody>' + filterPayments.map(p => {
        const initials = getInitials(p.clientName || p.orderNumber);
        const avatarCls = getAvatarClass(p.clientName || p.orderNumber);
        const statusCls = STATUS[p.status] ? STATUS[p.status].cls : 'pending';
        const statusLabel = STATUS[p.status] ? STATUS[p.status].label : p.status;
        const displayName = p.clientName || p.orderNumber || 'Unknown';
        const displayOrder = p.orderNumber || p.projectTitle || 'N/A';
        const methodIcon = p.paymentMethod === 'card' || p.paymentMethod === 'credit_card' ? 'fa-credit-card'
          : p.paymentMethod === 'transfer' || p.paymentMethod === 'bank_transfer' ? 'fa-university'
          : p.paymentMethod === 'cash' ? 'fa-money-bill'
          : p.paymentMethod === 'paypal' ? 'fa-paypal'
          : p.paymentMethod === 'stripe' ? 'fa-bolt'
          : 'fa-circle';

        return '<tr data-id="' + p.id + '">' +
          '<td class="pay-td-order" title="' + escapeHtml(displayOrder) + '">' + escapeHtml(displayOrder) + '</td>' +
          '<td><div class="pay-td-client"><div class="pay-td-avatar ' + avatarCls + '">' + initials + '</div><span class="pay-td-name">' + escapeHtml(displayName) + '</span></div></td>' +
          '<td class="pay-td-amount">' + formatCurrency(p.amount) + '</td>' +
          '<td><span class="pay-status ' + statusCls + '">' + statusLabel + '</span></td>' +
          '<td>' + (p.paymentMethod ? '<span class="pay-td-method"><i class="fas ' + methodIcon + '"></i> ' + escapeHtml(p.paymentMethod) + '</span>' : '<span style="color:var(--gray3);">\u2014</span>') + '</td>' +
          '<td class="pay-td-date">' + (p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)) + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function renderStats() {
    const stats = getStats();
    const totalRevEl = document.getElementById('payTotalRevenue');
    const pendingEl = document.getElementById('payPendingAmount');
    const paidEl = document.getElementById('payPaidCount');
    const failedEl = document.getElementById('payFailedCount');
    const pendingCountEl = document.getElementById('payPendingCount');

    if (totalRevEl) totalRevEl.textContent = formatCurrency(stats.totalRevenue);
    if (pendingEl) pendingEl.textContent = formatCurrency(stats.pendingAmount);
    if (paidEl) paidEl.textContent = stats.paidCount;
    if (failedEl) failedEl.textContent = stats.failedCount;
    if (pendingCountEl) pendingCountEl.textContent = stats.pendingCount;
  }

  function renderRevenueChart() {
    const canvas = document.getElementById('payRevenueChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const monthly = getMonthlyRevenue();
    const labels = monthly.map(m => m.label);
    const data = monthly.map(m => m.revenue);
    const counts = monthly.map(m => m.count);

    const existing = Chart.getChart('payRevenueChart');
    if (existing) {
      existing.data.labels = labels;
      existing.data.datasets[0].data = data;
      if (existing.data.datasets[1]) existing.data.datasets[1].data = counts;
      existing.update('none');
      return;
    }

    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 230);
    grad.addColorStop(0, 'rgba(250,204,21,0.2)');
    grad.addColorStop(0.5, 'rgba(250,204,21,0.06)');
    grad.addColorStop(1, 'rgba(250,204,21,0)');

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue',
          data: data,
          backgroundColor: grad,
          borderColor: '#FACC15',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(4,4,4,0.9)',
            titleColor: '#fff',
            bodyColor: '#a1a1aa',
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: function(ctx) {
                return '$' + ctx.parsed.y.toLocaleString('en-US');
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#52525b', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: {
              color: '#52525b',
              font: { size: 11 },
              callback: function(v) { return '$' + (v / 1000).toFixed(0) + 'k'; }
            }
          }
        },
        interaction: { intersect: false, mode: 'index' }
      }
    });
  }

  function renderHistoryTimeline(container, limit) {
    if (!container) return;
    const items = limit ? paymentHistory.slice(0, limit) : paymentHistory;
    if (items.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray3);font-size:0.78rem;">No payment history yet</div>';
      return;
    }
    container.innerHTML = items.map((h, i) => {
      const isLast = i === items.length - 1;
      const dotCls = STATUS[h.status] ? STATUS[h.status].cls : 'pending';
      const statusLabel = STATUS[h.status] ? STATUS[h.status].label : h.status;
      const desc = h.notes || (h.changed_from
        ? 'Status changed from ' + (STATUS[h.changed_from] ? STATUS[h.changed_from].label : h.changed_from) + ' to ' + statusLabel
        : 'Payment of ' + formatCurrency(h.amount) + ' — ' + statusLabel);
      return '<div class="pay-history-item">' +
        '<div class="pay-h-dot-wrap">' +
          '<div class="pay-h-dot ' + dotCls + '"></div>' +
          (isLast ? '' : '<div class="pay-h-line"></div>') +
        '</div>' +
        '<div class="pay-h-content">' +
          '<div class="pay-h-title">' + escapeHtml(statusLabel) + '</div>' +
          '<div class="pay-h-desc">' + escapeHtml(desc) + '</div>' +
          '<div class="pay-h-time">' + timeAgo(h.created_at) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderHistoryCompact() {
    const container = document.getElementById('payRecentHistory');
    if (!container) return;
    renderHistoryTimeline(container, 8);
  }

  // ─── Modals ───

  function openPaymentModal(paymentData) {
    const isEditing = !!paymentData;
    const overlay = document.createElement('div');
    overlay.className = 'pay-modal-overlay';
    overlay.id = 'paymentModal';
    overlay.innerHTML = `
      <div class="pay-modal">
        <div class="pay-modal-glow"></div>
        <div class="pay-modal-header">
          <div>
            <h2>${isEditing ? 'Edit Payment' : 'New Payment'}</h2>
            <p>${isEditing ? 'Update payment record details.' : 'Record a new payment transaction.'}</p>
          </div>
          <button class="pay-modal-close" id="payModalClose"><i class="fas fa-times"></i></button>
        </div>
        <div class="pay-modal-body">
          <form id="payForm" autocomplete="off">
            <div class="pay-form-grid">
              <div class="pay-form-field full-width">
                <label>Order <span class="required">*</span></label>
                <select id="pf_order" ${isEditing ? 'disabled' : 'required'}>
                  <option value="">Select an order...</option>
                </select>
              </div>
              <div class="pay-form-field full-width">
                <label>Client</label>
                <select id="pf_client" ${isEditing ? 'disabled' : ''}>
                  <option value="">Auto from order (or select)</option>
                </select>
              </div>
              <div class="pay-form-field">
                <label>Amount <span class="required">*</span></label>
                <input type="number" id="pf_amount" step="0.01" min="0" placeholder="0.00" value="${isEditing ? paymentData.amount : ''}" required />
              </div>
              <div class="pay-form-field">
                <label>Currency</label>
                <select id="pf_currency">
                  <option value="MAD" ${isEditing && paymentData.currency === 'MAD' ? 'selected' : ''}>MAD</option>
                  <option value="USD" ${isEditing && paymentData.currency === 'USD' ? 'selected' : ''}>USD</option>
                  <option value="EUR" ${isEditing && paymentData.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                  <option value="GBP" ${isEditing && paymentData.currency === 'GBP' ? 'selected' : ''}>GBP</option>
                </select>
              </div>
              <div class="pay-form-field">
                <label>Status <span class="required">*</span></label>
                <select id="pf_status" required>
                  ${STATUS_KEYS.map(k => `<option value="${k}" ${isEditing && paymentData.status === k ? 'selected' : ''}>${STATUS[k].label}</option>`).join('')}
                </select>
              </div>
              <div class="pay-form-field">
                <label>Payment Method</label>
                <select id="pf_method">
                  <option value="">Select method...</option>
                  <option value="credit_card" ${isEditing && paymentData.paymentMethod === 'credit_card' ? 'selected' : ''}>Credit Card</option>
                  <option value="bank_transfer" ${isEditing && paymentData.paymentMethod === 'bank_transfer' ? 'selected' : ''}>Bank Transfer</option>
                  <option value="paypal" ${isEditing && paymentData.paymentMethod === 'paypal' ? 'selected' : ''}>PayPal</option>
                  <option value="stripe" ${isEditing && paymentData.paymentMethod === 'stripe' ? 'selected' : ''}>Stripe</option>
                  <option value="cash" ${isEditing && paymentData.paymentMethod === 'cash' ? 'selected' : ''}>Cash</option>
                  <option value="crypto" ${isEditing && paymentData.paymentMethod === 'crypto' ? 'selected' : ''}>Cryptocurrency</option>
                  <option value="other" ${isEditing && paymentData.paymentMethod === 'other' ? 'selected' : ''}>Other</option>
                </select>
              </div>
              <div class="pay-form-field">
                <label>Payment Date</label>
                <input type="date" id="pf_paid_at" value="${isEditing && paymentData.paidAt ? paymentData.paidAt.split('T')[0] : ''}" />
              </div>
              <div class="pay-form-field full-width">
                <label>Notes</label>
                <textarea id="pf_notes" placeholder="Optional notes about this payment...">${isEditing ? escapeHtml(paymentData.notes || '') : ''}</textarea>
              </div>
            </div>
          </form>
        </div>
        <div class="pay-modal-footer">
          <button class="btn btn-secondary" id="payModalCancel">Cancel</button>
          <button class="btn btn-primary" id="payModalSubmit"><i class="fas ${isEditing ? 'fa-save' : 'fa-plus'}"></i> ${isEditing ? 'Save Changes' : 'Create Payment'}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    const orderSelect = overlay.querySelector('#pf_order');
    const clientSelect = overlay.querySelector('#pf_client');

    // Populate orders
    if (typeof NAGRIVA_AdminOrders !== 'undefined') {
      const allOrders = NAGRIVA_AdminOrders.getAllOrders();
      allOrders.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = (o.orderNumber || o.projectTitle || 'Untitled') + ' — ' + (o.clientName || 'Unknown');
        opt.dataset.clientId = o.clientId || '';
        opt.dataset.clientName = o.clientName || '';
        if (isEditing && paymentData.orderId === o.id) opt.selected = true;
        orderSelect.appendChild(opt);
      });
    }

    // Populate clients
    if (typeof NAGRIVA_Clients !== 'undefined') {
      const allClients = NAGRIVA_Clients.getFilteredClients();
      allClients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name + (c.email ? ' (' + c.email + ')' : '');
        if (isEditing && paymentData.clientId === c.id) opt.selected = true;
        clientSelect.appendChild(opt);
      });
    }

    // Auto-fill client when order changes
    orderSelect.addEventListener('change', function() {
      if (isEditing) return;
      const selected = this.options[this.selectedIndex];
      if (selected && selected.dataset.clientId) {
        clientSelect.value = selected.dataset.clientId;
      }
    });

    function closeModal() {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 400);
    }

    overlay.querySelector('#payModalClose').addEventListener('click', closeModal);
    overlay.querySelector('#payModalCancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });

    overlay.querySelector('#payModalSubmit').addEventListener('click', async function() {
      const orderId = overlay.querySelector('#pf_order').value;
      const clientId = overlay.querySelector('#pf_client').value;
      const amount = parseFloat(overlay.querySelector('#pf_amount').value);
      const currency = overlay.querySelector('#pf_currency').value;
      const status = overlay.querySelector('#pf_status').value;
      const method = overlay.querySelector('#pf_method').value;
      const paidAt = overlay.querySelector('#pf_paid_at').value;
      const notes = overlay.querySelector('#pf_notes').value.trim();

      if (!orderId) { NAGRIVA_Toast.error('Validation Error', 'Please select an order'); return; }
      if (!amount || amount <= 0) { NAGRIVA_Toast.error('Validation Error', 'Please enter a valid amount'); return; }

      this.disabled = true;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

      try {
        const data = {
          orderId,
          clientId: clientId || null,
          amount,
          currency,
          status,
          paymentMethod: method,
          paidAt: paidAt ? new Date(paidAt).toISOString() : (status === 'paid' ? new Date().toISOString() : null),
          notes,
        };

        if (isEditing) {
          await updatePayment(paymentData.id, data);
          NAGRIVA_Toast.success('Payment Updated', 'Payment record has been updated successfully.');
        } else {
          await createPayment(data);
          NAGRIVA_Toast.success('Payment Created', 'Payment record has been created successfully.');
        }

        closeModal();
        if (typeof NAGRIVA_Payments !== 'undefined') {
          const container = document.getElementById('paymentsContainer');
          if (container) renderPayments(container);
          renderStats();
          renderRevenueChart();
          renderHistoryCompact();
        }
      } catch (err) {
        this.disabled = false;
        this.innerHTML = '<i class="fas ' + (isEditing ? 'fa-save' : 'fa-plus') + '"></i> ' + (isEditing ? 'Save Changes' : 'Create Payment');
        NAGRIVA_Toast.error('Operation Failed', err.message || 'Something went wrong');
      }
    });
  }

  function openHistoryModal(paymentId) {
    let title, subtitle, history;
    if (paymentId) {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;
      title = 'Payment History';
      subtitle = formatCurrency(payment.amount) + ' \u2014 ' + (STATUS[payment.status] ? STATUS[payment.status].label : payment.status);
      history = paymentHistory.filter(h => h.payment_id === paymentId);
    } else {
      title = 'All Payment History';
      subtitle = 'Complete transaction audit trail';
      history = paymentHistory;
    }
    const overlay = document.createElement('div');
    overlay.className = 'pay-history-overlay';
    overlay.id = 'historyModal';
    overlay.innerHTML = `
      <div class="pay-history-panel">
        <div class="pay-history-header">
          <div>
            <h2>${title}</h2>
            <p>${subtitle}</p>
          </div>
          <button class="pay-history-close" id="historyModalClose"><i class="fas fa-times"></i></button>
        </div>
        <div class="pay-history-timeline" id="historyTimeline">
          <div style="text-align:center;padding:20px;color:var(--gray3);">Loading history...</div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    function closeModal() {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 400);
    }
    overlay.querySelector('#historyModalClose').addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });

    const timeline = overlay.querySelector('#historyTimeline');
    if (history.length === 0) {
      timeline.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray3);font-size:0.78rem;">No history recorded yet.</div>';
    } else {
      renderHistoryTimeline(timeline);
    }
  }

  function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'pay-confirm-overlay';
      overlay.innerHTML = `
        <div class="pay-confirm-box">
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="pay-confirm-actions">
            <button class="btn btn-secondary btn-sm" id="confirmCancel">Cancel</button>
            <button class="btn btn-primary btn-sm" id="confirmOk" style="background:var(--danger);color:var(--white);">Delete</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      function close() {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
      }

      overlay.querySelector('#confirmCancel').addEventListener('click', () => { close(); resolve(false); });
      overlay.querySelector('#confirmOk').addEventListener('click', () => { close(); resolve(true); });
      overlay.addEventListener('click', function(e) { if (e.target === overlay) { close(); resolve(false); } });
    });
  }

  // ─── Data Operations ───

  async function fetchPayments() {
    _loading = true;
    _error = null;
    try {
      const { data, error } = await window.supabaseClient
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      payments = (data || []).map(mapFromDB);
      _loading = false;
      notifyChange();
      return payments;
    } catch (err) {
      _loading = false;
      _error = err;
      console.error('[Payments] Fetch error:', err);
      notifyChange();
      throw err;
    }
  }

  async function fetchPaymentHistory() {
    try {
      const { data, error } = await window.supabaseClient
        .from('payment_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      paymentHistory = data || [];
      return paymentHistory;
    } catch (err) {
      console.error('[Payments] History fetch error:', err);
      return [];
    }
  }

  async function createPayment(data) {
    const dbData = mapToDB(data);
    const { error } = await window.supabaseClient
      .from('payments')
      .insert(dbData);
    if (error) throw error;
    await fetchPayments();
  }

  async function updatePayment(id, data) {
    const dbData = mapToDB(data);
    const { error } = await window.supabaseClient
      .from('payments')
      .update(dbData)
      .eq('id', id);
    if (error) throw error;
    await fetchPayments();
  }

  async function deletePayment(id) {
    const { error } = await window.supabaseClient
      .from('payments')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await fetchPayments();
  }

  // ─── Realtime ───

  function setupRealtime() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    realtimeChannel = window.supabaseClient
      .channel('admin-payments-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        async () => {
          await fetchPayments();
          await fetchPaymentHistory();
          const container = document.getElementById('paymentsContainer');
          if (container) renderPayments(container);
          renderStats();
          renderRevenueChart();
          renderHistoryCompact();
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payment_history' },
        async () => {
          await fetchPaymentHistory();
          renderHistoryCompact();
          const timeline = document.getElementById('historyTimeline');
          if (timeline) {
            const paymentId = timeline.closest?.('[data-payment-id]');
            // Re-render if history modal is open
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Payments] Realtime connected');
        }
      });
  }

  // ─── Public API ───

  function setSearch(val) { filters.search = val; }
  function setStatusFilter(val) { filters.status = val; }
  function setSort(val) { filters.sort = val; }

  function getPayments() { return payments; }
  function getFilteredPayments() { applyFilters(); return filterPayments; }
  function getPaymentHistory() { return paymentHistory; }

  function onChange(cb) {
    onChangeCallbacks.push(cb);
    return () => {
      onChangeCallbacks = onChangeCallbacks.filter(c => c !== cb);
    };
  }

  function notifyChange() {
    const stats = getStats();
    onChangeCallbacks.forEach(cb => {
      try { cb(payments, stats); } catch (e) { console.warn('[Payments] onChange error:', e); }
    });
  }

  async function retry() {
    _error = null;
    _loading = true;
    const container = document.getElementById('paymentsContainer');
    if (container) renderSkeleton(container);
    try {
      await fetchPayments();
      await fetchPaymentHistory();
      if (container) renderPayments(container);
      renderStats();
      renderRevenueChart();
      renderHistoryCompact();
    } catch (err) {
      if (container) renderError(container, err);
    }
  }

  async function init(containerEl) {
    _loading = true;
    if (containerEl) renderSkeleton(containerEl);

    const timeout = setTimeout(() => {
      if (_loading) {
        _loading = false;
        _error = new Error('Loading timed out');
        console.error('[Payments] Loading timed out');
        if (containerEl) renderError(containerEl, _error);
      }
    }, 20000);

    try {
      await fetchPayments();
      clearTimeout(timeout);
      await fetchPaymentHistory();
      if (containerEl) renderPayments(containerEl);
      renderStats();
      renderRevenueChart();
      renderHistoryCompact();
      setupRealtime();
    } catch (err) {
      clearTimeout(timeout);
      _error = err;
      if (containerEl) renderError(containerEl, err);
    }
  }

  function destroy() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    payments = [];
    paymentHistory = [];
    filterPayments = [];
    onChangeCallbacks = [];
  }

  return {
    init,
    destroy,
    retry,
    renderPayments,
    renderStats,
    renderRevenueChart,
    renderHistoryCompact,
    getPayments,
    getFilteredPayments,
    getPaymentHistory,
    getStats,
    getMonthlyRevenue,
    createPayment,
    updatePayment,
    deletePayment,
    openPaymentModal,
    openHistoryModal,
    setSearch,
    setStatusFilter,
    setSort,
    showConfirmDialog,
    onChange,
    formatDate,
    formatCurrency,
    timeAgo,
    getInitials,
    escapeHtml,
    STATUS,
    get status() { return _error ? 'error' : _loading ? 'loading' : 'ready'; },
    get loading() { return _loading; },
    get error() { return _error; },
  };
})();
