/* ════════════════════════════════════════════════════════
   Nagriva — Premium Digital Agency
   script.js
════════════════════════════════════════════════════════ */

'use strict';

/* ─── Device Helpers ─── */
const isMobile = window.innerWidth < 768;
const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const isAndroid = /android/i.test(navigator.userAgent);

// Detect Android for rendering stability workarounds
(function detectAndroid() {
  if (/android/i.test(navigator.userAgent)) {
    document.documentElement.classList.add('is-android');
  }
})();

/* ─── DOM READY ─── */
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initCounters();
  initFAQ();
  initSmoothScroll();
  initBeforeAfterSliders();
  // initServiceCTA removed — all service CTAs now point to WhatsApp directly
  initAIAdvisor();
  /* Defer homepage services load to after paint */
  requestIdleCallback(function() { initHomepageServices(); }, { timeout: 3000 });
});

/* ─── Navbar-dependent inits (wait for dynamic navbar to load) ─── */
document.addEventListener('navbar:loaded', () => {
  initNavbar();
  initHamburger();
  initActiveNavLink();
  initNavDropdowns();
});

/* ════════════════════════════════════════════
   BEFORE / AFTER SLIDERS
════════════════════════════════════════════ */
function initBeforeAfterSliders() {
  var containers = document.querySelectorAll('.tf-ba-container');
  if (!containers.length) return;

  containers.forEach(function (container) {
    var before = container.querySelector('.tf-ba-before');
    var after = container.querySelector('.tf-ba-after');
    var handle = container.querySelector('.tf-ba-handle');
    var divider = container.querySelector('.tf-ba-divider');
    if (!before || !after || !handle || !divider) return;

    var isDragging = false;
    var startX, startPercent;

    function getContainerRect() {
      return container.getBoundingClientRect();
    }

    function setPosition(clientX) {
      var rect = getContainerRect();
      if (rect.width === 0) return;
      var x = clientX - rect.left;
      var percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      before.style.clipPath = 'inset(0 ' + (100 - percent) + '% 0 0)';
      after.style.clipPath = 'inset(0 0 0 ' + percent + '%)';
      divider.style.left = percent + '%';
    }

    function onStart(e) {
      e.preventDefault();
      isDragging = true;
      var point = e.touches ? e.touches[0] : e;
      startX = point.clientX;
      var rect = getContainerRect();
      if (rect.width === 0) return;
      startPercent = ((startX - rect.left) / rect.width) * 100;
      container.classList.add('tf-ba-dragging');
    }

    function onMove(e) {
      if (!isDragging) return;
      e.preventDefault();
      var point = e.touches ? e.touches[0] : e;
      setPosition(point.clientX);
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      container.classList.remove('tf-ba-dragging');
    }

    handle.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    handle.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);

    container.addEventListener('click', function (e) {
      if (e.target === handle || handle.contains(e.target)) return;
      setPosition(e.clientX);
    });
  });
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
    document.body.classList.add('nav-open');
  }

  function closeMenu() {
    overlay.classList.remove('open');
    hamburger.classList.remove('open');
    document.body.classList.remove('nav-open');
  }

  hamburger.addEventListener('click', () => {
    overlay.classList.contains('open') ? closeMenu() : openMenu();
  });

  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (backdrop) backdrop.addEventListener('click', closeMenu);

  overlay.querySelectorAll('.mobile-menu-link:not(.mobile-menu-link--dd)').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
  overlay.querySelectorAll('.mobile-menu-sublink').forEach(link => {
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
  if (window.__addScrollHandler) window.__addScrollHandler(revealPassedElements);
  if (window.__addResizeHandler) window.__addResizeHandler(revealPassedElements);
  window.addEventListener('load', revealPassedElements, { passive: true });
  requestAnimationFrame(revealPassedElements);
}

/* ════════════════════════════════════════════
   COUNTERS
════════════════════════════════════════════ */
function initCounters() {
  const counters = document.querySelectorAll('.svc-stat-num[data-count]');
  if (!counters.length) return;

  const easeOut = t => 1 - Math.pow(1 - t, 4);

  const animateCounter = (el) => {
    const target   = parseInt(el.dataset.count, 10);
    const duration = 1000;
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
      const navHeight = 60;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ════════════════════════════════════════════
   ACTIVE NAV LINK — scroll-spy
════════════════════════════════════════════ */
function initActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          document.querySelectorAll('.nav-link, .mobile-menu-link').forEach(link => link.classList.remove('active'));

          const match =
            document.querySelector(`.nav-link[href="#${entry.target.id}"]`) ||
            document.querySelector(`.mobile-menu-link[href="#${entry.target.id}"]`) ||
            document.querySelector(`.nav-link[data-page="${entry.target.id}"]`) ||
            document.querySelector(`.mobile-menu-link[data-page="${entry.target.id}"]`);

          if (match) {
            match.classList.add('active');
          } else {
            const page = document.body.getAttribute('data-page');
            if (page) {
              const fb = document.querySelector(`.nav-link[data-page="${page}"]`);
              if (fb) fb.classList.add('active');
              const fbMobile = document.querySelector(`.mobile-menu-link[data-page="${page}"]`);
              if (fbMobile) fbMobile.classList.add('active');
            }
          }
        }
      });
    },
    { threshold: 0.4, rootMargin: '-60px 0px 0px 0px' }
  );

  sections.forEach(section => observer.observe(section));
}

