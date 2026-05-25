/* ════════════════════════════════════════════════════════
   NAGRIVA — Premium Digital Agency
   script.js
════════════════════════════════════════════════════════ */

'use strict';

/* ─── Device Helpers ─── */
const isMobile = window.innerWidth < 768;
const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

// Detect Android for rendering stability workarounds
(function detectAndroid() {
  if (/android/i.test(navigator.userAgent)) {
    document.documentElement.classList.add('is-android');
  }
})();

/* ─── DOM READY ─── */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initHamburger();
  initScrollAnimations();
  initCounters();
  initFAQ();
  initSmoothScroll();
  initActiveNavLink();
  initContactForm();
  initProjectModals();
  initServiceCTA();
  initHomepageServices();
});

/* ════════════════════════════════════════════
   PROJECT MODALS
════════════════════════════════════════════ */
const projectData = {
  velour: {
    title: 'VELOUR — E-Commerce Experience',
    category: '✦ Fashion & Luxury',
    image: '/assets/images/projects/VELOUR — E-Commerce Experience.png',
    desc: 'A luxury e-commerce platform designed for a premium fashion brand. Every interaction, from browse to checkout, is crafted to reflect elegance and drive conversion.',
    services: ['Web Design', 'Brand Identity', 'Performance Marketing'],
    results: [
      { value: '3.2x', label: 'Conversion' },
      { value: '+186%', label: 'Revenue Growth' },
      { value: '+40%', label: 'Avg. Order Value' }
    ]
  },
  nomad: {
    title: 'NOMAD — Travel Booking Platform',
    category: '✦ Travel & Hospitality',
    image: '/assets/images/projects/NOMAD — Travel Booking Platform.png',
    desc: 'A seamless travel booking platform that simplifies itinerary management and delivers personalized recommendations at every step of the journey.',
    services: ['Web Design', 'SEO', 'AI Automation'],
    results: [
      { value: '2.5x', label: 'Booking Conv.' },
      { value: '60%', label: 'Faster Checkout' },
      { value: '4.7★', label: 'User Rating' }
    ]
  },
  pulse: {
    title: 'Pulse — Analytics Dashboard',
    category: '✦ Data & Analytics',
    image: '/assets/images/projects/Pulse — Analytics Dashboard.png',
    desc: 'An enterprise-grade analytics dashboard with real-time data visualization, customizable reports, and AI-powered insights for confident decision-making.',
    services: ['Web Design', 'AI Automation'],
    results: [
      { value: '45%', label: 'Faster Reports' },
      { value: '10k+', label: 'Daily Users' },
      { value: '99.9%', label: 'Uptime SLA' }
    ]
  },
  bite: {
    title: 'Bite — Food Delivery App',
    category: '✦ Food & Mobile',
    image: '/assets/images/projects/Bite — Food Delivery App.png',
    desc: 'A modern food delivery platform with intelligent order routing, real-time tracking, and a dynamic recommendation engine that keeps users engaged.',
    services: ['Web Design', 'Performance Marketing'],
    results: [
      { value: '3x', label: 'Daily Orders' },
      { value: '4.8★', label: 'App Rating' },
      { value: '35%', label: 'Repeat Rate' }
    ]
  },
  vault: {
    title: 'Vault — Fintech Dashboard',
    category: '✦ Fintech & Security',
    image: '/assets/images/projects/Vault — Fintech Dashboard.png',
    desc: 'A premium fintech dashboard combining advanced trading features with bank-grade security, real-time portfolio tracking, and intelligent risk management.',
    services: ['Web Design', 'Brand Identity', 'SEO'],
    results: [
      { value: '$2M+', label: 'Assets Managed' },
      { value: '99.9%', label: 'Platform Uptime' },
      { value: '4.9★', label: 'Security Rating' }
    ]
  }
};

