const NAGRIVA_Activity = (() => {
  let activities = [];
  let filters = { action: '', search: '' };
  let onChangeCallbacks = [];
  let realtimeChannel = null;
  let _loading = false;
  let _error = null;

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getActionDot(action) {
    const map = {
      order_created: 'blue',
      status_changed: 'blue',
      message_sent: 'purple',
      file_uploaded: 'orange',
      project_completed: 'blue',
      project_added: 'blue',
      manager_assigned: 'orange',
      profile_updated: 'gray',
      invoice_created: 'blue',
      invoice_updated: 'blue',
      invoice_paid: 'blue',
      invoice_deleted: 'gray'
    };
    return map[action] || 'gray';
  }

  function getActionIcon(action) {
    const map = {
      order_created: 'fa-plus-circle',
      status_changed: 'fa-exchange-alt',
      message_sent: 'fa-comment',
      file_uploaded: 'fa-upload',
      project_completed: 'fa-check-circle',
      project_added: 'fa-tasks',
      manager_assigned: 'fa-user-tie',
      profile_updated: 'fa-user-edit',
      invoice_created: 'fa-file-invoice-dollar',
      invoice_updated: 'fa-pen',
      invoice_paid: 'fa-check-circle',
      invoice_deleted: 'fa-trash'
    };
    return map[action] || 'fa-circle';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function fetchActivities(limit) {
    limit = limit || 50;
    try {
      const { data, error } = await window.supabaseClient
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Activity] fetchActivities error:', err.message || err);
      return [];
    }
  }

  async function init(containerEl, limit) {
    _loading = true;
    _error = null;
    if (containerEl) containerEl.innerHTML = renderSkeleton();

    const timeout = setTimeout(() => {
      if (_loading) {
        _loading = false;
        _error = new Error('Request timed out');
        console.error('[Activity] Loading timed out');
        if (containerEl) renderActivities(containerEl);
        notifyChange();
      }
    }, 15000);

    try {
      activities = await fetchActivities(limit);
      clearTimeout(timeout);
      _loading = false;
      if (containerEl) renderActivities(containerEl);
      notifyChange();
      setupRealtime();
    } catch (err) {
      clearTimeout(timeout);
      _loading = false;
      _error = err;
      console.error('[Activity] init failed:', err);
      if (containerEl) {
        containerEl.innerHTML = NAGRIVA_EmptyState.render({
          icon: 'fas fa-exclamation-triangle',
          title: 'Failed to Load Activity',
          description: err.message || 'Could not connect to database.',
          variant: 'error',
          primaryCta: { icon: 'fas fa-sync', label: 'Retry', onclick: 'NAGRIVA_Activity.init(document.getElementById(\'activityContainer\'))' }
        });
      }
    }
  }

  function setupRealtime() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    realtimeChannel = window.supabaseClient
      .channel('admin-activity-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        async (payload) => {
          try {
            const { data } = await window.supabaseClient
              .from('activity_log')
              .select('*')
              .eq('id', payload.new.id)
              .single();
            if (data) {
              activities.unshift(data);
              if (activities.length > 100) activities = activities.slice(0, 100);
              notifyChange();
              const container = document.getElementById('activityContainer');
              if (container) renderActivities(container);
            }
          } catch (e) {
            console.warn('[Activity] Realtime sync error:', e.message || e);
          }
        }
      )
      .subscribe();
  }

  function setActionFilter(action) {
    filters.action = action || '';
    return getFilteredActivities();
  }

  function setSearch(query) {
    filters.search = (query || '').toLowerCase().trim();
    return getFilteredActivities();
  }

  function getFilteredActivities() {
    let result = [...activities];
    if (filters.action) {
      result = result.filter(a => a.action === filters.action);
    }
    if (filters.search) {
      const q = filters.search;
      result = result.filter(a =>
        (a.description || '').toLowerCase().includes(q) ||
        (a.user_id || '').toLowerCase().includes(q) ||
        (a.action || '').toLowerCase().includes(q)
      );
    }
    return result;
  }

  function getActivities() {
    return [...activities];
  }

  function onChange(cb) {
    onChangeCallbacks.push(cb);
    return () => {
      onChangeCallbacks = onChangeCallbacks.filter(fn => fn !== cb);
    };
  }

  function notifyChange() {
    onChangeCallbacks.forEach(fn => fn([...activities]));
  }

  function renderSkeleton() {
    let html = '';
    for (let i = 0; i < 5; i++) {
      html += `
        <div class="activity-item">
          <div class="activity-dot-wrap">
            <div class="activity-dot" style="background:rgba(255,255,255,0.06);"></div>
            ${i < 4 ? '<div class="activity-line"></div>' : ''}
          </div>
          <div class="activity-content">
            <div class="dash-skeleton-line w65" style="margin-bottom:6px;"></div>
            <div class="dash-skeleton-line w30"></div>
          </div>
        </div>`;
    }
    return html;
  }

  function renderActivities(container, maxItems) {
    if (!container) return;
    if (_loading) {
      container.innerHTML = renderSkeleton();
      return;
    }
    const filtered = getFilteredActivities();
    const items = maxItems ? filtered.slice(0, maxItems) : filtered;

    if (items.length === 0) {
      container.innerHTML = NAGRIVA_EmptyState.render({
        icon: 'fas fa-stream',
        title: filters.search || filters.action ? 'No matching activity' : 'No activity yet',
        description: filters.search || filters.action ? 'No activity matches your current filters. Try adjusting your search criteria.' : 'System events, status changes, and user actions will be recorded here in real time.',
        variant: filters.search || filters.action ? 'search' : 'default'
      });
      return;
    }

    container.innerHTML = items.map((a, i) => {
      const isLast = i === items.length - 1;
      return `
        <div class="activity-item">
          <div class="activity-dot-wrap">
            <div class="activity-dot ${getActionDot(a.action)}"></div>
            ${isLast ? '' : '<div class="activity-line"></div>'}
          </div>
          <div class="activity-content">
            <div class="activity-text">
              <strong>${a.user_id ? escapeHtml(a.user_id.substring(0, 8) + '...') : 'System'}</strong>
              ${escapeHtml(a.description || a.action)}
            </div>
            <div class="activity-time">${formatDate(a.created_at)}</div>
          </div>
        </div>`;
    }).join('');
  }

  function destroy() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    onChangeCallbacks = [];
    activities = [];
  }

  return {
    init,
    getActivities,
    getFilteredActivities,
    setActionFilter,
    setSearch,
    renderActivities,
    renderSkeleton,
    onChange,
    formatDate,
    getActionDot,
    destroy,
    get loading() { return _loading; },
    get error() { return _error; }
  };
})();
