/* ════════════════════════════════════════════════════════
   Nagriva — Footer Include (Reusable Component)
   ════════════════════════════════════════════════════════ */
;(function () {
  'use strict'

  var CONTAINER_ID = 'footer-container'
  var PARTIAL_URL = '/components/footer.html'

  function init () {
    var container = document.getElementById(CONTAINER_ID)
    if (!container) return

    fetch(PARTIAL_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.text()
      })
      .then(function (html) {
        container.innerHTML = html

        /* ─── i18n re-init ─── */
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

        /* ─── Cookie Preferences ─── */
        var cookieLink = container.querySelector('.cookie-preferences-link')
        if (cookieLink) {
          cookieLink.addEventListener('click', function (e) {
            e.preventDefault()
            if (window.NagrivaCookieConsent) {
              NagrivaCookieConsent.openPreferences()
            }
          })
        }
      })
      .catch(function (err) {
        console.error('[Nagriva] Footer load error:', err)
      })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
