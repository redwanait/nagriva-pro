/* ════════════════════════════════════════════════════════
   NAGRIVA — Audit History Dashboard
   Premium SaaS · Supabase · Search · Filter · Paginate
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_AuditHistory = (function () {
  'use strict';

  var _user = null;
  var _allReports = [];
  var _displayReports = [];
  var _currentPage = 1;
  var _perPage = 10;
  var _deleteTarget = null;
  var _filters = { search: '', period: 'all', sort: 'newest' };
  var _isAdmin = false;

  /* ─── SVG Icons ─── */
  var ICONS = {
    globe: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    download: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    share: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
    trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    clipboard: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
    'trending-up': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    award: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
    'bar-chart': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    'check-circle': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    'plus': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    'lightbulb': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
    'list': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    'arrow-up': '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
    'arrow-down': '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
    'target': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
  };

  /* ─── Helpers ─── */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateFull(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getDomain(url) {
    if (!url) return '';
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  }

  function getScoreLevel(score) {
    if (score == null) return 'poor';
    if (score >= 80) return 'excellent';
    if (score >= 50) return 'good';
    return 'poor';
  }

  function getScoreLabel(score) {
    var map = { excellent: 'Excellent', good: 'Good', poor: 'Needs Improvement' };
    return map[getScoreLevel(score)] || 'N/A';
  }

  function getPeriodDate(period) {
    if (period === 'all') return null;
    var d = new Date();
    d.setDate(d.getDate() - parseInt(period, 10));
    return d;
  }

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

  /* ─── Data Fetching ─── */
  async function fetchReports() {
    if (!_user) return [];

    var { data, error } = await window.supabaseClient
      .from('audit_reports')
      .select('*, audit_leads(email, company)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AuditHistory] Fetch error:', error);
      if (error.code === 'PGRST116') return [];
      throw error;
    }
    return data || [];
  }

  async function deleteReport(id) {
    var { error } = await window.supabaseClient
      .from('audit_reports')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async function getSignedUrl(storagePath) {
    var { data, error } = await window.supabaseClient
      .storage
      .from('audit-reports')
      .createSignedUrl(storagePath, 3600);

    if (error) throw error;
    return data.signedUrl;
  }

  /* ─── Process Reports ─── */
  function processReports(reports) {
    return reports.map(function (r) {
      var leads = r.audit_leads || {};
      return {
        id: r.id,
        lead_id: r.lead_id,
        website: r.website || leads.website || '',
        email: leads.email || '',
        company: leads.company || '',
        report_url: r.report_url,
        audit_score: r.audit_score,
        created_at: r.created_at,
        domain: getDomain(r.website || leads.website || '')
      };
    });
  }

  /* ─── Filter & Sort ─── */
  function applyFilters() {
    var filtered = _allReports.slice();

    if (_filters.search) {
      var q = _filters.search.toLowerCase().trim();
      filtered = filtered.filter(function (r) {
        return r.website.toLowerCase().indexOf(q) !== -1
          || r.domain.toLowerCase().indexOf(q) !== -1;
      });
    }

    if (_filters.period !== 'all') {
      var cutoff = getPeriodDate(_filters.period);
      if (cutoff) {
        filtered = filtered.filter(function (r) {
          return new Date(r.created_at) >= cutoff;
        });
      }
    }

    switch (_filters.sort) {
      case 'newest':
        filtered.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
        break;
      case 'oldest':
        filtered.sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
        break;
      case 'highest':
        filtered.sort(function (a, b) { return (b.audit_score || 0) - (a.audit_score || 0); });
        break;
      case 'lowest':
        filtered.sort(function (a, b) { return (a.audit_score || 0) - (b.audit_score || 0); });
        break;
    }

    _displayReports = filtered;
    _currentPage = 1;
  }

  function getPaginated() {
    var start = (_currentPage - 1) * _perPage;
    var end = start + _perPage;
    return {
      items: _displayReports.slice(start, end),
      total: _displayReports.length,
      totalPages: Math.max(1, Math.ceil(_displayReports.length / _perPage)),
      currentPage: _currentPage,
      perPage: _perPage
    };
  }

  /* ─── Stats ─── */
  function computeStats(reports) {
    var total = reports.length;
    if (total === 0) return { total: 0, avgScore: 0, highestScore: 0, reportsGenerated: 0 };

    var scores = reports.map(function (r) { return r.audit_score; }).filter(function (s) { return s != null; });
    var avgScore = scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : 0;
    var highestScore = scores.length ? Math.max.apply(null, scores) : 0;

    return { total: total, avgScore: avgScore, highestScore: highestScore, reportsGenerated: total };
  }

  /* ─── Render Stats ─── */
  function renderStats(stats) {
    var container = document.getElementById('ahStats');
    if (!container) return;

    var items = [
      { icon: ICONS.clipboard, value: stats.total, label: 'Total Audits', change: 'All time audits', id: 'statTotal', cls: '' },
      { icon: ICONS['trending-up'], value: stats.avgScore, label: 'Average Score', change: 'Overall performance', id: 'statAvg', cls: 'stat-good', suffix: '' },
      { icon: ICONS.award, value: stats.highestScore, label: 'Highest Score', change: 'Best result', id: 'statHighest', cls: 'stat-excellent', suffix: '' },
      { icon: ICONS['bar-chart'], value: stats.reportsGenerated, label: 'Reports Generated', change: 'Total reports', id: 'statReports', cls: '' }
    ];

    var html = '';
    items.forEach(function (item, i) {
      var val = item.value;
      if (item.id === 'statAvg') val = val + '%';
      if (item.id === 'statHighest' && val > 0) val = val + '%';
      html += '<div class="ah-stat-card ah-fade-in ' + item.cls + '">' +
        '<div class="ah-stat-icon">' + item.icon + '</div>' +
        '<div class="ah-stat-value"><span class="ah-counter" id="' + item.id + '">0</span></div>' +
        '<div class="ah-stat-label">' + item.label + '</div>' +
        '<span class="ah-stat-change">' + item.change + '</span></div>';
    });

    container.innerHTML = html;

    items.forEach(function (item) {
      var el = document.getElementById(item.id);
      if (!el) return;
      var targetVal = item.value;
      animateCounter(el, targetVal, item.suffix || '');
    });
  }

  function animateCounter(el, target, suffix) {
    if (!el) return;
    suffix = suffix || '';
    var duration = 800;
    var start = performance.now();

    function tick(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 4);
      var current = Math.round(eased * target);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(tick);
  }

  /* ─── Render Table Rows ─── */
  function renderTable(paginated) {
    var tbody = document.getElementById('ahTableBody');
    var cards = document.getElementById('ahCards');
    var empty = document.getElementById('ahEmpty');
    var pagination = document.getElementById('ahPagination');
    var container = document.getElementById('ahTableContainer');

    if (!tbody) return;

    if (paginated.total === 0) {
      tbody.innerHTML = '';
      if (cards) cards.innerHTML = '';
      if (container) container.style.display = 'none';
      if (pagination) pagination.innerHTML = '';
      var hasSearchOrFilter = _filters.search || _filters.period !== 'all';
      if (empty) {
        if (hasSearchOrFilter && window.NAGRIVA_EmptyState) {
          empty.style.display = '';
          empty.innerHTML = NAGRIVA_EmptyState.render({
            icon: 'search',
            title: 'No Results Found',
            description: 'Try a different search term or remove filters.',
            variant: 'search',
            primaryCta: {
              label: 'Clear Filters',
              onclick: 'var si=document.getElementById(\'ahSearchInput\');if(si){si.value=\'\';si.dispatchEvent(new Event(\'input\'))}'
            }
          });
        } else if (!_allReports.length && window.NAGRIVA_EmptyState) {
          empty.style.display = '';
          empty.innerHTML = NAGRIVA_EmptyState.render({
            icon: 'clock',
            title: 'No Audits Yet',
            description: 'You haven\'t generated any audit reports yet.',
            primaryCta: { label: 'Run Your First Audit', url: '/tools/website-audit-tool' }
          });
        } else {
          empty.style.display = 'flex';
        }
      }
      return;
    }

    if (container) container.style.display = '';
    if (empty) empty.style.display = 'none';

    var rowsHtml = '';
    var cardsHtml = '';

    paginated.items.forEach(function (r, i) {
      var level = getScoreLevel(r.audit_score);
      var label = getScoreLabel(r.audit_score);
      var scoreDisplay = r.audit_score != null ? r.audit_score : '—';
      var dateDisplay = formatDate(r.created_at);
      var siteDisplay = r.website || r.domain || 'Unknown';
      var animDelay = 'style="animation-delay:' + (i * 0.04) + 's"';

      rowsHtml += '<tr class="ah-fade-in" ' + animDelay + '>' +
        '<td><div class="ah-website-url">' + ICONS.globe + '<span title="' + escapeHtml(siteDisplay) + '">' + escapeHtml(siteDisplay) + '</span></div></td>' +
        '<td><span class="ah-score"><span class="ah-score-ring ' + level + '">' + scoreDisplay + '</span></span></td>' +
        '<td><span class="ah-status ' + level + '"><span class="ah-status-dot"></span>' + label + '</span></td>' +
        '<td>' + dateDisplay + '</td>' +
        '<td>' + renderActions(r) + '</td>' +
        '</tr>';

      cardsHtml += '<div class="ah-mobile-card ah-fade-in" ' + animDelay + '>' +
        '<div class="ah-mobile-card-top">' +
        '<span class="ah-mobile-card-site">' + ICONS.globe + ' ' + escapeHtml(siteDisplay) + '</span>' +
        '<span class="ah-score-ring ' + level + '">' + scoreDisplay + '</span>' +
        '</div>' +
        '<div class="ah-mobile-card-meta">' +
        '<span class="ah-status ' + level + '"><span class="ah-status-dot"></span>' + label + '</span>' +
        '<span>' + dateDisplay + '</span>' +
        '</div>' +
        '<div class="ah-mobile-card-bottom">' +
        '<div class="ah-mobile-card-actions">' +
        '<button class="ah-action-btn view" onclick="NAGRIVA_AuditHistory.viewReport(\'' + r.id + '\')" title="View Report">' + ICONS.eye + '</button>' +
        '<button class="ah-action-btn download" onclick="NAGRIVA_AuditHistory.downloadReport(\'' + r.id + '\')" title="Download PDF">' + ICONS.download + '</button>' +
        '<button class="ah-action-btn share" onclick="NAGRIVA_AuditHistory.shareReport(\'' + r.id + '\')" title="Share Report">' + ICONS.share + '</button>' +
        '<button class="ah-action-btn delete" onclick="NAGRIVA_AuditHistory.confirmDelete(\'' + r.id + '\')" title="Delete Report">' + ICONS.trash + '</button>' +
        '</div></div></div>';
    });

    tbody.innerHTML = rowsHtml;
    if (cards) cards.innerHTML = cardsHtml;

    renderPagination(paginated);
  }

  function renderActions(report) {
    return '<div class="ah-actions">' +
      '<button class="ah-action-btn view" onclick="NAGRIVA_AuditHistory.viewReport(\'' + report.id + '\')" title="View Report">' + ICONS.eye + '</button>' +
      '<button class="ah-action-btn download" onclick="NAGRIVA_AuditHistory.downloadReport(\'' + report.id + '\')" title="Download PDF">' + ICONS.download + '</button>' +
      '<button class="ah-action-btn share" onclick="NAGRIVA_AuditHistory.shareReport(\'' + report.id + '\')" title="Share Report">' + ICONS.share + '</button>' +
      '<button class="ah-action-btn delete" onclick="NAGRIVA_AuditHistory.confirmDelete(\'' + report.id + '\')" title="Delete Report">' + ICONS.trash + '</button>' +
      '</div>';
  }

  /* ─── Pagination ─── */
  function renderPagination(paginated) {
    var container = document.getElementById('ahPagination');
    if (!container) return;

    if (paginated.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    var html = '';
    var p = paginated.currentPage;
    var tp = paginated.totalPages;

    html += '<button class="ah-page-btn" onclick="NAGRIVA_AuditHistory.goToPage(' + (p - 1) + ')" ' + (p <= 1 ? 'disabled' : '') + '>&#8592;</button>';

    var startPage = Math.max(1, p - 2);
    var endPage = Math.min(tp, p + 2);

    if (startPage > 1) {
      html += '<button class="ah-page-btn" onclick="NAGRIVA_AuditHistory.goToPage(1)">1</button>';
      if (startPage > 2) html += '<span class="ah-page-info">...</span>';
    }

    for (var i = startPage; i <= endPage; i++) {
      html += '<button class="ah-page-btn' + (i === p ? ' active' : '') + '" onclick="NAGRIVA_AuditHistory.goToPage(' + i + ')">' + i + '</button>';
    }

    if (endPage < tp) {
      if (endPage < tp - 1) html += '<span class="ah-page-info">...</span>';
      html += '<button class="ah-page-btn" onclick="NAGRIVA_AuditHistory.goToPage(' + tp + ')">' + tp + '</button>';
    }

    html += '<button class="ah-page-btn" onclick="NAGRIVA_AuditHistory.goToPage(' + (p + 1) + ')" ' + (p >= tp ? 'disabled' : '') + '>&#8594;</button>';

    container.innerHTML = html;
  }

  /* ─── View Report Modal ─── */
  function viewReport(id) {
    var report = _displayReports.find(function (r) { return r.id === id; });
    if (!report) return;

    var overlay = document.getElementById('ahModalOverlay');
    var content = document.getElementById('ahModalContent');
    if (!overlay || !content) return;

    var level = getScoreLevel(report.audit_score);
    var label = getScoreLabel(report.audit_score);
    var score = report.audit_score != null ? report.audit_score : 'N/A';

    var circumference = 2 * Math.PI * 20;
    var offset = report.audit_score != null ? circumference - (report.audit_score / 100) * circumference : circumference;

    var insightsHtml = generateInsights(report);

    content.innerHTML =
      '<div class="ah-report-detail">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:4px;">' +
      '<div style="flex:1;">' +
      '<div style="font-size:0.75rem;color:var(--gray2);margin-bottom:4px;">Website URL</div>' +
      '<div style="font-size:0.9rem;font-weight:600;color:var(--white);word-break:break-all;">' + escapeHtml(report.website) + '</div>' +
      '</div>' +
      '<div class="ah-score-ring-svg">' +
      '<svg viewBox="0 0 48 48">' +
      '<circle class="bg" cx="24" cy="24" r="20"/>' +
      '<circle class="progress ' + level + '" cx="24" cy="24" r="20" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + circumference + '" style="stroke-dashoffset:' + offset + '"/>' +
      '</svg>' +
      '</div>' +
      '</div>' +
      '<div class="ah-detail-row">' +
      '<span class="ah-detail-label">Audit Date</span>' +
      '<span class="ah-detail-value">' + formatDateFull(report.created_at) + '</span>' +
      '</div>' +
      '<div class="ah-detail-row">' +
      '<span class="ah-detail-label">Overall Score</span>' +
      '<span class="ah-detail-value"><span class="ah-detail-score ' + level + '">' + score + '</span></span>' +
      '</div>' +
      '<div class="ah-detail-row">' +
      '<span class="ah-detail-label">Status</span>' +
      '<span class="ah-status ' + level + '"><span class="ah-status-dot"></span>' + label + '</span>' +
      '</div>' +
      (report.company ? '<div class="ah-detail-row"><span class="ah-detail-label">Company</span><span class="ah-detail-value">' + escapeHtml(report.company) + '</span></div>' : '') +
      '<div class="ah-detail-section">' +
      '<h4>' + ICONS.lightbulb + ' AI Insights</h4>' +
      '<div class="ah-insights-list">' + insightsHtml + '</div>' +
      '</div>' +
      '<div class="ah-detail-section">' +
      '<h4>' + ICONS.target + ' Recommendations Summary</h4>' +
      '<div class="ah-insights-list">' + generateRecommendations(report) + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-top:16px;">' +
      '<button class="ah-btn ah-btn-secondary ah-btn-sm" onclick="NAGRIVA_AuditHistory.downloadReport(\'' + report.id + '\')" style="flex:1;justify-content:center;">' + ICONS.download + ' Download PDF</button>' +
      '<button class="ah-btn ah-btn-primary ah-btn-sm" onclick="NAGRIVA_AuditHistory.shareReport(\'' + report.id + '\');NAGRIVA_AuditHistory.closeModal();" style="flex:1;justify-content:center;">' + ICONS.share + ' Share Report</button>' +
      '</div>' +
      '</div>';

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function generateInsights(report) {
    var score = report.audit_score;
    if (score == null) {
      return '<div class="ah-insight-item"><span class="ah-insight-icon neutral">' + ICONS['list'] + '</span>No AI insights available for this report.</div>';
    }

    var insights = [];
    if (score >= 80) {
      insights.push({ text: 'Your website performs exceptionally well with a strong overall score.', type: 'positive' });
      insights.push({ text: 'SEO fundamentals are solid — continue monitoring for opportunities.', type: 'positive' });
      insights.push({ text: 'Consider advanced optimizations to maintain your competitive edge.', type: 'neutral' });
    } else if (score >= 50) {
      insights.push({ text: 'Your website has a solid foundation with room for improvement.', type: 'neutral' });
      insights.push({ text: 'Focus on optimizing page speed and Core Web Vitals for better performance.', type: 'neutral' });
      insights.push({ text: 'Review SEO meta tags and content structure to boost rankings.', type: 'negative' });
    } else {
      insights.push({ text: 'Critical issues detected that require immediate attention.', type: 'negative' });
      insights.push({ text: 'Page speed and mobile responsiveness need significant improvement.', type: 'negative' });
      insights.push({ text: 'Consider a comprehensive SEO and performance audit for detailed fixes.', type: 'negative' });
    }

    return insights.map(function (ins) {
      return '<div class="ah-insight-item">' +
        '<span class="ah-insight-icon ' + ins.type + '">' +
        (ins.type === 'positive' ? ICONS['arrow-up'] : ins.type === 'negative' ? ICONS['arrow-down'] : ICONS['list']) +
        '</span>' + ins.text + '</div>';
    }).join('');
  }

  function generateRecommendations(report) {
    var score = report.audit_score;
    if (score == null) {
      return '<div class="ah-insight-item"><span class="ah-insight-icon neutral">' + ICONS['list'] + '</span>Review the full report PDF for detailed recommendations.</div>';
    }

    var recs = [];
    if (score >= 80) {
      recs.push({ text: 'Maintain your current SEO strategy with regular content updates.', type: 'positive' });
      recs.push({ text: 'Implement schema markup for rich snippets and enhanced SERP presence.', type: 'neutral' });
    } else if (score >= 50) {
      recs.push({ text: 'Improve page load times by optimizing images and leveraging browser caching.', type: 'neutral' });
      recs.push({ text: 'Enhance meta descriptions and title tags for better click-through rates.', type: 'neutral' });
      recs.push({ text: 'Build quality backlinks to improve domain authority and search rankings.', type: 'negative' });
    } else {
      recs.push({ text: 'Upgrade hosting and implement a CDN for faster global page delivery.', type: 'negative' });
      recs.push({ text: 'Redesign mobile experience — ensure responsive design and touch-friendly navigation.', type: 'negative' });
      recs.push({ text: 'Conduct keyword research and rebuild on-page SEO from the ground up.', type: 'negative' });
    }

    return recs.map(function (rec) {
      return '<div class="ah-insight-item">' +
        '<span class="ah-insight-icon ' + rec.type + '">' +
        (rec.type === 'positive' ? ICONS['check-circle'] : rec.type === 'negative' ? ICONS['target'] : ICONS['list']) +
        '</span>' + rec.text + '</div>';
    }).join('');
  }

  /* ─── Close Modal ─── */
  function closeModal() {
    var overlay = document.getElementById('ahModalOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  /* ─── Download Report ─── */
  async function downloadReport(id) {
    var report = _allReports.find(function (r) { return r.id === id; });
    if (!report || !report.report_url) {
      if (typeof NAGRIVA_Toast !== 'undefined') {
        NAGRIVA_Toast.error('Download Error', 'No report file available for download.');
      }
      return;
    }

    try {
      _currentReportForExport = report;
      var url = await getSignedUrl(report.report_url);
      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = report.report_url.split('/').pop() || 'audit-report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('[AuditHistory] Download error:', err);
      if (typeof NAGRIVA_Toast !== 'undefined') {
        NAGRIVA_Toast.error('Download Failed', 'Could not download the report. Please try again.');
      }
    }
  }

  /* ─── Share Report ─── */
  function shareReport(id) {
    var report = _allReports.find(function (r) { return r.id === id; });
    if (!report) {
      if (typeof NAGRIVA_Toast !== 'undefined') {
        NAGRIVA_Toast.error('Share Error', 'Report not found.');
      }
      return;
    }
    _currentReportForExport = report;
    if (window.NAGRIVA_ReportShare) {
      NAGRIVA_ReportShare.openShareModal(report);
    } else {
      console.warn('[AuditHistory] ReportShare module not loaded');
    }
  }

  var _currentReportForExport = null;

  function getCurrentReport() {
    if (_currentReportForExport) return _currentReportForExport;
    if (_displayReports.length > 0) return _displayReports[0];
    return null;
  }

  function initExportDropdown() {
    if (window.NAGRIVA_ReportShare && typeof NAGRIVA_ReportShare.initExportDropdown === 'function') {
      NAGRIVA_ReportShare.initExportDropdown('ahExportTrigger', 'ahExportMenu', getCurrentReport);
    }
  }

  /* ─── Delete Report ─── */
  function confirmDelete(id) {
    _deleteTarget = id;
    var overlay = document.getElementById('ahDeleteOverlay');
    if (overlay) overlay.classList.add('active');
  }

  function cancelDelete() {
    _deleteTarget = null;
    var overlay = document.getElementById('ahDeleteOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  async function executeDelete() {
    if (!_deleteTarget) return;

    try {
      await deleteReport(_deleteTarget);

      if (typeof NAGRIVA_Toast !== 'undefined') {
        NAGRIVA_Toast.success('Report Deleted', 'The audit report has been permanently deleted.');
      }

      cancelDelete();
      await loadAndRender();

    } catch (err) {
      console.error('[AuditHistory] Delete error:', err);
      if (typeof NAGRIVA_Toast !== 'undefined') {
        NAGRIVA_Toast.error('Delete Failed', err.message || 'Could not delete the report.');
      }
      cancelDelete();
    }
  }

  /* ─── Navigation ─── */
  function goToPage(page) {
    var paginated = getPaginated();
    if (page < 1 || page > paginated.totalPages) return;
    _currentPage = page;
    var newPaginated = getPaginated();
    renderTable(newPaginated);
    qs('.ah-table-container') && qs('.ah-table-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ─── Load & Render ─── */
  async function loadAndRender() {
    try {
      var reports = await fetchReports();
      _allReports = processReports(reports);
      applyFilters();
      var stats = computeStats(_allReports);
      renderStats(stats);
      var paginated = getPaginated();
      renderTable(paginated);
    } catch (err) {
      console.error('[AuditHistory] Load error:', err);
      showError(err.message || 'Failed to load audit reports.');
    }
  }

  /* ─── Error State ─── */
  function showError(message) {
    var container = document.getElementById('ahStats');
    if (container) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;border:1px solid rgba(239,68,68,0.15);border-radius:16px;background:rgba(239,68,68,0.015);">' +
        '<div style="font-size:0.9rem;color:#ef4444;margin-bottom:8px;font-weight:600;">Failed to Load Data</div>' +
        '<div style="font-size:0.8rem;color:var(--gray2);margin-bottom:16px;">' + escapeHtml(message) + '</div>' +
        '<button class="ah-btn ah-btn-secondary" onclick="NAGRIVA_AuditHistory.retry()">Retry</button></div>';
    }
  }

  async function retry() {
    showSkeletons();
    await loadAndRender();
  }

  /* ─── Skeletons ─── */
  function showSkeletons() {
    var statsEl = document.getElementById('ahStats');
    if (statsEl) {
      var html = '';
      for (var i = 0; i < 4; i++) {
        html += '<div class="ah-stat-skel"><div class="ah-stat-skel-icon"></div><div class="ah-stat-skel-value"></div><div class="ah-stat-skel-label"></div><div class="ah-stat-skel-change"></div></div>';
      }
      statsEl.innerHTML = html;
    }

    var tbody = document.getElementById('ahTableBody');
    if (tbody) {
      var rowsHtml = '';
      for (var j = 0; j < 6; j++) {
        rowsHtml += '<tr class="ah-skel-row"><td><div class="ah-skel-row-line w60"></div></td><td><div class="ah-skel-row-line w30"></div></td><td><div class="ah-skel-row-line w30"></div></td><td><div class="ah-skel-row-line w30"></div></td><td><div class="ah-skel-row-line w20"></div></td></tr>';
      }
      tbody.innerHTML = rowsHtml;
    }

    var cards = document.getElementById('ahCards');
    if (cards) cards.innerHTML = '';
    var pagination = document.getElementById('ahPagination');
    if (pagination) pagination.innerHTML = '';
    var empty = document.getElementById('ahEmpty');
    if (empty) empty.style.display = 'none';
  }

  /* ─── Event Handlers ─── */
  function setupEventListeners() {
    var searchInput = document.getElementById('ahSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        _filters.search = this.value;
        applyFilters();
        var paginated = getPaginated();
        renderTable(paginated);
      });
    }

    var filterSelect = document.getElementById('ahFilterSelect');
    if (filterSelect) {
      filterSelect.addEventListener('change', function () {
        _filters.period = this.value;
        applyFilters();
        var paginated = getPaginated();
        renderTable(paginated);
      });
    }

    var sortSelect = document.getElementById('ahSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        _filters.sort = this.value;
        applyFilters();
        var paginated = getPaginated();
        renderTable(paginated);
      });
    }

    // Modal close
    var modalClose = document.getElementById('ahModalClose');
    if (modalClose) modalClose.addEventListener('click', closeModal);

    var modalOverlay = document.getElementById('ahModalOverlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', function (e) {
        if (e.target === this) closeModal();
      });
    }

    // Delete modal
    var deleteCancel = document.getElementById('ahDeleteCancel');
    if (deleteCancel) deleteCancel.addEventListener('click', cancelDelete);

    var deleteConfirm = document.getElementById('ahDeleteConfirm');
    if (deleteConfirm) deleteConfirm.addEventListener('click', executeDelete);

    var deleteOverlay = document.getElementById('ahDeleteOverlay');
    if (deleteOverlay) {
      deleteOverlay.addEventListener('click', function (e) {
        if (e.target === this) cancelDelete();
      });
    }

    // Keyboard: Escape to close modals
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeModal();
        cancelDelete();
      }
    });
  }

  /* ─── Init ─── */
  async function init() {
    showSkeletons();

    try {
      var { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();
      if (sessionError || !session) {
        showError('Please sign in to view your audit history.');
        return;
      }

      _user = session.user;

      // Check if admin
      try {
        var { data: profile } = await window.supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', _user.id)
          .single();
        _isAdmin = profile && profile.role === 'admin';
      } catch (e) {
        _isAdmin = false;
      }

      setupEventListeners();
      initExportDropdown();
      await loadAndRender();

    } catch (err) {
      console.error('[AuditHistory] Init error:', err);
      showError(err.message || 'Failed to initialize dashboard.');
    }
  }

  /* ─── Destroy (cleanup) ─── */
  function destroy() {
    _user = null;
    _allReports = [];
    _displayReports = [];
    _currentPage = 1;
    _deleteTarget = null;
    _filters = { search: '', period: 'all', sort: 'newest' };
    _isAdmin = false;
  }

  /* ─── Public API ─── */
  return {
    init: init,
    destroy: destroy,
    retry: retry,
    viewReport: viewReport,
    closeModal: closeModal,
    downloadReport: downloadReport,
    shareReport: shareReport,
    getCurrentReport: getCurrentReport,
    confirmDelete: confirmDelete,
    cancelDelete: cancelDelete,
    executeDelete: executeDelete,
    goToPage: goToPage
  };
})();
