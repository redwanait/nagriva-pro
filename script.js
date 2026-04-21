/* =============================================
   NAGRIVA – موقع العلامة الشخصية (عربي)
   JavaScript: رضوان
   ============================================= */

'use strict';

/* ── NAVBAR ── */
const navbar       = document.getElementById('navbar');
const navToggle    = document.getElementById('navToggle');
const navLinks     = document.getElementById('navLinks');
const navLinkItems = document.querySelectorAll('.nav-link');

/* ── NAVBAR SCROLL BEHAVIOR ── */
let lastScrollY = 0;
let ticking = false;

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  navbar.classList.toggle('scrolled', scrollY > 20);
  
  // Hide on scroll down, show on scroll up
  if (!ticking) {
    window.requestAnimationFrame(() => {
      if (scrollY > 120) {
        if (scrollY > lastScrollY + 5) {
          navbar.classList.add('nav-hidden');
        } else if (scrollY < lastScrollY - 5) {
          navbar.classList.remove('nav-hidden');
        }
      } else {
        navbar.classList.remove('nav-hidden');
      }
      lastScrollY = scrollY;
      ticking = false;
    });
    ticking = true;
  }
  
  toggleScrollTop();
  updateActiveNavLink();
});

function closeNavMenu() {
  navLinks.classList.remove('open');
  navToggle.classList.remove('active');
  navToggle.setAttribute('aria-expanded', 'false');
}

navToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', open);
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeNavMenu);
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (navLinks.classList.contains('open') &&
      !navLinks.contains(e.target) &&
      !navToggle.contains(e.target)) {
    closeNavMenu();
  }
});

function updateActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
  });
  navLinkItems.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}

/* ── DARK / LIGHT MODE (AUTO ONLY) ── */
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light-mode');
  } else {
    root.classList.remove('light-mode');
  }
}

// On load: saved preference wins; otherwise follow system
(function initTheme() {
  const saved = localStorage.getItem('nagriva-theme');
  const theme = saved ?? (systemDark.matches ? 'dark' : 'light');
  applyTheme(theme);
})();

// Live-update when system preference changes
systemDark.addEventListener('change', (e) => {
  applyTheme(e.matches ? 'dark' : 'light');
});

/* ── SEARCH ── */
const searchToggle  = document.getElementById('searchToggle');
const searchOverlay = document.getElementById('searchOverlay');
const searchClose   = document.getElementById('searchClose');
const searchInput   = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// Search data: services + portfolio
const SEARCH_DATA = [
  { title: 'تطوير مواقع ويب احترافية', sub: 'خدمة',   tag: 'خدمات', icon: 'fa-solid fa-code',    href: '#services' },
  { title: 'مونتاج فيديو عالي التأثير',  sub: 'خدمة',   tag: 'خدمات', icon: 'fa-solid fa-film',    href: '#services' },
  { title: 'إنشاء مدونات محسّنة لـ SEO', sub: 'خدمة',   tag: 'خدمات', icon: 'fa-solid fa-pen-nib', href: '#services' },
  { title: 'متجر أزياء إلكتروني',         sub: 'مشروع',  tag: 'أعمال', icon: 'fa-solid fa-bag-shopping', href: '#portfolio' },
  { title: 'إعلان ترويجي للعلامة التجارية', sub: 'مشروع', tag: 'أعمال', icon: 'fa-solid fa-play-circle', href: '#portfolio' },
  { title: 'مدونة نمو SaaS',              sub: 'مشروع',  tag: 'أعمال', icon: 'fa-solid fa-chart-line', href: '#portfolio' },
  { title: 'صفحة هبوط للتدريب الرياضي',  sub: 'مشروع',  tag: 'أعمال', icon: 'fa-solid fa-dumbbell', href: '#portfolio' },
  { title: 'سلسلة مقدمات قناة يوتيوب',   sub: 'مشروع',  tag: 'أعمال', icon: 'fa-brands fa-youtube', href: '#portfolio' },
  { title: 'الأسعار',                      sub: 'قسم',    tag: 'تنقل', icon: 'fa-solid fa-tag',      href: '#pricing' },
  { title: 'آراء العملاء',                 sub: 'قسم',    tag: 'تنقل', icon: 'fa-solid fa-star',     href: '#testimonials' },
  { title: 'تواصل معي / ابدأ مشروعك',    sub: 'قسم',    tag: 'تنقل', icon: 'fa-solid fa-paper-plane', href: '#contact' },
];

