/* ════════════════════════════════════════════════════════
   NAGRIVA — Order Tracking (Premium)
   order-tracking.js
   ════════════════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {

  const statusOrder = ['pending', 'in_progress', 'review', 'delivered'];
  let currentOrderId = null;

  /* ─── Custom Select ─── */
  const customSelect = document.getElementById('customTrackSelect');
  const customTrigger = document.getElementById('customSelectTrigger');
  const customValue = document.getElementById('customSelectValue');
  const customOptions = document.getElementById('customSelectOptions');
  const nativeSelect = document.getElementById('trackOrderSelect');

  function toggleCustomSelect(open) {
    if (open === undefined) {
      customSelect.classList.toggle('open');
    } else if (open) {
      customSelect.classList.add('open');
    } else {
      customSelect.classList.remove('open');
    }
  }

  function populateCustomSelect() {
    customOptions.innerHTML = '';
    const opts = nativeSelect.querySelectorAll('option');
    opts.forEach(opt => {
      const div = document.createElement('div');
      div.className = 'custom-select-option' + (opt.selected ? ' selected' : '');
      div.dataset.value = opt.value;
      div.textContent = opt.textContent;
      if (opt.selected) {
        customValue.textContent = opt.value ? opt.textContent : opt.textContent;
        customValue.classList.toggle('placeholder', !opt.value);
      }
      customOptions.appendChild(div);
    });
  }

  customTrigger.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleCustomSelect();
  });

  customOptions.addEventListener('click', function(e) {
    const opt = e.target.closest('.custom-select-option');
    if (!opt) return;
    const value = opt.dataset.value;
    nativeSelect.value = value;
    customValue.textContent = opt.textContent;
    customValue.classList.remove('placeholder');
    customOptions.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    toggleCustomSelect(false);
    nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  });

  document.addEventListener('click', function() {
    toggleCustomSelect(false);
  });

  customSelect.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') toggleCustomSelect(false);
  });

  /* ─── Load Orders Into Select ─── */
  async function loadOrderSelect() {
    try {
      const select = nativeSelect;
      const orders = await NagrivaOrders.getUserOrders();
      select.innerHTML = '<option value="">Select an order...</option>';
      orders.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = (o.order_number || '#' + (o.id || '').slice(0, 8)) + ' — ' + (o.project_title || o.project_name || 'Untitled');
        select.appendChild(opt);
      });
      populateCustomSelect();

      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      if (id && select.querySelector('option[value="' + id + '"]')) {
        select.value = id;
        const opt = customOptions.querySelector('[data-value="' + id + '"]');
        if (opt) {
          customValue.textContent = opt.textContent;
          customValue.classList.remove('placeholder');
          opt.classList.add('selected');
        }
        loadOrderTracking(id);
      }
    } catch (err) {
      console.error('[OrderTracking] loadOrderSelect failed:', err.message || err);
      nativeSelect.innerHTML = '<option value="">Failed to load orders</option>';
      populateCustomSelect();
    }
  }

  /* ─── Select Change ─── */
  nativeSelect.addEventListener('change', function() {
    const id = this.value;
    /* Sync custom select */
    const opt = customOptions.querySelector('[data-value="' + id + '"]');
    if (opt) {
      customValue.textContent = opt.textContent;
      customValue.classList.remove('placeholder');
      customOptions.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    } else if (!id) {
      customValue.textContent = 'Select an order...';
      customValue.classList.add('placeholder');
    }
    if (id) {
      loadOrderTracking(id);
      const url = new URL(window.location);
      url.searchParams.set('id', id);
      window.history.replaceState({}, '', url);
    } else {
      document.getElementById('trackDashboard').style.display = 'none';
      document.getElementById('noOrderSection').style.display = '';
    }
  });

  /* ─── Load Tracking Data ─── */
  async function loadOrderTracking(orderId) {
    currentOrderId = orderId;
    const container = document.getElementById('trackContent');
    const dashboard = document.getElementById('trackDashboard');
    const noOrder = document.getElementById('noOrderSection');

    dashboard.style.display = '';
    noOrder.style.display = 'none';
    container.innerHTML =
      '<div class="track-skeleton">' +
      '<div class="track-skeleton-card"><div class="track-skeleton-line thick short"></div><div class="track-skeleton-line thin medium"></div><div class="track-skeleton-line" style="margin-top:16px;"></div><div class="track-skeleton-row" style="margin-top:20px;"><div class="track-skeleton-line"></div><div class="track-skeleton-line"></div><div class="track-skeleton-line"></div></div></div>' +
      '<div class="track-skeleton-grid">' +
      '<div class="track-left"><div class="track-skeleton-card"><div class="track-skeleton-row"><div class="track-skeleton-circle"></div><div style="flex:1;"><div class="track-skeleton-line medium"></div><div class="track-skeleton-line long"></div></div></div><div class="track-skeleton-line" style="margin-top:16px;"></div><div class="track-skeleton-line"></div><div class="track-skeleton-line medium"></div></div></div>' +
      '<div class="track-right"><div class="track-skeleton-card"><div class="track-skeleton-row"><div class="track-skeleton-circle"></div><div style="flex:1;"><div class="track-skeleton-line medium"></div><div class="track-skeleton-line long"></div></div></div><div class="track-skeleton-line" style="margin-top:16px;"></div><div class="track-skeleton-line"></div><div class="track-skeleton-line short"></div></div></div>' +
      '</div></div>';

    try {
      const order = await NagrivaOrders.getOrder(orderId);
      const files = await NagrivaOrders.getFiles(orderId);
      const activity = await NagrivaOrders.getActivity(orderId);
      const msgs = await NagrivaOrders.getMessages(orderId);

      const currentIdx = statusOrder.indexOf(order.status);
      const progress = currentIdx >= 0 ? ((currentIdx + 1) / statusOrder.length) * 100 : 0;

      const createdDate = new Date(order.created_at);
      const deadlineDate = order.deadline ? new Date(order.deadline) : new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const totalDays = Math.max(1, Math.ceil((deadlineDate - createdDate) / (1000 * 60 * 60 * 24)));
      const elapsedDays = Math.max(0, Math.ceil((Date.now() - createdDate) / (1000 * 60 * 60 * 24)));
      const remainingDays = Math.max(0, totalDays - elapsedDays);
      const timePercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

      const statusLabel = NagrivaOrders.getStatusLabel(order.status);
      const badgeClass = NagrivaOrders.getStatusBadgeClass(order.status);
      const createdFormatted = NagrivaOrders.formatDate(order.created_at);

      /* Progress circle */
      const circumference = 2 * Math.PI * 24;
      const offset = circumference * (1 - progress / 100);

      /* Stages */
      let stagesHtml = '';
      statusOrder.forEach((s, i) => {
        let stateClass = 'pending';
        let icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/></svg>';
        if (i < currentIdx) {
          stateClass = 'completed';
          icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
        } else if (i === currentIdx) {
          stateClass = 'active';
          icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
        }
        stagesHtml += '<div class="track-stage ' + stateClass + '"><div class="track-stage-icon">' + icon + '</div>' +
          '<div class="track-stage-info"><span class="track-stage-label">' + NagrivaOrders.getStatusLabel(s) + '</span>' +
          (i <= currentIdx ? '<span class="track-stage-date">' + createdFormatted + '</span>' : '') +
          '</div>' + (i < 3 ? '<div class="track-stage-line"></div>' : '') + '</div>';
      });

      /* Files */
      let filesHtml = '';
      if (files.length === 0) {
        filesHtml = '<div class="track-file-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span class="tfe-label">No files yet</span><span class="tfe-text">Delivered files and project assets will appear here once they\'re ready.</span></div>';
      } else {
        files.forEach(f => {
          const isDeliverable = f.uploaded_by === 'admin';
          filesHtml += '<a href="' + f.public_url + '" target="_blank" class="track-file-item" download>' +
            '<div class="track-file-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
            '<div class="track-file-info"><span class="track-file-name">' + f.file_name + (isDeliverable ? ' <span style="color:var(--accent);font-size:0.65rem;">✓ Deliverable</span>' : '') + '</span>' +
            '<span class="track-file-size">' + NagrivaOrders.formatFileSize(f.file_size) + '</span></div>' +
            '<div class="track-file-dl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div></a>';
        });
      }

      /* Timeline */
      let timelineHtml = '';
      if (activity.length === 0) {
        timelineHtml = '<div style="text-align:center;padding:32px 20px;color:var(--gray2);font-size:0.82rem;animation:of-fadeInUp 0.4s ease-out;"><div style="width:40px;height:40px;border-radius:50%;background:rgba(0,245,196,0.04);border:1px solid rgba(0,245,196,0.08);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;color:var(--accent);font-size:0.9rem;"><i class="fas fa-clock"></i></div><div style="font-family:\'Syne\',sans-serif;font-weight:600;font-size:0.85rem;color:var(--white);margin-bottom:3px;">No activity yet</div><div style="font-size:0.75rem;color:var(--gray2);max-width:220px;margin:0 auto;line-height:1.5;">Project updates and status changes will appear here.</div></div>';
      } else {
        activity.forEach(a => {
          timelineHtml += '<div class="track-tl-item"><div class="track-tl-dot"></div><div class="track-tl-content">' +
            '<div class="track-tl-head"><span class="track-tl-title">' + (a.action || 'Update') + '</span>' +
            '<span class="track-tl-time">' + NagrivaOrders.formatTimeAgo(a.created_at) + '</span></div>' +
            '<p class="track-tl-desc">' + (a.description || '') + '</p></div></div>';
        });
      }

      /* Revisions */
      const revisionMsgs = msgs.filter(m => m.message.startsWith('[REVISION REQUEST]'));
      const revisionsRemaining = Math.max(0, 3 - revisionMsgs.length);

      const serviceLabel = order.service_type.replace(/_/g, ' ').replace(/\b\w/g,function(c){return c.toUpperCase();});

      container.innerHTML =
        '<div class="track-progress-wrap fade-up">' +
        '<div class="track-progress-header">' +
        '<div class="track-progress-left">' +
        '<h2 class="track-progress-title">' + order.project_title + '</h2>' +
        '<span class="track-progress-subtitle">' + serviceLabel + '</span></div>' +
        '<div class="track-progress-right">' +
        '<span class="track-progress-status">' + statusLabel + '</span>' +
        '<div class="track-progress-circle">' +
        '<svg class="progress-ring" width="52" height="52" viewBox="0 0 52 52">' +
        '<defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#00f5c4"/><stop offset="100%" stop-color="#00c2a8"/></linearGradient></defs>' +
        '<circle class="progress-ring-bg" cx="26" cy="26" r="24"/>' +
        '<circle class="progress-ring-fill" cx="26" cy="26" r="24" stroke="url(#pg)" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"/>' +
        '</svg><span class="progress-ring-text">' + Math.round(progress) + '%</span></div></div></div>' +
        '<div class="track-progress-bar-bg"><div class="track-progress-bar-fill" id="progressFill" style="width:' + progress + '%;"></div></div>' +
        '<div class="track-progress-stages">' + stagesHtml + '</div></div>' +

        '<div class="track-grid">' +
        '<div class="track-left">' +

        '<div class="track-card fade-up">' +
        '<div class="track-card-header"><div class="track-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg></div>' +
        '<h3 class="track-card-title">Order Details</h3></div>' +
        '<div class="track-card-body">' +
        '<div class="track-detail-row"><span class="track-detail-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>Order ID</span><span class="track-detail-value track-id">' + (order.order_number || '#' + (order.id || '').slice(0, 8)) + '</span></div>' +
        '<div class="track-detail-row"><span class="track-detail-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Service</span><span class="track-detail-value">' + serviceLabel + '</span></div>' +
        '<div class="track-detail-row"><span class="track-detail-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Status</span><span class="track-detail-value"><span class="track-status-badge ' + badgeClass + '">' + statusLabel + '</span></span></div>' +
        '<div class="track-detail-row"><span class="track-detail-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Project Manager</span><span class="track-detail-value">' + (order.project_manager || 'Assigning soon') + '</span></div>' +
        '<div class="track-detail-row"><span class="track-detail-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Created</span><span class="track-detail-value">' + NagrivaOrders.formatDate(order.created_at) + '</span></div>' +
        (order.budget ? '<div class="track-detail-row"><span class="track-detail-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Budget</span><span class="track-detail-value track-paid">$' + parseInt(order.budget).toLocaleString() + '</span></div>' : '') +
        '</div></div>' +

        '<div class="track-card fade-up" style="--delay:0.1s">' +
        '<div class="track-card-header"><div class="track-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>' +
        '<h3 class="track-card-title">Activity Timeline</h3></div>' +
        '<div class="track-timeline">' + timelineHtml + '</div></div>' +
        '</div>' +

        '<div class="track-right">' +

        /* ─── Tab Navigation ─── */
        '<div class="track-tabs">' +
        '<button class="track-tab active" data-tab="details" onclick="switchTrackTab(\'details\')">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>Details</button>' +
        '<button class="track-tab" data-tab="messages" onclick="switchTrackTab(\'messages\')">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Messages</button>' +
        '<button class="track-tab" data-tab="files" onclick="switchTrackTab(\'files\')">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Files</button>' +
        '</div>' +

        /* ─── Details Tab ─── */
        '<div class="track-tab-content" id="trackTabDetails">' +
        '<div class="track-card track-delivery-card fade-up" style="--delay:0.05s">' +
        '<div class="track-delivery-glow"></div>' +
        '<div class="track-card-header"><div class="track-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>' +
        '<h3 class="track-card-title">Estimated Delivery</h3></div>' +
        '<div class="track-delivery-body">' +
        '<div class="track-delivery-top"><div class="track-delivery-date-wrap"><span class="track-delivery-day" id="trackRemainingDays">' + remainingDays + '</span><span class="track-delivery-month">Days Remaining</span></div>' +
        '<div class="track-delivery-info"><span class="track-delivery-label">Expected by</span><span class="track-delivery-date">' + NagrivaOrders.formatDate(order.deadline || deadlineDate) + '</span></div></div>' +
        '<div class="track-delivery-bar"><div class="track-delivery-bar-fill" style="width:' + timePercent + '%;"></div>' +
        '<div class="track-delivery-bar-dot" style="left:' + timePercent + '%;opacity:1;"></div></div>' +
        '<div class="track-delivery-footer"><span>' + timePercent + '% of time elapsed</span><span>' + remainingDays + ' days remaining</span></div></div></div>' +

        '<div class="track-card fade-up" style="--delay:0.1s">' +
        '<div class="track-card-header"><div class="track-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
        '<h3 class="track-card-title">Files & Deliverables</h3></div>' +
        '<div class="track-files">' + filesHtml + '</div></div>' +

        '<div class="track-card track-revision-card fade-up" style="--delay:0.15s">' +
        '<div class="track-card-header"><div class="track-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></div>' +
        '<h3 class="track-card-title">Need Changes?</h3></div>' +
        '<div class="track-revision-body">' +
        '<p class="track-revision-desc">You have <strong>' + revisionsRemaining + ' revisions</strong> remaining. Submit a revision request and we\'ll get back to you within 24 hours.</p>' +
        '<button class="track-revision-btn" id="revisionBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg><span>Request Revision</span></button></div></div>' +
        '</div>' +

        /* ─── Messages Tab ─── */
        '<div class="track-tab-content" id="trackTabMessages" style="display:none;">' +
        '<div class="track-chat-container" id="trackChatContainer">' +
        '<div class="track-chat-messages" id="trackChatMessages">' +
        '<div class="track-chat-empty">' +
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
        '<span style="font-family:\'Syne\',sans-serif;font-weight:600;font-size:0.85rem;color:var(--white);">No messages yet</span>' +
        '<span style="font-size:0.75rem;color:var(--gray2);text-align:center;">Start the conversation! Send a message about this project.</span>' +
        '</div></div>' +
        '<div class="track-chat-input-area">' +
        '<div class="track-chat-input-row">' +
        '<input type="text" class="track-chat-input" id="trackChatInput" placeholder="Type a message..." autocomplete="off" />' +
        '<button class="track-chat-send" id="trackChatSend" onclick="sendTrackMessage()">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        '</button></div></div></div>' +
        '</div>' +

        /* ─── Files Tab ─── */
        '<div class="track-tab-content" id="trackTabFiles" style="display:none;">' +
        '<div class="track-card fade-up">' +
        '<div class="track-card-header"><div class="track-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
        '<h3 class="track-card-title">All Files</h3></div>' +
        '<div class="track-files" id="trackFilesTabContent">' + filesHtml + '</div></div>' +
        '</div>' +

        '</div></div>';

      /* Re-bind revision button */
      const revisionBtn = document.getElementById('revisionBtn');
      if (revisionBtn) {
        revisionBtn.addEventListener('click', async function() {
          this.classList.add('loading');
          const span = this.querySelector('span');
          const original = span.textContent;
          span.textContent = 'Opening Client Portal...';

          setTimeout(() => {
            window.location.href = 'client-portal.html?id=' + orderId;
          }, 800);
        });
      }

      /* Setup order chat */
      setupOrderChat(orderId);

      /* Setup track tab files */
      renderTrackFilesTab(orderId);

      /* Animate progress bar */
      setTimeout(() => {
        const fill = document.getElementById('progressFill');
        if (fill) fill.style.transition = 'width 1.2s cubic-bezier(0.4,0,0.2,1)';
      }, 100);

    } catch (err) {
      console.error('[OrderTracking] loadOrderTracking failed:', err.message || err);
      container.innerHTML = '<div style="text-align:center;padding:48px 24px;color:var(--gray2);display:flex;flex-direction:column;align-items:center;gap:12px;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:0.3;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Failed to load tracking data</span><span style="font-size:0.78rem;color:var(--gray2);">' + err.message + '</span></div>';
    }
  }

  /* ════════════════════════════════════════════
     TRACK TAB SYSTEM
     ════════════════════════════════════════════ */

  /* ─── Tab Switching ─── */
  window.switchTrackTab = function(tab) {
    document.querySelectorAll('.track-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.track-tab-content').forEach(t => t.style.display = 'none');
    const activeTab = document.querySelector('.track-tab[data-tab="' + tab + '"]');
    if (activeTab) activeTab.classList.add('active');
    const content = document.getElementById('trackTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (content) content.style.display = '';
  };

  /* ─── Order Chat ─── */
  let trackMsgSubscription = null;
  let trackChatInited = false;

  function setupOrderChat(orderId) {
    trackChatInited = false;
    if (trackMsgSubscription) {
      trackMsgSubscription.unsubscribe();
      trackMsgSubscription = null;
    }

    const input = document.getElementById('trackChatInput');
    const sendBtn = document.getElementById('trackChatSend');
    if (!input || !sendBtn) return;

    input.removeEventListener('keydown', input._trackKeyHandler);
    sendBtn.removeEventListener('click', sendBtn._trackClickHandler);

    input._trackKeyHandler = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendTrackMessage();
      }
    };
    input.addEventListener('keydown', input._trackKeyHandler);

    loadTrackMessages(orderId);

    trackMsgSubscription = NagrivaOrders.subscribeToMessages(orderId, function(msg) {
      appendTrackMessage(msg);
    });

    window._currentTrackOrderId = orderId;
  }

  async function loadTrackMessages(orderId) {
    const container = document.getElementById('trackChatMessages');
    if (!container) return;
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;flex:1;padding:40px;"><div style="width:120px;height:10px;border-radius:99px;background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%);background-size:200% 100%;animation:pos-shimmer 1.5s ease-in-out infinite;"></div></div>';
    try {
      const msgs = await NagrivaOrders.getMessages(orderId);
      container.innerHTML = '';
      if (msgs.length === 0) {
        container.innerHTML =
          '<div class="track-chat-empty">' +
          '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
          '<span style="font-family:\'Syne\',sans-serif;font-weight:600;font-size:0.85rem;color:var(--white);">No messages yet</span>' +
          '<span style="font-size:0.75rem;color:var(--gray2);text-align:center;">Send a message to start the conversation about this project.</span>' +
          '</div>';
      } else {
        msgs.forEach(function(m) { appendTrackMessage(m); });
      }
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      container.innerHTML =
        '<div class="track-chat-empty">' +
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '<span>Failed to load messages</span>' +
        '</div>';
    }
  }

  function appendTrackMessage(msg) {
    const container = document.getElementById('trackChatMessages');
    if (!container) return;

    const existing = container.querySelector('[data-id="' + msg.id + '"]');
    if (existing) return;

    /* Remove empty state if present */
    const empty = container.querySelector('.track-chat-empty');
    if (empty) empty.remove();

    const isClient = msg.sender_role === 'client';
    const div = document.createElement('div');
    div.className = 'track-chat-message ' + msg.sender_role;
    div.dataset.id = msg.id;
    const initials = isClient ? 'Y' : 'T';
    div.innerHTML =
      '<div class="chat-message-avatar">' + initials + '</div>' +
      '<div>' +
      '<div class="chat-message-bubble">' + escapeHtml(msg.message) + '</div>' +
      '<div class="chat-message-time">' + NagrivaOrders.formatTimeAgo(msg.created_at) + '</div>' +
      '</div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  window.sendTrackMessage = async function() {
    const input = document.getElementById('trackChatInput');
    const orderId = window._currentTrackOrderId;
    if (!input || !orderId) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    try {
      await NagrivaOrders.sendMessage(orderId, text);
    } catch (err) {
      if (typeof NAGRIVA_Toast !== 'undefined') {
        NAGRIVA_Toast.error('Send Failed', err.message || 'Could not send message');
      }
    }
  };

  function renderTrackFilesTab(orderId) {
    /* Files tab reuses the same files data loaded in the main tracking view */
  }

  await loadOrderSelect();
});
