/* ════════════════════════════════════════════════════════
   Nagriva — Service Detail Page Interactivity
   service-detail.js
════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var currentGallery = 0;
  var galleryImages = [];
  var totalGallery = 0;

  function getSlug() {
    var pathParts = window.location.pathname.split('/').filter(Boolean);
    var last = pathParts[pathParts.length - 1] || '';
    return last.replace(/\.html$/, '');
  }

  function _imgFallback(img) {
    if (!window.ServicesAPI) return;
    img.onerror = function () {
      if (this.src === window.ServicesAPI.FALLBACK_IMG) return;
      this.onerror = null;
      this.src = window.ServicesAPI.FALLBACK_IMG;
    };
  }

  function loadGallery() {
    var slug = getSlug();
    if (!slug || !window.ServicesAPI) return;

    var images = window.ServicesAPI.getGalleryImages(slug);
    if (!images || !images.length) return;

    var mainImg = document.querySelector('.fv-gallery-main img');
    var thumbsContainer = document.querySelector('.fv-gallery-thumbs');

    if (mainImg) {
      mainImg.src = images[0];
      mainImg.alt = slug.replace(/-/g, ' ') + ' showcase';
      _imgFallback(mainImg);
    }

    if (thumbsContainer) {
      thumbsContainer.innerHTML = '';
      images.forEach(function (src, i) {
        var div = document.createElement('div');
        div.className = 'fv-gallery-thumb' + (i === 0 ? ' active' : '');
        div.setAttribute('data-src', src);
        var img = document.createElement('img');
        img.src = src;
        img.alt = 'Gallery image ' + (i + 1);
        _imgFallback(img);
        div.appendChild(img);
        thumbsContainer.appendChild(div);
      });
    }
  }

  function initGallery() {
    var main = document.querySelector('.fv-gallery-main img');
    var thumbs = document.querySelectorAll('.fv-gallery-thumb');
    var prevBtn = document.querySelector('.fv-gallery-prev');
    var nextBtn = document.querySelector('.fv-gallery-next');
    var dotsContainer = document.querySelector('.fv-gallery-dots');

    if (!main || !thumbs.length) return;

    galleryImages = Array.from(thumbs).map(function (t) {
      return t.getAttribute('data-src') || t.querySelector('img').src;
    });
    totalGallery = galleryImages.length;

    if (totalGallery < 2) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      return;
    }

    // Create dots
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      for (var i = 0; i < totalGallery; i++) {
        var dot = document.createElement('button');
        dot.className = 'fv-gallery-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        dot.addEventListener('click', function (idx) {
          return function () { goToSlide(idx); };
        }(i));
        dotsContainer.appendChild(dot);
      }
    }

    function goToSlide(index) {
      currentGallery = index;
      if (currentGallery < 0) currentGallery = totalGallery - 1;
      if (currentGallery >= totalGallery) currentGallery = 0;

      main.src = galleryImages[currentGallery];
      main.alt = 'Gallery image ' + (currentGallery + 1);

      thumbs.forEach(function (t, i) {
        t.classList.toggle('active', i === currentGallery);
      });

      var dots = document.querySelectorAll('.fv-gallery-dot');
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === currentGallery);
      });

      // Scroll thumb into view
      if (thumbs[currentGallery]) {
        thumbs[currentGallery].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        goToSlide(currentGallery - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        goToSlide(currentGallery + 1);
      });
    }

    thumbs.forEach(function (thumb, i) {
      thumb.addEventListener('click', function () {
        goToSlide(i);
      });
    });

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') goToSlide(currentGallery - 1);
      if (e.key === 'ArrowRight') goToSlide(currentGallery + 1);
    });
  }

  /* ─── FAQ ACCORDION ─── */
  function initFAQ() {
    var items = document.querySelectorAll('.fv-faq-item');

    items.forEach(function (item) {
      var question = item.querySelector('.fv-faq-question');
      if (!question) return;

      question.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');

        // Close all other items
        items.forEach(function (other) {
          other.classList.remove('open');
        });

        // Toggle current
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    });
  }

  /* ─── SCROLL ANIMATIONS ─── */
  function initScrollAnimations() {
    var els = document.querySelectorAll('.fv-fade-in');
    if (!els.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    els.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ─── INIT ─── */
  document.addEventListener('DOMContentLoaded', function () {
    loadGallery();
    initGallery();
    initFAQ();
    initScrollAnimations();
  });

})();