function openSearch() {
  searchOverlay.classList.add('open');
  searchInput.value = '';
  renderSearchResults('');
  setTimeout(() => searchInput.focus(), 80);
}

function closeSearch() {
  searchOverlay.classList.remove('open');
}

function renderSearchResults(query) {
  const q = query.trim();
  if (!q) {
    searchResults.innerHTML = '<p class="search-hint"><i class="fa-solid fa-lightbulb"></i> ابحث عن خدماتي أو مشاريعي</p>';
    return;
  }
  const matches = SEARCH_DATA.filter(item =>
    item.title.includes(q) || item.sub.includes(q) || item.tag.includes(q)
  );
  if (!matches.length) {
    searchResults.innerHTML = `<p class="search-no-results"><i class="fa-solid fa-face-frown"></i> لا توجد نتائج لـ "${q}"</p>`;
    return;
  }
  searchResults.innerHTML = matches.map(item => `
    <a class="search-result-item" href="${item.href}" onclick="closeSearch()">
      <div class="search-result-icon"><i class="${item.icon}"></i></div>
      <div class="search-result-info">
        <div class="search-result-title">${item.title}</div>
        <div class="search-result-sub">${item.sub}</div>
      </div>
      <span class="search-result-tag">${item.tag}</span>
    </a>
  `).join('');
}

searchToggle.addEventListener('click', openSearch);
searchClose.addEventListener('click', closeSearch);

searchOverlay.addEventListener('click', (e) => {
  if (e.target === searchOverlay) closeSearch();
});

searchInput.addEventListener('input', (e) => {
  renderSearchResults(e.target.value);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (navLinks.classList.contains('open')) closeNavMenu();
    if (searchOverlay.classList.contains('open')) closeSearch();
    if (portfolioModal && portfolioModal.classList.contains('open')) closePortfolioModal();
  }
  // Ctrl/Cmd + K to open search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openSearch();
  }
});

const scrollTopBtn = document.getElementById('scrollTop');

function toggleScrollTop() {
  if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
}

if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── SCROLL REVEAL ── */
const revealTargets = [
  '.section-header',
  '.service-card',
  '.why-card',
  '.portfolio-card',
  '.testi-card',
  '.why-left',
  '.cta-inner',
  '.hero-badge',
  '.hero-title',
  '.hero-sub',
  '.hero-desc',
  '.hero-actions',
  '.hero-stats',
];

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = entry.target.dataset.delay || 0;
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, Number(delay));
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

function initReveal() {
  revealTargets.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.classList.add('reveal');
      revealObserver.observe(el);
    });
  });
}

/* ── PORTFOLIO FILTER ── */
const filterBtns     = document.querySelectorAll('.filter-btn');
const portfolioCards = document.querySelectorAll('.portfolio-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;

    portfolioCards.forEach(card => {
      const match = filter === 'all' || card.dataset.category === filter;
      if (match) {
        card.classList.remove('hide');
      } else {
        card.classList.add('hide');
      }
    });
  });
});

/* ── CONTACT FORM ── */
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');
const submitBtn   = document.getElementById('submitBtn');
const btnText     = document.getElementById('btnText');
const btnLoader   = document.getElementById('btnLoader');

function validateField(field) {
  const val = field.value.trim();
  if (!val) {
    field.classList.add('error');
    return false;
  }
  if (field.type === 'email') {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(val)) {
      field.classList.add('error');
      return false;
    }
  }
  field.classList.remove('error');
  return true;
}

contactForm.querySelectorAll('input, select, textarea').forEach(field => {
  field.addEventListener('input', () => validateField(field));
  field.addEventListener('blur',  () => validateField(field));
});

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const fields = contactForm.querySelectorAll('input, select, textarea');
  let valid = true;
  fields.forEach(f => { if (!validateField(f)) valid = false; });
  if (!valid) return;

  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  submitBtn.disabled = true;

  const name    = (document.getElementById('name').value    || '').trim();
  const email   = (document.getElementById('email').value   || '').trim();
  const service = (document.getElementById('service').value || '').trim();
  const message = (document.getElementById('message').value || '').trim();

  const serviceLabels = {
    website : '🌐 تطوير موقع ويب',
    video   : '🎬 مونتاج فيديو',
    blog    : '✍️ إنشاء مدونة',
    other   : '⚡ أخرى / خدمات متعددة'
  };

  const waText = `مرحباً رضوان 👋\n\nاسمي: ${name}\nبريدي الإلكتروني: ${email}\nالخدمة المطلوبة: ${serviceLabels[service] || service}\n\nتفاصيل المشروع:\n${message}`;

  setTimeout(() => {
    window.open('https://wa.me/212728427278?text=' + encodeURIComponent(waText), '_blank');
    contactForm.classList.add('hidden');
    formSuccess.classList.remove('hidden');
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    submitBtn.disabled = false;
  }, 800);
});

