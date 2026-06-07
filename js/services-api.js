/* ════════════════════════════════════════════════════════
   Nagriva — Services API Layer
   services-api.js
   Fetches service data from Supabase with TTL cache + fallback
   ════════════════════════════════════════════════════════ */

window.ServicesAPI = (function () {
  'use strict';

  var CACHE_TTL = 5 * 60 * 1000;
  var _cache = {};
  var _allCache = null;

  var SERVICE_FOLDERS = {
    'website-development': {
      folder: 'website development',
      files: ['website-1.png', 'website-2.jpg', 'website-3.jpg']
    },
    'blog-creation': {
      folder: 'blog creation',
      files: ['blog-creation-1.png', 'blog-creation-2.jpg', 'blog-creation-3.jpg']
    },
    'ecommerce-stores': {
      folder: 'ecommerce stores',
      files: ['ecommerce-stores-1.png', 'ecommerce-stores-2.jpg', 'ecommerce-stores-3.jpg']
    },
    'video-editing': {
      folder: 'video editing',
      files: ['video-editing-1.png', 'video-editing-2.jpg', 'video-editing-3.jpg']
    }
  };

  var FALLBACK_IMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="#1a1a2e"/><text x="400" y="250" font-family="system-ui,sans-serif" font-size="18" fill="#555" text-anchor="middle" dominant-baseline="middle">Image not available</text></svg>');

  function getGalleryImages(slug) {
    var base = '/assets/images/services/';
    var entry = SERVICE_FOLDERS[slug];

    if (entry) {
      return entry.files.map(function (f) {
        return base + encodeURIComponent(entry.folder) + '/' + encodeURIComponent(f);
      });
    }

    return [
      base + slug + '-1.jpg',
      base + slug + '-2.jpg',
      base + slug + '-3.jpg'
    ];
  }

  /* ════════════════════════════════════════════════════════
     FALLBACK DATA — embedded so no blocking network request
     ════════════════════════════════════════════════════════ */

  var FALLBACK = {

    'website-development': {
      slug: 'website-development',
      category: 'Web Development',
      cardEmoji: '&#127760;',
      cardFeatures: ['Dentist Websites', 'Lawyer Websites', 'Car Rental Websites'],
      pageTitle: 'Website Development — Nagriva',
      metaDescription: 'Professional website development for dentists, lawyers, and car rental companies. Modern, conversion-optimized sites that generate leads.',
      breadcrumbCurrent: 'Website Development',
      title: 'Website Development That <span class="sp-text-glow">Generates</span> Clients',
      highlights: ['Dentist Websites', 'Lawyer Websites', 'Car Rental Websites', 'Conversion Optimized'],
      sellerName: 'Nagriva Agency',
      sellerLabel: 'Premium Digital Agency \u2022 Industry-Focused',
      rating: 4.9,
      reviewCount: 128,
      satisfaction: 98,
      image: getGalleryImages('website-development')[0],
      gallery: getGalleryImages('website-development'),
      description: '<p>We build high-converting professional websites tailored specifically for dentists, lawyers, and car rental companies. Your website is your most powerful marketing tool \u2014 we make sure it works as hard as you do.</p><p>From appointment-driven dental practices to client-seeking law firms and booking-focused car rental agencies, every site we build is strategically designed to attract your ideal clients and convert them into paying customers.</p>',
      benefits: [
        { icon: 'layers', title: 'Industry-Specific Design', text: 'Tailored layouts and messaging that resonate with your specific audience and drive conversions.' },
        { icon: 'clock', title: 'Fast Turnaround', text: 'Professional websites delivered in as little as 2 weeks without compromising on quality.' },
        { icon: 'file', title: 'SEO Optimized', text: 'Built with on-page SEO best practices so local clients find you first on Google.' },
        { icon: 'users', title: 'Mobile Responsive', text: 'Flawless performance across all devices \u2014 phones, tablets, and desktops.' }
      ],
      process: [
        { num: '01', title: 'Discovery Call', text: 'We learn about your practice or business, your goals, and what makes you unique.' },
        { num: '02', title: 'Design & Draft', text: 'We create a custom design tailored to your industry and brand identity.' },
        { num: '03', title: 'Development & Content', text: 'We build your site with clean code and populate it with compelling content.' },
        { num: '04', title: 'Launch & Grow', text: 'We deploy your site and set up the tools you need to keep growing.' }
      ],
      faq: [
        { question: 'Do you specialize in specific industries?', answer: 'Yes. We focus on three industries: dental practices, law firms, and car rental companies. This specialization allows us to create websites that speak directly to your clients and meet the specific needs of your profession.' },
        { question: 'How long does it take to build my website?', answer: 'Most professional websites are completed within 2-4 weeks, depending on complexity and content readiness. We\'ll provide a clear timeline during our discovery call.' },
        { question: 'Will my website rank on Google?', answer: 'Absolutely. Every website we build includes on-page SEO optimization, local SEO setup, and Google Business Profile integration to help you rank higher in local searches.' },
        { question: 'Do you offer maintenance after launch?', answer: 'Yes, we offer monthly maintenance plans to keep your site secure, updated, and optimized. We also provide ongoing support for content updates and changes.' }
      ],
      results: [
        { num: '50+', label: 'Websites Built' },
        { num: '3.2x', label: 'Avg. Lead Increase' },
        { num: '98%', label: 'Client Satisfaction' },
        { num: '2 Weeks', label: 'Avg. Delivery Time' }
      ],
      packages: [
        { name: 'Starter Package', shortName: 'Starter', price: '1,499', delivery: '2-Week Delivery', revisions: '2 Revisions', features: ['5-Page Professional Website', 'Mobile Responsive Design', 'Contact Form Integration', 'Basic SEO Setup', 'Google Business Profile Setup'], popular: false },
        { name: 'Growth Package', shortName: 'Growth', price: '2,999', delivery: '3-Week Delivery', revisions: 'Unlimited Revisions', features: ['8-Page Website', 'Unlimited Revisions', 'CMS Integration', 'Full SEO Optimization', 'Analytics Dashboard', '30-Day Support'], popular: true, featured: true },
        { name: 'Scale Package', shortName: 'Scale', price: '4,999', delivery: '4-Week Delivery', revisions: 'Unlimited Revisions', features: ['Custom Multi-Page Site', 'Booking/Appointment System', 'Advanced SEO Package', 'Dedicated Project Manager', 'Priority Support', '90-Day Maintenance'], popular: false }
      ],
      trustItems: [
        { icon: 'lock', text: 'Secure Payment' },
        { icon: 'star', text: '98% Satisfaction' },
        { icon: 'clockMeta', text: 'On-Time Delivery' },
        { icon: 'users', text: 'Dedicated Support' },
        { icon: 'shield', text: 'Money-Back Guarantee' }
      ]
    },

    'ecommerce-stores': {
      slug: 'ecommerce-stores',
      category: 'E-Commerce',
      cardEmoji: '&#128722;',
      cardFeatures: ['WooCommerce Stores', 'Product Setup', 'Mobile Responsive Design'],
      pageTitle: 'E-Commerce Development — Nagriva',
      metaDescription: 'WordPress + WooCommerce e-commerce stores with product setup and mobile responsive design. Launch your online store fast.',
      breadcrumbCurrent: 'E-Commerce Development',
      title: 'E-Commerce Stores That <span class="sp-text-glow">Sell</span>',
      highlights: ['WordPress + WooCommerce', 'Product Setup', 'Mobile Responsive', 'Ready to Launch'],
      sellerName: 'Nagriva Agency',
      sellerLabel: 'Premium Digital Agency \u2022 E-Commerce Experts',
      rating: 4.9,
      reviewCount: 128,
      satisfaction: 98,
      image: getGalleryImages('ecommerce-stores')[0],
      gallery: getGalleryImages('ecommerce-stores'),
      description: '<p>We build professional e-commerce stores using WordPress and WooCommerce that are ready to accept orders from day one. From product setup to payment gateway integration, we handle everything so you can focus on selling.</p><p>Our stores are designed to be intuitive for your customers and easy for you to manage. Every store is fully mobile responsive, SEO optimized, and built to convert browsers into buyers.</p>',
      benefits: [
        { icon: 'layers', title: 'WordPress + WooCommerce', text: 'The most powerful and flexible e-commerce platform with complete control over your store.' },
        { icon: 'clock', title: 'Product Setup Included', text: 'We configure your products, categories, pricing, and images so your store is ready to sell.' },
        { icon: 'image', title: 'Mobile Responsive Design', text: 'Beautiful shopping experiences on every device \u2014 mobile, tablet, and desktop.' },
        { icon: 'users', title: 'Payment & Shipping Ready', text: 'Integrated payment gateways, shipping options, and tax configurations out of the box.' }
      ],
      process: [
        { num: '01', title: 'Store Strategy', text: 'We define your product catalog structure, target audience, and store goals.' },
        { num: '02', title: 'Design & Setup', text: 'Custom store design with product pages, categories, and seamless navigation.' },
        { num: '03', title: 'Product Configuration', text: 'Full product setup with descriptions, images, pricing, inventory, and variations.' },
        { num: '04', title: 'Launch & Test', text: 'Payment testing, checkout optimization, and full quality assurance before going live.' }
      ],
      faq: [
        { question: 'Why WooCommerce over other platforms?', answer: 'WooCommerce gives you complete ownership of your store, unlimited customization options, no transaction fees, and full control over your data. It scales from a few products to thousands.' },
        { question: 'How many products can you set up?', answer: 'Our packages include setup for up to 20 products (Starter), 50 products (Growth), and unlimited products (Scale). Additional products can be added at a per-product rate.' },
        { question: 'Do you integrate payment gateways?', answer: 'Yes, we integrate all major payment gateways including Stripe, PayPal, Square, and bank transfers. We also configure tax settings and shipping zones.' },
        { question: 'Can I manage the store myself after launch?', answer: 'Absolutely. We provide a walkthrough of the WooCommerce dashboard and ongoing support. The Growth and Scale packages include training sessions for your team.' }
      ],
      results: [
        { num: '30+', label: 'Stores Launched' },
        { num: '4.5x', label: 'Avg. Revenue Growth' },
        { num: '96%', label: 'Client Satisfaction' },
        { num: '99.9%', label: 'Uptime Guarantee' }
      ],
      packages: [
        { name: 'Starter Package', shortName: 'Starter', price: '2,499', delivery: '3-Week Delivery', revisions: '2 Revisions', features: ['WooCommerce Store Setup', 'Up to 20 Products', 'Mobile Responsive Design', 'Payment Gateway Setup', 'Basic SEO Setup'], popular: false },
        { name: 'Growth Package', shortName: 'Growth', price: '3,999', delivery: '4-Week Delivery', revisions: 'Unlimited Revisions', features: ['Full Store Design', 'Up to 50 Products', 'Unlimited Revisions', 'Advanced SEO', 'Analytics Dashboard', 'Team Training'], popular: true, featured: true },
        { name: 'Scale Package', shortName: 'Scale', price: '5,999', delivery: '6-Week Delivery', revisions: 'Unlimited Revisions', features: ['Custom Store Build', 'Unlimited Products', 'Inventory Management', 'Email Marketing Setup', 'Dedicated Manager', '90-Day Support'], popular: false }
      ],
      trustItems: [
        { icon: 'lock', text: 'Secure Payment' },
        { icon: 'star', text: '96% Satisfaction' },
        { icon: 'clockMeta', text: 'On-Time Delivery' },
        { icon: 'users', text: 'Dedicated Support' },
        { icon: 'shield', text: 'Money-Back Guarantee' }
      ]
    },

    'blog-creation': {
      slug: 'blog-creation',
      category: 'Content',
      cardEmoji: '&#128221;',
      cardFeatures: ['WordPress Blogs', 'Blogger Blogs', 'SEO Ready Setup'],
      pageTitle: 'Blog Creation — Nagriva',
      metaDescription: 'Professional blog creation on WordPress and Blogger. SEO-ready setup with professional design to grow your audience.',
      breadcrumbCurrent: 'Blog Creation',
      title: 'Blog Creation That <span class="sp-text-glow">Builds</span> Your Audience',
      highlights: ['WordPress Blogs', 'Blogger Blogs', 'SEO-Ready Setup', 'Professional Design'],
      sellerName: 'Nagriva Agency',
      sellerLabel: 'Premium Digital Agency \u2022 Content Specialists',
      rating: 4.9,
      reviewCount: 128,
      satisfaction: 98,
      image: getGalleryImages('blog-creation')[0],
      gallery: getGalleryImages('blog-creation'),
      description: '<p>We create professional blogs on WordPress and Blogger that are designed to attract readers, rank on Google, and grow your audience. Whether you\'re a personal brand, a business, or a content creator, we set up everything for success.</p><p>From platform selection and hosting setup to professional design and SEO configuration, we handle the technical heavy lifting so you can focus on writing great content.</p>',
      benefits: [
        { icon: 'layers', title: 'Platform Flexibility', text: 'Choose between WordPress (self-hosted) or Blogger \u2014 we\'ll set up and optimize either platform.' },
        { icon: 'search', title: 'SEO-Ready From Day One', text: 'Pre-configured SEO settings, meta tags, XML sitemaps, and search engine verification.' },
        { icon: 'image', title: 'Professional Design', text: 'Modern, clean blog design with custom typography, colors, and layout that matches your brand.' },
        { icon: 'file', title: 'Content Structure', text: 'Organized categories, tags, author profiles, and a content strategy framework to keep you on track.' }
      ],
      process: [
        { num: '01', title: 'Platform Selection', text: 'We help you choose the right platform based on your goals, budget, and technical comfort.' },
        { num: '02', title: 'Setup & Configuration', text: 'Domain, hosting, platform installation, and all technical configurations handled for you.' },
        { num: '03', title: 'Design & Branding', text: 'Custom blog design with your brand colors, logo, typography, and layout preferences.' },
        { num: '04', title: 'SEO & Launch', text: 'Complete SEO setup, content structure, and launch with ongoing optimization recommendations.' }
      ],
      faq: [
        { question: 'Should I choose WordPress or Blogger?', answer: 'WordPress offers more flexibility, ownership, and scalability \u2014 ideal for serious bloggers and businesses. Blogger is simpler and free, great for beginners or hobby bloggers. We\'ll help you decide.' },
        { question: 'Do you provide hosting for WordPress blogs?', answer: 'We recommend and can set up hosting with trusted providers. Hosting costs are separate from our service fee. We handle the entire setup process for you.' },
        { question: 'Will my blog be ready to rank on Google?', answer: 'Yes. Every blog we create includes full SEO configuration \u2014 meta tags, keyword optimization, XML sitemaps, Google Search Console setup, and more.' },
        { question: 'Can you help with content after launch?', answer: 'Absolutely. We offer content strategy sessions, editorial calendar setup, and can connect you with professional writers if needed. Just ask!' }
      ],
      results: [
        { num: '40+', label: 'Blogs Created' },
        { num: '5.2x', label: 'Avg. Traffic Growth' },
        { num: '97%', label: 'Client Satisfaction' },
        { num: '2 Weeks', label: 'Avg. Setup Time' }
      ],
      packages: [
        { name: 'Starter Package', shortName: 'Starter', price: '799', delivery: '1-Week Delivery', revisions: '2 Revisions', features: ['Blog Platform Setup', 'Professional Design', 'Basic SEO Setup', '3 Categories Setup', 'Social Media Integration'], popular: false },
        { name: 'Growth Package', shortName: 'Growth', price: '1,499', delivery: '2-Week Delivery', revisions: 'Unlimited Revisions', features: ['Full Blog Creation', 'Custom Branded Design', 'Unlimited Revisions', 'Advanced SEO Setup', 'Email List Integration', 'Content Strategy Session'], popular: true, featured: true },
        { name: 'Scale Package', shortName: 'Scale', price: '2,499', delivery: '3-Week Delivery', revisions: 'Unlimited Revisions', features: ['Premium Blog Build', 'Complete Brand Identity', 'Custom Features & Plugins', 'Monetization Setup', 'Dedicated Manager', 'Priority Support'], popular: false }
      ],
      trustItems: [
        { icon: 'lock', text: 'Secure Payment' },
        { icon: 'star', text: '97% Satisfaction' },
        { icon: 'clockMeta', text: 'Fast Delivery' },
        { icon: 'users', text: 'Dedicated Support' },
        { icon: 'shield', text: 'Money-Back Guarantee' }
      ]
    },

    'video-editing': {
      slug: 'video-editing',
      category: 'Video',
      cardEmoji: '&#127916;',
      cardFeatures: ['Reels Editing', 'YouTube Shorts', 'Social Media Videos'],
      pageTitle: 'Video Editing — Nagriva',
      metaDescription: 'Professional short-form video editing for social media. Reels, Shorts, and TikTok videos that stop the scroll and grow your audience.',
      breadcrumbCurrent: 'Video Editing',
      title: 'Video Editing That <span class="sp-text-glow">Stops</span> the Scroll',
      highlights: ['Short-Form Editing', 'Social Media Content', 'Reels & Shorts', 'TikTok Videos'],
      sellerName: 'Nagriva Agency',
      sellerLabel: 'Premium Digital Agency \u2022 Video Specialists',
      rating: 4.9,
      reviewCount: 128,
      satisfaction: 98,
      image: getGalleryImages('video-editing')[0],
      gallery: getGalleryImages('video-editing'),
      description: '<p>We create scroll-stopping short-form videos optimized for social media platforms. From Instagram Reels to YouTube Shorts and TikTok, our edits are designed to capture attention, drive engagement, and grow your following.</p><p>Our video editing service includes professional cuts, transitions, captions, color grading, sound design, and platform-specific optimization so your content performs its best everywhere.</p>',
      benefits: [
        { icon: 'edit', title: 'Short-Form Expertise', text: 'Specialized in Reels, Shorts, and TikTok content that drives engagement and shares.' },
        { icon: 'clock', title: 'Fast Turnaround', text: 'Most edits delivered within 24-48 hours so you can maintain a consistent posting schedule.' },
        { icon: 'layers', title: 'Platform Optimized', text: 'Every video is formatted and optimized for each platform\'s unique requirements and algorithm.' },
        { icon: 'users', title: 'Trend-Aware Editing', text: 'We stay on top of trending audio, effects, and formats to maximize your content\'s reach.' }
      ],
      process: [
        { num: '01', title: 'Content Review', text: 'We review your raw footage, brand guidelines, and content goals to plan the edit.' },
        { num: '02', title: 'Rough Cut', text: 'First draft with music, transitions, and basic effects aligned with your vision.' },
        { num: '03', title: 'Refinement', text: 'Fine-tuning with captions, color grading, sound design, and platform-specific adjustments.' },
        { num: '04', title: 'Final Delivery', text: 'Platform-ready exports delivered in all required formats and aspect ratios.' }
      ],
      faq: [
        { question: 'What type of videos do you edit?', answer: 'We specialize in short-form content: Instagram Reels, YouTube Shorts, TikTok videos, and social media ads. We also edit longer content that can be repurposed into short clips.' },
        { question: 'How long does a typical edit take?', answer: 'Standard edits are delivered within 24-48 hours. Rush orders can be completed in as little as 12 hours for an additional fee.' },
        { question: 'Do you add captions and subtitles?', answer: 'Yes, every video includes professionally styled captions optimized for silent viewing \u2014 essential for social media engagement.' },
        { question: 'Can you work with my existing brand style?', answer: 'Absolutely. We follow your brand guidelines for colors, fonts, and overall aesthetic to ensure consistency across all your content.' }
      ],
      results: [
        { num: '500+', label: 'Videos Edited' },
        { num: '4.8x', label: 'Avg. Engagement Boost' },
        { num: '99%', label: 'Client Satisfaction' },
        { num: '24hrs', label: 'Avg. Turnaround' }
      ],
      packages: [
        { name: 'Starter Package', shortName: 'Starter', price: '199', delivery: '48-Hour Delivery', revisions: '2 Revisions', features: ['1 Short-Form Video Edit', 'Captions & Subtitles', 'Background Music', 'Color Grading', 'Platform Optimization'], popular: false },
        { name: 'Growth Package', shortName: 'Growth', price: '399', delivery: '1-Week Delivery', revisions: 'Unlimited Revisions', features: ['5 Short-Form Videos', 'Unlimited Revisions', 'Custom Graphics', 'Sound Design', 'Trending Effects', 'Priority Support'], popular: true, featured: true },
        { name: 'Scale Package', shortName: 'Scale', price: '699', delivery: '2-Week Delivery', revisions: 'Unlimited Revisions', features: ['15 Short-Form Videos', 'Bulk Content Strategy', 'Full Post-Production', 'Custom Animation', 'Dedicated Editor', 'Rush Delivery Available'], popular: false }
      ],
      trustItems: [
        { icon: 'lock', text: 'Secure Payment' },
        { icon: 'star', text: '99% Satisfaction' },
        { icon: 'clockMeta', text: 'Fast Turnaround' },
        { icon: 'users', text: 'Dedicated Support' },
        { icon: 'shield', text: 'Money-Back Guarantee' }
      ]
    }
  };

  /* ════════════════════════════════════════════════════════
     TRANSFORM: Supabase row (snake_case) → Renderer shape (camelCase)
     ════════════════════════════════════════════════════════ */

  function _parseJSON(val) {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return val || [];
  }

  function _fixUnicode(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\\u([0-9a-fA-F]{4})/g, function (_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    });
  }

  function _applyServicePhotos(service) {
    if (!service || !service.slug) return service;
    var normalized = {};
    Object.keys(service).forEach(function (key) {
      normalized[key] = service[key];
    });
    var images = getGalleryImages(service.slug);
    normalized.image = images[0] || '';
    normalized.gallery = images;
    return normalized;
  }

  function _transformRow(row) {
    if (!row) return null;
    return _applyServicePhotos({
      slug: row.slug || '',
      pageTitle: row.meta_title || row.title + ' — Nagriva',
      metaDescription: row.meta_description || row.short_description || '',
      breadcrumbCurrent: row.title || '',
      title: row.hero_title || row.title || '',
      short_description: row.short_description || '',
      category: row.category || '',
      image: row.image || (Array.isArray(_parseJSON(row.gallery)) && _parseJSON(row.gallery)[0]) || '',
      highlights: _parseJSON(row.highlights),
      sellerName: row.seller_name || 'Nagriva Agency',
      sellerLabel: _fixUnicode(row.seller_label) || 'Premium Digital Agency \u2022 Top 1% of Designers',
      rating: row.rating || 4.9,
      reviewCount: row.review_count || 128,
      satisfaction: row.satisfaction || 98,
      gallery: _parseJSON(row.gallery),
      description: row.description || row.full_description || '',
      benefits: _parseJSON(row.benefits),
      process: _parseJSON(row.process),
      faq: _parseJSON(row.faq),
      results: _parseJSON(row.results),
      packages: _parseJSON(row.packages),
      trustItems: _parseJSON(row.trust_items)
    });
  }

  /* ════════════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════════════ */

  function fetchService(slug) {
    // Always use embedded fallback data for the 4 core services
    return Promise.resolve(_applyServicePhotos(FALLBACK[slug] || FALLBACK['website-development']));
  }

  function getAllServices(options) {
    options = options || {};
    // Always use embedded fallback data for the 4 core services
    var all = Object.keys(FALLBACK).map(function (k) { return _applyServicePhotos(FALLBACK[k]); });
    if (options.featured) {
      all = all.filter(function (s) { return s.featured; });
    }
    return Promise.resolve(all);
  }

  return {
    fetchService: fetchService,
    getAllServices: getAllServices,
    getGalleryImages: getGalleryImages,
    FALLBACK_IMG: FALLBACK_IMG
  };
})();
