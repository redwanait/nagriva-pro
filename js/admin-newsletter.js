const NAGRIVA_Newsletter = (() => {
  let subscribers = [];
  let filters = { search: '' };
  let _loading = false;
  let _error = null;
  let realtimeChannel = null;

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderSkeleton() {
    var rows = '';
    for (var i = 0; i < 5; i++) {
      rows += '<tr class="dash-skeleton-row">' +
        '<td><div class="dash-skeleton-line w70"></div></td>' +
        '<td><div class="dash-skeleton-line w50"></div></td>' +
        '<td><div class="dash-skeleton-line w40"></div></td>' +
        '</tr>';
    }
    return '<div class="table-wrap" style="margin-top:0;"><table class="data-table"><thead><tr>' +
      '<th>Email</th><th>Status</th><th>Subscribed</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  async function fetchSubscribers() {
    let query = window.supabaseClient
      .from('newsletter_subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });

    if (filters.search) {
      query = query.or('email.ilike.%' + filters.search + '%');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  function renderTable(containerEl) {
    if (!containerEl) return;
    if (_loading) {
      containerEl.innerHTML = renderSkeleton();
      return;
    }
    if (_error) {
      return;
    }

    var filtered = subscribers;
    if (filters.search) {
      var s = filters.search.toLowerCase();
      filtered = subscribers.filter(function(sb) {
        return (sb.email || '').toLowerCase().includes(s);
      });
    }

    if (!filtered.length) {
      var msg = subscribers.length === 0
        ? '<div class="card" style="padding:48px;text-align:center;"><i class="fas fa-newspaper" style="font-size:2rem;color:var(--gray3);margin-bottom:12px;display:block;"></i><h3 style="color:var(--gray);font-weight:500;font-size:1rem;">No subscribers yet</h3><p style="color:var(--gray2);font-size:0.85rem;margin-top:4px;">Newsletter subscribers will appear here when they sign up.</p></div>'
        : '<div class="card" style="padding:48px;text-align:center;"><i class="fas fa-search" style="font-size:2rem;color:var(--gray3);margin-bottom:12px;display:block;"></i><h3 style="color:var(--gray);font-weight:500;font-size:1rem;">No matching subscribers</h3><p style="color:var(--gray2);font-size:0.85rem;margin-top:4px;">No subscribers match your current search.</p></div>';
      containerEl.innerHTML = msg;
      return;
    }

    var html = '<div class="table-wrap" style="margin-top:0;"><table class="data-table"><thead><tr>' +
      '<th>Email</th><th>Status</th><th>Subscribed</th><th style="width:100px;">Actions</th>' +
      '</tr></thead><tbody>';

    filtered.forEach(function(sb) {
      var statusClass = sb.status === 'active' ? 'badge-success' : sb.status === 'unsubscribed' ? 'badge-warning' : 'badge-danger';
      var statusLabel = sb.status.charAt(0).toUpperCase() + sb.status.slice(1);
      html += '<tr data-id="' + sb.id + '">' +
        '<td><strong>' + escapeHtml(sb.email) + '</strong></td>' +
        '<td><span class="badge ' + statusClass + '">' + statusLabel + '</span></td>' +
        '<td style="color:var(--gray2);font-size:0.78rem;">' + formatDate(sb.subscribed_at) + '</td>' +
        '<td><div class="td-actions"><button class="td-action-btn danger" data-action="delete-subscriber" title="Delete"><i class="fas fa-trash"></i></button></div></td>' +
        '</tr>';
    });

    html += '</tbody></table></div>';
    containerEl.innerHTML = html;

    containerEl.querySelectorAll('[data-action="delete-subscriber"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var row = this.closest('tr[data-id]');
        if (row) deleteSubscriber(row.dataset.id);
      });
    });
  }

  async function deleteSubscriber(id) {
    if (!confirm('Are you sure you want to remove this subscriber?')) return;

    try {
      const { error } = await window.supabaseClient
        .from('newsletter_subscribers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      subscribers = subscribers.filter(function(s) { return s.id !== id; });
      updateCount();
      var container = document.getElementById('newsletterContainer');
      if (container) renderTable(container);
      NAGRIVA_Toast.success('Subscriber Removed', 'The subscriber has been deleted.');
    } catch (err) {
      console.error('[Newsletter] delete failed:', err);
      NAGRIVA_Toast.error('Delete Failed', err.message || 'Could not delete subscriber.');
    }
  }

  function updateCount() {
    var countEl = document.getElementById('newsletterCount');
    if (countEl) {
      countEl.innerHTML = 'Showing <strong>' + subscribers.length + '</strong> subscriber' + (subscribers.length !== 1 ? 's' : '');
    }
    var totalEl = document.getElementById('newsletterTotal');
    if (totalEl) {
      totalEl.textContent = subscribers.length.toLocaleString();
    }
  }

  async function init(containerEl) {
    _loading = true;
    _error = null;
    if (containerEl) containerEl.innerHTML = renderSkeleton();
    try {
      subscribers = await fetchSubscribers();
      _loading = false;
      if (containerEl) renderTable(containerEl);
      updateCount();
      setupRealtime();
    } catch (err) {
      _loading = false;
      _error = err;
      console.error('[Newsletter] init failed:', err);
      if (containerEl) {
        var desc = escapeHtml(err.message || 'Could not connect to database.');
        containerEl.innerHTML = (typeof NAGRIVA_EmptyState !== 'undefined' ? NAGRIVA_EmptyState.render({
          icon: 'fas fa-exclamation-triangle',
          title: 'Failed to Load Subscribers',
          description: desc,
          variant: 'error',
          primaryCta: { icon: 'fas fa-sync', label: 'Retry', onclick: 'NAGRIVA_Newsletter.refresh(document.getElementById(\'newsletterContainer\'))' }
        }) : '<div class="card" style="padding:48px;text-align:center;"><p style="color:var(--danger);">' + desc + '</p></div>');
      }
      NAGRIVA_Toast.error('Connection Error', 'Could not load newsletter subscribers.');
    }
  }

  function setupRealtime() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    realtimeChannel = window.supabaseClient
      .channel('admin-newsletter-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'newsletter_subscribers' },
        async function() {
          try {
            subscribers = await fetchSubscribers();
            var container = document.getElementById('newsletterContainer');
            if (container) renderTable(container);
            updateCount();
          } catch (e) {
            console.warn('[Newsletter] Realtime sync error:', e.message || e);
          }
        }
      )
      .subscribe(function(status) {
        if (status === 'SUBSCRIBED') {
          console.log('[Newsletter] Realtime channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Newsletter] Realtime channel error');
        } else if (status === 'TIMED_OUT') {
          console.warn('[Newsletter] Realtime channel timed out');
        }
      });
  }

  function setSearch(value) {
    filters.search = value;
  }

  function refresh(containerEl) {
    init(containerEl);
  }

  return {
    init: init,
    refresh: refresh,
    setSearch: setSearch,
    renderTable: renderTable
  };
})();
