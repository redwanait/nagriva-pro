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

        /* ─── Newsletter ─── */
        var btn   = container.querySelector('.newsletter-btn')
        var input = container.querySelector('.newsletter-input')

        if (btn && input) {
          function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          }

          function setLoading(loading) {
            btn.disabled = loading
            btn.innerHTML = loading
              ? '<span style="display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-spinner fa-spin"></i></span>'
              : '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          }

          function resetPlaceholder() {
            input.placeholder = 'your@email.com'
          }

          btn.addEventListener('click', async function () {
            var email = input.value.trim()

            if (!email || !isValidEmail(email)) {
              input.style.borderColor = 'rgba(255,80,80,0.4)'
              NAGRIVA_Toast.error('Invalid Email', 'Please enter a valid email address.')
              setTimeout(function () { input.style.borderColor = '' }, 1500)
              return
            }

            setLoading(true)

            try {
              var { data: existing, error: checkError } = await window.supabaseClient
                .from('newsletter_subscribers')
                .select('id')
                .eq('email', email)
                .maybeSingle()

              if (checkError) throw checkError

              if (existing) {
                NAGRIVA_Toast.info('Already Subscribed', 'This email is already subscribed to our newsletter.')
                setLoading(false)
                input.style.borderColor = 'rgba(0,245,196,0.4)'
                setTimeout(function () { input.style.borderColor = '' }, 1500)
                return
              }

              var { error: insertError } = await window.supabaseClient
                .from('newsletter_subscribers')
                .insert({ email: email, status: 'active' })

              if (insertError) throw insertError

              input.value = ''
              input.placeholder = '\u2713 You\'re subscribed!'
              btn.style.color = 'var(--accent)'
              NAGRIVA_Toast.success('Subscribed!', 'Thank you for subscribing to our newsletter.')
              setTimeout(function () {
                resetPlaceholder()
                btn.style.color = ''
              }, 3000)
            } catch (err) {
              console.error('[Newsletter] subscribe error:', err)
              NAGRIVA_Toast.error('Subscription Failed', err.message || 'Something went wrong. Please try again.')
            } finally {
              setLoading(false)
            }
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
