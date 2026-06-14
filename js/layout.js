/* ════════════════════════════════════════════════════════
   Nagriva — Unified Layout Loader
   Loads navbar, footer, CTA, and cookie consent components
   ════════════════════════════════════════════════════════ */
;(function () {
  'use strict'

  var COMPONENTS = [
    { id: 'navbar-container', url: '/components/navbar.html', afterLoad: processNavbar },
    { id: 'footer-container', url: '/components/footer.html', afterLoad: processFooter },
    { id: 'cta-container',     url: '/components/cta.html' },
    { id: 'cookie-consent-container', url: '/components/cookie-consent.html', afterLoad: processCookieConsent },
  ]

  /* ─── Active link map (from navbar.js) ─── */
  var PAGE_MAP = {
    home:     '/',
    services: '/pages/services.html',
    results:  '/pages/results.html',
    pricing:  '/pages/pricing.html',
    about:    '/pages/about.html',
    careers:  '/pages/careers.html',
    blog:     '/pages/blog.html',
    contact:  '/pages/contact.html',
    'onboarding-qa': '/pages/onboarding-qa.html',
    'website-audit': '/website-audit'
  }

  function fetchComponent (entry) {
    var container = document.getElementById(entry.id)
    if (!container) return Promise.resolve()

    return fetch(entry.url)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.text()
      })
      .then(function (html) {
        container.innerHTML = html
        if (typeof entry.afterLoad === 'function') {
          entry.afterLoad(container)
        }
      })
      .catch(function (err) {
        console.error('[Nagriva] Failed to load ' + entry.url, err)
      })
  }

  /* ─── Navbar post-processing ─── */
  function processNavbar (container) {
    var page = document.body.getAttribute('data-page')
    if (page) {
      container.querySelectorAll('.nav-link[data-page]').forEach(function (link) {
        if (link.getAttribute('data-page') === page) link.classList.add('active')
      })
      container.querySelectorAll('.mobile-menu-link[data-page]').forEach(function (link) {
        if (link.getAttribute('data-page') === page) link.classList.add('active')
      })
    }

    if (window.NagrivaI18n) NagrivaI18n.translate()
    document.dispatchEvent(new CustomEvent('navbar:loaded'))

    /* ─── Load Structured Data Engine ─── */
    loadStructuredData()
  }

  function loadStructuredData() {
    if (document.querySelector('script[src="/js/structured-data.js"], script[src="../js/structured-data.js"]')) return;
    var sd = document.createElement('script');
    sd.src = '/js/structured-data.js';
    sd.defer = true;
    document.head.appendChild(sd);
  }

  function loadNewsletterJS() {
    if (window.NAGRIVA_Newsletter) return;
    var nl = document.createElement('script');
    nl.src = '/js/newsletter.js';
    nl.defer = true;
    document.head.appendChild(nl);
  }

  /* ─── Auth scripts (store + plan + UI) ─── */
  function loadAuthScripts() {
    return new Promise(function (resolve) {
      var hasStore = window.NagrivaAuthStore ||
        !!document.querySelector('script[src="/js/auth-store.js"], script[src="../js/auth-store.js"]');
      var hasPlan = window.NagrivaPlanManager ||
        !!document.querySelector('script[src="/js/plan-manager.js"], script[src="../js/plan-manager.js"]');
      var hasAuth  = window.NagrivaAuth ||
        !!document.querySelector('script[src="/js/auth.js"], script[src="../js/auth.js"]');

      if (hasStore && hasPlan && hasAuth) { resolve(); return; }

      function inject (src) {
        return new Promise(function (res) {
          var s = document.createElement('script');
          s.src = src;
          s.onload = res;
          s.onerror = res;
          document.head.appendChild(s);
        });
      }

      var chain = Promise.resolve();
      if (!hasStore) chain = chain.then(function () { return inject('/js/auth-store.js'); });
      if (!hasPlan)  chain = chain.then(function () { return inject('/js/plan-manager.js'); });
      if (!hasAuth)  chain = chain.then(function () { return inject('/js/auth.js'); });
      chain.then(function () { resolve(); });
    });
  }

  /* ─── Footer post-processing ─── */
  function processFooter (container) {
    if (window.NagrivaI18n) {
      NagrivaI18n.translate()
      var langSel = document.getElementById('langSelect')
      var curSel  = document.getElementById('currencySelect')
      if (langSel) {
        langSel.value = NagrivaI18n.getLang()
        langSel.addEventListener('change', function () {
          NagrivaI18n.setLang(this.value)
        })
      }
      if (curSel) {
        curSel.value = NagrivaI18n.getCurrency()
        curSel.addEventListener('change', function () {
          NagrivaI18n.setCurrency(this.value)
        })
      }
    }

    var cookieLink = container.querySelector('.cookie-preferences-link')
    if (cookieLink) {
      cookieLink.addEventListener('click', function (e) {
        e.preventDefault()
        if (window.NagrivaCookieConsent) {
          NagrivaCookieConsent.openPreferences()
        }
      })
    }

    /* Re-init newsletter forms loaded dynamically */
    if (window.NAGRIVA_Newsletter) {
      NAGRIVA_Newsletter.init()
    }
  }

  /* ─── Cookie consent post-processing ─── */
  function processCookieConsent (container) {
    /* Re-run NagrivaCookieConsent init logic (it needs the DOM in place) */
    if (window.NagrivaCookieConsent && typeof NagrivaCookieConsent._reinit === 'function') {
      NagrivaCookieConsent._reinit()
    }
  }

  /* ─── Init: load auth, then all components ─── */
  function init () {
    loadNewsletterJS()
    loadAuthScripts().then(function () {
      COMPONENTS.forEach(fetchComponent)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
