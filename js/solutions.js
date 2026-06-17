(function () {
  'use strict';

  var solutionsData = {
    website: {
      title: 'Website Development',
      desc: 'Professional websites built to generate leads and grow your business. Custom designs tailored to your industry with a focus on conversion and user experience.',
      image: '/assets/images/services/website%20development/website-1.png',
      benefits: ['Custom Design', 'SEO Optimized', 'Mobile Responsive', 'Fast Loading'],
      price: 'Starting from $1,499',
      link: '/pages/services/website-development.html'
    },
    seo: {
      title: 'SEO Optimization',
      desc: 'Data-driven SEO strategies that improve rankings and drive organic traffic. Full technical audits, keyword research, and content optimization for long-term growth.',
      image: '/assets/images/services/seo-1.jpg',
      benefits: ['Technical Site Audit', 'Keyword Research Strategy', 'Local SEO Setup', 'Content Optimization'],
      price: 'Starting from $799/mo',
      link: '/pages/seo.html'
    },
    'ai-automation': {
      title: 'AI Automation',
      desc: 'Smart automation solutions that save time and streamline your workflows. AI-powered tools for lead generation, customer support, and business operations.',
      image: '/assets/images/services/ai-automation-1.jpg',
      benefits: ['AI Chatbot Setup', 'Workflow Automation', 'CRM Integration', 'Smart Analytics'],
      price: 'Starting from $999',
      link: '/pages/ai-automation.html'
    },
    marketing: {
      title: 'Digital Marketing',
      desc: 'Targeted campaigns that amplify your reach and maximize your ROI. Multi-channel strategies including paid ads, social media, and conversion optimization.',
      image: '/assets/images/services/social-media-1.jpg',
      benefits: ['Paid Ad Campaigns', 'Social Media Management', 'Conversion Tracking', 'Content Strategy'],
      price: 'Starting from $1,299/mo',
      link: '/pages/social-media.html'
    },
    ecommerce: {
      title: 'E-Commerce Stores',
      desc: 'High-converting online stores designed to showcase and sell your products. Full WooCommerce stores with payment gateways, ready from day one.',
      image: '/assets/images/services/ecommerce%20stores/ecommerce-stores-1.png',
      benefits: ['WooCommerce Setup', 'Payment Gateway Integration', 'Mobile Optimized', 'Inventory Management'],
      price: 'Starting from $2,499',
      link: '/pages/services/ecommerce-stores.html'
    },
    branding: {
      title: 'Branding & Design',
      desc: 'Strategic brand identities and visual designs that make you stand out. From logos to full brand systems with comprehensive style guidelines.',
      image: '/assets/images/services/branding-1.jpg',
      benefits: ['Logo & Identity Design', 'Brand Strategy', 'Brand Guidelines', 'Visual System'],
      price: 'Starting from $899',
      link: '/pages/branding.html'
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
