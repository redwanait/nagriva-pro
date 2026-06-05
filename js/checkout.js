(function () {
  'use strict';

  var serviceData = null;
  var selectedPackage = null;
  var pkgIndex = 0;
  var currentUser = null;
  var WHATSAPP_NUMBER = '21261818403';
  var PAYPAL_CLIENT_ID = 'sb';
  var paypalLoaded = false;

  var els = {};

  var appliedCoupon = null;
  var selectedAddons = {};

  var ADDONS = [
    { id: 'seo', name: 'SEO Audit', price: 399 },
    { id: 'blog', name: 'Blog Setup', price: 299 },
    { id: 'priority', name: 'Priority Delivery', price: 499 },
    { id: 'support', name: 'Premium Support', price: 199 }
  ];

  var COUPONS = {
    NAGRIVA10: {
      code: 'NAGRIVA10',
      discountType: 'percentage',
      discountValue: 10,
      active: true
    }
  };

  var TESTIMONIALS = [
    {
      name: 'Youssef Benali',
      position: 'Founder, MedTech Solutions',
      text: 'Nagriva delivered beyond our expectations. The website is stunning, fast, and our client inquiries have tripled since launch. The checkout process was just as smooth.',
      rating: 5,
      avatarClass: ''
    },
    {
      name: 'Sarah El Fassi',
      position: 'CEO, Casa Digital Agency',
      text: 'Working with Nagriva was the best decision we made this year. The attention to detail and the quality of their work is outstanding. Truly a premium experience.',
      rating: 5,
      avatarClass: 'chk-testimonial-avatar--2'
    },
    {
      name: 'Karim Ouazzani',
      position: 'Owner, AutoWeb Maroc',
      text: 'From consultation to delivery, everything was seamless. Our car rental booking system went from concept to launch in just 2 weeks. Highly recommended.',
      rating: 5,
      avatarClass: 'chk-testimonial-avatar--3'
    }
  ];

  function cacheRefs() {
    els.summaryService = document.getElementById('summaryService');
    els.summaryPackage = document.getElementById('summaryPackage');
    els.summaryDelivery = document.getElementById('summaryDelivery');
    els.summarySupport = document.getElementById('summarySupport');
    els.summaryRevisions = document.getElementById('summaryRevisions');
    els.summaryTotal = document.getElementById('summaryTotal');
    els.previewBanner = document.getElementById('previewBanner');
    els.previewCategory = document.getElementById('previewCategory');
    els.previewTitle = document.getElementById('previewTitle');
    els.previewPackage = document.getElementById('previewPackage');
    els.previewDesc = document.getElementById('previewDesc');
    els.whatsappSection = document.getElementById('whatsappSection');
    els.whatsappBtn = document.getElementById('whatsappBtn');
    els.paypalSection = document.getElementById('paypalSection');
    els.paypalContainer = document.getElementById('paypal-button-container');
    els.paypalLoading = document.getElementById('paypalLoading');
    els.payoneerSection = document.getElementById('payoneerSection');
    els.payoneerBtn = document.getElementById('payoneerBtn');
    els.placeOrderBtn = document.getElementById('placeOrderBtn');
    els.placeOrderBtnMobile = document.getElementById('placeOrderBtnMobile');
    els.message = document.getElementById('chkMessage');
    els.paymentInputs = document.querySelectorAll('input[name="payment"]');
    els.testimonialsTrack = document.getElementById('testimonialsTrack');
    els.orderSummary = document.getElementById('orderSummary');
    els.couponInput = document.getElementById('couponInput');
    els.couponApplyBtn = document.getElementById('couponApplyBtn');
    els.couponFeedback = document.getElementById('couponFeedback');
    els.couponApplied = document.getElementById('couponApplied');
    els.summarySubtotalRow = document.getElementById('summarySubtotalRow');
    els.summarySubtotal = document.getElementById('summarySubtotal');
    els.summaryDiscountRow = document.getElementById('summaryDiscountRow');
    els.summaryDiscount = document.getElementById('summaryDiscount');
    els.summaryAddonsRow = document.getElementById('summaryAddonsRow');
    els.summaryAddons = document.getElementById('summaryAddons');
    els.addonsList = document.getElementById('addonsList');
    els.savingsSection = document.getElementById('savingsSection');
    els.savingsAmount = document.getElementById('savingsAmount');
    els.savingsReason = document.getElementById('savingsReason');
    els.savingsCode = document.getElementById('savingsCode');
  }

  function getParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      slug: params.get('service') || '',
      pkg: parseInt(params.get('pkg'), 10) || 1
    };
  }

  function getDisplayName(user) {
    if (!user) return 'Client';
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client';
  }

  function formatPrice(price) {
    var num = parseFloat(String(price).replace(/,/g, ''));
    if (isNaN(num)) return price;
    return num.toLocaleString('en-US');
  }

  function getOriginalPrice() {
    if (!selectedPackage) return 0;
    return parseFloat(String(selectedPackage.price).replace(/,/g, '')) || 0;
  }

  function getDiscountedPrice() {
    var original = getOriginalPrice();
    if (!appliedCoupon) return original;
    if (appliedCoupon.discountType === 'percentage') {
      return original - (original * appliedCoupon.discountValue / 100);
    }
    if (appliedCoupon.discountType === 'fixed') {
      return Math.max(0, original - appliedCoupon.discountValue);
    }
    return original;
  }

  function getDiscountAmount() {
    return getOriginalPrice() - getDiscountedPrice();
  }

  function getAddonsTotal() {
    var total = 0;
    for (var id in selectedAddons) {
      if (selectedAddons[id]) {
        for (var i = 0; i < ADDONS.length; i++) {
          if (ADDONS[i].id === id) {
            total += ADDONS[i].price;
            break;
          }
        }
      }
    }
    return total;
  }

  function getFinalPrice() {
    return getDiscountedPrice() + getAddonsTotal();
  }

  function showMessage(type, text) {
    if (!els.message) return;
    var icon = type === 'error'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    els.message.innerHTML = icon + text;
    els.message.className = 'chk-message ' + type + ' show';
  }

  function hideMessage() {
    if (els.message) els.message.className = 'chk-message';
  }

  function getInitials(name) {
    return name.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
  }

  function loadServiceData() {
    var params = getParams();
    if (!params.slug) {
      showMessage('error', 'No service selected. Please choose a service first.');
      renderFallbackLayout();
      return;
    }

    pkgIndex = params.pkg;

    if (typeof ServicesAPI === 'undefined') {
      showMessage('error', 'Service data is not available. Please try again.');
      return;
    }

    ServicesAPI.fetchService(params.slug).then(function (data) {
      if (!data) {
        showMessage('error', 'Service not found.');
        return;
      }

      serviceData = data;

      var packages = data.packages;
      if (!packages || !packages.length) {
        showMessage('error', 'No packages available for this service.');
        return;
      }

      if (pkgIndex >= packages.length) pkgIndex = 0;

      selectedPackage = packages[pkgIndex];
      renderAll();
      renderAddons();
      initPaymentMethods();
      renderTestimonials();
    }).catch(function () {
      showMessage('error', 'Failed to load service data. Please try again.');
    });
  }

  function renderFallbackLayout() {
    if (els.previewTitle) els.previewTitle.textContent = 'Service Unavailable';
    if (els.previewDesc) els.previewDesc.textContent = 'Please select a service from our pricing page.';
    if (els.summaryService) els.summaryService.textContent = '—';
    if (els.summaryPackage) els.summaryPackage.textContent = '—';
    if (els.summaryDelivery) els.summaryDelivery.textContent = '—';
    if (els.summaryTotal) els.summaryTotal.textContent = '—';
    renderTestimonials();
  }

  function renderAll() {
    if (!serviceData || !selectedPackage) return;

    var pkg = selectedPackage;
    var service = serviceData;
    var cleanTitle = service.title ? service.title.replace(/<[^>]*>/g, '') : service.slug;

    if (els.previewCategory) els.previewCategory.textContent = service.category || 'Service';
    if (els.previewTitle) els.previewTitle.textContent = cleanTitle;
    if (els.previewDesc) els.previewDesc.textContent = stripHtml(service.description) || 'Premium digital agency service.';

    if (els.previewPackage) {
      var isPopular = pkg.popular || pkg.featured;
      els.previewPackage.innerHTML =
        '<span class="chk-preview-pkg-badge">' + escapeHtml(pkg.name || 'Package') + '</span>' +
        (isPopular
          ? '<span class="chk-popular-badge">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
              'Most Popular' +
            '</span>'
          : '');
    }

    if (els.previewBanner && service.image) {
      els.previewBanner.style.background = 'linear-gradient(135deg, #0a1628, #0d1f3c)';
      var img = new Image();
      img.onload = function () {
        els.previewBanner.innerHTML = '<img src="' + escapeHtml(service.image) + '" alt="' + escapeHtml(cleanTitle) + '" />' + els.previewBanner.querySelector('.chk-preview-banner-overlay').outerHTML + els.previewBanner.querySelector('.chk-preview-category').outerHTML;
      };
      img.src = service.image;
    }

    if (els.summaryService) els.summaryService.textContent = cleanTitle;
    if (els.summaryPackage) els.summaryPackage.textContent = pkg.name || 'Package';
    if (els.summaryDelivery) els.summaryDelivery.textContent = pkg.delivery || '—';

    var supportText = extractSupport(pkg);
    if (els.summarySupport) els.summarySupport.textContent = supportText;

    if (els.summaryRevisions) {
      els.summaryRevisions.textContent = pkg.revisions || '—';
    }

    var originalPrice = getOriginalPrice();
    var discountedPrice = getDiscountedPrice();
    var discountAmount = getDiscountAmount();
    var addonsTotal = getAddonsTotal();
    var finalPrice = getFinalPrice();

    if (els.summarySubtotal) {
      els.summarySubtotal.textContent = formatPrice(originalPrice) + ' MAD';
    }

    if (els.summaryDiscountRow) {
      els.summaryDiscountRow.style.display = appliedCoupon ? 'flex' : 'none';
    }
    if (els.summaryDiscount) {
      els.summaryDiscount.textContent = '-' + formatPrice(discountAmount) + ' MAD';
    }

    if (els.summaryAddonsRow) {
      els.summaryAddonsRow.style.display = addonsTotal > 0 ? 'flex' : 'none';
    }
    if (els.summaryAddons) {
      els.summaryAddons.textContent = '+' + formatPrice(addonsTotal) + ' MAD';
    }

    if (els.summaryTotal) {
      els.summaryTotal.textContent = formatPrice(finalPrice) + ' MAD';
    }

    updateSavingsSection();
  }

  function updateSavingsSection() {
    if (!els.savingsSection) return;

    if (appliedCoupon) {
      var discountAmount = getDiscountAmount();
      els.savingsSection.style.display = 'flex';
      els.savingsAmount.textContent = 'You Save ' + formatPrice(discountAmount) + ' MAD';
      if (els.savingsCode) els.savingsCode.textContent = appliedCoupon.code;
    } else {
      els.savingsSection.style.display = 'none';
    }
  }

  function renderAddons() {
    if (!els.addonsList) return;

    els.addonsList.innerHTML = '';
    for (var i = 0; i < ADDONS.length; i++) {
      var addon = ADDONS[i];
      var isSelected = !!selectedAddons[addon.id];
      var item = document.createElement('div');
      item.className = 'chk-addon-item' + (isSelected ? ' active' : '');
      item.dataset.addonId = addon.id;
      item.innerHTML =
        '<div class="chk-addon-check">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</div>' +
        '<div class="chk-addon-info">' +
          '<div class="chk-addon-name">' + escapeHtml(addon.name) + '</div>' +
        '</div>' +
        '<div class="chk-addon-price">+' + formatPrice(addon.price) + ' MAD</div>';
      item.addEventListener('click', function (id) {
        return function () { toggleAddon(id); };
      }(addon.id));
      els.addonsList.appendChild(item);
    }
  }

  function toggleAddon(id) {
    if (selectedAddons[id]) {
      delete selectedAddons[id];
    } else {
      selectedAddons[id] = true;
    }
    renderAddons();
    renderAll();
    updatePaymentPrices();
  }

  function updateCouponUI() {
    if (!els.couponApplied) return;

    if (appliedCoupon) {
      var discountLabel = appliedCoupon.discountType === 'percentage'
        ? appliedCoupon.discountValue + '%'
        : '-' + formatPrice(appliedCoupon.discountValue) + ' MAD';

      els.couponApplied.style.display = 'block';
      els.couponApplied.innerHTML =
        '<div class="chk-coupon-applied-header">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' +
          'Coupon Applied' +
        '</div>' +
        '<div class="chk-coupon-applied-details">' +
          '<span>Code: <strong>' + appliedCoupon.code + '</strong></span>' +
          '<span>Discount: <strong>' + discountLabel + '</strong></span>' +
        '</div>' +
        '<button class="chk-coupon-applied-remove" id="couponRemoveBtn">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          'Remove' +
        '</button>';

      document.getElementById('couponRemoveBtn').addEventListener('click', removeCoupon);
    } else {
      els.couponApplied.style.display = 'none';
    }
  }

  function showCouponFeedback(type, text) {
    if (!els.couponFeedback) return;
    var icon = type === 'success'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    els.couponFeedback.innerHTML = icon + text;
    els.couponFeedback.className = 'chk-coupon-feedback ' + type + ' show';
  }

  function hideCouponFeedback() {
    if (els.couponFeedback) els.couponFeedback.className = 'chk-coupon-feedback';
  }

  function applyCoupon() {
    if (!els.couponInput) return;

    var code = els.couponInput.value.trim().toUpperCase();
    if (!code) {
      showCouponFeedback('error', 'Please enter a coupon code.');
      return;
    }

    var coupon = COUPONS[code];
    if (!coupon || !coupon.active) {
      showCouponFeedback('error', 'Invalid coupon code.');
      els.couponInput.focus();
      return;
    }

    appliedCoupon = coupon;
    els.couponInput.value = '';
    hideCouponFeedback();
    updateCouponUI();
    renderAll();
    updatePaymentPrices();
    showCouponFeedback('success', 'Coupon applied successfully.');
  }

  function removeCoupon() {
    appliedCoupon = null;
    hideCouponFeedback();
    updateCouponUI();
    renderAll();
    updatePaymentPrices();
    if (els.couponInput) els.couponInput.focus();
  }

  function updatePaymentPrices() {
    updateWhatsAppLink();
    if (typeof paypal !== 'undefined' && els.paypalSection && els.paypalSection.style.display === 'block') {
      renderPayPalButton();
    }
  }

  function stripHtml(html) {
    if (!html) return '';
    var div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function extractSupport(pkg) {
    if (!pkg) return '30 Days Support';
    if (pkg.features && pkg.features.length) {
      for (var i = 0; i < pkg.features.length; i++) {
        var f = pkg.features[i];
        if (f.toLowerCase().indexOf('support') !== -1) {
          var match = f.match(/(\d+[-–]\w+|\d+\s*\w+)\s+Support/i);
          if (match) return match[1] + ' Support';
          return f;
        }
      }
    }
    var name = (pkg.name || '').toLowerCase();
    if (name.indexOf('scale') !== -1 || name.indexOf('premium') !== -1) return '90 Days Support';
    if (name.indexOf('growth') !== -1) return '30 Days Support';
    return '30 Days Support';
  }

  function renderTestimonials() {
    if (!els.testimonialsTrack) return;
    els.testimonialsTrack.innerHTML = '';
    for (var i = 0; i < TESTIMONIALS.length; i++) {
      var t = TESTIMONIALS[i];
      var stars = '';
      for (var s = 0; s < 5; s++) {
        stars += '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
      }
      var card = document.createElement('div');
      card.className = 'chk-testimonial-card';
      card.innerHTML =
        '<div class="chk-testimonial-stars">' + stars + '</div>' +
        '<p class="chk-testimonial-text">"' + escapeHtml(t.text) + '"</p>' +
        '<div class="chk-testimonial-author">' +
          '<div class="chk-testimonial-avatar ' + t.avatarClass + '">' + getInitials(t.name) + '</div>' +
          '<div class="chk-testimonial-info">' +
            '<div class="chk-testimonial-name">' + escapeHtml(t.name) + '</div>' +
            '<div class="chk-testimonial-position">' + escapeHtml(t.position) + '</div>' +
          '</div>' +
        '</div>';
      els.testimonialsTrack.appendChild(card);

      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      requestAnimationFrame(function () {
        card.style.transition = 'opacity 0.6s ease ' + (i * 0.15) + 's, transform 0.6s ease ' + (i * 0.15) + 's';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
    }
  }

  function initPaymentMethods() {
    els.paymentInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        handlePaymentChange(this.value);
      });
    });
  }

  function handlePaymentChange(value) {
    hideMessage();

    if (els.whatsappSection) els.whatsappSection.style.display = 'none';
    if (els.paypalSection) els.paypalSection.style.display = 'none';
    if (els.payoneerSection) els.payoneerSection.style.display = 'none';

    if (value === 'paypal') {
      if (els.paypalSection) els.paypalSection.style.display = 'block';
      toggleOrderButtons(false);
      loadPayPalSDK();
    } else if (value === 'payoneer') {
      if (els.payoneerSection) els.payoneerSection.style.display = 'block';
      toggleOrderButtons(false);
    } else if (value === 'whatsapp') {
      if (els.whatsappSection) els.whatsappSection.style.display = 'block';
      toggleOrderButtons(false);
      updateWhatsAppLink();
    } else {
      toggleOrderButtons(true);
    }
  }

  function toggleOrderButtons(show) {
    var btns = [els.placeOrderBtn, els.placeOrderBtnMobile];
    for (var i = 0; i < btns.length; i++) {
      if (!btns[i]) continue;
      btns[i].style.display = show ? '' : 'none';
    }
  }

  function updateWhatsAppLink() {
    if (!els.whatsappBtn || !serviceData || !selectedPackage) return;

    var serviceName = serviceData.title ? serviceData.title.replace(/<[^>]*>/g, '') : serviceData.slug;
    var packageName = selectedPackage.name || 'Package';
    var price = formatPrice(getFinalPrice());
    var userName = 'Client';
    var userEmail = '';

    if (currentUser) {
      userName = getDisplayName(currentUser);
      userEmail = currentUser.email || '';
    }

    var message =
      'Hello Nagriva,\n\n' +
      'I would like to order:\n\n' +
      'Service: ' + serviceName + '\n' +
      'Package: ' + packageName + '\n' +
      'Price: ' + price + ' MAD\n\n' +
      'My Account:\n' +
      userName + '\n' +
      userEmail;

    var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
    els.whatsappBtn.href = url;
  }

  function loadPayPalSDK() {
    if (paypalLoaded) {
      renderPayPalButton();
      return;
    }
    if (typeof paypal !== 'undefined') {
      paypalLoaded = true;
      renderPayPalButton();
      return;
    }

    if (els.paypalLoading) els.paypalLoading.style.display = 'flex';

    var script = document.createElement('script');
    script.src = 'https://www.paypal.com/sdk/js?client-id=' + PAYPAL_CLIENT_ID + '&currency=EUR&intent=capture';
    script.async = true;
    script.onload = function () {
      paypalLoaded = true;
      if (els.paypalLoading) els.paypalLoading.style.display = 'none';
      renderPayPalButton();
    };
    script.onerror = function () {
      if (els.paypalLoading) els.paypalLoading.style.display = 'none';
      showMessage('error', 'Failed to load PayPal. Please try again or choose another payment method.');
    };
    document.body.appendChild(script);
  }

  function renderPayPalButton() {
    if (!els.paypalContainer || typeof paypal === 'undefined') return;
    els.paypalContainer.innerHTML = '';

    var priceNum = getFinalPrice();

    paypal.Buttons({
      createOrder: function (data, actions) {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: priceNum.toFixed(2)
            },
            description: (serviceData ? serviceData.title.replace(/<[^>]*>/g, '') : 'Service') + ' - ' + (selectedPackage ? selectedPackage.name : 'Package')
          }]
        });
      },
      onApprove: function (data, actions) {
        showMessage('success', 'Payment successful! Creating your order...');
        return actions.order.capture().then(function (details) {
          handlePayPalSuccess(details);
        });
      },
      onError: function (err) {
        console.error('[Checkout] PayPal error:', err);
        showMessage('error', 'PayPal payment failed. Please try again.');
      },
      onCancel: function () {
        showMessage('error', 'PayPal payment was cancelled.');
      }
    }).render(els.paypalContainer);
  }

  function handlePayPalSuccess(details) {
    if (!currentUser) {
      showMessage('error', 'You must be logged in to place an order.');
      return;
    }
    createOrderInDB('paypal', 'paid', 'pending', function (order) {
      if (order) {
        saveOrderToLocalStorage(order, 'paid');
        window.location.href = 'order-success.html?order_id=' + (order.id || '') + '&service=' + encodeURIComponent(order.service || '') + '&package=' + encodeURIComponent(order.package_name || '') + '&price=' + encodeURIComponent(order.budget || '') + '&method=paypal';
      }
    });
  }

  function handleWhatsAppOrder() {
    if (!currentUser) {
      showMessage('error', 'You must be logged in to place an order.');
      return;
    }
    updateWhatsAppLink();
    createOrderInDB('whatsapp', 'pending', 'pending', function (order) {
      if (order) {
        saveOrderToLocalStorage(order, 'pending');
      }
    });
    if (els.whatsappBtn) els.whatsappBtn.click();
  }

  function handlePayoneerInvoice() {
    if (!currentUser) {
      showMessage('error', 'You must be logged in to place an order.');
      return;
    }
    setLoadingPayoneer(true);
    createOrderInDB('payoneer', 'pending', 'pending', function (order) {
      setLoadingPayoneer(false);
      if (order) {
        saveOrderToLocalStorage(order, 'pending');
        showMessage('success', 'Invoice request sent! Your order #' + order.id.slice(0, 8) + ' has been created. We will send the invoice to your email.');
      }
    });
  }

  function createOrderInDB(paymentMethod, paymentStatus, orderStatus, callback) {
    if (!currentUser) {
      showMessage('error', 'You must be logged in to place an order.');
      return;
    }

    var serviceName = serviceData.title ? serviceData.title.replace(/<[^>]*>/g, '') : serviceData.slug;
    var packageName = selectedPackage.name || 'Package';
    var priceNum = getFinalPrice();

    var payload = {
      user_id: currentUser.id,
      client_name: getDisplayName(currentUser),
      user_email: currentUser.email || '',
      service: serviceName,
      service_slug: serviceData.slug,
      package_name: packageName,
      package_index: pkgIndex,
      budget: priceNum,
      currency: 'MAD',
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      status: orderStatus,
      project_title: serviceName + ' - ' + packageName
    };

    if (typeof NAGRIVA_OrdersAPI !== 'undefined') {
      NAGRIVA_OrdersAPI.createOrder(payload).then(function (order) {
        if (callback) callback(order);
      }).catch(function (err) {
        console.error('[Checkout] createOrder error:', err);
        showMessage('error', 'Failed to place order. Please try again or contact support.');
        if (callback) callback(null);
      });
    } else {
      var mockOrder = {
        id: 'ord_' + Date.now(),
        ...payload,
        created_at: new Date().toISOString()
      };
      setTimeout(function () {
        if (callback) callback(mockOrder);
      }, 500);
    }
  }

  function saveOrderToLocalStorage(order, paymentStatus) {
    try {
      var orders = JSON.parse(localStorage.getItem('nagriva_orders') || '[]');
      orders.push({
        id: order.id,
        service: order.service,
        package_name: order.package_name,
        budget: order.budget,
        currency: order.currency || 'MAD',
        payment_method: order.payment_method,
        payment_status: paymentStatus,
        status: order.status || 'pending',
        client_name: order.client_name,
        user_email: order.user_email,
        created_at: order.created_at || new Date().toISOString()
      });
      localStorage.setItem('nagriva_orders', JSON.stringify(orders));
    } catch (e) {
      console.warn('[Checkout] localStorage save failed:', e);
    }
  }

  function setLoadingPayoneer(loading) {
    if (!els.payoneerBtn) return;
    if (loading) {
      els.payoneerBtn.classList.add('loading');
      els.payoneerBtn.disabled = true;
    } else {
      els.payoneerBtn.classList.remove('loading');
      els.payoneerBtn.disabled = false;
    }
  }

  async function getCurrentUser() {
    try {
      if (typeof NagrivaAuth !== 'undefined' && NagrivaAuth.getUser) {
        var user = NagrivaAuth.getUser();
        if (user) {
          currentUser = user;
          return;
        }
      }

      if (window.supabaseClient) {
        var result = await window.supabaseClient.auth.getSession();
        if (result.data.session) {
          currentUser = result.data.session.user;
        }
      }
    } catch (e) {
      console.warn('[Checkout] getUser error:', e);
    }
  }

  function initEventListeners() {
    if (els.couponApplyBtn) {
      els.couponApplyBtn.addEventListener('click', applyCoupon);
    }
    if (els.couponInput) {
      els.couponInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyCoupon();
        }
      });
    }

    if (els.whatsappBtn) {
      els.whatsappBtn.addEventListener('click', function (e) {
        e.preventDefault();
        handleWhatsAppOrder();
      });
    }
    if (els.payoneerBtn) {
      els.payoneerBtn.addEventListener('click', handlePayoneerInvoice);
    }
    var btns = [els.placeOrderBtn, els.placeOrderBtnMobile];
    for (var i = 0; i < btns.length; i++) {
      if (btns[i]) {
        btns[i].addEventListener('click', function () {
          handleLegacyPlaceOrder();
        });
      }
    }
  }

  function handleLegacyPlaceOrder() {
    var selectedPayment = document.querySelector('input[name="payment"]:checked');
    if (!selectedPayment) {
      showMessage('error', 'Please select a payment method.');
      return;
    }
    showMessage('error', 'Please use the button provided for your selected payment method.');
  }

  document.addEventListener('DOMContentLoaded', function () {
    cacheRefs();

    getCurrentUser().then(function () {
      loadServiceData();
    });

    initEventListeners();
  });

})();
