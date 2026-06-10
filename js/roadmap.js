/* ════════════════════════════════════════════════════════
   Nagriva — Public Roadmap Interactivity
   Filters, search, sort, upvotes, scroll animations
   ════════════════════════════════════════════════════════ */
;(function () {
  'use strict'

  /* ─── Helpers ─── */
  function qs (sel, ctx) { return (ctx || document).querySelector(sel) }
  function qsa (sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)) }

  /* ─── State ─── */
  var state = {
    activeFilter: 'all',
    searchQuery: '',
    sortBy: 'default',
    upvoted: {}
  }

  /* ─── DOM refs ─── */
  var boardEl = document.getElementById('rmBoard')
  var filterChips = qsa('.rm-filter-chip')
  var searchInput = document.getElementById('rmSearchInput')
  var sortSelect = document.getElementById('rmSort')
  var filtersWrap = document.getElementById('rmFilters')
  var suggestForm = document.getElementById('rmSuggestForm')
  var suggestSubmit = document.getElementById('rmSuggestSubmit')
  var formSuccess = document.getElementById('rmFormSuccess')

  /* ─── Update counts ─── */
  function updateCounts () {
    var allCards = qsa('.rm-card')
    var counts = { all: 0, jobs: 0, seo: 0, ai: 0, tools: 0, platform: 0 }

    allCards.forEach(function (card) {
      if (card.classList.contains('hidden-card')) return
      var cats = (card.getAttribute('data-category') || '').split(',').map(function (c) { return c.trim() })
      counts.all++
      cats.forEach(function (c) {
        if (counts[c] !== undefined) counts[c]++
      })
    })

    Object.keys(counts).forEach(function (key) {
      var el = document.getElementById('filterCount' + key.charAt(0).toUpperCase() + key.slice(1))
      if (el) el.textContent = counts[key]
    })
  }

  /* ─── Update column counts ─── */
  function updateColumnCounts () {
    qsa('.rm-column').forEach(function (col) {
      var columnKey = col.getAttribute('data-column')
      var visibleCards = qsa('.rm-card:not(.hidden-card)', qs('[data-cards="' + columnKey + '"]', col) || col)
      var countEl = col.querySelector('.rm-column-count')
      if (countEl) countEl.textContent = visibleCards.length
    })
  }

  /* ─── Update stat numbers ─── */
  function updateStats () {
    var completed = qsa('[data-cards="completed"] .rm-card:not(.hidden-card)').length
    var inProgress = qsa('[data-cards="in-progress"] .rm-card:not(.hidden-card)').length
    var planned = qsa('[data-cards="planned"] .rm-card:not(.hidden-card)').length
    var ideas = qsa('[data-cards="ideas"] .rm-card:not(.hidden-card)').length

    var releasedEl = qs('[data-stat="released"]')
    var inProgressEl = qs('[data-stat="in-progress"]')
    var plannedEl = qs('[data-stat="planned"]')
    var ideasEl = qs('[data-stat="ideas"]')

    animateNumber(releasedEl, completed)
    animateNumber(inProgressEl, inProgress)
    animateNumber(plannedEl, planned)
    animateNumber(ideasEl, ideas)
  }

  /* ─── Animate number counting up ─── */
  function animateNumber (el, target) {
    if (!el) return
    var current = parseInt(el.textContent, 10) || 0
    if (current === target) return
    var duration = 800
    var start = performance.now()

    function tick (now) {
      var progress = Math.min((now - start) / duration, 1)
      var eased = 1 - Math.pow(1 - progress, 3)
      var value = Math.round(current + (target - current) * eased)
      el.textContent = value
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }

  /* ─── Filter cards ─── */
  function applyFilters () {
    var filter = state.activeFilter
    var query = state.searchQuery.toLowerCase().trim()
    var sort = state.sortBy

    var cards = qsa('.rm-card')

    cards.forEach(function (card) {
      var cats = (card.getAttribute('data-category') || '').split(',').map(function (c) { return c.trim() })
      var title = (card.querySelector('.rm-card-title') || {}).textContent || ''
      var desc = (card.querySelector('.rm-card-desc') || {}).textContent || ''
      var matchesFilter = filter === 'all' || cats.indexOf(filter) !== -1
      var matchesSearch = !query || title.toLowerCase().indexOf(query) !== -1 || desc.toLowerCase().indexOf(query) !== -1
      card.classList.toggle('hidden-card', !matchesFilter || !matchesSearch)
    })

    /* Sort */
    var columns = qsa('.rm-column-cards')
    columns.forEach(function (col) {
      var visibleCards = qsa('.rm-card:not(.hidden-card)', col)
      if (sort === 'default') {
        visibleCards.sort(function (a, b) {
          return Array.from(col.children).indexOf(a) - Array.from(col.children).indexOf(b)
        })
      } else if (sort === 'priority') {
        var order = { high: 0, medium: 1, low: 2 }
        visibleCards.sort(function (a, b) {
          var pa = order[a.getAttribute('data-priority') || 'medium'] || 1
          var pb = order[b.getAttribute('data-priority') || 'medium'] || 1
          return pa - pb
        })
      } else if (sort === 'release') {
        visibleCards.sort(function (a, b) {
          var ra = a.getAttribute('data-release') || ''
          var rb = b.getAttribute('data-release') || ''
          return ra.localeCompare(rb)
        })
      }
      visibleCards.forEach(function (card) { col.appendChild(card) })
    })

    updateCounts()
    updateColumnCounts()
    updateStats()
  }

  /* ─── Filter chip click ─── */
  function onFilterClick (e) {
    var chip = e.currentTarget
    var filter = chip.getAttribute('data-filter')
    state.activeFilter = filter
    filterChips.forEach(function (c) { c.classList.remove('active') })
    chip.classList.add('active')
    applyFilters()
  }

  /* ─── Search ─── */
  function onSearchInput () {
    state.searchQuery = searchInput.value
    applyFilters()
  }

  /* ─── Sort change ─── */
  function onSortChange () {
    state.sortBy = sortSelect.value
    applyFilters()
  }

  /* ─── Upvote ─── */
  function onUpvoteClick (e) {
    var btn = e.currentTarget
    var id = btn.getAttribute('data-upvote')
    if (!id) return
    var countEl = btn.querySelector('.rm-upvote-count')
    var count = parseInt(countEl.textContent, 10) || 0

    if (state.upvoted[id]) {
      btn.classList.remove('upvoted')
      countEl.textContent = count - 1
      state.upvoted[id] = false
    } else {
      btn.classList.add('upvoted')
      countEl.textContent = count + 1
      state.upvoted[id] = true
    }

    /* Update data attribute on parent card */
    var card = btn.closest('.rm-card')
    if (card) {
      card.setAttribute('data-upvotes', countEl.textContent)
    }
  }

  /* ─── Suggest form ─── */
  function onSuggestSubmit (e) {
    e.preventDefault()
    var title = document.getElementById('rmFeatureTitle').value.trim()
    var desc = document.getElementById('rmFeatureDesc').value.trim()
    if (!title || !desc) return

    suggestSubmit.disabled = true
    suggestSubmit.textContent = 'Submitting...'

    setTimeout(function () {
      qs('.rm-suggest-form-wrap form').style.display = 'none'
      formSuccess.classList.add('show')
    }, 800)
  }

  /* ─── Sticky filters ─── */
  function initStickyFilters () {
    var filterEl = document.getElementById('rmFilters')
    if (!filterEl) return
    var filterTop = filterEl.getBoundingClientRect().top + window.scrollY
    var navbarH = 68
    var padding = 12

    function onScroll () {
      if (!filterEl || !filterEl.parentElement) return
      var parentRect = filterEl.parentElement.getBoundingClientRect()
      var scrollY = window.scrollY
      var shouldStick = scrollY > filterTop - navbarH - padding && parentRect.bottom > 200

      if (shouldStick && !filterEl.classList.contains('is-sticky')) {
        filterEl.classList.add('is-sticky')
      } else if (!shouldStick && filterEl.classList.contains('is-sticky')) {
        filterEl.classList.remove('is-sticky')
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
  }

  /* ─── Scroll animations (Intersection Observer) ─── */
  function initScrollAnimations () {
    if (!('IntersectionObserver' in window)) {
      qsa('.rm-fade-up').forEach(function (el) { el.classList.add('rm-visible') })
      return
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('rm-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' })

    qsa('.rm-fade-up').forEach(function (el) { observer.observe(el) })
  }

  /* ─── Bind events ─── */
  function bindEvents () {
    filterChips.forEach(function (chip) {
      chip.addEventListener('click', onFilterClick)
    })

    if (searchInput) {
      searchInput.addEventListener('input', onSearchInput)
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', onSortChange)
    }

    qsa('.rm-upvote-btn').forEach(function (btn) {
      btn.addEventListener('click', onUpvoteClick)
    })

    if (suggestForm) {
      suggestForm.addEventListener('submit', onSuggestSubmit)
    }
  }

  /* ─── Init ─── */
  function init () {
    bindEvents()
    updateCounts()
    updateColumnCounts()
    updateStats()
    initScrollAnimations()
    initStickyFilters()
  }

  /* Wait for layout components to load */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
