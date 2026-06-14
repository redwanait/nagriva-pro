/* ════════════════════════════════════════════════════════
   Nagriva — Free Trial Limit Reached Modal
   Blocks tool usage when the 3-free-use trial is exhausted.
   Redirects to Sign Up / Sign In with return-to-tool flow.
   ════════════════════════════════════════════════════════ */
;(function () {
  'use strict'

  var OVERLAY_ID = 'nlmOverlay'

  /* ─── Build modal DOM ─── */
  function buildModal () {
    var div = document.createElement('div')
    div.className = 'nlm-overlay'
    div.id = OVERLAY_ID
    div.setAttribute('role', 'dialog')
    div.setAttribute('aria-modal', 'true')
    div.setAttribute('aria-label', 'Free Trial Limit Reached')

    var isFreeUser = window.NagrivaAuthStore && NagrivaAuthStore.isAuthenticated() &&
      (!window.NagrivaPlanManager || window.NagrivaPlanManager.isFree())

    div.innerHTML =
      '<div class="nlm-modal">' +
        '<div class="nlm-glow"></div>' +

        '<div class="nlm-header">' +
          '<div class="nlm-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
              '<circle cx="12" cy="12" r="10"/>' +
              '<line x1="12" y1="8" x2="12" y2="12"/>' +
              '<line x1="12" y1="16" x2="12.01" y2="16"/>' +
            '</svg>' +
          '</div>' +
          '<h2 class="nlm-title">' + (isFreeUser ? 'Free Trial Limit Reached' : 'Free Trial Limit Reached') + '</h2>' +
          '<p class="nlm-desc">' + (isFreeUser
            ? 'You have used all your free attempts. Upgrade to Nagriva Pro for unlimited access to all tools.'
            : 'You have used all 3 free attempts. Create a free account to continue using Nagriva tools.') +
          '</p>' +
        '</div>' +

        '<div class="nlm-body">' +

          (isFreeUser ? '' :
          '<div class="nlm-actions">' +
            '<button class="nlm-btn nlm-btn-primary" id="nlmSignup">' +
              'Create Free Account' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="5" y1="12" x2="19" y2="12"/>' +
                '<polyline points="12 5 19 12 12 19"/>' +
              '</svg>' +
            '</button>' +
            '<button class="nlm-btn nlm-btn-secondary" id="nlmLogin">' +
              'Sign In' +
            '</button>' +
          '</div>' +
          '<div class="nlm-divider">' +
            '<span class="nlm-divider-text">or upgrade</span>' +
          '</div>'
          ) +

          '<div class="nlm-upgrade">' +
            '<div class="nlm-upgrade-header">' +
              '<div class="nlm-upgrade-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
                  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' +
                '</svg>' +
              '</div>' +
              '<div class="nlm-upgrade-info">' +
                '<h3 class="nlm-upgrade-title">Nagriva Pro</h3>' +
                '<span class="nlm-upgrade-badge">Recommended</span>' +
              '</div>' +
            '</div>' +
            '<ul class="nlm-upgrade-list">' +
              '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Unlimited tool usage</li>' +
              '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Premium features</li>' +
              '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> No restrictions</li>' +
            '</ul>' +
            '<button class="nlm-btn nlm-btn-pro" id="nlmPro">' +
              'Upgrade to Pro' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="5" y1="12" x2="19" y2="12"/>' +
                '<polyline points="12 5 19 12 12 19"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +

        '</div>' +
      '</div>'

    return div
  }

  /* ─── Get redirect base path ─── */
  function getReturnUrl () {
    return encodeURIComponent(window.location.pathname + window.location.search)
  }

  /* ─── Show modal ─── */
  function show () {
    if (document.getElementById(OVERLAY_ID)) return

    var overlay = buildModal()
    document.body.appendChild(overlay)
    document.body.style.overflow = 'hidden'

    requestAnimationFrame(function () {
      overlay.classList.add('active')
    })

    var returnUrl = getReturnUrl()

    /* ─── Overlay backdrop click → no-op (must choose an action) ─── */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        /* shake to indicate must choose */
        var modal = overlay.querySelector('.nlm-modal')
        if (modal) {
          modal.style.animation = 'none'
          requestAnimationFrame(function () {
            modal.style.animation = 'nlmShake 0.4s ease'
          })
        }
      }
    })

    /* ─── Create Free Account ─── */
    var signupBtn = document.getElementById('nlmSignup')
    if (signupBtn) {
      signupBtn.addEventListener('click', function () {
        window.location.href = '/pages/signup.html?redirect=' + returnUrl + '&from_limit=1'
      })
    }

    /* ─── Sign In ─── */
    var loginBtn = document.getElementById('nlmLogin')
    if (loginBtn) {
      loginBtn.addEventListener('click', function () {
        window.location.href = '/pages/login.html?redirect=' + returnUrl + '&from_limit=1'
      })
    }

    /* ─── Upgrade to Pro (no payment logic — placeholder) ─── */
    var proBtn = document.getElementById('nlmPro')
    if (proBtn) {
      proBtn.addEventListener('click', function () {
        window.location.href = '/pages/nagriva-pro.html'
      })
    }
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
    }, 450)
  }

  /* ─── Public API ─── */
  window.NAGRIVA_LimitModal = {
    show: show,
    hide: hide
  }
})()
