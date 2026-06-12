/* ════════════════════════════════════════════════════════
   Nagriva — Dynamic Content Loader
   Loads custom content from Supabase and merges into
   the i18n system. Falls back to hardcoded defaults.
   ════════════════════════════════════════════════════════ */

'use strict';

const NAGRIVA_ContentLoader = (() => {
  let contentMap = {};
  let loaded = false;

  const DEFAULT_CONTENT = {
    /* ─── Navbar ─── */
    'nav.home': 'Home',
    'nav.services': 'Services',
    'nav.results': 'Results',
    'nav.pricing': 'Pricing',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.blog': 'Blog',
    'nav.web-design': 'Websites',
    'nav.seo': 'E-Commerce',
    'nav.branding': 'Blogs',
    'nav.ai-automation': 'Video',
    'nav.social-media': 'Social Media',
    'nav.strategy': 'Strategy',
    'nav.dashboard': 'Dashboard',
    'nav.orders': 'Orders',
    'nav.profile': 'Profile',
    'nav.signin': 'Sign In',
    'nav.book-call': 'Book a Free Call',

    /* ─── Hero ─── */
    'hero.badge': 'Digital Growth Agency',
    'hero.title': 'Grow Your Brand.<br/>Scale Your Revenue.',
    'hero.subtitle': 'We design, optimize and grow websites that attract more traffic, convert more leads and scale your business — with precision and strategy.',
    'hero.cta': 'Book a Free Call',
    'hero.view-results': 'View Results',
    'hero.trust-fast': 'Fast Results',
    'hero.trust-seo': 'SEO Optimized',
    'hero.trust-conversion': 'Conversion Focused',

    /* ─── Dashboard ─── */
    'dash.greeting': 'Welcome back',
    'dash.subtitle': 'Here\'s what\'s happening with your projects.',
    'dash.badge': 'All systems operational',
    'dash.active-label': 'Active Projects',
    'dash.active-hint': 'Currently in progress',
    'dash.completed-label': 'Completed Projects',
    'dash.completed-hint': 'Delivered orders',
    'dash.pending-label': 'Pending Orders',
    'dash.pending-hint': 'Awaiting processing',
    'dash.messages-label': 'Messages',
    'dash.messages-hint': 'Unread conversations',
    'dash.orders-title': 'Recent Orders',
    'dash.activity-title': 'Recent Activity',

    /* ─── Footer ─── */
    'footer.desc': 'We turn your website into a client-generating machine. Design, SEO, and growth for modern brands.',
    'footer.copyright': '© 2026 Nagriva. All rights reserved.',
    'footer.quick-links': 'Quick Links',
    'footer.services': 'Services',
    'footer.legal': 'Legal',
    'footer.newsletter': 'Newsletter',
    'footer.newsletter-desc': 'Get the latest growth tips and insights delivered to your inbox.',
    'footer.newsletter-placeholder': 'your@email.com',
    'footer.privacy-policy': 'Privacy Policy',
    'footer.terms-of-service': 'Terms of Service',

    /* ─── CTA ─── */
    'cta.title': 'Ready to Transform<br/>Your Digital Presence?',
    'cta.desc': 'Book a free strategy call. No commitment — just a conversation about your goals.',
    'cta.btn': 'Book Your Free Call',

    /* ─── Contact ─── */
    'contact.badge': 'Let\'s talk',
    'contact.title': 'Ready to Grow Your Business?',
    'contact.desc': 'Book a free strategy call and let\'s map out a growth plan tailored to your brand. No commitment, just results.',
    'contact.name': 'Your Name',
    'contact.email': 'Your Email',
    'contact.message': 'Your Message',
    'contact.send': 'Send Message',

    /* ─── Services ─── */
    'services.tag': '✦ What we do',
    'services.title': 'Everything You Need to Grow',
    'services.subtitle': 'End-to-end digital solutions crafted to position your brand ahead of the competition.',
    'services.cta': 'See More Services',

    /* ─── Results ─── */
    'results.tag': 'By the numbers',
    'results.title': 'Our Impact',
    'results.subtitle': 'Measurable outcomes that compound over time for our clients.',

    /* ─── FAQ ─── */
    'faq.tag': '✦ FAQ',
    'faq.title': 'Frequently Asked Questions',
    'faq.subtitle': 'Everything you need to know about working with us. Can\'t find what you\'re looking for? Our team is here to help.',

    /* ─── Auth ─── */
    'auth.welcome': 'Welcome Back',
    'auth.subtitle': 'Sign in to access your dashboard and manage your projects.',
    'auth.signin': 'Sign In',
    'auth.signup': 'Sign Up',
    'auth.create-account': 'Create Account',
    'auth.forgot-password': 'Forgot password?',
    'auth.remember-me': 'Remember me',
    'auth.or-continue': 'or continue with',
    'auth.no-account': 'Don\'t have an account?',
    'auth.has-account': 'Already have an account?',
    'auth.create-one': 'Create one',
    'auth.signin-link': 'Sign in',

    /* ─── Section Headings ─── */
    'section.projects': 'Recent Projects',
    'section.pricing': 'Plans & Packages',

    /* ─── Admin Dashboard ─── */
    'admin.sidebar-dashboard': 'Dashboard',
    'admin.sidebar-orders': 'Orders',
    'admin.sidebar-clients': 'Clients',
    'admin.sidebar-messages': 'Messages',
    'admin.sidebar-files': 'Files',
    'admin.sidebar-revisions': 'Revisions',
    'admin.sidebar-services': 'Services',
    'admin.sidebar-payments': 'Payments',
    'admin.sidebar-invoices': 'Invoices',
    'admin.sidebar-analytics': 'Analytics',
    'admin.sidebar-settings': 'Settings',
    'admin.page-title': 'Settings',
    'admin.page-desc': 'Manage your entire platform configuration — branding, payments, notifications & more.',
  };

  /* ─── Fetch content from Supabase ─── */
  async function loadContent() {
    if (loaded) return contentMap;
    loaded = true;
    try {
      const remote = await NAGRIVA_ContentAPI.getAllContent();
      contentMap = { ...DEFAULT_CONTENT, ...remote };
    } catch (err) {
      console.warn('[ContentLoader] Using defaults:', err.message);
      contentMap = { ...DEFAULT_CONTENT };
    }
    return contentMap;
  }

  /* ─── Get a single content value with fallback ─── */
  function get(key) {
    if (contentMap[key] !== undefined && contentMap[key] !== '') {
      return contentMap[key];
    }
    return DEFAULT_CONTENT[key] || '';
  }

  /* ─── Apply content to the DOM ─── */
  function applyToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const custom = contentMap[key];
      if (custom !== undefined && custom !== null && custom !== '') {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          // handled by placeholder
        } else {
          el.innerHTML = custom;
        }
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const custom = contentMap[key];
      if (custom !== undefined && custom !== null && custom !== '') {
        el.setAttribute('placeholder', custom);
      }
    });
  }

  /* ─── Reload and re-apply content (called after CMS save) ─── */
  async function refresh(applyImmediately) {
    loaded = false;
    await loadContent();
    if (applyImmediately !== false) {
      if (window.NagrivaI18n && NagrivaI18n.translate) {
        NagrivaI18n.translate(NagrivaI18n.getLang());
      }
      applyToDOM();
    }
  }

  /* ─── Init ─── */
  async function init() {
    await loadContent();
    applyToDOM();
  }

  return {
    init,
    loadContent,
    get,
    getAll: () => contentMap,
    getDefaults: () => DEFAULT_CONTENT,
    refresh,
    applyToDOM
  };
})();

/* ─── Auto-init after DOM and i18n are ready ─── */
(function autoInitContent() {
  function tryInit() {
    if (document.querySelector('[data-i18n]') && window.NagrivaI18n) {
      NAGRIVA_ContentLoader.init();
      return true;
    }
    return false;
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (!tryInit()) {
      setTimeout(tryInit, 300);
    }
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(tryInit, 500);
    });
  }
})();
