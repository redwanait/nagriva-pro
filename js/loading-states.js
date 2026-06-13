/* ════════════════════════════════════════════════════════
   NAGRIVA — Loading States
   Standardized loading indicators with messages
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_LoadingStates = (function () {
  'use strict';

  var TEMPLATES = {
    audit: {
      messages: [
        'Analyzing website structure...',
        'Checking SEO signals...',
        'Reviewing mobile experience...',
        'Scanning performance metrics...',
        'Generating recommendations...',
        'Preparing final report...'
      ],
      icon: 'audit'
    },
    competitor: {
      messages: [
        'Fetching competitor data...',
        'Analyzing competitor SEO...',
        'Comparing performance metrics...',
        'Generating gap analysis...',
        'Preparing comparison report...'
      ],
      icon: 'competitor'
    },
    pdf: {
      messages: [
        'Preparing PDF report...',
        'Formatting audit data...',
        'Generating charts...',
        'Finalizing document...'
      ],
      icon: 'pdf'
    },
    share: {
      messages: [
        'Creating share link...',
        'Generating QR code...',
        'Preparing report...'
      ],
      icon: 'share'
    },
    insights: {
      messages: [
        'Generating AI Insights...',
        'Analyzing your data...',
        'Creating recommendations...'
      ],
      icon: 'insights'
    },
    upload: {
      messages: [
        'Saving report...',
        'Uploading to cloud...',
        'Finalizing...'
      ],
      icon: 'upload'
    }
  };

  var ICONS = {
    audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    competitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
    insights: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    spinner: '<div class="ls-spinner"><div class="ls-ring"></div><div class="ls-ring"></div><div class="ls-ring"></div></div>'
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function createLoadingHTML(type, url, template) {
    if (!template) template = TEMPLATES.audit;
    var iconHtml = ICONS[type] || ICONS.audit;
    var spinnerHtml = ICONS.spinner;

    var msgsHtml = template.messages.map(function (msg, i) {
      var active = i === 0 ? ' active' : '';
      return '<div class="ls-msg' + active + '" data-idx="' + i + '">' + escapeHtml(msg) + '</div>';
    }).join('');

    var urlHtml = '';
    if (url) {
      var displayUrl = url.replace(/^https?:\/\//, '').split('/')[0];
      urlHtml = '<div class="ls-url">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        '<span>' + escapeHtml(displayUrl) + '</span>' +
        '</div>';
    }

    return '<div class="ls-overlay">' +
      '<div class="ls-card">' +
        '<div class="ls-header">' +
          iconHtml +
          '<span>' + escapeHtml(template.title || 'Loading...') + '</span>' +
        '</div>' +
        spinnerHtml +
        urlHtml +
        '<div class="ls-messages">' + msgsHtml + '</div>' +
        '<div class="ls-bar">' +
          '<div class="ls-bar-track">' +
            '<div class="ls-bar-fill" data-bar></div>' +
          '</div>' +
          '<div class="ls-bar-pct" data-pct>0%</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function show(containerId, type, url) {
    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return null;
    type = type || 'audit';
    var template = TEMPLATES[type] || TEMPLATES.audit;
    template.title = type === 'audit' ? 'Analyzing Website...' :
      type === 'competitor' ? 'Comparing Websites...' :
      type === 'pdf' ? 'Generating PDF...' :
      type === 'share' ? 'Preparing Share Link...' :
      type === 'insights' ? 'Generating AI Insights...' :
      type === 'upload' ? 'Saving Report...' : 'Loading...';

    var html = createLoadingHTML(type, url, template);
    container.innerHTML = html;
    container.style.display = 'block';

    var msgs = container.querySelectorAll('.ls-msg');
    var msgIdx = 0;
    var barFill = container.querySelector('[data-bar]');
    var barPct = container.querySelector('[data-pct]');
    var progress = 0;
    var completed = false;

    var msgInterval = setInterval(function () {
      if (completed) return;
      msgs.forEach(function (m) { m.classList.remove('active'); });
      msgIdx = (msgIdx + 1) % msgs.length;
      if (msgs[msgIdx]) msgs[msgIdx].classList.add('active');
    }, 1300);

    var progressInterval = setInterval(function () {
      if (completed) return;
      progress += Math.random() * 7 + 2;
      if (progress >= 100) {
        progress = 100;
        completed = true;
        clearInterval(msgInterval);
        clearInterval(progressInterval);
      }
      if (barFill) barFill.style.width = Math.min(progress, 100) + '%';
      if (barPct) barPct.textContent = Math.min(Math.round(progress), 100) + '%';
    }, 200);

    return {
      container: container,
      complete: function () {
        completed = true;
        clearInterval(msgInterval);
        clearInterval(progressInterval);
        if (barFill) barFill.style.width = '100%';
        if (barPct) barPct.textContent = '100%';
      },
      hide: function () {
        completed = true;
        clearInterval(msgInterval);
        clearInterval(progressInterval);
        container.style.display = 'none';
        container.innerHTML = '';
      }
    };
  }

  function hide(containerId) {
    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;
    container.style.display = 'none';
    container.innerHTML = '';
  }

  return {
    show: show,
    hide: hide,
    TEMPLATES: TEMPLATES
  };
})();
