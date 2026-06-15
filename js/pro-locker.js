/* ════════════════════════════════════════════════════════
   Nagriva — Pro Feature Locker
   Reusable system to gate premium features behind Pro plan.
   Usage:
     <button data-pro-feature="export">Export</button>
     <div data-pro-feature="section" data-pro-tip="Custom tip">...</div>
     <button data-pro-feature data-pro-group="analytics">Advanced</button>
   ════════════════════════════════════════════════════════ */
;(function () {
  'use strict'

  var MODAL_ID = 'pumOverlay'
  var _initialized = false
  var _analyticsQueue = []

  /* ─── Feature registry ─── */
  var FEATURE_GROUPS = {
    export: {
      icon: 'download',
      title: 'Export & Share',
      desc: 'Export reports as PDF, share via email, and collaborate with your team.'
    },
    insights: {
      icon: 'insights',
      title: 'AI-Powered Insights',
      desc: 'Get deeper AI-driven analysis with actionable recommendations.'
    },
    analytics: {
      icon: 'chart',
      title: 'Advanced Analytics',
      desc: 'Access detailed charts, historical data, and performance trends.'
    },
    comparison: {
      icon: 'star',
      title: 'Competitive Analysis',
      desc: 'Compare unlimited competitors with advanced gap analysis.'
    },
    automation: {
      icon: 'zap',
      title: 'Automation & Scheduling',
      desc: 'Schedule automated reports and recurring competitive monitoring.'
    },
    default: {
      icon: 'star',
      title: 'Premium Feature',
      desc: 'Upgrade to Nagriva Pro and get unlimited access to all tools and premium features.'
    }
  }

  var FEATURE_ICONS = {
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    insights: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
  }

  /* ─── Helpers ─── */
  function isPro () {
    return window.NagrivaPlanManager && window.NagrivaPlanManager.isPro()
  }

  function getFeatureGroup (el) {
    var type = el.getAttribute('data-pro-feature') || 'default'
    var group = el.getAttribute('data-pro-group') || type
    return FEATURE_GROUPS[group] || FEATURE_GROUPS.default
  }

  /* ════════════════════════════════════════════════════════
     ANALYTICS
     ════════════════════════════════════════════════════════ */
  function track (event, data) {
    if (window.gtag) {
      try {
        gtag('event', event, Object.assign({ send_to: 'G-XXXXXXXXXX' }, data))
      } catch (e) {}
    }
    /* Fallback queue */
    _analyticsQueue.push({ event: event, data: data, time: Date.now() })
  }

  function trackClick (featureEl) {
    var type = featureEl.getAttribute('data-pro-feature') || 'unknown'
    var group = featureEl.getAttribute('data-pro-group') || type
    track('pro_locker_click', {
      feature_type: type,
      feature_group: group,
      page: window.location.pathname
    })
  }

  function trackModalOpen () {
    track('pro_locker_modal_open', { page: window.location.pathname })
  }

  function trackModalClose () {
    track('pro_locker_modal_close', { page: window.location.pathname })
  }

  function trackModalUpgrade () {
    track('pro_locker_modal_upgrade', { page: window.location.pathname })
  }

  /* ════════════════════════════════════════════════════════
     MODAL
     ════════════════════════════════════════════════════════ */

  function buildModal (groupData) {
    var g = groupData || FEATURE_GROUPS.default
    var iconHtml = FEATURE_ICONS[g.icon] || FEATURE_ICONS.star

    var div = document.createElement('div')
    div.className = 'pum-overlay'
    div.id = MODAL_ID
    div.setAttribute('role', 'dialog')
    div.setAttribute('aria-modal', 'true')
    div.setAttribute('aria-label', 'Upgrade to Nagriva Pro')

    div.innerHTML =
      '<div class="pum-modal">' +
        '<div class="pum-glow"></div>' +
        '<button class="pum-close" id="pumClose" aria-label="Close">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<line x1="18" y1="6" x2="6" y2="18"/>' +
            '<line x1="6" y1="6" x2="18" y2="18"/>' +
          '</svg>' +
        '</button>' +
        '<div class="pum-header">' +
          '<div class="pum-icon pum-icon--' + g.icon + '">' + iconHtml + '</div>' +
          '<h2 class="pum-title">' + g.title + '</h2>' +
          '<p class="pum-desc">' + g.desc + '</p>' +
        '</div>' +
        '<div class="pum-body">' +
          '<div class="pum-benefits">' +
            '<div class="pum-benefit">' +
              '<div class="pum-benefit-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
              '</div>' +
              '<div class="pum-benefit-info">' +
                '<div class="pum-benefit-title">Unlimited Tool Usage</div>' +
                '<div class="pum-benefit-desc">No more restrictions. Use every tool as many times as you need.</div>' +
              '</div>' +
            '</div>' +
            '<div class="pum-benefit">' +
              '<div class="pum-benefit-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>' +
              '</div>' +
              '<div class="pum-benefit-info">' +
                '<div class="pum-benefit-title">Premium Features</div>' +
                '<div class="pum-benefit-desc">Access advanced analytics, exports, AI insights, and more.</div>' +
              '</div>' +
            '</div>' +
            '<div class="pum-benefit">' +
              '<div class="pum-benefit-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
              '</div>' +
              '<div class="pum-benefit-info">' +
                '<div class="pum-benefit-title">Priority Support</div>' +
                '<div class="pum-benefit-desc">Get faster responses and dedicated support from our team.</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<a href="/pages/nagriva-pro.html" class="pum-cta" id="pumUpgrade">' +
            'Upgrade to Nagriva Pro' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="5" y1="12" x2="19" y2="12"/>' +
              '<polyline points="12 5 19 12 12 19"/>' +
            '</svg>' +
          '</a>' +
          '<div class="pum-footer">' +
            '<button class="pum-skip" id="pumSkip">Maybe later</button>' +
          '</div>' +
        '</div>' +
      '</div>'

    return div
  }

  function showModal (groupData) {
    if (document.getElementById(MODAL_ID)) return
    var overlay = buildModal(groupData)
    document.body.appendChild(overlay)
    document.body.style.overflow = 'hidden'
    trackModalOpen()

    requestAnimationFrame(function () {
      overlay.classList.add('active')
    })

    /* Close button */
    var closeBtn = document.getElementById('pumClose')
    if (closeBtn) closeBtn.addEventListener('click', function () { hideModal(); trackModalClose() })

    /* Skip button */
    var skipBtn = document.getElementById('pumSkip')
    if (skipBtn) skipBtn.addEventListener('click', function () { hideModal(); trackModalClose() })

    /* Overlay backdrop click */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) { hideModal(); trackModalClose() }
    })

    /* Escape */
    function escHandler (e) {
      if (e.key === 'Escape') {
        hideModal()
        trackModalClose()
        document.removeEventListener('keydown', escHandler)
      }
    }
    document.addEventListener('keydown', escHandler)

    /* Upgrade button */
    var upgradeBtn = document.getElementById('pumUpgrade')
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', function () {
        trackModalUpgrade()
      })
    }
  }

  function hideModal () {
    var overlay = document.getElementById(MODAL_ID)
    if (!overlay) return
    overlay.classList.remove('active')
    document.body.style.overflow = ''
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
    }, 450)
  }

  /* ════════════════════════════════════════════════════════
     LOCK A SINGLE ELEMENT
     ════════════════════════════════════════════════════════ */

  function lockElement (el) {
    if (isPro()) return
    if (el.getAttribute('data-pro-locked') === 'true') return

    el.setAttribute('data-pro-locked', 'true')

    var tipText = el.getAttribute('data-pro-tip') || 'Available with <strong>Nagriva Pro</strong>'
    var groupData = getFeatureGroup(el)

    /* Determine if it's a button/input vs card/section */
    var tag = el.tagName.toLowerCase()
    var isButton = tag === 'button' || tag === 'input' || el.getAttribute('role') === 'button'

    /* Wrap in container if needed */
    var wrap = document.createElement('div')
    wrap.className = 'pro-lock-wrap' + (isButton ? '' : ' pro-lock-block')

    el.parentNode.insertBefore(wrap, el)
    wrap.appendChild(el)

    /* Create overlay */
    var overlay = document.createElement('div')
    overlay.className = isButton ? 'pro-lock-btn-overlay' : 'pro-lock-card-overlay'

    /* Badge */
    var badge = document.createElement('span')
    badge.className = 'pro-lock-badge'
    badge.innerHTML = FEATURE_ICONS.lock + ' PRO'
    overlay.appendChild(badge)

    /* Tooltip */
    var tooltip = document.createElement('div')
    tooltip.className = 'pro-lock-tooltip'
    tooltip.innerHTML = tipText
    overlay.appendChild(tooltip)

    wrap.appendChild(overlay)

    /* Click → show upgrade modal with context-aware benefits */
    overlay.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      trackClick(el)
      showModal(groupData)
    })
  }

  /* ════════════════════════════════════════════════════════
     UNLOCK / REMOVE LOCKS
     ════════════════════════════════════════════════════════ */

  function unlockAll () {
    var wraps = document.querySelectorAll('.pro-lock-wrap')
    wraps.forEach(function (wrap) {
      var el = wrap.firstElementChild
      if (el) {
        el.removeAttribute('data-pro-locked')
        wrap.parentNode.insertBefore(el, wrap)
        wrap.parentNode.removeChild(wrap)
      }
    })
  }

  /* ════════════════════════════════════════════════════════
     SCAN DOM FOR [data-pro-feature] ELEMENTS
     ════════════════════════════════════════════════════════ */

  function scan () {
    if (isPro()) return

    var elements = document.querySelectorAll('[data-pro-feature]')
    elements.forEach(function (el) {
      if (el.getAttribute('data-pro-locked') !== 'true') {
        lockElement(el)
      }
    })
  }

  /* ════════════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════════════ */

  window.NAGRIVA_ProLocker = {
    lock: lockElement,
    unlockAll: unlockAll,
    scan: scan,
    showModal: showModal,
    hideModal: hideModal,
    isPro: isPro,
    registerGroup: function (key, config) {
      FEATURE_GROUPS[key] = config
    },
    getGroup: function (key) {
      return FEATURE_GROUPS[key] || FEATURE_GROUPS.default
    }
  }

  /* ════════════════════════════════════════════════════════
     AUTO-INIT
     ════════════════════════════════════════════════════════ */

  function init () {
    if (_initialized) return
    _initialized = true

    /* If plan manager already ready, scan immediately */
    if (window.NagrivaPlanManager) {
      if (!NagrivaPlanManager.isLoading()) {
        scan()
      }
      /* Re-scan when plan changes (unlock if upgraded) */
      NagrivaPlanManager.subscribe(function (state) {
        if (state.loading) return
        if (state.isPro) {
          unlockAll()
        } else {
          scan()
        }
      })
    }

    /* Re-scan on dynamic content changes */
    if (window.MutationObserver) {
      var observer = new MutationObserver(function () {
        scan()
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }

    /* Flush analytics queue */
    if (_analyticsQueue.length > 0 && window.gtag) {
      _analyticsQueue.forEach(function (item) {
        try { gtag('event', item.event, item.data) } catch (e) {}
      })
      _analyticsQueue = []
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