/* ── CONTACT WIZARD ── */
(function () {
  const wizardContainer = document.querySelector('.wizard-container');
  const serviceCards   = wizardContainer ? wizardContainer.querySelectorAll('.service-card') : [];
  const serviceSelect  = document.getElementById('service');
  const nextStep1Btn   = document.getElementById('nextStep1');
  const wizardPanels   = document.querySelectorAll('.wizard-panel');
  const wizardStepEls  = document.querySelectorAll('.wizard-step');
  const stepLines      = document.querySelectorAll('.step-line');
  const progressFill   = document.getElementById('wizardProgress');
  const reviewSummary  = document.getElementById('reviewSummary');
  const totalSteps     = 3;
  let currentStep = 1;

  const serviceLabelsMap = {
    website : '🌐 موقع ويب',
    video   : '🎬 مونتاج فيديو',
    blog    : '✍️ مدونة',
    other   : '⚡ خدمات متعددة'
  };

  function updateProgress(n) {
    if (progressFill) progressFill.style.width = (n / totalSteps * 100) + '%';
  }

  function makeReviewItem(iconClass, label, value) {
    const row = document.createElement('div');
    row.className = 'review-item';
    row.innerHTML = `
      <div class="review-item-icon"><i class="fa-solid ${iconClass}"></i></div>
      <div class="review-item-body">
        <div class="review-item-label">${label}</div>
        <div class="review-item-value"></div>
      </div>`;
    row.querySelector('.review-item-value').textContent = value;
    return row;
  }

  function makeDivider() {
    const d = document.createElement('div');
    d.className = 'review-divider';
    return d;
  }

  function populateReview() {
    if (!reviewSummary) return;
    const service = (document.getElementById('service').value || '').trim();
    const name    = (document.getElementById('name').value    || '').trim();
    const email   = (document.getElementById('email').value   || '').trim();
    const message = (document.getElementById('message').value || '').trim();

    reviewSummary.innerHTML = '';
    const items = [
      { icon: 'fa-briefcase',    label: 'الخدمة المطلوبة',    value: serviceLabelsMap[service] || service },
      { icon: 'fa-user',         label: 'الاسم',              value: name  },
      { icon: 'fa-envelope',     label: 'البريد الإلكتروني', value: email },
      { icon: 'fa-pen-to-square',label: 'تفاصيل المشروع',    value: message },
    ];
    items.forEach((item, i) => {
      reviewSummary.appendChild(makeReviewItem(item.icon, item.label, item.value));
      if (i < items.length - 1) reviewSummary.appendChild(makeDivider());
    });
  }

  function goToStep(n, goBack) {
    const outgoing = document.getElementById('panel-' + currentStep);
    if (outgoing) {
      outgoing.classList.toggle('slide-back', !!goBack);
    }
    wizardPanels.forEach((p, i) => {
      const isTarget = i + 1 === n;
      if (isTarget) {
        p.classList.remove('hidden');
        p.classList.toggle('slide-back', !!goBack);
        void p.offsetWidth;
      } else {
        p.classList.add('hidden');
        p.classList.remove('slide-back');
      }
    });
    wizardStepEls.forEach((s, i) => {
      const isActive = i + 1 === n;
      const isDone   = i + 1 < n;
      s.classList.toggle('active', isActive);
      s.classList.toggle('done', isDone);
      const span = s.querySelector('.step-circle span');
      if (span) span.textContent = isDone ? '✓' : String(i + 1);
    });
    stepLines.forEach((l, i) => l.classList.toggle('done', i + 1 < n));
    updateProgress(n);
    currentStep = n;
    if (n === 3) populateReview();
  }

  serviceCards.forEach(card => {
    card.addEventListener('click', () => {
      serviceCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      if (serviceSelect) serviceSelect.value = card.dataset.value;
      if (nextStep1Btn) nextStep1Btn.disabled = false;
    });
  });

  document.querySelectorAll('.wizard-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.wizard-panel');
      if (!panel) return;
      const panelNum = parseInt(panel.dataset.panel || '1');
      let ok = true;
      panel.querySelectorAll('input, textarea').forEach(f => {
        if (!validateField(f)) ok = false;
      });
      if (!ok) return;
      goToStep(panelNum + 1, false);
    });
  });

  document.querySelectorAll('.wizard-back').forEach(btn => {
    btn.addEventListener('click', () => goToStep(currentStep - 1, true));
  });

  updateProgress(1);
})();