/* ════════════════════════════════════════════
   NAVBAR — Desktop & Mobile Dropdowns
════════════════════════════════════════════ */
function initNavDropdowns() {
  /* ─── Desktop: hover + click toggle ─── */
  document.querySelectorAll('.nav-dd-wrapper').forEach(wrapper => {
    const btn = wrapper.querySelector('.nav-link--dd');
    const menu = wrapper.querySelector('.nav-dd-menu');
    if (!btn || !menu) return;

    let closeTimeout;

    function open() {
      clearTimeout(closeTimeout);
      btn.setAttribute('aria-expanded', 'true');
      menu.classList.add('show');
    }

    function close() {
      btn.setAttribute('aria-expanded', 'false');
      menu.classList.remove('show');
    }

    wrapper.addEventListener('mouseenter', open);
    wrapper.addEventListener('mouseleave', () => {
      closeTimeout = setTimeout(close, 80);
    });

    /* Click toggle (touch/keyboard support) */
    btn.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.nav-dd-menu.show').forEach(m => {
        if (m !== menu) {
          const ob = m.closest('.nav-dd-wrapper')?.querySelector('.nav-link--dd');
          m.classList.remove('show');
          ob?.setAttribute('aria-expanded', 'false');
        }
      });
      if (menu.classList.contains('show')) {
        close();
      } else {
        open();
      }
    });

    /* Keyboard: close on Escape */
    menu.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        close();
        btn.focus();
      }
    });

    /* Close on focusout */
    wrapper.addEventListener('focusout', e => {
      if (!wrapper.contains(e.relatedTarget)) close();
    });
  });

  /* ─── Close desktop dropdowns on outside click ─── */
  document.addEventListener('click', e => {
    document.querySelectorAll('.nav-dd-menu.show').forEach(menu => {
      const wrapper = menu.closest('.nav-dd-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        const btn = wrapper.querySelector('.nav-link--dd');
        menu.classList.remove('show');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
  });

  /* ─── Mobile: accordion toggle ─── */
  document.querySelectorAll('.mobile-menu-link--dd').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const group = btn.closest('.mobile-menu-group');
      if (!group) return;
      const sublist = group.querySelector('.mobile-menu-sublist');
      if (!sublist) return;
      const isOpen = sublist.classList.contains('open');

      /* Close sibling sublists (accordion) */
      const parent = group.parentElement;
      if (parent) {
        parent.querySelectorAll('.mobile-menu-sublist.open').forEach(sl => {
          if (sl !== sublist) {
            sl.classList.remove('open');
            sl.style.maxHeight = '0';
            const otherBtn = sl.closest('.mobile-menu-group')?.querySelector('.mobile-menu-link--dd');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });
      }

      /* Toggle current */
      if (isOpen) {
        sublist.classList.remove('open');
        sublist.style.maxHeight = '0';
        btn.setAttribute('aria-expanded', 'false');
      } else {
        sublist.classList.add('open');
        sublist.style.maxHeight = sublist.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ════════════════════════════════════════════
   GLASS CARD CHART — Animated line (idle-initiated)
════════════════════════════════════════════ */
(function animateGlassChart() {
  if (window.innerWidth < 768) return;
  requestIdleCallback(function () {
    var path = document.querySelector('.gc-line');
    if (!path) return;
    var length = path.getTotalLength?.();
    if (!length) return;
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
    path.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s';
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { path.style.strokeDashoffset = '0'; obs.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });
    var chart = document.querySelector('.glass-card');
    if (chart) obs.observe(chart);
  }, { timeout: 2000 });
})();

/* ════════════════════════════════════════════
   NEWSLETTER FORM — Fake submit feedback (deferred)
════════════════════════════════════════════ */
requestIdleCallback(function () {
  var btn   = document.querySelector('.newsletter-btn');
  var input = document.querySelector('.newsletter-input');
  if (!btn || !input) return;
  btn.addEventListener('click', function () {
    var email = input.value.trim();
    if (!email || !email.includes('@')) {
      input.style.borderColor = 'rgba(255,80,80,0.4)';
      setTimeout(function () { input.style.borderColor = ''; }, 1500);
      return;
    }
    input.value = '';
    input.placeholder = '\u2713 You\'re subscribed!';
    btn.style.color = 'var(--accent)';
    setTimeout(function () {
      input.placeholder = 'your@email.com';
      btn.style.color = '';
    }, 3000);
  });
}, { timeout: 3000 });

/* ════════════════════════════════════════════
   CURSOR GLOW — optimized, idle-initiated
════════════════════════════════════════════ */
(function initCursorGlow() {
  if (window.matchMedia('(hover: none)').matches) return;

  requestIdleCallback(function () {
    var glow = document.createElement('div');
    glow.style.cssText = 'position:fixed;width:250px;height:250px;pointer-events:none;z-index:0;background:radial-gradient(circle,rgba(250,204,21,0.03) 0%,transparent 70%);transform:translate(-50%,-50%);transition:opacity 0.3s ease;border-radius:50%;top:0;left:0;opacity:0;';
    document.body.appendChild(glow);

    var mouseX = 0, mouseY = 0, glowX = 0, glowY = 0, frame;
    var enabled = true;

    document.addEventListener('mousemove', function (e) {
      if (!enabled) return;
      mouseX = e.clientX; mouseY = e.clientY;
      glow.style.opacity = '1';
    }, { passive: true });

    document.addEventListener('mouseleave', function () { glow.style.opacity = '0'; }, { passive: true });

    function animate() {
      if (!enabled) { frame = null; return; }
      glowX += (mouseX - glowX) * 0.06;
      glowY += (mouseY - glowY) * 0.06;
      glow.style.left = glowX + 'px';
      glow.style.top = glowY + 'px';
      frame = requestAnimationFrame(animate);
    }
    animate();

    /* Stop on visibility change to save CPU */
    document.addEventListener('visibilitychange', function () {
      enabled = !document.hidden;
      if (enabled && !frame) animate();
      else if (!enabled && frame) { cancelAnimationFrame(frame); frame = null; }
    });
  }, { timeout: 2000 });
})();

/* ════════════════════════════════════════════
   IMAGE OPTIMIZATION (deferred)
════════════════════════════════════════════ */
/* Hero fetchpriority set inline in HTML; rest deferred */
requestIdleCallback(function () {
  document.querySelectorAll('img:not([width]):not([height])').forEach(function (img) {
    if (img.complete && img.naturalWidth) {
      img.setAttribute('width', img.naturalWidth);
      img.setAttribute('height', img.naturalHeight);
    } else {
      img.addEventListener('load', function () {
        img.setAttribute('width', img.naturalWidth);
        img.setAttribute('height', img.naturalHeight);
      });
    }
  });
  document.querySelectorAll('.pj-visual img, .sv-card-media img, .art-thumb img').forEach(function (img) {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
  });
}, { timeout: 3000 });

/* ════════════════════════════════════════════
   CONTACT FORM — Formspree submission
════════════════════════════════════════════ */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const btn = document.getElementById('formBtn');
  if (!form) return;

  let isSubmitting = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const data = {
      name: form.querySelector('[name="name"]').value.trim(),
      email: form.querySelector('[name="email"]').value.trim(),
      service: form.querySelector('[name="service"]').value,
      message: form.querySelector('[name="message"]').value.trim(),
    };

    isSubmitting = true;
    btn.classList.add('loading');

    try {
      const res = await fetch('https://formspree.io/f/xwvzverg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `Server error (${res.status})`);
      }

      NAGRIVA_Toast.success(
        'Message Sent',
        "Message sent successfully. We'll get back to you soon."
      );

      form.reset();
    } catch (err) {
      console.error('Form submission error:', err);
      NAGRIVA_Toast.error(
        'Submission Failed',
        err.message || 'Something went wrong. Please try again.'
      );
    } finally {
      isSubmitting = false;
      btn.classList.remove('loading');
    }
  });
}

/* ════════════════════════════════════════════
   SERVICE CARDS — Tilt on hover (RAF-throttled)
════════════════════════════════════════════ */
(function initCardTilt() {
  if (window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.sv-card, .stat-card').forEach(function (card) {
    var raf = null;
    card.addEventListener('mousemove', function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var rect = card.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width - 0.5) * 3;
        var y = ((e.clientY - rect.top) / rect.height - 0.5) * 3;
        card.style.transform = 'translateY(-3px) rotateY(' + x + 'deg) rotateX(' + (-y) + 'deg)';
      });
    }, { passive: true });
    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    }, { passive: true });
  });
})();

