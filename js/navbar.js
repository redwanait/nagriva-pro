/* ════════════════════════════════════════════════════════
   Nagriva — Navbar Include (Reusable Component)
   ════════════════════════════════════════════════════════ */
;(function () {
  'use strict'

  var CONTAINER_ID = 'navbar-container'
  var PARTIAL_URL  = '/components/navbar.html'

  /* ─── Active link map: data-page → href match ─── */
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

  function processNavbar () {
    var container = document.getElementById(CONTAINER_ID)
    if (!container) return

    /* ─── Active link system ─── */
    var page = document.body.getAttribute('data-page')
    if (page) {
      var navLinks = container.querySelectorAll('.nav-link[data-page]')
      navLinks.forEach(function (link) {
        if (link.getAttribute('data-page') === page) {
          link.classList.add('active')
        }
      })

      var mobileLinks = container.querySelectorAll('.mobile-menu-link[data-page]')
      mobileLinks.forEach(function (link) {
        if (link.getAttribute('data-page') === page) {
          link.classList.add('active')
        }
      })
    }

    /* ─── i18n re-init ─── */
    if (window.NagrivaI18n) {
      NagrivaI18n.translate()
    }

    /* ─── Notify other scripts that navbar is ready ─── */
    document.dispatchEvent(new CustomEvent('navbar:loaded'))
  }

  function init () {
    var container = document.getElementById(CONTAINER_ID)
    if (!container) return

    /* If container already has inline content, process it directly */
    if (container.children.length > 0) {
      processNavbar()
      return
    }

    fetch(PARTIAL_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.text()
      })
      .then(function (html) {
        container.innerHTML = html
        processNavbar()
      })
      .catch(function () {
        console.error('[Navbar] Failed to load ' + PARTIAL_URL)
      })
  }

  /* ─── Load Structured Data Engine ─── */
  function loadStructuredData() {
    if (document.querySelector('script[src="/js/structured-data.js"], script[src="../js/structured-data.js"]')) return;
    var sd = document.createElement('script');
    sd.src = '/js/structured-data.js';
    sd.defer = true;
    document.head.appendChild(sd);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  loadStructuredData();
})()
