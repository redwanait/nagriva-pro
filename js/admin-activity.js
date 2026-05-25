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
      order_created: 'teal',
      status_changed: 'blue',
      message_sent: 'purple',
      file_uploaded: 'orange',
      project_completed: 'teal',
      project_added: 'blue',
      manager_assigned: 'orange',
      profile_updated: 'gray',
      invoice_created: 'teal',
      invoice_updated: 'blue',
      invoice_paid: 'green',
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
    const { data, error } = await window.supabaseClient
      .from('activity_log')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(a => ({
      ...a,
      actorName: a.profiles ? a.profiles.full_name : 'System'
    }));
  }

  async function init(containerEl, limit) {
    _loading = true;
    _error = null;
    if (containerEl) containerEl.innerHTML = renderSkeleton();
    try {
      activities = await fetchActivities(limit);
      _loading = false;
      if (containerEl) renderActivities(containerEl);
      notifyChange();
      setupRealtime();
    } catch (err) {
      _loading = false;
      _error = err;
      console.error('[Activity] init failed:', err);
      if (containerEl) {
        containerEl.innerHTML = `
          <div class="orders-empty" style="padding:20px;">
            <div class="orders-empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <h3>Failed to Load Activity</h3>
            <p>${err.message || 'Could not connect to database.'}</p>
            <button class="btn btn-primary empty-new-order-btn" style="margin-top:16px;" onclick="NAGRIVA_Activity.init(document.getElementById('activityContainer'))">
              <i class="fas fa-sync"></i> Retry
            </button>
          </div>`;
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
              .select('*, profiles(full_name)')
              .eq('id', payload.new.id)
              .single();
            if (data) {
              activities.unshift({
                ...data,
                actorName: data.profiles ? data.profiles.full_name : 'System'
              });
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
        (a.actorName || '').toLowerCase().includes(q) ||
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
      container.innerHTML = `
        <div style="text-align:center;padding:48px 20px;animation:fadeInUp 0.5s ease-out;">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(0,245,196,0.04);border:1px solid rgba(0,245,196,0.08);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;color:var(--accent);font-size:1.1rem;">
            <i class="fas fa-stream"></i>
          </div>
          <div style="font-family:'Syne',sans-serif;font-weight:600;font-size:0.9rem;color:var(--white);margin-bottom:4px;">${filters.search || filters.action ? 'No matching activity' : 'No activity yet'}</div>
          <div style="font-size:0.78rem;color:var(--gray2);line-height:1.5;max-width:280px;margin:0 auto;">${filters.search || filters.action ? 'No activity matches your current filters. Try adjusting your search criteria.' : 'System events, status changes, and user actions will be recorded here in real time.'}</div>
        </div>`;
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
              <strong>${escapeHtml(a.actorName)}</strong>
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