/* ════════════════════════════════════════════
   RAF THROTTLE for expensive handlers
════════════════════════════════════════════ */
(function initRafThrottle() {
  var scrollHandlers = [];
  var resizeHandlers = [];
  var scrollRaf = null;
  var resizeRaf = null;

  window.addEventListener('scroll', function () {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(function () {
      scrollHandlers.forEach(function (fn) { fn(); });
      scrollRaf = null;
    });
  }, { passive: true });

  window.addEventListener('resize', function () {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () {
      resizeHandlers.forEach(function (fn) { fn(); });
      resizeRaf = null;
    });
  }, { passive: true });

  window.__addScrollHandler = function (fn) { scrollHandlers.push(fn); };
  window.__addResizeHandler = function (fn) { resizeHandlers.push(fn); };
})();

/* ════════════════════════════════════════════
   STAGGERED REVEAL — Auto-assign delays (deferred)
════════════════════════════════════════════ */
requestIdleCallback(function () {
  var isMobile = window.innerWidth < 768;
  var grids = document.querySelectorAll('.sv-grid, .stats-grid, .pj-grid, .pj-grid-bottom, .tf-grid, .process-cards, .svc-benefits, .svc-features, .svc-steps, .svc-stats-grid, .svc-results-grid, .svc-reviews-grid');
  grids.forEach(function (grid) {
    var cards = grid.querySelectorAll('.fade-up');
    cards.forEach(function (card, i) {
      if (isMobile) card.style.setProperty('--delay', '0s');
      else if (!card.style.getPropertyValue('--delay')) card.style.setProperty('--delay', (i * 0.05) + 's');
    });
  });
}, { timeout: 2000 });