function initProjectModals() {
  const modal = document.getElementById('pjModal');
  const cards = document.querySelectorAll('.pj-card');
  if (!modal || !cards.length) return;

  const closeBtn = modal.querySelector('.pj-modal-close');
  const modalImg = modal.querySelector('.pj-modal-visual img');
  const modalCategory = modal.querySelector('.pj-modal-category');
  const modalTitle = modal.querySelector('.pj-modal-title');
  const modalDesc = modal.querySelector('.pj-modal-desc');
  const modalServices = modal.querySelector('.pj-modal-services ul');
  const modalStats = modal.querySelector('.pj-modal-stats');

  function openModal(projectId) {
    const data = projectData[projectId];
    if (!data) return;
    modalImg.src = data.image;
    modalImg.alt = data.title;
    modalCategory.textContent = data.category;
    modalTitle.textContent = data.title;
    modalDesc.textContent = data.desc;
    modalServices.innerHTML = data.services.map(s => `<li>${s}</li>`).join('');
    modalStats.innerHTML = data.results.map(r =>
      `<div class="pj-modal-stat">
        <span class="pj-modal-stat-value">${r.value}</span>
        <span class="pj-modal-stat-label">${r.label}</span>
      </div>`
    ).join('');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const project = card.dataset.project;
      if (project) openModal(project);
    });
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

/* ════════════════════════════════════════════
   NAVBAR — Scroll blur & scroll-spy
════════════════════════════════════════════ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const onScroll = () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ════════════════════════════════════════════
   MOBILE MENU — Premium Overlay
════════════════════════════════════════════ */
function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const overlay   = document.getElementById('mobileMenuOverlay');
  const backdrop  = document.getElementById('mobileMenuBackdrop');
  const closeBtn  = document.getElementById('mobileMenuClose');
  if (!hamburger || !overlay) return;

  function openMenu() {
    overlay.classList.add('open');
    hamburger.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    overlay.classList.remove('open');
    hamburger.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    overlay.classList.contains('open') ? closeMenu() : openMenu();
  });

  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (backdrop) backdrop.addEventListener('click', closeMenu);

  overlay.querySelectorAll('.mobile-menu-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeMenu();
  });
}

/* ════════════════════════════════════════════
   SCROLL ANIMATIONS — IntersectionObserver
════════════════════════════════════════════ */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-up');
  if (!elements.length) return;

  const pending = new Set(elements);
  let observer;

  const reveal = (el) => {
    if (!pending.has(el)) return;
    el.classList.add('visible');
    pending.delete(el);
    if (observer) observer.unobserve(el);
    if (!pending.size) {
      window.removeEventListener('scroll', revealPassedElements);
      window.removeEventListener('resize', revealPassedElements);
      window.removeEventListener('load', revealPassedElements);
    }
  };

  const revealPassedElements = () => {
    pending.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 40) reveal(el);
    });
  };

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          reveal(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach(el => observer.observe(el));
  window.addEventListener('scroll', revealPassedElements, { passive: true });
  window.addEventListener('resize', revealPassedElements);
  window.addEventListener('load', revealPassedElements);
  requestAnimationFrame(revealPassedElements);
}

/* ════════════════════════════════════════════
   COUNTERS
════════════════════════════════════════════ */
function initCounters() {
  const counters = document.querySelectorAll('.stat-num[data-count], .svc-stat-num[data-count], .sp-stat-num[data-count]');
  if (!counters.length) return;

  const easeOut = t => 1 - Math.pow(1 - t, 4);

  const animateCounter = (el) => {
    const target   = parseInt(el.dataset.count, 10);
    const duration = 1800;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value    = Math.round(easeOut(progress) * target);
      el.textContent = value.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.classList.add('counted');
      }
    };
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(el => observer.observe(el));
}

