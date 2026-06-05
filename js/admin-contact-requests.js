const NAGRIVA_ContactRequests = (() => {
  let submissions = [];
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

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  function showToast(type, title, message) {
    if (typeof NAGRIVA_Toast !== 'undefined') {
      NAGRIVA_Toast.show(type, title, message);
      return;
    }
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML = '<div class="toast-icon ' + type + '"><i class="fas ' + (icons[type] || icons.info) + '"></i></div><div class="toast-content"><div class="toast-title">' + title + '</div><div class="toast-message">' + message + '</div></div><button class="toast-close"><i class="fas fa-times"></i></button>';
    container.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('visible'); });
    toast.querySelector('.toast-close').addEventListener('click', function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 400);
    });
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 400);
    }, 4000);
  }

  function renderSkeleton() {
    var rows = '';
    for (var i = 0; i < 5; i++) {
      rows += '<tr class="dash-skeleton-row">' +
        '<td><div class="dash-skeleton-line w65"></div></td>' +
        '<td><div class="dash-skeleton-line w70"></div></td>' +
        '<td><div class="dash-skeleton-line w50"></div></td>' +
        '<td><div class="dash-skeleton-line w40"></div></td>' +
        '<td><div class="dash-skeleton-line w30"></div></td>' +
        '</tr>';
    }
    return '<div class="table-wrap" style="margin-top:0;"><table class="data-table"><thead><tr>' +
      '<th>Name</th><th>Email</th><th>Service</th><th>Company</th><th>Date</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  async function fetchSubmissions() {
    let query = window.supabaseClient
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.search) {
      query = query.or('full_name.ilike.%' + filters.search + '%,email.ilike.%' + filters.search + '%,company_name.ilike.%' + filters.search + '%');
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

    var filtered = submissions;
    if (filters.search) {
      var s = filters.search.toLowerCase();
      filtered = submissions.filter(function(sb) {
        return (sb.full_name || '').toLowerCase().includes(s) ||
               (sb.email || '').toLowerCase().includes(s) ||
               (sb.company_name || '').toLowerCase().includes(s);
      });
    }

    if (!filtered.length) {
      containerEl.innerHTML = '<div class="card" style="padding:48px;text-align:center;"><i class="fas fa-inbox" style="font-size:2rem;color:var(--gray3);margin-bottom:12px;display:block;"></i><h3 style="color:var(--gray);font-weight:500;font-size:1rem;">No contact submissions yet</h3><p style="color:var(--gray2);font-size:0.85rem;margin-top:4px;">When visitors submit the contact form, they will appear here.</p></div>';
      return;
    }

    var html = '<div class="table-wrap" style="margin-top:0;"><table class="data-table"><thead><tr>' +
      '<th>Full Name</th><th>Email</th><th>Company</th><th>Service Needed</th><th>Budget</th><th>Project Details</th><th>Submitted</th>' +
      '</tr></thead><tbody>';

    filtered.forEach(function(sb) {
      html += '<tr>' +
        '<td><strong>' + escapeHtml(sb.full_name) + '</strong></td>' +
        '<td><a href="mailto:' + escapeHtml(sb.email) + '" style="color:var(--accent);">' + escapeHtml(sb.email) + '</a></td>' +
        '<td>' + escapeHtml(sb.company_name || '\u2014') + '</td>' +
        '<td><span class="status-badge status-completed">' + escapeHtml(sb.service_needed) + '</span></td>' +
        '<td>' + escapeHtml(sb.budget_range || '\u2014') + '</td>' +
        '<td style="max-width:220px;" title="' + escapeHtml(sb.project_details) + '">' + escapeHtml(truncate(sb.project_details, 60)) + '</td>' +
        '<td class="td-date">' + formatDate(sb.created_at) + '</td>' +
        '</tr>';
    });

    html += '</tbody></table></div>';
    containerEl.innerHTML = html;
  }

  function updateCount() {
    var el = document.getElementById('contactRequestsCount');
    if (el) el.textContent = submissions.length + ' submission' + (submissions.length !== 1 ? 's' : '');
  }

  async function init(containerEl) {
    _loading = true;
    _error = null;
    if (containerEl) containerEl.innerHTML = renderSkeleton();
    try {
      submissions = await fetchSubmissions();
      _loading = false;
      if (containerEl) renderTable(containerEl);
      updateCount();
      setupRealtime();
    } catch (err) {
      _loading = false;
      _error = err;
      console.error('[ContactRequests] init failed:', err);
      if (containerEl) {
        var detailMsg = err.hint || err.details || '';
        var desc = escapeHtml(err.message || 'Could not connect to database.') + (detailMsg ? ' ' + escapeHtml(detailMsg) : '');
        containerEl.innerHTML = (typeof NAGRIVA_EmptyState !== 'undefined' ? NAGRIVA_EmptyState.render({
          icon: 'fas fa-exclamation-triangle',
          title: 'Failed to Load Contact Requests',
          description: desc,
          variant: 'error',
          primaryCta: { icon: 'fas fa-sync', label: 'Retry', onclick: 'NAGRIVA_ContactRequests.init(document.getElementById(\'contactRequestsContainer\'))' }
        }) : '<div class="card" style="padding:48px;text-align:center;"><p style="color:var(--danger);">' + desc + '</p></div>');
      }
      showToast('error', 'Connection Error', 'Could not load contact submissions.');
    }
  }

  function setupRealtime() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    realtimeChannel = window.supabaseClient
      .channel('admin-contact-requests-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'contact_submissions' },
        async function() {
          try {
            submissions = await fetchSubmissions();
            var container = document.getElementById('contactRequestsContainer');
            if (container) renderTable(container);
            updateCount();
          } catch (e) {
            console.warn('[ContactRequests] Realtime sync error:', e.message || e);
          }
        }
      )
      .subscribe(function(status) {
        if (status === 'SUBSCRIBED') {
          console.log('[ContactRequests] Realtime channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[ContactRequests] Realtime channel error');
        } else if (status === 'TIMED_OUT') {
          console.warn('[ContactRequests] Realtime channel timed out');
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
