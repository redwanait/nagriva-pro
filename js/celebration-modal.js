/* ════════════════════════════════════════════════════════
   Nagriva — Welcome Celebration Modal
   Post-signup success experience with confetti & trial reset
   ════════════════════════════════════════════════════════ */
;(function () {
  'use strict'

  var OVERLAY_ID = 'tcmOverlay'

  /* ─── Check if we should show the celebration ─── */
  function hasWelcomeParam () {
    try {
      var s = new URLSearchParams(window.location.search)
      return s.get('welcome') === '1'
    } catch (e) {
      return false
    }
  }

  /* ─── Clean welcome param from URL ─── */
  function cleanupUrl () {
    try {
      var url = new URL(window.location)
      url.searchParams.delete('welcome')
      window.history.replaceState({}, '', url)
    } catch (e) {}
  }

  /* ─── Generate confetti pieces ─── */
  var CONFETTI_COLORS = [
    '#FACC15', '#F59E0B', '#22C55E', '#3B82F6', '#EC4899',
    '#8B5CF6', '#06B6D4', '#F97316', '#10B981', '#6366F1'
  ]

  function buildConfetti () {
    var c = document.createElement('div')
    c.className = 'tcm-confetti'
    for (var i = 0; i < 40; i++) {
      var p = document.createElement('div')
      p.className = 'tcm-confetti-piece'
      p.style.left = (Math.random() * 100) + '%'
      p.style.top = '-10px'
      p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      p.style.width = (4 + Math.random() * 4) + 'px'
      p.style.height = (4 + Math.random() * 4) + 'px'
      p.style.animationDuration = (2 + Math.random() * 1.5) + 's'
      p.style.animationDelay = (Math.random() * 0.8) + 's'
      c.appendChild(p)
    }
    return c
  }

  /* ─── Build modal DOM ─── */
  function buildModal () {
    var div = document.createElement('div')
    div.className = 'tcm-overlay'
    div.id = OVERLAY_ID
    div.setAttribute('role', 'dialog')
    div.setAttribute('aria-modal', 'true')
    div.setAttribute('aria-label', 'Welcome to Nagriva')

    div.innerHTML =
      '<div class="tcm-modal">' +
        '<div class="tcm-checkmark-wrap">' +
          '<svg width="72" height="72" viewBox="0 0 72 72">' +
            '<circle class="tcm-checkmark-circle-bg" cx="36" cy="36" r="30"/>' +
            '<circle class="tcm-checkmark-circle" cx="36" cy="36" r="30"/>' +
            '<polyline class="tcm-checkmark" points="24,36 32,44 48,28"/>' +
          '</svg>' +
        '</div>' +
        '<div class="tcm-content">' +
          '<h2 class="tcm-title">\uD83C\uDF89 Welcome to Nagriva</h2>' +
          '<p class="tcm-message">Your account has been created successfully.</p>' +
          '<div class="tcm-bonus">' +
            '<svg class="tcm-bonus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<polyline points="20 12 20 22 4 22 4 12"/>' +
              '<rect x="2" y="7" width="20" height="5"/>' +
              '<line x1="12" y1="7" x2="12" y2="22"/>' +
              '<path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>' +
              '<path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>' +
            '</svg>' +
            '+3 Free Uses Added' +
          '</div>' +
          '<p class="tcm-subtext">You can now continue using this tool.</p>' +
          '<button class="tcm-btn" id="tcmContinue">' +
            'Continue Using Tool' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="5" y1="12" x2="19" y2="12"/>' +
              '<polyline points="12 5 19 12 12 19"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>'

    /* Prepend confetti to modal */
    var modal = div.querySelector('.tcm-modal')
    modal.insertBefore(buildConfetti(), modal.firstChild)

    return div
  }

  /* ─── Reset free trial to 3 fresh uses ─── */
  function resetFreeTrial () {
    try {
      localStorage.removeItem('ng_free_trial_uses')
      localStorage.removeItem('ng_free_trial_last_use')
      console.log('[TCM] Free trial reset to ' + (
        window.NAGRIVA_FreeTrialTracker
          ? window.NAGRIVA_FreeTrialTracker.MAX_FREE_USES + ' uses'
          : 'fresh'
      ))
    } catch (e) {
      console.warn('[TCM] Could not reset free trial:', e)
    }
  }

  /* ─── Refresh badge after reset ─── */
  function refreshBadge () {
    if (!window.NAGRIVA_FreeTrialTracker) return
    var badgeEl = document.getElementById('ftbBadge')
    if (badgeEl) {
      badgeEl.innerHTML = ''
      window.NAGRIVA_FreeTrialTracker.renderBadge('ftbBadge')
    }
  }

  /* ─── Show modal ─── */
  function show () {
    if (document.getElementById(OVERLAY_ID)) return

    resetFreeTrial()
    refreshBadge()

    var overlay = buildModal()
    document.body.appendChild(overlay)

    requestAnimationFrame(function () {
      overlay.classList.add('active')
    })

    document.body.style.overflow = 'hidden'

    /* Continue button */
    document.getElementById('tcmContinue').addEventListener('click', function () {
      cleanupUrl()
      hide()
    })

    /* Escape */
    function escHandler (e) {
      if (e.key === 'Escape') {
        cleanupUrl()
        hide()
        document.removeEventListener('keydown', escHandler)
      }
    }
    document.addEventListener('keydown', escHandler)
  }

  /* ─── Hide modal ─── */
  function hide () {
    var overlay = document.getElementById(OVERLAY_ID)
    if (!overlay) return

    overlay.classList.remove('active')
    document.body.style.overflow = ''

    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
    }, 500)
  }

  /* ─── Try show: wait for auth store to be ready ─── */
  function tryShow () {
    console.log('[DEBUG TCM] tryShow called. welcome param:', hasWelcomeParam(), '| isLoading:', window.NagrivaAuthStore ? NagrivaAuthStore.isLoading() : 'NO STORE', '| isAuthenticated:', window.NagrivaAuthStore ? NagrivaAuthStore.isAuthenticated() : 'NO STORE');
    if (!hasWelcomeParam()) return

    function doShow () {
      console.log('[TCM] Welcome param detected — showing celebration')
      show()
    }

    /* If auth store exists, wait for it to finish initializing so navbar updates first */
    if (window.NagrivaAuthStore) {
      if (!NagrivaAuthStore.isLoading()) {
        console.log('[DEBUG TCM] Auth store ready, showing celebration immediately');
        doShow()
      } else {
        console.log('[DEBUG TCM] Auth store loading, subscribing for changes');
        var unsub = NagrivaAuthStore.subscribe(function onReady (state) {
          console.log('[DEBUG TCM] subscriber fired. loading:', state.loading);
          if (!state.loading) {
            if (typeof unsub === 'function') unsub()
            doShow()
          }
        })
        setTimeout(function () {
          console.log('[DEBUG TCM] 5s timeout — showing celebration anyway');
          try { if (typeof unsub === 'function') unsub() } catch (e) {}
          doShow()
        }, 5000)
      }
    } else {
      console.log('[DEBUG TCM] No auth store, showing celebration immediately');
      doShow()
    }
  }

  /* ─── Auto-init ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryShow)
  } else {
    tryShow()
  }

  /* ─── Public API ─── */
  window.NAGRIVA_CelebrationModal = { show: show, hide: hide }
})()
