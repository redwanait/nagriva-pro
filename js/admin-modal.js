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

  function buildModal(prefill) {
    const isEditing = !!prefill;
    const statusOptions = Object.entries(NAGRIVA_AdminOrders.STATUS)
      .map(([key, cfg]) =>
        `<option value="${key}"${prefill && prefill.status === key ? ' selected' : ''}>${cfg.label}</option>`
      ).join('');

    const serviceOptions = SERVICES
      .map(s =>
        `<option value="${s}"${prefill && prefill.serviceType === s ? ' selected' : ''}>${s}</option>`
      ).join('');

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
                <label>Project Title <span class="required">*</span></label>
                <input type="text" id="of_projectTitle" placeholder="e.g. Lumos Web Design" value="${(prefill && prefill.projectTitle) || ''}" required />
                <span class="field-error">Project title is required</span>
              </div>
              <div class="order-form-field">
                <label>Service Type <span class="required">*</span></label>
                <select id="of_serviceType" required>
                  <option value="">Select service...</option>
                  ${serviceOptions}
                </select>
                <span class="field-error">Please select a service type</span>
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

  function open(options) {
    const { onSubmit, onClose, prefill } = options || {};
    onSubmitCallback = onSubmit || null;
    onCloseCallback = onClose || null;
    isEditMode = !!prefill;
    editOrderId = prefill ? prefill.id : null;

    if (overlay) { overlay.remove(); overlay = null; }

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
      if (e.key === 'Enter') { e.preventDefault(); handleSubmit(form, closeModal, submitBtn); }
    });

    requestAnimationFrame(() => overlay.classList.add('active'));
    document.body.style.overflow = 'hidden';
  }

  async function handleSubmit(form, closeModal, submitBtn) {
    const fields = {
      projectTitle: form.querySelector('#of_projectTitle'),
      serviceType: form.querySelector('#of_serviceType'),
      budget: form.querySelector('#of_budget'),
      deadline: form.querySelector('#of_deadline'),
      status: form.querySelector('#of_status'),
      additionalNotes: form.querySelector('#of_additionalNotes'),
    };

    form.querySelectorAll('.order-form-field').forEach(el => el.classList.remove('has-error'));
    let isValid = true;

    if (!fields.projectTitle.value.trim()) {
      fields.projectTitle.closest('.order-form-field').classList.add('has-error'); isValid = false;
    }

    if (!fields.serviceType.value) {
      fields.serviceType.closest('.order-form-field').classList.add('has-error'); isValid = false;
    }

    const budget = parseFloat(fields.budget.value);
    if (!fields.budget.value.trim() || isNaN(budget) || budget <= 0) {
      fields.budget.closest('.order-form-field').classList.add('has-error'); isValid = false;
    }

    if (!isValid) return;

    const orderData = {
      projectTitle: fields.projectTitle.value.trim(),
      serviceType: fields.serviceType.value,
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
        showToast('success', 'Order Updated', `${orderData.projectTitle} \u2014 ${orderData.serviceType} updated successfully`);
        if (onSubmitCallback) onSubmitCallback(orderData);
      } else {
        const order = await NAGRIVA_AdminOrders.createOrder(orderData);
        closeModal();
        showToast('success', 'Order Created', `${order.projectTitle} \u2014 ${order.serviceType} (${NAGRIVA_AdminOrders.formatCurrency(order.budget)})`);
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
