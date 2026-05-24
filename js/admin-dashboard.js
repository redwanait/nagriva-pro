const NAGRIVA_Dashboard = (() => {
  let _loading = false;
  let _error = null;
  let _loaded = false;
  let _unsubscribe = null;

  function animateCounter(el, target, duration) {
    if (!el) return;
    duration = duration || 1000;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(eased * target);
      el.textContent = current.toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(tick);
  }

  function animateCurrency(el, target, duration) {
    if (!el) return;
    duration = duration || 1000;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(eased * target);
      el.textContent = '$' + current.toLocaleString('en-US');
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = '$' + target.toLocaleString('en-US');
    }
    requestAnimationFrame(tick);
  }

  function updateStats(stats) {
    if (!stats) stats = { active: 0, revision: 0, completed: 0, revenue: 0, pending: 0, total: 0 };
    const active = Math.max(0, stats.active || 0);
    const revision = Math.max(0, stats.revision || 0);
    const completed = Math.max(0, stats.completed || 0);
    const revenue = Math.max(0, stats.revenue || 0);
    const pending = Math.max(0, stats.pending || 0);

    const activeEl = document.getElementById('dashActiveOrders');
    const revisionEl = document.getElementById('dashPendingRevisions');
    const completedEl = document.getElementById('dashCompletedOrders');
    const revenueEl = document.getElementById('dashRevenue');

    if (activeEl) {
      const current = parseInt(activeEl.textContent.replace(/[^0-9]/g, '')) || 0;
      if (current !== active) animateCounter(activeEl, active);
      else activeEl.textContent = active;
    }
    if (revisionEl) {
      const current = parseInt(revisionEl.textContent.replace(/[^0-9]/g, '')) || 0;
      if (current !== revision) animateCounter(revisionEl, revision);
      else revisionEl.textContent = revision;
    }
    if (completedEl) {
      const current = parseInt(completedEl.textContent.replace(/[^0-9]/g, '')) || 0;
      if (current !== completed) animateCounter(completedEl, completed);
      else completedEl.textContent = completed;
    }
    if (revenueEl) {
      const curStr = revenueEl.textContent.replace(/[^0-9]/g, '');
      const current = parseInt(curStr) || 0;
      if (current !== revenue) animateCurrency(revenueEl, revenue);
      else revenueEl.textContent = '$' + revenue.toLocaleString('en-US');
    }

    const badge = document.querySelector('.sidebar-item[data-page="orders"] .badge-count');
    if (badge) {
      const badgeVal = pending + revision;
      badge.textContent = badgeVal;
      badge.style.display = badgeVal > 0 ? '' : 'none';
    }
  }

  function renderRecentOrders(orders) {
    const container = document.getElementById('dashRecentOrders');
    if (!container) return;

    const recent = orders.slice(0, 6);
    if (recent.length === 0) {
      container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--gray3);">No orders yet</td></tr>';
      return;
    }

    container.innerHTML = recent.map(o => {
      const displayName = o.clientName || o.projectTitle;
      const initials = NAGRIVA_AdminOrders.getInitials(displayName);
      const cls = NAGRIVA_AdminOrders.getAvatarClass(displayName, 'table');
      const statusLabel = NAGRIVA_AdminOrders.STATUS[o.status]?.label || o.status;
      const badgeCls = {
        pending: 'badge-warning',
        in_progress: 'badge-info',
        revision: 'badge-neutral',
        completed: 'badge-success',
      }[o.status] || 'badge-neutral';

      return '<tr>' +
        '<td><div class="td-user"><div class="td-avatar ' + cls + '">' + initials + '</div><div><div class="td-name">' + escapeHtml(displayName) + '</div><div class="td-email">' + escapeHtml(o.projectTitle) + '</div></div></div></td>' +
        '<td>' + escapeHtml(o.service) + '</td>' +
        '<td style="color:var(--white);font-weight:500;">' + NAGRIVA_AdminOrders.formatCurrency(o.budget) + '</td>' +
        '<td><span class="badge ' + badgeCls + '">' + statusLabel + '</span></td>' +
        '<td style="color:var(--gray2);font-size:0.78rem;">' + NAGRIVA_AdminOrders.formatDate(o.createdAt) + '</td>' +
        '</tr>';
    }).join('');
  }

  function renderActivity(orders) {
    const container = document.getElementById('dashActivityFeed');
    if (!container) return;

    // Try to use real activity data first
    if (typeof NAGRIVA_Activity !== 'undefined' && NAGRIVA_Activity.getActivities().length > 0) {
      const activities = NAGRIVA_Activity.getActivities().slice(0, 6);
      container.innerHTML = activities.map(function(a, i) {
        const dotMap = {
          order_created: 'teal', status_changed: 'blue', message_sent: 'purple',
          file_uploaded: 'orange', project_completed: 'teal', project_added: 'blue',
          manager_assigned: 'orange', profile_updated: 'gray'
        };
        const dot = dotMap[a.action] || 'teal';
        var isLast = i === activities.length - 1;
        var actorName = a.profiles && a.profiles.full_name ? a.profiles.full_name : 'System';
        return '<div class="activity-item">' +
          '<div class="activity-dot-wrap">' +
            '<div class="activity-dot ' + dot + '"></div>' +
            (isLast ? '' : '<div class="activity-line"></div>') +
          '</div>' +
          '<div class="activity-content">' +
            '<div class="activity-text"><strong>' + escapeHtml(actorName) + '</strong> ' + escapeHtml(a.description || a.action) + '</div>' +
            '<div class="activity-time">' + NAGRIVA_AdminOrders.timeAgo(a.created_at) + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
      return;
    }

    // Fallback: derive from orders
    const activities = [];
    orders.slice(0, 8).forEach(o => {
      const displayName = o.clientName || o.projectTitle;
      activities.push({
        text: '<strong>' + escapeHtml(displayName) + '</strong> — ' + escapeHtml(o.service),
        time: NAGRIVA_AdminOrders.timeAgo(o.createdAt),
        dot: 'teal',
      });
      if (o.status === 'completed') {
        activities.push({
          text: '<strong>' + escapeHtml(displayName) + '</strong> completed',
          time: NAGRIVA_AdminOrders.timeAgo(o.createdAt),
          dot: 'teal',
        });
      } else if (o.status === 'revision') {
        activities.push({
          text: '<strong>' + escapeHtml(displayName) + '</strong> is in revision',
          time: NAGRIVA_AdminOrders.timeAgo(o.createdAt),
          dot: 'orange',
        });
      }
    });

    if (activities.length === 0) {
      container.innerHTML = '<div class="activity-item"><div class="activity-content"><div class="activity-text" style="color:var(--gray3);">No activity yet</div></div></div>';
      return;
    }

    container.innerHTML = activities.slice(0, 6).map(function(a, i) {
      var isLast = i === Math.min(activities.length, 6) - 1;
      return '<div class="activity-item">' +
        '<div class="activity-dot-wrap">' +
          '<div class="activity-dot ' + a.dot + '"></div>' +
          (isLast ? '' : '<div class="activity-line"></div>') +
        '</div>' +
        '<div class="activity-content">' +
          '<div class="activity-text">' + a.text + '</div>' +
          '<div class="activity-time">' + a.time + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getMonthRevenue(orders, monthsAgo) {
    var d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    var targetMonth = d.getMonth();
    var targetYear = d.getFullYear();
    return orders
      .filter(function(o) {
        if (o.status !== 'completed') return false;
        var created = new Date(o.createdAt);
        return created.getMonth() === targetMonth && created.getFullYear() === targetYear;
      })
      .reduce(function(sum, o) { return sum + Number(o.budget || 0); }, 0);
  }

  function getServiceDistribution(orders) {
    var counts = {};
    var total = 0;
    orders.forEach(function(o) {
      var svc = o.service || 'Other';
      counts[svc] = (counts[svc] || 0) + 1;
      total++;
    });
    var labels = Object.keys(counts);
    var data = labels.map(function(l) {
      return total > 0 ? Math.round((counts[l] / total) * 100) : 0;
    });
    return { labels: labels, data: data };
  }

  function updateCharts(orders) {
    if (!window.Chart || !orders || orders.length === 0) return;

    var revChart = Chart.getChart('revenueChart');
    var donutChart = Chart.getChart('donutChart');
    if (!revChart && !donutChart) return;

    var monthLabels = [];
    var revData = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date();
      d.setMonth(d.getMonth() - i);
      monthLabels.push(d.toLocaleString('en-US', { month: 'short' }));
      revData.push(getMonthRevenue(orders, i));
    }

    var serviceDist = getServiceDistribution(orders);

    if (revChart) {
      revChart.data.labels = monthLabels;
      revChart.data.datasets[0].data = revData;
      revChart.update('none');
    }

    if (donutChart) {
      var COLORS = ['#00f5c4', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#ec4899', '#14b8a6', '#8b5cf6'];
      donutChart.data.labels = serviceDist.labels;
      donutChart.data.datasets[0].data = serviceDist.data;
      donutChart.data.datasets[0].backgroundColor = serviceDist.labels.map(function(_, i) {
        return COLORS[i % COLORS.length];
      });
      donutChart.update('none');
    }
  }

  function renderTableSkeleton(count) {
    count = count || 5;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<tr class="dash-skeleton-row">' +
        '<td><div class="dash-skeleton-line w70"></div><div class="dash-skeleton-line w40" style="margin-top:6px"></div></td>' +
        '<td><div class="dash-skeleton-line w50"></div></td>' +
        '<td><div class="dash-skeleton-line w40"></div></td>' +
        '<td><div class="dash-skeleton-line w45"></div></td>' +
        '<td><div class="dash-skeleton-line w35"></div></td>' +
      '</tr>';
    }
    return html;
  }

  function renderActivitySkeleton(count) {
    count = count || 4;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="activity-item">' +
        '<div class="activity-dot-wrap">' +
          '<div class="activity-dot" style="background:rgba(255,255,255,0.06)"></div>' +
          (i < count - 1 ? '<div class="activity-line"></div>' : '') +
        '</div>' +
        '<div class="activity-content">' +
          '<div class="dash-skeleton-line w65" style="margin-bottom:6px"></div>' +
          '<div class="dash-skeleton-line w30"></div>' +
        '</div>' +
      '</div>';
    }
    return html;
  }

  function showSkeletons() {
    var revenueEl = document.getElementById('dashRevenue');
    if (revenueEl) {
      var revText = revenueEl.textContent.trim();
      if (revText === '$0' || revText === '$—' || revText === '' || revText === '$') {
        revenueEl.textContent = '$—';
      }
    }
    ['dashActiveOrders', 'dashPendingRevisions', 'dashCompletedOrders'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        var txt = el.textContent.trim();
        if (txt === '0' || txt === '—' || txt === '') {
          el.textContent = '—';
        }
      }
    });

    var ordersTbody = document.getElementById('dashRecentOrders');
    if (ordersTbody) {
      var firstCell = ordersTbody.querySelector('td');
      if (!firstCell || firstCell.textContent.includes('Loading') || firstCell.textContent.includes('orders')) {
        ordersTbody.innerHTML = renderTableSkeleton();
      } else if (firstCell.textContent.trim() === '—' || firstCell.textContent.trim() === '') {
        ordersTbody.innerHTML = renderTableSkeleton();
      }
    }

    var activityFeed = document.getElementById('dashActivityFeed');
    if (activityFeed) {
      var firstActivity = activityFeed.querySelector('.activity-text');
      if (!firstActivity || firstActivity.textContent.includes('Loading') || firstActivity.textContent.includes('activity')) {
        activityFeed.innerHTML = renderActivitySkeleton();
      }
    }
  }

  function showError(err) {
    var message = (err && err.message) || 'Failed to load dashboard data. Please check your connection.';
    var escapedMsg = escapeHtml(message);

    if (err) {
      console.error('[Dashboard] Error:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
    }

    var ordersTbody = document.getElementById('dashRecentOrders');
    if (ordersTbody) {
      ordersTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:28px 24px;">' +
        '<div style="color:var(--danger);margin-bottom:6px;font-size:1rem;"><i class="fas fa-exclamation-triangle"></i></div>' +
        '<div style="color:var(--gray);font-size:0.8rem;margin-bottom:12px;">' + escapedMsg + '</div>' +
        '<button class="btn btn-secondary btn-sm" onclick="NAGRIVA_Dashboard.retry()"><i class="fas fa-sync"></i> Retry</button>' +
      '</td></tr>';
    }

    var activityFeed = document.getElementById('dashActivityFeed');
    if (activityFeed) {
      activityFeed.innerHTML = '<div class="activity-item">' +
        '<div class="activity-dot-wrap"><div class="activity-dot" style="background:rgba(239,68,68,0.2)"></div></div>' +
        '<div class="activity-content">' +
          '<div style="color:var(--gray);font-size:0.8rem;margin-bottom:8px;">' + escapedMsg + '</div>' +
          '<button class="btn btn-secondary btn-sm" onclick="NAGRIVA_Dashboard.retry()"><i class="fas fa-sync"></i> Retry</button>' +
        '</div>' +
      '</div>';
    }
  }

  async function retry() {
    showSkeletons();
    _error = null;
    _loaded = false;
    try {
      await NAGRIVA_AdminOrders.init(document.getElementById('ordersContainer'));
      if (!_loaded) {
        var orders = NAGRIVA_AdminOrders.getAllOrders();
        if (orders.length > 0) {
          updateStats(NAGRIVA_AdminOrders.getStats());
          renderRecentOrders(orders);
          if (document.getElementById('dashActivityFeed')) {
            renderActivity(orders);
          }
          updateCharts(orders);
          _loaded = true;
        } else if (NAGRIVA_AdminOrders.error) {
          showError(NAGRIVA_AdminOrders.error);
        }
      }
    } catch (err) {
      showError(err);
    }
  }

  function renderDashboardNotifications() {
    const container = document.querySelector('.notif-list');
    if (!container) return;
    if (typeof NAGRIVA_Notifications !== 'undefined' && NAGRIVA_Notifications.getNotifications().length > 0) {
      NAGRIVA_Notifications.renderNotifications(container, 4);
      container.querySelectorAll('[data-action="mark-read"]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const id = this.dataset.id;
          if (id) NAGRIVA_Notifications.markAsRead(id);
        });
      });
      return;
    }
    if (NAGRIVA_Notifications && NAGRIVA_Notifications.getNotifications().length === 0) {
      container.innerHTML = '<div style="padding:12px;text-align:center;color:var(--gray3);font-size:0.78rem;">No notifications yet</div>';
    }
  }

  async function init() {
    _loading = true;
    _error = NAGRIVA_AdminOrders.error || null;

    showSkeletons();

    // Load real activity and notifications
    if (typeof NAGRIVA_Activity !== 'undefined') {
      NAGRIVA_Activity.init(null, 10).then(function() {
        var container = document.getElementById('dashActivityFeed');
        if (container) renderActivity(NAGRIVA_AdminOrders.getAllOrders());
      });
    }
    if (typeof NAGRIVA_Notifications !== 'undefined') {
      NAGRIVA_Notifications.init().then(function() {
        renderDashboardNotifications();
      });
    }

    if (_unsubscribe) _unsubscribe();
    _unsubscribe = NAGRIVA_AdminOrders.onChange(function(updatedOrders, updatedStats) {
      _loading = false;
      _error = null;
      _loaded = true;
      updateStats(updatedStats);
      renderRecentOrders(updatedOrders);
      if (document.getElementById('dashActivityFeed')) {
        renderActivity(updatedOrders);
      }
      updateCharts(updatedOrders);
    });

    // Subscribe to activity changes
    if (typeof NAGRIVA_Activity !== 'undefined') {
      NAGRIVA_Activity.onChange(function() {
        var container = document.getElementById('dashActivityFeed');
        if (container && document.getElementById('page-dashboard').classList.contains('active')) {
          renderActivity(NAGRIVA_AdminOrders.getAllOrders());
        }
      });
    }

    // Subscribe to notification changes
    if (typeof NAGRIVA_Notifications !== 'undefined') {
      NAGRIVA_Notifications.onChange(function() {
        renderDashboardNotifications();
      });
    }

    var orders = NAGRIVA_AdminOrders.getAllOrders();
    if (orders.length > 0) {
      var stats = NAGRIVA_AdminOrders.getStats();
      updateStats(stats);
      renderRecentOrders(orders);
      if (document.getElementById('dashActivityFeed')) {
        renderActivity(orders);
      }
      updateCharts(orders);
      _loading = false;
      _loaded = true;
    } else if (_error) {
      showError(_error);
      _loading = false;
    } else if (!NAGRIVA_AdminOrders.loading) {
      try {
        await NAGRIVA_AdminOrders.init();
      } catch (e) {
        console.warn('[Dashboard] AdminOrders init error:', e);
      }
      if (!_loaded) {
        var refreshed = NAGRIVA_AdminOrders.getAllOrders();
        if (refreshed.length > 0) {
          var s = NAGRIVA_AdminOrders.getStats();
          updateStats(s);
          renderRecentOrders(refreshed);
          if (document.getElementById('dashActivityFeed')) {
            renderActivity(refreshed);
          }
          updateCharts(refreshed);
          _loaded = true;
        }
        if (NAGRIVA_AdminOrders.error) {
          _error = NAGRIVA_AdminOrders.error;
          showError(_error);
        }
      }
      _loading = false;
    }
  }

  function destroy() {
    if (_unsubscribe) {
      _unsubscribe();
      _unsubscribe = null;
    }
  }

  function showErrorState(err) {
    _loading = false;
    _error = err || new Error('Failed to load dashboard data');
    console.error('[Dashboard] showErrorState:', {
      message: _error.message,
      code: _error.code,
      details: _error.details,
      hint: _error.hint
    });
    showError(_error);
  }

  return {
    init: init,
    retry: retry,
    updateStats: updateStats,
    updateCharts: updateCharts,
    animateCounter: animateCounter,
    animateCurrency: animateCurrency,
    destroy: destroy,
    showErrorState: showErrorState,
    get loading() { return _loading; },
    get error() { return _error; },
  };
})();
