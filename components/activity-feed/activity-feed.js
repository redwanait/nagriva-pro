const NAGRIVA_ActivityFeed = (() => {
  'use strict';

  let _initialized = false;
  let _container = null;
  let _feedEl = null;
  let _logs = [];
  let _loading = true;
  let _error = null;
  let _options = {
    containerId: 'dashActivityFeed',
    limit: 10,
    showHeader: true,
    realtime: true,
    autoInit: true
  };
  let _unsubInsert = null;
  let _unsubUpdate = null;
  let _itemCount = 0;

  const ACTION_MAP = {
    order_created:     { icon: 'fa-plus-circle', color: 'teal',   label: 'Order Created' },
    order_updated:     { icon: 'fa-pen',          color: 'blue',   label: 'Order Updated' },
    status_changed:    { icon: 'fa-exchange-alt', color: 'blue',   label: 'Status Changed' },
    client_registered: { icon: 'fa-user-plus',    color: 'teal',   label: 'New Client' },
    admin_action:      { icon: 'fa-shield-alt',   color: 'purple', label: 'Admin Action' },
    notification_sent: { icon: 'fa-bell',         color: 'orange', label: 'Notification' },
    message_sent:      { icon: 'fa-comment',      color: 'purple', label: 'Message' },
    file_uploaded:     { icon: 'fa-upload',       color: 'orange', label: 'File Uploaded' },
    project_completed: { icon: 'fa-check-circle', color: 'teal',   label: 'Completed' },
    project_added:     { icon: 'fa-tasks',        color: 'blue',   label: 'Project Added' },
    manager_assigned:  { icon: 'fa-user-tie',     color: 'orange', label: 'Manager Assigned' },
    profile_updated:   { icon: 'fa-user-edit',    color: 'gray',   label: 'Profile Updated' },
    invoice_created:   { icon: 'fa-file-invoice-dollar', color: 'teal',   label: 'Invoice Created' },
    invoice_updated:   { icon: 'fa-pen',                color: 'blue',   label: 'Invoice Updated' },
    invoice_paid:      { icon: 'fa-check-circle',        color: 'green',  label: 'Invoice Paid' },
    invoice_deleted:   { icon: 'fa-trash',               color: 'gray',   label: 'Invoice Deleted' }
  };

  function getActionMeta(action) {
    return ACTION_MAP[action] || { icon: 'fa-circle', color: 'gray', label: action || 'Activity' };
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = Date.now();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 10) return 'just now';
    if (diff < 60) return Math.floor(diff) + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderSkeletons() {
    if (!_feedEl) return;
    const count = Math.min(_options.limit, 6);
    let html = '';
    for (let i = 0; i < count; i++) {
      const w = ['w70', 'w60', 'w50', 'w45', 'w40', 'w35'][i % 6];
      html += '<div class="af-skeleton-item">' +
        '<div class="af-skel-icon"></div>' +
        '<div class="af-skel-content">' +
          '<div class="af-skel-line h10 ' + w + '"></div>' +
          '<div class="af-skel-line h8 w30 mb0"></div>' +
        '</div>' +
      '</div>';
    }
    _feedEl.innerHTML = html;
  }

  function renderEmpty() {
    if (!_feedEl) return;
    _feedEl.innerHTML =
      '<div class="af-empty">' +
        '<div class="af-empty-icon"><i class="fas fa-clock"></i></div>' +
        '<div class="af-empty-title">No activity yet</div>' +
        '<div class="af-empty-text">Client actions, status updates, and system events will appear here in real time as they happen.</div>' +
      '</div>';
  }

  function renderError(err) {
    if (!_feedEl) return;
    const msg = (err && err.message) || 'Could not load activity feed.';
    _feedEl.innerHTML =
      '<div class="af-error">' +
        '<div class="af-error-icon"><i class="fas fa-exclamation-triangle"></i></div>' +
        '<div class="af-error-text">' + escapeHtml(msg) + '</div>' +
        '<button class="af-error-btn" data-af-retry>' +
          '<i class="fas fa-sync"></i> Retry' +
        '</button>' +
      '</div>';
    const retryBtn = _feedEl.querySelector('[data-af-retry]');
    if (retryBtn) retryBtn.addEventListener('click', () => load());
  }

  function renderFeed() {
    if (!_feedEl) return;

    if (_loading) {
      renderSkeletons();
      return;
    }

    if (_error) {
      renderError(_error);
      return;
    }

    if (!_logs || _logs.length === 0) {
      renderEmpty();
      return;
    }

    const items = _logs.slice(0, _options.limit);

    _itemCount = 0;
    _feedEl.innerHTML = items.map((log, i) => {
      const meta = getActionMeta(log.action);
      const isLast = i === items.length - 1;
      const actorName = log.actorName || (log.profiles ? log.profiles.full_name : null) || 'System';
      return '<div class="af-item" data-af-id="' + log.id + '">' +
        '<div class="af-icon-wrap ' + meta.color + '"><i class="fas ' + meta.icon + '"></i></div>' +
        '<div class="af-content">' +
          '<div class="af-text">' +
            '<strong>' + escapeHtml(actorName) + '</strong> ' + escapeHtml(log.description || log.action) +
          '</div>' +
          '<div class="af-time">' +
            '<span class="af-action-label ' + meta.color + '">' + escapeHtml(meta.label) + '</span>' +
            '<span class="af-time-dot"></span>' +
            timeAgo(log.created_at) +
          '</div>' +
        '</div>' +
        (isLast ? '' : '') +
      '</div>';
    }).join('');

    _itemCount = items.length;
  }

  function prependLog(log) {
    if (!log || !log.id) return;

    const exists = _logs.some(l => l.id === log.id);
    if (exists) return;

    _logs.unshift(log);
    if (_logs.length > 100) _logs = _logs.slice(0, 100);

    if (!_feedEl) return;
    _loading = false;
    _error = null;

    const meta = getActionMeta(log.action);
    const actorName = log.actorName || (log.profiles ? log.profiles.full_name : null) || 'System';
    const itemHtml = '<div class="af-item af-item-new" data-af-id="' + log.id + '">' +
      '<div class="af-icon-wrap ' + meta.color + '"><i class="fas ' + meta.icon + '"></i></div>' +
      '<div class="af-content">' +
        '<div class="af-text">' +
          '<strong>' + escapeHtml(actorName) + '</strong> ' + escapeHtml(log.description || log.action) +
        '</div>' +
        '<div class="af-time">' +
          '<span class="af-action-label ' + meta.color + '">' + escapeHtml(meta.label) + '</span>' +
          '<span class="af-time-dot"></span>' +
          timeAgo(log.created_at) +
        '</div>' +
      '</div>' +
    '</div>';

    const existingItems = _feedEl.querySelectorAll('.af-item');
    if (existingItems.length >= _options.limit) {
      const last = existingItems[existingItems.length - 1];
      if (last && last.parentNode) last.parentNode.removeChild(last);
    }

    _feedEl.insertAdjacentHTML('afterbegin', itemHtml);
    _itemCount = Math.min(_itemCount + 1, _options.limit);
  }

  function updateLog(updated) {
    if (!updated || !updated.id) return;

    const idx = _logs.findIndex(l => l.id === updated.id);
    if (idx !== -1) {
      _logs[idx] = updated;
    }

    if (_feedEl) {
      const existingItem = _feedEl.querySelector('[data-af-id="' + updated.id + '"]');
      if (existingItem) {
        const meta = getActionMeta(updated.action);
        const actorName = updated.actorName || (updated.profiles ? updated.profiles.full_name : null) || 'System';
        existingItem.innerHTML =
          '<div class="af-icon-wrap ' + meta.color + '"><i class="fas ' + meta.icon + '"></i></div>' +
          '<div class="af-content">' +
            '<div class="af-text">' +
              '<strong>' + escapeHtml(actorName) + '</strong> ' + escapeHtml(updated.description || updated.action) +
            '</div>' +
            '<div class="af-time">' +
              '<span class="af-action-label ' + meta.color + '">' + escapeHtml(meta.label) + '</span>' +
              '<span class="af-time-dot"></span>' +
              timeAgo(updated.created_at) +
            '</div>' +
          '</div>';
        existingItem.style.animation = 'none';
        existingItem.offsetHeight;
        existingItem.style.animation = 'afFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
      }
    }
  }

  async function load() {
    if (typeof NAGRIVA_ActivityLogsAPI === 'undefined') {
      _error = new Error('ActivityLogsAPI module not loaded.');
      _loading = false;
      renderFeed();
      return;
    }

    _loading = true;
    _error = null;
    renderSkeletons();

    try {
      const result = await NAGRIVA_ActivityLogsAPI.fetchLogs({
        per_page: _options.limit,
        page: 1
      });
      _logs = result.data || [];
      _loading = false;
      renderFeed();
    } catch (err) {
      _loading = false;
      _error = err;
      console.error('[ActivityFeed] Load error:', err);
      renderFeed();
    }
  }

  function setupRealtime() {
    if (!_options.realtime) return;
    if (typeof NAGRIVA_ActivityLogsRealtime === 'undefined') return;

    NAGRIVA_ActivityLogsRealtime.subscribe();

    _unsubInsert = NAGRIVA_ActivityLogsRealtime.onInsert((log) => {
      if (!_container) return;
      const parent = _container.closest('.page') || _container.closest('[data-page]');
      if (parent && !parent.classList.contains('active')) return;

      prependLog(log);
    });

    _unsubUpdate = NAGRIVA_ActivityLogsRealtime.onUpdate((log) => {
      if (!_container) return;
      const parent = _container.closest('.page') || _container.closest('[data-page]');
      if (parent && !parent.classList.contains('active')) return;

      updateLog(log);
    });
  }

  function teardownRealtime() {
    if (_unsubInsert) { _unsubInsert(); _unsubInsert = null; }
    if (_unsubUpdate) { _unsubUpdate(); _unsubUpdate = null; }

    if (typeof NAGRIVA_ActivityLogsRealtime !== 'undefined') {
      NAGRIVA_ActivityLogsRealtime.unsubscribe();
    }
  }

  function init(userOptions) {
    if (_initialized) return;

    if (userOptions) {
      Object.assign(_options, userOptions);
    }

    _container = document.getElementById(_options.containerId);
    if (!_container) {
      console.warn('[ActivityFeed] Container #' + _options.containerId + ' not found.');
      return;
    }

    _feedEl = document.createElement('div');
    _feedEl.className = 'af-feed';
    _container.innerHTML = '';
    _container.appendChild(_feedEl);

    renderSkeletons();
    load();
    setupRealtime();

    _initialized = true;
  }

  function refresh() {
    teardownRealtime();
    _logs = [];
    load();
    setupRealtime();
  }

  function destroy() {
    teardownRealtime();

    if (_feedEl && _feedEl.parentNode) {
      _feedEl.parentNode.removeChild(_feedEl);
    }

    _container = null;
    _feedEl = null;
    _logs = [];
    _loading = true;
    _error = null;
    _initialized = false;
    _itemCount = 0;
  }

  return {
    init,
    destroy,
    refresh,
    load,
    get logs() { return [..._logs]; },
    get loading() { return _loading; },
    get error() { return _error; },
    get initialized() { return _initialized; }
  };
})();
