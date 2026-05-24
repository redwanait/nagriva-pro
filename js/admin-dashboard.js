const NAGRIVA_Dashboard = (() => {
  function animateCounter(el, target, duration = 1000) {
    if (!el) return;
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

  function animateCurrency(el, target, duration = 1000) {
    if (!el) return;
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
    const activeEl = document.getElementById('dashActiveOrders');
    const revisionEl = document.getElementById('dashPendingRevisions');
    const completedEl = document.getElementById('dashCompletedOrders');
    const revenueEl = document.getElementById('dashRevenue');

    if (activeEl) {
      const current = parseInt(activeEl.textContent.replace(/[^0-9]/g, '')) || 0;
      if (current !== stats.active) animateCounter(activeEl, stats.active);
      else activeEl.textContent = stats.active;
    }
    if (revisionEl) {
      const current = parseInt(revisionEl.textContent.replace(/[^0-9]/g, '')) || 0;
      if (current !== stats.revision) animateCounter(revisionEl, stats.revision);
      else revisionEl.textContent = stats.revision;
    }
    if (completedEl) {
      const current = parseInt(completedEl.textContent.replace(/[^0-9]/g, '')) || 0;
      if (current !== stats.completed) animateCounter(completedEl, stats.completed);
      else completedEl.textContent = stats.completed;
    }
    if (revenueEl) {
      const curStr = revenueEl.textContent.replace(/[^0-9]/g, '');
      const current = parseInt(curStr) || 0;
      if (current !== stats.revenue) animateCurrency(revenueEl, stats.revenue);
      else revenueEl.textContent = '$' + stats.revenue.toLocaleString('en-US');
    }

    const badge = document.querySelector('.sidebar-item[data-page="orders"] .badge-count');
    if (badge) {
      const pending = stats.pending + stats.revision;
      badge.textContent = pending;
      badge.style.display = pending > 0 ? '' : 'none';
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
      const initials = NAGRIVA_AdminOrders.getInitials(o.projectTitle);
      const cls = NAGRIVA_AdminOrders.getAvatarClass(o.projectTitle, 'table');
      const statusLabel = NAGRIVA_AdminOrders.STATUS[o.status]?.label || o.status;
      const badgeCls = {
        pending: 'badge-warning',
        in_progress: 'badge-info',
        review: 'badge-neutral',
        delivered: 'badge-success',
        cancelled: 'badge-danger',
      }[o.status] || 'badge-neutral';

      return `<tr>
        <td><div class="td-user"><div class="td-avatar ${cls}">${initials}</div><div><div class="td-name">${o.projectTitle}</div><div class="td-email">${o.orderNumber}</div></div></div></td>
        <td>${o.serviceType}</td>
        <td style="color:var(--white);font-weight:500;">${NAGRIVA_AdminOrders.formatCurrency(o.budget)}</td>
        <td><span class="badge ${badgeCls}">${statusLabel}</span></td>
        <td style="color:var(--gray2);font-size:0.78rem;">${NAGRIVA_AdminOrders.formatDate(o.createdAt)}</td>
      </tr>`;
    }).join('');
  }

  function renderActivity(orders) {
    const container = document.getElementById('dashActivityFeed');
    if (!container) return;

    const activities = [];
    orders.slice(0, 8).forEach(o => {
      activities.push({
        text: `<strong>${o.projectTitle}</strong> — ${o.serviceType}`,
        time: NAGRIVA_AdminOrders.timeAgo(o.createdAt),
        dot: 'teal',
      });
      if (o.status === 'delivered') {
        activities.push({
          text: `<strong>${o.projectTitle}</strong> was delivered`,
          time: NAGRIVA_AdminOrders.timeAgo(o.createdAt),
          dot: 'teal',
        });
      } else if (o.status === 'review') {
        activities.push({
          text: `<strong>${o.projectTitle}</strong> is in review`,
          time: NAGRIVA_AdminOrders.timeAgo(o.createdAt),
          dot: 'orange',
        });
      }
    });

    if (activities.length === 0) {
      container.innerHTML = '<div class="activity-item"><div class="activity-content"><div class="activity-text" style="color:var(--gray3);">No activity yet</div></div></div>';
      return;
    }

    container.innerHTML = activities.slice(0, 6).map((a, i) => {
      const isLast = i === Math.min(activities.length, 6) - 1;
      return `<div class="activity-item">
        <div class="activity-dot-wrap">
          <div class="activity-dot ${a.dot}"></div>
          ${isLast ? '' : '<div class="activity-line"></div>'}
        </div>
        <div class="activity-content">
          <div class="activity-text">${a.text}</div>
          <div class="activity-time">${a.time}</div>
        </div>
      </div>`;
    }).join('');
  }

  async function init() {
    try {
      const stats = NAGRIVA_AdminOrders.getStats();
      updateStats(stats);

      const orders = NAGRIVA_AdminOrders.getAllOrders();
      renderRecentOrders(orders);
      if (document.getElementById('dashActivityFeed')) {
        renderActivity(orders);
      }
    } catch (err) {
      console.error('Dashboard init error:', err);
    }

    NAGRIVA_AdminOrders.onChange((updatedOrders, updatedStats) => {
      updateStats(updatedStats);
      renderRecentOrders(updatedOrders);
      if (document.getElementById('dashActivityFeed')) {
        renderActivity(updatedOrders);
      }
    });
  }

  return { init, updateStats, animateCounter, animateCurrency };
})();