/* ════════════════════════════════════════════
   CONTACT PARTICLES — optimized with idle init + observer controlled
════════════════════════════════════════════ */
(function initContactParticles() {
  var canvas = document.getElementById('contactParticles');
  if (!canvas) return;
  if (window.innerWidth < 768) { canvas.style.display = 'none'; return; }

  var ctx = canvas.getContext('2d');
  var w, h, particles = [];
  var COUNT = 25;
  var rafId = null;
  var isVisible = false;

  function resize() {
    var section = canvas.closest('.cta-section');
    if (!section) return;
    var rect = section.getBoundingClientRect();
    w = canvas.width = rect.width;
    h = canvas.height = rect.height;
  }

  function createParticle() {
    return {
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.35 + 0.1,
    };
  }

  function init() { resize(); particles = Array.from({ length: COUNT }, createParticle); }

  function draw() {
    if (!isVisible) { rafId = null; return; }
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(250,204,21,' + p.a + ')'; ctx.fill();
    }
    for (i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = 'rgba(250,204,21,' + (0.04 * (1 - dist / 120)) + ')';
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    }
    rafId = requestAnimationFrame(draw);
  }

  requestIdleCallback(function () {
    init();
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        isVisible = e.isIntersecting;
        if (isVisible && !rafId) rafId = requestAnimationFrame(draw);
        else if (!isVisible && rafId) { cancelAnimationFrame(rafId); rafId = null; }
      });
    }, { threshold: 0.1 });
    obs.observe(canvas);
    window.addEventListener('resize', init, { passive: true });
  }, { timeout: 2000 });
})();

