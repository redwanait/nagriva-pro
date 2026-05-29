(function () {
  'use strict';

  var NAGRIVA_Lazy = window.NAGRIVA_Lazy = window.NAGRIVA_Lazy || {};
  var loadedScripts = {};

  function observe(el, options, callback) {
    if (!el || typeof callback !== 'function') return;
    var once = options && options.once !== false;
    if (once && el.dataset.lazyLoaded === 'true') { callback(el); return; }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          callback(el);
          if (once) { el.dataset.lazyLoaded = 'true'; obs.unobserve(el); }
        }
      });
    }, { threshold: (options && options.threshold) || 0.1, rootMargin: (options && options.rootMargin) || '0px' });
    obs.observe(el);
    return obs;
  }

  function lazyClass(el, className, options) {
    return observe(el, options || {}, function () { el.classList.add(className || 'lazy-visible'); });
  }

  function lazyBackground(el) {
    var bgUrl = el.dataset.bg || el.dataset.background || el.dataset.src;
    if (!bgUrl) return;
    observe(el, { threshold: 0.01, once: true }, function () {
      el.style.backgroundImage = 'url(' + bgUrl + ')';
      el.classList.add('lazy-bg-loaded');
    });
  }

  function lazyScript(src, options) {
    return new Promise(function (resolve, reject) {
      if (loadedScripts[src]) { resolve(loadedScripts[src]); return; }
      var opts = options || {};
      function load() {
        var s = document.createElement('script');
        s.src = src;
        if (opts.id) s.id = opts.id;
        s.async = true;
        s.onload = function () { loadedScripts[src] = true; resolve(true); };
        s.onerror = function () { reject(new Error('Failed to load ' + src)); };
        document.body.appendChild(s);
      }
      if (opts.delay > 0) { setTimeout(load, opts.delay); }
      else if (opts.idleCallback && window.requestIdleCallback) { requestIdleCallback(load, { timeout: opts.idleTimeout || 3000 }); }
      else { load(); }
    });
  }

  function lazyStylesheet(href) {
    if (document.querySelector('link[href="' + href + '"]')) return Promise.resolve();
    return new Promise(function (resolve) {
      var link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = href; link.media = 'print';
      link.onload = function () { link.media = 'all'; resolve(true); };
      link.onerror = function () { resolve(false); };
      document.head.appendChild(link);
    });
  }

  function defer(fn, delay) {
    if (delay > 0) { setTimeout(fn, delay); }
    else if (window.requestIdleCallback) { requestIdleCallback(fn, { timeout: 2000 }); }
    else { setTimeout(fn, 1); }
  }

  function initContainer(container) {
    container = container || document;
    container.querySelectorAll('[data-lazy-bg]').forEach(lazyBackground);
    container.querySelectorAll('[data-lazy-observe]').forEach(function (el) {
      lazyClass(el, el.dataset.lazyClass || 'lazy-visible');
    });
  }

  function autoInit() {
    initContainer(document);
    document.querySelectorAll('[data-lazy-script]').forEach(function (el) {
      lazyScript(el.dataset.lazyScript, { delay: parseInt(el.dataset.lazyDelay, 10) || 0, idleCallback: true });
    });
  }

  /* Defer autoInit to avoid blocking main thread at DOMContentLoaded */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { requestIdleCallback(autoInit, { timeout: 2000 }); });
  } else {
    requestIdleCallback(autoInit, { timeout: 2000 });
  }

  NAGRIVA_Lazy.observe = observe;
  NAGRIVA_Lazy.lazyClass = lazyClass;
  NAGRIVA_Lazy.lazyBackground = lazyBackground;
  NAGRIVA_Lazy.lazyScript = lazyScript;
  NAGRIVA_Lazy.lazyStylesheet = lazyStylesheet;
  NAGRIVA_Lazy.defer = defer;
  NAGRIVA_Lazy.initContainer = initContainer;
})();
