;(function() {
  'use strict';

  /* ───────────────────────────────────────────────
     RECOMMENDATION ENGINE
     Analyzes audit scores and generates
     intelligent, categorized recommendations.
     ─────────────────────────────────────────────── */

  var Engine = {};

  /* ─── Priority Levels ─── */
  var PRIORITY = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
  };

  /* ─── Recommendation definitions ─── */
  var REC_DEFS = [
    {
      id: 'meta-desc',
      title: 'Missing Meta Descriptions',
      description: 'Your pages lack unique meta description tags.',
      why: 'Meta descriptions appear in search results and directly impact click-through rates. Well-crafted descriptions can improve CTR by up to 5.8%.',
      fix: 'Add a unique 150–160 character meta description for each page that includes target keywords and a clear value proposition.',
      impact: 'High',
      priority: PRIORITY.HIGH,
      quick: true,
      icon: 'desc',
      category: 'seo',
      check: function(s) { return s.seo < 65; }
    },
    {
      id: 'sitemap',
      title: 'Missing or Invalid XML Sitemap',
      description: 'No valid sitemap.xml found for your website.',
      why: 'Sitemaps help search engines discover and index your pages more efficiently, especially for new or large sites.',
      fix: 'Create an XML sitemap listing all important pages and submit it to Google Search Console. Ensure it\'s under 50MB and contains fewer than 50,000 URLs.',
      impact: 'High',
      priority: PRIORITY.HIGH,
      quick: true,
      icon: 'sitemap',
      category: 'seo',
      check: function(s) { return s.seo < 60; }
    },
    {
      id: 'https',
      title: 'HTTPS Not Enabled',
      description: 'Your website is not served over a secure HTTPS connection.',
      why: 'Google uses HTTPS as a ranking signal. Without it, visitors and search engines flag your site as insecure, hurting trust and SEO.',
      fix: 'Install an SSL/TLS certificate from a trusted provider. Most hosting providers offer free certificates via Let\'s Encrypt.',
      impact: 'High',
      priority: PRIORITY.HIGH,
      quick: false,
      icon: 'https',
      category: 'security',
      check: function(s) { return s.security < 50; }
    },
    {
      id: 'lcp',
      title: 'Slow Largest Contentful Paint (LCP)',
      description: 'LCP exceeds 4 seconds, indicating poor loading performance.',
      why: 'LCP is a Core Web Vital that Google uses as a ranking factor. Slow LCP leads to higher bounce rates and poorer user experience.',
      fix: 'Optimize images, implement lazy loading, use a CDN, minimize render-blocking resources, and consider using a faster hosting provider.',
      impact: 'High',
      priority: PRIORITY.HIGH,
      quick: false,
      icon: 'lcp',
      category: 'performance',
      check: function(s) { return s.perf < 50; }
    },
    {
      id: 'mobile',
      title: 'Website Not Mobile-Friendly',
      description: 'Your site does not provide an optimal mobile experience.',
      why: 'Over 60% of web traffic comes from mobile devices. Google uses mobile-first indexing, meaning mobile issues directly affect rankings.',
      fix: 'Implement responsive design, ensure tap targets are at least 48px, use readable font sizes, and eliminate horizontal scrolling.',
      impact: 'High',
      priority: PRIORITY.HIGH,
      quick: false,
      icon: 'mobile',
      category: 'mobile',
      check: function(s) { return s.mobile < 55; }
    },
    {
      id: 'ttfb',
      title: 'High Time to First Byte (TTFB)',
      description: 'Server response time is slow, delaying page loading.',
      why: 'TTFB affects user perception of speed and is a factor in Google\'s page experience ranking.',
      fix: 'Use a CDN, upgrade hosting, optimize server configuration, enable caching, and consider using a lightweight CMS or static site generator.',
      impact: 'High',
      priority: PRIORITY.HIGH,
      quick: false,
      icon: 'ttfb',
      category: 'performance',
      check: function(s) { return s.perf < 55; }
    },
    {
      id: 'alt-text',
      title: 'Missing Image Alt Text',
      description: 'Several images lack descriptive alt attributes.',
      why: 'Alt text improves accessibility for visually impaired users and helps search engines understand image content for image search rankings.',
      fix: 'Add descriptive alt text to all images that conveys the image content and includes relevant keywords naturally.',
      impact: 'Medium',
      priority: PRIORITY.MEDIUM,
      quick: true,
      icon: 'alt',
      category: 'seo',
      check: function(s) { return s.seo < 75 && s.seo >= 55; }
    },
    {
      id: 'open-graph',
      title: 'Missing Open Graph Tags',
      description: 'Social media preview tags (OG) are incomplete or missing.',
      why: 'OG tags control how your content appears when shared on social platforms like Facebook, LinkedIn, and Twitter. Proper tags increase social engagement.',
      fix: 'Add OG:title, OG:description, OG:image, and OG:url meta tags to all pages. Use engaging images sized 1200×630px.',
      impact: 'Medium',
      priority: PRIORITY.MEDIUM,
      quick: true,
      icon: 'og',
      category: 'seo',
      check: function(s) { return s.seo < 70 && s.seo >= 50; }
    },
    {
      id: 'structured-data',
      title: 'Missing Structured Data Markup',
      description: 'No schema.org structured data found on your pages.',
      why: 'Structured data enables rich snippets in search results, which can increase CTR by up to 30% and improve search visibility.',
      fix: 'Implement relevant schema types (Organization, LocalBusiness, Article, Product, FAQ, etc.) using JSON-LD format on your pages.',
      impact: 'Medium',
      priority: PRIORITY.MEDIUM,
      quick: false,
      icon: 'schema',
      category: 'seo',
      check: function(s) { return s.seo < 72 && s.seo >= 50; }
    },
    {
      id: 'title-length',
      title: 'Suboptimal Page Title Length',
      description: 'Title tags are either too short or exceed the recommended length.',
      why: 'Title tags are the first thing users see in search results. Titles under 30 chars miss ranking opportunities; over 60 chars get truncated.',
      fix: 'Keep title tags between 50–60 characters. Include primary keyword near the beginning and your brand name at the end.',
      impact: 'Medium',
      priority: PRIORITY.MEDIUM,
      quick: true,
      icon: 'title',
      category: 'seo',
      check: function(s) { return s.seo < 78 && s.seo >= 60; }
    },
    {
      id: 'heading-structure',
      title: 'Poor Heading Structure',
      description: 'H1 tags are missing, duplicated, or headings lack proper hierarchy.',
      why: 'Search engines use headings to understand content structure. Proper heading hierarchy improves readability and SEO.',
      fix: 'Use one unique H1 per page, maintain a logical hierarchy (H1 → H2 → H3), and include relevant keywords in headings.',
      impact: 'Medium',
      priority: PRIORITY.MEDIUM,
      quick: true,
      icon: 'heading',
      category: 'seo',
      check: function(s) { return s.seo < 75 && s.seo >= 55; }
    },
    {
      id: 'accessibility',
      title: 'Accessibility Issues Detected',
      description: 'Color contrast ratios are too low and accessibility standards are not met.',
      why: 'Accessible websites reach a wider audience and Google considers accessibility in its page experience metrics.',
      fix: 'Ensure color contrast ratios meet WCAG AA standards (4.5:1 for normal text). Add proper ARIA labels and focus indicators.',
      impact: 'Medium',
      priority: PRIORITY.MEDIUM,
      quick: false,
      icon: 'access',
      category: 'ux',
      check: function(s) { return s.ux < 75; }
    },
    {
      id: 'core-web-vitals',
      title: 'Core Web Vitals Need Improvement',
      description: 'LCP, FID, or CLS metrics are below Google\'s recommended thresholds.',
      why: 'Core Web Vitals are direct ranking factors. Poor scores affect both SEO and user experience, increasing bounce rates.',
      fix: 'Optimize LCP (<2.5s), minimize FID (<100ms), and maintain CLS (<0.1). Use tools like PageSpeed Insights to identify specific issues.',
      impact: 'Medium',
      priority: PRIORITY.MEDIUM,
      quick: false,
      icon: 'vitals',
      category: 'performance',
      check: function(s) { return s.perf < 70 && s.perf >= 50; }
    },
    {
      id: 'compression',
      title: 'Enable Gzip or Brotli Compression',
      description: 'Content compression is not fully enabled on your server.',
      why: 'Compression reduces page weight by up to 70%, significantly improving load times and reducing bandwidth costs.',
      fix: 'Enable Gzip or Brotli compression on your web server. Most servers can be configured via .htaccess or nginx config.',
      impact: 'Low',
      priority: PRIORITY.LOW,
      quick: true,
      icon: 'compress',
      category: 'performance',
      check: function(s) { return s.perf < 80 && s.perf >= 55; }
    },
    {
      id: 'browser-caching',
      title: 'Leverage Browser Caching',
      description: 'Static resources are not cached effectively by browsers.',
      why: 'Browser caching reduces repeat visit load times significantly, improving user experience and perceived performance.',
      fix: 'Set appropriate Cache-Control and Expires headers for static assets. Cache CSS/JS for 1 year, images for 1 month.',
      impact: 'Low',
      priority: PRIORITY.LOW,
      quick: true,
      icon: 'cache',
      category: 'performance',
      check: function(s) { return s.perf < 78 && s.perf >= 55; }
    },
    {
      id: 'image-optimization',
      title: 'Compress Large Images',
      description: 'Images are not optimized and exceed recommended file sizes.',
      why: 'Images account for over 50% of page weight on average. Optimizing them can dramatically improve load times and Core Web Vitals.',
      fix: 'Use modern formats like WebP/AVIF, compress images to under 100KB where possible, and implement responsive images with srcset.',
      impact: 'Low',
      priority: PRIORITY.LOW,
      quick: true,
      icon: 'image',
      category: 'performance',
      check: function(s) { return s.perf < 75 && s.perf >= 50; }
    },
    {
      id: 'minify',
      title: 'Minify CSS, JavaScript, and HTML',
      description: 'Your source files contain unnecessary whitespace and comments.',
      why: 'Minification reduces file sizes by 10–30% without changing functionality, leading to faster parsing and execution.',
      fix: 'Use minification tools like Terser for JS, clean-css for CSS, and html-minifier for HTML. Automate with your build process.',
      impact: 'Low',
      priority: PRIORITY.LOW,
      quick: false,
      icon: 'minify',
      category: 'performance',
      check: function(s) { return s.perf < 80 && s.perf >= 55; }
    },
    {
      id: 'canonical',
      title: 'Missing Canonical Tags',
      description: 'Pages lack canonical URL tags to prevent duplicate content issues.',
      why: 'Canonical tags tell search engines which version of a page is the primary one, preventing duplicate content penalties.',
      fix: 'Add rel="canonical" link tags to all pages pointing to the preferred URL version, especially for pages with multiple URLs.',
      impact: 'Medium',
      priority: PRIORITY.MEDIUM,
      quick: true,
      icon: 'canonical',
      category: 'seo',
      check: function(s) { return s.seo < 75 && s.seo >= 55; }
    },
    {
      id: 'internal-links',
      title: 'Improve Internal Linking Structure',
      description: 'Internal linking opportunities are underutilized across your site.',
      why: 'Good internal linking distributes page authority, helps search engines discover content, and reduces bounce rates.',
      fix: 'Add contextual internal links between related pages. Use descriptive anchor text. Ensure every page is within 3 clicks of the homepage.',
      impact: 'Low',
      priority: PRIORITY.LOW,
      quick: false,
      icon: 'links',
      category: 'seo',
      check: function(s) { return s.ux < 80 && s.ux >= 55; }
    },
    {
      id: 'social',
      title: 'No Social Media Integration',
      description: 'Social sharing buttons and profile links are missing from your site.',
      why: 'Social signals contribute to brand visibility and can indirectly impact SEO through increased engagement and traffic.',
      fix: 'Add social sharing buttons to content pages and link to your social profiles in the header or footer.',
      impact: 'Low',
      priority: PRIORITY.LOW,
      quick: true,
      icon: 'social',
      category: 'ux',
      check: function(s) { return s.ux < 82 && s.ux >= 55; }
    },
    {
      id: 'analytics',
      title: 'No Analytics Tracked',
      description: 'No analytics or tracking code detected on your website.',
      why: 'Without analytics, you cannot measure traffic, user behavior, or the effectiveness of your SEO efforts.',
      fix: 'Install Google Analytics 4 (GA4) or a privacy-focused alternative like Plausible or Fathom to track visitor data.',
      impact: 'Low',
      priority: PRIORITY.LOW,
      quick: true,
      icon: 'analytics',
      category: 'ux',
      check: function(s) { return s.ux < 85 && s.ux >= 55; }
    },
    {
      id: 'tap-targets',
      title: 'Small Tap Targets on Mobile',
      description: 'Buttons and links are too close together for mobile users.',
      why: 'Small tap targets frustrate mobile users and can lead to accidental clicks, increasing bounce rates.',
      fix: 'Ensure tap targets are at least 48×48px with adequate spacing. Add padding to links and buttons for easier interaction.',
      impact: 'Medium',
      priority: PRIORITY.MEDIUM,
      quick: true,
      icon: 'tap',
      category: 'mobile',
      check: function(s) { return s.mobile < 75 && s.mobile >= 50; }
    },
    {
      id: 'viewport',
      title: 'Viewport Meta Tag Missing',
      description: 'Your pages might not have a proper viewport meta tag for mobile.',
      why: 'Without a viewport meta tag, mobile browsers render pages at desktop widths, requiring zoom and pinch gestures.',
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to all pages for proper mobile rendering.',
      impact: 'High',
      priority: PRIORITY.HIGH,
      quick: true,
      icon: 'viewport',
      category: 'mobile',
      check: function(s) { return s.mobile < 60; }
    },
    {
      id: 'h1-missing',
      title: 'Missing or Multiple H1 Tags',
      description: 'Pages either have no H1 tag or contain multiple H1 tags.',
      why: 'The H1 tag is the primary heading that tells search engines what the page is about. Missing or multiple H1s confuse crawlers.',
      fix: 'Ensure each page has exactly one H1 tag that clearly describes the page content and includes target keywords.',
      impact: 'High',
      priority: PRIORITY.HIGH,
      quick: true,
      icon: 'h1',
      category: 'seo',
      check: function(s) { return s.seo < 60; }
    },
    {
      id: 'broken-links',
      title: 'Broken Links Detected',
      description: 'Some internal or external links lead to 404 error pages.',
      why: 'Broken links harm user experience and waste crawl budget. Search engines may interpret them as signs of neglect.',
      fix: 'Use a broken link checker to find all 404 links. Replace or redirect broken URLs. Set up custom 404 pages.',
      impact: 'Medium',
      priority: PRIORITY.MEDIUM,
      quick: false,
      icon: 'broken',
      category: 'seo',
      check: function(s) { return s.ux < 72; }
    },
    {
      id: 'font-display',
      title: 'Use font-display: swap for Web Fonts',
      description: 'Custom web fonts block text rendering while loading.',
      why: 'Font loading can delay text visibility, increasing LCP and frustrating users waiting to read content.',
      fix: 'Add font-display: swap to all @font-face declarations so text is visible immediately in a fallback font while the custom font loads.',
      impact: 'Low',
      priority: PRIORITY.LOW,
      quick: true,
      icon: 'font',
      category: 'performance',
      check: function(s) { return s.perf < 82 && s.perf >= 55; }
    }
  ];

  /* ─── Score Label Helper ─── */
  function getScoreLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 65) return 'Fair';
    if (score >= 50) return 'Poor';
    return 'Critical';
  }

  /* ─── Generate Recommendations ─── */
  Engine.generate = function(scores) {
    var recommendations = [];
    REC_DEFS.forEach(function(def) {
      if (def.check(scores)) {
        var rec = {
          id: def.id,
          title: def.title,
          description: def.description,
          why: def.why,
          fix: def.fix,
          impact: def.impact,
          priority: def.priority,
          quick: def.quick,
          icon: def.icon,
          category: def.category,
          scores: scores
        };
        recommendations.push(rec);
      }
    });

    return recommendations;
  };

  /* ─── Generate AI Summary ─── */
  Engine.generateSummary = function(scores, recommendations) {
    var overall = scores.overall;
    var highCount = 0;
    var mediumCount = 0;
    var lowCount = 0;

    recommendations.forEach(function(r) {
      if (r.priority === 'high') highCount++;
      else if (r.priority === 'medium') mediumCount++;
      else lowCount++;
    });

    var totalIssues = recommendations.length;
    var goodScores = 0;
    if (scores.seo >= 80) goodScores++;
    if (scores.perf >= 80) goodScores++;
    if (scores.mobile >= 80) goodScores++;
    if (scores.security >= 80) goodScores++;
    if (scores.ux >= 80) goodScores++;

    var intro;
    if (overall >= 85) {
      intro = 'Your website performs well overall. ';
    } else if (overall >= 70) {
      intro = 'Your website is on the right track, but several areas need attention. ';
    } else if (overall >= 55) {
      intro = 'Your website has significant room for improvement across multiple areas. ';
    } else {
      intro = 'Your website requires urgent improvements to remain competitive. ';
    }

    var seoNote = scores.seo >= 80 ? 'SEO is in good shape' :
                  scores.seo >= 60 ? 'SEO needs moderate work' :
                  'SEO has critical issues';

    var perfNote = scores.perf >= 80 ? 'performance is strong' :
                   scores.perf >= 60 ? 'performance could be faster' :
                   'performance is a major concern';

    var mobileNote = scores.mobile >= 80 ? 'mobile experience is excellent' :
                     scores.mobile >= 60 ? 'mobile optimization needs work' :
                     'mobile usability requires urgent attention';

    var securityNote = scores.security >= 80 ? 'security is properly configured' :
                       scores.security >= 60 ? 'security has some gaps' :
                       'security needs immediate attention';

    var patterns = [
      intro + 'Your ' + seoNote + ', ' + perfNote + ', and ' + mobileNote + '.',
      'We identified ' + highCount + ' high-priority, ' + mediumCount + ' medium-priority, and ' + lowCount + ' low-priority issues.',
      'Fixing ' + (highCount > 0 ? 'high-priority issues first will ' : 'these issues will ') + 'have the greatest impact on your search rankings and user experience.',
      goodScores >= 4 ? 'Your site has strong fundamentals in most areas, making targeted improvements highly effective.' :
      goodScores >= 2 ? 'Focus on the fundamentals to build a stronger foundation across all metrics.' :
      'A comprehensive approach addressing all areas will deliver the best results.'
    ];

    return patterns.join(' ');
  };

  /* ─── Generate Quick Wins ─── */
  Engine.generateQuickWins = function(recommendations) {
    return recommendations.filter(function(r) { return r.quick; }).slice(0, 5);
  };

  /* ─── Calculate Potential Score ─── */
  Engine.calculatePotential = function(scores, recommendations) {
    var total = recommendations.length;
    if (total === 0) {
      return {
        current: scores.overall,
        potential: scores.overall,
        gain: 0
      };
    }

    var maxFixPerIssue = 12;
    var totalPotentialGain = 0;

    recommendations.forEach(function(r) {
      var gain = maxFixPerIssue * 0.25;
      if (r.priority === 'high') gain = maxFixPerIssue * 0.8;
      else if (r.priority === 'medium') gain = maxFixPerIssue * 0.5;
      totalPotentialGain += gain;
    });

    var maxGain = 100 - scores.overall;
    var actualGain = Math.min(Math.round(totalPotentialGain / Math.max(3, total) * 1.5), maxGain);
    var potential = Math.min(scores.overall + actualGain, 99);

    if (potential < scores.overall + 2 && scores.overall < 85) {
      potential = Math.min(scores.overall + 8, 99);
      actualGain = potential - scores.overall;
    }

    if (scores.overall >= 90) {
      potential = scores.overall + 3;
      actualGain = 3;
    }

    potential = Math.min(potential, 99);
    actualGain = potential - scores.overall;

    return {
      current: scores.overall,
      potential: potential,
      gain: actualGain
    };
  };

  /* ─── Filter recommendations ─── */
  Engine.filter = function(recommendations, priority) {
    if (!priority || priority === 'all') return recommendations;
    return recommendations.filter(function(r) { return r.priority === priority; });
  };

  /* ─── Get priority display info ─── */
  Engine.getPriorityInfo = function(priority) {
    var map = {
      critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
      high: { label: 'High Priority', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' },
      medium: { label: 'Medium Priority', color: '#FACC15', bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.15)' },
      low: { label: 'Low Priority', color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)' }
    };
    return map[priority] || map.low;
  };

  /* ─── Get icon SVG ─── */
  Engine.getIcon = function(iconName) {
    var icons = {
      desc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      sitemap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="8" y="14" width="7" height="7"/><line x1="6.5" y1="10" x2="6.5" y2="14"/><line x1="17.5" y1="10" x2="17.5" y2="14"/></svg>',
      https: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
      lcp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      mobile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
      ttfb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
      alt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      og: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
      schema: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
      title: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
      heading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
      access: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>',
      vitals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
      compress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
      cache: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
      image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      minify: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      canonical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      links: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      social: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
      analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
      tap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
      viewport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
      h1: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
      broken: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      font: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>'
    };
    return icons[iconName] || icons.desc;
  };

  /* ─── Export recommendations as plain text ─── */
  Engine.exportText = function(recommendations, scores, summary, potential) {
    var lines = [];
    lines.push('═══════════════════════════════════════════');
    lines.push('  NAGRIVA - SEO RECOMMENDATION REPORT');
    lines.push('═══════════════════════════════════════════');
    lines.push('');
    lines.push('Current Score: ' + scores.overall + '/100');
    if (potential) {
      lines.push('Potential Score: ' + potential.potential + '/100');
      lines.push('Potential Improvement: +' + potential.gain + ' points');
    }
    lines.push('');
    lines.push('── AI SUMMARY ──');
    lines.push(summary);
    lines.push('');

    var priorities = ['critical', 'high', 'medium', 'low'];
    var priorLabels = { critical: 'CRITICAL', high: 'HIGH PRIORITY', medium: 'MEDIUM PRIORITY', low: 'LOW PRIORITY' };


    priorities.forEach(function(p) {
      var filtered = recommendations.filter(function(r) { return r.priority === p; });
      if (filtered.length === 0) return;
      lines.push('── ' + priorLabels[p] + ' ──');
      filtered.forEach(function(r) {
        lines.push('  ■ ' + r.title);
        lines.push('    Issue: ' + r.description);
        lines.push('    Why: ' + r.why);
        lines.push('    Fix: ' + r.fix);
        lines.push('    SEO Impact: ' + r.impact);
        lines.push('');
      });
    });

    lines.push('── QUICK WINS ──');
    var quickWins = Engine.generateQuickWins(recommendations);
    quickWins.forEach(function(r) {
      lines.push('  ✓ ' + r.title + ' (~30 min)');
    });
    lines.push('');
    lines.push('Report generated by Nagriva Website Audit Tool');
    lines.push('https://nagriva.com/tools/website-audit-tool');
    return lines.join('\n');
  };

  /* ─── Export recommendations as HTML ─── */
  Engine.exportHTML = function(recommendations, scores, summary, potential) {
    var html = [];
    html.push('<!DOCTYPE html><html><head><meta charset="UTF-8">');
    html.push('<title>SEO Recommendation Report - Nagriva</title>');
    html.push('<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#1a1a2e;background:#fff;}');
    html.push('h1{font-size:28px;color:#FACC15;}h2{font-size:20px;margin-top:30px;border-bottom:2px solid #eee;padding-bottom:8px;}');
    html.push('.score{font-size:18px;margin:5px 0;}.rec{margin:16px 0;padding:16px;border-radius:12px;border:1px solid #e5e7eb;}');
    html.push('.rec-high{border-left:4px solid #ef4444;}.rec-medium{border-left:4px solid #FACC15;}.rec-low{border-left:4px solid #FACC15;}');
    html.push('.rec h3{margin:0 0 6px;font-size:16px;}.rec p{margin:4px 0;font-size:14px;color:#4b5563;}.quick{margin:8px 0;font-size:14px;color:#059669;}');
    html.push('.summary{background:#f0f9ff;padding:16px;border-radius:12px;margin:20px 0;border:1px solid #bae6fd;}');
    html.push('.footer{margin-top:40px;font-size:12px;color:#9ca3af;text-align:center;}</style></head><body>');
    html.push('<h1>Nagriva SEO Recommendation Report</h1>');
    html.push('<div class="score"><strong>Current Score:</strong> ' + scores.overall + '/100</div>');
    if (potential) {
      html.push('<div class="score"><strong>Potential Score:</strong> ' + potential.potential + '/100 <span style="color:#059669;">(+' + potential.gain + ' points)</span></div>');
    }
    html.push('<div class="summary"><strong>AI Summary:</strong> ' + summary + '</div>');
    html.push('<h2>Quick Wins</h2>');
    var qw = Engine.generateQuickWins(recommendations);
    qw.forEach(function(r) { html.push('<div class="quick">✓ ' + r.title + '</div>'); });

    var priorities = ['high', 'medium', 'low'];
    var priorLabels = { high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' };
    var priorClasses = { high: 'rec-high', medium: 'rec-medium', low: 'rec-low' };

    priorities.forEach(function(p) {
      var filtered = recommendations.filter(function(r) { return r.priority === p; });
      if (filtered.length === 0) return;
      html.push('<h2>' + priorLabels[p] + '</h2>');
      filtered.forEach(function(r) {
        html.push('<div class="rec ' + priorClasses[p] + '">');
        html.push('<h3>' + r.title + '</h3>');
        html.push('<p><strong>Issue:</strong> ' + r.description + '</p>');
        html.push('<p><strong>Why it matters:</strong> ' + r.why + '</p>');
        html.push('<p><strong>Recommended Fix:</strong> ' + r.fix + '</p>');
        html.push('<p><strong>SEO Impact:</strong> ' + r.impact + '</p>');
        html.push('</div>');
      });
    });

    html.push('<div class="footer">Generated by <a href="https://nagriva.com/tools/website-audit-tool">Nagriva Website Audit Tool</a></div>');
    html.push('</body></html>');
    return html.join('\n');
  };

  /* ─── Get scores breakdown for export ─── */
  Engine.getScoresData = function(scores) {
    return {
      overall: scores.overall,
      seo: scores.seo,
      performance: scores.perf,
      mobile: scores.mobile,
      security: scores.security,
      ux: scores.ux,
      label: getScoreLabel(scores.overall)
    };
  };

  window.RecommendationEngine = Engine;

})();