/* ════════════════════════════════════════════
   FAQ PREMIUM ACCORDION
════════════════════════════════════════════ */
function initFAQ() {
  const items = document.querySelectorAll('.faq-p-item');
  if (!items.length) return;

  // Pre-calculate answer heights
  const setHeight = (item) => {
    const answer = item.querySelector('.faq-p-answer');
    const inner = answer.querySelector('.faq-p-answer-inner');
    if (item.classList.contains('open')) {
      answer.style.maxHeight = inner.scrollHeight + 'px';
    } else {
      answer.style.maxHeight = '0';
    }
  };

  items.forEach(item => {
    const question = item.querySelector('.faq-p-q');
    const answer = item.querySelector('.faq-p-answer');

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all others
      items.forEach(i => {
        i.classList.remove('open');
        const a = i.querySelector('.faq-p-answer');
        a.style.maxHeight = '0';
      });

      // Toggle clicked
      if (!isOpen) {
        item.classList.add('open');
        const inner = answer.querySelector('.faq-p-answer-inner');
        answer.style.maxHeight = inner.scrollHeight + 'px';
      }
    });
  });

  // Initial heights
  items.forEach(setHeight);
}

/* ════════════════════════════════════════════
   SMOOTH SCROLL
════════════════════════════════════════════ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navHeight = 68;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ════════════════════════════════════════════
   ACTIVE NAV LINK — scroll-spy
════════════════════════════════════════════ */
function initActiveNavLink() {
  const sections    = document.querySelectorAll('section[id]');
  const links       = document.querySelectorAll('.nav-link');
  const mobileLinks = document.querySelectorAll('.mobile-menu-link');
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(link => link.classList.remove('active'));
          mobileLinks.forEach(link => link.classList.remove('active'));
          const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
          if (active) active.classList.add('active');
          const mobileActive = document.querySelector(`.mobile-menu-link[href="#${entry.target.id}"]`);
          if (mobileActive) mobileActive.classList.add('active');
        }
      });
    },
    { threshold: 0.4, rootMargin: '-68px 0px 0px 0px' }
  );

  sections.forEach(section => observer.observe(section));
}

/* ════════════════════════════════════════════
   GLASS CARD CHART — Animated line
════════════════════════════════════════════ */
(function animateGlassChart() {
  if (window.innerWidth < 768) return;
  const path = document.querySelector('.gc-line');
  if (!path) return;

  const length = path.getTotalLength?.();
  if (!length) return;

  path.style.strokeDasharray = length;
  path.style.strokeDashoffset = length;
  path.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(0.4,0,0.2,1) 0.6s';

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          path.style.strokeDashoffset = '0';
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  const chart = document.querySelector('.glass-card');
  if (chart) observer.observe(chart);
})();

/* ════════════════════════════════════════════
   NEWSLETTER FORM — Fake submit feedback
════════════════════════════════════════════ */
(function initNewsletter() {
  const btn   = document.querySelector('.newsletter-btn');
  const input = document.querySelector('.newsletter-input');
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const email = input.value.trim();
    if (!email || !email.includes('@')) {
      input.style.borderColor = 'rgba(255,80,80,0.4)';
      setTimeout(() => { input.style.borderColor = ''; }, 1500);
      return;
    }
    input.value = '';
    input.placeholder = '✓ You\'re subscribed!';
    btn.style.color = 'var(--accent)';
    setTimeout(() => {
      input.placeholder = 'your@email.com';
      btn.style.color = '';
    }, 3000);
  });
})();

/* ════════════════════════════════════════════
   CURSOR GLOW — Subtle follow effect on desktop
════════════════════════════════════════════ */
(function initCursorGlow() {
  if (window.matchMedia('(hover: none)').matches) return;

  const glow = document.createElement('div');
  glow.style.cssText = `
    position: fixed;
    width: 400px;
    height: 400px;
    pointer-events: none;
    z-index: 0;
    background: radial-gradient(circle, rgba(0,245,196,0.04) 0%, transparent 70%);
    transform: translate(-50%, -50%);
    transition: opacity 0.3s ease;
    border-radius: 50%;
    top: 0;
    left: 0;
    opacity: 0;
  `;
  document.body.appendChild(glow);

  let mouseX = 0, mouseY = 0;
  let glowX = 0, glowY = 0;
  let frame;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    glow.style.opacity = '1';
  });

  document.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
  });

  const animate = () => {
    glowX += (mouseX - glowX) * 0.1;
    glowY += (mouseY - glowY) * 0.1;
    glow.style.left = glowX + 'px';
    glow.style.top  = glowY + 'px';
    frame = requestAnimationFrame(animate);
  };
  animate();
})();

