(function() {
  'use strict';

  var sectionEl = document.getElementById('testimonials');
  if (!sectionEl) return;

  /* ─── Counter Animation ─── */
  var statNumbers = sectionEl.querySelectorAll('.ts-stat-number');
  var countersAnimated = false;

  function animateCounters() {
    if (countersAnimated) return;
    countersAnimated = true;

    statNumbers.forEach(function(el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      if (isNaN(target)) return;
      var suffix = el.getAttribute('data-suffix') || '';
      var duration = 2000;
      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.floor(eased * target);
        el.textContent = current.toLocaleString() + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target.toLocaleString() + suffix;
        }
      }

      requestAnimationFrame(step);
    });
  }

  /* ─── Intersection Observer for counters ─── */
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          animateCounters();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    observer.observe(sectionEl);
  } else {
    animateCounters();
  }

  /* ─── Mobile Auto-Rotation ─── */
  var isMobile = window.innerWidth <= 768;
  var testCards = sectionEl.querySelectorAll('.ts-test-card');
  var indicatorContainer = sectionEl.querySelector('.ts-mobile-indicator');
  var dots;
  var currentIndex = 0;
  var rotationInterval = null;
  var rotationPaused = false;

  function updateMobileView() {
    if (window.innerWidth > 768) {
      if (rotationInterval) {
        clearInterval(rotationInterval);
        rotationInterval = null;
      }
      testCards.forEach(function(c) { c.style.display = ''; });
      return;
    }

    isMobile = true;

    if (!indicatorContainer) {
      var grid = sectionEl.querySelector('.ts-test-grid');
      if (!grid) return;
      var ind = document.createElement('div');
      ind.className = 'ts-mobile-indicator';
      grid.parentNode.insertBefore(ind, grid.nextSibling);
    }

    var container = indicatorContainer || sectionEl.querySelector('.ts-mobile-indicator');
    container.innerHTML = '';
    dots = [];

    testCards.forEach(function(card, i) {
      if (i >= 3) {
        card.style.display = 'none';
      } else {
        card.style.display = '';
      }
      var dot = document.createElement('button');
      dot.className = 'ts-mobile-dot' + (i === 0 && i < 3 ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
      dot.addEventListener('click', function() {
        showCard(i);
        rotationPaused = true;
        setTimeout(function() { rotationPaused = false; }, 5000);
      });
      container.appendChild(dot);
      dots.push(dot);
    });

    if (testCards.length > 3) {
      showCard(0);
    }
  }

  function showCard(index) {
    if (window.innerWidth > 768) return;
    var totalCards = Math.min(testCards.length, 3);
    if (index >= totalCards) index = 0;
    if (index < 0) index = totalCards - 1;
    currentIndex = index;

    testCards.forEach(function(card, i) {
      if (i < 3) {
        card.style.display = i === currentIndex ? '' : 'none';
      }
    });

    if (dots) {
      dots.forEach(function(d, i) {
        d.classList.toggle('active', i === currentIndex);
      });
    }
  }

  function nextCard() {
    if (rotationPaused) return;
    showCard(currentIndex + 1);
  }

  function startRotation() {
    if (rotationInterval) clearInterval(rotationInterval);
    if (window.innerWidth <= 768) {
      rotationInterval = setInterval(nextCard, 4000);
    }
  }

  function handleResize() {
    var wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;

    if (wasMobile !== isMobile) {
      if (isMobile) {
        updateMobileView();
        startRotation();
      } else {
        if (rotationInterval) {
          clearInterval(rotationInterval);
          rotationInterval = null;
        }
        testCards.forEach(function(c) { c.style.display = ''; });
        if (dots) dots.forEach(function(d) { d.classList.remove('active'); });
      }
    }
  }

  /* ─── Initial setup ─── */
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 200);
  });

  if (window.innerWidth <= 768) {
    updateMobileView();
    startRotation();
  }
})();