/* ════════════════════════════════════════════
   FAQ PARTICLES — optimized
════════════════════════════════════════════ */
(function initFAQparticles() {
  var canvas = document.getElementById('faqParticles');
  if (!canvas) return;
  if (window.innerWidth < 768) { canvas.style.display = 'none'; return; }

  var ctx = canvas.getContext('2d');
  var w, h, particles = [];
  var COUNT = 20;
  var rafId = null;
  var isVisible = false;

  function resize() {
    var section = canvas.closest('.faq-premium');
    if (!section) return;
    var rect = section.getBoundingClientRect();
    w = canvas.width = rect.width;
    h = canvas.height = rect.height;
  }

  function createParticle() {
    return {
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.3 + 0.08,
    };
  }

  function init() { resize(); particles = Array.from({ length: COUNT }, createParticle); }

  function draw() {
    if (!isVisible) { rafId = null; return; }
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(250,204,21,' + p.a + ')'; ctx.fill();
    }
    for (i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = 'rgba(250,204,21,' + (0.03 * (1 - dist / 100)) + ')';
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    }
    rafId = requestAnimationFrame(draw);
  }

  requestIdleCallback(function () {
    init();
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        isVisible = e.isIntersecting;
        if (isVisible && !rafId) rafId = requestAnimationFrame(draw);
        else if (!isVisible && rafId) { cancelAnimationFrame(rafId); rafId = null; }
      });
    }, { threshold: 0.1 });
    obs.observe(canvas);
    window.addEventListener('resize', init, { passive: true });
  }, { timeout: 3000 });
})();



/* ════════════════════════════════════════════
   HOMEPAGE SERVICES — Dynamic from Supabase
════════════════════════════════════════════ */

