/* =============================================
   NAGRIVA – موقع العلامة الشخصية (عربي)
   JavaScript: Nagriva
   ============================================= */

'use strict';

/* ── NAVBAR ── */
const navbar          = document.getElementById('navbar');
const navToggle       = document.getElementById('navToggle');
const navLinks        = document.getElementById('navLinks');
const navLinkItems    = document.querySelectorAll('.nav-link');

/* ── MOBILE SIDEBAR ── */
const mobileMenu      = document.getElementById('mobileMenu');
const mobileBackdrop  = document.getElementById('mobileBackdrop');
const mobileSidebar   = document.getElementById('mobileSidebar');
const mobileMenuClose = document.getElementById('mobileMenuClose');

/* ── NAVBAR SCROLL BEHAVIOR ── */
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  navbar.classList.toggle('scrolled', scrollY > 20);
  

  
  toggleScrollTop();
  updateActiveNavLink();
});

let _menuScrollY = 0;

function _lockBodyScroll(lock) {
  if (lock) {
    _menuScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${_menuScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
  } else {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    window.scrollTo(0, _menuScrollY);
  }
}

function closeNavMenu() {
  mobileMenu.classList.remove('open');
  navToggle.classList.remove('active');
  navToggle.setAttribute('aria-expanded', 'false');
  _lockBodyScroll(false);
  navToggle.focus();
}

navToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = mobileMenu.classList.toggle('open');
  navToggle.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', open);
  _lockBodyScroll(open);
  if (open) {
    setTimeout(() => mobileMenuClose.focus(), 120);
  }
});

mobileBackdrop.addEventListener('click', closeNavMenu);
mobileMenuClose.addEventListener('click', closeNavMenu);

mobileSidebar.querySelectorAll('.ms-link, .ms-cta').forEach(link => {
  link.addEventListener('click', closeNavMenu);
});

document.addEventListener('click', (e) => {
  if (mobileMenu.classList.contains('open') &&
      !mobileSidebar.contains(e.target) &&
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
  document.querySelectorAll('.ms-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}

/* ── DARK / LIGHT MODE (MANUAL TOGGLE) ── */
const themeToggleBtn = document.getElementById('themeToggle');
const themeIcon      = document.getElementById('themeIcon');
const mobileThemeToggle = document.getElementById('mobileThemeToggle');
const mobileThemeIcon   = document.getElementById('mobileThemeIcon');

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light-mode');
    themeIcon.className = 'fa-solid fa-sun';
    if (mobileThemeIcon) mobileThemeIcon.className = 'fa-solid fa-sun';
  } else {
    root.classList.remove('light-mode');
    themeIcon.className = 'fa-solid fa-moon';
    if (mobileThemeIcon) mobileThemeIcon.className = 'fa-solid fa-moon';
  }
  localStorage.setItem('nagriva-theme', theme);
}

// On load: use saved preference, default to dark
(function initTheme() {
  const saved = localStorage.getItem('nagriva-theme') || 'dark';
  applyTheme(saved);
})();

themeToggleBtn.addEventListener('click', () => {
  const isLight = document.documentElement.classList.contains('light-mode');
  applyTheme(isLight ? 'dark' : 'light');
});

if (mobileThemeToggle) {
  mobileThemeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.classList.contains('light-mode');
    applyTheme(isLight ? 'dark' : 'light');
  });
}

const mobileSearchToggle = document.getElementById('mobileSearchToggle');
if (mobileSearchToggle) {
  mobileSearchToggle.addEventListener('click', () => {
    closeNavMenu();
    openSearch();
  });
}

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
    if (mobileMenu.classList.contains('open')) closeNavMenu();
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
  '.pricing-card',
  '.faq-item',
  '.hero-badge',
  '.hero-title',
  '.hero-desc',
  '.hero-actions',
  '.hero-stats',
  '.trust-row',
  '.hero-visual',
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

  const waText = `مرحباً Nagriva 👋\n\nاسمي: ${name}\nبريدي الإلكتروني: ${email}\nالخدمة المطلوبة: ${serviceLabels[service] || service}\n\nتفاصيل المشروع:\n${message}`;

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
  const url      = card.dataset.url      || '';
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
      ${url && url !== '#' ? `<a href="${url}" target="_blank" rel="noopener" class="btn btn-outline">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> معاينة حية
      </a>` : ''}
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

