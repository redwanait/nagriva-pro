(function () {
  'use strict';

  var SITE_URL = 'https://nagriva.com';
  var ORG_NAME = 'Nagriva';
  var ORG_LOGO = SITE_URL + '/assets/images/branding/nagriva-logo.png';
  var ORG_DESC = 'Nagriva is a digital growth agency offering web design, SEO, branding, AI automation, social media management, and performance marketing services.';
  var SOCIAL_PROFILES = [
    'https://www.instagram.com/nagriva.co/',
    'https://x.com/nag_riva',
    'https://www.facebook.com/profile.php?id=61575750526639',
    'https://www.youtube.com/channel/UCTlY_icbUlIjdcuPZdtTeTQ',
    'https://wa.me/212728427278'
  ];

  var PAGE_SCHEMAS = [];

  function getPagePath() {
    return window.location.pathname;
  }

  function getPageUrl() {
    return window.location.href.split('?')[0].split('#')[0];
  }

  function stripHtml(str) {
    if (!str) return '';
    return String(str).replace(/<[^>]*>/g, '').trim();
  }

  function escapeJson(str) {
    if (!str) return '';
    return String(str).replace(/</g, '\\u003C').replace(/>/g, '\\u003E');
  }

  function addSchema(schema) {
    PAGE_SCHEMAS.push(schema);
  }

  function hasExistingSchema(type) {
    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    var existing = Array.prototype.slice.call(scripts);
    for (var i = 0; i < existing.length; i++) {
      try {
        var parsed = JSON.parse(existing[i].textContent);
        if (parsed['@type'] === type) return true;
      } catch (e) {}
    }
    return false;
  }

  function injectSchemas() {
    var existing = document.querySelectorAll('.nagriva-schema');
    existing.forEach(function (el) { el.remove(); });

    PAGE_SCHEMAS.forEach(function (schema) {
      var script = document.createElement('script');
      script.type = 'application/ld+json';
      script.className = 'nagriva-schema';
      script.textContent = JSON.stringify(schema, null, 0);
      document.head.appendChild(script);
    });
  }

  /* ─── ORGANIZATION ─── */
  function buildOrganization() {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': ORG_NAME,
      'url': SITE_URL,
      'logo': ORG_LOGO,
      'description': ORG_DESC,
      'sameAs': SOCIAL_PROFILES
    };
  }

  /* ─── WEBSITE ─── */
  function buildWebSite() {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': ORG_NAME,
      'url': SITE_URL,
      'description': ORG_DESC
    };
  }

  /* ─── BREADCRUMBLIST ─── */
  function buildBreadcrumb(items) {
    if (!items || !items.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': items.map(function (item, i) {
        return {
          '@type': 'ListItem',
          'position': i + 1,
          'name': item.name,
          'item': item.url ? (item.url.indexOf('http') === 0 ? item.url : SITE_URL + item.url) : undefined
        };
      }).filter(function (item) { return item.name; })
    };
  }

  function buildDefaultBreadcrumb() {
    return buildBreadcrumb([{ name: 'Home', url: '/' }]);
  }

  function buildServiceBreadcrumb(serviceName) {
    return buildBreadcrumb([
      { name: 'Home', url: '/' },
      { name: 'Services', url: '/pages/services.html' },
      { name: serviceName, url: undefined }
    ]);
  }

  function buildIndustryBreadcrumb(industryName) {
    return buildBreadcrumb([
      { name: 'Home', url: '/' },
      { name: 'Industries', url: undefined },
      { name: industryName, url: undefined }
    ]);
  }

  /* ─── SERVICE ─── */
  function buildService(name, description) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': name,
      'description': description || name + ' service by ' + ORG_NAME,
      'url': getPageUrl(),
      'provider': {
        '@type': 'Organization',
        'name': ORG_NAME
      },
      'areaServed': 'Worldwide'
    };
  }

  /* ─── FAQPAGE ─── */
  function buildFAQPage(questions) {
    if (!questions || !questions.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': questions.map(function (q) {
        return {
          '@type': 'Question',
          'name': escapeJson(stripHtml(q.question)),
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': escapeJson(stripHtml(q.answer))
          }
        };
      })
    };
  }

  /* ─── REVIEW ─── */
  function buildReview(authorName, reviewBody, ratingValue, itemReviewedName) {
    var review = {
      '@context': 'https://schema.org',
      '@type': 'Review',
      'author': { '@type': 'Person', 'name': authorName || 'Client' },
      'reviewBody': reviewBody || ''
    };
    if (ratingValue != null) {
      review.reviewRating = {
        '@type': 'Rating',
        'ratingValue': ratingValue,
        'bestRating': 5
      };
    }
    if (itemReviewedName) {
      review.itemReviewed = {
        '@type': 'Organization',
        'name': itemReviewedName
      };
    }
    return review;
  }

  var DYNAMIC_SERVICE_SLUGS = {
    'website-development': true,
    'ecommerce-stores': true,
    'ecommerce-development': true,
    'blog-creation': true,
    'video-editing': true
  };

  /* ─── AUTO-DETECT PAGE TYPE ─── */
  function detectPageType() {
    var path = getPagePath();
    var pathLower = path.toLowerCase();

    if (path === '/' || path === '/index.html' || path === '/index') {
      return 'home';
    }

    /* Detect dynamic service pages (/services/{slug}) */
    var servicesMatch = pathLower.match(/^\/services\/([^\/]+)$/);
    if (servicesMatch) {
      var slug = servicesMatch[1];
      if (DYNAMIC_SERVICE_SLUGS[slug]) {
        return { type: 'service-dynamic', data: null };
      }
    }

    var staticServiceSlugs = {
      'seo': { name: 'SEO Optimization', desc: 'Data-driven SEO that drives organic growth. Rank higher, get more traffic, and convert better.' },
      'seo.html': { name: 'SEO Optimization', desc: 'Data-driven SEO that drives organic growth. Rank higher, get more traffic, and convert better.' },
      'web-design': { name: 'Web Design', desc: 'Premium web design that converts visitors into customers. Modern, fast, and conversion-optimized websites.' },
      'web-design.html': { name: 'Web Design', desc: 'Premium web design that converts visitors into customers. Modern, fast, and conversion-optimized websites.' },
      'branding': { name: 'Brand Identity', desc: 'Strategic brand identity design that makes you memorable, credible, and impossible to ignore.' },
      'branding.html': { name: 'Brand Identity', desc: 'Strategic brand identity design that makes you memorable, credible, and impossible to ignore.' },
      'social-media': { name: 'Social Media Growth', desc: 'Social media growth that amplifies your brand. Organic and paid strategies to build community, drive engagement, and scale followers.' },
      'social-media.html': { name: 'Social Media Growth', desc: 'Social media growth that amplifies your brand. Organic and paid strategies to build community, drive engagement, and scale followers.' },
      'ai-automation': { name: 'AI Automation', desc: 'AI-powered automation that streamlines your business. Save time, reduce costs, and scale faster with intelligent workflows.' },
      'ai-automation.html': { name: 'AI Automation', desc: 'AI-powered automation that streamlines your business. Save time, reduce costs, and scale faster with intelligent workflows.' },
      'strategy': { name: 'Performance Marketing', desc: 'Data-driven performance marketing that delivers measurable ROI. Full-funnel campaigns across all channels, optimized for conversions.' },
      'strategy.html': { name: 'Performance Marketing', desc: 'Data-driven performance marketing that delivers measurable ROI. Full-funnel campaigns across all channels, optimized for conversions.' },
      'website-development': { name: 'Website Development', desc: 'Professional website development for dentists, lawyers, and car rental companies. Modern, conversion-optimized sites that generate leads.' },
      'website-development.html': { name: 'Website Development', desc: 'Professional website development for dentists, lawyers, and car rental companies. Modern, conversion-optimized sites that generate leads.' },
      'ecommerce-stores': { name: 'E-Commerce Development', desc: 'Full-featured e-commerce stores with product management, secure checkout, and mobile optimization.' },
      'ecommerce-stores.html': { name: 'E-Commerce Development', desc: 'Full-featured e-commerce stores with product management, secure checkout, and mobile optimization.' },
      'blog-creation': { name: 'Blog Creation', desc: 'Custom blog creation with SEO optimization, content strategy, and modern design.' },
      'blog-creation.html': { name: 'Blog Creation', desc: 'Custom blog creation with SEO optimization, content strategy, and modern design.' },
      'video-editing': { name: 'Video Editing', desc: 'Professional video editing with motion graphics, color grading, and thumbnail design.' },
      'video-editing.html': { name: 'Video Editing', desc: 'Professional video editing with motion graphics, color grading, and thumbnail design.' },
      'dentist-websites': { name: 'Dental Website Design', desc: 'Professional websites for dental clinics designed to attract more patients and grow your practice.' },
      'dentist-websites.html': { name: 'Dental Website Design', desc: 'Professional websites for dental clinics designed to attract more patients and grow your practice.' },
      'lawyer-websites': { name: 'Law Firm Website Design', desc: 'Professional website design for lawyers and law firms. Build trust, attract more clients, and grow your legal practice.' },
      'lawyer-websites.html': { name: 'Law Firm Website Design', desc: 'Professional website design for lawyers and law firms. Build trust, attract more clients, and grow your legal practice.' },
      'agency-websites': { name: 'Agency Website Design', desc: 'Professional websites for agencies designed to showcase your portfolio and attract more clients.' },
      'agency-websites.html': { name: 'Agency Website Design', desc: 'Professional websites for agencies designed to showcase your portfolio and attract more clients.' },
      'gym-fitness-websites': { name: 'Gym & Fitness Website Design', desc: 'Professional websites for gyms and fitness centers designed to attract more members.' },
      'gym-fitness-websites.html': { name: 'Gym & Fitness Website Design', desc: 'Professional websites for gyms and fitness centers designed to attract more members.' },
      'restaurant-websites': { name: 'Restaurant Website Design', desc: 'Professional websites for restaurants designed to attract more customers and showcase your menu.' },
      'restaurant-websites.html': { name: 'Restaurant Website Design', desc: 'Professional websites for restaurants designed to attract more customers and showcase your menu.' },
      'real-estate-websites': { name: 'Real Estate Website Design', desc: 'Professional websites for real estate agencies designed to showcase properties and attract more clients.' },
      'real-estate-websites.html': { name: 'Real Estate Website Design', desc: 'Professional websites for real estate agencies designed to showcase properties and attract more clients.' }
    };

    var fileName = path.split('/').pop().toLowerCase();

    if (staticServiceSlugs[fileName]) {
      return { type: 'service', data: staticServiceSlugs[fileName], fileName: fileName };
    }

    if (pathLower.indexOf('/pages/service.html') !== -1 || pathLower.indexOf('/service.html') !== -1) {
      return { type: 'service-dynamic', data: null };
    }

    if (fileName === 'services.html' || fileName === 'services') {
      return 'services-listing';
    }

    if (fileName === 'results.html' || fileName === 'results') {
      return 'results';
    }

    if (fileName === 'pricing.html' || fileName === 'pricing') {
      return 'pricing';
    }

    if (fileName === 'contact.html' || fileName === 'contact') {
      return 'contact';
    }

    if (fileName === 'about.html' || fileName === 'about') {
      return 'about';
    }

    if (fileName === 'blog.html' || fileName === 'blog') {
      return 'blog';
    }

    if (fileName === 'checkout.html' || fileName === 'checkout') {
      return 'checkout';
    }

    if (fileName === 'careers.html' || fileName === 'careers') {
      return 'careers';
    }

    if (pathLower.indexOf('/case-studies/') !== -1) {
      return 'case-study';
    }

    return 'other';
  }

  /* ─── EXTRACT FAQ FROM DOM ─── */
  function extractFAQ() {
    var questions = [];

    /* Homepage FAQ (.faq-p-item) */
    document.querySelectorAll('.faq-p-item').forEach(function (item) {
      var qEl = item.querySelector('.faq-p-q');
      var aEl = item.querySelector('.faq-p-answer-inner, .faq-p-answer');
      if (qEl && aEl) {
        questions.push({
          question: stripHtml(qEl.textContent),
          answer: stripHtml(aEl.innerHTML || aEl.textContent)
        });
      }
    });

    /* Service accordion FAQ (.fv-faq-item) */
    document.querySelectorAll('.fv-faq-item').forEach(function (item) {
      var qEl = item.querySelector('.fv-faq-question');
      var aEl = item.querySelector('.fv-faq-answer');
      if (qEl && aEl) {
        questions.push({
          question: stripHtml(qEl.textContent),
          answer: stripHtml(aEl.innerHTML || aEl.textContent)
        });
      }
    });

    /* Pricing FAQ (.np-faq-item) */
    document.querySelectorAll('.np-faq-item').forEach(function (item) {
      var qEl = item.querySelector('.np-faq-q');
      var aEl = item.querySelector('.np-faq-a');
      if (qEl && aEl) {
        questions.push({
          question: stripHtml(qEl.textContent),
          answer: stripHtml(aEl.innerHTML || aEl.textContent)
        });
      }
    });

    /* Contact FAQ (.ct-faq-item) */
    document.querySelectorAll('.ct-faq-item').forEach(function (item) {
      var qEl = item.querySelector('.ct-faq-q');
      var aEl = item.querySelector('.ct-faq-answer');
      if (qEl && aEl) {
        questions.push({
          question: stripHtml(qEl.textContent),
          answer: stripHtml(aEl.innerHTML || aEl.textContent)
        });
      }
    });

    return questions;
  }

  /* ─── EXTRACT TESTIMONIALS FROM DOM ─── */
  function extractTestimonials() {
    var testimonials = [];

    /* Results page testimonials */
    document.querySelectorAll('.r2-testimonial').forEach(function (el) {
      var nameEl = el.querySelector('.r2-testimonial-author-name');
      var roleEl = el.querySelector('.r2-testimonial-author-role');
      var textEl = el.querySelector('.r2-testimonial-text, .r2-testimonial-quote, blockquote');
      var ratingEl = el.querySelector('[class*="star"], [class*="rating"]');

      var name = nameEl ? stripHtml(nameEl.textContent) : '';
      var text = textEl ? stripHtml(textEl.innerHTML || textEl.textContent) : '';
      var rating = 5; /* All visible testimonials have 5 stars */

      if (name || text) {
        testimonials.push({ author: name, text: text, rating: rating, role: roleEl ? stripHtml(roleEl.textContent) : '' });
      }
    });

    /* Checkout testimonials */
    document.querySelectorAll('.chk-testimonial-card').forEach(function (el) {
      var nameEl = el.querySelector('.chk-testimonial-name');
      var roleEl = el.querySelector('.chk-testimonial-role');
      var textEl = el.querySelector('.chk-testimonial-text, .chk-testimonial-quote, blockquote');
      var starsEl = el.querySelector('[class*="star"]');

      var name = nameEl ? stripHtml(nameEl.textContent) : '';
      var text = textEl ? stripHtml(textEl.innerHTML || textEl.textContent) : '';
      var rating = starsEl ? 5 : null;

      if (name || text) {
        testimonials.push({ author: name, text: text, rating: rating, role: roleEl ? stripHtml(roleEl.textContent) : '' });
      }
    });

    /* Generic testimonial cards */
    document.querySelectorAll('.testimonial-card, .t-card').forEach(function (el) {
      var nameEl = el.querySelector('.testimonial-name, .t-name, .author-name');
      var textEl = el.querySelector('.testimonial-text, .t-text, .testimonial-content, blockquote');
      var name = nameEl ? stripHtml(nameEl.textContent) : '';
      var text = textEl ? stripHtml(textEl.innerHTML || textEl.textContent) : '';
      if (name || text) {
        testimonials.push({ author: name, text: text, rating: null, role: '' });
      }
    });

    return testimonials;
  }

  /* ─── GENERATE ALL SCHEMAS BASED ON PAGE TYPE ─── */
  function generateSchemas() {
    var pageType = detectPageType();

    /* Only add Organization and WebSite if not already inline (prevents duplicates) */
    if (!hasExistingSchema('Organization')) {
      addSchema(buildOrganization());
    }
    if (!hasExistingSchema('WebSite')) {
      addSchema(buildWebSite());
    }

    var isDynamicService = (typeof pageType === 'object' && pageType.type === 'service-dynamic');

    /* Add breadcrumb based on page type */
    if (typeof pageType === 'object' && pageType.type === 'service') {
      addSchema(buildServiceBreadcrumb(pageType.data.name));
      addSchema(buildService(pageType.data.name, pageType.data.desc));
    } else if (isDynamicService) {
      /* Dynamic service: only breadcrumb; Service/FAQ handled by injectServiceSchema */
      if (window.ServicesRenderer) {
        addSchema(buildBreadcrumb([
          { name: 'Home', url: '/' },
          { name: 'Services', url: '/pages/services.html' },
          { name: document.title.replace(' — Nagriva', '') || 'Service', url: undefined }
        ]));
      } else {
        addSchema(buildDefaultBreadcrumb());
      }
    } else {
      switch (pageType) {
        case 'home':
          addSchema(buildDefaultBreadcrumb());
          break;
        case 'services-listing':
          addSchema(buildBreadcrumb([
            { name: 'Home', url: '/' },
            { name: 'Services', url: undefined }
          ]));
          break;
        case 'results':
          addSchema(buildBreadcrumb([
            { name: 'Home', url: '/' },
            { name: 'Results', url: undefined }
          ]));
          break;
        case 'pricing':
          addSchema(buildBreadcrumb([
            { name: 'Home', url: '/' },
            { name: 'Pricing', url: undefined }
          ]));
          break;
        case 'contact':
          addSchema(buildBreadcrumb([
            { name: 'Home', url: '/' },
            { name: 'Contact', url: undefined }
          ]));
          break;
        case 'about':
          addSchema(buildBreadcrumb([
            { name: 'Home', url: '/' },
            { name: 'About', url: undefined }
          ]));
          break;
        case 'blog':
          addSchema(buildBreadcrumb([
            { name: 'Home', url: '/' },
            { name: 'Blog', url: undefined }
          ]));
          break;
        case 'checkout':
          addSchema(buildBreadcrumb([
            { name: 'Home', url: '/' },
            { name: 'Checkout', url: undefined }
          ]));
          break;
        case 'careers':
          addSchema(buildBreadcrumb([
            { name: 'Home', url: '/' },
            { name: 'Careers', url: undefined }
          ]));
          break;
        case 'case-study':
          addSchema(buildBreadcrumb([
            { name: 'Home', url: '/' },
            { name: 'Results', url: '/pages/results.html' },
            { name: 'Case Study', url: undefined }
          ]));
          break;
        default:
          addSchema(buildDefaultBreadcrumb());
          break;
      }
    }

    /* Extract and add FAQ schema from DOM (skip for dynamic service pages) */
    if (!isDynamicService) {
      var faqQuestions = extractFAQ();
      if (faqQuestions.length > 0) {
        var faqSchema = buildFAQPage(faqQuestions);
        if (faqSchema) addSchema(faqSchema);
      }
    }

    /* Extract and add Review schemas from DOM */
    var testimonials = extractTestimonials();
    if (testimonials.length > 0) {
      testimonials.forEach(function (t) {
        addSchema(buildReview(t.author, t.text, t.rating, ORG_NAME));
      });
    }
  }

  /* ─── INIT ─── */
  function init() {
    /* Wait for dynamic content to load */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(generateAndInject, 500);
      });
    } else {
      setTimeout(generateAndInject, 500);
    }
  }

  function generateAndInject() {
    PAGE_SCHEMAS = [];
    generateSchemas();
    injectSchemas();
  }

  /* Expose for debugging and for dynamic service template integration */
  window.NagrivaSchema = {
    generate: generateAndInject,
    buildOrganization: buildOrganization,
    buildWebSite: buildWebSite,
    buildBreadcrumb: buildBreadcrumb,
    buildService: buildService,
    buildFAQPage: buildFAQPage,
    buildReview: buildReview
  };

  init();
})();