function rebindServiceEffects(container) {
  if (window.matchMedia('(hover: none)').matches) return;
  var cards = container.querySelectorAll('.sv-card');

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
  if (!grid) return;

  var skeleton = document.getElementById('serviceSkeleton');

  if (typeof ServicesAPI === 'undefined') {
    if (skeleton) skeleton.style.display = 'none';
    grid.innerHTML = '<div class="ne ne-error"><div class="ne-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="ne-title">Unable to load services</h3><p class="ne-desc">Service module failed to initialize.</p></div>';
    return;
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
    var image = service.image || '';
    var features = service.cardFeatures || [];
    var delay = (index * 0.04) + 's';

    var plainTitle = stripHtml(title);
    var firstLetter = (plainTitle || 'S').charAt(0).toUpperCase();

    var checkSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    var arrowSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

    var featuresHtml = features.length
      ? '<ul class="sv-card-list">' + features.map(function (f) {
          return '<li class="sv-card-list-item">' + checkSvg + '<span>' + escapeAttr(stripHtml(f)) + '</span></li>';
        }).join('') + '</ul>'
      : '';

    return '<a href="/pages/services/' + encodeURIComponent(slug) + '.html" class="sv-card fade-up" style="--delay:' + delay + '">' +
      '<div class="sv-card-media">' +
        (image
          ? '<img src="' + escapeAttr(image) + '" alt="' + escapeAttr(plainTitle) + '" loading="lazy" onerror="this.style.display=\'none\'">'
          : '<div class="sv-card-media-fallback">' + escapeAttr(firstLetter) + '</div>'
        ) +
        '<div class="sv-card-overlay"></div>' +
        '<div class="sv-card-glow"></div>' +
      '</div>' +
      '<div class="sv-card-body">' +
        '<h3 class="sv-card-title">' + escapeAttr(plainTitle) + '</h3>' +
        featuresHtml +
        '<div class="sv-card-action">' +
          '<span>View Service</span>' +
          arrowSvg +
        '</div>' +
      '</div>' +
    '</a>';
  }

  function renderError() {
    if (skeleton) skeleton.style.display = 'none';
    grid.innerHTML = '<div class="ne ne-error"><div class="ne-icon"><i class="fas fa-exclamation-triangle"></i></div><h3 class="ne-title">Unable to load services</h3><p class="ne-desc">Something went wrong. Please try again.</p><div class="ne-actions"><button class="ne-btn ne-btn-primary services-retry-btn" onclick="initHomepageServices()"><i class="fas fa-sync"></i> Retry</button></div></div>';
  }

  function renderEmpty() {
    if (skeleton) skeleton.style.display = 'none';
    grid.innerHTML = '<div class="ne"><div class="ne-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div><h3 class="ne-title">Coming soon</h3><p class="ne-desc">We\'re crafting something exceptional. Check back soon for our latest service offerings.</p></div>';
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

    var cta = document.getElementById('servicesCta');
    if (cta) {
      cta.style.display = '';
      observeFadeUpElements(cta);
    }

    rebindServiceEffects(grid);
    observeFadeUpElements(grid);
  }

  ServicesAPI.getAllServices().then(function (services) {
    if (!services || !services.length) {
      renderEmpty();
      return;
    }
    renderCards(services);
  }).catch(function () {
    renderError();
  });
}

/* ════════════════════════════════════════════
   Nagriva — Empty State Renderer
   ════════════════════════════════════════════ */
