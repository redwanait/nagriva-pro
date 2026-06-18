(function () {
  'use strict';

  var solutionsData = {
    website: {
      title: 'Website Development',
      desc: 'Professional websites built to generate leads and grow your business. Custom designs tailored to your industry with a focus on conversion and user experience.',
      image: '/assets/images/services/website%20development/website-1.png',
      benefits: ['Custom Design', 'Mobile Responsive', 'Fast Loading', 'Lead Generation'],
      price: 'Starting from $1,499',
      link: '/pages/services/website-development.html'
    },
    'video-editing': {
      title: 'Video Editing',
      desc: 'Professional video editing services for social media, YouTube, and marketing campaigns. From short-form content to motion graphics, we bring your vision to life.',
      image: '/assets/images/services/video%20editing/video-editing-1.png',
      benefits: ['Social Media Videos', 'YouTube Editing', 'Motion Graphics', 'Short Form Content'],
      price: 'Starting from $999',
      link: '/pages/services/video-editing.html'
    },
    'blog-creation': {
      title: 'Blog Creation',
      desc: 'Modern blog websites designed for content creators and businesses. SEO-optimized structure with a focus on speed, readability, and easy content management.',
      image: '/assets/images/services/blog%20creation/blog-creation-1.png',
      benefits: ['SEO-Friendly Structure', 'Professional Design', 'Fast Performance', 'Easy Content Management'],
      price: 'Starting from $599',
      link: '/pages/services/blog-creation.html'
    },
    ecommerce: {
      title: 'E-Commerce Stores',
      desc: 'High-converting online stores designed to showcase and sell your products. Full WooCommerce stores with payment gateways, ready from day one.',
      image: '/assets/images/services/ecommerce%20stores/ecommerce-stores-1.png',
      benefits: ['Product Management', 'Online Payments', 'Mobile Shopping', 'Sales Optimization'],
      price: 'Starting from $2,499',
      link: '/pages/services/ecommerce-stores.html'
    }
  };

  var panel = document.getElementById('solutionsPanel');
  var image = document.getElementById('solutionsImage');
  var titleEl = document.getElementById('solutionsTitle');
  var descEl = document.getElementById('solutionsDesc');
  var benefitsEl = document.getElementById('solutionsBenefits');
  var priceEl = document.getElementById('solutionsPrice');
  var ctaPrimary = document.getElementById('solutionsCtaPrimary');

  var isAnimating = false;

  function switchService(serviceKey) {
    if (isAnimating) return;
    var data = solutionsData[serviceKey];
    if (!data) return;

    isAnimating = true;

    var contentEl = panel.querySelector('.solutions-content');
    contentEl.classList.add('solutions-content--exiting');

    setTimeout(function () {
      image.src = data.image;
      image.alt = data.title;
      titleEl.textContent = data.title;
      descEl.textContent = data.desc;

      benefitsEl.innerHTML = '';
      for (var i = 0; i < data.benefits.length; i++) {
        var li = document.createElement('li');
        li.textContent = data.benefits[i];
        benefitsEl.appendChild(li);
      }

      priceEl.textContent = data.price;
      ctaPrimary.href = data.link;

      contentEl.classList.remove('solutions-content--exiting');
      contentEl.classList.add('solutions-content--entering');

      setTimeout(function () {
        contentEl.classList.remove('solutions-content--entering');
        isAnimating = false;
      }, 400);
    }, 250);

    var pills = document.querySelectorAll('.solutions-pill');
    for (var j = 0; j < pills.length; j++) {
      pills[j].classList.remove('active');
    }
    var activePill = document.querySelector('.solutions-pill[data-service="' + serviceKey + '"]');
    if (activePill) activePill.classList.add('active');
  }

  var pills = document.querySelectorAll('.solutions-pill');
  for (var k = 0; k < pills.length; k++) {
    pills[k].addEventListener('click', function () {
      var serviceKey = this.getAttribute('data-service');
      switchService(serviceKey);
    });
  }

  var firstActive = document.querySelector('.solutions-pill.active');
  if (firstActive) {
    switchService(firstActive.getAttribute('data-service'));
  }
})();
