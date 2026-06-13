/* ════════════════════════════════════════════════════════
   NAGRIVA — AI Insights Engine
   Transforms raw audit data into intelligent, human-readable
   insights and action plans.
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_AIInsights = (function () {
  'use strict';

  /* ───────────────────────────────────────────────
     HELPERS
     ─────────────────────────────────────────────── */

  function getScoreLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 65) return 'Fair';
    if (score >= 50) return 'Poor';
    return 'Critical';
  }

  function getScoreColor(score) {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#FACC15';
    return '#ef4444';
  }

  /* ───────────────────────────────────────────────
     1. EXECUTIVE SUMMARY
     ─────────────────────────────────────────────── */

  function generateExecutiveSummary(scores, recommendations) {
    var overall = scores.overall;
    var highCount = recommendations.filter(function (r) { return r.priority === 'high' || r.priority === 'critical'; }).length;
    var mediumCount = recommendations.filter(function (r) { return r.priority === 'medium'; }).length;
    var strongAreas = [];
    var weakAreas = [];

    if (scores.perf >= 80) strongAreas.push('strong performance');
    else if (scores.perf < 60) weakAreas.push('performance bottlenecks');
    if (scores.seo >= 80) strongAreas.push('solid SEO foundation');
    else if (scores.seo < 60) weakAreas.push('critical SEO issues');
    else if (scores.seo < 75) weakAreas.push('several technical SEO issues');
    if (scores.mobile >= 80) strongAreas.push('excellent mobile experience');
    else if (scores.mobile < 60) weakAreas.push('poor mobile optimization');
    if (scores.ux >= 80) strongAreas.push('good user experience');
    else if (scores.ux < 60) weakAreas.push('user experience concerns');

    var parts = [];

    if (overall >= 85) {
      parts.push('Your website has a <strong>strong foundation</strong>');
    } else if (overall >= 70) {
      parts.push('Your website is <strong>on the right track</strong>');
    } else if (overall >= 55) {
      parts.push('Your website has <strong>significant room for improvement</strong>');
    } else {
      parts.push('Your website <strong>requires urgent improvements</strong>');
    }

    if (strongAreas.length > 0) {
      parts.push('with ' + strongAreas.join(' and '));
    }

    if (weakAreas.length > 0) {
      if (strongAreas.length > 0) {
        parts.push(', but ' + weakAreas.join(' and ') + ' are limiting growth');
      } else {
        parts.push(', as ' + weakAreas.join(' and ') + ' are holding back performance');
      }
    } else {
      parts.push(', with minimal issues detected across all categories');
    }

    parts.push('.');

    if (highCount > 0 || mediumCount > 0) {
      parts.push(' We identified <strong>' + highCount + ' critical</strong> and <strong>' + mediumCount + ' medium-priority</strong> improvements that could significantly impact your search rankings and user experience.');
    }

    return parts.join('');
  }

  /* ───────────────────────────────────────────────
     2. STRENGTHS
     ─────────────────────────────────────────────── */

  function generateStrengths(scores) {
    var strengths = [];

    if (scores.perf >= 80) strengths.push({ text: 'Fast page load speed', icon: 'speed' });
    else if (scores.perf >= 70) strengths.push({ text: 'Good page load speed', icon: 'speed' });

    if (scores.mobile >= 80) strengths.push({ text: 'Strong mobile experience', icon: 'mobile' });

    if (scores.security >= 85) strengths.push({ text: 'Secure HTTPS implementation', icon: 'shield' });
    else if (scores.security >= 75) strengths.push({ text: 'Good security configuration', icon: 'shield' });

    if (scores.ux >= 80) strengths.push({ text: 'Good Core Web Vitals', icon: 'vitals' });

    if (scores.seo >= 85) strengths.push({ text: 'Well-optimized SEO structure', icon: 'seo' });
    else if (scores.seo >= 75) strengths.push({ text: 'Decent SEO foundation', icon: 'seo' });

    if (scores.overall >= 85) strengths.push({ text: 'Overall healthy website', icon: 'health' });

    if (strengths.length === 0) {
      strengths.push({ text: 'Baseline web standards met', icon: 'baseline' });
    }

    return strengths;
  }

  /* ───────────────────────────────────────────────
     3. WEAKNESSES
     ─────────────────────────────────────────────── */

  function generateWeaknesses(scores, recommendations) {
    var weaknesses = [];

    var hasStructuredData = recommendations.some(function (r) { return r.id === 'structured-data'; });
    var hasSitemap = recommendations.some(function (r) { return r.id === 'sitemap'; });
    var hasMeta = recommendations.some(function (r) { return r.id === 'meta-desc'; });
    var hasAlt = recommendations.some(function (r) { return r.id === 'alt-text'; });

    if (hasStructuredData) weaknesses.push({ text: 'Missing structured data markup', icon: 'schema' });
    if (hasSitemap) weaknesses.push({ text: 'Missing XML sitemap', icon: 'sitemap' });

    if (scores.ux < 60) weaknesses.push({ text: 'Poor accessibility standards', icon: 'access' });
    else if (scores.ux < 75) weaknesses.push({ text: 'Accessibility needs improvement', icon: 'access' });

    if (scores.mobile < 60) weaknesses.push({ text: 'Weak mobile optimization', icon: 'mobile' });

    if (hasMeta) weaknesses.push({ text: 'Missing or poor meta descriptions', icon: 'desc' });
    if (hasAlt) weaknesses.push({ text: 'Images missing alt text', icon: 'image' });

    if (scores.seo < 60) weaknesses.push({ text: 'Critical SEO gaps detected', icon: 'seo' });

    if (scores.perf < 50) weaknesses.push({ text: 'Slow page load speed', icon: 'speed' });

    var hasLcp = recommendations.some(function (r) { return r.id === 'lcp'; });
    if (hasLcp) weaknesses.push({ text: 'Poor Largest Contentful Paint (LCP)', icon: 'lcp' });

    var hasBroken = recommendations.some(function (r) { return r.id === 'broken-links'; });
    if (hasBroken) weaknesses.push({ text: 'Broken links detected', icon: 'broken' });

    if (weaknesses.length === 0) {
      weaknesses.push({ text: 'No critical issues detected', icon: 'check' });
    }

    return weaknesses;
  }

  /* ───────────────────────────────────────────────
     4. GROWTH OPPORTUNITIES
     ─────────────────────────────────────────────── */

  function generateGrowthOpportunities(scores, recommendations) {
    var oppDefs = [
      { id: 'structured-data', title: 'Add FAQ schema to service pages', impact: 'High', difficulty: 'Medium', benefit: 'Rich snippets in search results' },
      { id: 'internal-links', title: 'Improve internal linking structure', impact: 'High', difficulty: 'Easy', benefit: 'Better crawlability & authority flow' },
      { id: 'image-optimization', title: 'Optimize and compress images', impact: 'High', difficulty: 'Easy', benefit: 'Faster load times & better UX' },
      { id: 'meta-desc', title: 'Write compelling meta descriptions', impact: 'Medium', difficulty: 'Easy', benefit: 'Higher CTR from search results' },
      { id: 'open-graph', title: 'Add Open Graph social tags', impact: 'Medium', difficulty: 'Easy', benefit: 'Better social sharing appearance' },
      { id: 'alt-text', title: 'Add descriptive alt text to images', impact: 'Medium', difficulty: 'Easy', benefit: 'Improved image search rankings' },
      { id: 'canonical', title: 'Implement canonical tags', impact: 'Medium', difficulty: 'Easy', benefit: 'Prevent duplicate content issues' },
      { id: 'lcp', title: 'Optimize Largest Contentful Paint', impact: 'High', difficulty: 'Hard', benefit: 'Better Core Web Vitals score' },
      { id: 'mobile', title: 'Improve mobile responsiveness', impact: 'High', difficulty: 'Medium', benefit: 'Better mobile rankings & UX' },
      { id: 'font-display', title: 'Use font-display: swap for web fonts', impact: 'Low', difficulty: 'Easy', benefit: 'Faster text rendering' },
      { id: 'minify', title: 'Minify CSS, JS, and HTML', impact: 'Low', difficulty: 'Easy', benefit: 'Reduced file sizes' },
      { id: 'sitemap', title: 'Create and submit XML sitemap', impact: 'High', difficulty: 'Easy', benefit: 'Faster page indexing' },
      { id: 'h1-missing', title: 'Fix heading tag structure', impact: 'High', difficulty: 'Easy', benefit: 'Better content hierarchy' },
      { id: 'tap-targets', title: 'Fix tap targets on mobile', impact: 'Medium', difficulty: 'Easy', benefit: 'Better mobile usability' },
      { id: 'ttfb', title: 'Reduce server response time (TTFB)', impact: 'High', difficulty: 'Hard', benefit: 'Faster overall page load' },
      { id: 'accessibility', title: 'Improve accessibility compliance', impact: 'Medium', difficulty: 'Medium', benefit: 'Wider audience reach' },
      { id: 'core-web-vitals', title: 'Improve Core Web Vitals', impact: 'High', difficulty: 'Hard', benefit: 'Direct ranking signal' },
      { id: 'https', title: 'Enable HTTPS encryption', impact: 'High', difficulty: 'Medium', benefit: 'Secure browsing & SEO boost' },
      { id: 'compression', title: 'Enable Gzip/Brotli compression', impact: 'Low', difficulty: 'Easy', benefit: 'Reduced bandwidth usage' },
      { id: 'browser-caching', title: 'Leverage browser caching', impact: 'Low', difficulty: 'Easy', benefit: 'Faster repeat visits' },
    ];

    var opps = [];
    oppDefs.forEach(function (def) {
      var matched = recommendations.some(function (r) { return r.id === def.id; });
      if (matched) {
        opps.push(def);
      }
    });

    if (opps.length === 0) {
      opps.push({ id: 'maintain', title: 'Maintain current strong performance', impact: 'Medium', difficulty: 'Easy', benefit: 'Sustained search rankings' });
    }

    return opps.slice(0, 6);
  }

  /* ───────────────────────────────────────────────
     5. SEO POTENTIAL SCORE
     ─────────────────────────────────────────────── */

  function generatePotentialScore(scores, recommendations) {
    var engine = window.RecommendationEngine;
    if (engine && typeof engine.calculatePotential === 'function') {
      var result = engine.calculatePotential(scores, recommendations);
      return result;
    }

    var total = recommendations.length;
    if (total === 0) {
      return { current: scores.overall, potential: scores.overall, gain: 0 };
    }
    var highCount = recommendations.filter(function (r) { return r.priority === 'high' || r.priority === 'critical'; }).length;
    var gain = Math.min(Math.round(highCount * 2.5 + (total - highCount) * 1.2), 100 - scores.overall);
    gain = Math.max(gain, 3);
    var potential = Math.min(scores.overall + gain, 99);
    if (scores.overall >= 90) {
      potential = Math.min(scores.overall + 3, 99);
      gain = potential - scores.overall;
    }
    return { current: scores.overall, potential: potential, gain: gain };
  }

  /* ───────────────────────────────────────────────
     6. PRIORITY ROADMAP
     ─────────────────────────────────────────────── */

  function generateRoadmap(recommendations) {
    var immediate = [];
    var shortTerm = [];
    var longTerm = [];

    recommendations.forEach(function (r) {
      if (r.quick && (r.priority === 'high' || r.priority === 'critical')) {
        immediate.push(r.title);
      } else if (r.priority === 'high' || r.priority === 'critical') {
        shortTerm.push(r.title);
      } else if (r.priority === 'medium') {
        shortTerm.push(r.title);
      } else {
        longTerm.push(r.title);
      }
    });

    if (immediate.length === 0) {
      if (shortTerm.length > 0) {
        immediate.push(shortTerm.shift());
      }
    }

    return { immediate: immediate.slice(0, 4), shortTerm: shortTerm.slice(0, 4), longTerm: longTerm.slice(0, 4) };
  }

  /* ───────────────────────────────────────────────
     7. COMPETITOR INSIGHTS
     ─────────────────────────────────────────────── */

  function generateCompetitorInsights(scores) {
    var insights = [];

    if (scores.seo < 75) {
      insights.push({
        type: 'gap',
        title: 'Competitors outrank you on SEO',
        text: 'Competitors likely have better on-page SEO. Focus on meta tags, structured data, and content optimization.'
      });
    } else {
      insights.push({
        type: 'advantage',
        title: 'Strong SEO positioning',
        text: 'Your SEO score is competitive. Maintain your advantage by keeping content fresh and monitoring algorithm changes.'
      });
    }

    if (scores.perf < 65) {
      insights.push({
        type: 'gap',
        title: 'Faster competitors get more conversions',
        text: 'Websites loading under 2.5 seconds convert at higher rates. Your performance score indicates room for improvement.'
      });
    } else {
      insights.push({
        type: 'advantage',
        title: 'Performance leader',
        text: 'Your site loads faster than most competitors, giving you an edge in user experience and conversions.'
      });
    }

    if (scores.mobile < 70) {
      insights.push({
        type: 'opportunity',
        title: 'Capture mobile traffic from competitors',
        text: 'Improving mobile UX can help you capture traffic from competitors with neglected mobile experiences.'
      });
    } else {
      insights.push({
        type: 'advantage',
        title: 'Mobile-friendly advantage',
        text: 'Your mobile experience exceeds industry standards, helping you capture growing mobile search traffic.'
      });
    }

    return insights.slice(0, 3);
  }

  /* ───────────────────────────────────────────────
     8. BUSINESS IMPACT ANALYSIS
     ─────────────────────────────────────────────── */

  function generateBusinessImpact(scores, recommendations) {
    var impacts = [];

    recommendations.forEach(function (r) {
      if (r.id === 'lcp' || r.id === 'ttfb' || r.id === 'image-optimization' || r.id === 'compression' || r.id === 'browser-caching' || r.id === 'minify' || r.id === 'font-display') {
        impacts.push('Improving page speed could <strong>increase engagement</strong> and <strong>reduce bounce rates</strong>.');
      }
      if (r.id === 'structured-data' || r.id === 'sitemap' || r.id === 'meta-desc' || r.id === 'canonical' || r.id === 'open-graph' || r.id === 'h1-missing' || r.id === 'title-length') {
        impacts.push('Adding structured data and meta tags <strong>may improve search visibility</strong> and click-through rates.');
      }
      if (r.id === 'mobile' || r.id === 'tap-targets' || r.id === 'viewport') {
        impacts.push('Mobile optimization directly impacts <strong>conversion rates</strong> and <strong>user retention</strong> on smartphones.');
      }
      if (r.id === 'https' || r.id === 'security') {
        impacts.push('A secure website builds <strong>user trust</strong> and <strong>protects customer data</strong>, increasing credibility.');
      }
      if (r.id === 'accessibility') {
        impacts.push('Improving accessibility <strong>expands your audience</strong> and ensures compliance with web standards.');
      }
      if (r.id === 'alt-text') {
        impacts.push('Adding alt text to images <strong>boosts image search traffic</strong> and improves accessibility.');
      }
      if (r.id === 'broken-links') {
        impacts.push('Fixing broken links <strong>preserves link equity</strong> and improves user experience.');
      }
      if (r.id === 'core-web-vitals') {
        impacts.push('Optimizing Core Web Vitals is a <strong>direct Google ranking factor</strong> affecting all organic traffic.');
      }
      if (r.id === 'internal-links') {
        impacts.push('Better internal linking <strong>distributes page authority</strong> and helps search engines discover more content.');
      }
    });

    if (impacts.length === 0) {
      impacts.push('Your website is in strong health. Focus on <strong>content creation</strong> and <strong>link building</strong> for continued growth.');
    }

    var unique = [];
    var seen = {};
    impacts.forEach(function (i) {
      if (!seen[i]) {
        seen[i] = true;
        unique.push(i);
      }
    });

    return unique.slice(0, 4);
  }

  /* ───────────────────────────────────────────────
     9. AI RECOMMENDATIONS SCORE
     ─────────────────────────────────────────────── */

  function generateRecommendationScore(recommendations) {
    var high = 0;
    var medium = 0;
    var low = 0;

    recommendations.forEach(function (r) {
      if (r.impact === 'High') high++;
      else if (r.impact === 'Medium') medium++;
      else low++;
    });

    var total = recommendations.length || 1;
    var highPct = Math.round((high / total) * 100);
    var mediumPct = Math.round((medium / total) * 100);
    var lowPct = Math.round((low / total) * 100);

    return {
      high: { count: high, pct: highPct },
      medium: { count: medium, pct: mediumPct },
      low: { count: low, pct: lowPct }
    };
  }

  /* ───────────────────────────────────────────────
     10. REPORT SUMMARY
     ─────────────────────────────────────────────── */

  function generateReportSummary(scores, recommendations, potential) {
    var highCount = recommendations.filter(function (r) { return r.priority === 'high' || r.priority === 'critical'; }).length;
    var total = recommendations.length;

    var prefix;
    if (scores.overall >= 85) prefix = 'Your website is in <strong>excellent condition</strong>';
    else if (scores.overall >= 70) prefix = 'Your website is in <strong>good condition</strong> overall';
    else if (scores.overall >= 55) prefix = 'Your website is in <strong>fair condition</strong>';
    else prefix = 'Your website <strong>needs significant improvement</strong>';

    var action;
    if (total > 0) {
      var topCount = Math.min(highCount > 0 ? highCount : 5, 5);
      action = 'implementing the top <strong>' + topCount + ' recommendation' + (topCount !== 1 ? 's' : '') + '</strong> could significantly improve SEO performance and user experience';
    } else {
      action = 'continuing to <strong>monitor metrics</strong> will help maintain your current strong performance';
    }

    var scoreNote = '';
    if (potential && potential.gain > 0) {
      scoreNote = ' With a potential score of <strong>' + potential.potential + '/100</strong>, you could gain <strong>+' + potential.gain + ' points</strong>.';
    }

    return prefix + ', but ' + action + '.' + scoreNote;
  }

  /* ───────────────────────────────────────────────
     MAIN GENERATOR — returns all insights
     ─────────────────────────────────────────────── */

  function generateAll(scores, recommendations) {
    if (!scores) return null;
    try {
      var engine = window.RecommendationEngine;
      var recs = recommendations || (engine ? engine.generate(scores) : []);

      var potential = generatePotentialScore(scores, recs);

      return {
        executiveSummary: generateExecutiveSummary(scores, recs),
        strengths: generateStrengths(scores),
        weaknesses: generateWeaknesses(scores, recs),
        growthOpportunities: generateGrowthOpportunities(scores, recs),
        potentialScore: potential,
        roadmap: generateRoadmap(recs),
        competitorInsights: generateCompetitorInsights(scores),
        businessImpacts: generateBusinessImpact(scores, recs),
        recommendationScore: generateRecommendationScore(recs),
        reportSummary: generateReportSummary(scores, recs, potential),
        rawScore: scores.overall
      };
    } catch (err) {
      if (window.NAGRIVA_ErrorHandler) {
        NAGRIVA_ErrorHandler.handleError(NAGRIVA_ErrorHandler.ERROR_TYPES.AI_INSIGHTS_FAILED, err, 'ai_insights_generate');
      } else {
        console.error('[AIInsights] Generation error:', err);
      }
      return null;
    }
  }

  /* ───────────────────────────────────────────────
     SVG ICONS
     ─────────────────────────────────────────────── */

  var ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
    speed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    mobile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    vitals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    seo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    baseline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    schema: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
    sitemap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="8" y="14" width="7" height="7"/><line x1="6.5" y1="10" x2="6.5" y2="14"/><line x1="17.5" y1="10" x2="17.5" y2="14"/></svg>',
    access: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>',
    desc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    lcp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    broken: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    brain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
  };

  /* ───────────────────────────────────────────────
     RENDER ALL INSIGHTS INTO DOM
     ─────────────────────────────────────────────── */

  function renderAll(insights, containerId) {
    var container = document.getElementById(containerId || 'aiInsightsContainer');
    if (!container || !insights) return;

    try {
    container.innerHTML = '';

    /* ─── Section Header ─── */
    var header = document.createElement('div');
    header.className = 'ai-section-header fade-up';
    header.innerHTML =
      '<div class="ai-section-tag">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
        'AI-Powered Insights' +
      '</div>' +
      '<h2 class="ai-section-title">Intelligent <span>Growth Analysis</span></h2>' +
      '<p class="ai-section-sub">Personalized recommendations generated from your website audit results.</p>';
    container.appendChild(header);

    /* ─── 1. Executive Summary ─── */
    var exec = document.createElement('div');
    exec.className = 'ai-exec';
    exec.innerHTML =
      '<div class="ai-exec-card">' +
        '<div class="ai-exec-glow"></div>' +
        '<div class="ai-exec-header">' +
          ICONS.brain +
          '<h3>Executive Summary</h3>' +
          '<span class="ai-exec-badge">AI Generated</span>' +
        '</div>' +
        '<p class="ai-exec-text">' + insights.executiveSummary + '</p>' +
      '</div>';
    container.appendChild(exec);

    /* ─── 2 & 3. Strengths vs Weaknesses ─── */
    var sw = document.createElement('div');
    sw.className = 'ai-sw-grid';

    /* Strengths */
    var strengthsCol = document.createElement('div');
    strengthsCol.innerHTML =
      '<div class="ai-sw-col-title positive">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' +
        'Strengths' +
      '</div>' +
      '<div class="ai-sw-list" id="aiStrengthsList"></div>';
    strengthsCol.className = 'fade-up';
    sw.appendChild(strengthsCol);

    /* Weaknesses */
    var weaknessesCol = document.createElement('div');
    weaknessesCol.innerHTML =
      '<div class="ai-sw-col-title warning">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
        'Weaknesses' +
      '</div>' +
      '<div class="ai-sw-list" id="aiWeaknessesList"></div>';
    weaknessesCol.className = 'fade-up';
    sw.appendChild(weaknessesCol);

    container.appendChild(sw);

    /* Populate strengths */
    var strengthsList = document.getElementById('aiStrengthsList');
    insights.strengths.forEach(function (s, i) {
      var item = document.createElement('div');
      item.className = 'ai-sw-item positive';
      item.style.animationDelay = (i * 0.06) + 's';
      item.innerHTML =
        '<div class="ai-sw-icon positive">' + (ICONS[s.icon] || ICONS.check) + '</div>' +
        '<span>' + s.text + '</span>';
      strengthsList.appendChild(item);
    });

    /* Populate weaknesses */
    var weaknessesList = document.getElementById('aiWeaknessesList');
    insights.weaknesses.forEach(function (w, i) {
      var item = document.createElement('div');
      item.className = 'ai-sw-item warning';
      item.style.animationDelay = (i * 0.06) + 's';
      item.innerHTML =
        '<div class="ai-sw-icon warning">' + (ICONS[w.icon] || ICONS.broken) + '</div>' +
        '<span>' + w.text + '</span>';
      weaknessesList.appendChild(item);
    });

    /* ─── 4. Growth Opportunities ─── */
    var oppSection = document.createElement('div');
    oppSection.className = 'ai-opp-section';
    oppSection.innerHTML =
      '<div class="ai-opp-header">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' +
        '<h3>Growth Opportunities</h3>' +
      '</div>' +
      '<div class="ai-opp-grid" id="aiOppGrid"></div>';
    container.appendChild(oppSection);

    var oppGrid = document.getElementById('aiOppGrid');
    insights.growthOpportunities.forEach(function (o, i) {
      var impactClass = 'ai-opp-metric--impact-' + o.impact.toLowerCase();
      var diffClass = 'ai-opp-metric--diff-' + o.difficulty.toLowerCase();
      var card = document.createElement('div');
      card.className = 'ai-opp-card';
      card.style.animationDelay = (i * 0.06) + 's';
      card.innerHTML =
        '<div class="ai-opp-title">' + o.title + '</div>' +
        '<div class="ai-opp-metrics">' +
          '<span class="ai-opp-metric ' + impactClass + '">Impact: ' + o.impact + '</span>' +
          '<span class="ai-opp-metric ' + diffClass + '">Difficulty: ' + o.difficulty + '</span>' +
        '</div>';
      oppGrid.appendChild(card);
    });

    /* ─── 5. SEO Potential Score ─── */
    var potSection = document.createElement('div');
    potSection.className = 'ai-potential';
    potSection.innerHTML =
      '<div class="ai-potential-inner">' +
        '<div class="ai-potential-item">' +
          '<div class="ai-potential-label">Current Score</div>' +
          '<div class="ai-potential-value current">' + insights.potentialScore.current + '</div>' +
        '</div>' +
        '<div class="ai-potential-arrow">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
        '</div>' +
        '<div class="ai-potential-item">' +
          '<div class="ai-potential-label">Potential Score</div>' +
          '<div class="ai-potential-value potential">' + insights.potentialScore.potential + '</div>' +
        '</div>' +
        '<div class="ai-potential-divider"></div>' +
        '<div class="ai-potential-item">' +
          '<div class="ai-potential-label">Improvement</div>' +
          '<div class="ai-potential-value gain">+' + insights.potentialScore.gain + '</div>' +
        '</div>' +
      '</div>';
    container.appendChild(potSection);

    /* ─── 6. Priority Roadmap ─── */
    var rmSection = document.createElement('div');
    rmSection.className = 'ai-roadmap';
    rmSection.innerHTML =
      '<div class="ai-roadmap-header">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
        '<h3>Priority Roadmap</h3>' +
      '</div>' +
      '<div class="ai-roadmap-grid">' +
        renderRoadmapCol('Immediate Actions', 'Today', 'red', insights.roadmap.immediate) +
        renderRoadmapCol('Short-Term Actions', 'This Week', 'amber', insights.roadmap.shortTerm) +
        renderRoadmapCol('Long-Term Actions', 'This Month', 'green', insights.roadmap.longTerm) +
      '</div>';
    container.appendChild(rmSection);

    /* ─── 7. Competitor Insights ─── */
    var compSection = document.createElement('div');
    compSection.className = 'ai-competitor';
    compSection.innerHTML =
      '<div class="ai-competitor-header">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
        '<h3>Competitor Insights</h3>' +
      '</div>' +
      '<div class="ai-competitor-grid" id="aiCompGrid"></div>';
    container.appendChild(compSection);

    var compGrid = document.getElementById('aiCompGrid');
    insights.competitorInsights.forEach(function (c, i) {
      var iconHtml = c.type === 'gap' ? ICONS.broken : c.type === 'opportunity' ? ICONS.target : ICONS.check;
      var typeLabel = c.type === 'gap' ? 'Performance Gap' : c.type === 'opportunity' ? 'Opportunity' : 'Advantage';
      var card = document.createElement('div');
      card.className = 'ai-competitor-card';
      card.style.animationDelay = (i * 0.06) + 's';
      card.innerHTML =
        '<div class="ai-competitor-card-icon ' + c.type + '">' + iconHtml + '</div>' +
        '<div class="ai-competitor-card-title">' + c.title + '</div>' +
        '<div class="ai-competitor-card-text">' + c.text + '</div>';
      compGrid.appendChild(card);
    });

    /* ─── 8. Business Impact Analysis ─── */
    var bizSection = document.createElement('div');
    bizSection.className = 'ai-impact';
    bizSection.innerHTML =
      '<div class="ai-impact-header">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' +
        '<h3>Business Impact Analysis</h3>' +
      '</div>' +
      '<div class="ai-impact-grid" id="aiImpactGrid"></div>';
    container.appendChild(bizSection);

    var impactGrid = document.getElementById('aiImpactGrid');
    insights.businessImpacts.forEach(function (imp, i) {
      var item = document.createElement('div');
      item.className = 'ai-impact-item';
      item.style.animationDelay = (i * 0.06) + 's';
      item.innerHTML =
        '<div class="ai-impact-icon business">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' +
        '</div>' +
        '<span>' + imp + '</span>';
      impactGrid.appendChild(item);
    });

    /* ─── 9. AI Recommendations Score ─── */
    var rating = insights.recommendationScore;
    var ratSection = document.createElement('div');
    ratSection.className = 'ai-rating';
    ratSection.innerHTML =
      '<div class="ai-rating-header">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>' +
        '<h3>AI Recommendations Score</h3>' +
      '</div>' +
      '<div class="ai-rating-bars">' +
        renderRatingBar('High Impact', rating.high.count, rating.high.pct, 'high') +
        renderRatingBar('Medium Impact', rating.medium.count, rating.medium.pct, 'medium') +
        renderRatingBar('Low Impact', rating.low.count, rating.low.pct, 'low') +
      '</div>';
    container.appendChild(ratSection);

    /* ─── 10. Report Summary ─── */
    var summary = document.createElement('div');
    summary.className = 'ai-report-summary';
    summary.innerHTML =
      '<div class="ai-report-summary-card">' +
        '<div class="ai-report-summary-glow"></div>' +
        '<div class="ai-report-summary-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
        '</div>' +
        '<p class="ai-report-summary-text">' + insights.reportSummary + '</p>' +
      '</div>';
    container.appendChild(summary);

    /* ─── Future Ready Badges ─── */
    var future = document.createElement('div');
    future.className = 'ai-future-badges';
    var futureLabels = ['AI Chat Assistant', 'AI SEO Consultant', 'AI Growth Forecasting', 'AI Traffic Predictions', 'AI Content Recommendations'];
    futureLabels.forEach(function (label) {
      var badge = document.createElement('span');
      badge.className = 'ai-future-badge';
      badge.textContent = label;
      future.appendChild(badge);
    });
    container.appendChild(future);
    } catch (err) {
      if (window.NAGRIVA_ErrorHandler) {
        NAGRIVA_ErrorHandler.handleError(NAGRIVA_ErrorHandler.ERROR_TYPES.AI_INSIGHTS_FAILED, err, 'ai_insights_render');
      } else {
        console.error('[AIInsights] Render error:', err);
      }
    }
  }

  /* ─── Roadmap Column Helper ─── */
  function renderRoadmapCol(title, sub, color, items) {
    var dots = items.map(function (item) {
      return '<div class="ai-roadmap-item">' +
        '<span class="ai-roadmap-item-bullet ' + color + '"></span>' +
        '<span>' + item + '</span>' +
      '</div>';
    }).join('');

    if (!dots) {
      dots = '<div class="ai-roadmap-empty">No items in this timeframe</div>';
    }

    return '<div class="ai-roadmap-col fade-up">' +
      '<div class="ai-roadmap-col-header">' +
        '<span class="ai-roadmap-col-dot ' + color + '"></span>' +
        '<span class="ai-roadmap-col-title">' + title + '</span>' +
        '<span class="ai-roadmap-col-sub">' + sub + '</span>' +
      '</div>' +
      '<div class="ai-roadmap-items">' + dots + '</div>' +
    '</div>';
  }

  /* ─── Rating Bar Helper ─── */
  function renderRatingBar(label, count, pct, className) {
    return '<div class="ai-rating-bar-row">' +
      '<span class="ai-rating-bar-label">' + label + '</span>' +
      '<div class="ai-rating-bar-track">' +
        '<div class="ai-rating-bar-fill ' + className + '" style="width:' + pct + '%;"></div>' +
      '</div>' +
      '<span class="ai-rating-bar-count">' + count + '</span>' +
    '</div>';
  }

  /* ───────────────────────────────────────────────
     GET INSIGHTS DATA (for export)
     ─────────────────────────────────────────────── */

  function getExportData(scores, recommendations) {
    var insights = generateAll(scores, recommendations);
    if (!insights) return null;

    return {
      executiveSummary: insights.executiveSummary,
      strengths: insights.strengths.map(function (s) { return s.text; }),
      weaknesses: insights.weaknesses.map(function (w) { return w.text; }),
      growthOpportunities: insights.growthOpportunities.map(function (o) {
        return { title: o.title, impact: o.impact, difficulty: o.difficulty };
      }),
      currentScore: insights.potentialScore.current,
      potentialScore: insights.potentialScore.potential,
      scoreGain: insights.potentialScore.gain,
      roadmap: insights.roadmap,
      competitorInsights: insights.competitorInsights,
      businessImpacts: insights.businessImpacts,
      recommendationScore: insights.recommendationScore,
      reportSummary: insights.reportSummary
    };
  }

  /* ───────────────────────────────────────────────
     PUBLIC API
     ─────────────────────────────────────────────── */

  return {
    generateAll: generateAll,
    renderAll: renderAll,
    getExportData: getExportData
  };

})();