window.NAGRIVA_EmptyState = (function () {
  'use strict';

  function escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function render(config) {
    var icon = config.icon || 'fas fa-inbox';
    var title = config.title || '';
    var desc = config.description || '';
    var primaryCta = config.primaryCta || null;
    var secondaryCta = config.secondaryCta || null;
    var variant = config.variant || 'default';

    var cls = 'ne';
    if (variant === 'search') cls += ' ne-search';
    else if (variant === 'error') cls += ' ne-error';
    else if (variant === 'sm') cls += ' ne-sm';
    else if (variant === 'inline') cls += ' ne-inline';

    var iconHtml;
    if (icon.indexOf('<svg') === 0 || icon.indexOf('<i') === 0) {
      iconHtml = icon;
    } else {
      iconHtml = '<i class="' + icon + '"></i>';
    }

    var html = '<div class="' + cls + '">' +
      '<div class="ne-icon">' + iconHtml + '</div>' +
      '<h3 class="ne-title">' + escape(title) + '</h3>' +
      (desc ? '<p class="ne-desc">' + escape(desc) + '</p>' : '');

    if (primaryCta || secondaryCta) {
      html += '<div class="ne-actions">';
      if (primaryCta) {
        var pHref = primaryCta.url || '#';
        var pOnclick = primaryCta.onclick ? ' onclick="' + primaryCta.onclick + '"' : '';
        html += '<a href="' + escape(pHref) + '" class="ne-btn ne-btn-primary"' + pOnclick + '>' + (primaryCta.icon ? '<i class="' + primaryCta.icon + '"></i>' : '') + escape(primaryCta.label || '') + '</a>';
      }
      if (secondaryCta) {
        var sHref = secondaryCta.url || '#';
        var sOnclick = secondaryCta.onclick ? ' onclick="' + secondaryCta.onclick + '"' : '';
        html += '<a href="' + escape(sHref) + '" class="ne-btn ne-btn-secondary"' + sOnclick + '>' + (secondaryCta.icon ? '<i class="' + secondaryCta.icon + '"></i>' : '') + escape(secondaryCta.label || '') + '</a>';
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  function renderTo(container, config) {
    if (!container) return;
    container.innerHTML = render(config);
  }

  return { render: render, renderTo: renderTo };
})();

// ─── Dynamic JSON-LD: Service + FAQ + Breadcrumb ───
function injectServiceSchema(serviceData) {
  var existing = document.querySelectorAll('.nagriva-schema');
  existing.forEach(function(el) { el.remove(); });

  if (!serviceData) return;

  var name = serviceData.name || serviceData.pageTitle || serviceData.title || '';
  var cleanName = String(name).replace(/<[^>]*>/g, '').replace(' — Nagriva', '').trim();
  var desc = (serviceData.description || serviceData.metaDescription || '').replace(/<[^>]*>/g, '').trim();

  /* BreadcrumbList */
  var bcScript = document.createElement('script');
  bcScript.type = 'application/ld+json';
  bcScript.className = 'nagriva-schema';
  bcScript.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://nagriva.com/' },
      { '@type': 'ListItem', 'position': 2, 'name': 'Services', 'item': 'https://nagriva.com/pages/services.html' },
      { '@type': 'ListItem', 'position': 3, 'name': cleanName || 'Service' }
    ]
  });
  document.head.appendChild(bcScript);

  /* Service */
  var serviceScript = document.createElement('script');
  serviceScript.type = 'application/ld+json';
  serviceScript.className = 'nagriva-schema';
  serviceScript.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Service',
    'name': cleanName || desc,
    'provider': { '@type': 'Organization', 'name': 'Nagriva' },
    'description': desc,
    'url': window.location.href.split('?')[0].split('#')[0],
    'areaServed': 'Worldwide'
  });
  document.head.appendChild(serviceScript);

  /* FAQPage */
  if (serviceData.faq && serviceData.faq.length > 0) {
    var faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.className = 'nagriva-schema';
    faqScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': serviceData.faq.map(function(item) {
        return {
          '@type': 'Question',
          'name': item.question,
          'acceptedAnswer': { '@type': 'Answer', 'text': item.answer }
        };
      })
    });
    document.head.appendChild(faqScript);
  }
}

// ─── Dynamic JSON-LD: Article ───
function injectArticleSchema(articleData) {
  var existing = document.querySelectorAll('.nagriva-schema');
  existing.forEach(function(el) { el.remove(); });

  if (!articleData) return;

  var script = document.createElement('script');
  script.type = 'application/ld+json';
  script.className = 'nagriva-schema';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': articleData.title || 'Article — Nagriva',
    'description': articleData.description || articleData.excerpt || '',
    'image': articleData.image || articleData.imageUrl || '',
    'datePublished': articleData.date || articleData.publishedAt || '',
    'author': {
      '@type': 'Organization',
      'name': 'Nagriva'
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Nagriva',
      'logo': {
        '@type': 'ImageObject',
        'url': '/assets/images/branding/nagriva-logo.png'
      }
    }
  });
  document.head.appendChild(script);
}

