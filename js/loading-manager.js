/* ════════════════════════════════════════════════════════
   NAGRIVA — Global Loading State Manager (loading-manager.js)
   Unified skeleton injection, fade transitions, error recovery.
   Prevents flash of empty content and layout shift.
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_Loading = (function () {
  'use strict';

  var DEFAULT_FADE_MS = 300;

  function getEl(id) {
    var el = typeof id === 'string' ? document.getElementById(id) : id;
    return el;
  }

  /* ─── Inject skeleton into container ─── */
  function show(containerId, skeletonHtml) {
    var el = getEl(containerId);
    if (!el) return;
    el.innerHTML = skeletonHtml;
  }

  /* ─── Replace skeleton with real content ─── */
  function hide(containerId, contentHtml) {
    var el = getEl(containerId);
    if (!el) return;
    el.innerHTML = contentHtml;
  }

  /* ─── Show error state ─── */
  function showError(containerId, title, message, retryFn) {
    var el = getEl(containerId);
    if (!el) return;
    var icon = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    var retryHtml = retryFn
      ? '<button class="ne-btn ne-btn-primary" onclick="(' + retryFn + ')()">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>' +
        ' Retry</button>'
      : '';
    el.innerHTML = '<div class="ne ne-error">' +
      '<div class="ne-icon">' + icon + '</div>' +
      '<h3 class="ne-title">' + (title || 'Unable to load') + '</h3>' +
      '<p class="ne-desc">' + (message || 'Something went wrong. Please try again.') + '</p>' +
      (retryHtml ? '<div class="ne-actions">' + retryHtml + '</div>' : '') +
      '</div>';
  }

  /* ─── Convenience: show skeleton, fetch data, show content ───
       skeletonFn: function that returns skeleton HTML string
       fetchFn: function that returns Promise resolving to content HTML
       options: { minDisplayMs, errorTitle, errorMsg, errorRetry }
  */
  function wrapLoad(containerId, skeletonFn, fetchFn, options) {
    options = options || {};
    var minDisplay = options.minDisplayMs || 300;
    var startTime = performance.now();

    show(containerId, typeof skeletonFn === 'function' ? skeletonFn() : skeletonFn);

    return fetchFn().then(function (contentHtml) {
      var elapsed = performance.now() - startTime;
      var remaining = Math.max(0, minDisplay - elapsed);
      return new Promise(function (resolve) {
        setTimeout(function () {
          hide(containerId, contentHtml);
          resolve(contentHtml);
        }, remaining);
      });
    }).catch(function (err) {
      console.warn('[LoadingManager] wrapLoad error:', err);
      var remaining = Math.max(0, minDisplay - (performance.now() - startTime));
      return new Promise(function (resolve) {
        setTimeout(function () {
          showError(containerId, options.errorTitle, options.errorMsg || err.message, options.errorRetry);
          resolve(null);
        }, remaining);
      });
    });
  }

  /* ─── Direct skeleton injection without fade wrapper ─── */
  function inject(containerId, skeletonHtml) {
    var el = getEl(containerId);
    if (!el) return;
    el.innerHTML = skeletonHtml;
  }

  /* ─── Remove skeleton / clear container ─── */
  function clear(containerId) {
    var el = getEl(containerId);
    if (!el) return;
    el.innerHTML = '';
  }

  return {
    show: show,
    hide: hide,
    showError: showError,
    wrapLoad: wrapLoad,
    inject: inject,
    clear: clear
  };
})();
