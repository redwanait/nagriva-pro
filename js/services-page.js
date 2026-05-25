/* ════════════════════════════════════════════════════════
   NAGRIVA — Services Page Controller
   services-page.js
   Category filtering, search, dynamic rendering
   ════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var CATEGORY_ICONS = {
    'Design & Development': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="3"/><path d="M9 22h6"/><path d="M12 19v3"/></svg>',
    'Marketing & Growth': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/><path d="M2 12h20"/></svg>',
    'Technology & Innovation': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
  };

  var DEFAULT_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/></svg>';

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
        ? '<div class="services-error"><div class="services-error-icon">&#9734;</div><h3>Coming soon</h3><p>Check back soon for our latest service offerings.</p></div>'
        : '<div class="services-error"><div class="services-error-icon">&#128269;</div><h3>No services found</h3><p>Try adjusting your search or filter to find what you\'re looking for.</p></div>';
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
      '<div class="services-error">' +
        '<div class="services-error-icon">&#9888;</div>' +
        '<h3>Unable to load services</h3>' +
        '<p>Something went wrong. Please try again.</p>' +
        '<button class="services-retry-btn" id="servicesPageRetry">Retry</button>' +
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
          '<div class="services-error"><div class="services-error-icon">&#9734;</div><h3>Coming soon</h3><p>Check back soon for our latest service offerings.</p></div>';
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