/* ════════════════════════════════════════════
   CONTACT FORM — Formspree submission
════════════════════════════════════════════ */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const btn = document.getElementById('formBtn');
  const success = document.getElementById('formSuccess');
  const error = document.getElementById('formError');
  const resetBtn = document.getElementById('resetFormBtn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btn.classList.contains('loading')) return;

    if (error) error.classList.remove('show');

    const data = {
      name: form.querySelector('[name="name"]').value.trim(),
      email: form.querySelector('[name="email"]').value.trim(),
      service: form.querySelector('[name="service"]').value,
      message: form.querySelector('[name="message"]').value.trim(),
    };

    btn.classList.add('loading');

    try {
      const res = await fetch('https://formspree.io/f/xwvzverg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Formspree returned ' + res.status);

      document.getElementById('summaryName').textContent = data.name || '\u2014';
      document.getElementById('summaryEmail').textContent = data.email || '\u2014';
      document.getElementById('summaryService').textContent = data.service || '\u2014';
      document.getElementById('summaryMessage').textContent = data.message || '\u2014';

      form.style.display = 'none';
      if (success) success.classList.add('show');
    } catch (err) {
      console.error('Form submission error:', err);
      if (error) error.classList.add('show');
      setTimeout(() => { if (error) error.classList.remove('show'); }, 5000);
    } finally {
      btn.classList.remove('loading');
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (success) success.classList.remove('show');
      form.reset();
      form.style.display = '';
    });
  }
}

