/* ════════════════════════════════════════════════════════
   Nagriva — Competitor Comparison Tool
   competitor-comparison.js
   Generates comparison data, renders table, gap analysis,
   opportunity cards, AI insights, charts, and exports
════════════════════════════════════════════════════════ */

window.CompetitorComparison = (function () {
  'use strict'

  var STATE = {
    urls: [],
    scores: [],
    results: null,
    charts: []
  }

  var COLORS = {
    gold: '#FACC15',
    gold2: '#F59E0B',
    gold3: '#F59E0B',
    blue: '#FACC15',
    blue2: '#F59E0B',
    green: '#10B981',
    red: '#ef4444',
    yellow: '#FACC15',
    gray: '#71717a',
    white: '#ffffff'
  }

  var COMPETITOR_COLORS = [
    '#FACC15',
    '#FACC15',
    '#10B981',
    '#ef4444'
  ]

  var COMPETITOR_NAMES = ['Your Website', 'Competitor 1', 'Competitor 2', 'Competitor 3']

  function qs (sel, ctx) { return (ctx || document).querySelector(sel) }
  function qsa (sel, ctx) { return (ctx || document).querySelectorAll(sel) }

  /* ─── URL validation ─── */
  function normalizeUrl (str) {
    str = str.trim()
    if (!str) return ''
    if (!/^https?:\/\//i.test(str)) str = 'https://' + str
    try {
      var u = new URL(str)
      return u.href.replace(/\/+$/, '')
    } catch (e) {
      return ''
    }
  }

  function isValidUrl (str) {
    return /^https?:\/\/.+\..+/i.test(str)
  }

  /* ─── Deterministic score generation ─── */
  function generateScoresForUrl (url, index) {
    var seed = url.length + url.charCodeAt(0) + (url.indexOf('.') || 0) + (index * 37)
    function rand (min, max) {
      var x = Math.sin(seed++) * 10000
      return Math.floor(min + (x - Math.floor(x)) * (max - min + 1))
    }
    function randFloat (min, max) {
      var x = Math.sin(seed++) * 10000
      return Math.round((min + (x - Math.floor(x)) * (max - min)) * 10) / 10
    }
    function bool (pct) {
      return rand(0, 100) < pct
    }

    return {
      overall: rand(55, 96),
      performance: rand(40, 95),
      seo: rand(45, 95),
      accessibility: rand(50, 92),
      bestPractices: rand(50, 94),
      coreWebVitals: {
        lcp: randFloat(1.2, 6.5),
        cls: randFloat(0.01, 0.45),
        inp: randFloat(50, 350),
        fcp: randFloat(0.8, 4.5)
      },
      technicalSeo: {
        https: bool(85),
        sitemap: bool(70),
        robotsTxt: bool(75),
        metaDescription: bool(65),
        canonicalTags: bool(60),
        structuredData: bool(45),
        openGraph: bool(55)
      },
      mobile: rand(50, 93),
      security: rand(55, 98)
    }
  }

  /* ─── Generate all scores ─── */
  function generateAllScores (urls) {
    return urls.map(function (url, i) {
      return generateScoresForUrl(url, i)
    })
  }

  /* ─── Determine best/worst in each metric ─── */
  function findBestWorst (scores, metric) {
    var values = scores.map(function (s) { return s[metric] })
    var best = Math.max.apply(null, values)
    var worst = Math.min.apply(null, values)
    var bestIdx = values.indexOf(best)
    var worstIdx = values.indexOf(worst)
    if (best === worst) {
      return { best: [], worst: [] }
    }
    return {
      best: [bestIdx],
      worst: [worstIdx]
    }
  }

  /* ─── Calculate scorecard (wins/ties/losses) ─── */
  function calculateScorecard (scores) {
    var user = scores[0]
    var competitors = scores.slice(1)
    var wins = 0
    var ties = 0
    var losses = 0

    var metrics = ['overall', 'performance', 'seo', 'accessibility', 'bestPractices', 'mobile', 'security']
    var subMetrics = [
      { parent: 'coreWebVitals', keys: ['lcp', 'cls', 'inp', 'fcp'], lowerBetter: ['lcp', 'cls', 'inp', 'fcp'] },
      { parent: 'technicalSeo', keys: ['https', 'sitemap', 'robotsTxt', 'metaDescription', 'canonicalTags', 'structuredData', 'openGraph'] }
    ]

    metrics.forEach(function (m) {
      var userVal = user[m]
      competitors.forEach(function (comp) {
        if (userVal > comp[m]) wins++
        else if (userVal < comp[m]) losses++
        else ties++
      })
    })

    subMetrics.forEach(function (group) {
      group.keys.forEach(function (k) {
        var userVal = group.lowerBetter && group.lowerBetter.indexOf(k) !== -1
          ? user[group.parent][k]
          : user[group.parent][k]
        competitors.forEach(function (comp) {
          var compVal = group.lowerBetter && group.lowerBetter.indexOf(k) !== -1
            ? comp[group.parent][k]
            : comp[group.parent][k]
          if (group.lowerBetter && group.lowerBetter.indexOf(k) !== -1) {
            if (userVal < compVal) wins++
            else if (userVal > compVal) losses++
            else ties++
          } else {
            if (userVal > compVal) wins++
            else if (userVal < compVal) losses++
            else ties++
          }
        })
      })
    })

    return { wins: wins, ties: ties, losses: losses }
  }

  /* ─── Gap analysis ─── */
  function generateGaps (scores, urls) {
    var gaps = []
    var user = scores[0]

    scores.slice(1).forEach(function (comp, idx) {
      var compIdx = idx + 1
      var compName = COMPETITOR_NAMES[compIdx] || ('Competitor ' + compIdx)
      var compUrl = urls[compIdx] || compName

      if (comp.overall > user.overall + 5) {
        gaps.push({
          metric: 'Overall Score',
          detail: compName + ' has a higher overall score (' + comp.overall + ' vs ' + user.overall + ')',
          competitor: compUrl,
          icon: 'score'
        })
      }

      if (comp.performance > user.performance + 5) {
        gaps.push({
          metric: 'Performance',
          detail: compName + ' loads faster (' + comp.performance + ' vs ' + user.performance + ' score)',
          competitor: compUrl,
          icon: 'speed'
        })
      }

      if (comp.seo > user.seo + 5) {
        gaps.push({
          metric: 'SEO',
          detail: compName + ' has better SEO (' + comp.seo + ' vs ' + user.seo + ')',
          competitor: compUrl,
          icon: 'seo'
        })
      }

      if (comp.mobile > user.mobile + 5) {
        gaps.push({
          metric: 'Mobile Friendliness',
          detail: compName + ' is more mobile-friendly (' + comp.mobile + ' vs ' + user.mobile + ')',
          competitor: compUrl,
          icon: 'mobile'
        })
      }

      if (comp.security > user.security + 5) {
        gaps.push({
          metric: 'Security',
          detail: compName + ' has stronger security (' + comp.security + ' vs ' + user.security + ')',
          competitor: compUrl,
          icon: 'shield'
        })
      }

      if (comp.accessibility > user.accessibility + 5) {
        gaps.push({
          metric: 'Accessibility',
          detail: compName + ' is more accessible (' + comp.accessibility + ' vs ' + user.accessibility + ')',
          competitor: compUrl,
          icon: 'access'
        })
      }

      if (comp.bestPractices > user.bestPractices + 5) {
        gaps.push({
          metric: 'Best Practices',
          detail: compName + ' follows better practices (' + comp.bestPractices + ' vs ' + user.bestPractices + ')',
          competitor: compUrl,
          icon: 'practices'
        })
      }

      if (comp.coreWebVitals.lcp < user.coreWebVitals.lcp - 0.3) {
        gaps.push({
          metric: 'LCP',
          detail: compName + ' loads content faster (LCP: ' + comp.coreWebVitals.lcp + 's vs ' + user.coreWebVitals.lcp + 's)',
          competitor: compUrl,
          icon: 'speed'
        })
      }

      if (comp.technicalSeo.structuredData && !user.technicalSeo.structuredData) {
        gaps.push({
          metric: 'Structured Data',
          detail: compName + ' has structured data markup but your website does not',
          competitor: compUrl,
          icon: 'code'
        })
      }

      if (comp.technicalSeo.metaDescription && !user.technicalSeo.metaDescription) {
        gaps.push({
          metric: 'Meta Description',
          detail: compName + ' has meta descriptions but your website does not',
          competitor: compUrl,
          icon: 'desc'
        })
      }

      if (comp.technicalSeo.sitemap && !user.technicalSeo.sitemap) {
        gaps.push({
          metric: 'XML Sitemap',
          detail: compName + ' has an XML sitemap but your website does not',
          competitor: compUrl,
          icon: 'sitemap'
        })
      }

      if (comp.technicalSeo.openGraph && !user.technicalSeo.openGraph) {
        gaps.push({
          metric: 'Open Graph',
          detail: compName + ' has Open Graph tags but your website does not',
          competitor: compUrl,
          icon: 'share'
        })
      }

      if (comp.technicalSeo.https && !user.technicalSeo.https) {
        gaps.push({
          metric: 'HTTPS',
          detail: compName + ' uses HTTPS but your website does not',
          competitor: compUrl,
          icon: 'lock'
        })
      }

      if (comp.technicalSeo.canonicalTags && !user.technicalSeo.canonicalTags) {
        gaps.push({
          metric: 'Canonical Tags',
          detail: compName + ' uses canonical tags but your website does not',
          competitor: compUrl,
          icon: 'tag'
        })
      }

      if (comp.technicalSeo.robotsTxt && !user.technicalSeo.robotsTxt) {
        gaps.push({
          metric: 'Robots.txt',
          detail: compName + ' has a robots.txt file but your website does not',
          competitor: compUrl,
          icon: 'file'
        })
      }
    })

    return gaps
  }

  /* ─── Opportunity cards ─── */
  function generateOpportunities (gaps, scores) {
    var oppMap = {
      'Structured Data': {
        issue: 'Missing Structured Data',
        advantage: 'Competitor uses schema markup',
        action: 'Add structured data markup (JSON-LD) to your pages',
        impact: 'Enhanced search results with rich snippets',
        impactLevel: 'high'
      },
      'Meta Description': {
        issue: 'Missing Meta Descriptions',
        advantage: 'Competitor has optimized meta descriptions',
        action: 'Add unique 150-160 character meta descriptions to each page',
        impact: 'Improved click-through rates from search results',
        impactLevel: 'high'
      },
      'XML Sitemap': {
        issue: 'Missing XML Sitemap',
        advantage: 'Competitor has a sitemap for better indexing',
        action: 'Create and submit an XML sitemap to Google Search Console',
        impact: 'Better search engine indexing and discovery',
        impactLevel: 'high'
      },
      'Open Graph': {
        issue: 'Missing Open Graph Tags',
        advantage: 'Competitor has richer social sharing previews',
        action: 'Add Open Graph meta tags for social media sharing',
        impact: 'Better-looking social media shares',
        impactLevel: 'medium'
      },
      'HTTPS': {
        issue: 'HTTPS Not Enabled',
        advantage: 'Competitor serves over secure HTTPS',
        action: 'Install an SSL/TLS certificate from Let\'s Encrypt or your hosting provider',
        impact: 'Improved security and SEO ranking signal',
        impactLevel: 'high'
      },
      'Canonical Tags': {
        issue: 'Missing Canonical Tags',
        advantage: 'Competitor prevents duplicate content issues',
        action: 'Add canonical tags to specify preferred URL versions',
        impact: 'Prevents duplicate content penalties',
        impactLevel: 'medium'
      },
      'Robots.txt': {
        issue: 'Missing Robots.txt',
        advantage: 'Competitor controls crawler access',
        action: 'Create a robots.txt file to guide search engine crawlers',
        impact: 'Better crawl budget management',
        impactLevel: 'medium'
      },
      'Performance': {
        issue: 'Slow Page Speed',
        advantage: 'Competitor loads faster',
        action: 'Optimize images, implement caching, and use a CDN',
        impact: 'Lower bounce rates and improved user experience',
        impactLevel: 'high'
      },
      'Overall Score': {
        issue: 'Lower Overall Score',
        advantage: 'Competitor has a higher overall rating',
        action: 'Address all identified issues across performance, SEO, and usability',
        impact: 'Competitive parity and improved rankings',
        impactLevel: 'high'
      },
      'SEO': {
        issue: 'SEO Gaps',
        advantage: 'Competitor has stronger SEO',
        action: 'Improve on-page SEO, meta tags, and content quality',
        impact: 'Higher search engine rankings',
        impactLevel: 'high'
      },
      'Mobile Friendliness': {
        issue: 'Mobile Usability Issues',
        advantage: 'Competitor provides better mobile experience',
        action: 'Implement responsive design and optimize touch targets',
        impact: 'Better mobile rankings and user engagement',
        impactLevel: 'high'
      },
      'Security': {
        issue: 'Security Gaps',
        advantage: 'Competitor has better security posture',
        action: 'Implement security headers, use HTTPS, and keep software updated',
        impact: 'Improved trust and protection against threats',
        impactLevel: 'high'
      },
      'Accessibility': {
        issue: 'Accessibility Gaps',
        advantage: 'Competitor is more accessible',
        action: 'Add ARIA labels, improve contrast, and ensure keyboard navigation',
        impact: 'Wider audience reach and better user experience',
        impactLevel: 'medium'
      },
      'Best Practices': {
        issue: 'Best Practice Gaps',
        advantage: 'Competitor follows modern web standards',
        action: 'Update to modern frameworks, remove deprecated APIs, follow guidelines',
        impact: 'Improved maintainability and performance',
        impactLevel: 'medium'
      },
      'LCP': {
        issue: 'Slow Largest Contentful Paint',
        advantage: 'Competitor loads main content faster',
        action: 'Optimize hero images, reduce server response time, eliminate render-blocking resources',
        impact: 'Improved Core Web Vitals and user perception',
        impactLevel: 'high'
      }
    }

    var opportunities = []
    var seen = {}

    gaps.forEach(function (gap) {
      var key = gap.metric
      if (seen[key]) return
      var opp = oppMap[key]
      if (!opp) return
      seen[key] = true

      opportunities.push({
        issue: opp.issue,
        advantage: opp.advantage + ' (' + gap.competitor + ')',
        action: opp.action,
        impact: opp.impact,
        impactLevel: opp.impactLevel
      })
    })

    return opportunities
  }

  /* ─── Generate AI Insights summary ─── */
  function generateAIInsights (scores, urls, scorecard, gaps) {
    var user = scores[0]
    var parts = []

    var strongAreas = []
    var weakAreas = []

    var metrics = [
      { key: 'performance', label: 'Performance' },
      { key: 'seo', label: 'SEO' },
      { key: 'accessibility', label: 'accessibility' },
      { key: 'bestPractices', label: 'best practices' },
      { key: 'mobile', label: 'mobile usability' },
      { key: 'security', label: 'security' }
    ]

    var hasAdvantage = {}

    metrics.forEach(function (m) {
      var userVal = user[m.key]
      var allBetter = true
      var allWorse = true
      scores.slice(1).forEach(function (comp) {
        if (comp[m.key] >= userVal) allWorse = false
        if (comp[m.key] <= userVal) allBetter = false
      })
      if (allBetter && !allWorse) {
        strongAreas.push(m.label)
      } else if (allWorse && !allBetter) {
        weakAreas.push(m.label)
      }
    })

    if (user.overall >= 80) {
      parts.push('Your website has a solid overall score of <strong>' + user.overall + '</strong>')
    } else if (user.overall >= 65) {
      parts.push('Your website scores <strong>' + user.overall + '</strong> overall, which is decent but has room for improvement')
    } else {
      parts.push('Your website scores <strong>' + user.overall + '</strong> overall, indicating significant opportunities for improvement')
    }

    if (strongAreas.length > 0) {
      parts.push(
        'You outperform your competitors in <span class="cc-highlight-green"><strong>' +
        strongAreas.join(', ') +
        '</strong></span>'
      )
    }

    if (weakAreas.length > 0) {
      parts.push(
        'but fall behind in <span class="cc-highlight-red"><strong>' +
        weakAreas.join(', ') +
        '</strong></span>'
      )
    }

    if (gaps.length > 0) {
      var topGaps = gaps.slice(0, 2)
      parts.push(
        'Key areas to address: <strong>' +
        topGaps.map(function (g) { return g.metric }).join(' and ') +
        '</strong>'
      )
      parts.push(
        'Adding structured data and improving mobile usability could close the gap and improve rankings'
      )
    }

    if (scorecard.wins > scorecard.losses) {
      parts.push('<span class="cc-highlight-green"><strong>You\'re ahead in ' + scorecard.wins + ' metrics</strong></span>')
    } else if (scorecard.losses > scorecard.wins) {
      parts.push('<span class="cc-highlight-red"><strong>Competitors lead in ' + scorecard.losses + ' metrics</strong></span>')
    }

    return parts.join('. ') + '.'
  }

  /* ─── Render comparison table ─── */
  function renderTable (scores, urls) {
    var container = document.getElementById('ccComparisonTable')
    if (!container) return
    container.innerHTML = ''

    var user = scores[0]
    var totalSites = scores.length

    var table = document.createElement('table')
    table.className = 'cc-table'

    var thead = document.createElement('thead')
    var headerRow = document.createElement('tr')
    var th0 = document.createElement('th')
    th0.textContent = 'Metric'
    headerRow.appendChild(th0)

    for (var i = 0; i < totalSites; i++) {
      var th = document.createElement('th')
      var label = COMPETITOR_NAMES[i] || ('Site ' + (i + 1))
      th.innerHTML = label + (i > 0 ? ' <span class="cc-competitor-label">' + (urls[i] ? urls[i].replace(/^https?:\/\//, '').split('/')[0] : '') + '</span>' : '')
      headerRow.appendChild(th)
    }
    thead.appendChild(headerRow)
    table.appendChild(thead)

    var tbody = document.createElement('tbody')

    function addMetricRow (label, values, isScore) {
      var tr = document.createElement('tr')
      var tdLabel = document.createElement('td')
      tdLabel.textContent = label
      if (isScore) tdLabel.className = 'cc-sub-metric-label'
      tr.appendChild(tdLabel)

      var numValues = values.length
      var numericValues = values.map(function (v) {
        return typeof v === 'boolean' ? (v ? 1 : 0) : v
      })
      var bestVal = -Infinity
      var worstVal = Infinity
      numericValues.forEach(function (v) {
        if (v > bestVal) bestVal = v
        if (v < worstVal) worstVal = v
      })

      values.forEach(function (v, idx) {
        var td = document.createElement('td')
        var isNum = typeof v === 'number' && !Number.isInteger(v) === false || typeof v === 'number'
        if (typeof v === 'boolean') {
          td.innerHTML = v
            ? '<span class="cc-cell-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span>'
            : '<span class="cc-cell-cross"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>'
        } else if (typeof v === 'number') {
          var nv = numericValues[idx]
          if (nv === bestVal && bestVal !== worstVal) {
            td.className = 'cc-cell-best cc-score-num'
          } else if (nv === worstVal && bestVal !== worstVal) {
            td.className = 'cc-cell-worst cc-score-num'
          } else {
            td.className = 'cc-score-num'
          }
          td.textContent = v
        }
        tr.appendChild(td)
      })
      tbody.appendChild(tr)
    }

    function addGroupRow (label) {
      var tr = document.createElement('tr')
      var td = document.createElement('td')
      td.textContent = label
      td.className = 'cc-metric-group'
      td.setAttribute('colspan', totalSites + 1)
      tr.appendChild(td)
      tbody.appendChild(tr)
    }

    addGroupRow('Core Metrics')

    var mainMetrics = [
      { key: 'overall', label: 'Overall Score' },
      { key: 'performance', label: 'Performance Score' },
      { key: 'seo', label: 'SEO Score' },
      { key: 'accessibility', label: 'Accessibility Score' },
      { key: 'bestPractices', label: 'Best Practices Score' },
      { key: 'mobile', label: 'Mobile Friendliness' },
      { key: 'security', label: 'Security Score' }
    ]

    mainMetrics.forEach(function (m) {
      addMetricRow(m.label, scores.map(function (s) { return s[m.key] }))
    })

    addGroupRow('Core Web Vitals')

    var cwvMetrics = [
      { key: 'lcp', label: 'LCP (s)' },
      { key: 'cls', label: 'CLS' },
      { key: 'inp', label: 'INP (ms)' },
      { key: 'fcp', label: 'FCP (s)' }
    ]

    cwvMetrics.forEach(function (m) {
      addMetricRow(m.label, scores.map(function (s) { return s.coreWebVitals[m.key] }), true)
    })

    addGroupRow('Technical SEO')

    var techSeoMetrics = [
      { key: 'https', label: 'HTTPS' },
      { key: 'sitemap', label: 'XML Sitemap' },
      { key: 'robotsTxt', label: 'Robots.txt' },
      { key: 'metaDescription', label: 'Meta Description' },
      { key: 'canonicalTags', label: 'Canonical Tags' },
      { key: 'structuredData', label: 'Structured Data' },
      { key: 'openGraph', label: 'Open Graph Tags' }
    ]

    techSeoMetrics.forEach(function (m) {
      addMetricRow(m.label, scores.map(function (s) { return s.technicalSeo[m.key] }), true)
    })

    table.appendChild(tbody)
    container.appendChild(table)
  }

  /* ─── Render scorecard ─── */
  function renderScorecard (scorecard) {
    var winsEl = document.getElementById('ccScoreWins')
    var tiesEl = document.getElementById('ccScoreTies')
    var lossesEl = document.getElementById('ccScoreLosses')
    if (winsEl) winsEl.textContent = scorecard.wins
    if (tiesEl) tiesEl.textContent = scorecard.ties
    if (lossesEl) lossesEl.textContent = scorecard.losses
  }

  /* ─── Render gap analysis ─── */
  function renderGaps (gaps) {
    var container = document.getElementById('ccGapList')
    if (!container) return
    container.innerHTML = ''

    if (gaps.length === 0) {
      container.innerHTML =
        '<div class="cc-gap-empty">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg><br>' +
          'No significant gaps found — your website is competitive across all measured metrics!' +
        '</div>'
      return
    }

    gaps.forEach(function (gap) {
      var item = document.createElement('div')
      item.className = 'cc-gap-item'

      var iconSvgs = {
        score: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        speed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
        seo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        mobile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
        shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        access: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>',
        practices: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
        code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
        desc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
        sitemap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
        lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
        file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
      }

      item.innerHTML =
        '<div class="cc-gap-icon">' + (iconSvgs[gap.icon] || iconSvgs.score) + '</div>' +
        '<div class="cc-gap-content">' +
          '<strong>' + gap.metric + '</strong>' +
          '<p>' + gap.detail + '</p>' +
          '<span class="cc-gap-competitor">' +
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>' +
            gap.competitor.replace(/^https?:\/\//, '').split('/')[0] +
          '</span>' +
        '</div>'

      container.appendChild(item)
    })
  }

  /* ─── Render opportunity cards ─── */
  function renderOpportunities (opportunities) {
    var container = document.getElementById('ccOpportunityList')
    if (!container) return
    container.innerHTML = ''

    if (opportunities.length === 0) {
      container.innerHTML =
        '<div class="cc-gap-empty">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg><br>' +
          'No critical opportunities identified — your website is performing well against competitors!' +
        '</div>'
      return
    }

    opportunities.forEach(function (opp) {
      var card = document.createElement('div')
      card.className = 'cc-opp-card'

      var impactClass = 'cc-opp-card-impact--' + opp.impactLevel

      card.innerHTML =
        '<div class="cc-opp-card-header">' +
          '<div class="cc-opp-card-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
          '</div>' +
          '<div class="cc-opp-card-title">' + opp.issue + '</div>' +
        '</div>' +
        '<div class="cc-opp-card-body">' +
          '<div class="cc-opp-card-field">' +
            '<div class="cc-opp-card-field-label">Competitor Advantage</div>' +
            '<div class="cc-opp-card-field-value">' + opp.advantage + '</div>' +
          '</div>' +
          '<div class="cc-opp-card-field">' +
            '<div class="cc-opp-card-field-label">Recommended Action</div>' +
            '<div class="cc-opp-card-field-value">' + opp.action + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cc-opp-card-footer">' +
          '<span class="cc-opp-card-impact ' + impactClass + '">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' +
            (opp.impactLevel === 'high' ? 'High Impact' : opp.impactLevel === 'medium' ? 'Medium Impact' : 'Low Impact') +
          '</span>' +
          '<span class="cc-opp-card-action">' +
            opp.impact +
            ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
          '</span>' +
        '</div>'

      container.appendChild(card)
    })
  }

  /* ─── Render AI insights ─── */
  function renderAIInsights (summary) {
    var el = document.getElementById('ccInsightsText')
    if (!el) return
    el.innerHTML = summary
  }

  /* ─── Render charts ─── */
  function renderCharts (scores, urls) {
    var chartIds = ['ccChartOverall', 'ccChartSeo', 'ccChartPerformance']
    var chartLabels = ['Overall Score', 'SEO Score', 'Performance Score']
    var chartKeys = ['overall', 'seo', 'performance']

    if (typeof Chart === 'undefined') {
      chartIds.forEach(function (id) {
        var el = document.getElementById(id)
        if (el) el.innerHTML = '<div class="cc-chart-empty">Chart library not loaded</div>'
      })
      return
    }

    STATE.charts.forEach(function (c) { c.destroy() })
    STATE.charts = []

    var labels = scores.map(function (s, i) {
      return COMPETITOR_NAMES[i] || ('Site ' + (i + 1))
    })

    var bgColors = scores.map(function (s, i) {
      return COMPETITOR_COLORS[i] || '#FACC15'
    })

    chartKeys.forEach(function (key, idx) {
      var canvas = document.getElementById(chartIds[idx])
      if (!canvas) return

      var values = scores.map(function (s) { return s[key] })

      var chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: chartLabels[idx],
            data: values,
            backgroundColor: bgColors.map(function (c) {
              return c + '80'
            }),
            borderColor: bgColors,
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleColor: '#fff',
              bodyColor: '#a1a1aa',
              borderColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              cornerRadius: 8,
              padding: 12
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: {
                color: 'rgba(255,255,255,0.04)',
                drawBorder: false
              },
              ticks: {
                color: '#71717a',
                font: { size: 10 }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: '#71717a',
                font: { size: 10 }
              }
            }
          },
          animation: {
            duration: 1000,
            easing: 'easeOutQuart'
          }
        }
      })

      STATE.charts.push(chart)
    })
  }

  /* ─── Export functions ─── */

  function exportPDF (scores, urls, scorecard, gaps, opportunities, summary) {
    if (typeof window.jspdf === 'undefined') {
      loadPDFLibrary(function () {
        generatePDF(scores, urls, scorecard, gaps, opportunities, summary)
      })
    } else {
      generatePDF(scores, urls, scorecard, gaps, opportunities, summary)
    }
  }

  function loadPDFLibrary (callback) {
    var script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = callback
    script.onerror = function () { alert('Failed to load PDF library. Please try again.') }
    document.head.appendChild(script)
  }

  function generatePDF (scores, urls, scorecard, gaps, opportunities, summary) {
    var pdf = new window.jspdf.jsPDF('p', 'mm', 'a4')
    var pageW = 210
    var margin = 20
    var contentW = pageW - margin * 2
    var y = margin

    var gold = '#FACC15'
    var bgDark = '#0A0A0A'
    var textGray = '#a1a1aa'

    function setColor (hex) {
      var r = parseInt(hex.slice(1, 3), 16)
      var g = parseInt(hex.slice(3, 5), 16)
      var b = parseInt(hex.slice(5, 7), 16)
      pdf.setFillColor(r, g, b)
      pdf.setTextColor(r, g, b)
    }

    function rect (x, y, w, h, color) {
      setColor(color)
      pdf.rect(x, y, w, h, 'F')
    }

    pdf.setFillColor(4, 4, 4)
    pdf.rect(0, 0, pageW, 297, 'F')

    setColor(gold)
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Competitor Comparison Report', margin, y + 20)

    setColor('#ffffff')
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'normal')
    y += 36
    pdf.text('Your Website: ' + (urls[0] || 'N/A'), margin, y)

    y += 10
    setColor(textGray)
    pdf.setFontSize(10)
    urls.slice(1).forEach(function (u, i) {
      if (u) {
        y += 7
        pdf.text('Competitor ' + (i + 1) + ': ' + u, margin, y)
      }
    })

    y += 20
    setColor(gold)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Scorecard', margin, y)
    y += 10
    setColor('#ffffff')
    pdf.setFontSize(11)
    pdf.text('Wins: ' + scorecard.wins + '    Ties: ' + scorecard.ties + '    Losses: ' + scorecard.losses, margin, y)

    y += 20
    setColor(gold)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Scores Comparison', margin, y)
    y += 10

    var metrics = ['overall', 'performance', 'seo', 'accessibility', 'bestPractices', 'mobile', 'security']
    var metricLabels = ['Overall', 'Performance', 'SEO', 'Accessibility', 'Best Practices', 'Mobile', 'Security']

    metrics.forEach(function (m, i) {
      if (y > 260) {
        pdf.addPage()
        pdf.setFillColor(4, 4, 4)
        pdf.rect(0, 0, pageW, 297, 'F')
        y = margin
      }

      setColor('#ffffff')
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      var vals = scores.map(function (s) { return s[m] })
      pdf.text(metricLabels[i] + ': ' + vals.join(' | '), margin, y)
      y += 8
    })

    if (gaps.length > 0) {
      y += 10
      if (y > 240) {
        pdf.addPage()
        pdf.setFillColor(4, 4, 4)
        pdf.rect(0, 0, pageW, 297, 'F')
        y = margin
      }
      setColor(gold)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Gap Analysis', margin, y)
      y += 10

      gaps.forEach(function (gap) {
        if (y > 260) {
          pdf.addPage()
          pdf.setFillColor(4, 4, 4)
          pdf.rect(0, 0, pageW, 297, 'F')
          y = margin
        }
        setColor('#ffffff')
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.text(gap.metric + ': ' + gap.detail, margin, y)
        y += 6
      })
    }

    if (opportunities.length > 0) {
      y += 10
      if (y > 230) {
        pdf.addPage()
        pdf.setFillColor(4, 4, 4)
        pdf.rect(0, 0, pageW, 297, 'F')
        y = margin
      }
      setColor(gold)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Recommended Actions', margin, y)
      y += 10

      opportunities.slice(0, 5).forEach(function (opp) {
        if (y > 255) {
          pdf.addPage()
          pdf.setFillColor(4, 4, 4)
          pdf.rect(0, 0, pageW, 297, 'F')
          y = margin
        }
        setColor('#ffffff')
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.text(opp.issue, margin, y)
        y += 5
        setColor(textGray)
        pdf.setFont('helvetica', 'normal')
        pdf.text(opp.action, margin + 5, y)
        y += 6
      })
    }

    y += 10
    if (y > 240) {
      pdf.addPage()
      pdf.setFillColor(4, 4, 4)
      pdf.rect(0, 0, pageW, 297, 'F')
      y = margin
    }
    setColor(gold)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('AI Insights', margin, y)
    y += 10
    setColor(textGray)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    var insightLines = pdf.splitTextToSize(summary.replace(/<[^>]+>/g, ''), contentW)
    insightLines.forEach(function (line) {
      if (y > 280) {
        pdf.addPage()
        pdf.setFillColor(4, 4, 4)
        pdf.rect(0, 0, pageW, 297, 'F')
        y = margin
      }
      pdf.text(line, margin, y)
      y += 5
    })

    pdf.save('Competitor-Comparison-Report.pdf')
  }

  function exportShare (scores, urls, scorecard, gaps, opportunities, summary) {
    var text = 'Competitor Comparison Report\n'
    text += '========================\n\n'
    text += 'Your Website: ' + (urls[0] || 'N/A') + '\n\n'
    urls.slice(1).forEach(function (u, i) {
      if (u) text += 'Competitor ' + (i + 1) + ': ' + u + '\n'
    })
    text += '\nScorecard\n'
    text += 'Wins: ' + scorecard.wins + ' | Ties: ' + scorecard.ties + ' | Losses: ' + scorecard.losses + '\n\n'

    text += 'Scores:\n'
    var metricLabels = ['Overall', 'Performance', 'SEO', 'Accessibility', 'Best Practices', 'Mobile', 'Security']
    var metrics = ['overall', 'performance', 'seo', 'accessibility', 'bestPractices', 'mobile', 'security']
    metrics.forEach(function (m, i) {
      var vals = scores.map(function (s) { return s[m] })
      text += '  ' + metricLabels[i] + ': ' + vals.join(' | ') + '\n'
    })

    text += '\nGap Analysis:\n'
    if (gaps.length === 0) {
      text += '  No significant gaps found.\n'
    } else {
      gaps.forEach(function (gap) {
        text += '  - ' + gap.metric + ': ' + gap.detail + '\n'
      })
    }

    text += '\n' + summary.replace(/<[^>]+>/g, '') + '\n\n'
    text += 'Generated by Nagriva Competitor Comparison Tool\n'
    text += window.location.href

    if (navigator.share) {
      navigator.share({
        title: 'Competitor Comparison Report',
        text: text,
        url: window.location.href
      }).catch(function () {})
    } else {
      var ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        alert('Report summary copied to clipboard!')
      } catch (e) {}
      document.body.removeChild(ta)
    }
  }

  function exportEmail (scores, urls, gaps, summary) {
    var subject = encodeURIComponent('Competitor Comparison Report - Nagriva')
    var body = encodeURIComponent(
      'Check out my competitor comparison report:\n\n' +
      'Your Website: ' + (urls[0] || 'N/A') + '\n\n' +
      (gaps.length > 0 ? 'Top gaps found: ' + gaps.slice(0, 3).map(function (g) { return g.metric }).join(', ') + '\n\n' : '') +
      summary.replace(/<[^>]+>/g, '') + '\n\n' +
      'View full report: ' + window.location.href
    )
    window.location.href = 'mailto:?subject=' + subject + '&body=' + body
  }

  /* ─── Show results ─── */
  function showResults (urls, scores) {
    STATE.urls = urls
    STATE.scores = scores

    var scorecard = calculateScorecard(scores)
    var gaps = generateGaps(scores, urls)
    var opportunities = generateOpportunities(gaps, scores)
    var summary = generateAIInsights(scores, urls, scorecard, gaps)

    renderScorecard(scorecard)
    renderTable(scores, urls)
    renderGaps(gaps)
    renderOpportunities(opportunities)
    renderAIInsights(summary)

    setTimeout(function () {
      renderCharts(scores, urls)
    }, 200)

    var resultsSection = document.getElementById('ccResultsSection')
    if (resultsSection) resultsSection.classList.add('active')

    /* Scroll to results */
    setTimeout(function () {
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)

    /* Setup export buttons */
    setupExportButtons(scores, urls, scorecard, gaps, opportunities, summary)
  }

  /* ─── Setup export buttons ─── */
  function setupExportButtons (scores, urls, scorecard, gaps, opportunities, summary) {
    var pdfBtn = document.getElementById('ccExportPdf')
    var shareBtn = document.getElementById('ccExportShare')
    var emailBtn = document.getElementById('ccExportEmail')

    if (pdfBtn) {
      pdfBtn.onclick = function () {
        exportPDF(scores, urls, scorecard, gaps, opportunities, summary)
      }
    }
    if (shareBtn) {
      shareBtn.onclick = function () {
        exportShare(scores, urls, scorecard, gaps, opportunities, summary)
      }
    }
    if (emailBtn) {
      emailBtn.onclick = function () {
        exportEmail(scores, urls, gaps, summary)
      }
    }
  }

  /* ─── Form submit ─── */
  function handleSubmit (e) {
    e.preventDefault()

    var yourUrl = document.getElementById('ccYourUrl').value.trim()
    var comp1 = document.getElementById('ccComp1').value.trim()
    var comp2 = document.getElementById('ccComp2').value.trim()
    var comp3 = document.getElementById('ccComp3').value.trim()

    if (!yourUrl) {
      document.getElementById('ccYourUrl').classList.add('cc-input-error')
      return
    }

    document.querySelectorAll('.cc-input-error').forEach(function (el) {
      el.classList.remove('cc-input-error')
    })

    var urls = [normalizeUrl(yourUrl)]
    if (comp1) urls.push(normalizeUrl(comp1))
    if (comp2) urls.push(normalizeUrl(comp2))
    if (comp3) urls.push(normalizeUrl(comp3))

    var validUrls = urls.filter(function (u) { return isValidUrl(u) })
    if (validUrls.length < 2) {
      alert('Please enter at least one competitor URL.')
      return
    }

    /* Show loading */
    var formView = document.getElementById('ccFormView')
    var loadingView = document.getElementById('ccLoadingView')
    var resultsView = document.getElementById('ccResultsSection')

    if (formView) formView.style.display = 'none'
    if (loadingView) loadingView.classList.add('active')
    if (resultsView) resultsView.classList.remove('active')

    var displayUrls = urls.map(function (u) {
      return u.replace(/^https?:\/\//, '').split('/')[0]
    })
    var loadingUrlsEl = document.getElementById('ccLoadingUrls')
    if (loadingUrlsEl) {
      loadingUrlsEl.innerHTML = displayUrls.map(function (u) {
        return '<span class="cc-loading-url"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' + u + '</span>'
      }).join('')
    }

    var loadingMsgs = document.querySelectorAll('#ccLoadingView .cc-loading-msg')
    var msgIdx = 0
    var progress = 0

    var msgInterval = setInterval(function () {
      loadingMsgs.forEach(function (m) { m.classList.remove('active') })
      msgIdx = (msgIdx + 1) % loadingMsgs.length
      loadingMsgs[msgIdx].classList.add('active')
    }, 1300)

    var progressInterval = setInterval(function () {
      progress += Math.random() * 7 + 2
      if (progress >= 100) {
        progress = 100
        clearInterval(progressInterval)
        clearInterval(msgInterval)

        var fill = document.getElementById('ccProgressFill')
        var pct = document.getElementById('ccProgressPct')
        if (fill) fill.style.width = '100%'
        if (pct) pct.textContent = '100%'

        setTimeout(function () {
          if (loadingView) loadingView.classList.remove('active')

          var scores = generateAllScores(urls)
          showResults(urls, scores)
        }, 500)
      }
      var fill = document.getElementById('ccProgressFill')
      var pct = document.getElementById('ccProgressPct')
      if (fill) fill.style.width = Math.min(progress, 100) + '%'
      if (pct) pct.textContent = Math.min(Math.round(progress), 100) + '%'
    }, 200)
  }

  /* ─── Init ─── */
  function init () {
    var form = document.getElementById('ccForm')
    if (!form) return

    form.addEventListener('submit', handleSubmit)

    document.getElementById('ccYourUrl').addEventListener('input', function () {
      this.classList.remove('cc-input-error')
    })
  }

  /* ─── Public API ─── */
  return {
    init: init,
    showResults: showResults,
    generateAllScores: generateAllScores
  }
})()
