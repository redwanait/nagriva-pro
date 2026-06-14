/* ════════════════════════════════════════════════════════
   Nagriva — Tool Access Modal
   Reusable modal for gating tool pages behind Pro / Free Trial
   ════════════════════════════════════════════════════════ */
;(function () {
  'use strict'

  var OVERLAY_ID = 'tamOverlay'

  /* ─── Helpers ─── */
  function getReturnUrl () {
    return encodeURIComponent(window.location.pathname + window.location.search)
  }

  function isSessionUnlocked () {
    try { return sessionStorage.getItem('ng_tam_unlocked') === 'true' } catch (e) { return false }
  }

  function setSessionUnlocked () {
    try { sessionStorage.setItem('ng_tam_unlocked', 'true') } catch (e) {}
  }

  function shouldShow () {
    if (isSessionUnlocked()) {
      console.log('[TAM] shouldShow=false — session already unlocked')
      return false
    }
    if (window.NagrivaPlanManager && window.NagrivaPlanManager.isPro()) {
      console.log('[TAM] shouldShow=false — Pro user, unlimited access')
      setSessionUnlocked()
      return false
    }
    if (window.NagrivaAuthStore && NagrivaAuthStore.isAuthenticated()) {
      console.log('[TAM] shouldShow=false — authenticated user, auto-unlocking')
      setSessionUnlocked()
      return false
    }
    if (window.NAGRIVA_FreeTrialTracker && window.NAGRIVA_FreeTrialTracker.getRemaining() <= 0) {
      console.log('[TAM] shouldShow=false — trial exhausted, showing limit modal')
      if (window.NAGRIVA_LimitModal) {
        setTimeout(function () { window.NAGRIVA_LimitModal.show() }, 50)
      }
      return false
    }
    return true
  }

  /* ─── Action handlers ─── */
  function handleFreeTrial (btn) {
    if (btn.disabled) return
    btn.disabled = true
    btn.textContent = 'Starting\u2026'
    console.log('[TAM] Continue Free clicked — starting trial session')

    /* Record the first free use to activate the trial */
    var started = false
    if (window.NAGRIVA_FreeTrialTracker) {
      started = window.NAGRIVA_FreeTrialTracker.recordUse()
    }

    if (!started) {
      console.warn('[TAM] recordUse() failed — trial session not started')

      /* If truly exhausted (not just rate-limited), escalate to limit modal */
      if (window.NAGRIVA_FreeTrialTracker && window.NAGRIVA_FreeTrialTracker.getRemaining() <= 0) {
        console.log('[TAM] No remaining uses — showing limit modal instead')
        if (window.NAGRIVA_LimitModal) {
          hide()
          window.NAGRIVA_LimitModal.show()
        }
        return
      }

      /* Rate-limited or storage error — restore button, keep modal open */
      btn.disabled = false
      btn.textContent = 'Continue Free'
      return
    }

    /* Trial started successfully — commit the unlocked state */
    console.log('[TAM] Free trial use recorded — granting access')
    setSessionUnlocked()

    if (window.NAGRIVA_FreeTrialTracker) {
      var badgeEl = document.getElementById('ftbBadge')
      if (badgeEl && badgeEl.innerHTML.trim() === '') {
        window.NAGRIVA_FreeTrialTracker.renderBadge('ftbBadge')
        console.log('[TAM] Free trial badge rendered')
      }
    }

    setTimeout(function () {
      console.log('[TAM] Closing modal — tool access granted')
      hide()
    }, 350)
  }

  function handleUpgrade (btn) {
    if (btn.disabled) return
    btn.disabled = true
    btn.innerHTML = '<span>Redirecting\u2026</span>'
    console.log('[TAM] Upgrade clicked — redirecting to Pro page')

    setTimeout(function () {
      window.location.href = '/pages/nagriva-pro.html?redirect=' + getReturnUrl()
    }, 300)
  }

  /* ─── Build modal DOM ─── */
  function buildModal () {
    var div = document.createElement('div')
    div.className = 'tam-overlay'
    div.id = OVERLAY_ID
    div.setAttribute('role', 'dialog')
    div.setAttribute('aria-label', 'Unlock This Tool')

    div.innerHTML =
      '<div class="tam-modal">' +
        '<div class="tam-glow"></div>' +

        '<div class="tam-header">' +
          '<button class="tam-close" id="tamClose" aria-label="Close">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="18" y1="6" x2="6" y2="18"/>' +
              '<line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg>' +
          '</button>' +
          '<h2 class="tam-title">Unlock This Tool</h2>' +
          '<p class="tam-desc">Choose how you want to continue.</p>' +
        '</div>' +

        '<div class="tam-body">' +

          '<div class="tam-option">' +
            '<div class="tam-option-header">' +
              '<div class="tam-option-icon" aria-hidden="true">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>' +
                  '<path d="M3 20h18"/>' +
                '</svg>' +
              '</div>' +
              '<div class="tam-option-info">' +
                '<h3 class="tam-option-title">Nagriva Pro</h3>' +
                '<p class="tam-option-desc">Unlimited access to all tools and premium features.</p>' +
              '</div>' +
            '</div>' +
            '<button class="tam-option-btn tam-option-btn-primary" data-tam-action="upgrade">' +
              'Upgrade to Pro' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="5" y1="12" x2="19" y2="12"/>' +
                '<polyline points="12 5 19 12 12 19"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +

          '<div class="tam-option">' +
            '<div class="tam-option-header">' +
              '<div class="tam-option-icon" aria-hidden="true">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                  '<polyline points="20 12 20 22 4 22 4 12"/>' +
                  '<rect x="2" y="7" width="20" height="5"/>' +
                  '<line x1="12" y1="7" x2="12" y2="22"/>' +
                  '<path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>' +
                  '<path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>' +
                '</svg>' +
              '</div>' +
              '<div class="tam-option-info">' +
                '<h3 class="tam-option-title">Free Trial</h3>' +
                '<p class="tam-option-desc">Try this tool for free.</p>' +
              '</div>' +
            '</div>' +
            '<button class="tam-option-btn tam-option-btn-secondary" data-tam-action="free-trial">' +
              'Continue Free' +
            '</button>' +
          '</div>' +

        '</div>' +
      '</div>'

    return div
  }

  /* ─── Show modal ─── */
  function show () {
    if (document.getElementById(OVERLAY_ID)) return
    if (!shouldShow()) return

    var overlay = buildModal()
    document.body.appendChild(overlay)

    requestAnimationFrame(function () {
      overlay.classList.add('active')
    })

    document.body.style.overflow = 'hidden'

    /* ─── Close button ─── */
    var closeBtn = document.getElementById('tamClose')
    if (closeBtn) {
      closeBtn.addEventListener('click', hide)
    }

    /* ─── Overlay backdrop click ─── */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hide()
    })

    /* ─── Escape key ─── */
    function escHandler (e) {
      if (e.key === 'Escape') {
        hide()
        document.removeEventListener('keydown', escHandler)
      }
    }
    document.addEventListener('keydown', escHandler)

    /* ─── Action buttons (delegated) ─── */
    overlay.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tam-action]')
      if (!btn) return
      var action = btn.getAttribute('data-tam-action')

      if (action === 'free-trial') {
        handleFreeTrial(btn)
      } else if (action === 'upgrade') {
        handleUpgrade(btn)
      }
    })
  }

  /* ─── Hide modal ─── */
  function hide () {
    var overlay = document.getElementById(OVERLAY_ID)
    if (!overlay) return

    overlay.classList.remove('active')
    document.body.style.overflow = ''

    setTimeout(function () {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay)
      }
    }, 400)
  }

  /* ─── Auto-init on page load ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', show)
  } else {
    show()
  }

  /* ─── Public API ─── */
  window.NAGRIVA_ToolAccessModal = {
    show: show,
    hide: hide
  }
})()
