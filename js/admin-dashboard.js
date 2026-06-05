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
    const active = Math.max(0, (stats.active || 0) + (stats.approved || 0));
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

  function renderProgressBars(orders) {
    const container = document.querySelector('.progress-list');
    if (!container) return;
    const active = orders.filter(o => o.status === 'approved' || o.status === 'in_progress' || o.status === 'review' || o.status === 'revision').slice(0, 6);
    if (active.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray3);font-size:0.82rem;">No active projects right now.</div>';
      return;
    }
    const pctMap = { pending: 10, approved: 25, in_progress: 45, review: 70, revision: 85, completed: 100, cancelled: 0 };
    const colorMap = { pending: '', approved: 'blue', in_progress: 'blue', review: 'purple', revision: 'orange', completed: '', cancelled: 'red' };
    container.innerHTML = active.map(o => {
      const pct = pctMap[o.status] || 10;
      const color = colorMap[o.status] || '';
      const name = o.projectTitle || o.clientName || 'Project';
      return '<div class="progress-item">' +
        '<div class="progress-head">' +
          '<span class="progress-name">' + escapeHtml(name) + '</span>' +
          '<span class="progress-pct">' + pct + '%</span>' +
        '</div>' +
        '<div class="progress-track">' +
          '<div class="progress-bar' + (color ? ' ' + color : '') + '" style="width:' + pct + '%;"></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderRecentOrders(orders) {
    const container = document.getElementById('dashRecentOrders');
    if (!container) return;

    const recent = orders.slice(0, 6);
    if (recent.length === 0) {
      container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px 24px;"><div class="ne ne-inline"><div class="ne-icon"><i class="fas fa-shopping-bag"></i></div><h3 class="ne-title">No recent orders</h3><p class="ne-desc">Your recent orders and projects will appear here once you create them.</p></div></td></tr>';
      return;
    }

    container.innerHTML = recent.map(o => {
      const displayName = o.clientName || o.projectTitle;
      const initials = NAGRIVA_AdminOrders.getInitials(displayName);
      const cls = NAGRIVA_AdminOrders.getAvatarClass(displayName, 'table');
      const statusLabel = NAGRIVA_AdminOrders.STATUS[o.status]?.label || o.status;
      const badgeCls = {
        pending: 'badge-warning',
        approved: 'badge-info',
        in_progress: 'badge-info',
        review: 'badge-neutral',
        revision: 'badge-neutral',
        completed: 'badge-success',
        cancelled: 'badge-danger',
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
      var COLORS = ['#3b82f6', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#ec4899', '#3b82f6', '#8b5cf6'];
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

  function renderStatsSkeleton() {
    var icons = ['', '', '', ''];
    return icons.map(function() {
      return '<div class="card dash-stat-skel">' +
        '<div class="dash-stat-skel-icon"></div>' +
        '<div class="dash-stat-skel-value"></div>' +
        '<div class="dash-stat-skel-label"></div>' +
        '<div class="dash-stat-skel-change"></div>' +
      '</div>';
    }).join('');
  }

  function renderStatCards() {
    return '' +
      '<div class="card stat-card">' +
        '<div class="stat-icon blue"><i class="fas fa-dollar-sign"></i></div>' +
        '<div class="stat-value" id="dashRevenue">0 MAD</div>' +
        '<div class="stat-label">Total Revenue</div>' +
        '<div class="stat-change up"><i class="fas fa-arrow-up"></i> From completed orders</div>' +
      '</div>' +
      '<div class="card stat-card">' +
        '<div class="stat-icon blue"><i class="fas fa-clipboard-list"></i></div>' +
        '<div class="stat-value" id="dashActiveOrders">0</div>' +
        '<div class="stat-label">Active Orders</div>' +
        '<div class="stat-change up"><i class="fas fa-arrow-up"></i> Currently in progress</div>' +
      '</div>' +
      '<div class="card stat-card">' +
        '<div class="stat-icon orange"><i class="fas fa-sync-alt"></i></div>' +
        '<div class="stat-value" id="dashPendingRevisions">0</div>' +
        '<div class="stat-label">Pending Revisions</div>' +
        '<div class="stat-change down"><i class="fas fa-arrow-down"></i> Awaiting review</div>' +
      '</div>' +
      '<div class="card stat-card">' +
        '<div class="stat-icon red"><i class="fas fa-check-circle"></i></div>' +
        '<div class="stat-value" id="dashCompletedOrders">0</div>' +
        '<div class="stat-label">Completed Orders</div>' +
        '<div class="stat-change up"><i class="fas fa-arrow-up"></i> Delivered & closed</div>' +
      '</div>';
  }

  function restoreStatsCards() {
    var grid = document.querySelector('.stats-grid');
    if (!grid) return;
    if (grid.querySelector('.dash-stat-skel')) {
      grid.innerHTML = renderStatCards();
    }
  }

  function renderNotifSkeleton() {
    var html = '';
    for (var i = 0; i < 3; i++) {
      html += '<div class="dash-notif-skel">' +
        '<div class="dash-notif-skel-icon"></div>' +
        '<div class="dash-notif-skel-content">' +
          '<div class="dash-notif-skel-line" style="width:65%;"></div>' +
          '<div class="dash-notif-skel-line" style="width:40%;"></div>' +
        '</div>' +
      '</div>';
    }
    return html;
  }

  function showSkeletons() {
    var statsGrid = document.querySelector('.stats-grid');
    if (statsGrid) {
      var firstStat = statsGrid.querySelector('.dash-stat-skel');
      if (!firstStat) {
        statsGrid.innerHTML = renderStatsSkeleton();
      }
    }

    var ordersTbody = document.getElementById('dashRecentOrders');
    if (ordersTbody) {
      var firstCell = ordersTbody.querySelector('td');
      if (!firstCell || firstCell.textContent.includes('Loading') || firstCell.textContent.includes('orders')) {
        ordersTbody.innerHTML = renderTableSkeleton();
      } else if (firstCell.textContent.trim() === '—' || firstCell.textContent.trim() === '') {
        ordersTbody.innerHTML = renderTableSkeleton();
      }
    }

    var notifList = document.querySelector('.notif-list');
    if (notifList) {
      var hasRealNotif = notifList.querySelector('.notif-item');
      var hasSkel = notifList.querySelector('.dash-notif-skel');
      if (!hasRealNotif && !hasSkel) {
        notifList.innerHTML = renderNotifSkeleton();
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
      ordersTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:28px 24px;"><div class="ne ne-error ne-inline"><div class="ne-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="ne-title">Connection Error</h3><p class="ne-desc">' + escapedMsg + '</p><div class="ne-actions"><button class="ne-btn ne-btn-primary" onclick="NAGRIVA_Dashboard.retry()"><i class="fas fa-sync"></i> Retry</button></div></div></td></tr>';
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
          renderProgressBars(orders);
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
      container.innerHTML = NAGRIVA_EmptyState.render({
        icon: 'fas fa-bell',
        title: 'All caught up',
        description: 'No new notifications to show.',
        variant: 'inline'
      });
    }
  }

  async function init() {
    _loading = true;
    _error = NAGRIVA_AdminOrders.error || null;

    showSkeletons();

    // Loading timeout: prevent infinite skeleton loading
    const loadingTimeout = setTimeout(() => {
      if (_loading) {
        _loading = false;
        _error = new Error('Loading timed out. Please check your connection and try again.');
        console.error('[Dashboard] Loading timed out');
        showError(_error);
      }
    }, 20000);

    // Load realtime activity feed
    if (typeof NAGRIVA_ActivityFeed !== 'undefined') {
      try {
        NAGRIVA_ActivityFeed.init({
          containerId: 'dashActivityFeed',
          limit: 10,
          realtime: true
        });
      } catch (e) {
        console.warn('[Dashboard] ActivityFeed init error:', e);
      }
    }

    if (typeof NAGRIVA_Notifications !== 'undefined') {
      NAGRIVA_Notifications.init().then(function() {
        renderDashboardNotifications();
      }).catch(function(e) {
        console.warn('[Dashboard] Notifications init error:', e);
      });
    }

    if (_unsubscribe) _unsubscribe();
    _unsubscribe = NAGRIVA_AdminOrders.onChange(function(updatedOrders, updatedStats) {
      clearTimeout(loadingTimeout);
      _loading = false;
      _error = null;
      _loaded = true;
      restoreStatsCards();
      updateStats(updatedStats);
      renderRecentOrders(updatedOrders);
      renderProgressBars(updatedOrders);
      updateCharts(updatedOrders);
    });

    // Subscribe to notification changes
    if (typeof NAGRIVA_Notifications !== 'undefined') {
      NAGRIVA_Notifications.onChange(function() {
        renderDashboardNotifications();
      });
    }

    var orders = NAGRIVA_AdminOrders.getAllOrders();
    if (orders.length > 0) {
      clearTimeout(loadingTimeout);
      restoreStatsCards();
      var stats = NAGRIVA_AdminOrders.getStats();
      updateStats(stats);
      renderRecentOrders(orders);
      renderProgressBars(orders);
      updateCharts(orders);
      _loading = false;
      _loaded = true;
    } else if (_error) {
      clearTimeout(loadingTimeout);
      showError(_error);
      _loading = false;
    } else if (!NAGRIVA_AdminOrders.loading) {
      try {
        await NAGRIVA_AdminOrders.init();
        clearTimeout(loadingTimeout);
      } catch (e) {
        clearTimeout(loadingTimeout);
        console.warn('[Dashboard] AdminOrders init error:', e);
      }
      if (!_loaded) {
        var refreshed = NAGRIVA_AdminOrders.getAllOrders();
        if (refreshed.length > 0) {
          restoreStatsCards();
          var s = NAGRIVA_AdminOrders.getStats();
          updateStats(s);
          renderRecentOrders(refreshed);
          updateCharts(refreshed);
          _loaded = true;
        } else {
          // Show empty state with stats at 0
          restoreStatsCards();
          updateStats({ active: 0, revision: 0, completed: 0, revenue: 0, pending: 0, total: 0 });
          renderProgressBars([]);
          var ordersTbody = document.getElementById('dashRecentOrders');
          if (ordersTbody && !ordersTbody.querySelector('td')) {
            ordersTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px 24px;"><div class="ne ne-inline"><div class="ne-icon"><i class="fas fa-shopping-bag"></i></div><h3 class="ne-title">No recent orders</h3><p class="ne-desc">Your recent orders and projects will appear here once you create them.</p></div></td></tr>';
          }
        }
        if (NAGRIVA_AdminOrders.error) {
          _error = NAGRIVA_AdminOrders.error;
          showError(_error);
        }
      }
      _loading = false;
    } else {
      // NAGRIVA_AdminOrders.loading is true - wait for it
      try {
        // Wait for orders to load with a poll
        var pollAttempts = 0;
        var pollInterval = setInterval(function() {
          pollAttempts++;
          if (!NAGRIVA_AdminOrders.loading || pollAttempts > 20) {
            clearInterval(pollInterval);
            clearTimeout(loadingTimeout);
            if (!_loaded) {
              var refreshed = NAGRIVA_AdminOrders.getAllOrders();
              if (refreshed.length > 0) {
          restoreStatsCards();
          var s = NAGRIVA_AdminOrders.getStats();
          updateStats(s);
          renderRecentOrders(refreshed);
          renderProgressBars(refreshed);
          updateCharts(refreshed);
          _loaded = true;
        } else {
          restoreStatsCards();
          updateStats({ active: 0, revision: 0, completed: 0, revenue: 0, pending: 0, total: 0 });
          renderProgressBars([]);
                if (NAGRIVA_AdminOrders.error) {
                  _error = NAGRIVA_AdminOrders.error;
                  showError(_error);
                }
              }
              _loading = false;
            }
          }
        }, 1000);
      } catch (e) {
        clearTimeout(loadingTimeout);
        console.warn('[Dashboard] Poll error:', e);
        _loading = false;
      }
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
