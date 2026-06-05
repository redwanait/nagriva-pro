/* ════════════════════════════════════════════
   Nagriva — Premium Client Dashboard
   Supabase integrated · Real-time · Skeleton loaders
   ════════════════════════════════════════════ */
window.NAGRIVA_Dashboard = (function () {
  'use strict';

  var _user = null;
  var _subscriptions = [];
  var _data = {
    stats: null,
    orders: null,
    activity: null,
    messages: null,
    notifications: null,
    projects: null
  };

  /* ─── Helpers ─── */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    var now = new Date();
    var d = new Date(dateStr);
    var diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
    return formatDate(dateStr);
  }

  function getStatusBadgeClass(status) {
    return { pending: 'pending', approved: 'approved', in_progress: 'in_progress', review: 'review', delivered: 'completed', completed: 'completed', cancelled: 'cancelled' }[status] || 'pending';
  }

  function getStatusLabel(status) {
    return { pending: 'Pending', approved: 'Approved', in_progress: 'In Progress', review: 'Review', delivered: 'Completed', completed: 'Completed', cancelled: 'Cancelled' }[status] || status;
  }

  function safeServiceType(s) {
    if (!s) return 'Service';
    return String(s).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function formatBudget(val) {
    if (val == null || isNaN(val)) return '';
    return ' $' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

  /* ════════════════════════════════════════════
     SKELETON LOADERS
     ════════════════════════════════════════════ */
  function skeletonStats() {
    var html = '';
    for (var i = 0; i < 5; i++) {
      html += '<div class="dash-stat-skel dash-fade-in">' +
        '<div class="dash-stat-skel-icon"></div>' +
        '<div class="dash-stat-skel-value"></div>' +
        '<div class="dash-stat-skel-label"></div>' +
        '<div class="dash-stat-skel-change"></div>' +
        '</div>';
    }
    return html;
  }

  function skeletonList(count) {
    count = count || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="dash-skel-row">' +
        '<div class="dash-skel-row-icon dash-skeleton"></div>' +
        '<div class="dash-skel-row-content">' +
        '<div class="dash-skel-row-line dash-skeleton w70"></div>' +
        '<div class="dash-skel-row-line-sm dash-skeleton"></div>' +
        '</div>' +
        '<div class="dash-skel-row-end dash-skeleton"></div>' +
        '</div>';
    }
    return html;
  }

  function skeletonProjects(count) {
    count = count || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="dash-skel-card dash-fade-in">' +
        '<div class="dash-skel-card-line w70"></div>' +
        '<div class="dash-skel-card-line w50"></div>' +
        '<div class="dash-skel-card-line w40" style="height:8px;margin-top:4px;"></div>' +
        '</div>';
    }
    return html;
  }

  /* ════════════════════════════════════════════
     EMPTY STATES
     ════════════════════════════════════════════ */
  function emptyOrders() {
    return '<div class="dash-empty">' +
      '<div class="dash-empty-icon">' + window.NAGRIVA_EmptyState.icons.package + '</div>' +
      '<h3 class="dash-empty-title">No orders yet</h3>' +
      '<p class="dash-empty-desc">When you purchase a service, your orders will appear here.</p>' +
      '<div class="dash-empty-actions">' +
      '<a href="submit-order.html" class="dash-empty-btn dash-empty-btn-primary">' + window.NAGRIVA_EmptyState.icons.plus + ' Submit Your First Order</a>' +
      '<a href="services.html" class="dash-empty-btn dash-empty-btn-secondary">' + window.NAGRIVA_EmptyState.icons.compass + ' Browse Services</a>' +
      '</div></div>';
  }

  function emptyActivity() {
    return '<div class="dash-empty">' +
      '<div class="dash-empty-icon">' + window.NAGRIVA_EmptyState.icons['bar-chart-3'] + '</div>' +
      '<h3 class="dash-empty-title">No recent activity</h3>' +
      '<p class="dash-empty-desc">Your actions and project updates will appear here.</p>' +
      '<div class="dash-empty-actions">' +
      '<a href="services.html" class="dash-empty-btn dash-empty-btn-primary">' + window.NAGRIVA_EmptyState.icons.compass + ' Explore Services</a>' +
      '<a href="dashboard.html" class="dash-empty-btn dash-empty-btn-secondary">' + window.NAGRIVA_EmptyState.icons['arrow-right'] + ' View Dashboard</a>' +
      '</div></div>';
  }

  function emptyMessages() {
    return '<div class="dash-empty">' +
      '<div class="dash-empty-icon">' + window.NAGRIVA_EmptyState.icons['message-square'] + '</div>' +
      '<h3 class="dash-empty-title">No messages yet</h3>' +
      '<p class="dash-empty-desc">When you have conversations about your orders, they\'ll appear here.</p>' +
      '<div class="dash-empty-actions">' +
      '<a href="../index.html#contact" class="dash-empty-btn dash-empty-btn-primary">' + window.NAGRIVA_EmptyState.icons['message-square'] + ' Contact Support</a>' +
      '</div></div>';
  }

  function emptyNotifications() {
    return '<div class="dash-empty">' +
      '<div class="dash-empty-icon">' + window.NAGRIVA_EmptyState.icons.bell + '</div>' +
      '<h3 class="dash-empty-title">All caught up</h3>' +
      '<p class="dash-empty-desc">No new notifications at the moment.</p>' +
      '<div class="dash-empty-actions">' +
      '<a href="services.html" class="dash-empty-btn dash-empty-btn-primary">' + window.NAGRIVA_EmptyState.icons.compass + ' Explore Platform</a>' +
      '</div></div>';
  }

  function emptyProjects() {
    return '<div class="dash-empty" style="grid-column:1/-1;">' +
      '<div class="dash-empty-icon">' + window.NAGRIVA_EmptyState.icons['folder-kanban'] + '</div>' +
      '<h3 class="dash-empty-title">No projects yet</h3>' +
      '<p class="dash-empty-desc">Project milestones will appear here once you have active orders.</p>' +
      '<div class="dash-empty-actions">' +
      '<a href="submit-order.html" class="dash-empty-btn dash-empty-btn-primary">' + window.NAGRIVA_EmptyState.icons.plus + ' Start Your First Project</a>' +
      '<a href="services.html" class="dash-empty-btn dash-empty-btn-secondary">' + window.NAGRIVA_EmptyState.icons.compass + ' Browse Services</a>' +
      '</div></div>';
  }

  function errorState(message, retryFn) {
    var name = retryFn ? ' onclick="NAGRIVA_Dashboard.' + retryFn + '()"' : '';
    return '<div class="dash-error">' +
      '<div class="dash-error-icon">' + window.NAGRIVA_EmptyState.icons['alert-circle'] + '</div>' +
      '<h3 class="dash-error-title">Connection Error</h3>' +
      '<p class="dash-error-desc">' + escapeHtml(message || 'Failed to load data. Please try again.') + '</p>' +
      '<button class="dash-error-btn"' + name + '>' +
      window.NAGRIVA_EmptyState.icons['rotate-ccw'] + ' Retry' +
      '</button></div>';
  }

  /* ════════════════════════════════════════════
     ANIMATED COUNTER
     ════════════════════════════════════════════ */
  function animateCounter(el, target, duration) {
    if (!el) return;
    duration = duration || 800;
    var start = performance.now();
    function tick(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 4);
      var current = Math.round(eased * target);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    }
    requestAnimationFrame(tick);
  }

  /* ════════════════════════════════════════════
     RENDER SECTIONS
     ════════════════════════════════════════════ */
  function renderStats(stats) {
    var el = document.getElementById('dashStats');
    if (!el) return;

    var svg = window.NAGRIVA_EmptyState.icons;
    var items = [
      { icon: svg['folder-kanban'], value: stats.active, label: 'Active Projects', change: 'Currently in progress', id: 'statActive' },
      { icon: svg['check-circle'], value: stats.completed, label: 'Completed Projects', change: 'Delivered orders', id: 'statCompleted' },
      { icon: svg.package, value: stats.pending, label: 'Pending Orders', change: 'Awaiting processing', id: 'statPending' },
      { icon: svg['message-square'], value: stats.messages, label: 'Messages', change: stats.messages === 1 ? 'Unread conversation' : 'Unread conversations', id: 'statMessages' },
      { icon: svg.bell, value: stats.notifications, label: 'Notifications', change: stats.notifications === 1 ? 'Unread notification' : 'Unread notifications', id: 'statNotifications' }
    ];

    var cardsHtml = '';
    items.forEach(function (item, i) {
      cardsHtml += '<div class="dash-stat-card dash-fade-in">' +
        '<div class="dash-stat-icon">' + item.icon + '</div>' +
        '<div class="dash-stat-value"><span class="dash-counter" id="' + item.id + '">0</span></div>' +
        '<div class="dash-stat-label">' + item.label + '</div>' +
        '<span class="dash-stat-change">' + item.change + '</span></div>';
    });

    if (window.NAGRIVA_Loading) {
      window.NAGRIVA_Loading.hide(el, cardsHtml);
    } else {
      el.innerHTML = cardsHtml;
    }

    var el2 = document.getElementById('dashStats');
    if (!el2) return;
    items.forEach(function (item) {
      requestAnimationFrame(function () {
        animateCounter(document.getElementById(item.id), item.value);
      });
    });
  }

  function renderOrders(orders) {
    var container = document.getElementById('dashOrdersList');
    if (!container) return;
    if (!orders || orders.length === 0) {
      var emptyHtml = emptyOrders();
      if (window.NAGRIVA_Loading) { window.NAGRIVA_Loading.hide(container, emptyHtml); }
      else { container.innerHTML = emptyHtml; }
      return;
    }
    var display = orders.slice(0, 4);
    var html = '';
    display.forEach(function (o) {
      html += '<div class="dash-order-item">' +
        '<div class="dash-order-info">' +
        '<div class="dash-order-name">' + escapeHtml(o.project_title || 'Untitled') + '</div>' +
        '<div class="dash-order-meta">' + safeServiceType(o.service_type) + ' \u00b7 ' + formatDate(o.created_at) + '</div>' +
        '<div class="dash-order-progress"><div class="dash-order-progress-bar"><div class="dash-order-progress-fill" style="width:' + (o.progress || 0) + '%;"></div></div><span class="dash-order-progress-text">' + (o.progress || 0) + '%</span></div>' +
        '</div>' +
        '<div class="dash-order-right">' +
        '<span class="dash-order-badge ' + getStatusBadgeClass(o.status) + '">' + getStatusLabel(o.status) + '</span>' +
        '<a href="order-tracking.html?id=' + (o.id || '') + '" class="dash-order-track-btn">Track \u2192</a>' +
        '</div></div>';
    });
    if (window.NAGRIVA_Loading) { window.NAGRIVA_Loading.hide(container, html); }
    else { container.innerHTML = html; }
  }

  function renderActivity(activities) {
    var container = document.getElementById('dashActivity');
    if (!container) return;
    if (!activities || activities.length === 0) {
      var emptyHtml = emptyActivity();
      if (window.NAGRIVA_Loading) { window.NAGRIVA_Loading.hide(container, emptyHtml); }
      else { container.innerHTML = emptyHtml; }
      return;
    }
    var html = '';
    activities.slice(0, 5).forEach(function (a) {
      html += '<div class="dash-activity-item">' +
        '<span class="dash-activity-dot active"></span>' +
        '<span class="dash-activity-text"><strong>' + escapeHtml(a.action || 'Update') + '</strong> \u2014 ' + escapeHtml(a.description || '') + '</span>' +
        '<span class="dash-activity-time">' + formatTimeAgo(a.created_at) + '</span></div>';
    });
    if (window.NAGRIVA_Loading) { window.NAGRIVA_Loading.hide(container, html); }
    else { container.innerHTML = html; }
  }

  function renderMessages(messages) {
    var container = document.getElementById('dashMessages');
    if (!container) return;
    if (!messages || messages.length === 0) {
      var emptyHtml = emptyMessages();
      if (window.NAGRIVA_Loading) { window.NAGRIVA_Loading.hide(container, emptyHtml); }
      else { container.innerHTML = emptyHtml; }
      return;
    }
    var grouped = {};
    messages.forEach(function (m) {
      if (!grouped[m.order_id]) grouped[m.order_id] = [];
      grouped[m.order_id].push(m);
    });
    var latest = Object.keys(grouped).map(function (oid) {
      return grouped[oid].reduce(function (a, b) { return new Date(a.created_at) > new Date(b.created_at) ? a : b; });
    });
    latest.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    var html = '';
    latest.slice(0, 4).forEach(function (m) {
      var sender = m.sender_role === 'admin' ? 'Support' : 'You';
      var initial = sender === 'Support' ? 'S' : 'Y';
      html += '<a class="dash-message-item" href="order-tracking.html?id=' + (m.order_id || '') + '">' +
        '<div class="dash-message-avatar">' + initial + '</div>' +
        '<div class="dash-message-info">' +
        '<div class="dash-message-sender">' + sender + '</div>' +
        '<div class="dash-message-preview">' + escapeHtml((m.message || '').substring(0, 60)) + '</div>' +
        '</div>' +
        '<span class="dash-message-time">' + formatTimeAgo(m.created_at) + '</span></a>';
    });
    if (window.NAGRIVA_Loading) { window.NAGRIVA_Loading.hide(container, html); }
    else { container.innerHTML = html; }
  }

  function renderNotifications(notifications) {
    var container = document.getElementById('dashNotifications');
    if (!container) return;
    if (!notifications || notifications.length === 0) {
      var emptyHtml = emptyNotifications();
      if (window.NAGRIVA_Loading) { window.NAGRIVA_Loading.hide(container, emptyHtml); }
      else { container.innerHTML = emptyHtml; }
      return;
    }
    var html = '';
    notifications.slice(0, 4).forEach(function (n) {
      var typeIcon = n.type === 'message' ? 'message-square' : n.type === 'payment' ? 'check-circle' : 'bell';
      html += '<div class="dash-notif-item' + (n.is_read ? '' : ' unread') + '">' +
        (n.is_read ? '' : '<span class="dash-notif-dot"></span>') +
        '<div class="dash-notif-icon">' + (window.NAGRIVA_EmptyState.icons[typeIcon] || window.NAGRIVA_EmptyState.icons.bell) + '</div>' +
        '<div class="dash-notif-content">' +
        '<div class="dash-notif-title">' + escapeHtml(n.title || 'Notification') + '</div>' +
        '<div class="dash-notif-message">' + escapeHtml((n.message || '').substring(0, 80)) + '</div>' +
        '</div>' +
        '<span class="dash-notif-time">' + formatTimeAgo(n.created_at) + '</span></div>';
    });
    if (window.NAGRIVA_Loading) { window.NAGRIVA_Loading.hide(container, html); }
    else { container.innerHTML = html; }
  }

  function renderProjects(projects) {
    var container = document.getElementById('dashProjects');
    if (!container) return;
    if (!projects || projects.length === 0) {
      var emptyHtml = emptyProjects();
      if (window.NAGRIVA_Loading) { window.NAGRIVA_Loading.hide(container, emptyHtml); }
      else { container.innerHTML = emptyHtml; }
      return;
    }
    var html = '';
    projects.slice(0, 6).forEach(function (p) {
      html += '<div class="dash-project-card">' +
        '<div class="dash-project-title">' + escapeHtml(p.title || 'Project') + '</div>' +
        '<div class="dash-project-desc">' + escapeHtml((p.description || '').substring(0, 60)) + '</div>' +
        '<span class="dash-project-status ' + getStatusBadgeClass(p.status) + '">' + getStatusLabel(p.status) + '</span></div>';
    });
    if (window.NAGRIVA_Loading) { window.NAGRIVA_Loading.hide(container, html); }
    else { container.innerHTML = html; }
  }

  /* ════════════════════════════════════════════
     DATA FETCHING
     ════════════════════════════════════════════ */
  async function fetchStats() {
    if (!_user) return { active: 0, completed: 0, pending: 0, messages: 0, notifications: 0 };
    var orders = _data.orders || [];
    var active = orders.filter(function (o) { return o.status === 'approved' || o.status === 'in_progress' || o.status === 'review'; }).length;
    var completed = orders.filter(function (o) { return o.status === 'completed' || o.status === 'delivered'; }).length;
    var pending = orders.filter(function (o) { return o.status === 'pending'; }).length;

    var msgCount = 0;
    var orderIds = orders.map(function (o) { return o.id; });
    if (orderIds.length > 0) {
      try {
        var { count } = await window.supabaseClient
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('order_id', orderIds);
        msgCount = count || 0;
      } catch (e) { /* silent */ }
    }

    var notifCount = 0;
    try {
      var { count: nc } = await window.supabaseClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', _user.id)
        .eq('is_read', false);
      notifCount = nc || 0;
    } catch (e) { /* silent */ }

    return { active: active, completed: completed, pending: pending, messages: msgCount, notifications: notifCount };
  }

  async function loadAll() {
    if (!_user) return;

    try {
      var { data: orders } = await window.supabaseClient
        .from('orders')
        .select('*')
        .eq('user_id', _user.id)
        .order('created_at', { ascending: false });
      _data.orders = orders || [];
    } catch (e) {
      _data.orders = [];
    }

    var orderIds = _data.orders.map(function (o) { return o.id; });

    if (orderIds.length > 0) {
      try {
        var { data: activity } = await window.supabaseClient
          .from('activity_log')
          .select('*')
          .in('order_id', orderIds)
          .order('created_at', { ascending: false })
          .limit(10);
        _data.activity = activity || [];
      } catch (e) {
        _data.activity = [];
      }

      try {
        var { data: messages } = await window.supabaseClient
          .from('messages')
          .select('*')
          .in('order_id', orderIds)
          .order('created_at', { ascending: false })
          .limit(20);
        _data.messages = messages || [];
      } catch (e) {
        _data.messages = [];
      }

      try {
        var { data: projects } = await window.supabaseClient
          .from('projects')
          .select('*')
          .in('order_id', orderIds)
          .order('created_at', { ascending: false })
          .limit(10);
        _data.projects = projects || [];
      } catch (e) {
        _data.projects = [];
      }
    } else {
      _data.activity = [];
      _data.messages = [];
      _data.projects = [];
    }

    try {
      var { data: notifs } = await window.supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', _user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      _data.notifications = notifs || [];
    } catch (e) {
      _data.notifications = [];
    }

    _data.stats = await fetchStats();
  }

  /* ════════════════════════════════════════════
     SETUP SKELETONS
     ════════════════════════════════════════════ */
  function showSkeletons() {
    var lm = window.NAGRIVA_Loading;
    var sk = window.NAGRIVA_Skeleton;

    var statsGrid = document.getElementById('dashStats');
    if (statsGrid) {
      if (lm) {
        lm.show(statsGrid, (sk ? sk.stats(5) : skeletonStats()));
      } else {
        statsGrid.innerHTML = skeletonStats();
      }
    }
    var ordersEl = document.getElementById('dashOrdersList');
    if (ordersEl) {
      if (lm) {
        lm.show(ordersEl, (sk ? sk.rows(3) : skeletonList(3)));
      } else {
        ordersEl.innerHTML = skeletonList(3);
      }
    }
    var activityEl = document.getElementById('dashActivity');
    if (activityEl) {
      if (lm) {
        lm.show(activityEl, (sk ? sk.timeline(3) : skeletonList(3)));
      } else {
        activityEl.innerHTML = skeletonList(3);
      }
    }
    var messagesEl = document.getElementById('dashMessages');
    if (messagesEl) {
      if (lm) {
        lm.show(messagesEl, (sk ? sk.avatarRows(3) : skeletonList(3)));
      } else {
        messagesEl.innerHTML = skeletonList(3);
      }
    }
    var notifsEl = document.getElementById('dashNotifications');
    if (notifsEl) {
      if (lm) {
        lm.show(notifsEl, (sk ? sk.notifications(3) : skeletonList(3)));
      } else {
        notifsEl.innerHTML = skeletonList(3);
      }
    }
    var projectsEl = document.getElementById('dashProjects');
    if (projectsEl) {
      if (lm) {
        lm.show(projectsEl, (sk ? sk.projects(3) : skeletonProjects(3)));
      } else {
        projectsEl.innerHTML = skeletonProjects(3);
      }
    }
  }

  /* ════════════════════════════════════════════
     RENDER ALL
     ════════════════════════════════════════════ */
  function renderAll() {
    renderStats(_data.stats);
    renderOrders(_data.orders);
    renderActivity(_data.activity);
    renderMessages(_data.messages);
    renderNotifications(_data.notifications);
    renderProjects(_data.projects);
  }

  /* ════════════════════════════════════════════
     REAL-TIME SUBSCRIPTIONS
     ════════════════════════════════════════════ */
  function subscribeRealtime() {
    if (!_user) return;

    var orderIds = (_data.orders || []).map(function (o) { return o.id; });

    var ordersSub = window.supabaseClient
      .channel('dash-orders')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: 'user_id=eq.' + _user.id },
        function (payload) {
          if (payload.eventType === 'UPDATE' && typeof NAGRIVA_Toast !== 'undefined') {
            var newStatus = payload.new && payload.new.status;
            var oldStatus = payload.old && payload.old.status;
            if (newStatus && newStatus !== oldStatus) {
              var label = getStatusLabel(newStatus);
              NAGRIVA_Toast.info('Order Updated', 'Status changed to ' + label);
            }
          }
          refresh();
        }
      )
      .subscribe();
    _subscriptions.push(ordersSub);

    if (orderIds.length > 0) {
      var orderFilter = orderIds.map(function (id) { return 'order_id=eq.' + id; }).join(',');
      var activitySub = window.supabaseClient
        .channel('dash-activity')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'activity_log', filter: orderFilter },
          function () { refresh(); }
        )
        .subscribe();
      _subscriptions.push(activitySub);

      var msgSub = window.supabaseClient
        .channel('dash-messages')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: orderFilter },
          function () { refresh(); }
        )
        .subscribe();
      _subscriptions.push(msgSub);

      var projectSub = window.supabaseClient
        .channel('dash-projects')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'projects', filter: orderFilter },
          function () { refresh(); }
        )
        .subscribe();
      _subscriptions.push(projectSub);
    }

    var notifSub = window.supabaseClient
      .channel('dash-notifications')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + _user.id },
        function () { refresh(); }
      )
      .subscribe();
    _subscriptions.push(notifSub);
  }

  /* ════════════════════════════════════════════
     REFRESH
     ════════════════════════════════════════════ */
  var _refreshTimer = null;

  function refresh() {
    if (_refreshTimer) clearTimeout(_refreshTimer);
    _refreshTimer = setTimeout(async function () {
      await loadAll();
      renderAll();
    }, 500);
  }

  /* ════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════ */
  async function init() {
    showSkeletons();

    try {
      _user = await NagrivaOrders.getCurrentUser();
    } catch (e) {
      _user = null;
    }

    if (!_user) {
      var containers = ['dashStats', 'dashOrdersList', 'dashActivity', 'dashMessages', 'dashNotifications', 'dashProjects'];
      containers.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = errorState('Please sign in to view your dashboard.');
      });
      return;
    }

    try {
      await loadAll();
      renderAll();
      subscribeRealtime();
    } catch (err) {
      console.error('[Dashboard] Init error:', err);
      var containers = ['dashStats', 'dashOrdersList', 'dashActivity', 'dashMessages', 'dashNotifications', 'dashProjects'];
      containers.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && (el.querySelector('.dash-skeleton') || el.querySelector('.dash-stat-skel') || el.querySelector('.sk-skeleton'))) {
          el.innerHTML = errorState(err.message || 'Failed to load dashboard data.', 'retry');
        }
      });
    }
  }

  /* ════════════════════════════════════════════
     DESTROY (cleanup)
     ════════════════════════════════════════════ */
  function destroy() {
    _subscriptions.forEach(function (sub) {
      try { window.supabaseClient.removeChannel(sub); } catch (e) { /* ignore */ }
    });
    _subscriptions = [];
    if (_refreshTimer) clearTimeout(_refreshTimer);
  }

  /* ════════════════════════════════════════════
     RETRY
     ════════════════════════════════════════════ */
  async function retry() {
    showSkeletons();
    try {
      await loadAll();
      renderAll();
      subscribeRealtime();
    } catch (err) {
      console.error('[Dashboard] Retry error:', err);
    }
  }

  return {
    init: init,
    destroy: destroy,
    retry: retry,
    refresh: refresh
  };
})();
