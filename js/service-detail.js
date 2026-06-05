/* ════════════════════════════════════════════════════════
   NAGRIVA — Service Detail Page Interactivity
   service-detail.js
════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var currentGallery = 0;
  var galleryImages = [];
  var totalGallery = 0;

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

  /* ─── PACKAGE TABS ─── */
  function initPackageTabs() {
    var tabs = document.querySelectorAll('.fv-pkg-tab');
    var packages = document.querySelectorAll('.fv-pkg-data');

    if (!tabs.length || !packages.length) return;

    function activatePackage(index) {
      tabs.forEach(function (t, i) {
        t.classList.toggle('active', i === index);
      });
      packages.forEach(function (p, i) {
        p.style.display = i === index ? 'block' : 'none';
      });
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        activatePackage(i);
      });
    });

    // Activate the "Most Popular" tab by default (usually index 1)
    var featuredIdx = 1;
    if (tabs[featuredIdx] && tabs[featuredIdx].classList.contains('fv-pkg-tab')) {
      activatePackage(featuredIdx);
    } else {
      activatePackage(0);
    }
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
    initGallery();
    initPackageTabs();
    initFAQ();
    initScrollAnimations();
  });

})();
