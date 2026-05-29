/* ════════════════════════════════════════════════════════
   NAGRIVA — Services Page Controller
   services-page.js
   Category filtering, search, dynamic rendering
   ════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var CATEGORY_ICONS = {
    'Web Design': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    'SEO': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    'Automation': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    'Branding': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.2 7.8l-1 1a3 3 0 0 1-4.2 0l-1-1a3 3 0 0 1 0-4.2l1-1a3 3 0 0 1 4.2 0l1 1a3 3 0 0 1 0 4.2z"/><path d="M15 10l-8 8"/><path d="M18 13l-5 5"/><path d="M8 2l-2 2"/><path d="M2 8l-2 2"/></svg>',
    'Content': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    'Growth': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'
  };

  var DEFAULT_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

  var state = {
    services: [],
    filtered: [],
    activeCategory: 'All',
    searchQuery: ''
  };

  var grid = document.getElementById('servicesPageGrid');
  var skeleton = document.getElementById('servicesPageSkeleton');
  var categoriesWrap = document.getElementById('servicesCategories');
  var searchInput = document.getElementById('servicesSearch');

  function stripHtml(str) {
    return String(str || '').replace(/<[^>]*>/g, '').trim();
  }

  function escapeAttr(str) {
    return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getIcon(category) {
    return CATEGORY_ICONS[category] || DEFAULT_ICON;
  }

  function buildCard(service, index) {
    var slug = service.slug || '';
    var title = service.title || '';
    var shortDesc = service.short_description || '';
    var image = service.image || '';
    var category = service.category || '';
    var icon = getIcon(category);
    var delay = (index * 0.04) + 's';

    var plainTitle = stripHtml(title);
    var plainDesc = stripHtml(shortDesc);
    var firstLetter = (plainTitle || 'S').charAt(0).toUpperCase();

    return '<a href="/pages/service.html?slug=' + encodeURIComponent(slug) + '" class="service-card fade-up sv-card-premium" style="--delay:' + delay + '">' +
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
      '<div class="service-footer sv-card-footer">' +
        '<span class="sv-card-learn">Learn More</span>' +
        '<div class="service-arrow">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
        '</div>' +
      '</div>' +
    '</a>';
  }

  function extractCategories(services) {
    var cats = ['All'];
    var seen = {};
    services.forEach(function (s) {
      var c = s.category;
      if (c && !seen[c]) {
        seen[c] = true;
        cats.push(c);
      }
    });
    return cats;
  }

  function renderCategories(categories) {
    if (!categoriesWrap) return;
    var html = categories.map(function (cat) {
      var active = cat === state.activeCategory ? ' active' : '';
      return '<button class="services-cat-btn' + active + '" data-category="' + escapeAttr(cat) + '">' + escapeAttr(cat) + '</button>';
    }).join('');
    categoriesWrap.innerHTML = html;

    categoriesWrap.querySelectorAll('.services-cat-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = this.getAttribute('data-category');
        if (cat === state.activeCategory) return;
        state.activeCategory = cat;

        categoriesWrap.querySelectorAll('.services-cat-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');

        filterAndRender();
      });
    });
  }

  function filterServices() {
    var query = state.searchQuery.toLowerCase().trim();
    var cat = state.activeCategory;

    return state.services.filter(function (s) {
      var matchCat = cat === 'All' || (s.category === cat);
      var matchSearch = !query ||
        (s.title && stripHtml(s.title).toLowerCase().indexOf(query) !== -1) ||
        (s.category && s.category.toLowerCase().indexOf(query) !== -1) ||
        (s.short_description && stripHtml(s.short_description).toLowerCase().indexOf(query) !== -1);
      return matchCat && matchSearch;
    });
  }

  function filterAndRender() {
    var filtered = filterServices();
    state.filtered = filtered;

    if (skeleton) skeleton.style.display = 'none';

    if (!filtered.length) {
      grid.innerHTML = state.services.length === 0
        ? '<div class="ne"><div class="ne-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div><h3 class="ne-title">Coming soon</h3><p class="ne-desc">We\'re crafting something exceptional. Check back soon for our latest service offerings.</p></div>'
        : '<div class="ne ne-search"><div class="ne-icon"><i class="fas fa-search"></i></div><h3 class="ne-title">No services found</h3><p class="ne-desc">Try adjusting your search or filter to find what you\'re looking for.</p><div class="ne-actions"><button class="ne-btn ne-btn-secondary" onclick="NAGRIVA_ServicesPage.resetFilters()"><i class="fas fa-times"></i> Clear Filters</button></div></div>';
      return;
    }

    var sorted = filtered.slice().sort(function (a, b) {
      var aFeat = a.featured ? 1 : 0;
      var bFeat = b.featured ? 1 : 0;
      return bFeat - aFeat;
    });

    var html = sorted.map(function (s, i) { return buildCard(s, i); }).join('');
    grid.innerHTML = html;

    if (window.observeFadeUpElements) {
      window.observeFadeUpElements(grid);
    }

    if (window.rebindServiceEffects) {
      window.rebindServiceEffects(grid);
    }
  }

  function renderError() {
    if (skeleton) skeleton.style.display = 'none';
    grid.innerHTML =
      '<div class="ne ne-error">' +
        '<div class="ne-icon"><i class="fas fa-exclamation-triangle"></i></div>' +
        '<h3 class="ne-title">Unable to load services</h3>' +
        '<p class="ne-desc">Something went wrong. Please try again.</p>' +
        '<div class="ne-actions"><button class="ne-btn ne-btn-primary" id="servicesPageRetry"><i class="fas fa-sync"></i> Retry</button></div>' +
      '</div>';

    var retryBtn = document.getElementById('servicesPageRetry');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () { location.reload(); });
    }
  }

  function loadServices() {
    if (typeof ServicesAPI === 'undefined') {
      renderError();
      return;
    }

    ServicesAPI.getAllServices().then(function (services) {
      if (!services || !services.length) {
        if (skeleton) skeleton.style.display = 'none';
        grid.innerHTML =
          '<div class="ne"><div class="ne-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div><h3 class="ne-title">Coming soon</h3><p class="ne-desc">We\'re crafting something exceptional. Check back soon for our latest service offerings.</p></div>';
        return;
      }

      state.services = services;

      var categories = extractCategories(services);
      renderCategories(categories);

      filterAndRender();

    }).catch(function () {
      renderError();
    });
  }

  function initSearch() {
    if (!searchInput) return;

    var debounceTimer = null;
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        state.searchQuery = searchInput.value;
        filterAndRender();
      }, 200);
    });
  }

  function init() {
    if (!grid) return;
    loadServices();
    initSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
