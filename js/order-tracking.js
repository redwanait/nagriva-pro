(function () {
  'use strict';

  const TIMELINE_STAGES = [
    { key: 'order_received',  label: 'Order Received',  icon: 'inbox' },
    { key: 'project_approved', label: 'Project Approved', icon: 'check' },
    { key: 'work_started',    label: 'Work Started',    icon: 'play' },
    { key: 'first_draft',     label: 'First Draft',     icon: 'file' },
    { key: 'client_review',   label: 'Client Review',   icon: 'eye' },
    { key: 'final_delivery',  label: 'Final Delivery',  icon: 'truck' }
  ];

  const STAGE_ICONS = {
    inbox: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    check: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
    play: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    file: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    eye: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    truck: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>'
  };

  const ACTIVITY_ICONS = {
    status: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    message: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    file: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    order: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>',
    admin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    default: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  };

  function getActivityIcon(action) {
    if (!action) return 'default';
    if (action.includes('status') || action.includes('progress') || action.includes('stage')) return 'status';
    if (action.includes('message')) return 'message';
    if (action.includes('file') || action.includes('upload')) return 'file';
    if (action.includes('order') || action.includes('created') || action.includes('manager') || action.includes('project')) return 'order';
    if (action.includes('admin')) return 'admin';
    return 'default';
  }

  document.addEventListener('DOMContentLoaded', async () => {

    let currentOrderId = null;
    let _trackSubscription = null;
    let _msgSubscription = null;
    let _lastOrderData = null;

    /* ─── Custom Select ─── */
    const customSelect = document.getElementById('customTrackSelect');
    const customTrigger = document.getElementById('customSelectTrigger');
    const customValue = document.getElementById('customSelectValue');
    const customOptions = document.getElementById('customSelectOptions');
    const nativeSelect = document.getElementById('trackOrderSelect');

    function toggleCustomSelect(open) {
      if (open === undefined) { customSelect.classList.toggle('open'); }
      else if (open) { customSelect.classList.add('open'); }
      else { customSelect.classList.remove('open'); }
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
      nativeSelect.value = opt.dataset.value;
      customValue.textContent = opt.textContent;
      customValue.classList.remove('placeholder');
      customOptions.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      toggleCustomSelect(false);
      nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    document.addEventListener('click', function() { toggleCustomSelect(false); });
    customSelect.addEventListener('keydown', function(e) { if (e.key === 'Escape') toggleCustomSelect(false); });

    /* ─── Load Orders Into Select ─── */
    async function loadOrderSelect() {
      try {
        const orders = await NagrivaOrders.getUserOrders();
        nativeSelect.innerHTML = '<option value="">Select an order...</option>';
        orders.forEach(o => {
          const opt = document.createElement('option');
          opt.value = o.id;
          opt.textContent = (o.order_number || '#' + (o.id || '').slice(0, 8)) + ' \u2014 ' + (o.project_title || 'Untitled');
          nativeSelect.appendChild(opt);
        });
        populateCustomSelect();

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id && nativeSelect.querySelector('option[value="' + id + '"]')) {
          nativeSelect.value = id;
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

    nativeSelect.addEventListener('change', function() {
      const id = this.value;
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

    /* ─── Render Timeline Stages ─── */
    function renderTimelineStages(currentStage) {
      let activeIdx = TIMELINE_STAGES.findIndex(s => s.key === currentStage);
      if (activeIdx === -1) activeIdx = 0;

      return TIMELINE_STAGES.map((stage, i) => {
        let stateClass = 'pending';
        let iconSvg = STAGE_ICONS[stage.icon] || STAGE_ICONS.inbox;
        if (i < activeIdx) {
          stateClass = 'completed';
          iconSvg = STAGE_ICONS.check;
        } else if (i === activeIdx) {
          stateClass = 'active';
        }
        const lineAfter = i < TIMELINE_STAGES.length - 1;
        return '<div class="track-stage ' + stateClass + '">' +
          '<div class="track-stage-icon-wrap">' + iconSvg + '</div>' +
          '<div class="track-stage-info">' +
          '<span class="track-stage-label">' + stage.label + '</span>' +
          (i <= activeIdx ? '<span class="track-stage-date-label">' + (i === activeIdx ? 'Current' : 'Complete') + '</span>' : '') +
          '</div>' +
          (lineAfter ? '<div class="track-stage-line"></div>' : '') +
          '</div>';
      }).join('');
    }

    /* ─── Render Progress Circle ─── */
    function renderProgressCircle(progress) {
      const circumference = 2 * Math.PI * 24;
      const offset = circumference * (1 - Math.min(progress, 100) / 100);
      return '<svg class="progress-ring" width="52" height="52" viewBox="0 0 52 52">' +
        '<defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#00f5c4"/><stop offset="100%" stop-color="#00c2a8"/></linearGradient></defs>' +
        '<circle class="progress-ring-bg" cx="26" cy="26" r="24"/>' +
        '<circle class="progress-ring-fill" cx="26" cy="26" r="24" stroke="url(#pg)" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"/>' +
        '</svg><span class="progress-ring-text">' + Math.round(progress) + '%</span>';
    }

    /* ─── Load Tracking Data ─── */
    async function loadOrderTracking(orderId) {
      if (_trackSubscription) {
        _trackSubscription.unsubscribe();
        _trackSubscription = null;
      }

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
        console.log('[OrderTracking] Fetching order:', orderId);
        const order = await NagrivaOrders.getOrder(orderId);
        _lastOrderData = order;
        console.log('[OrderTracking] Full order object:', JSON.parse(JSON.stringify(order)));
        console.log('[OrderTracking] Fields check:', {
          id: order.id,
          status: order.status,
          current_stage: order.current_stage,
          progress: order.progress,
          estimated_delivery: order.estimated_delivery,
          title: order.project_title,
          created_at: order.created_at,
          service_type: order.service_type,
          order_number: order.order_number
        });

        const files = await NagrivaOrders.getFiles(orderId);
        const activity = await NagrivaOrders.getActivity(orderId);
        const msgs = await NagrivaOrders.getMessages(orderId);

        const status = order.status || 'pending';
        const currentStage = order.current_stage || 'order_received';
        const progress = order.progress != null ? order.progress : NagrivaOrders.getProgressForStage(currentStage);

        console.log('[OrderTracking] Derived values:', { status, currentStage, progress });

        const createdDate = new Date(order.created_at);
        const deadlineDate = order.estimated_delivery ? new Date(order.estimated_delivery) : (order.deadline ? new Date(order.deadline) : new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000));
        const remainingDays = Math.max(0, Math.ceil((deadlineDate - Date.now()) / (1000 * 60 * 60 * 24)));
        const totalDuration = Math.max(1, Math.ceil((deadlineDate - createdDate) / (1000 * 60 * 60 * 24)));
        const elapsedFromStart = Math.max(0, (Date.now() - createdDate) / (1000 * 60 * 60 * 24));
        const timePercent = Math.min(100, Math.round((elapsedFromStart / totalDuration) * 100));

        console.log('[OrderTracking] Date calculations:', { createdDate, deadlineDate, remainingDays, totalDuration, timePercent });

        const statusLabel = NagrivaOrders.getStatusLabel(status);
        const badgeClass = NagrivaOrders.getStatusBadgeClass(status);
        const createdFormatted = NagrivaOrders.formatDate(order.created_at);
        const deadlineFormatted = NagrivaOrders.formatDate(deadlineDate);

        const stagesHtml = renderTimelineStages(currentStage);

        /* Files */
        const deliverableFiles = files.filter(function(f) { return f.uploaded_by === 'admin'; });
        let filesHtml = '';
        if (files.length === 0) {
          filesHtml = '<div class="track-files-empty"><div class="track-files-empty-illustration"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><div class="track-files-empty-title">No files yet</div><div class="track-files-empty-desc">Delivered files and project assets will appear here once they\'re ready.</div></div>';
        } else {
          files.forEach(function(f) {
            const isDeliverable = f.uploaded_by === 'admin';
            filesHtml += '<a href="' + f.public_url + '" target="_blank" class="track-file-item' + (isDeliverable ? ' deliverable' : '') + '" download>' +
              '<div class="track-file-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
              '<div class="track-file-info"><span class="track-file-name">' + f.file_name + '</span>' +
              (isDeliverable ? '<span class="track-file-deliverable">\u2713 Deliverable</span>' : '') +
              '<span class="track-file-size">' + NagrivaOrders.formatFileSize(f.file_size) + '</span></div>' +
              '<div class="track-file-dl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div></a>';
          });
        }

        /* Timeline activity */
        let timelineHtml = '';
        if (activity.length === 0) {
          timelineHtml = '<div class="track-files-empty"><div class="track-files-empty-illustration"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="track-files-empty-title">No activity yet</div><div class="track-files-empty-desc">Project updates and status changes will appear here.</div></div>';
        } else {
          activity.forEach(function(a) {
            const iconType = getActivityIcon(a.action);
            timelineHtml += '<div class="track-activity-item"><div class="track-activity-icon ' + iconType + '">' + (ACTIVITY_ICONS[iconType] || ACTIVITY_ICONS.default) + '</div><div class="track-activity-content">' +
              '<div class="track-activity-head"><span class="track-activity-title">' + (a.action || 'Update') + '</span>' +
              '<span class="track-activity-time">' + NagrivaOrders.formatTimeAgo(a.created_at) + '</span></div>' +
              '<div class="track-activity-desc">' + (a.description || '') + '</div></div></div>';
          });
        }

        const serviceLabel = order.service_type ? order.service_type.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }) : 'Service';

        const budgetFormatted = order.budget ? '$' + parseInt(order.budget).toLocaleString() : '\u2014';

        console.log('[OrderTracking] Rendering template...');
        container.innerHTML =
          /* ═══ TIMELINE SECTION (hero) ═══ */
          '<div class="track-timeline-section">' +
          '<div class="track-timeline-header">' +
          '<div class="track-timeline-header-left">' +
          '<div>' +
          '<div class="track-timeline-project-title">' + (order.project_title || order.project_name || 'Untitled') + '</div>' +
          '<div class="track-timeline-project-sub">' + serviceLabel + ' \u00B7 ' + (order.order_number || '#' + (order.id || '').slice(0, 8)) + '</div></div></div>' +
          '<div class="track-timeline-header-right">' +
          '<span class="track-timeline-status">' + statusLabel + '</span>' +
          '</div></div>' +
          '<div class="track-timeline-stages">' + stagesHtml + '</div></div>' +

          /* ═══ ORDER OVERVIEW — STAT CARDS ═══ */
          '<div class="track-stats-grid">' +
          '<div class="track-stat-card"><div class="track-stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="track-stat-label">Status</div><div class="track-stat-value"><span class="track-status-badge ' + badgeClass + '">' + statusLabel + '</span></div></div>' +
          '<div class="track-stat-card"><div class="track-stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="track-stat-label">Progress</div><div class="track-stat-value accent">' + Math.round(progress) + '%</div></div>' +
          (order.budget ? '<div class="track-stat-card"><div class="track-stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="track-stat-label">Budget</div><div class="track-stat-value accent">' + budgetFormatted + '</div></div>' : '') +
          '<div class="track-stat-card"><div class="track-stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="track-stat-label">Created</div><div class="track-stat-value">' + createdFormatted + '</div></div>' +
          '<div class="track-stat-card"><div class="track-stat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="track-stat-label">Delivery</div><div class="track-stat-value">' + deadlineFormatted + '</div></div>' +
          '</div>' +

          /* ═══ MAIN CONTENT GRID ═══ */
          '<div class="track-content-grid">' +
          '<div class="track-col-left">' +

          /* ── Estimated Delivery Card ── */
          '<div class="track-card track-delivery-card">' +
          '<div class="track-delivery-glow"></div>' +
          '<div class="track-card-header"><div class="track-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>' +
          '<h3 class="track-card-title">Estimated Delivery</h3></div>' +
          '<div class="track-delivery-body">' +
          '<div class="track-delivery-ring">' + renderProgressCircle(timePercent) + '</div>' +
          '<div class="track-delivery-info">' +
          '<div class="track-delivery-label">Expected by</div>' +
          '<div class="track-delivery-date">' + deadlineFormatted + '</div>' +
          '<div class="track-delivery-remaining"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + remainingDays + ' days remaining</div></div></div></div>' +

          /* ── Files & Deliverables Card ── */
          '<div class="track-card">' +
          '<div class="track-card-header"><div class="track-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
          '<h3 class="track-card-title">Files & Deliverables</h3></div>' +
          (files.length > 0 ? '<div class="track-files-header"><span class="track-files-count">' + files.length + ' file' + (files.length !== 1 ? 's' : '') + (deliverableFiles.length > 0 ? ' \u2014 <strong>' + deliverableFiles.length + ' deliverable' + (deliverableFiles.length !== 1 ? 's' : '') + '</strong>' : '') + '</span></div>' : '') +
          '<div class="track-files">' + filesHtml + '</div></div>' +

          /* ── Revision Card ── */
          '<div class="track-card">' +
          '<div class="track-card-header"><div class="track-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></div>' +
          '<h3 class="track-card-title">Need Changes?</h3></div>' +
          '<div class="track-revision-body">' +
          '<p class="track-revision-desc">Submit a revision request and we\'ll get back to you within 24 hours.</p>' +
          '<button class="track-revision-btn" id="revisionBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg><span>Request Revision</span></button></div></div>' +
          '</div>' +

          /* ═══ RIGHT COLUMN ═══ */
          '<div class="track-col-right">' +

          '<div class="track-tabs">' +
          '<button class="track-tab active" data-tab="details" onclick="window.switchTrackTab(\'details\')">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Activity</button>' +
          '<button class="track-tab" data-tab="messages" onclick="window.switchTrackTab(\'messages\')">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Messages</button>' +
          '<button class="track-tab" data-tab="files" onclick="window.switchTrackTab(\'files\')">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Files</button>' +
          '</div>' +

          /* ── Activity Tab ── */
          '<div class="track-tab-content" id="trackTabDetails">' +
          '<div class="track-card">' +
          '<div class="track-card-header"><div class="track-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>' +
          '<h3 class="track-card-title">Activity Timeline</h3></div>' +
          '<div class="track-activity">' + timelineHtml + '</div></div></div>' +

          /* ── Messages Tab ── */
          '<div class="track-tab-content" id="trackTabMessages" style="display:none;">' +
          '<div class="track-chat-container" id="trackChatContainer">' +
          '<div class="track-chat-messages" id="trackChatMessages">' +
          '<div class="ne ne-sm">' +
          '<div class="ne-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div>' +
          '<h3 class="ne-title">No messages yet</h3>' +
          '<p class="ne-desc">Start the conversation! Send a message about this project.</p>' +
          '</div></div>' +
          '<div class="track-chat-input-area">' +
          '<div class="track-chat-input-row">' +
          '<input type="text" class="track-chat-input" id="trackChatInput" placeholder="Type a message..." autocomplete="off" />' +
          '<button class="track-chat-send" id="trackChatSend" onclick="window.sendTrackMessage()">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
          '</button></div></div></div>' +
          '</div>' +

          /* ── Files Tab ── */
          '<div class="track-tab-content" id="trackTabFiles" style="display:none;">' +
          '<div class="track-card">' +
          '<div class="track-card-header"><div class="track-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
          '<h3 class="track-card-title">All Files</h3></div>' +
          '<div class="track-files" id="trackFilesTabContent">' + filesHtml + '</div></div>' +
          '</div>' +

          '</div></div>';

        console.log('[OrderTracking] Template rendered successfully');

        /* Reveal fade-up elements for animation */
        if (typeof window.observeFadeUpElements === 'function') {
          window.observeFadeUpElements(container);
        }

        /* Re-bind revision button */
        const revisionBtn = document.getElementById('revisionBtn');
        if (revisionBtn) {
          revisionBtn.addEventListener('click', async function() {
            this.classList.add('loading');
            const span = this.querySelector('span');
            span.textContent = 'Opening Client Portal...';
            setTimeout(() => { window.location.href = 'client-portal.html?id=' + orderId; }, 800);
          });
        }

        setupOrderChat(orderId);

        /* ─── SETUP REAL-TIME SUBSCRIPTION ─── */
        setupRealtimeTracking(orderId);

      } catch (err) {
        console.error('[OrderTracking] loadOrderTracking failed:', err.message || err);
        container.innerHTML = NAGRIVA_EmptyState ? NAGRIVA_EmptyState.render({
          icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
          title: 'Failed to load tracking data',
          description: err.message || 'Something went wrong.',
          variant: 'error'
        }) : '<div class="track-error">Failed to load tracking data</div>';
      }
    }

    /* ════════════════════════════════════════════
       REAL-TIME ORDER TRACKING
       ════════════════════════════════════════════ */
    function setupRealtimeTracking(orderId) {
      if (_trackSubscription) {
        _trackSubscription.unsubscribe();
        _trackSubscription = null;
      }

      _trackSubscription = window.supabaseClient
        .channel('order-track-' + orderId)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: 'id=eq.' + orderId },
          handleOrderUpdate
        )
        .subscribe();
    }

    let _updateDebounce = null;

    function handleOrderUpdate(payload) {
      if (_updateDebounce) clearTimeout(_updateDebounce);
      _updateDebounce = setTimeout(async () => {
        try {
          const fresh = await NagrivaOrders.getOrder(currentOrderId);
          if (!fresh) return;

          const prev = _lastOrderData;
          _lastOrderData = fresh;

          const changedFields = [];
          if (prev && prev.status !== fresh.status) changedFields.push('status');
          if (prev && prev.progress !== fresh.progress) changedFields.push('progress');
          if (prev && prev.current_stage !== fresh.current_stage) changedFields.push('stage');

          if (changedFields.length > 0) {
            if (typeof NAGRIVA_Toast !== 'undefined') {
              let msg = 'Order has been updated';
              if (changedFields.includes('status')) {
                msg = 'Status changed to ' + NagrivaOrders.getStatusLabel(fresh.status);
              } else if (changedFields.includes('stage')) {
                msg = 'Stage updated to ' + NagrivaOrders.getStageLabel(fresh.current_stage);
              } else if (changedFields.includes('progress')) {
                msg = 'Progress updated to ' + Math.round(fresh.progress) + '%';
              }
              NAGRIVA_Toast.info('Order Updated', msg);
            }
            loadOrderTracking(currentOrderId);
          }
        } catch (err) {
          console.warn('[OrderTracking] Realtime update error:', err.message || err);
        }
      }, 300);
    }

    /* ════════════════════════════════════════════
       TAB SYSTEM
       ════════════════════════════════════════════ */
    window.switchTrackTab = function(tab) {
      document.querySelectorAll('.track-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.track-tab-content').forEach(t => t.style.display = 'none');
      const activeTab = document.querySelector('.track-tab[data-tab="' + tab + '"]');
      if (activeTab) activeTab.classList.add('active');
      const content = document.getElementById('trackTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
      if (content) content.style.display = '';
    };

    /* ════════════════════════════════════════════
       ORDER CHAT
       ════════════════════════════════════════════ */
    function setupOrderChat(orderId) {
      if (_msgSubscription) { _msgSubscription.unsubscribe(); _msgSubscription = null; }

      const input = document.getElementById('trackChatInput');
      const sendBtn = document.getElementById('trackChatSend');
      if (!input || !sendBtn) return;

      input.removeEventListener('keydown', input._trackKeyHandler);
      sendBtn.removeEventListener('click', sendBtn._trackClickHandler);

      input._trackKeyHandler = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendTrackMessage(); }
      };
      input.addEventListener('keydown', input._trackKeyHandler);

      loadTrackMessages(orderId);

      _msgSubscription = NagrivaOrders.subscribeToMessages(orderId, function(msg) {
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
          container.innerHTML = '<div class="ne ne-sm"><div class="ne-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div><h3 class="ne-title">No messages yet</h3><p class="ne-desc">Start the conversation! Send a message about this project.</p></div>';
        } else {
          msgs.forEach(function(m) { appendTrackMessage(m); });
        }
        container.scrollTop = container.scrollHeight;
      } catch (err) {
        container.innerHTML = '<div class="ne ne-sm"><div class="ne-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><h3 class="ne-title">Failed to load messages</h3></div>';
      }
    }

    function appendTrackMessage(msg) {
      const container = document.getElementById('trackChatMessages');
      if (!container) return;
      const existing = container.querySelector('[data-id="' + msg.id + '"]');
      if (existing) return;
      const empty = container.querySelector('.ne');
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

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    await loadOrderSelect();
  });
})();
