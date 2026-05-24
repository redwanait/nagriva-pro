/* ════════════════════════════════════════════════════════
   NAGRIVA — Footer Include (Reusable Component)
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

        /* ─── Newsletter ─── */
        var btn   = container.querySelector('.newsletter-btn')
        var input = container.querySelector('.newsletter-input')

        if (btn && input) {
          btn.addEventListener('click', function () {
            var email = input.value.trim()
            if (!email || !email.includes('@')) {
              input.style.borderColor = 'rgba(255,80,80,0.4)'
              setTimeout(function () { input.style.borderColor = '' }, 1500)
              return
            }
            input.value = ''
            input.placeholder = '\u2713 You\'re subscribed!'
            btn.style.color = 'var(--accent)'
            setTimeout(function () {
              input.placeholder = 'your@email.com'
              btn.style.color = ''
            }, 3000)
          })
        }
      })
      .catch(function (err) {
        console.error('[NAGRIVA] Footer load error:', err)
      })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