/* ══════════════════════════════════════
   PORTFOLIO – Premium Interactions
══════════════════════════════════════ */

/* ── 1. Before / After Drag Slider ── */
(function initBASliders() {
  const baToggles = document.querySelectorAll('[data-ba-toggle]');
  if (!baToggles.length) return;

  let activeSlider = null;

  function handleBAToggle(btn) {
    const card = btn.closest('.portfolio-card');
    if (!card) return;
    const slider = card.querySelector('.card-ba-slider');
    const mainImg = card.querySelector('.card-img-main');
    if (!slider || !mainImg) return;

    const isActive = slider.classList.contains('active');

    // Close any open slider
    if (activeSlider && activeSlider !== slider) {
      activeSlider.classList.remove('active');
      activeSlider.closest('.portfolio-card').querySelector('.card-img-main').style.opacity = '1';
    }

    if (isActive) {
      slider.classList.remove('active');
      mainImg.style.opacity = '1';
      activeSlider = null;
    } else {
      slider.classList.add('active');
      mainImg.style.opacity = '0';
      activeSlider = slider;
      initDragSlider(slider);
    }
  }

  function initDragSlider(slider) {
    const handle = slider.querySelector('.ba-handle');
    const after = slider.querySelector('.ba-after');
    if (!handle || !after) return;

    let isDragging = false;

    function updateSlider(x) {
      const rect = slider.getBoundingClientRect();
      let pos = (x - rect.left) / rect.width;
      pos = Math.max(0.05, Math.min(0.95, pos));
      const pct = pos * 100;
      after.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      handle.style.left = pct + '%';
    }

    function onStart(e) {
      isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      updateSlider(clientX);
    }

    function onMove(e) {
      if (!isDragging) return;
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      updateSlider(clientX);
    }

    function onEnd() {
      isDragging = false;
    }

    handle.addEventListener('mousedown', onStart);
    slider.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);

    handle.addEventListener('touchstart', onStart, { passive: true });
    slider.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);

    // Init at center
    updateSlider(slider.getBoundingClientRect().left + slider.getBoundingClientRect().width / 2);
  }

  baToggles.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleBAToggle(btn);
    });
  });

  // Close BA on card mouseleave (if open)
  document.querySelectorAll('.portfolio-card[data-has-ba]').forEach(card => {
    card.addEventListener('mouseleave', () => {
      const slider = card.querySelector('.card-ba-slider');
      const mainImg = card.querySelector('.card-img-main');
      if (slider && slider.classList.contains('active')) {
        slider.classList.remove('active');
        mainImg.style.opacity = '1';
        activeSlider = null;
      }
    });
  });
})();

/* ── 3. 3D Tilt Effect on Cards ── */
(function initCardTilt() {
  const cards = document.querySelectorAll('.portfolio-card');
  if (!cards.length) return;

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      card.style.transform =
        `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`;

      // Dynamic glow position
      const glow = card.querySelector('.card-glow');
      if (glow) {
        const pctX = (x / rect.width) * 100;
        const pctY = (y / rect.height) * 100;
        glow.style.background = `radial-gradient(circle at ${pctX}% ${pctY}%, rgba(124,58,237,0.15) 0%, transparent 60%)`;
      }
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
      const glow = card.querySelector('.card-glow');
      if (glow) {
        glow.style.background = '';
      }
    });
  });
})();