/* ════════════════════════════════════════════
   SERVICE CARDS — Tilt on hover
════════════════════════════════════════════ */
(function initCardTilt() {
  if (window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.service-card, .stat-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 6;
      const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 6;
      card.style.transform = `translateY(-6px) rotateY(${x}deg) rotateX(${-y}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

/* ════════════════════════════════════════════
   STAGGERED REVEAL — Auto-assign delays
════════════════════════════════════════════ */
;(function initStaggeredReveal() {
  const isMobile = window.innerWidth < 768;
  const grids = document.querySelectorAll('.services-grid, .stats-grid, .pj-grid, .pj-grid-bottom, .process-cards, .svc-benefits, .svc-features, .svc-steps, .svc-stats-grid, .svc-results-grid, .svc-reviews-grid');
  grids.forEach(grid => {
    const cards = grid.querySelectorAll('.fade-up');
    cards.forEach((card, i) => {
      if (isMobile) {
        card.style.setProperty('--delay', '0s');
      } else if (!card.style.getPropertyValue('--delay')) {
        card.style.setProperty('--delay', `${i * 0.07}s`);
      }
    });
  });
})();

/* ════════════════════════════════════════════
   CONTACT PARTICLES
════════════════════════════════════════════ */
(function initContactParticles() {
  const canvas = document.getElementById('contactParticles');
  if (!canvas) return;
  if (window.innerWidth < 768) { canvas.style.display = 'none'; return; }

  const ctx = canvas.getContext('2d');
  let w, h, particles = [];
  const COUNT = 50;

  function resize() {
    const section = canvas.closest('.cta-section');
    if (!section) return;
    const rect = section.getBoundingClientRect();
    w = canvas.width = rect.width;
    h = canvas.height = rect.height;
  }

  function createParticle() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.35 + 0.1,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: COUNT }, createParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,245,196,${p.a})`;
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,245,196,${0.04 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  init();
  draw();
  window.addEventListener('resize', init);
})();

/* ════════════════════════════════════════════
   FAQ PARTICLES
════════════════════════════════════════════ */
(function initFAQparticles() {
  const canvas = document.getElementById('faqParticles');
  if (!canvas) return;
  if (window.innerWidth < 768) { canvas.style.display = 'none'; return; }

  const ctx = canvas.getContext('2d');
  let w, h, particles = [];
  const COUNT = 35;

  function resize() {
    const section = canvas.closest('.faq-premium');
    if (!section) return;
    const rect = section.getBoundingClientRect();
    w = canvas.width = rect.width;
    h = canvas.height = rect.height;
  }

  function createParticle() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.3 + 0.08,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: COUNT }, createParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,245,196,${p.a})`;
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,245,196,${0.03 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  init();
  draw();
  window.addEventListener('resize', init);
})();

/* ════════════════════════════════════════════
   SERVICE PAGE CTA REBINDING
   Auto-converts primary CTAs on service pages
   to "Order Now" → submit-order.html
════════════════════════════════════════════ */
function initServiceCTA() {
  var path = window.location.pathname.split('/').pop().replace('.html', '');

  var SERVICE_MAP = {
    'web-design': 'web_design',
    'seo': 'seo',
    'branding': 'brand_identity',
    'ai-automation': 'ai_automation',
    'social-media': 'social_media',
    'strategy': 'strategy'
  };

  var service = SERVICE_MAP[path];
  if (!service) return;

  var orderUrl = 'submit-order.html?service=' + service;

  document.querySelectorAll('.sp-btn--primary, .sp-cta-btn, .fv-cta--primary').forEach(function (btn) {
    var svg = btn.querySelector('svg');
    btn.innerHTML = 'Order Now ';
    if (svg) btn.appendChild(svg);
    btn.setAttribute('href', orderUrl);
  });

  document.querySelectorAll('.svc-hero-actions .btn-primary').forEach(function (btn) {
    var span = btn.querySelector('span');
    var svg = btn.querySelector('svg');
    if (span) {
      span.textContent = 'Order Now';
    } else {
      btn.innerHTML = 'Order Now ';
      if (svg) btn.appendChild(svg);
    }
    btn.setAttribute('href', orderUrl);
  });
}

/* ════════════════════════════════════════════
   HOMEPAGE SERVICES — Dynamic from Supabase
════════════════════════════════════════════ */

function rebindServiceEffects(container) {
  var cards = container.querySelectorAll('.service-card');
  console.log('[Services] Rebinding effects on', cards.length, 'cards');

  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
      var y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
      card.style.transform = 'translateY(-6px) rotateY(' + x + 'deg) rotateX(' + (-y) + 'deg)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    });
  });
}

function observeFadeUpElements(container) {
  var els = container.querySelectorAll('.fade-up:not(.visible)');
  if (!els.length) return;
  console.log('[Services] Observing', els.length, 'fade-up elements');

  els.forEach(function (el) {
    var rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 40) {
      el.classList.add('visible');
    } else {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      obs.observe(el);
    }
  });
}

function initHomepageServices() {
  var grid = document.getElementById('homepageServices');
  if (!grid) {
    console.warn('[Services] #homepageServices not found');
    return;
  }

  var skeleton = document.getElementById('serviceSkeleton');

  if (typeof ServicesAPI === 'undefined') {
    console.error('[Services] ServicesAPI not loaded');
    if (skeleton) skeleton.style.display = 'none';
    grid.innerHTML =
      '<div class="services-error">' +
        '<div class="services-error-icon">&#9888;</div>' +
        '<h3>Unable to load services</h3>' +
        '<p>Service module failed to initialize.</p>' +
      '</div>';
    return;
  }

  var CATEGORY_ICONS = {
    'Design & Development': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="3"/><path d="M9 22h6"/><path d="M12 19v3"/></svg>',
    'Marketing & Growth': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/><path d="M2 12h20"/></svg>',
    'Technology & Innovation': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
  };

  var DEFAULT_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/></svg>';

  function getIcon(category) {
    return CATEGORY_ICONS[category] || DEFAULT_ICON;
  }

  function stripHtml(str) {
    return String(str || '').replace(/<[^>]*>/g, '').trim();
  }

  function escapeAttr(str) {
    return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildCard(service, index) {
    var slug = service.slug || '';
    var title = service.title || '';
    var shortDesc = service.short_description || '';
    var image = service.image || '';
    var category = service.category || '';
    var icon = getIcon(category);
    var delay = (index * 0.06) + 's';

    var plainTitle = stripHtml(title);
    var plainDesc = stripHtml(shortDesc);
    var firstLetter = (plainTitle || 'S').charAt(0).toUpperCase();

    return '<a href="/pages/service.html?slug=' + encodeURIComponent(slug) + '" class="service-card fade-up" style="--delay:' + delay + '">' +
      '<div class="service-img">' +
        (image
          ? '<img class="service-visual" src="' + escapeAttr(image) + '" alt="' + escapeAttr(plainTitle) + '" loading="lazy" onerror="this.style.display=\'none\'">'
          : '<div class="service-visual" style="background:linear-gradient(135deg,rgba(0,245,196,0.04),rgba(0,0,0,0.3));display:flex;align-items:center;justify-content:center;"><span style="font-size:2rem;font-family:Syne,sans-serif;font-weight:700;color:rgba(0,245,196,0.12);">' + escapeAttr(firstLetter) + '</span></div>'
        ) +
        '<div class="service-overlay"></div>' +
      '</div>' +
      '<div class="service-body">' +
        '<div class="service-icon">' + icon + '</div>' +
        '<div class="service-name">' + escapeAttr(plainTitle) + '</div>' +
        '<div class="service-desc">' + escapeAttr(plainDesc) + '</div>' +
      '</div>' +
      '<div class="service-footer">' +
        '<div class="service-arrow">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
        '</div>' +
      '</div>' +
    '</a>';
  }

  function renderError() {
    if (skeleton) skeleton.style.display = 'none';
    grid.innerHTML =
      '<div class="services-error">' +
        '<div class="services-error-icon">&#9888;</div>' +
        '<h3>Unable to load services</h3>' +
        '<p>Something went wrong. Please try again.</p>' +
        '<button class="services-retry-btn" onclick="initHomepageServices()">Retry</button>' +
      '</div>';
  }

  function renderEmpty() {
    if (skeleton) skeleton.style.display = 'none';
    grid.innerHTML =
      '<div class="services-error">' +
        '<div class="services-error-icon">&#9734;</div>' +
        '<h3>Coming soon</h3>' +
        '<p>Check back soon for our latest service offerings.</p>' +
      '</div>';
  }

  function renderCards(services) {
    if (skeleton) skeleton.style.display = 'none';
    var sorted = services.slice().sort(function (a, b) {
      var aFeat = a.featured ? 1 : 0;
      var bFeat = b.featured ? 1 : 0;
      return bFeat - aFeat;
    });
    var limited = sorted.slice(0, 6);
    var html = limited.map(function (s, i) { return buildCard(s, i); }).join('');
    grid.innerHTML = html;
    console.log('[Services] Rendered', limited.length, 'cards (featured first)');

    var cta = document.getElementById('servicesCta');
    if (cta) {
      cta.style.display = '';
      observeFadeUpElements(cta);
    }

    rebindServiceEffects(grid);
    observeFadeUpElements(grid);
  }

  console.log('[Services] Fetching services...');
  ServicesAPI.getAllServices().then(function (services) {
    console.log('[Services] Fetched', services ? services.length : 0, 'services');
    if (!services || !services.length) {
      renderEmpty();
      return;
    }
    renderCards(services);
  }).catch(function (err) {
    console.error('[Services] Fetch error:', err);
    renderError();
  });
}
