/* ════════════════════════════════════════════════════════
   NAGRIVA — Reusable UI Alert Components
   Success · Warning · Error · Info alerts with dark theme
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_Alerts = (function () {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  var ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  var container = null;

  function ensureContainer() {
    if (container && container.parentNode) return container;
    container = document.getElementById('alertsContainer');
    if (container) return container;
    container = document.createElement('div');
    container.id = 'alertsContainer';
    container.className = 'alerts-container';
    document.body.appendChild(container);
    return container;
  }

  function show(type, title, message, options) {
    options = options || {};
    var c = ensureContainer();

    var alertEl = document.createElement('div');
    alertEl.className = 'alert alert--' + type;
    alertEl.setAttribute('role', 'alert');

    var iconHtml = ICONS[type] || ICONS.info;

    var retryHtml = '';
    if (options.retry && typeof options.retry === 'function') {
      retryHtml = '<button class="alert-btn alert-btn--retry" data-action="retry">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>' +
        ' Retry</button>';
    }

    var dismissHtml = '<button class="alert-btn alert-btn--dismiss" data-action="dismiss">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>';

    alertEl.innerHTML =
      '<div class="alert-inner">' +
        '<div class="alert-icon">' + iconHtml + '</div>' +
        '<div class="alert-content">' +
          '<div class="alert-title">' + escapeHtml(title) + '</div>' +
          '<div class="alert-message">' + escapeHtml(message) + '</div>' +
        '</div>' +
        '<div class="alert-actions">' +
          retryHtml +
          dismissHtml +
        '</div>' +
      '</div>';

    c.appendChild(alertEl);

    requestAnimationFrame(function () {
      alertEl.classList.add('alert--visible');
    });

    var dismissBtn = alertEl.querySelector('[data-action="dismiss"]');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function () {
        dismiss(alertEl);
      });
    }

    var retryBtn = alertEl.querySelector('[data-action="retry"]');
    if (retryBtn && options.retry) {
      retryBtn.addEventListener('click', function () {
        dismiss(alertEl);
        if (typeof options.retry === 'function') {
          options.retry();
        }
      });
    }

    if (options.autoClose !== false) {
      var duration = options.duration || (type === 'error' ? 8000 : type === 'warning' ? 6000 : 4000);
      setTimeout(function () {
        dismiss(alertEl);
      }, duration);
    }

    return alertEl;
  }

  function dismiss(alertEl) {
    if (!alertEl || alertEl._dismissed) return;
    alertEl._dismissed = true;
    alertEl.classList.remove('alert--visible');
    alertEl.classList.add('alert--hiding');
    setTimeout(function () {
      if (alertEl.parentNode) {
        alertEl.parentNode.removeChild(alertEl);
      }
    }, 300);
  }

  function dismissAll() {
    var c = ensureContainer();
    var alerts = c.querySelectorAll('.alert');
    alerts.forEach(function (el) {
      dismiss(el);
    });
  }

  function showInline(containerId, type, title, message, options) {
    options = options || {};
    var el = document.getElementById(containerId);
    if (!el) return null;

    var iconHtml = ICONS[type] || ICONS.info;
    var retryHtml = '';
    if (options.retry && typeof options.retry === 'function') {
      retryHtml = '<button class="alert-btn alert-btn--retry" data-action="retry">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>' +
        ' Retry</button>';
    }

    el.innerHTML =
      '<div class="alert alert--' + type + ' alert--visible alert--inline" role="alert">' +
        '<div class="alert-inner">' +
          '<div class="alert-icon">' + iconHtml + '</div>' +
          '<div class="alert-content">' +
            '<div class="alert-title">' + escapeHtml(title) + '</div>' +
            '<div class="alert-message">' + escapeHtml(message) + '</div>' +
          '</div>' +
          '<div class="alert-actions">' +
            retryHtml +
          '</div>' +
        '</div>' +
      '</div>';

    var retryBtn = el.querySelector('[data-action="retry"]');
    if (retryBtn && options.retry) {
      retryBtn.addEventListener('click', function () {
        el.innerHTML = '';
        if (typeof options.retry === 'function') {
          options.retry();
        }
      });
    }

    return el;
  }

  function clearInline(containerId) {
    var el = document.getElementById(containerId);
    if (el) el.innerHTML = '';
  }

  return {
    show: show,
    success: function (title, msg, opts) { return show('success', title, msg, opts); },
    error: function (title, msg, opts) { return show('error', title, msg, opts); },
    warning: function (title, msg, opts) { return show('warning', title, msg, opts); },
    info: function (title, msg, opts) { return show('info', title, msg, opts); },
    dismiss: dismiss,
    dismissAll: dismissAll,
    showInline: showInline,
    clearInline: clearInline
  };
})();