/* ── 4. Enhanced Filter Animation ── */
(function enhanceFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioCards = document.querySelectorAll('.portfolio-card');

  if (!filterBtns.length || !portfolioCards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      portfolioCards.forEach((card, index) => {
        const match = filter === 'all' || card.dataset.category === filter;

        if (match) {
          card.classList.remove('hide');
          card.style.animation = 'none';
          card.offsetHeight; // force reflow
          card.style.animation = `cardFadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards`;
          card.style.animationDelay = `${0.05 + (index % 3) * 0.08}s`;
        } else {
          card.classList.add('hide');
          card.style.animation = 'none';
        }
      });
    });
  });
})();

/* ══════════════════════════════════════════════════
   ║  PREMIUM WOW FACTOR — FUTURISTIC EFFECTS
   ╚══════════════════════════════════════════════════ */

/* ── 1. CURSOR GLOW FOLLOWER ── */
(function initCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  const trail = document.getElementById('cursorTrail');
  if (!glow || !trail) return;

  let mouseX = -500, mouseY = -500;
  let trailX = -500, trailY = -500;
  let rafId = null;

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(updateGlow);
    }
  }

  function updateGlow() {
    glow.style.left = mouseX + 'px';
    glow.style.top = mouseY + 'px';

    trailX += (mouseX - trailX) * 0.08;
    trailY += (mouseY - trailY) * 0.08;
    trail.style.left = trailX + 'px';
    trail.style.top = trailY + 'px';

    rafId = null;
  }

  document.addEventListener('mousemove', onMouseMove, { passive: true });
})();

/* ── 2. PARALLAX ON SCROLL ── */
(function initParallax() {
  const layers = document.querySelectorAll('[data-parallax]');
  if (!layers.length) return;

  let ticking = false;

  function updateParallax() {
    const scrollY = window.scrollY;
    layers.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.05;
      const rect = el.getBoundingClientRect();
      const centerDist = rect.top + rect.height / 2 - window.innerHeight / 2;
      const offset = centerDist * speed;
      el.style.transform = `translateY(${offset}px)`;
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
})();

/* ── 3. MAGNETIC BUTTONS ── */
(function initMagnetic() {
  const magnets = document.querySelectorAll('.btn-primary, .nav-cta, .btn-service-featured');
  if (!magnets.length) return;

  magnets.forEach(btn => {
    btn.addEventListener('mousemove', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const strength = 8;
      this.style.transform =
        `translate(${x / strength}px, ${y / strength}px) scale(1.03)`;
    });

    btn.addEventListener('mouseleave', function() {
      this.style.transform = '';
    });
  });
})();

