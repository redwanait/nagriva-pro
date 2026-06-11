/* ════════════════════════════════════════════════════════
   Nagriva — Comparison Pages Renderer
   compare.js
   Renders both the hub and detail comparison pages
════════════════════════════════════════════════════════ */

window.CompareRenderer = (function () {
  'use strict'

  var DATA_URL = '/data/comparisons.json'
  var dataCache = null

  var ICONS = {
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    arrowRight: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    trophy: '🏆',
    thumbsUp: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>',
    thumbsDown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>',
    checkCircle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
  }

  function qs (sel, ctx) { return (ctx || document).querySelector(sel) }
  function qsa (sel, ctx) { return (ctx || document).querySelectorAll(sel) }

  /* ─── DATA LOADING ─── */
  function loadData () {
    if (dataCache) return Promise.resolve(dataCache)
    return fetch(DATA_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      })
      .then(function (data) {
        dataCache = data
        return data
      })
      .catch(function (err) {
        console.error('[Compare] Failed to load data:', err)
        return null
      })
  }

  /* ─── INIT HUB ─── */
  function initHub () {
    loadData().then(function (data) {
      if (!data) return
      renderFeatured(data)
      renderFilters(data)
      renderFAQ(data)
      initSearch(data)
      initFadeUp()
    })
  }

  /* ─── RENDER FEATURED GRID ─── */
  function renderFeatured (data) {
    var grid = document.getElementById('cpFeaturedGrid')
    if (!grid) return

    grid.innerHTML = ''
    data.comparisons.forEach(function (c) {
      var card = document.createElement('a')
      card.href = '/compare/' + c.slug
      card.className = 'cp-card fade-up'
      card.style.setProperty('--cp-color-a', c.colorA)
      card.style.setProperty('--cp-color-b', c.colorB)

      card.innerHTML =
        '<span class="cp-card-category">' + escHtml(c.category) + '</span>' +
        '<div class="cp-card-logos">' +
          '<div class="cp-card-logos-glass">' +
            '<div class="cp-card-logo">' +
              '<img src="' + getLogoPath(c.nameA) + '" alt="' + escHtml(c.nameA) + '" class="cp-card-logo-img" loading="lazy">' +
            '</div>' +
            '<span class="cp-card-vs">VS</span>' +
            '<div class="cp-card-logo">' +
              '<img src="' + getLogoPath(c.nameB) + '" alt="' + escHtml(c.nameB) + '" class="cp-card-logo-img" loading="lazy">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cp-card-name">' + escHtml(c.nameA) + ' vs ' + escHtml(c.nameB) + '</div>' +
        '<p class="cp-card-desc">' + escHtml(c.shortDescription) + '</p>' +
        '<div class="cp-card-action">' +
          '<span class="cp-card-btn">Compare ' + ICONS.arrowRight + '</span>' +
        '</div>'

      grid.appendChild(card)
    })
  }

  /* ─── RENDER FILTERS ─── */
  function renderFilters (data) {
    var container = document.getElementById('cpFilters')
    if (!container) return

    container.innerHTML = ''
    data.categories.forEach(function (cat, i) {
      var btn = document.createElement('button')
      btn.className = 'cp-filter-btn' + (i === 0 ? ' active' : '')
      btn.textContent = cat
      btn.setAttribute('data-category', cat)
      btn.addEventListener('click', function () {
        qsa('.cp-filter-btn').forEach(function (b) { b.classList.remove('active') })
        btn.classList.add('active')
        filterGrid(cat, data)
      })
      container.appendChild(btn)
    })
  }

  function filterGrid (category, data) {
    var grid = document.getElementById('cpFeaturedGrid')
    if (!grid) return

    var cards = grid.querySelectorAll('.cp-card')
    cards.forEach(function (card, i) {
      var catEl = card.querySelector('.cp-card-category')
      var match = category === 'All' || (catEl && catEl.textContent === category)
      card.style.display = match ? '' : 'none'
      if (match) {
        card.style.setProperty('--delay', (i * 0.05) + 's')
      }
    })
  }

  /* ─── SEARCH ─── */
  function initSearch (data) {
    var input = document.getElementById('cpSearchInput')
    if (!input) return
    input.addEventListener('input', function () {
      var q = this.value.toLowerCase().trim()
      var grid = document.getElementById('cpFeaturedGrid')
      if (!grid) return
      var cards = grid.querySelectorAll('.cp-card')
      var visibleCount = 0
      cards.forEach(function (card) {
        var text = card.textContent.toLowerCase()
        var match = !q || text.indexOf(q) !== -1
        card.style.display = match ? '' : 'none'
        if (match) visibleCount++
      })
      var noResults = document.getElementById('cpNoResults')
      if (noResults) {
        noResults.style.display = visibleCount === 0 ? 'block' : 'none'
      }
    })
  }

  /* ─── RENDER HUB FAQ ─── */
  function renderFAQ (data) {
    var container = document.getElementById('cpFaqAccordion')
    if (!container || !data.faq) return

    container.innerHTML = ''
    data.faq.forEach(function (item, i) {
      var el = document.createElement('div')
      el.className = 'cp-faq-item'
      el.innerHTML =
        '<button class="cp-faq-q" data-index="' + i + '">' +
          escHtml(item.q) +
          '<span class="cp-faq-icon">' + ICONS.plus + '</span>' +
        '</button>' +
        '<div class="cp-faq-a">' +
          '<div class="cp-faq-a-inner">' + escHtml(item.a) + '</div>' +
        '</div>'

      var btn = el.querySelector('.cp-faq-q')
      btn.addEventListener('click', function () {
        var isOpen = el.classList.contains('open')
        qsa('.cp-faq-item').forEach(function (f) { f.classList.remove('open') })
        if (!isOpen) el.classList.add('open')
      })

      container.appendChild(el)
    })
  }

  /* ════════════════════════════════════════════════════════
     DETAIL PAGE
  ════════════════════════════════════════════════════════ */

  function initDetail () {
    var slug = getSlugFromURL()
    if (!slug) {
      showError('No comparison specified.')
      return
    }

    loadData().then(function (data) {
      if (!data) {
        showError('Failed to load comparison data.')
        return
      }

      var comparison = findComparison(data, slug)
      if (!comparison) {
        showError('Comparison not found.')
        return
      }

      renderDetail(comparison, data)
      initFadeUp()
    })
  }

  function getSlugFromURL () {
    var path = window.location.pathname.replace(/\/+$/, '')
    var parts = path.split('/')
    return parts[parts.length - 1] || null
  }

  function findComparison (data, slug) {
    for (var i = 0; i < data.comparisons.length; i++) {
      if (data.comparisons[i].slug === slug) return data.comparisons[i]
    }
    return null
  }

  function showError (msg) {
    var container = document.getElementById('cpDetailContent')
    if (container) {
      container.innerHTML = '<div class="cp-loading"><p style="color:var(--gray)">' + escHtml(msg) + '</p></div>'
    }
  }

  function renderDetail (c, data) {
    var content = document.getElementById('cpDetailContent')
    if (!content) return

    document.documentElement.style.setProperty('--cp-color-a', c.colorA)
    document.documentElement.style.setProperty('--cp-color-b', c.colorB)

    renderMeta(c)
    renderBreadcrumbSchema(c)

    content.innerHTML =
      renderBreadcrumb(c) +
      renderDetailHero(c) +
      renderWinner(c) +
      renderTable(c) +
      renderTabs(c) +
      renderProsCons(c) +
      renderDetailFAQ(c) +
      renderRelated(c, data) +
      renderDetailCTA(c)

    initTabs()
    initDetailFAQ()
  }

  /* ─── SEO META ─── */
  function renderMeta (c) {
    var title = (c.seo && c.seo.title) || c.nameA + ' vs ' + c.nameB + ' — Comparison | Nagriva'
    var desc = (c.seo && c.seo.description) || 'Compare ' + c.nameA + ' vs ' + c.nameB + ': pricing, features, support, quality and value.'
    var ogImage = (c.seo && c.seo.ogImage) || '/assets/images/branding/nagriva-og.png'

    setMeta('title', title)
    setMeta('description', desc)
    setMeta('og-title', title)
    setMeta('og-description', desc)
    setMeta('og-image', ogImage)
    setMeta('tw-title', title)
    setMeta('tw-description', desc)
    setMeta('tw-image', ogImage)

    var canonical = qs('link[rel="canonical"]')
    if (canonical) canonical.href = window.location.href

    var ogUrl = qs('meta[property="og:url"]')
    if (ogUrl) ogUrl.setAttribute('content', window.location.href)

    var structScript = qs('script[data-cp="structure"]')
    if (structScript) {
      structScript.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Nagriva",
        "url": window.location.href,
        "description": desc
      })
    }
  }

  function setMeta (key, value) {
    var el = qs('[data-cp="' + key + '"]')
    if (!el) return
    if (el.tagName === 'TITLE') {
      el.textContent = value
    } else {
      el.setAttribute('content', value)
    }
  }

  function renderBreadcrumbSchema (c) {
    var script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://nagriva.com/" },
        { "@type": "ListItem", "position": 2, "name": "Compare", "item": "https://nagriva.com/compare" },
        { "@type": "ListItem", "position": 3, "name": c.nameA + ' vs ' + c.nameB, "item": window.location.href }
      ]
    })
    document.head.appendChild(script)
  }

  function renderFAQSchema (faq) {
    var script = document.createElement('script')
    script.type = 'application/ld+json'
    var mainEntity = faq.map(function (item) {
      return {
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a
        }
      }
    })
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": mainEntity
    })
    document.head.appendChild(script)
  }

  function renderBreadcrumb (c) {
    return '<nav class="cp-breadcrumb fade-up">' +
      '<a href="/">Home</a>' +
      '<span class="cp-bc-sep">/</span>' +
      '<a href="/compare">Compare</a>' +
      '<span class="cp-bc-sep">/</span>' +
      '<span style="color:var(--gray)">' + escHtml(c.nameA) + ' vs ' + escHtml(c.nameB) + '</span>' +
    '</nav>'
  }

  function renderDetailHero (c) {
    return '<div class="cp-detail-hero fade-up">' +
      '<div class="cp-dh-logos">' +
        '<div class="cp-dh-logos-glass">' +
          '<div class="cp-dh-logo">' +
            '<img src="' + getLogoPath(c.nameA) + '" alt="' + escHtml(c.nameA) + '" class="cp-dh-logo-img">' +
          '</div>' +
          '<div class="cp-dh-vs">VS</div>' +
          '<div class="cp-dh-logo">' +
            '<img src="' + getLogoPath(c.nameB) + '" alt="' + escHtml(c.nameB) + '" class="cp-dh-logo-img">' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<h1 class="cp-dh-title">' + escHtml(c.hero.title) + '</h1>' +
      '<p class="cp-dh-subtitle">' + escHtml(c.hero.subtitle) + '</p>' +
      '<div class="cp-dh-actions">' +
        '<a href="' + escHtml(c.hero.ctaLink) + '" class="btn-primary">' + escHtml(c.hero.ctaText) + ' ' + ICONS.arrowRight + '</a>' +
        '<a href="' + escHtml(c.hero.cta2Link) + '" class="btn-secondary">' + escHtml(c.hero.cta2Text) + '</a>' +
      '</div>' +
    '</div>'
  }

  function renderWinner (c) {
    if (!c.winner) return ''

    var badges = ''
    if (c.winnerBadges) {
      badges = c.winnerBadges.map(function (b) {
        return '<span class="cp-winner-badge">' + ICONS.check + ' ' + escHtml(b) + '</span>'
      }).join('')
    }

    return '<div class="cp-winner fade-up">' +
      '<div class="cp-winner-card">' +
        '<div class="cp-winner-glow"></div>' +
        '<div class="cp-winner-trophy">' + ICONS.trophy + '</div>' +
        '<div class="cp-winner-label">' + escHtml(c.winnerReason) + '</div>' +
        '<p style="color:var(--gray);margin-bottom:18px;font-size:0.9rem;">Winner: <strong class="cp-winner-name" style="color:var(--cp-color-a,var(--accent))">' + escHtml(c.winner) + '</strong></p>' +
        '<div class="cp-winner-badges">' + badges + '</div>' +
      '</div>' +
    '</div>'
  }

  function renderTable (c) {
    if (!c.table || !c.table.rows) return ''

    var headers = c.table.headers.map(function (h) {
      return '<th>' + escHtml(h) + '</th>'
    }).join('')

    var rows = c.table.rows.map(function (row) {
      var aClass = row.aWin ? 'cp-win' : ''
      var bClass = row.bWin ? 'cp-win' : ''
      return '<tr>' +
        '<td>' + escHtml(row.feature) + '</td>' +
        '<td class="cp-td-a ' + aClass + '">' + (row.aWin ? ICONS.checkCircle + ' ' : '') + escHtml(row.a) + '</td>' +
        '<td class="cp-td-b ' + bClass + '">' + (row.bWin ? ICONS.checkCircle + ' ' : '') + escHtml(row.b) + '</td>' +
      '</tr>'
    }).join('')

    return '<div class="cp-table-section fade-up">' +
      '<div class="cp-detail-section-header">' +
        '<h2 class="cp-detail-section-title">Side-by-Side Comparison</h2>' +
      '</div>' +
      '<div style="overflow-x:auto">' +
        '<table class="cp-table">' +
          '<thead><tr>' + headers + '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>'
  }

  function renderTabs (c) {
    if (!c.tabs) return ''

    var tabNames = Object.keys(c.tabs)
    var navBtns = tabNames.map(function (name, i) {
      return '<button class="cp-tab-btn' + (i === 0 ? ' active' : '') + '" data-tab="' + i + '">' + escHtml(name) + '</button>'
    }).join('')

    var panels = tabNames.map(function (name, i) {
      var tab = c.tabs[name]
      return '<div class="cp-tab-panel' + (i === 0 ? ' active' : '') + '" data-panel="' + i + '">' +
        '<div class="cp-tab-grid">' +
          renderTabCol(tab.a, c.nameA, c.colorA) +
          renderTabCol(tab.b, c.nameB, c.colorB) +
        '</div>' +
      '</div>'
    }).join('')

    return '<div class="cp-tabs-section fade-up">' +
      '<div class="cp-detail-section-header">' +
        '<h2 class="cp-detail-section-title">Detailed Comparison</h2>' +
      '</div>' +
      '<div class="cp-tabs-nav">' + navBtns + '</div>' +
      '<div class="cp-tabs-content">' + panels + '</div>' +
    '</div>'
  }

  function renderTabCol (col, name, color) {
    if (!col || !col.items) return '<div class="cp-tab-col"><div class="cp-tab-col-title">' + escHtml(name) + '</div></div>'

    var items = col.items.map(function (item) {
      return '<div class="cp-tab-item">' +
        '<span class="cp-tab-item-label">' + escHtml(item.label) + '</span>' +
        '<span class="cp-tab-item-value">' + escHtml(item.value) + '</span>' +
      '</div>'
    }).join('')

    return '<div class="cp-tab-col">' +
      '<div class="cp-tab-col-title" style="border-bottom-color:' + color + '40">' + escHtml(col.title || name) + '</div>' +
      '<div class="cp-tab-items">' + items + '</div>' +
    '</div>'
  }

  function renderProsCons (c) {
    var prosA = (c.prosA || []).map(function (p) {
      return '<div class="cp-pc-item"><span class="cp-pc-bullet pros-bullet">' + ICONS.thumbsUp + '</span>' + escHtml(p) + '</div>'
    }).join('')
    var consA = (c.consA || []).map(function (p) {
      return '<div class="cp-pc-item"><span class="cp-pc-bullet cons-bullet">' + ICONS.thumbsDown + '</span>' + escHtml(p) + '</div>'
    }).join('')
    var prosB = (c.prosB || []).map(function (p) {
      return '<div class="cp-pc-item"><span class="cp-pc-bullet pros-bullet">' + ICONS.thumbsUp + '</span>' + escHtml(p) + '</div>'
    }).join('')
    var consB = (c.consB || []).map(function (p) {
      return '<div class="cp-pc-item"><span class="cp-pc-bullet cons-bullet">' + ICONS.thumbsDown + '</span>' + escHtml(p) + '</div>'
    }).join('')

    return '<div class="cp-pc-section fade-up">' +
      '<div class="cp-detail-section-header">' +
        '<h2 class="cp-detail-section-title">Pros & Cons</h2>' +
      '</div>' +
      '<div class="cp-pc-grid">' +
        '<div class="cp-pc-col pros">' +
          '<div class="cp-pc-header"><div class="cp-pc-icon pros-icon">' + ICONS.thumbsUp + '</div><h3 class="cp-pc-col-title">' + escHtml(c.nameA) + ' Pros</h3></div>' +
          '<div class="cp-pc-list">' + prosA + '</div>' +
        '</div>' +
        '<div class="cp-pc-col cons">' +
          '<div class="cp-pc-header"><div class="cp-pc-icon cons-icon">' + ICONS.thumbsDown + '</div><h3 class="cp-pc-col-title">' + escHtml(c.nameA) + ' Cons</h3></div>' +
          '<div class="cp-pc-list">' + consA + '</div>' +
        '</div>' +
        '<div class="cp-pc-col pros">' +
          '<div class="cp-pc-header"><div class="cp-pc-icon pros-icon">' + ICONS.thumbsUp + '</div><h3 class="cp-pc-col-title">' + escHtml(c.nameB) + ' Pros</h3></div>' +
          '<div class="cp-pc-list">' + prosB + '</div>' +
        '</div>' +
        '<div class="cp-pc-col cons">' +
          '<div class="cp-pc-header"><div class="cp-pc-icon cons-icon">' + ICONS.thumbsDown + '</div><h3 class="cp-pc-col-title">' + escHtml(c.nameB) + ' Cons</h3></div>' +
          '<div class="cp-pc-list">' + consB + '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  }

  function renderDetailFAQ (c) {
    if (!c.faq || c.faq.length === 0) return ''
    renderFAQSchema(c.faq)

    var items = c.faq.map(function (item, i) {
      return '<div class="cp-faq-item">' +
        '<button class="cp-faq-q" data-index="' + i + '">' +
          escHtml(item.q) +
          '<span class="cp-faq-icon">' + ICONS.plus + '</span>' +
        '</button>' +
        '<div class="cp-faq-a">' +
          '<div class="cp-faq-a-inner">' + escHtml(item.a) + '</div>' +
        '</div>' +
      '</div>'
    }).join('')

    return '<div class="cp-faq-section fade-up">' +
      '<div class="cp-detail-section-header">' +
        '<h2 class="cp-detail-section-title">Frequently Asked Questions</h2>' +
      '</div>' +
      '<div class="cp-faq-accordion">' + items + '</div>' +
    '</div>'
  }

  function renderRelated (c, data) {
    if (!c.related || c.related.length === 0) return ''

    var items = c.related.map(function (r) {
      var rc = findComparison(data, r.slug)
      if (!rc) return ''
      return '<a href="/compare/' + escHtml(r.slug) + '" class="cp-related-card">' +
        '<div class="cp-related-logos">' +
          '<div class="cp-related-logo">' +
            '<img src="' + getLogoPath(r.nameA) + '" alt="' + escHtml(r.nameA) + '" class="cp-related-logo-img">' +
          '</div>' +
          '<span class="cp-related-vs">VS</span>' +
          '<div class="cp-related-logo">' +
            '<img src="' + getLogoPath(r.nameB) + '" alt="' + escHtml(r.nameB) + '" class="cp-related-logo-img">' +
          '</div>' +
        '</div>' +
        '<span class="cp-related-name">' + escHtml(r.nameA) + ' vs ' + escHtml(r.nameB) + '</span>' +
        '<span class="cp-related-arrow">' + ICONS.arrowRight + '</span>' +
      '</a>'
    }).join('')

    return '<div class="cp-related-section fade-up">' +
      '<div class="cp-detail-section-header">' +
        '<h2 class="cp-detail-section-title">Related Comparisons</h2>' +
      '</div>' +
      '<div class="cp-related-grid">' + items + '</div>' +
    '</div>'
  }

  function renderDetailCTA (c) {
    return '<div class="cp-detail-cta fade-up">' +
      '<div class="cp-detail-cta-glow"></div>' +
      '<div class="container">' +
        '<h2 class="cp-detail-cta-title">Ready to Grow Your Business?</h2>' +
        '<p class="cp-detail-cta-desc">Get a free consultation and discover how we can help you achieve better results.</p>' +
        '<div class="cp-detail-cta-actions">' +
          '<a href="/pages/contact.html" class="btn-primary">Get a Free Quote ' + ICONS.arrowRight + '</a>' +
          '<a href="/pages/pricing.html" class="btn-secondary">View Pricing</a>' +
        '</div>' +
      '</div>' +
    '</div>'
  }

  /* ─── TABS INIT ─── */
  function initTabs () {
    var btns = qsa('.cp-tab-btn')
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = this.getAttribute('data-tab')
        var parent = this.closest('.cp-tabs-section')
        if (!parent) return
        qsa('.cp-tab-btn', parent).forEach(function (b) { b.classList.remove('active') })
        qsa('.cp-tab-panel', parent).forEach(function (p) { p.classList.remove('active') })
        this.classList.add('active')
        var panel = qs('.cp-tab-panel[data-panel="' + idx + '"]', parent)
        if (panel) panel.classList.add('active')
      })
    })
  }

  /* ─── DETAIL FAQ INIT ─── */
  function initDetailFAQ () {
    qsa('.cp-faq-section .cp-faq-q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = this.closest('.cp-faq-item')
        if (!item) return
        var isOpen = item.classList.contains('open')
        qsa('.cp-faq-section .cp-faq-item').forEach(function (f) { f.classList.remove('open') })
        if (!isOpen) item.classList.add('open')
      })
    })
  }

  /* ─── FADE UP ─── */
  function initFadeUp () {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })

    qsa('.fade-up').forEach(function (el) {
      observer.observe(el)
    })
  }

  /* ─── HELPERS ─── */
  var LOGO_MAP = {
    'Nagriva': 'nagriva.png',
    'Fiverr': 'fiverr.png',
    'Upwork': 'upwork.webp',
    'Toptal': 'toptal.webp',
    'WordPress': 'wordpress.png',
    'Webflow': 'webflow.png',
    'Shopify': 'shopify.png',
    'WooCommerce': 'woocommerce.png',
    'ChatGPT': 'ChatGPT.png',
    'Claude': 'Claude.png'
  }

  function getLogoPath (name) {
    return '/assets/images/compare-images/' + (LOGO_MAP[name] || '')
  }

  function escHtml (str) {
    if (!str) return ''
    var d = document.createElement('div')
    d.textContent = str
    return d.innerHTML
  }

  /* ════════════════════════════════════════════════════════
     PUBLIC API
  ════════════════════════════════════════════════════════ */

  return {
    initHub: initHub,
    initDetail: initDetail,
    loadData: loadData
  }
})()
