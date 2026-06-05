/* ════════════════════════════════════════════════════════
   NAGRIVA — GDPR Cookie Consent Manager
   ════════════════════════════════════════════════════════ */
;(function () {
  'use strict'

  var STORAGE_KEY = 'nagriva_cookie_consent'
  var CONSENT_VERSION = 1

  var CONTAINER_ID = 'cookie-consent-container'
  var PARTIAL_URL = '/components/cookie-consent.html'

  var state = {
    consent: null,
    banner: null,
    overlay: null,
    modal: null,
    modalOverlay: null,
    container: null,
  }

  /* ─── Default consent (all denied except necessary) ─── */
  function defaultConsent () {
    return {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      categories: {
        necessary: true,
        analytics: false,
        marketing: false,
      }
    }
  }

  /* ─── Load consent from localStorage ─── */
  function loadConsent () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        var parsed = JSON.parse(raw)
        if (parsed && parsed.version === CONSENT_VERSION && parsed.categories) {
          // Ensure necessary is always true
          parsed.categories.necessary = true
          state.consent = parsed
          return parsed
        }
      }
    } catch (e) {}
    return null
  }

  /* ─── Save consent to localStorage ─── */
  function saveConsent (categories) {
    var data = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      categories: {
        necessary: true,
        analytics: !!categories.analytics,
        marketing: !!categories.marketing,
      }
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {}
    state.consent = data
    return data
  }

  /* ─── Public API ─── */
  function isCategoryEnabled (cat) {
    if (!state.consent || !state.consent.categories) return false
    return !!state.consent.categories[cat]
  }

  /* ─── Show banner ─── */
  function showBanner () {
    if (state.overlay) state.overlay.style.display = ''
    if (state.banner) {
      state.banner.style.display = ''
      requestAnimationFrame(function () {
        state.banner.classList.add('cookie-banner--visible')
      })
    }
  }

  /* ─── Hide banner ─── */
  function hideBanner () {
    if (state.banner) {
      state.banner.classList.remove('cookie-banner--visible')
      state.banner.addEventListener('transitionend', function handler () {
        if (state.overlay) state.overlay.style.display = 'none'
        state.banner.removeEventListener('transitionend', handler)
      })
      // Fallback if no transition
      setTimeout(function () {
        if (state.overlay) state.overlay.style.display = 'none'
      }, 350)
    }
  }

  /* ─── Show preferences modal ─── */
  function showModal () {
    if (state.modalOverlay) {
      state.modalOverlay.style.display = ''
      requestAnimationFrame(function () {
        state.modalOverlay.classList.add('cookie-modal--visible')
      })
    }
    // Sync toggles with current consent
    syncToggles()
  }

  /* ─── Hide preferences modal ─── */
  function hideModal () {
    if (state.modalOverlay) {
      state.modalOverlay.classList.remove('cookie-modal--visible')
      state.modalOverlay.addEventListener('transitionend', function handler () {
        state.modalOverlay.style.display = 'none'
        state.modalOverlay.removeEventListener('transitionend', handler)
      })
      setTimeout(function () {
        state.modalOverlay.style.display = 'none'
      }, 350)
    }
  }

  /* ─── Sync toggle switches from stored consent ─── */
  function syncToggles () {
    if (!state.consent) return
    var cats = state.consent.categories
    var analyticsCb = document.getElementById('cookieAnalytics')
    var marketingCb = document.getElementById('cookieMarketing')
    if (analyticsCb) analyticsCb.checked = !!cats.analytics
    if (marketingCb) marketingCb.checked = !!cats.marketing
  }

  /* ─── Read toggles and build categories object ─── */
  function readToggles () {
    var analyticsCb = document.getElementById('cookieAnalytics')
    var marketingCb = document.getElementById('cookieMarketing')
    return {
      analytics: analyticsCb ? analyticsCb.checked : false,
      marketing: marketingCb ? marketingCb.checked : false,
    }
  }

  /* ─── Apply consent (save, hide, fire callbacks) ─── */
  function applyConsent (categories) {
    saveConsent(categories)
    hideBanner()
    hideModal()
    fireCallbacks(categories)
  }

  /* ─── Callbacks for third-party scripts ─── */
  var callbacks = []

  function onConsent (fn) {
    if (state.consent) {
      fn(state.consent.categories)
    } else {
      callbacks.push(fn)
    }
  }

  function fireCallbacks (categories) {
    callbacks.forEach(function (fn) { fn(categories) })
    callbacks = []
  }

  /* ─── Wire up events ─── */
  function bindEvents () {
    // Banner buttons (delegated)
    var bannerEl = state.banner
    if (bannerEl) {
      bannerEl.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cookie-action]')
        if (!btn) return
        var action = btn.getAttribute('data-cookie-action')
        handleAction(action)
      })
    }

    // Modal buttons (delegated)
    var modalOverlay = state.modalOverlay
    if (modalOverlay) {
      modalOverlay.addEventListener('click', function (e) {
        var target = e.target
        var btn = target.closest('[data-cookie-action]')
        if (btn) {
          var action = btn.getAttribute('data-cookie-action')
          handleAction(action)
          return
        }
        // Close modal on backdrop click
        if (target === modalOverlay) {
          hideModal()
        }
      })
    }

    // Modal close button
    var closeBtn = document.getElementById('cookieModalClose')
    if (closeBtn) {
      closeBtn.addEventListener('click', hideModal)
    }

    // Toggle styling
    document.querySelectorAll('[data-cookie-toggle]').forEach(function (label) {
      var cb = label.querySelector('input[type="checkbox"]')
      if (cb) {
        cb.addEventListener('change', function () {
          if (this.checked) {
            label.classList.add('cookie-toggle-on')
          } else {
            label.classList.remove('cookie-toggle-on')
          }
        })
      }
    })
  }

  /* ─── Handle actions ─── */
  function handleAction (action) {
    switch (action) {
      case 'accept-all':
        applyConsent({ analytics: true, marketing: true })
        break
      case 'reject':
        applyConsent({ analytics: false, marketing: false })
        break
      case 'manage':
        hideBanner()
        showModal()
        break
      case 'save':
        applyConsent(readToggles())
        break
    }
  }

  /* ─── Reopen preferences (for footer link) ─── */
  function openPreferences () {
    if (state.modalOverlay) {
      showModal()
    }
  }

  /* ─── Inject banner HTML ─── */
  function init () {
    var container = document.getElementById(CONTAINER_ID)
    if (!container) return

    state.container = container

    fetch(PARTIAL_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.text()
      })
      .then(function (html) {
        container.innerHTML = html

        // Cache elements
        state.overlay = document.getElementById('cookieOverlay')
        state.banner = document.getElementById('cookieBanner')
        state.modalOverlay = document.getElementById('cookieModalOverlay')
        state.modal = document.getElementById('cookieModal')

        // i18n re-init
        if (window.NagrivaI18n) {
          NagrivaI18n.translate()
        }

        bindEvents()

        // Check existing consent
        var existing = loadConsent()
        if (existing) {
          // Consent exists — hide banner, fire callbacks
          if (state.overlay) state.overlay.style.display = 'none'
          fireCallbacks(existing.categories)
        } else {
          // First visit — show banner
          showBanner()
        }
      })
      .catch(function (err) {
        console.error('[NAGRIVA] Cookie consent load error:', err)
      })
  }

  /* ─── Expose public API ─── */
  window.NagrivaCookieConsent = {
    isCategoryEnabled: isCategoryEnabled,
    onConsent: onConsent,
    openPreferences: openPreferences,
    getConsent: function () { return state.consent },
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