/* ── FOOTER YEAR ── */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ── SMOOTH ANCHOR SCROLL (مع مراعاة ارتفاع الشريط العلوي) ── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const navH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h')
    ) || 72;
    const top = target.getBoundingClientRect().top + window.scrollY - navH;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ── PRICING TABS ── */
const pricingTabs  = document.querySelectorAll('.pricing-tab');
const pricingWraps = document.querySelectorAll('.pricing-cards-wrap');

pricingTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    pricingTabs.forEach(t => t.classList.remove('active'));
    pricingWraps.forEach(w => w.classList.remove('active'));
    tab.classList.add('active');
    const target = document.getElementById('pricing-' + tab.dataset.service);
    if (target) target.classList.add('active');
  });
});

/* ── PORTFOLIO MODAL ── */
const portfolioModal  = document.getElementById('portfolioModal');
const modalBackdrop   = document.getElementById('modalBackdrop');
const modalCloseBtn   = document.getElementById('modalClose');
const modalBody       = document.getElementById('modalBody');

function openPortfolioModal(card) {
  const title    = card.dataset.title    || '';
  const tag      = card.dataset.tag      || '';
  const problem  = card.dataset.problem  || '';
  const solution = card.dataset.solution || '';
  const result   = card.dataset.result   || '';

  modalBody.innerHTML = `
    <span class="modal-tag">${tag}</span>
    <h2 class="modal-title" id="modalTitle">${title}</h2>
    <div class="modal-case">
      <div class="modal-case-item">
        <div class="modal-case-label problem">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>المشكلة</span>
        </div>
        <p class="modal-case-text">${problem}</p>
      </div>
      <div class="modal-case-item">
        <div class="modal-case-label solution">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>الحل</span>
        </div>
        <p class="modal-case-text">${solution}</p>
      </div>
      <div class="modal-case-item">
        <div class="modal-case-label result">
          <i class="fa-solid fa-chart-line"></i>
          <span>النتائج</span>
        </div>
        <p class="modal-case-text">${result}</p>
      </div>
    </div>
    <div class="modal-cta">
      <a href="#contact" class="btn btn-primary" id="modalContactBtn">
        ابدأ مشروعاً مشابهاً <i class="fa-solid fa-arrow-left"></i>
      </a>
      <a href="https://wa.me/212728427278" class="btn btn-whatsapp" target="_blank" rel="noopener">
        <i class="fa-brands fa-whatsapp"></i> واتساب
      </a>
    </div>
  `;

  portfolioModal.classList.add('open');
  document.body.style.overflow = 'hidden';

  const modalContactBtn = document.getElementById('modalContactBtn');
  if (modalContactBtn) {
    modalContactBtn.addEventListener('click', closePortfolioModal);
  }
}

function closePortfolioModal() {
  portfolioModal.classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelectorAll('.portfolio-modal-trigger').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const card = btn.closest('.portfolio-card');
    if (card) openPortfolioModal(card);
  });
});

if (modalBackdrop) modalBackdrop.addEventListener('click', closePortfolioModal);
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closePortfolioModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (portfolioModal && portfolioModal.classList.contains('open')) closePortfolioModal();
  }
});

/* ── VIDEO MODAL ── */
const videoModal         = document.getElementById('videoModal');
const videoModalBackdrop = document.getElementById('videoModalBackdrop');
const videoModalCloseBtn = document.getElementById('videoModalClose');
const videoModalIframe   = document.getElementById('videoModalIframe');

