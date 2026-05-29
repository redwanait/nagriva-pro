const NAGRIVA_Modal = (() => {
  let overlay = null;
  let modal = null;
  let onSubmitCallback = null;
  let onCloseCallback = null;
  let isEditMode = false;
  let editOrderId = null;

  const SERVICES = [
    'Web Design',
    'UI/UX Design',
    'Brand Identity',
    'SEO Package',
    'AI Automation',
    'Social Media',
    'Content Writing',
    'Performance Marketing',
    'Email Marketing',
    'Video Production'
  ];

  let _clientOptions = [];

  function buildModal(prefill) {
    const isEditing = !!prefill;
    const statusOptions = Object.entries(NAGRIVA_AdminOrders.STATUS)
      .map(([key, cfg]) =>
        `<option value="${key}"${prefill && prefill.status === key ? ' selected' : ''}>${cfg.label}</option>`
      ).join('');

    const serviceOptions = SERVICES
      .map(s =>
        `<option value="${s}"${prefill && prefill.service === s ? ' selected' : ''}>${s}</option>`
      ).join('');

    const prefillName = (prefill && prefill.clientName) || '';
    const prefillEmail = (prefill && prefill.clientEmail) || '';
    const prefillClientId = (prefill && prefill.clientId) || '';

    const div = document.createElement('div');
    div.className = 'order-modal-overlay';
    div.id = 'newOrderModal';
    div.innerHTML = `
      <div class="order-modal">
        <div class="order-modal-glow"></div>
        <div class="order-modal-header">
          <div>
            <h2>${isEditing ? 'Edit Order' : 'New Order'}</h2>
            <p>${isEditing ? 'Update order details and status.' : 'Create a new client order and start tracking progress.'}</p>
          </div>
          <button class="order-modal-close" id="orderModalClose">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="order-modal-body">
          <form id="orderForm" autocomplete="off">
            <div class="order-form-grid">
              <div class="order-form-field full-width">
                <label>Client</label>
                <div class="client-search-wrap${prefillClientId ? ' has-selected' : ''}" id="of_clientSearchWrap">
                  <input type="text" id="of_clientSearch" placeholder="Search existing clients..." autocomplete="off" value="${prefillName}" />
                  <input type="hidden" id="of_clientId" value="${prefillClientId}" />
                  <i class="fas fa-chevron-down client-search-icon" id="of_clientSearchIcon"></i>
                  <button class="client-search-clear${prefillClientId ? ' visible' : ''}" id="of_clientSearchClear" type="button"><i class="fas fa-times"></i></button>
                  <div class="client-search-dropdown" id="of_clientDropdown"></div>
                </div>
              </div>
              <div class="order-form-field">
                <label>Client Name <span class="required">*</span></label>
                <input type="text" id="of_clientName" placeholder="e.g. Sarah Kim" value="${prefillName}" required />
                <span class="field-error">Client name is required</span>
              </div>
              <div class="order-form-field">
                <label>Client Email</label>
                <input type="email" id="of_clientEmail" placeholder="client@example.com" value="${prefillEmail}" />
              </div>
              <div class="order-form-field">
                <label>Project Title <span class="required">*</span></label>
                <input type="text" id="of_projectTitle" placeholder="e.g. Lumos Web Design" value="${(prefill && prefill.projectTitle) || ''}" required />
                <span class="field-error">Project title is required</span>
              </div>
              <div class="order-form-field">
                <label>Service <span class="required">*</span></label>
                <select id="of_service" required>
                  <option value="">Select service...</option>
                  ${serviceOptions}
                </select>
                <span class="field-error">Please select a service</span>
              </div>
              <div class="order-form-field">
                <label>Budget ($) <span class="required">*</span></label>
                <input type="number" id="of_budget" placeholder="e.g. 5000" min="0" step="100" value="${(prefill && prefill.budget) || ''}" required />
                <span class="field-error">Budget is required</span>
              </div>
              <div class="order-form-field">
                <label>Deadline</label>
                <input type="date" id="of_deadline" value="${(prefill && prefill.deadline) || ''}" />
              </div>
              <div class="order-form-field">
                <label>Status</label>
                <select id="of_status">
                  ${statusOptions}
                </select>
              </div>
              <div class="order-form-field full-width">
                <label>Notes</label>
                <textarea id="of_additionalNotes" placeholder="Additional details about this order..." rows="3">${(prefill && prefill.additionalNotes) || ''}</textarea>
              </div>
            </div>
          </form>
        </div>
        <div class="order-modal-footer">
          <button class="btn btn-secondary" id="orderModalCancel">Cancel</button>
          <button class="btn btn-primary" id="orderModalSubmit">
            <i class="fas ${isEditing ? 'fa-save' : 'fa-plus'}"></i> <span>${isEditing ? 'Save Changes' : 'Create Order'}</span>
          </button>
        </div>
      </div>`;
    return div;
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

  function getAvatarClass(name) {
    const classes = ['a1','a2','a3','a4','a5','a6'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
    return classes[Math.abs(hash) % classes.length];
  }

  function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  function renderDropdown(filterText) {
    const dropdown = document.getElementById('of_clientDropdown');
    const wrap = document.getElementById('of_clientSearchWrap');
    if (!dropdown || !wrap) return;
    const q = (filterText || '').toLowerCase().trim();
    const filtered = q
      ? _clientOptions.filter(c =>
          c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
        )
      : _clientOptions;
    const selectedId = document.getElementById('of_clientId')?.value || '';
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

  function selectClient(id, name, email) {
    const searchInput = document.getElementById('of_clientSearch');
    const clientIdField = document.getElementById('of_clientId');
    const clientNameField = document.getElementById('of_clientName');
    const emailField = document.getElementById('of_clientEmail');
    const wrap = document.getElementById('of_clientSearchWrap');
    const clearBtn = document.getElementById('of_clientSearchClear');
    if (!searchInput || !clientIdField) return;
    clientIdField.value = id || '';
    if (name && searchInput) searchInput.value = name;
    if (name && clientNameField) clientNameField.value = name;
    if (emailField) emailField.value = email || '';
    if (wrap) wrap.classList.toggle('has-selected', !!id);
    if (clearBtn) clearBtn.classList.toggle('visible', !!id);
    closeDropdown();
  }

  function closeDropdown() {
    const dropdown = document.getElementById('of_clientDropdown');
    if (dropdown) dropdown.classList.remove('open');
  }

  function openDropdown() {
    const dropdown = document.getElementById('of_clientDropdown');
    if (dropdown) {
      renderDropdown(document.getElementById('of_clientSearch')?.value || '');
      dropdown.classList.add('open');
    }
  }

  function setupClientSearch(form) {
    const searchInput = form.querySelector('#of_clientSearch');
    const clientIdField = form.querySelector('#of_clientId');
    const clientNameField = form.querySelector('#of_clientName');
    const emailField = form.querySelector('#of_clientEmail');
    const clearBtn = form.querySelector('#of_clientSearchClear');
    const dropdown = form.querySelector('#of_clientDropdown');
    const wrap = form.querySelector('#of_clientSearchWrap');
    if (!searchInput) return;

    // Show all on focus
    searchInput.addEventListener('focus', () => {
      openDropdown();
    });

    // Filter on input
    searchInput.addEventListener('input', function() {
      const val = this.value;
      // If user types, clear the clientId selection
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
      const dd = document.getElementById('of_clientDropdown');
      if (dd) dd.classList.add('open');
    });

    // Select on click via delegation
    if (dropdown) {
      dropdown.addEventListener('click', function(e) {
        const opt = e.target.closest('.client-search-option');
        if (!opt) return;
        selectClient(
          opt.dataset.id,
          opt.dataset.name,
          opt.dataset.email
        );
      });
    }

    // Clear button
    if (clearBtn) {
      clearBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        selectClient('', '', '');
        if (searchInput) searchInput.value = '';
        if (clientNameField) clientNameField.value = '';
        if (emailField) emailField.value = '';
        searchInput?.focus();
      });
    }

    // Close on outside click
    document.addEventListener('mousedown', function outsideHandler(e) {
      if (wrap && !wrap.contains(e.target)) {
        closeDropdown();
      }
    });

    // Keyboard navigation
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
        // Scroll into view
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
          selectClient(
            highlighted.dataset.id,
            highlighted.dataset.name,
            highlighted.dataset.email
          );
        }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });
  }

  function open(options) {
    const { onSubmit, onClose, prefill } = options || {};
    onSubmitCallback = onSubmit || null;
    onCloseCallback = onClose || null;
    isEditMode = !!prefill;
    editOrderId = prefill ? prefill.id : null;

    if (overlay) { overlay.remove(); overlay = null; }

    loadClientOptions().then(() => {
      overlay = buildModal(prefill);
      modal = overlay.querySelector('.order-modal');
      document.body.appendChild(overlay);

      const closeBtn = overlay.querySelector('#orderModalClose');
      const cancelBtn = overlay.querySelector('#orderModalCancel');
      const submitBtn = overlay.querySelector('#orderModalSubmit');
      const form = overlay.querySelector('#orderForm');

      function closeModal() {
        overlay.classList.remove('active');
        setTimeout(() => {
          if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
          overlay = null; modal = null;
          if (onCloseCallback) onCloseCallback();
        }, 400);
        document.body.style.overflow = '';
      }

      closeBtn.addEventListener('click', closeModal);
      cancelBtn.addEventListener('click', closeModal);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
      });

      submitBtn.addEventListener('click', () => handleSubmit(form, closeModal, submitBtn));
      form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.id !== 'of_clientSearch') {
          e.preventDefault(); handleSubmit(form, closeModal, submitBtn);
        }
      });

      setupClientSearch(form);

      requestAnimationFrame(() => overlay.classList.add('active'));
      document.body.style.overflow = 'hidden';
    });
  }

  async function handleSubmit(form, closeModal, submitBtn) {
    const fields = {
      clientName: form.querySelector('#of_clientName'),
      clientEmail: form.querySelector('#of_clientEmail'),
      clientIdField: form.querySelector('#of_clientId'),
      projectTitle: form.querySelector('#of_projectTitle'),
      service: form.querySelector('#of_service'),
      budget: form.querySelector('#of_budget'),
      deadline: form.querySelector('#of_deadline'),
      status: form.querySelector('#of_status'),
      additionalNotes: form.querySelector('#of_additionalNotes'),
    };

    form.querySelectorAll('.order-form-field').forEach(el => el.classList.remove('has-error'));
    let isValid = true;

    if (!fields.clientName.value.trim()) {
      fields.clientName.closest('.order-form-field').classList.add('has-error'); isValid = false;
    }

    if (!fields.projectTitle.value.trim()) {
      fields.projectTitle.closest('.order-form-field').classList.add('has-error'); isValid = false;
    }

    if (!fields.service.value) {
      fields.service.closest('.order-form-field').classList.add('has-error'); isValid = false;
    }

    const budget = parseFloat(fields.budget.value);
    if (!fields.budget.value.trim() || isNaN(budget) || budget <= 0) {
      fields.budget.closest('.order-form-field').classList.add('has-error'); isValid = false;
    }

    if (!isValid) return;

    const clientId = fields.clientIdField ? fields.clientIdField.value : null;

    const orderData = {
      clientName: fields.clientName.value.trim(),
      clientEmail: fields.clientEmail ? fields.clientEmail.value.trim() : '',
      clientId: clientId || null,
      projectTitle: fields.projectTitle.value.trim(),
      service: fields.service.value,
      budget: budget,
      deadline: fields.deadline.value || '',
      status: fields.status.value || 'pending',
      additionalNotes: fields.additionalNotes.value.trim() || '',
    };

    submitBtn.disabled = true;
    const originalHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
      if (isEditMode && editOrderId) {
        await NAGRIVA_AdminOrders.updateOrder(editOrderId, orderData);
        closeModal();
        showToast('success', 'Order Updated', `${orderData.clientName} \u2014 ${orderData.service} updated successfully`);
        if (onSubmitCallback) onSubmitCallback(orderData);
      } else {
        const order = await NAGRIVA_AdminOrders.createOrder(orderData);
        closeModal();
        showToast('success', 'Order Created', `${order.clientName} \u2014 ${order.service} (${NAGRIVA_AdminOrders.formatCurrency(order.budget)})`);
        if (onSubmitCallback) onSubmitCallback(order);
      }
    } catch (err) {
      console.error('Order operation failed:', err);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
      showToast('error', 'Operation Failed', err.message || 'Something went wrong. Please try again.');
    }
  }

  function showConfirm(title, message) {
    return new Promise((resolve) => {
      const overlayEl = document.createElement('div');
      overlayEl.className = 'confirm-modal-overlay';
      overlayEl.innerHTML = `
        <div class="confirm-modal">
          <div class="confirm-modal-icon"><i class="fas fa-exclamation-triangle"></i></div>
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="confirm-modal-actions">
            <button class="btn btn-secondary" id="confirmCancel">Cancel</button>
            <button class="btn btn-primary" id="confirmOk" style="background:var(--danger);color:#fff;">Delete</button>
          </div>
        </div>`;
      document.body.appendChild(overlayEl);
      requestAnimationFrame(() => overlayEl.classList.add('active'));

      function closeConfirm() {
        overlayEl.classList.remove('active');
        setTimeout(() => { overlayEl.remove(); }, 300);
      }

      overlayEl.querySelector('#confirmCancel').addEventListener('click', () => { closeConfirm(); resolve(false); });
      overlayEl.querySelector('#confirmOk').addEventListener('click', () => { closeConfirm(); resolve(true); });
      overlayEl.addEventListener('click', (e) => { if (e.target === overlayEl) { closeConfirm(); resolve(false); } });
      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') { closeConfirm(); resolve(false); document.removeEventListener('keydown', escHandler); }
      });
    });
  }

  return { open, showConfirm, showToast, SERVICES };
})();
