/* ════════════════════════════════════════════════════════
   NAGRIVA — Empty States
   Standardized empty state messages for missing data
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_EmptyStates = (function () {
  'use strict';

  var STATES = {
    auditHistory: {
      icon: 'history',
      title: 'No audits found',
      message: 'Generate your first audit to see it here.',
      action: 'Run an Audit'
    },
    reports: {
      icon: 'report',
      title: 'No reports available',
      message: 'Your generated reports will appear here.',
      action: null
    },
    competitorComparison: {
      icon: 'competitor',
      title: 'No competitors added',
      message: 'Add a competitor to start comparing.',
      action: 'Add Competitor'
    },
    recommendations: {
      icon: 'check',
      title: 'No Issues Found',
      message: 'Your website passes all checks in this category.',
      action: null
    },
    insights: {
      icon: 'insights',
      title: 'No insights available',
      message: 'Run an audit to generate AI-powered insights.',
      action: 'Run an Audit'
    },
    search: {
      icon: 'search',
      title: 'No results found',
      message: 'Try adjusting your search terms.',
      action: null
    },
    shareHistory: {
      icon: 'share',
      title: 'No shared reports',
      message: 'Share a report to track it here.',
      action: null
    },
    generic: {
      icon: 'empty',
      title: 'Nothing here yet',
      message: 'Content will appear once available.',
      action: null
    }
  };

  var ICONS = {
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    competitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    insights: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
    empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
  };

  function render(stateKey, containerId, actionFn) {
    var state = STATES[stateKey] || STATES.generic;
    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    var iconHtml = ICONS[state.icon] || ICONS.empty;
    var actionHtml = '';
    if (state.action && actionFn) {
      actionHtml = '<button class="es-btn" data-action="empty-state">' +
        state.action +
        '</button>';
    }

    container.innerHTML =
      '<div class="es-root">' +
        '<div class="es-icon">' + iconHtml + '</div>' +
        '<h3 class="es-title">' + state.title + '</h3>' +
        '<p class="es-message">' + state.message + '</p>' +
        (actionHtml ? '<div class="es-actions">' + actionHtml + '</div>' : '') +
      '</div>';

    if (actionFn) {
      var btn = container.querySelector('[data-action="empty-state"]');
      if (btn) btn.addEventListener('click', actionFn);
    }
  }

  function renderInline(containerId, title, message, actionLabel, actionFn) {
    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    var actionHtml = '';
    if (actionLabel && actionFn) {
      actionHtml = '<button class="es-btn" data-action="empty-state">' + actionLabel + '</button>';
    }

    container.innerHTML =
      '<div class="es-root">' +
        '<div class="es-icon">' + ICONS.empty + '</div>' +
        '<h3 class="es-title">' + title + '</h3>' +
        '<p class="es-message">' + message + '</p>' +
        (actionHtml ? '<div class="es-actions">' + actionHtml + '</div>' : '') +
      '</div>';

    if (actionFn) {
      var btn = container.querySelector('[data-action="empty-state"]');
      if (btn) btn.addEventListener('click', actionFn);
    }
  }

  return {
    render: render,
    renderInline: renderInline,
    STATES: STATES
  };
})();
