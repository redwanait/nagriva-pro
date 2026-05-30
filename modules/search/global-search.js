const NAGRIVA_GlobalSearch = (() => {
  'use strict';

  var _state = {
    query: '',
    results: null,
    selectedIndex: -1,
    flatResults: [],
    groupOffsets: [],
    open: false,
    loading: false,
    recent: []
  };

  var _debounceTimer = null;
  var _el = {};

  function init() {
    _el.wrap = document.getElementById('globalSearchWrap');
    _el.input = document.getElementById('globalSearchInput');
    _el.dropdown = document.getElementById('globalSearchDropdown');
    _el.hint = document.getElementById('globalSearchHint');

    if (!_el.wrap || !_el.input || !_el.dropdown) return;

    loadRecent();

    _el.input.addEventListener('input', onInput);
    _el.input.addEventListener('focus', onFocus);
    _el.input.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onGlobalKeyDown);

    _el.dropdown.addEventListener('mousedown', function(e) { e.preventDefault(); });
    _el.dropdown.addEventListener('click', function(e) {
      var result = e.target.closest('.gs-result');
      if (result && result.dataset) {
        navigateTo(result.dataset.type, result.dataset.id, result.dataset.label);
      }
      var suggestion = e.target.closest('.gs-suggestion');
      if (suggestion && suggestion.dataset && suggestion.dataset.action) {
        handleSuggestion(suggestion.dataset.action);
      }
    });
  }

  /* ════════════════════════════════════
     RECENT SEARCHES (localStorage)
     ════════════════════════════════════ */
  function loadRecent() {
    try {
      var stored = localStorage.getItem('nagriva_global_search_recent');
      _state.recent = stored ? JSON.parse(stored) : [];
    } catch (e) { _state.recent = []; }
  }

  function saveRecent(query) {
    if (!query || query.length < 2) return;
    _state.recent = _state.recent.filter(function(q) { return q !== query; });
    _state.recent.unshift(query);
    if (_state.recent.length > 5) _state.recent = _state.recent.slice(0, 5);
    try { localStorage.setItem('nagriva_global_search_recent', JSON.stringify(_state.recent)); } catch (e) {}
  }

  /* ════════════════════════════════════
     INPUT HANDLERS
     ════════════════════════════════════ */
  function onInput() {
    var val = _el.input.value.trim();
    _state.query = val;
    _state.selectedIndex = -1;
    _state.flatResults = [];
    _state.groupOffsets = [];

    if (_el.hint) {
      _el.hint.style.display = val.length > 0 ? 'none' : '';
    }

    if (_debounceTimer) clearTimeout(_debounceTimer);

    if (!val) {
      _state.results = null;
      _state.loading = false;
      renderSuggestions();
      return;
    }

    _state.loading = true;
    renderLoading();

    _debounceTimer = setTimeout(function() {
      fetchResults(val);
    }, 250);
  }

  function onFocus() {
    if (!_state.open) {
      _state.open = true;
      if (!_state.query) {
        renderSuggestions();
      } else {
        if (_state.results) {
          renderResults(_state.results, _state.query);
        } else {
          renderLoading();
        }
      }
      _el.dropdown.classList.add('open');
    }
  }

  /* ════════════════════════════════════
     SUPABASE QUERIES
     ════════════════════════════════════ */
  async function fetchResults(query) {
    var supabase = window.supabaseClient;
    if (!supabase) { _state.loading = false; renderEmpty(); return; }

    var pattern = '%' + query.replace(/[%_]/g, '\\$&') + '%';

    try {
      var results = await Promise.all([
        searchOrders(supabase, pattern),
        searchClients(supabase, pattern),
        searchServices(supabase, pattern),
        searchPayments(supabase, pattern),
        searchInvoices(supabase, pattern),
        searchFiles(supabase, pattern),
        searchMessages(supabase, pattern)
      ]);

      var grouped = {
        orders: results[0],
        clients: results[1],
        services: results[2],
        payments: results[3],
        invoices: results[4],
        files: results[5],
        messages: results[6]
      };

      _state.results = grouped;
      _state.loading = false;
      _state.selectedIndex = -1;

      buildFlatList(grouped);
      renderResults(grouped, query);

      if (!hasAnyResults(grouped)) {
        saveRecent(query);
      }
    } catch (err) {
      console.warn('[GlobalSearch] fetch error:', err);
      _state.loading = false;
      _state.results = null;
      renderEmpty();
    }
  }

  function hasAnyResults(grouped) {
    for (var key in grouped) {
      if (grouped[key] && grouped[key].length > 0) return true;
    }
    return false;
  }

  function searchOrders(supabase, pattern) {
    return supabase
      .from('orders')
      .select('id, order_number, project_title, client_name, service, status, created_at')
      .or('order_number.ilike.' + pattern + ',project_title.ilike.' + pattern + ',client_name.ilike.' + pattern)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(function(r) { return r.error ? [] : r.data; });
  }

  function searchClients(supabase, pattern) {
    return supabase
      .from('profiles')
      .select('id, full_name, email, company, role, avatar_url')
      .or('full_name.ilike.' + pattern + ',email.ilike.' + pattern + ',company.ilike.' + pattern)
      .limit(5)
      .then(function(r) { return r.error ? [] : r.data; });
  }

  function searchServices(supabase, pattern) {
    return supabase
      .from('services')
      .select('id, title, slug, category, status')
      .or('title.ilike.' + pattern + ',category.ilike.' + pattern)
      .limit(5)
      .then(function(r) { return r.error ? [] : r.data; });
  }

  function searchPayments(supabase, pattern) {
    return supabase
      .from('payments')
      .select('id, amount, currency, status, payment_method, created_at, order_id')
      .or('status.ilike.' + pattern + ',payment_method.ilike.' + pattern)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(function(r) { return r.error ? [] : r.data; });
  }

  function searchInvoices(supabase, pattern) {
    return supabase
      .from('invoices')
      .select('id, invoice_number, amount, total, status, issued_date, due_date')
      .or('invoice_number.ilike.' + pattern + ',status.ilike.' + pattern)
      .order('issued_date', { ascending: false })
      .limit(5)
      .then(function(r) { return r.error ? [] : r.data; });
  }

  function searchFiles(supabase, pattern) {
    return supabase
      .from('files')
      .select('id, file_name, file_type, file_size, created_at, order_id')
      .or('file_name.ilike.' + pattern + ',file_type.ilike.' + pattern)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(function(r) { return r.error ? [] : r.data; });
  }

  function searchMessages(supabase, pattern) {
    return supabase
      .from('messages')
      .select('id, message, sender_role, created_at, order_id, user_id')
      .ilike('message', pattern)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(function(r) { return r.error ? [] : r.data; });
  }

  /* ════════════════════════════════════
     BUILD FLAT LIST (for keyboard nav)
     ════════════════════════════════════ */
  function buildFlatList(grouped) {
    var flat = [];
    var offsets = {};
    var order = ['orders', 'clients', 'services', 'payments', 'invoices', 'files', 'messages'];

    order.forEach(function(key) {
      var items = grouped[key];
      if (!items || items.length === 0) return;
      offsets[key] = flat.length;
      items.forEach(function(item) {
        flat.push({ type: key, data: item });
      });
    });

    _state.flatResults = flat;
    _state.groupOffsets = offsets;
    return flat;
  }

  /* ════════════════════════════════════
     KEYBOARD NAVIGATION
     ════════════════════════════════════ */
  function onKeyDown(e) {
    if (!_state.open || !_state.dropdown) return;

    var flat = _state.flatResults;
    var idx = _state.selectedIndex;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flat.length === 0) return;
      var next = idx < flat.length - 1 ? idx + 1 : 0;
      setSelected(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flat.length === 0) return;
      var prev = idx > 0 ? idx - 1 : flat.length - 1;
      setSelected(prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (idx >= 0 && idx < flat.length) {
        var item = flat[idx];
        navigateTo(item.type, item.data.id, getLabel(item.data, item.type));
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
      _el.input.blur();
    }
  }

  function onGlobalKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      _el.input.focus();
      _el.input.select();
    }
  }

  function setSelected(idx) {
    _state.selectedIndex = idx;
    var items = _el.dropdown.querySelectorAll('.gs-result');
    items.forEach(function(el, i) {
      el.classList.toggle('highlighted', i === idx);
      if (i === idx) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  /* ════════════════════════════════════
     NAVIGATION
     ════════════════════════════════════ */
  function navigateTo(type, id, label) {
    saveRecent(_state.query);
    close();

    switch (type) {
      case 'orders':
        switchPage('orders');
        break;
      case 'clients':
        switchPage('clients');
        break;
      case 'services':
        window.location.href = 'service-edit.html?id=' + id;
        break;
      case 'messages':
        switchPage('messages');
        break;
      case 'payments':
        switchPage('payments');
        break;
      case 'invoices':
        switchPage('invoices');
        break;
      case 'files':
        switchPage('files');
        break;
      default:
        switchPage('dashboard');
    }
  }

  function switchPage(pageId) {
    if (typeof window.switchPage === 'function') {
      window.switchPage(pageId);
    }
  }

  function handleSuggestion(action) {
    close();
    if (action === 'new-order') {
      var btn = document.getElementById('dashNewOrderBtn');
      if (btn) { btn.click(); return; }
    }
    if (action === 'messages') { switchPage('messages'); return; }
    if (action === 'services') { switchPage('services'); return; }
    if (action === 'recent' && window.switchPage) {
      switchPage('dashboard');
    }
  }

  /* ════════════════════════════════════
     RENDER
     ════════════════════════════════════ */
  function renderSuggestions() {
    var html = '';

    html += '<div class="gs-suggestions">';
    html += '<div class="gs-suggestion-header">Quick Actions</div>';
    html += '<div class="gs-suggestion-list">';
    html += '<div class="gs-suggestion" data-action="new-order"><i class="fas fa-plus"></i> Create New Order</div>';
    html += '<div class="gs-suggestion" data-action="messages"><i class="fas fa-comment-dots"></i> View Messages</div>';
    html += '<div class="gs-suggestion" data-action="services"><i class="fas fa-cube"></i> Manage Services</div>';
    html += '</div></div>';

    if (_state.recent.length > 0) {
      html += '<div class="gs-suggestions">';
      html += '<div class="gs-suggestion-header">Recent Searches</div>';
      html += '<div class="gs-suggestion-list">';
      _state.recent.forEach(function(q) {
        html += '<div class="gs-suggestion" data-action="recent"><i class="fas fa-history"></i> ' + escapeHtml(q) + '</div>';
      });
      html += '</div></div>';
    }

    _el.dropdown.innerHTML = html;
    _el.dropdown.classList.add('open');
    _state.open = true;
  }

  function renderLoading() {
    var html = '<div class="gs-loading">';
    for (var i = 0; i < 4; i++) {
      html += '<div class="gs-loading-row">';
      html += '<div class="gs-loading-shape gs-loading-icon"></div>';
      html += '<div class="gs-loading-shape gs-loading-line' + (i === 3 ? ' short' : '') + '"></div>';
      html += '</div>';
    }
    html += '</div>';
    _el.dropdown.innerHTML = html;
    if (!_state.open) {
      _el.dropdown.classList.add('open');
      _state.open = true;
    }
  }

  function renderEmpty() {
    _el.dropdown.innerHTML = NAGRIVA_EmptyState.render({
      icon: 'fas fa-search',
      title: 'No results found',
      description: 'Try adjusting your search terms',
      variant: 'search'
    });
  }

  function renderResults(grouped, query) {
    var html = '';
    var order = ['orders', 'clients', 'services', 'payments', 'invoices', 'files', 'messages'];
    var labels = { orders: 'Orders', clients: 'Clients', services: 'Services', payments: 'Payments', invoices: 'Invoices', files: 'Files', messages: 'Messages' };
    var icons = { orders: 'fa-shopping-bag', clients: 'fa-user', services: 'fa-cube', payments: 'fa-credit-card', invoices: 'fa-file-invoice-dollar', files: 'fa-folder', messages: 'fa-comment-dots' };

    var total = 0;
    order.forEach(function(key) {
      var items = grouped[key];
      if (!items || items.length === 0) return;
      total += items.length;

      html += '<div class="gs-group">';
      html += '<div class="gs-group-header"><i class="fas ' + (icons[key] || 'fa-circle') + '"></i> ' + labels[key] + '</div>';

      items.forEach(function(item) {
        html += renderResultItem(item, key, query);
      });

      html += '</div>';
    });

    if (total === 0) {
      _el.dropdown.innerHTML = NAGRIVA_EmptyState.render({
        icon: 'fas fa-search-minus',
        title: 'No results found',
        description: 'No results for "' + escapeHtml(query) + '"',
        variant: 'search'
      });
      return;
    }

    _el.dropdown.innerHTML = html;
    _state.selectedIndex = -1;
  }

  function renderResultItem(item, type, query) {
    var title = getTitle(item, type);
    var label = getLabel(item, type);
    var status = getStatus(item, type);
    var meta = getMeta(item, type);
    var sub = getSub(item, type);

    var iconMap = { orders: 'fa-shopping-bag', clients: 'fa-user', services: 'fa-cube', payments: 'fa-credit-card', invoices: 'fa-file-invoice-dollar', files: 'fa-folder', messages: 'fa-comment-dots' };

    return '' +
      '<div class="gs-result" data-type="' + type + '" data-id="' + item.id + '" data-label="' + escapeAttr(label) + '">' +
        '<div class="gs-result-icon ' + type + '"><i class="fas ' + (iconMap[type] || 'fa-circle') + '"></i></div>' +
        '<div class="gs-result-info">' +
          '<div class="gs-result-title">' + highlightMatch(title, query) + '</div>' +
          '<div class="gs-result-meta">' +
            '<span class="gs-result-type">' + type + '</span>' +
            (status ? '<span class="gs-result-badge ' + status.class + '">' + status.label + '</span>' : '') +
            (meta ? '<span class="gs-result-sub">' + meta + '</span>' : '') +
          '</div>' +
          (sub ? '<div class="gs-result-sub" style="margin-top:1px;">' + sub + '</div>' : '') +
        '</div>' +
        '<i class="fas fa-chevron-right gs-result-arrow"></i>' +
      '</div>';
  }

  /* ════════════════════════════════════
     HELPERS
     ════════════════════════════════════ */
  function getTitle(item, type) {
    switch (type) {
      case 'orders': return item.order_number || item.project_title || 'Order';
      case 'clients': return item.full_name || item.email || 'Client';
      case 'services': return item.title || 'Service';
      case 'payments': return 'Payment #' + item.id.slice(0, 8);
      case 'invoices': return item.invoice_number || 'Invoice';
      case 'files': return item.file_name || 'File';
      case 'messages': return (item.message || '').slice(0, 60) + ((item.message || '').length > 60 ? '...' : '');
      default: return 'Item';
    }
  }

  function getLabel(item, type) {
    switch (type) {
      case 'orders': return item.order_number || item.project_title || '';
      case 'clients': return item.full_name || item.email || '';
      case 'services': return item.title || '';
      case 'payments': return item.id;
      case 'invoices': return item.invoice_number || '';
      case 'files': return item.file_name || '';
      case 'messages': return item.id;
      default: return '';
    }
  }

  function getStatus(item, type) {
    var s = item.status;
    if (!s) return null;

    switch (type) {
      case 'orders':
        var map = {
          pending: { class: 'pending', label: 'Pending' },
          in_progress: { class: 'in_progress', label: 'In Progress' },
          review: { class: 'review', label: 'Review' },
          revision: { class: 'revision', label: 'Revision' },
          delivered: { class: 'delivered', label: 'Delivered' },
          completed: { class: 'completed', label: 'Completed' },
          cancelled: { class: 'cancelled', label: 'Cancelled' }
        };
        return map[s] || null;
      case 'services':
        return s === 'published' ? { class: 'published', label: 'Published' } :
               s === 'draft' ? { class: 'draft', label: 'Draft' } :
               s === 'archived' ? { class: 'archived', label: 'Archived' } : null;
      case 'payments':
        var pmap = {
          pending: { class: 'pending', label: 'Pending' },
          paid: { class: 'paid', label: 'Paid' },
          refunded: { class: 'refunded', label: 'Refunded' },
          failed: { class: 'failed', label: 'Failed' }
        };
        return pmap[s] || null;
      case 'invoices':
        var imap = {
          pending: { class: 'pending', label: 'Pending' },
          paid: { class: 'paid', label: 'Paid' },
          overdue: { class: 'pending', label: 'Overdue' },
          cancelled: { class: 'cancelled', label: 'Cancelled' },
          refunded: { class: 'refunded', label: 'Refunded' }
        };
        return imap[s] || null;
      case 'messages':
        return item.sender_role === 'admin' ? { class: 'admin', label: 'Admin' } :
               item.sender_role === 'client' ? { class: 'client', label: 'Client' } : null;
      default: return null;
    }
  }

  function getMeta(item, type) {
    switch (type) {
      case 'orders':
        return item.client_name || item.service || '';
      case 'clients':
        return item.email || item.company || '';
      case 'services':
        return item.category || '';
      case 'payments':
        return (item.amount ? '$' + parseFloat(item.amount).toFixed(2) : '') + (item.currency ? ' ' + item.currency : '');
      case 'invoices':
        return item.total ? '$' + parseFloat(item.total).toFixed(2) : (item.amount ? '$' + parseFloat(item.amount).toFixed(2) : '');
      case 'files':
        return item.file_type || '';
      case 'messages':
        return item.created_at ? formatDate(item.created_at) : '';
      default: return '';
    }
  }

  function getSub(item, type) {
    switch (type) {
      case 'orders':
        return item.project_title || '';
      case 'clients':
        return item.company || '';
      case 'payments':
        return item.payment_method || '';
      case 'invoices':
        return 'Due: ' + (item.due_date ? item.due_date : '—');
      case 'files':
        return item.file_size ? formatSize(item.file_size) : '';
      case 'messages':
        return '';
      default: return '';
    }
  }

  function formatDate(d) {
    if (!d) return '';
    var date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function highlightMatch(text, query) {
    if (!text || !query) return escapeHtml(text || '');
    var escaped = escapeHtml(text);
    var q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp('(' + q + ')', 'gi');
    return escaped.replace(re, '<span class="gs-highlight">$1</span>');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ════════════════════════════════════
     CLOSE / DOCUMENT CLICK
     ════════════════════════════════════ */
  function close() {
    _state.open = false;
    _state.selectedIndex = -1;
    _el.dropdown.classList.remove('open');
  }

  function onDocClick(e) {
    if (!_el.wrap || _el.wrap.contains(e.target)) return;
    if (_state.open) {
      close();
    }
  }

  /* ════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════ */
  return {
    init: init,
    close: close
  };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', NAGRIVA_GlobalSearch.init);
} else {
  NAGRIVA_GlobalSearch.init();
}
