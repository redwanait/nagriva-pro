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

  function normalizeStatus(s) {
    if (!s) return 'pending';
    var lower = s.toLowerCase().replace(/ /g, '_');
    var map = {
      'pending': 'pending',
      'paid': 'paid',
      'in_progress': 'in_progress',
      'in progress': 'in_progress',
      'review': 'review',
      'completed': 'completed',
      'delivered': 'completed',
      'cancelled': 'cancelled'
    };
    return map[lower] || 'pending';
  }

  function getStatusBadgeClass(status) {
    var n = normalizeStatus(status);
    return { pending: 'pending', paid: 'paid', approved: 'in_progress', in_progress: 'in_progress', review: 'review', delivered: 'completed', completed: 'completed', cancelled: 'cancelled' }[n] || 'pending';
  }

  function getStatusLabel(status) {
    var n = normalizeStatus(status);
    return { pending: 'Pending', paid: 'Paid', approved: 'In Progress', in_progress: 'In Progress', review: 'Review', delivered: 'Completed', completed: 'Completed', cancelled: 'Cancelled' }[n] || status;
  }

  var SERVICE_NAMES = {
    "website-development": "Website Development",
    "blog-creation": "Blog Creation",
    "video-editing": "Video Editing",
    "seo": "SEO Optimization",
    "ecommerce-stores": "E-commerce Stores",
    "social-media": "Social Media Growth",
    "social-media-growth": "Social Media Growth",
    "branding": "Brand Identity",
    "brand-identity": "Brand Identity",
    "ai-automation": "AI Automation",
    "web-design": "Web Design",
    "performance-marketing": "Performance Marketing"
  };

  function safeServiceType(s) {
    if (!s) return 'Service';
    if (SERVICE_NAMES[s]) return SERVICE_NAMES[s];
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
    for (var i = 0; i < 4; i++) {
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
      '<a href="https://calendly.com/redwanaitlhadj16/30min" target="_blank" rel="noopener" class="dash-empty-btn dash-empty-btn-primary">' + window.NAGRIVA_EmptyState.icons['message-square'] + ' Book a Free Call</a>' +
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

    var svg = window.NAGRIVA_EmptyState ? window.NAGRIVA_EmptyState.icons : {};
    var items = [
      { icon: svg['package'] || '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>', value: stats.totalOrders, label: 'Total Orders', change: 'All time orders', id: 'statTotalOrders' },
      { icon: svg['folder-kanban'] || '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 7h12"/><path d="M8 12h12"/><path d="M8 17h8"/><rect x="2" y="3" width="20" height="18" rx="2"/></svg>', value: stats.activeProjects, label: 'Active Projects', change: 'Currently in progress', id: 'statActive' },
      { icon: svg['check-circle'] || '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', value: stats.completedProjects, label: 'Completed Projects', change: 'Delivered orders', id: 'statCompleted' },
      { icon: svg['dollar-sign'] || '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', value: stats.totalSpent, label: 'Total Spent', change: 'In MAD', id: 'statTotalSpent', isCurrency: true }
    ];

    var cardsHtml = '';
    items.forEach(function (item, i) {
      var displayVal = item.isCurrency ? item.value.toLocaleString('en-US') + ' MAD' : item.value;
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
      var target = document.getElementById(item.id);
      if (!target) return;
      if (item.isCurrency) {
        target.textContent = item.value.toLocaleString('en-US') + ' MAD';
      } else {
        requestAnimationFrame(function () {
          animateCounter(target, item.value);
        });
      }
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
      var svcName = safeServiceType(o.service || o.service_slug || o.service_type);
      html += '<div class="dash-order-item">' +
        '<div class="dash-order-info">' +
        '<div class="dash-order-name">' + escapeHtml(o.project_title || svcName || 'Untitled') + '</div>' +
        '<div class="dash-order-meta">' + svcName + ' \u00b7 ' + formatDate(o.created_at) + '</div>' +
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
    if (!_user) return { totalOrders: 0, activeProjects: 0, completedProjects: 0, totalSpent: 0 };

    try {
      if (typeof NAGRIVA_OrdersAPI !== 'undefined' && NAGRIVA_OrdersAPI.getClientDashboardFullStats) {
        return await NAGRIVA_OrdersAPI.getClientDashboardFullStats(_user.id);
      }
    } catch (e) {
      console.warn('[Dashboard] fetchStats from API failed, falling back:', e);
    }

    var orders = _data.orders || [];
    var totalOrders = orders.length;
    var activeProjects = orders.filter(function (o) {
      var s = (o.status || '').toLowerCase();
      return s === 'approved' || s === 'in_progress' || s === 'review' || s === 'in progress';
    }).length;
    var completedProjects = orders.filter(function (o) {
      var s = (o.status || '').toLowerCase();
      return s === 'completed' || s === 'delivered';
    }).length;
    var totalSpent = orders.reduce(function (sum, o) {
      var amt = parseFloat(o.amount || o.budget || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    return { totalOrders: totalOrders, activeProjects: activeProjects, completedProjects: completedProjects, totalSpent: totalSpent };
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

      if (orderIds.length > 0) {
      var projectSub = window.supabaseClient
        .channel('dash-projects')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'projects', filter: orderFilter },
          function () { refresh(); }
        )
        .subscribe();
      _subscriptions.push(projectSub);
    }
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