/* ── PREMIUM TESTIMONIALS CAROUSEL ── */
(function initTestimonialsCarousel() {
  const carousel = document.querySelector('[data-testimonials-carousel]');
  if (!carousel) return;

  const cards = Array.from(carousel.querySelectorAll('[data-testi-card]'));
  const prevBtn = carousel.querySelector('[data-testi-prev]');
  const nextBtn = carousel.querySelector('[data-testi-next]');
  const dotsWrap = document.querySelector('[data-testi-dots]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activeIndex = 0;
  let autoplayId = null;
  let touchStartX = 0;
  let touchStartY = 0;

  if (!cards.length) return;

  function getRelativeIndex(index) {
    return (index - activeIndex + cards.length) % cards.length;
  }

  function render() {
    cards.forEach((card, index) => {
      const relative = getRelativeIndex(index);
      card.classList.remove('active', 'prev', 'next');
      card.setAttribute('aria-hidden', 'true');

      if (relative === 0) {
        card.classList.add('active');
        card.removeAttribute('aria-hidden');
      } else if (relative === 1) {
        card.classList.add('next');
      } else if (relative === cards.length - 1) {
        card.classList.add('prev');
      }
    });

    if (dotsWrap) {
      dotsWrap.querySelectorAll('.testi-dot').forEach((dot, index) => {
        const isActive = index === activeIndex;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', String(isActive));
      });
    }
  }

  function goTo(index) {
    activeIndex = (index + cards.length) % cards.length;
    render();
  }

  function startAutoplay() {
    if (prefersReducedMotion || autoplayId) return;
    autoplayId = window.setInterval(() => goTo(activeIndex + 1), 5200);
  }

  function stopAutoplay() {
    if (!autoplayId) return;
    window.clearInterval(autoplayId);
    autoplayId = null;
  }

  if (dotsWrap) {
    dotsWrap.innerHTML = cards.map((_, index) => `
      <button class="testi-dot" type="button" role="tab" aria-label="عرض الشهادة ${index + 1}" data-index="${index}"></button>
    `).join('');

    dotsWrap.querySelectorAll('.testi-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        goTo(Number(dot.dataset.index));
        stopAutoplay();
        startAutoplay();
      });
    });
  }

  prevBtn?.addEventListener('click', () => {
    goTo(activeIndex - 1);
    stopAutoplay();
    startAutoplay();
  });

  nextBtn?.addEventListener('click', () => {
    goTo(activeIndex + 1);
    stopAutoplay();
    startAutoplay();
  });

  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);
  carousel.addEventListener('focusin', stopAutoplay);
  carousel.addEventListener('focusout', startAutoplay);

  carousel.addEventListener('pointermove', (e) => {
    const activeCard = carousel.querySelector('.testi-card.active');
    if (!activeCard) return;
    const rect = activeCard.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    activeCard.style.setProperty('--spot-x', `${Math.max(0, Math.min(100, x))}%`);
    activeCard.style.setProperty('--spot-y', `${Math.max(0, Math.min(100, y))}%`);
  });

  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    stopAutoplay();
  }, { passive: true });

  carousel.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY)) {
      goTo(activeIndex + (deltaX > 0 ? -1 : 1));
    }

    startAutoplay();
  }, { passive: true });

  render();
  startAutoplay();
})();

/* ── 4. ENHANCED SCROLL REVEAL (MULTI-TYPE) ── */
(function initEnhancedReveal() {
  const revealMap = [
    { selector: '.section-header', type: 'reveal', threshold: 0.15 },
    { selector: '.service-card', type: 'reveal', threshold: 0.1 },
    { selector: '.pricing-card', type: 'reveal', threshold: 0.1 },
    { selector: '.faq-item', type: 'reveal', threshold: 0.1 },
    { selector: '.hero-badge', type: 'reveal-blur', threshold: 0.2 },
    { selector: '.hero-title', type: 'reveal', threshold: 0.2 },
    { selector: '.hero-desc', type: 'reveal', threshold: 0.2 },
    { selector: '.hero-actions', type: 'reveal', threshold: 0.2 },
    { selector: '.hero-stats', type: 'reveal', threshold: 0.2 },
    { selector: '.trust-row', type: 'reveal', threshold: 0.2 },
    { selector: '.hero-visual', type: 'reveal-scale', threshold: 0.2 },
    { selector: '.pricing-card--featured', type: 'reveal-scale', threshold: 0.1 },
    { selector: '.portfolio-card', type: 'reveal', threshold: 0.1 },
  ];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, Number(delay));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealMap.forEach(({ selector, type, threshold }) => {
    document.querySelectorAll(selector).forEach(el => {
      // Add the animation class if not already present
      if (!el.classList.contains('reveal') &&
          !el.classList.contains('reveal-scale') &&
          !el.classList.contains('reveal-blur') &&
          !el.classList.contains('reveal-slide-left') &&
          !el.classList.contains('reveal-slide-right')) {
        el.classList.add(type);
      }
      observer.observe(el);
    });
  });
})();

/* ── 5. CINEMATIC SECTION DIVIDER ANIMATION ── */
(function initSectionDividers() {
  const sections = document.querySelectorAll('section');
  sections.forEach((sec, i) => {
    if (i === sections.length - 1) return;
    sec.style.position = 'relative';
    const divider = document.createElement('div');
    divider.className = 'section-divider';
    sec.after(divider);
  });
})();

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  toggleScrollTop();
});
