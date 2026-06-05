/* ════════════════════════════════════════════════════════
   NAGRIVA — Navbar Include (Reusable Component)
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
    'onboarding-qa': '/pages/onboarding-qa.html'
  }

  function init () {
    var container = document.getElementById(CONTAINER_ID)
    if (!container) return
    if (container.children.length > 0) return

    fetch(PARTIAL_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.text()
      })
      .then(function (html) {
        container.innerHTML = html

        /* ─── Active link system ─── */
        var page = document.body.getAttribute('data-page')
        if (page) {
          /* Desktop nav links */
          var navLinks = container.querySelectorAll('.nav-link[data-page]')
          navLinks.forEach(function (link) {
            if (link.getAttribute('data-page') === page) {
              link.classList.add('active')
            }
          })

          /* Mobile menu links */
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
      })
      .catch(function () {})
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
