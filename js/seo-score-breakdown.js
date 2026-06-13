/* ════════════════════════════════════════════════════════
   NAGRIVA — SEO Score Breakdown Module
   Generates interactive, detailed SEO score breakdown
   with category cards, checks, and improvement opportunities.
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_SEOScoreBreakdown = (function () {
  'use strict';

  /* ─── SVG Icons ─── */
  var ICONS = {
    breakdown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/><line x1="19" y1="17" x2="19" y2="21"/><line x1="17" y1="19" x2="21" y2="19"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    meta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    heading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16"/><path d="M18 4v16"/><path d="M6 12h12"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    smartPhone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>'
  };

  /* ─── Category Definitions ─── */
  var CATEGORIES = [
    {
      id: 'meta-tags',
      name: 'Meta Tags',
      maxPoints: 15,
      icon: 'meta',
      checks: function (scores, recs) {
        var metaDescRec = recs.find(function (r) { return r.id === 'meta-desc'; });
        var ogRec = recs.find(function (r) { return r.id === 'open-graph'; });
        return [
          { name: 'Title Tag Present', status: 'passed' },
          { name: 'Meta Description Present', status: !metaDescRec ? 'passed' : 'failed' },
          { name: 'Meta Description Length', status: scores.seo >= 75 ? 'passed' : (scores.seo >= 60 ? 'warning' : 'failed') },
          { name: 'Open Graph Tags', status: !ogRec ? 'passed' : 'failed' }
        ];
      },
      actions: function (scores) {
        var actions = [];
        if (scores.seo < 75) actions.push('Optimize meta description length to 150-160 characters');
        if (scores.seo < 70) actions.push('Add Open Graph tags for social sharing');
        if (scores.seo < 65) actions.push('Add unique meta descriptions to all pages');
        if (scores.seo < 60) actions.push('Review and optimize page title tags');
        return actions;
      }
    },
    {
      id: 'headings',
      name: 'Headings Structure',
      maxPoints: 10,
      icon: 'heading',
      checks: function (scores, recs) {
        var headingRec = recs.find(function (r) { return r.id === 'heading-structure'; });
        return [
          { name: 'Single H1 Tag Per Page', status: (!headingRec || scores.seo >= 75) ? 'passed' : 'failed' },
          { name: 'Proper Heading Hierarchy', status: (!headingRec || scores.seo >= 70) ? 'passed' : 'warning' },
          { name: 'Headings Contain Keywords', status: scores.seo >= 65 ? 'passed' : 'warning' },
          { name: 'No Skipped Heading Levels', status: (!headingRec || scores.seo >= 68) ? 'passed' : 'failed' }
        ];
      },
      actions: function (scores) {
        var actions = [];
        if (scores.seo < 75) actions.push('Use one unique H1 tag per page');
        if (scores.seo < 70) actions.push('Maintain logical H1 > H2 > H3 hierarchy');
        if (scores.seo < 65) actions.push('Include relevant keywords in headings');
        if (scores.seo < 68) actions.push('Fix skipped heading levels');
        return actions;
      }
    },
    {
      id: 'technical-seo',
      name: 'Technical SEO',
      maxPoints: 20,
      icon: 'code',
      checks: function (scores, recs) {
        var sitemapRec = recs.find(function (r) { return r.id === 'sitemap'; });
        var httpsRec = recs.find(function (r) { return r.id === 'https'; });
        var altRec = recs.find(function (r) { return r.id === 'alt-text'; });
        return [
          { name: 'XML Sitemap Found', status: !sitemapRec ? 'passed' : 'failed' },
          { name: 'robots.txt Present', status: scores.seo >= 60 ? 'passed' : 'warning' },
          { name: 'Image Alt Attributes', status: !altRec ? 'passed' : (altRec && scores.seo >= 70 ? 'passed' : 'failed') },
          { name: 'URL Structure Clean', status: scores.seo >= 65 ? 'passed' : 'warning' },
          { name: 'Canonical Tags Present', status: scores.seo >= 55 ? 'passed' : 'warning' }
        ];
      },
      actions: function (scores) {
        var actions = [];
        if (scores.seo < 60) actions.push('Create and submit XML sitemap to Google');
        if (scores.seo < 60) actions.push('Add robots.txt file to guide crawlers');
        if (scores.seo < 70) actions.push('Add descriptive alt text to all images');
        if (scores.seo < 65) actions.push('Clean up URL structure removing parameters');
        if (scores.seo < 55) actions.push('Add canonical tags to prevent duplicate content');
        return actions;
      }
    },
    {
      id: 'core-web-vitals',
      name: 'Core Web Vitals',
      maxPoints: 20,
      icon: 'activity',
      checks: function (scores, recs) {
        var lcpRec = recs.find(function (r) { return r.id === 'lcp'; });
        var ttfbRec = recs.find(function (r) { return r.id === 'ttfb'; });
        var vitalsRec = recs.find(function (r) { return r.id === 'core-web-vitals'; });
        var compressRec = recs.find(function (r) { return r.id === 'compression'; });
        return [
          { name: 'Largest Contentful Paint (LCP)', status: !lcpRec ? 'passed' : (scores.perf >= 50 ? 'warning' : 'failed') },
          { name: 'Time to First Byte (TTFB)', status: !ttfbRec ? 'passed' : (scores.perf >= 55 ? 'warning' : 'failed') },
          { name: 'First Input Delay (FID)', status: (!vitalsRec || scores.perf >= 70) ? 'passed' : 'warning' },
          { name: 'Cumulative Layout Shift (CLS)', status: scores.ux >= 70 ? 'passed' : 'warning' },
          { name: 'Gzip / Brotli Compression', status: !compressRec ? 'passed' : 'warning' }
        ];
      },
      actions: function (scores) {
        var actions = [];
        if (scores.perf < 50) actions.push('Optimize LCP by improving server response and image loading');
        if (scores.perf < 55) actions.push('Reduce TTFB with CDN, caching, and faster hosting');
        if (scores.perf < 70) actions.push('Minimize FID by reducing JavaScript execution time');
        if (scores.ux < 70) actions.push('Fix CLS by setting explicit dimensions on media elements');
        if (scores.perf < 65) actions.push('Enable Gzip or Brotli compression to reduce page weight');
        return actions;
      }
    },
    {
      id: 'mobile',
      name: 'Mobile Friendliness',
      maxPoints: 15,
      icon: 'smartPhone',
      checks: function (scores, recs) {
        var mobileRec = recs.find(function (r) { return r.id === 'mobile'; });
        return [
          { name: 'Responsive Design', status: !mobileRec ? 'passed' : 'failed' },
          { name: 'Tap Target Sizing', status: !mobileRec || scores.mobile >= 65 ? 'passed' : 'warning' },
          { name: 'Font Size Readable', status: scores.mobile >= 60 ? 'passed' : 'warning' },
          { name: 'No Horizontal Scrolling', status: scores.mobile >= 55 ? 'passed' : 'failed' },
          { name: 'Viewport Meta Tag', status: scores.mobile >= 65 ? 'passed' : 'failed' }
        ];
      },
      actions: function (scores) {
        var actions = [];
        if (scores.mobile < 55) actions.push('Implement responsive design with CSS media queries');
        if (scores.mobile < 65) actions.push('Ensure tap targets are at least 48px');
        if (scores.mobile < 60) actions.push('Use readable font sizes (min 16px for body text)');
        if (scores.mobile < 55) actions.push('Eliminate horizontal scrolling on mobile devices');
        if (scores.mobile < 65) actions.push('Add proper viewport meta tag');
        return actions;
      }
    },
    {
      id: 'security',
      name: 'Security',
      maxPoints: 10,
      icon: 'shield',
      checks: function (scores, recs) {
        var httpsRec = recs.find(function (r) { return r.id === 'https'; });
        return [
          { name: 'HTTPS Enabled', status: !httpsRec || scores.security >= 80 ? 'passed' : 'failed' },
          { name: 'SSL Certificate Valid', status: scores.security >= 70 ? 'passed' : 'warning' },
          { name: 'Mixed Content Free', status: scores.security >= 60 ? 'passed' : 'warning' },
          { name: 'HSTS Header Present', status: scores.security >= 55 ? 'passed' : 'warning' }
        ];
      },
      actions: function (scores) {
        var actions = [];
        if (scores.security < 80) actions.push('Ensure HTTPS is enabled across all pages');
        if (scores.security < 70) actions.push('Install a valid SSL certificate');
        if (scores.security < 60) actions.push('Fix mixed content issues (HTTP resources on HTTPS pages)');
        if (scores.security < 55) actions.push('Add HSTS header for enhanced security');
        return actions;
      }
    },
    {
      id: 'structured-data',
      name: 'Structured Data',
      maxPoints: 10,
      icon: 'database',
      checks: function (scores, recs) {
        var sdRec = recs.find(function (r) { return r.id === 'structured-data'; });
        var accRec = recs.find(function (r) { return r.id === 'accessibility'; });
        return [
          { name: 'Schema.org Markup Present', status: !sdRec ? 'passed' : 'failed' },
          { name: 'JSON-LD Format Used', status: !sdRec ? 'passed' : 'warning' },
          { name: 'Rich Results Eligible', status: scores.seo >= 75 ? 'passed' : 'warning' },
          { name: 'Breadcrumb Structured Data', status: scores.seo >= 70 ? 'passed' : 'warning' }
        ];
      },
      actions: function (scores) {
        var actions = [];
        if (scores.seo < 72) actions.push('Add schema.org structured data using JSON-LD format');
        if (scores.seo < 75) actions.push('Implement rich result markup (Review, FAQ, Product)');
        if (scores.seo < 70) actions.push('Add breadcrumb structured data for navigation');
        if (scores.seo < 65) actions.push('Test structured data with Google\'s Rich Results Test');
        return actions;
      }
    }
  ];

  /* ─── Helpers ─── */

  function getGrade(score) {
    if (score >= 90) return { grade: 'A', color: '#10B981', label: 'Excellent' };
    if (score >= 80) return { grade: 'B', color: '#FACC15', label: 'Good' };
    if (score >= 70) return { grade: 'C', color: '#F97316', label: 'Fair' };
    if (score >= 60) return { grade: 'D', color: '#F97316', label: 'Poor' };
    return { grade: 'F', color: '#EF4444', label: 'Critical' };
  }

  function getCategoryStatus(earned, max) {
    var pct = earned / max;
    if (pct >= 0.8) return 'pass';
    if (pct >= 0.5) return 'warn';
    return 'fail';
  }

  function getCircleCircumference(r) {
    return 2 * Math.PI * r;
  }

  function calculateCategoryScore(category, scores, recs) {
    var checks = category.checks(scores, recs);
    var passed = 0;
    var warned = 0;
    var failed = 0;
    checks.forEach(function (c) {
      if (c.status === 'passed') passed++;
      else if (c.status === 'warning') warned++;
      else failed++;
    });
    var total = checks.length;
    var earned = Math.round((passed / total) * category.maxPoints + (warned / total) * category.maxPoints * 0.5);
    return { earned: earned, max: category.maxPoints, passed: passed, warned: warned, failed: failed, checks: checks };
  }

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

  /* ─── Render ─── */

  function renderBreakdown(containerId, scores, recommendations) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var overall = scores.overall || 0;
    var gradeInfo = getGrade(overall);
    var totalEarned = 0;
    var totalMax = 100;

    /* Calculate each category */
    var categoryResults = CATEGORIES.map(function (cat) {
      var result = calculateCategoryScore(cat, scores, recommendations);
      totalEarned += result.earned;
      return { def: cat, result: result };
    });

    /* Determine status counts */
    var totalPassed = 0;
    var totalWarned = 0;
    var totalFailed = 0;
    categoryResults.forEach(function (cr) {
      totalPassed += cr.result.passed;
      totalWarned += cr.result.warned;
      totalFailed += cr.result.failed;
    });

    /* Generate AI explanation */
    var aiSummary = generateAISummary(overall, categoryResults, recommendations);

    /* Build HTML */
    var html = '';

    /* Section header */
    html += '<div class="sb-header">';
    html += '<div class="sb-header-left">';
    html += '<div class="sb-header-icon">' + ICONS.breakdown + '</div>';
    html += '<div class="sb-header-text">';
    html += '<h3>SEO Score Breakdown</h3>';
    html += '<p>See the factors contributing to your SEO score and identify improvement opportunities.</p>';
    html += '</div>';
    html += '</div>';
    html += '<span class="sb-header-badge">' + overall + '/100</span>';
    html += '</div>';

    /* AI Explanation Box */
    html += '<div class="sb-ai-box">';
    html += '<div class="sb-ai-box-icon">' + ICONS.sparkles + '</div>';
    html += '<div class="sb-ai-box-text">' + aiSummary + '</div>';
    html += '<span class="sb-ai-box-label">AI</span>';
    html += '</div>';

    /* Overall Score Card */
    var circ = getCircleCircumference(56);
    var offset = circ - (overall / 100) * circ;
    html += '<div class="sb-overall-card">';
    html += '<div class="sb-overall-ring">';
    html += '<svg viewBox="0 0 140 140">';
    html += '<circle class="sb-overall-ring-bg" cx="70" cy="70" r="56"/>';
    html += '<circle class="sb-overall-ring-fill" cx="70" cy="70" r="56" stroke="' + gradeInfo.color + '" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '"/>';
    html += '</svg>';
    html += '<div class="sb-overall-ring-center">';
    html += '<span class="sb-overall-ring-score" style="color:' + gradeInfo.color + ';">' + overall + '</span>';
    html += '<span class="sb-overall-ring-label">Score</span>';
    html += '</div>';
    html += '</div>';
    html += '<div class="sb-overall-info">';
    html += '<div class="sb-overall-title">Grade ' + gradeInfo.grade + ' &mdash; ' + gradeInfo.label + '</div>';
    html += '<div class="sb-overall-desc">Your website has been analyzed across 7 key SEO categories. ';
    html += '<strong>' + totalPassed + '</strong> checks passed, <strong>' + totalWarned + '</strong> warnings, <strong>' + totalFailed + '</strong> failures found.</div>';
    html += '<div class="sb-overall-grade-row">';
    html += '<span class="sb-overall-grade" style="color:' + gradeInfo.color + ';background:' + gradeInfo.color + '15;border-color:' + gradeInfo.color + '33;">';
    html += ICONS.check + ' Grade ' + gradeInfo.grade;
    html += '</span>';
    html += '<span class="sb-overall-points">';
    html += '<strong>' + totalEarned + '</strong> / ' + totalMax + ' points earned';
    html += '</span>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    /* Category Cards Grid */
    html += '<div class="sb-grid" id="sbGrid">';

    categoryResults.forEach(function (cr, idx) {
      var cat = cr.def;
      var res = cr.result;
      var pct = Math.round((res.earned / res.max) * 100);
      var status = getCategoryStatus(res.earned, res.max);
      var statusColor = status === 'pass' ? '#10B981' : status === 'warn' ? '#FACC15' : '#EF4444';
      var iconHtml = ICONS[cat.icon] || ICONS.meta;

      html += '<div class="sb-card" data-category="' + cat.id + '">';
      html += '<div class="sb-card-top">';
      html += '<div class="sb-card-icon" style="background:' + statusColor + '15;border:1px solid ' + statusColor + '25;color:' + statusColor + ';">' + iconHtml + '</div>';
      html += '<div class="sb-card-body">';
      html += '<div class="sb-card-name">' + cat.name + '</div>';
      html += '<div class="sb-card-progress-row">';
      html += '<div class="sb-card-progress-track">';
      html += '<div class="sb-card-progress-fill" style="width:0%;background:' + statusColor + ';" data-width="' + pct + '"></div>';
      html += '</div>';
      html += '<span class="sb-card-score" style="color:' + statusColor + ';">' + res.earned + '<span class="sb-card-score-denom">/' + res.max + '</span></span>';
      html += '</div>';
      html += '</div>';
      html += '<span class="sb-status-badge sb-status-badge--' + status + '">' + (status === 'pass' ? 'Good' : status === 'warn' ? 'Fair' : 'Poor') + '</span>';
      html += '<span class="sb-card-chevron">' + ICONS.chevronDown + '</span>';
      html += '</div>';

      /* Expandable Details */
      html += '<div class="sb-card-details">';
      html += '<div class="sb-card-details-inner">';

      /* Checks grouped by status */
      var checks = res.checks;

      /* Passed */
      var passedChecks = checks.filter(function (c) { return c.status === 'passed'; });
      if (passedChecks.length > 0) {
        html += '<div class="sb-checks-group">';
        html += '<div class="sb-checks-label sb-checks-label--pass">' + ICONS.check + ' Passed</div>';
        passedChecks.forEach(function (c) {
          html += '<div class="sb-check-item sb-check-item--pass">' + ICONS.check + ' ' + c.name + '</div>';
        });
        html += '</div>';
      }

      /* Warnings */
      var warnChecks = checks.filter(function (c) { return c.status === 'warning'; });
      if (warnChecks.length > 0) {
        html += '<div class="sb-checks-group">';
        html += '<div class="sb-checks-label sb-checks-label--warn">' + ICONS.warning + ' Warnings</div>';
        warnChecks.forEach(function (c) {
          html += '<div class="sb-check-item sb-check-item--warn">' + ICONS.warning + ' ' + c.name + '</div>';
        });
        html += '</div>';
      }

      /* Failed */
      var failChecks = checks.filter(function (c) { return c.status === 'failed'; });
      if (failChecks.length > 0) {
        html += '<div class="sb-checks-group">';
        html += '<div class="sb-checks-label sb-checks-label--fail">' + ICONS.cross + ' Failed</div>';
        failChecks.forEach(function (c) {
          html += '<div class="sb-check-item sb-check-item--fail">' + ICONS.cross + ' ' + c.name + '</div>';
        });
        html += '</div>';
      }

      /* Improvement Opportunity */
      var actions = cat.actions(scores);
      if (failChecks.length > 0 || warnChecks.length > 0) {
        var potential = Math.round((passedChecks.length / checks.length) * cat.maxPoints +
          (warnChecks.length / checks.length) * cat.maxPoints * 0.8);
        var gain = Math.max(0, potential - res.earned);
        html += '<div class="sb-improve">';
        html += '<div class="sb-improve-header">';
        html += '<span class="sb-improve-label">Improvement Opportunity</span>';
        html += '<span class="sb-improve-gain">+' + gain + ' points</span>';
        html += '</div>';
        html += '<div class="sb-improve-scores">';
        html += '<div class="sb-improve-score-item">';
        html += '<span class="sb-improve-score-value">' + res.earned + '/' + res.max + '</span>';
        html += '<span class="sb-improve-score-label">Current Score</span>';
        html += '</div>';
        html += '<span class="sb-improve-arrow">&rarr;</span>';
        html += '<div class="sb-improve-score-item">';
        html += '<span class="sb-improve-score-value">' + potential + '/' + res.max + '</span>';
        html += '<span class="sb-improve-score-label">Potential Score</span>';
        html += '</div>';
        html += '</div>';
        html += '<ul class="sb-improve-actions">';
        actions.forEach(function (a) {
          html += '<li class="sb-improve-action">' + a + '</li>';
        });
        html += '</ul>';
        html += '</div>';
      }

      html += '</div>';
      html += '</div>';
      html += '</div>';
    });

    html += '</div>';

    container.innerHTML = html;

    /* ─── Animate progress bars ─── */
    requestAnimationFrame(function () {
      var fills = qsa('.sb-card-progress-fill', container);
      fills.forEach(function (el) {
        var w = el.getAttribute('data-width');
        if (w) {
          requestAnimationFrame(function () {
            el.style.width = w + '%';
          });
        }
      });
    });

    /* ─── Setup expand/collapse ─── */
    var cards = qsa('.sb-card', container);
    cards.forEach(function (card) {
      var top = qs('.sb-card-top', card);
      top.addEventListener('click', function () {
        var isOpen = card.classList.contains('open');
        card.classList.toggle('open');
      });
    });
  }

  /* ─── Generate AI Explanation ─── */
  function generateAISummary(overall, categoryResults, recommendations) {
    var weakest = [];
    var strongest = [];
    var gainTotal = 0;
    var worstCategory = null;

    categoryResults.forEach(function (cr) {
      var res = cr.result;
      var pct = res.earned / res.max;
      var potential = Math.round((res.passed / res.checks.length) * res.max +
        (res.warned / res.checks.length) * res.max * 0.8);
      var gain = Math.max(0, potential - res.earned);
      gainTotal += gain;

      if (pct < 0.5) {
        weakest.push(cr.def.name);
        if (!worstCategory || pct < (worstCategory.pct || 1)) {
          worstCategory = { name: cr.def.name, pct: pct };
        }
      } else if (pct >= 0.8) {
        strongest.push(cr.def.name);
      }
    });

    var parts = [];
    if (overall >= 85) {
      parts.push('Your SEO score is <strong>strong</strong>');
    } else if (overall >= 70) {
      parts.push('Your SEO score is <strong>on the right track</strong>');
    } else if (overall >= 55) {
      parts.push('Your SEO score has <strong>significant room for improvement</strong>');
    } else {
      parts.push('Your SEO score <strong>requires urgent attention</strong>');
    }

    if (weakest.length > 0) {
      parts.push('and is primarily affected by <strong>' + weakest.join(', ') + '</strong>');
    }

    if (strongest.length > 0 && weakest.length > 0) {
      parts.push(', while <strong>' + strongest.join(', ') + '</strong> are performing well');
    }

    if (gainTotal > 0) {
      parts.push('. Addressing these issues could improve your score by <strong>' + gainTotal + ' points</strong>');
    }

    parts.push('.');

    var highCount = recommendations.filter(function (r) { return r.priority === 'high' || r.priority === 'critical'; }).length;
    var medCount = recommendations.filter(function (r) { return r.priority === 'medium'; }).length;

    if (highCount > 0 || medCount > 0) {
      parts.push(' We found <strong>' + highCount + ' high-priority</strong> and <strong>' + medCount + ' medium-priority</strong> issues to address.');
    }

    return parts.join('');
  }

  /* ─── Public API ─── */

  return {
    render: function (containerId, scores, recommendations) {
      if (!containerId || !scores) return;
      renderBreakdown(containerId, scores, recommendations || []);
    },

    destroy: function () {
    }
  };
})();
