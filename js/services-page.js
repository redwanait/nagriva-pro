/* ════════════════════════════════════════════════════════
   Nagriva — Services Page Controller
   services-page.js
   Category filtering, search, dynamic rendering
   ════════════════════════════════════════════════════════ */

(function () {
  'use strict';

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

  function getSkeletonHtml() {
    if (window.NAGRIVA_Skeleton && window.NAGRIVA_Skeleton.serviceCards) {
      return window.NAGRIVA_Skeleton.serviceCards(6);
    }
    return '';
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

  function renderContentHtml() {
    var filtered = filterServices();
    state.filtered = filtered;

    if (!filtered.length) {
      return state.services.length === 0
        ? '<div class="ne"><div class="ne-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div><h3 class="ne-title">Coming soon</h3><p class="ne-desc">We\'re crafting something exceptional. Check back soon for our latest service offerings.</p></div>'
        : '<div class="ne ne-search"><div class="ne-icon"><i class="fas fa-search"></i></div><h3 class="ne-title">No services found</h3><p class="ne-desc">Try adjusting your search or filter to find what you\'re looking for.</p><div class="ne-actions"><button class="ne-btn ne-btn-secondary" onclick="NAGRIVA_ServicesPage.resetFilters()"><i class="fas fa-times"></i> Clear Filters</button></div></div>';
    }

    var sorted = filtered.slice().sort(function (a, b) {
      var aFeat = a.featured ? 1 : 0;
      var bFeat = b.featured ? 1 : 0;
      return bFeat - aFeat;
    });

    var html = sorted.map(function (s, i) { return buildCard(s, i); }).join('');

    setTimeout(function () {
      if (window.observeFadeUpElements) {
        window.observeFadeUpElements(grid);
      }
      if (window.rebindServiceEffects) {
        window.rebindServiceEffects(grid);
      }
    }, 50);

    return html;
  }

  function filterAndRender() {
    if (state.services.length > 0) {
      var contentHtml = renderContentHtml();
      if (skeleton) skeleton.style.display = 'none';
      grid.innerHTML = contentHtml;
    } else {
      if (skeleton) skeleton.style.display = 'none';
      var contentHtml = renderContentHtml();
      grid.innerHTML = contentHtml;
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

  function wrapSkeletonForTransition() {
    /* loading manager wrapper disabled to keep cards as direct grid children */
  }

  function loadServices() {
    if (typeof ServicesAPI === 'undefined') {
      renderError();
      return;
    }

    wrapSkeletonForTransition();

    ServicesAPI.getAllServices().then(function (services) {
      if (!services || !services.length) {
        var emptyHtml =
          '<div class="ne"><div class="ne-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div><h3 class="ne-title">Coming soon</h3><p class="ne-desc">We\'re crafting something exceptional. Check back soon for our latest service offerings.</p></div>';
        if (skeleton) skeleton.style.display = 'none';
        grid.innerHTML = emptyHtml;
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
