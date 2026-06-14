/* ════════════════════════════════════════════════════════
   Nagriva — Free Trial Tracker
   Tracks usage across all tools (3 free uses total),
   persists to localStorage, prevents abuse via rate-limiting,
   and emits events for future extensibility.
   ════════════════════════════════════════════════════════ */
;(function () {
  'use strict'

  var MAX_FREE_USES = 3
  var RATE_LIMIT_MS = 5000
  var LS_KEY_USES = 'ng_free_trial_uses'
  var LS_KEY_LAST_USE = 'ng_free_trial_last_use'

  var _listeners = {}

  /* ─── Read / write helpers ─── */
  function getStoredUses () {
    try {
      var raw = localStorage.getItem(LS_KEY_USES)
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  }

  function setStoredUses (arr) {
    try {
      localStorage.setItem(LS_KEY_USES, JSON.stringify(arr))
    } catch (e) {
      /* storage full or unavailable — silently degrade */
    }
  }

  /* ─── Public API ─── */
  function getRemaining () {
    var uses = getStoredUses()
    return Math.max(0, MAX_FREE_USES - uses.length)
  }

  function canUse () {
    if (getRemaining() <= 0) return false

    /* Rate limit: at least RATE_LIMIT_MS since last recorded use */
    var lastUse = parseInt(localStorage.getItem(LS_KEY_LAST_USE) || '0', 10)
    if (lastUse && Date.now() - lastUse < RATE_LIMIT_MS) return false

    return true
  }

  function recordUse () {
    if (!canUse()) return false

    var uses = getStoredUses()
    uses.push(Date.now())
    setStoredUses(uses)

    try {
      localStorage.setItem(LS_KEY_LAST_USE, String(Date.now()))
    } catch (e) { /* ignore */ }

    _emit('use', { remaining: getRemaining(), totalUses: uses.length })
    return true
  }

  function getUsageData () {
    var uses = getStoredUses()
    return {
      totalUses: uses.length,
      remaining: Math.max(0, MAX_FREE_USES - uses.length),
      maxFree: MAX_FREE_USES,
      timestamps: uses.slice(),
      isExhausted: uses.length >= MAX_FREE_USES
    }
  }

  /* ─── Event system (for future extensibility) ─── */
  function on (event, fn) {
    if (!_listeners[event]) _listeners[event] = []
    _listeners[event].push(fn)
  }

  function off (event, fn) {
    if (!_listeners[event]) return
    _listeners[event] = _listeners[event].filter(function (f) { return f !== fn })
  }

  function _emit (event, data) {
    var handlers = _listeners[event] || []
    for (var i = 0; i < handlers.length; i++) {
      try { handlers[i](data) } catch (e) { /* isolate handler errors */ }
    }
  }

  /* ─── Render badge into a container element ─── */
  function renderBadge (containerId) {
    var container = document.getElementById(containerId)
    if (!container) return

    var remaining = getRemaining()
    var html =
      '<div class="ftb-badge">' +
        '<span class="ftb-badge-label">Free Uses:</span>' +
        '<span class="ftb-badge-count">' + remaining + '/' + MAX_FREE_USES + '</span>' +
        '<span class="ftb-badge-text">remaining</span>' +
      '</div>'

    container.innerHTML = html

    /* Keep badge in sync when usage changes */
    _listeners['use'] = _listeners['use'] || []
    _listeners['use'].push(function () {
      var el = container.querySelector('.ftb-badge-count')
      if (el) el.textContent = getRemaining() + '/' + MAX_FREE_USES
    })
  }

  /* ─── Check remaining and block if exhausted ─── */
  function checkAndBlock () {
    /* Pro users bypass the free trial limit */
    if (window.NagrivaPlanManager && window.NagrivaPlanManager.isPro()) return true

    if (getRemaining() > 0) return true

    if (window.NAGRIVA_LimitModal) {
      window.NAGRIVA_LimitModal.show()
    }
    return false
  }

  /* ─── Expose globally ─── */
  window.NAGRIVA_FreeTrialTracker = {
    getRemaining: getRemaining,
    canUse: canUse,
    recordUse: recordUse,
    getUsageData: getUsageData,
    on: on,
    off: off,
    renderBadge: renderBadge,
    checkAndBlock: checkAndBlock,
    MAX_FREE_USES: MAX_FREE_USES
  }
})()