/* ════════════════════════════════════════════
   NAGRIVA AI ADVISOR — Chat Interface
   ════════════════════════════════════════════ */
function initAIAdvisor() {
  var chatEl = document.getElementById('aiChat');
  var input = document.getElementById('aiInput');
  var btn = document.getElementById('aiBtn');
  var prompts = document.getElementById('aiPrompts');
  var videoWrap = document.getElementById('aiVideoWrap');
  var recs = document.getElementById('aiRecs');

  if (!input || !btn || !chatEl) return;

  var isAnalyzing = false;
  var hasSubmitted = false;

  var aiResponses = {
    'improve my seo': 'Great choice! Based on your goal, I recommend starting with Local SEO to target nearby customers, optimizing your Google Business Profile, and conducting a full site audit for technical SEO improvements.',
    'build a website': 'Excellent! A professional website is the foundation of your digital presence. I recommend our Website Development package with modern design, mobile optimization, and fast loading speeds tailored to your industry.',
    'automate my business': 'Smart move! I recommend automating repetitive tasks with AI-powered workflows, CRM integration, and automated email marketing to save time and increase efficiency.',
    'generate more leads': 'Perfect focus! I suggest a combination of SEO-optimized landing pages, targeted Google Ads campaigns, and lead capture automation to consistently bring in qualified prospects.'
  };

  var defaultResponse = 'Thanks for reaching out! Our team will analyze your specific needs and create a customized growth plan. Would you like to schedule a free consultation to discuss further?';

  /* ─── Prompt clicks ─── */
  if (prompts) {
    prompts.addEventListener('click', function(e) {
      var promptBtn = e.target.closest('.ai-prompt');
      if (!promptBtn) return;
      var text = promptBtn.getAttribute('data-prompt');
      if (text) {
        input.value = text;
        handleSend();
      }
    });
  }

  /* ─── Send events ─── */
  btn.addEventListener('click', handleSend);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  function handleSend() {
    var text = input.value.trim();
    if (!text || isAnalyzing) return;
    isAnalyzing = true;

    /* Hide prompts on first submit */
    if (!hasSubmitted) {
      hasSubmitted = true;
      if (prompts) prompts.classList.add('hidden');
    }

    /* ─── Append user message ─── */
    appendMsg(text, 'user');

    input.value = '';
    btn.classList.add('loading');
    btn.disabled = true;

    /* ─── Thinking dots ─── */
    var dotsEl = document.createElement('div');
    dotsEl.className = 'ai-msg ai-msg--thinking';
    dotsEl.innerHTML = '<span></span><span></span><span></span>';
    chatEl.appendChild(dotsEl);
    chatEl.scrollTop = chatEl.scrollHeight;

    /* ─── Simulated AI response ─── */
    setTimeout(function() {
      /* Remove thinking dots */
      if (dotsEl.parentNode) dotsEl.parentNode.removeChild(dotsEl);

      var reply = getAIResponse(text);
      appendMsg(reply, 'ai');

      isAnalyzing = false;
      btn.classList.remove('loading');
      btn.disabled = false;

      /* ─── Crossfade video → recs ─── */
      if (videoWrap && recs) {
        videoWrap.classList.add('hidden');
        recs.classList.add('visible');
      }
    }, 1400 + Math.random() * 600);
  }

  function appendMsg(text, role) {
    var el = document.createElement('div');
    el.className = 'ai-msg ' + (role === 'user' ? 'ai-msg--user' : 'ai-msg--ai');
    el.textContent = text;
    chatEl.appendChild(el);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function getAIResponse(text) {
    var lower = text.toLowerCase();
    for (var key in aiResponses) {
      if (lower.indexOf(key) !== -1) {
        return aiResponses[key];
      }
    }
    return defaultResponse;
  }
}



function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
