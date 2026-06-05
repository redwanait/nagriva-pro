/* ════════════════════════════════════════════════════════
   Nagriva — Onboarding Flow
   7-step wizard for first-time users after signup
   ════════════════════════════════════════════════════════ */

window.NagrivaOnboarding = (function () {
  'use strict'

  var ONBOARDING_KEY = 'nagriva_onboarding_seen'

  var GOALS = [
    { id: 'buy',       label: 'Buy a Service',        icon: 'cart' },
    { id: 'sell',      label: 'Sell Services',         icon: 'briefcase' },
    { id: 'grow',      label: 'Grow My Business',      icon: 'trending' },
    { id: 'learn',     label: 'Learn Digital Skills',  icon: 'book' },
    { id: 'explore',   label: 'Explore Opportunities', icon: 'compass' }
  ]

  var INTERESTS = [
    { id: 'web-design',       label: 'Web Design' },
    { id: 'seo',              label: 'SEO' },
    { id: 'ai',               label: 'AI' },
    { id: 'automation',       label: 'Automation' },
    { id: 'content-creation', label: 'Content Creation' },
    { id: 'branding',         label: 'Branding' },
    { id: 'marketing',        label: 'Marketing' }
  ]

  var TOUR_STEPS = [
    {
      target: '.dash-header',
      title: 'Dashboard',
      desc: 'Track your projects, orders, and activity in real time from your central dashboard.'
    },
    {
      target: '.nav-link[data-page="services"]',
      title: 'Services',
      desc: 'Browse our premium digital services — from web design to AI automation.'
    },
    {
      target: '.nav-link[data-page="pricing"]',
      title: 'Pricing',
      desc: 'Explore transparent pricing tailored to your project needs and budget.'
    },
    {
      target: '.nav-link[data-page="blog"]',
      title: 'Blog',
      desc: 'Learn from expert articles on digital growth, SEO, branding, and more.'
    },
    {
      target: '.nav-user-avatar',
      title: 'Profile',
      desc: 'Access your profile, settings, notifications, and account management.'
    }
  ]

  var MAX_TOUR_RECURSION = 20
  var _tourKeyHandler = null

  var state = {
    step: 0,
    userId: null,
    goal: null,
    selectedInterests: [],
    profileName: '',
    profileBio: '',
    profileAvatar: null,
    started: false,
    tourActive: false,
    tourRecursion: 0
  }

  var dom = {}

  function qs (sel, ctx) { return (ctx || document).querySelector(sel) }
  function qsa (sel, ctx) { return (ctx || document).querySelectorAll(sel) }

  function isQAPage () {
    return document.body.getAttribute('data-page') === 'onboarding-qa' ||
           window.location.pathname.indexOf('onboarding-qa.html') !== -1
  }

  function isTourPage () {
    return !!qs('.dash-header') || isQAPage()
  }

  function resolveTourTarget (selector) {
    var el = qs(selector)
    if (el) return el
    if (isQAPage()) {
      var QA_FALLBACKS = {
        '.dash-header': '.qa-header',
        '.nav-link[data-page="services"]': '.nav-link[data-page="services"]',
        '.nav-link[data-page="pricing"]': '.nav-link[data-page="pricing"]',
        '.nav-link[data-page="blog"]': '.nav-link[data-page="blog"]',
        '.nav-user-avatar': '.nav-user-avatar'
      }
      var fb = QA_FALLBACKS[selector]
      if (fb) {
        console.log('[Onboarding Tour] QA fallback: "' + selector + '" -> "' + fb + '"')
        return qs(fb)
      }
    }
    return null
  }

  function createElement (tag, attrs, children) {
    var el = document.createElement(tag)
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') el.className = attrs[k]
        else if (k === 'innerHTML') el.innerHTML = attrs[k]
        else if (k === 'style' && typeof attrs[k] === 'object') {
          Object.keys(attrs[k]).forEach(function (sk) { el.style[sk] = attrs[k][sk] })
        } else el.setAttribute(k, attrs[k])
      })
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (typeof c === 'string') el.appendChild(document.createTextNode(c))
        else if (c) el.appendChild(c)
      })
    }
    return el
  }

  function svgIcon (name) {
    var icons = {
      cart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
      briefcase: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
      trending: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
      book: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      compass: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
      sparkle: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/><path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></svg>',
      check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      success: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      wave: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
    }
    return icons[name] || ''
  }

  /* ─── Build the onboarding HTML ─── */
  function buildOverlay () {
    var overlay = createElement('div', {
      id: 'onboardingOverlay',
      className: 'onboard-overlay',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Welcome to Nagriva onboarding'
    })

    var backdrop = createElement('div', { className: 'onboard-backdrop' })
    var ambient1 = createElement('div', { className: 'onboard-ambient-1' })
    var ambient2 = createElement('div', { className: 'onboard-ambient-2' })

    var modal = createElement('div', { className: 'onboard-modal' })
    var glow = createElement('div', { className: 'onboard-modal-glow' })

    var inner = createElement('div', { className: 'onboard-inner', id: 'onboardInner' })

    var skipBtn = createElement('button', {
      className: 'onboard-skip',
      id: 'onboardSkip',
      type: 'button',
      'aria-label': 'Skip onboarding'
    }, 'Skip')

    var progress = createElement('div', { className: 'onboard-progress', id: 'onboardProgress' })
    for (var i = 0; i < 7; i++) {
      progress.appendChild(createElement('div', {
        className: 'onboard-progress-step' + (i === 0 ? ' active' : ''),
        'data-step': i
      }))
    }

    var slidesContainer = createElement('div', { id: 'onboardSlides' })
    slidesContainer.appendChild(buildSlideWelcome())
    slidesContainer.appendChild(buildSlideGoal())
    slidesContainer.appendChild(buildSlideInterests())
    slidesContainer.appendChild(buildSlideProfile())
    slidesContainer.appendChild(buildSlideTour())
    slidesContainer.appendChild(buildSlideAction())
    slidesContainer.appendChild(buildSlideCompletion())

    inner.appendChild(skipBtn)
    inner.appendChild(progress)
    inner.appendChild(slidesContainer)
    modal.appendChild(glow)
    modal.appendChild(inner)
    overlay.appendChild(backdrop)
    overlay.appendChild(ambient1)
    overlay.appendChild(ambient2)
    overlay.appendChild(modal)

    document.body.appendChild(overlay)
  }

  function buildSlideWelcome () {
    var slide = createElement('div', {
      className: 'onboard-slide active',
      id: 'onboardSlide0',
      'data-step': '0'
    })

    var header = createElement('div', { className: 'onboard-header' })
    var icon = createElement('div', { className: 'onboard-icon' })
    icon.innerHTML = svgIcon('wave')
    var title = createElement('h2', { className: 'onboard-title' }, 'Welcome to Nagriva')
    var subtitle = createElement('p', { className: 'onboard-subtitle' }, "Let's get your account ready in less than a minute.")

    header.appendChild(icon)
    header.appendChild(title)
    header.appendChild(subtitle)

    var footer = createElement('div', { className: 'onboard-footer onboard-footer-center' })
    var getStarted = createElement('button', {
      className: 'onboard-btn onboard-btn-primary',
      id: 'onboardStart',
      type: 'button'
    }, 'Get Started')

    footer.appendChild(getStarted)
    slide.appendChild(header)
    slide.appendChild(footer)

    return slide
  }

  function buildSlideGoal () {
    var slide = createElement('div', {
      className: 'onboard-slide',
      id: 'onboardSlide1',
      'data-step': '1'
    })

    var header = createElement('div', { className: 'onboard-header' })
    var title = createElement('h2', { className: 'onboard-title' }, 'What are you looking for today?')
    header.appendChild(title)

    var options = createElement('div', { className: 'onboard-options single-col', id: 'onboardGoalOptions' })
    GOALS.forEach(function (g) {
      var btn = createElement('button', {
        className: 'onboard-option',
        'data-value': g.id,
        type: 'button'
      })
      var iconWrap = createElement('span', { className: 'onboard-option-icon' })
      iconWrap.innerHTML = svgIcon(g.icon)
      btn.appendChild(iconWrap)
      btn.appendChild(document.createTextNode(g.label))
      options.appendChild(btn)
    })

    var footer = createElement('div', { className: 'onboard-footer' })
    var back = createElement('button', {
      className: 'onboard-btn onboard-btn-ghost',
      type: 'button',
      id: 'onboardGoalBack'
    }, 'Back')
    var next = createElement('button', {
      className: 'onboard-btn onboard-btn-primary',
      id: 'onboardGoalNext',
      type: 'button',
      disabled: 'disabled',
      style: 'opacity:0.4;pointer-events:none;'
    }, 'Continue')

    footer.appendChild(back)
    footer.appendChild(next)
    slide.appendChild(header)
    slide.appendChild(options)
    slide.appendChild(footer)

    return slide
  }

  function buildSlideInterests () {
    var slide = createElement('div', {
      className: 'onboard-slide',
      id: 'onboardSlide2',
      'data-step': '2'
    })

    var header = createElement('div', { className: 'onboard-header' })
    var title = createElement('h2', { className: 'onboard-title' }, 'What interests you?')
    var subtitle = createElement('p', { className: 'onboard-subtitle' }, 'Select all that apply.')
    header.appendChild(title)
    header.appendChild(subtitle)

    var options = createElement('div', { className: 'onboard-options', id: 'onboardInterestOptions' })
    INTERESTS.forEach(function (i) {
      var btn = createElement('button', {
        className: 'onboard-option',
        'data-value': i.id,
        type: 'button'
      })
      var check = createElement('span', { className: 'onboard-option-check' })
      check.innerHTML = svgIcon('check')
      var label = createElement('span', null, i.label)
      btn.appendChild(check)
      btn.appendChild(label)
      options.appendChild(btn)
    })

    var footer = createElement('div', { className: 'onboard-footer' })
    var back = createElement('button', {
      className: 'onboard-btn onboard-btn-ghost',
      type: 'button',
      id: 'onboardInterestBack'
    }, 'Back')
    var next = createElement('button', {
      className: 'onboard-btn onboard-btn-primary',
      id: 'onboardInterestNext',
      type: 'button'
    }, 'Continue')

    footer.appendChild(back)
    footer.appendChild(next)
    slide.appendChild(header)
    slide.appendChild(options)
    slide.appendChild(footer)

    return slide
  }

  function buildSlideProfile () {
    var slide = createElement('div', {
      className: 'onboard-slide',
      id: 'onboardSlide3',
      'data-step': '3'
    })

    var header = createElement('div', { className: 'onboard-header' })
    var title = createElement('h2', { className: 'onboard-title' }, 'Quick Profile Setup')
    var subtitle = createElement('p', { className: 'onboard-subtitle' }, 'Optional — you can always update this later.')
    header.appendChild(title)
    header.appendChild(subtitle)

    var form = createElement('div', { className: 'onboard-form' })

    var nameField = createElement('div', { className: 'onboard-field' })
    var nameLabel = createElement('label', { className: 'onboard-label', for: 'onboardName' }, 'Full Name')
    var nameInput = createElement('input', {
      className: 'onboard-input',
      id: 'onboardName',
      type: 'text',
      placeholder: 'Your full name',
      autocomplete: 'name'
    })
    nameField.appendChild(nameLabel)
    nameField.appendChild(nameInput)

    var bioField = createElement('div', { className: 'onboard-field' })
    var bioLabel = createElement('label', { className: 'onboard-label', for: 'onboardBio' }, 'Short Bio')
    var bioInput = createElement('textarea', {
      className: 'onboard-input onboard-textarea',
      id: 'onboardBio',
      placeholder: 'Tell us a little about yourself...',
      rows: '3'
    })
    bioField.appendChild(bioLabel)
    bioField.appendChild(bioInput)

    form.appendChild(nameField)
    form.appendChild(bioField)

    var footer = createElement('div', { className: 'onboard-footer' })
    var back = createElement('button', {
      className: 'onboard-btn onboard-btn-ghost',
      type: 'button',
      id: 'onboardProfileBack'
    }, 'Back')
    var skip = createElement('button', {
      className: 'onboard-btn onboard-btn-ghost',
      type: 'button',
      id: 'onboardProfileSkip'
    }, 'Skip')
    var next = createElement('button', {
      className: 'onboard-btn onboard-btn-primary',
      id: 'onboardProfileNext',
      type: 'button'
    }, 'Save & Continue')

    footer.appendChild(back)
    footer.appendChild(skip)
    footer.appendChild(next)
    slide.appendChild(header)
    slide.appendChild(form)
    slide.appendChild(footer)

    return slide
  }

  function buildSlideTour () {
    var slide = createElement('div', {
      className: 'onboard-slide',
      id: 'onboardSlide4',
      'data-step': '4'
    })

    var header = createElement('div', { className: 'onboard-header' })
    var title = createElement('h2', { className: 'onboard-title' }, 'Quick Tour')
    var subtitle = createElement('p', { className: 'onboard-subtitle' }, 'Let\'s highlight the key areas of the platform.')
    header.appendChild(title)
    header.appendChild(subtitle)

    var footer = createElement('div', { className: 'onboard-footer onboard-footer-center' })
    var startTour = createElement('button', {
      className: 'onboard-btn onboard-btn-primary',
      id: 'onboardTourStart',
      type: 'button'
    }, 'Start Tour')

    footer.appendChild(startTour)
    slide.appendChild(header)
    slide.appendChild(footer)

    return slide
  }

  function buildSlideAction () {
    var slide = createElement('div', {
      className: 'onboard-slide',
      id: 'onboardSlide5',
      'data-step': '5'
    })

    var header = createElement('div', { className: 'onboard-header' })
    var title = createElement('h2', { className: 'onboard-title' }, 'Your First Step')
    var subtitle = createElement('p', { className: 'onboard-subtitle', id: 'onboardActionDesc' }, 'Take a meaningful action to get started.')
    header.appendChild(title)
    header.appendChild(subtitle)

    var actionArea = createElement('div', { className: 'onboard-completion-actions', id: 'onboardActionArea' })

    var footer = createElement('div', { className: 'onboard-footer' })
    var back = createElement('button', {
      className: 'onboard-btn onboard-btn-ghost',
      type: 'button',
      id: 'onboardActionBack'
    }, 'Back')
    var next = createElement('button', {
      className: 'onboard-btn onboard-btn-primary',
      id: 'onboardActionNext',
      type: 'button'
    }, 'Skip for now')

    footer.appendChild(back)
    footer.appendChild(next)
    slide.appendChild(header)
    slide.appendChild(actionArea)
    slide.appendChild(footer)

    return slide
  }

  function buildSlideCompletion () {
    var slide = createElement('div', {
      className: 'onboard-slide',
      id: 'onboardSlide6',
      'data-step': '6'
    })

    var wrapper = createElement('div', { className: 'onboard-completion' })
    var icon = createElement('div', { className: 'onboard-completion-icon' })
    icon.innerHTML = svgIcon('success')

    var title = createElement('h2', { className: 'onboard-title' }, "You're all set!")
    var msg = createElement('p', { className: 'onboard-subtitle' }, 'Your Nagriva experience is now personalized.')

    var actions = createElement('div', { className: 'onboard-completion-actions' })
    var dashBtn = createElement('button', {
      className: 'onboard-btn onboard-btn-primary',
      id: 'onboardGoDashboard',
      type: 'button'
    }, 'Go to Dashboard')

    var servicesBtn = createElement('button', {
      className: 'onboard-btn',
      id: 'onboardGoServices',
      type: 'button',
      style: 'color:var(--gray);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);'
    }, 'Explore Services')

    actions.appendChild(dashBtn)
    actions.appendChild(servicesBtn)
    wrapper.appendChild(icon)
    wrapper.appendChild(title)
    wrapper.appendChild(msg)
    wrapper.appendChild(actions)
    slide.appendChild(wrapper)

    return slide
  }

  /* ─── Build Tour Tooltip ─── */
  function buildTourTooltip () {
    var overlay = document.getElementById('onboardTourOverlay')
    if (!overlay) {
      overlay = createElement('div', { id: 'onboardTourOverlay', className: 'onboard-tour-overlay' })
      document.body.appendChild(overlay)
    }
    overlay.innerHTML = ''
    return overlay
  }

  function showTourStep (index) {
    console.log('[Onboarding Tour] showTourStep index=' + index + ' target="' + (TOUR_STEPS[index] ? TOUR_STEPS[index].target : 'undefined') + '"')

    /* Strict re-entrancy guard — bail immediately if already showing a step */
    if (state.tourActive) {
      console.warn('[Onboarding Tour] Re-entrancy prevented — tour already active at index ' + (state.tourIndex != null ? state.tourIndex : '?'))
      return
    }
    state.tourActive = true

    state.tourRecursion = (state.tourRecursion || 0)
    if (state.tourRecursion > MAX_TOUR_RECURSION) {
      console.warn('[Onboarding Tour] Max recursion reached, forcing end')
      endTour()
      return
    }

    var overlay = buildTourTooltip()
    var step = TOUR_STEPS[index]
    if (!step) { state.tourActive = false; return }

    var target = resolveTourTarget(step.target)
    if (!target) {
      console.log('[Onboarding Tour] Target "' + step.target + '" not found — skipping step')
      state.tourRecursion++
      state.tourActive = false
      nextTourStep()
      return
    }

    state.tourRecursion = 0

    var rect = target.getBoundingClientRect()

    var highlight = createElement('div', {
      className: 'onboard-tour-highlight',
      id: 'onboardTourHighlight'
    })
    highlight.style.cssText =
      'left:' + (rect.left - 8) + 'px;' +
      'top:' + (rect.top - 8) + 'px;' +
      'width:' + (rect.width + 16) + 'px;' +
      'height:' + (rect.height + 16) + 'px;'

    overlay.appendChild(highlight)

    var tooltip = createElement('div', {
      className: 'onboard-tooltip bottom',
      id: 'onboardTourTooltip'
    })

    var centerX = rect.left + rect.width / 2
    var tooltipY = rect.bottom + 16
    var tooltipX = Math.max(16, Math.min(window.innerWidth - 276, centerX - 130))
    tooltip.style.left = tooltipX + 'px'
    tooltip.style.top = tooltipY + 'px'

    var label = createElement('div', { className: 'onboard-tooltip-title' }, step.title)
    var desc = createElement('div', { className: 'onboard-tooltip-desc' }, step.desc)
    var actions = createElement('div', { className: 'onboard-tooltip-actions' })
    var counter = createElement('span', { className: 'onboard-tooltip-counter' }, (index + 1) + ' of ' + TOUR_STEPS.length)

    var nav = createElement('div', { style: 'display:flex;gap:6px;align-items:center;' })
    var skipBtn = createElement('button', {
      className: 'onboard-tooltip-btn-ghost',
      type: 'button',
      id: 'onboardTourSkip2'
    }, 'Skip')
    var nextBtn = createElement('button', {
      className: 'onboard-tooltip-btn',
      type: 'button',
      id: 'onboardTourNext'
    }, index < TOUR_STEPS.length - 1 ? 'Next' : 'Done')

    nav.appendChild(skipBtn)
    nav.appendChild(nextBtn)
    actions.appendChild(counter)
    actions.appendChild(nav)
    tooltip.appendChild(label)
    tooltip.appendChild(desc)
    tooltip.appendChild(actions)
    overlay.appendChild(tooltip)

    tooltip.classList.remove('bottom', 'top', 'left', 'right')
    if (tooltipY + tooltip.offsetHeight > window.innerHeight) {
      tooltip.classList.add('top')
      tooltip.style.top = (rect.top - tooltip.offsetHeight - 16) + 'px'
    } else {
      tooltip.classList.add('bottom')
    }

    overlay.style.pointerEvents = 'all'

    function cleanup () {
      var n = document.getElementById('onboardTourNext')
      var s = document.getElementById('onboardTourSkip2')
      if (n) n.removeEventListener('click', nextHandler)
      if (s) s.removeEventListener('click', skipHandler)
      if (_tourKeyHandler) document.removeEventListener('keydown', _tourKeyHandler)
      _tourKeyHandler = null
      state.tourActive = false
      console.log('[Onboarding Tour] Cleaned up listeners for step ' + index)
    }

    var nextHandler = function () { cleanup(); nextTourStep() }
    var skipHandler = function () { cleanup(); endTour() }
    var keyHandler = function (e) {
      if (e.key === 'Escape') { cleanup(); endTour() }
      if (e.key === 'Enter') { cleanup(); nextTourStep() }
    }

    nextBtn.addEventListener('click', nextHandler)
    skipBtn.addEventListener('click', skipHandler)
    _tourKeyHandler = keyHandler
    document.addEventListener('keydown', keyHandler)
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function nextTourStep () {
    state.tourIndex = (state.tourIndex || 0) + 1
    console.log('[Onboarding Tour] nextTourStep -> tourIndex=' + state.tourIndex + ' total=' + TOUR_STEPS.length)
    if (state.tourIndex >= TOUR_STEPS.length) {
      endTour()
    } else {
      showTourStep(state.tourIndex)
    }
  }

  function endTour () {
    console.log('[Onboarding Tour] endTour called')
    state.tourActive = false
    state.tourRecursion = 0
    if (_tourKeyHandler) {
      document.removeEventListener('keydown', _tourKeyHandler)
      _tourKeyHandler = null
    }
    var overlay = document.getElementById('onboardTourOverlay')
    if (overlay) {
      overlay.innerHTML = ''
      overlay.style.pointerEvents = 'none'
    }
    goToStep(5)
  }

  /* ─── Navigation ─── */
  function goToStep (n) {
    if (n < 0 || n > 6) return

    var slides = qsa('.onboard-slide')
    slides.forEach(function (s) { s.classList.remove('active') })

    var nextSlide = document.getElementById('onboardSlide' + n)
    if (nextSlide) nextSlide.classList.add('active')

    var steps = qsa('.onboard-progress-step')
    steps.forEach(function (s, i) {
      s.classList.remove('active', 'done')
      if (i < n) s.classList.add('done')
      if (i === n) s.classList.add('active')
    })

    var skip = document.getElementById('onboardSkip')
    if (skip) {
      skip.style.display = n === 6 ? 'none' : ''
    }

    /* Focus management */
    var firstBtn = nextSlide ? nextSlide.querySelector('button') : null
    if (firstBtn) setTimeout(function () { firstBtn.focus() }, 100)

    state.step = n

    /* Save progress to DB */
    saveProgress(n)

    /* Analytics */
    trackEvent('step_view', n)
  }

  /* ─── Database Operations ─── */
  function getUserId () {
    if (state.userId) return Promise.resolve(state.userId)
    return window.supabaseClient.auth.getSession().then(function (res) {
      if (res.data && res.data.session) {
        state.userId = res.data.session.user.id
        return state.userId
      }
      return null
    })
  }

  function saveProgress (step) {
    getUserId().then(function (uid) {
      if (!uid) return
      var payload = { id: uid, onboarding_step: step, updated_at: new Date().toISOString() }
      if (step === 1 && state.goal) payload.user_goal = state.goal
      if (step === 2) payload.interests = state.selectedInterests
      window.supabaseClient.from('profiles').upsert(payload, { onConflict: 'id' }).then(function (res) {
        if (res.error) console.warn('[Onboarding] Save progress failed:', res.error.message)
      })
    })
  }

  function saveProfile () {
    getUserId().then(function (uid) {
      if (!uid) return
      var payload = { id: uid, full_name: state.profileName || undefined, updated_at: new Date().toISOString() }
      window.supabaseClient.from('profiles').upsert(payload, { onConflict: 'id' }).then(function (res) {
        if (res.error) console.warn('[Onboarding] Save profile failed:', res.error.message)
      })
      if (state.profileName && state.profileName.trim()) {
        window.supabaseClient.auth.updateUser({
          data: { full_name: state.profileName.trim() }
        }).then(function (res) {
          if (res.error) console.warn('[Onboarding] Update user metadata failed:', res.error.message)
        })
      }
    })
  }

  function completeOnboarding () {
    return getUserId().then(function (uid) {
      if (!uid) return
      console.log('[Onboarding] Saving completion...')
      return window.supabaseClient.from('profiles').upsert({
        id: uid,
        onboarding_completed: true,
        onboarding_step: 6,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).then(function (res) {
        if (res.error) {
          console.warn('[Onboarding] Complete failed:', res.error.message)
          return
        }
        console.log('[Onboarding] Completion saved successfully')
      }).then(function () {
        trackEvent('completed')
        try { localStorage.setItem(ONBOARDING_KEY, 'true') } catch (e) {}
      })
    })
  }

  function trackEvent (event, step) {
    getUserId().then(function (uid) {
      if (!uid) return
      var meta = {}
      if (state.goal) meta.goal = state.goal
      if (state.selectedInterests.length) meta.interests = state.selectedInterests
      window.supabaseClient.from('onboarding_analytics').insert({
        user_id: uid,
        event: event,
        step: step != null ? step : state.step,
        metadata: meta
      }).then(function (res) {
        if (res.error) console.warn('[Onboarding] Analytics failed:', res.error.message)
      })
    })
  }

  /* ─── Event Binding ─── */
  function bindEvents () {
    /* ── Step 0: Welcome ── */
    var startBtn = document.getElementById('onboardStart')
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        trackEvent('started')
        state.started = true
        goToStep(1)
      })
    }

    /* ── Skip ── */
    var skipBtn = document.getElementById('onboardSkip')
    if (skipBtn) {
      skipBtn.addEventListener('click', skipOnboarding)
    }

    /* ── Step 1: Goal ── */
    var goalOptions = document.getElementById('onboardGoalOptions')
    if (goalOptions) {
      goalOptions.addEventListener('click', function (e) {
        var opt = e.target.closest('.onboard-option')
        if (!opt) return
        qsa('.onboard-option', goalOptions).forEach(function (o) { o.classList.remove('selected') })
        opt.classList.add('selected')
        state.goal = opt.getAttribute('data-value')
        var next = document.getElementById('onboardGoalNext')
        if (next) {
          next.removeAttribute('disabled')
          next.style.opacity = ''
          next.style.pointerEvents = ''
        }
      })
    }

    var goalNext = document.getElementById('onboardGoalNext')
    if (goalNext) {
      goalNext.addEventListener('click', function () {
        if (state.goal) goToStep(2)
      })
    }

    var goalBack = document.getElementById('onboardGoalBack')
    if (goalBack) {
      goalBack.addEventListener('click', function () { goToStep(0) })
    }

    /* ── Step 2: Interests ── */
    var interestOptions = document.getElementById('onboardInterestOptions')
    if (interestOptions) {
      interestOptions.addEventListener('click', function (e) {
        var opt = e.target.closest('.onboard-option')
        if (!opt) return
        opt.classList.toggle('selected')
        state.selectedInterests = []
        qsa('.onboard-option.selected', interestOptions).forEach(function (o) {
          state.selectedInterests.push(o.getAttribute('data-value'))
        })
      })
    }

    var interestNext = document.getElementById('onboardInterestNext')
    if (interestNext) {
      interestNext.addEventListener('click', function () { goToStep(3) })
    }

    var interestBack = document.getElementById('onboardInterestBack')
    if (interestBack) {
      interestBack.addEventListener('click', function () { goToStep(1) })
    }

    /* ── Step 3: Profile ── */
    var profileNext = document.getElementById('onboardProfileNext')
    if (profileNext) {
      profileNext.addEventListener('click', function () {
        var nameInput = document.getElementById('onboardName')
        var bioInput = document.getElementById('onboardBio')
        state.profileName = nameInput ? nameInput.value.trim() : ''
        state.profileBio = bioInput ? bioInput.value.trim() : ''
        saveProfile()
        goToStep(4)
      })
    }

    var profileSkip = document.getElementById('onboardProfileSkip')
    if (profileSkip) {
      profileSkip.addEventListener('click', function () { goToStep(4) })
    }

    var profileBack = document.getElementById('onboardProfileBack')
    if (profileBack) {
      profileBack.addEventListener('click', function () { goToStep(2) })
    }

    /* ── Step 4: Tour ── */
    var tourStart = document.getElementById('onboardTourStart')
    if (tourStart) {
      tourStart.addEventListener('click', function () {
        console.log('[Onboarding] Start Tour clicked')
        if (isQAPage()) {
          console.log('[Onboarding] QA mode — bypassing tour, advancing to step 5')
          goToStep(5)
          return
        }
        if (!isTourPage()) {
          console.log('[Onboarding] Tour skipped: no eligible targets on this page')
          goToStep(5)
          return
        }
        state.tourIndex = 0
        showTourStep(0)
      })
    }

    /* ── Step 5: First Action ── */
    var actionNext = document.getElementById('onboardActionNext')
    if (actionNext) {
      actionNext.addEventListener('click', function () { goToStep(6) })
    }

    var actionBack = document.getElementById('onboardActionBack')
    if (actionBack) {
      actionBack.addEventListener('click', function () { goToStep(4) })
    }

    /* ── Step 6: Completion ── */
    var goDash = document.getElementById('onboardGoDashboard')
    if (goDash) {
      goDash.addEventListener('click', function () {
        console.log('[Onboarding] Go to Dashboard clicked')
        close()
        completeOnboarding().then(function () {
          console.log('[Onboarding] Redirecting to dashboard')
          window.location.href = '/pages/dashboard.html'
        }).catch(function (err) {
          console.warn('[Onboarding] Completion error, redirecting anyway:', err.message || err)
          window.location.href = '/pages/dashboard.html'
        })
      })
    }

    var goServices = document.getElementById('onboardGoServices')
    if (goServices) {
      goServices.addEventListener('click', function () {
        completeOnboarding()
        trackEvent('first_action', 'services')
        window.location.href = '/pages/services.html'
      })
    }

    /* ── Keyboard ── */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var overlay = document.getElementById('onboardingOverlay')
        if (overlay && overlay.classList.contains('active')) {
          skipOnboarding()
        }
      }
    })
  }

  function buildActionStep () {
    var desc = document.getElementById('onboardActionDesc')
    var area = document.getElementById('onboardActionArea')
    if (!desc || !area) return

    area.innerHTML = ''

    var goal = state.goal
    var interests = state.selectedInterests || []

    var actions = []

    if (goal === 'buy' || interests.indexOf('web-design') !== -1 || interests.indexOf('seo') !== -1 || interests.indexOf('marketing') !== -1) {
      actions.push({
        label: 'Browse Services',
        url: '/pages/services.html',
        icon: 'cart'
      })
    }

    if (goal === 'learn' || interests.indexOf('content-creation') !== -1 || interests.indexOf('ai') !== -1) {
      actions.push({
        label: 'Explore Blog',
        url: '/pages/blog.html',
        icon: 'book'
      })
    }

    if (goal === 'explore') {
      actions.push({
        label: 'View Opportunities',
        url: '/index.html#services',
        icon: 'compass'
      })
    }

    if (goal === 'grow' || goal === 'sell') {
      actions.push({
        label: 'View Pricing',
        url: '/pages/pricing.html',
        icon: 'trending'
      })
    }

    if (actions.length === 0) {
      actions.push({
        label: 'Browse Services',
        url: '/pages/services.html',
        icon: 'cart'
      })
    }

    var descText = ''
    if (goal === 'buy') descText = 'Start exploring services that match your needs.'
    else if (goal === 'sell') descText = 'Check our pricing and see how you can offer your services.'
    else if (goal === 'grow') descText = 'Discover plans and packages to scale your business.'
    else if (goal === 'learn') descText = 'Dive into our blog and start learning new skills.'
    else if (goal === 'explore') descText = 'Browse opportunities and find your next big project.'
    else descText = 'Take a meaningful action to get started on Nagriva.'

    desc.textContent = descText

    actions.forEach(function (a) {
      var btn = createElement('a', {
        className: 'onboard-btn onboard-btn-primary',
        href: a.url,
        style: 'text-decoration:none;text-align:center;width:100%;'
      })
      btn.textContent = a.label
      btn.addEventListener('click', function () {
        trackEvent('first_action', a.label)
        completeOnboarding()
      })
      area.appendChild(btn)
    })
  }

  /* ─── Skip ─── */
  function skipOnboarding () {
    trackEvent('skipped')
    getUserId().then(function (uid) {
      if (!uid) return
      window.supabaseClient.from('profiles').upsert({
        id: uid,
        onboarding_completed: true,
        onboarding_step: -1,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).then(function (res) {
        if (res.error) console.warn('[Onboarding] Skip save failed:', res.error.message)
      })
      try { localStorage.setItem(ONBOARDING_KEY, 'true') } catch (e) {}
    })
    close()
  }

  /* ─── Show / Close ─── */
  function show () {
    var overlay = document.getElementById('onboardingOverlay')
    if (!overlay) return

    /* Prevent body scroll */
    document.body.style.overflow = 'hidden'

    overlay.style.display = 'flex'
    requestAnimationFrame(function () {
      overlay.classList.add('active')
    })

    /* Focus first button */
    setTimeout(function () {
      var firstBtn = overlay.querySelector('button')
      if (firstBtn) firstBtn.focus()
    }, 200)
  }

  function close () {
    var overlay = document.getElementById('onboardingOverlay')
    if (!overlay) return

    overlay.classList.remove('active')
    document.body.style.overflow = ''

    setTimeout(function () {
      overlay.style.display = 'none'
    }, 500)
  }

  function restart () {
    state.step = 0
    state.goal = null
    state.selectedInterests = []
    state.profileName = ''
    state.profileBio = ''
    state.started = false

    getUserId().then(function (uid) {
      if (!uid) return
      window.supabaseClient.from('profiles').upsert({
        id: uid,
        onboarding_completed: false,
        onboarding_step: 0,
        user_goal: null,
        interests: [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).then(function (res) {
        if (res.error) console.warn('[Onboarding] Reset failed:', res.error.message)
      })
    })

    var slides = qsa('.onboard-slide')
    slides.forEach(function (s) { s.classList.remove('active') })
    var first = document.getElementById('onboardSlide0')
    if (first) first.classList.add('active')

    var steps = qsa('.onboard-progress-step')
    steps.forEach(function (s, i) {
      s.classList.remove('active', 'done')
      if (i === 0) s.classList.add('active')
    })

    qsa('.onboard-option.selected').forEach(function (o) { o.classList.remove('selected') })

    var nameInput = document.getElementById('onboardName')
    var bioInput = document.getElementById('onboardBio')
    if (nameInput) nameInput.value = ''
    if (bioInput) bioInput.value = ''

    var goalNext = document.getElementById('onboardGoalNext')
    if (goalNext) {
      goalNext.setAttribute('disabled', 'disabled')
      goalNext.style.opacity = '0.4'
      goalNext.style.pointerEvents = 'none'
    }

    show()
  }

  /* ─── Check if onboarding should run ─── */
  function checkAndRun () {
    /* Skip if already completed in this session */
    try {
      if (localStorage.getItem(ONBOARDING_KEY) === 'true') return
    } catch (e) {}

    getUserId().then(function (uid) {
      if (!uid) return

      window.supabaseClient.from('profiles')
        .select('onboarding_completed, onboarding_step, user_goal, interests, full_name')
        .eq('id', uid)
        .single()
        .then(function (res) {
          if (res.error) {
            console.warn('[Onboarding] Profile fetch failed:', res.error.message)
            return
          }

          var profile = res.data
          if (profile.onboarding_completed) {
            try { localStorage.setItem(ONBOARDING_KEY, 'true') } catch (e) {}
            return
          }

          /* Resume from where they left off */
          if (profile.onboarding_step > 0) {
            state.step = profile.onboarding_step
            state.goal = profile.user_goal || null
            state.selectedInterests = profile.interests || []
            state.profileName = profile.full_name || ''
          }

          buildOverlay()
          bindEvents()

          /* Set initial state */
          if (state.goal) {
            var goalOpt = qs('.onboard-option[data-value="' + state.goal + '"]')
            if (goalOpt) {
              goalOpt.classList.add('selected')
              var goalNext = document.getElementById('onboardGoalNext')
              if (goalNext) {
                goalNext.removeAttribute('disabled')
                goalNext.style.opacity = ''
                goalNext.style.pointerEvents = ''
              }
            }
          }

          state.selectedInterests.forEach(function (id) {
            var opt = qs('.onboard-option[data-value="' + id + '"]')
            if (opt) opt.classList.add('selected')
          })

          var nameInput = document.getElementById('onboardName')
          if (nameInput && state.profileName) nameInput.value = state.profileName

          if (state.step > 0 && state.step < 5) {
            goToStep(state.step)
          }

          /* Build action buttons before showing step 5 */
          buildActionStep()

          show()
        })
        .catch(function (err) {
          console.warn('[Onboarding] Error:', err.message || err)
        })
    })
  }

  /* ─── Init ─── */
  function init () {
    document.addEventListener('DOMContentLoaded', function () {
      /* Wait a moment for auth and navbar to settle */
      setTimeout(checkAndRun, 800)
    })
  }

  /* ─── Public API ─── */
  return {
    init: init,
    show: show,
    close: close,
    restart: restart,
    checkAndRun: checkAndRun
  }
})()

/* ─── Auto-initialize ─── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { NagrivaOnboarding.init() })
} else {
  NagrivaOnboarding.init()
}