function openVideoModal(videoId) {
  if (!videoModal || !videoModalIframe) return;
  videoModalIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  videoModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
  if (!videoModal) return;
  videoModal.classList.remove('open');
  // Small delay before clearing src so the fade-out plays cleanly
  setTimeout(() => { if (videoModalIframe) videoModalIframe.src = ''; }, 300);
  document.body.style.overflow = '';
}

document.querySelectorAll('.portfolio-video-trigger').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const videoId = btn.dataset.video;
    if (videoId) openVideoModal(videoId);
  });
});

if (videoModalBackdrop) videoModalBackdrop.addEventListener('click', closeVideoModal);
if (videoModalCloseBtn) videoModalCloseBtn.addEventListener('click', closeVideoModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && videoModal && videoModal.classList.contains('open')) {
    closeVideoModal();
  }
});

/* ── STICKY MOBILE CTA ── */
const stickyMobileCta = document.getElementById('stickyMobileCta');

function updateStickyCta() {
  if (!stickyMobileCta) return;
  const heroEl = document.getElementById('home');
  const contactEl = document.getElementById('contact');
  if (!heroEl) return;

  const heroBottom = heroEl.getBoundingClientRect().bottom;
  const contactTop = contactEl ? contactEl.getBoundingClientRect().top : Infinity;
  const windowH = window.innerHeight;

  // Show after hero, hide when contact section is in view
  const pastHero = heroBottom < 0;
  const nearContact = contactTop < windowH * 0.8;
  stickyMobileCta.classList.toggle('visible', pastHero && !nearContact);
}

window.addEventListener('scroll', updateStickyCta, { passive: true });

/* ── ADD REVEAL TARGETS FOR NEW SECTIONS ── */
const extraRevealTargets = [
  '.about-content',
  '.about-image-col',
  '.about-bullets li',
  '.step-card',
  '.pricing-card',
  '.trust-badge',
  '.pre-cta-inner',
  '.offer-card',
  '.metric-card',
];

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  toggleScrollTop();

  // Also observe new sections
  extraRevealTargets.forEach(selector => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('reveal');
      if (!el.dataset.delay) el.dataset.delay = i * 60;
      revealObserver.observe(el);
    });
  });

  // Observe new conversion sections
  const conversionRevealTargets = [
    '.client-card',
    '.brand-logo',
    '.special-offer-inner',
    '.lead-capture-inner',
    '.special-point',
    '.cd-unit',
  ];
  conversionRevealTargets.forEach(selector => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('reveal');
      if (!el.dataset.delay) el.dataset.delay = i * 70;
      revealObserver.observe(el);
    });
  });
});

/* ── COUNTDOWN TIMER ── */
(function initCountdown() {
  const cdDays  = document.getElementById('cdDays');
  const cdHours = document.getElementById('cdHours');
  const cdMins  = document.getElementById('cdMins');
  const cdSecs  = document.getElementById('cdSecs');
  if (!cdDays) return;

  // Target: end of current month (last day 23:59:59)
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick() {
    const diff = target - new Date();
    if (diff <= 0) {
      cdDays.textContent = '00';
      cdHours.textContent = '00';
      cdMins.textContent = '00';
      cdSecs.textContent = '00';
      return;
    }
    const days  = Math.floor(diff / 55500000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);
    const secs  = Math.floor((diff % 60000) / 1000);
    cdDays.textContent  = pad(days);
    cdHours.textContent = pad(hours);
    cdMins.textContent  = pad(mins);
    cdSecs.textContent  = pad(secs);
  }
  tick();
  setInterval(tick, 1000);
})();

/* ── LEAD CAPTURE FORM ── */
const leadForm    = document.getElementById('leadForm');
const leadSuccess = document.getElementById('leadSuccess');

if (leadForm) {
  leadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('leadEmail');
    const val = emailInput ? emailInput.value.trim() : '';
    if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      if (emailInput) emailInput.style.borderColor = '#ef4444';
      return;
    }
    const waText = `مرحباً رضوان 👋\n\nأريد الحصول على الخطة المجانية لتطوير مشروعي الرقمي.\n\nبريدي الإلكتروني: ${val}`;
    window.open('https://wa.me/212728427278?text=' + encodeURIComponent(waText), '_blank');
    leadForm.classList.add('hidden');
    if (leadSuccess) leadSuccess.classList.remove('hidden');
  });
}
