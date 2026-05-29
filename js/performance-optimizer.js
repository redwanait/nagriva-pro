(function () {
  'use strict';

  var NagrivaPerf = window.NagrivaPerf = window.NagrivaPerf || {};

  /* ─── Deferrable scripts with increased delays ─── */
  var DEFERRABLE_SCRIPTS = [
    { src: '/js/chatbot.js', delay: 5000, idle: true },
    { src: '/js/floating-elements.js', delay: 4000, idle: true },
    { src: '/js/footer.js', delay: 2000, idle: true },
    { src: '/js/navbar.js', delay: 0 },
    { src: '/js/profile-avatar.js', delay: 3000, idle: true },
    { src: '/js/content-loader.js', delay: 2000, idle: true },
    { src: '/modules/notifications/notifications-api.js', delay: 4000, idle: true },
    { src: '/modules/notifications/notifications-realtime.js', delay: 5000, idle: true },
    { src: '/modules/notifications/notifications-triggers.js', delay: 5000, idle: true },
    { src: '/components/notifications-dropdown/notifications-dropdown.js', delay: 5000, idle: true },
    { src: '/modules/content/content-api.js', delay: 2000, idle: true },
    { src: '/modules/blog/blog-api.js', delay: 3000, idle: true }
  ];

  var loaded = {};

  function loadScript(src, async) {
    return new Promise(function (resolve, reject) {
      if (loaded[src]) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src;
      if (async !== false) s.async = true;
      s.onload = function () { loaded[src] = true; resolve(); };
      s.onerror = function () { reject(); };
      document.body.appendChild(s);
    });
  }

  function loadDeferred(entry) {
    var fn = function () { loadScript(entry.src, true); };
    if (entry.delay > 0 && entry.idle && window.requestIdleCallback) {
      requestIdleCallback(fn, { timeout: entry.delay + 3000 });
    } else if (entry.delay > 0) {
      setTimeout(fn, entry.delay);
    } else {
      setTimeout(fn, 1);
    }
  }

  function loadDeferredScripts() {
    DEFERRABLE_SCRIPTS.forEach(loadDeferred);
  }

  function loadAdminScripts() {
    var adminScripts = [
      { src: '/js/admin-dashboard.js', delay: 1000, idle: true },
      { src: '/js/admin-activity.js', delay: 2000, idle: true },
      { src: '/js/admin-auth.js', delay: 500, idle: true },
      { src: '/js/admin-clients.js', delay: 2000, idle: true },
      { src: '/js/admin-modal.js', delay: 1000, idle: true },
      { src: '/js/admin-navbar.js', delay: 500, idle: true },
      { src: '/js/admin-orders.js', delay: 1000, idle: true },
      { src: '/js/admin-services.js', delay: 2000, idle: true },
      { src: '/js/admin-notifications.js', delay: 3000, idle: true },
      { src: '/js/admin-messages.js', delay: 2000, idle: true },
      { src: '/js/admin-files.js', delay: 3000, idle: true },
      { src: '/js/admin-payments.js', delay: 3000, idle: true },
      { src: '/js/admin-invoices.js', delay: 3000, idle: true },
      { src: '/js/admin-settings.js', delay: 3000, idle: true },
      { src: '/js/auth-guard.js', delay: 500, idle: true },
      { src: '/js/orders.js', delay: 2000, idle: true }
    ];
    adminScripts.forEach(loadDeferred);
  }

  function detectPageType() {
    var path = window.location.pathname;
    var dp = document.body && document.body.getAttribute('data-page');
    if (path.includes('/pages/admin-dashboard') || dp === 'admin-dashboard') return 'admin';
    if (path.includes('/pages/dashboard') || dp === 'dashboard') return 'dashboard';
    if (path.includes('/pages/blog') || dp === 'blog') return 'blog';
    if (path.includes('/pages/pricing') || dp === 'pricing') return 'pricing';
    return 'public';
  }

  function init() {
    var pageType = detectPageType();
    if (pageType === 'admin') {
      loadAdminScripts();
    } else {
      loadDeferredScripts();
    }
    if (pageType === 'blog') {
      setTimeout(function () { loadScript('/modules/blog/blog-api.js', true); }, 2000);
    }
  }

  function addPageOptimizations() {
    var pageType = detectPageType();
    var rules = '';
    if (pageType === 'blog') {
      rules += '.blog-sidebar{content-visibility:auto;contain-intrinsic-size:600px}.blog-cta{content-visibility:auto;contain-intrinsic-size:400px}';
    }
    if (pageType === 'pricing') {
      rules += '.np-compare{content-visibility:auto;contain-intrinsic-size:500px}.np-faq{content-visibility:auto;contain-intrinsic-size:500px}.np-cta{content-visibility:auto;contain-intrinsic-size:300px}';
    }
    if (pageType === 'admin') {
      rules += '.page{content-visibility:auto;contain-intrinsic-size:600px}.stats-grid{content-visibility:auto;contain-intrinsic-size:200px}';
    }
    if (pageType === 'public') {
      rules += '.results{content-visibility:auto;contain-intrinsic-size:400px}.why-section{content-visibility:auto;contain-intrinsic-size:500px}#projects{content-visibility:auto;contain-intrinsic-size:800px}#faq{content-visibility:auto;contain-intrinsic-size:900px}.cta-section{content-visibility:auto;contain-intrinsic-size:600px}';
    }
    if (rules) {
      var style = document.createElement('style');
      style.textContent = rules;
      document.head.appendChild(style);
    }
  }

  function trackLCP() {
    try {
      var observer = new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        window.__NAGRIVA_LCP = entries[entries.length - 1];
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}
  }

  /* ─── Defer non-critical work to idle callbacks ─── */
  function deferredInit() {
    addPageOptimizations();
    trackLCP();
  }

  /* ─── Start: load deferred scripts after `load` event ─── */
  if (document.readyState === 'complete') {
    requestIdleCallback(deferredInit, { timeout: 1000 });
    requestIdleCallback(init, { timeout: 3000 });
  } else {
    window.addEventListener('load', function () {
      requestIdleCallback(deferredInit, { timeout: 1000 });
      requestIdleCallback(init, { timeout: 3000 });
    });
  }

  NagrivaPerf.loadDeferredScripts = loadDeferredScripts;
  NagrivaPerf.loadAdminScripts = loadAdminScripts;
  NagrivaPerf.loadScript = loadScript;
  NagrivaPerf.detectPageType = detectPageType;
  NagrivaPerf.DEFERRABLE_SCRIPTS = DEFERRABLE_SCRIPTS;
})();
