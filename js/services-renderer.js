/* ════════════════════════════════════════════════════════
   Nagriva — Service Detail Renderer
   services-renderer.js
   Renders dynamic service data into the service.html template
   ════════════════════════════════════════════════════════ */

window.ServicesRenderer = (function () {
  'use strict';

  /* ─── ICON LIBRARY ─── */

  var ICONS = {
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    clockAlt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    usersPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    clockMeta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    editMeta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
  };

  /* ─── HELPERS ─── */

  function qs(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function qsa(sel, ctx) {
    return (ctx || document).querySelectorAll(sel);
  }

  /* ─── RENDERERS ─── */

  function renderMeta(data) {
    var title = qs('title');
    var metaDesc = qs('meta[name="description"]');
    if (title && data.pageTitle) title.textContent = data.pageTitle;
    if (metaDesc && data.metaDescription) metaDesc.setAttribute('content', data.metaDescription);

    var ogTitle = qs('meta[data-service="og-title"]');
    var ogDesc = qs('meta[data-service="og-description"]');
    var ogUrl = qs('meta[data-service="og-url"]');
    var twTitle = qs('meta[data-service="tw-title"]');
    var twDesc = qs('meta[data-service="tw-description"]');
    if (ogTitle && data.pageTitle) ogTitle.setAttribute('content', data.pageTitle);
    if (ogDesc && data.metaDescription) ogDesc.setAttribute('content', data.metaDescription);
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
    if (twTitle && data.pageTitle) twTitle.setAttribute('content', data.pageTitle);
    if (twDesc && data.metaDescription) twDesc.setAttribute('content', data.metaDescription);
  }

  function renderBreadcrumb(data) {
    var el = qs('[data-service="breadcrumb-current"]');
    if (el && data.breadcrumbCurrent) el.textContent = data.breadcrumbCurrent;
  }

  function renderTitle(data) {
    var el = qs('[data-service="service-title"]');
    if (el && data.title) el.innerHTML = data.title;
  }

  function renderHighlights(data) {
    var container = qs('[data-service="highlights"]');
    if (!container || !data.highlights) return;
    container.innerHTML = '';
    data.highlights.forEach(function (h) {
      var tag = document.createElement('span');
      tag.className = 'fv-highlight-tag';
      tag.textContent = h;
      container.appendChild(tag);
    });
  }

  function renderSeller(data) {
    var nameEl = qs('[data-service="seller-name"]');
    var labelEl = qs('[data-service="seller-label"]');
    if (nameEl && data.sellerName) nameEl.textContent = data.sellerName;
    if (labelEl && data.sellerLabel) labelEl.textContent = data.sellerLabel;
  }

  function renderReviews(data) {
    var ratingEl = qs('[data-service="rating"]');
    var countEl = qs('[data-service="reviews-count"]');
    var barEl = qs('[data-service="satisfaction-bar"]');
    var textEl = qs('[data-service="satisfaction-text"]');
    if (ratingEl && data.rating != null) ratingEl.textContent = data.rating;
    if (countEl && data.reviewCount != null) countEl.textContent = '(' + data.reviewCount + ' reviews)';
    if (barEl && data.satisfaction != null) barEl.style.width = data.satisfaction + '%';
    if (textEl && data.satisfaction != null) textEl.textContent = data.satisfaction + '% Satisfaction';
  }

  function renderGallery(data) {
    var mainImg = qs('[data-service="gallery-main"]');
    var thumbsContainer = qs('[data-service="gallery-thumbs"]');
    if (!data.gallery || !data.gallery.length) return;

    if (mainImg) {
      mainImg.src = data.gallery[0];
      mainImg.alt = data.title ? data.title + ' showcase' : 'Gallery image 1';
    }

    if (thumbsContainer) {
      thumbsContainer.innerHTML = '';
      data.gallery.forEach(function (src, i) {
        var div = document.createElement('div');
        div.className = 'fv-gallery-thumb' + (i === 0 ? ' active' : '');
        var img = document.createElement('img');
        img.src = src;
        img.alt = (data.title ? data.title + ' ' : '') + 'gallery image ' + (i + 1);
        img.setAttribute('data-src', src);
        div.appendChild(img);
        thumbsContainer.appendChild(div);
      });
    }
  }

  function renderDescription(data) {
    var el = qs('[data-service="description"]');
    if (el && data.description) el.innerHTML = data.description;
  }

  function renderBenefits(data) {
    var container = qs('[data-service="benefits"]');
    if (!container || !data.benefits) return;
    container.innerHTML = '';
    data.benefits.forEach(function (b) {
      var item = document.createElement('div');
      item.className = 'fv-benefit-item';
      var iconSvg = ICONS[b.icon] || '';
      item.innerHTML = '<div class="fv-benefit-icon">' + iconSvg + '</div><div class="fv-benefit-text"><h4>' + b.title + '</h4><p>' + b.text + '</p></div>';
      container.appendChild(item);
    });
  }

  function renderProcess(data) {
    var container = qs('[data-service="process"]');
    if (!container || !data.process) return;
    container.innerHTML = '';
    data.process.forEach(function (p) {
      var step = document.createElement('div');
      step.className = 'fv-process-step';
      step.innerHTML = '<div class="fv-process-num">' + p.num + '</div><div class="fv-process-content"><h4>' + p.title + '</h4><p>' + p.text + '</p></div>';
      container.appendChild(step);
    });
  }

  function renderFAQ(data) {
    var container = qs('[data-service="faq"]');
    if (!container || !data.faq) return;
    container.innerHTML = '';
    data.faq.forEach(function (f) {
      var item = document.createElement('div');
      item.className = 'fv-faq-item';
      item.innerHTML =
        '<button class="fv-faq-question">' + f.question +
        '<svg class="fv-faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
        '</button><div class="fv-faq-answer"><p>' + f.answer + '</p></div>';
      container.appendChild(item);
    });
  }

  function renderResults(data) {
    var container = qs('[data-service="results"]');
    if (!container || !data.results) return;
    container.innerHTML = '';
    data.results.forEach(function (r) {
      var item = document.createElement('div');
      item.className = 'fv-result-item';
      item.innerHTML = '<div class="fv-result-num">' + r.num + '</div><div class="fv-result-label">' + r.label + '</div>';
      container.appendChild(item);
    });
  }

  function renderPackages(data) {
    var tabsContainer = qs('[data-service="packages-tabs"]');
    var dataContainer = qs('[data-service="packages-data"]');
    if (!data.packages || !data.packages.length) return;

    if (tabsContainer) {
      tabsContainer.innerHTML = '';
      data.packages.forEach(function (pkg, i) {
        var tab = document.createElement('button');
        tab.className = 'fv-pkg-tab' + (pkg.popular ? ' active' : '');
        tab.setAttribute('data-pkg', i);
        tab.textContent = pkg.shortName || pkg.name.split(' ')[0];
        tabsContainer.appendChild(tab);
      });
    }

    if (dataContainer) {
      dataContainer.innerHTML = '';
      data.packages.forEach(function (pkg, i) {
        var div = document.createElement('div');
        div.className = 'fv-pkg-data';
        div.setAttribute('data-pkg', i);
        div.style.display = pkg.popular ? 'block' : 'none';

        var featuresHtml = '';
        (pkg.features || []).forEach(function (f) {
          featuresHtml += '<li class="fv-feature-item">' + ICONS.check + f + '</li>';
        });

        var pkgName = encodeURIComponent(pkg.name);
        var pkgPrice = encodeURIComponent(pkg.price.replace(/,/g, ''));
        var pkgDelivery = encodeURIComponent(pkg.delivery);
        var pkgRevisions = encodeURIComponent(pkg.revisions);
        var orderHref = '/pages/checkout.html?service=' + data.slug + '&pkg=' + i + '&package=' + pkgName + '&price=' + pkgPrice + '&delivery=' + pkgDelivery + '&revisions=' + pkgRevisions;

        div.innerHTML =
          '<div class="fv-pkg-name">' + (pkg.featured ? pkg.name + ' &bull; Most Popular' : pkg.name) + '</div>' +
          '<div class="fv-price"><span class="fv-price-amount">' + pkg.price + '</span><span class="fv-price-currency">MAD</span></div>' +
          '<div class="fv-meta">' +
            '<div class="fv-meta-item">' + ICONS.clockMeta + pkg.delivery + '</div>' +
            '<div class="fv-meta-item">' + ICONS.editMeta + pkg.revisions + '</div>' +
          '</div>' +
          '<div class="fv-features-title">What\'s Included</div>' +
          '<ul class="fv-features">' + featuresHtml + '</ul>' +
          '<a href="' + orderHref + '" class="fv-cta fv-cta--primary" data-service="cta-primary">Order Now <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></a>' +
          '<a href="/pages/contact.html" class="fv-cta fv-cta--secondary">Contact Us</a>' +
          '<div class="fv-sidebar-trust">' + ICONS.lock + 'Secure checkout &bull; Money-back guarantee</div>';

        dataContainer.appendChild(div);
      });
    }
  }

  function renderTrustBar(data) {
    var container = qs('[data-service="trust-bar"]');
    if (!container || !data.trustItems) return;
    container.innerHTML = '';
    data.trustItems.forEach(function (t) {
      var span = document.createElement('span');
      span.className = 'fv-trust-item';
      span.innerHTML = (ICONS[t.icon] || '') + t.text;
      container.appendChild(span);
    });
  }

  function renderCTA(data) {
    if (!data.packages || !data.packages.length) return;
    var packagesContainer = qs('[data-service="packages-data"]');
    var primaryLinks = qsa('[data-service="cta-primary"]');
    var mostPopular = data.packages.find(function (p) { return p.popular; }) || data.packages[0];
    var pkgIndex = data.packages.indexOf(mostPopular);
    var pkgName = encodeURIComponent(mostPopular.name);
    var pkgPrice = encodeURIComponent(mostPopular.price.replace(/,/g, ''));
    var pkgDelivery = encodeURIComponent(mostPopular.delivery);
    var pkgRevisions = encodeURIComponent(mostPopular.revisions);
    var orderHref = '/pages/checkout.html?service=' + data.slug + '&pkg=' + pkgIndex + '&package=' + pkgName + '&price=' + pkgPrice + '&delivery=' + pkgDelivery + '&revisions=' + pkgRevisions;
    primaryLinks.forEach(function (link) {
      if (packagesContainer && packagesContainer.contains(link)) return;
      link.href = orderHref;
    });
  }

  /* ─── MAIN ENTRY ─── */

  function render(data) {
    if (!data) return;
    renderMeta(data);
    renderBreadcrumb(data);
    renderTitle(data);
    renderHighlights(data);
    renderSeller(data);
    renderReviews(data);
    renderGallery(data);
    renderDescription(data);
    renderBenefits(data);
    renderProcess(data);
    renderFAQ(data);
    renderResults(data);
    renderPackages(data);
    renderTrustBar(data);
    renderCTA(data);
  }

  return { render: render };
})();
