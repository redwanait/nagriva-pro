/* ════════════════════════════════════════════════════════
   NAGRIVA — Admin Settings Engine
   Full settings management with autosave, uploads, toasts.
   ════════════════════════════════════════════════════════ */

'use strict';

const NAGRIVA_AdminSettings = (() => {
  let settingsData = {};
  let saveQueue = {};
  let saveTimer = null;
  let isSaving = false;

  const SAVE_DELAY = 1200;
  const TIMEZONES = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
    'Asia/Dubai', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Singapore',
    'Australia/Sydney', 'Pacific/Auckland', 'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg'
  ];
  const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'AED', 'SAR', 'MAD', 'EGP', 'NGN', 'ZAR'];
  const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
    { value: 'ar', label: 'العربية' },
    { value: 'es', label: 'Español' },
    { value: 'de', label: 'Deutsch' },
    { value: 'pt', label: 'Português' }
  ];
  const THEME_PRESETS = [
    { id: 'dark-emerald', name: 'Emerald', colors: ['#00f5c4', '#00c2a8'] },
    { id: 'dark-cyan', name: 'Cyan', colors: ['#06b6d4', '#0891b2'] },
    { id: 'dark-purple', name: 'Royal', colors: ['#a78bfa', '#7c3aed'] },
    { id: 'dark-gold', name: 'Gold', colors: ['#fbbf24', '#d97706'] },
    { id: 'dark-rose', name: 'Rose', colors: ['#fb7185', '#e11d48'] }
  ];

  /* ─── Toast helper ─── */
  function toast(type, title, msg) {
    if (window.NAGRIVA_Toast) {
      NAGRIVA_Toast[type](title, msg);
    } else {
      const c = document.getElementById('toastContainer');
      if (!c) return;
      const t = document.createElement('div');
      t.className = 'toast';
      const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
      t.innerHTML = '<div class="toast-icon ' + type + '"><i class="fas ' + (icons[type] || icons.info) + '"></i></div><div class="toast-content"><div class="toast-title">' + title + '</div><div class="toast-message">' + msg + '</div></div><button class="toast-close"><i class="fas fa-times"></i></button>';
      c.appendChild(t);
      requestAnimationFrame(() => t.classList.add('visible'));
      t.querySelector('.toast-close').addEventListener('click', () => {
        t.classList.remove('visible');
        setTimeout(() => t.remove(), 400);
      });
      setTimeout(() => {
        t.classList.remove('visible');
        setTimeout(() => t.remove(), 400);
      }, 4000);
    }
  }

  /* ─── Autosave indicator ─── */
  function setSaveIndicator(state) {
    const el = document.getElementById('autosaveIndicator');
    if (!el) return;
    el.className = 'autosave-indicator';
    if (state === 'saving') {
      el.classList.add('saving');
      el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    } else if (state === 'saved') {
      el.classList.add('saved');
      el.innerHTML = '<i class="fas fa-check"></i> All changes saved';
    } else {
      el.innerHTML = '<i class="fas fa-circle" style="font-size:6px;opacity:0.4;"></i> Autosave';
    }
  }

  /* ─── Load settings from API ─── */
  async function loadSettings() {
    try {
      await NAGRIVA_SettingsAPI.ensureBucket();
      settingsData = await NAGRIVA_SettingsAPI.getAllSettingsWithDefaults();
      populateAll();
      setSaveIndicator('saved');
      hideSkeleton();
    } catch (err) {
      console.error('[AdminSettings] Load error:', err);
      toast('error', 'Load Failed', 'Could not load settings: ' + err.message);
      hideSkeleton();
    }
  }

  /* ─── Skeleton ─── */
  function showSkeleton() {
    const container = document.getElementById('settingsContent');
    if (!container) return;
    const skel = document.createElement('div');
    skel.className = 'settings-skel';
    skel.id = 'settingsSkeleton';
    skel.innerHTML =
      '<div class="settings-skel-sidebar">' +
        '<div class="settings-skel-tab"></div>' +
        '<div class="settings-skel-tab"></div>' +
        '<div class="settings-skel-tab"></div>' +
        '<div class="settings-skel-tab"></div>' +
        '<div class="settings-skel-tab"></div>' +
        '<div class="settings-skel-tab"></div>' +
        '<div class="settings-skel-tab"></div>' +
        '<div class="settings-skel-tab"></div>' +
      '</div>' +
      '<div class="settings-skel-content">' +
        '<div class="settings-skel-card">' +
          '<div class="settings-skel-title"></div>' +
          '<div class="settings-skel-line"></div>' +
          '<div class="settings-skel-line"></div>' +
          '<div class="settings-skel-row">' +
            '<div class="settings-skel-field"></div>' +
            '<div class="settings-skel-field"></div>' +
          '</div>' +
          '<div class="settings-skel-row">' +
            '<div class="settings-skel-field"></div>' +
            '<div class="settings-skel-field"></div>' +
          '</div>' +
        '</div>' +
        '<div class="settings-skel-card">' +
          '<div class="settings-skel-title" style="width:50%"></div>' +
          '<div class="settings-skel-line"></div>' +
          '<div class="settings-skel-row">' +
            '<div class="settings-skel-field"></div>' +
            '<div class="settings-skel-field"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    container.appendChild(skel);
  }

  function hideSkeleton() {
    const skel = document.getElementById('settingsSkeleton');
    if (skel) skel.remove();
    const tabs = document.getElementById('settingsTabs');
    const sections = document.getElementById('settingsSections');
    if (tabs) tabs.style.display = 'flex';
    if (sections) sections.style.display = 'block';
  }

  /* ─── Populate all settings ─── */
  function populateAll() {
    populateGeneral();
    populateBranding();
    populateSupportChat();
    populateOrders();
    populatePayments();
    populateNotifications();
    populateSEO();
    populateAIAssistant();
    populateContent();
  }

  /* ─── Value helpers ─── */
  function val(section, key) {
    return settingsData[section] ? settingsData[section][key] : '';
  }

  function setVal(section, key, value) {
    if (!settingsData[section]) settingsData[section] = {};
    settingsData[section][key] = value;
    queueSave(section);
  }

  function el(id) {
    return document.getElementById(id);
  }

  function elVal(id) {
    const e = el(id);
    return e ? e.value : '';
  }

  function setEl(id, value) {
    const e = el(id);
    if (e) e.value = value;
  }

  function populateSelect(id, options, selectedValue) {
    const sel = el(id);
    if (!sel) return;
    sel.innerHTML = '';
    options.forEach(opt => {
      const o = document.createElement('option');
      if (typeof opt === 'object') {
        o.value = opt.value;
        o.textContent = opt.label;
      } else {
        o.value = opt;
        o.textContent = opt;
      }
      if (o.value === selectedValue) o.selected = true;
      sel.appendChild(o);
    });
  }

  function setChecked(id, checked) {
    const e = el(id);
    if (e) {
      if (checked) e.classList.add('active');
      else e.classList.remove('active');
    }
  }

  function isChecked(id) {
    const e = el(id);
    return e ? e.classList.contains('active') : false;
  }

  function setPreview(id, url) {
    const container = el(id);
    if (!container) return;
    if (url) {
      container.innerHTML = '<img src="' + url + '" alt="preview" loading="lazy" />';
    } else {
      container.innerHTML = '<i class="fas fa-image placeholder-icon"></i>';
    }
  }

  function setUploadName(id, name) {
    const el = document.getElementById(id);
    if (el) el.textContent = name || 'No file selected';
  }

  /* ─── Bind input changes to autosave ─── */
  function bindAutoSave(section, fieldKey, inputId, transform) {
    const input = el(inputId);
    if (!input) return;
    input.addEventListener('input', () => {
      let value = input.value;
      if (transform) value = transform(value);
      setVal(section, fieldKey, value);
    });
    input.addEventListener('change', () => {
      let value = input.value;
      if (transform) value = transform(value);
      setVal(section, fieldKey, value);
    });
  }

  function bindToggle(section, fieldKey, toggleId) {
    const toggle = el(toggleId);
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      setVal(section, fieldKey, toggle.classList.contains('active'));
    });
  }

  function bindRange(section, fieldKey, rangeId, valueId) {
    const range = el(rangeId);
    const display = el(valueId);
    if (!range) return;
    range.addEventListener('input', () => {
      const v = range.value;
      if (display) display.textContent = v;
      setVal(section, fieldKey, parseInt(v, 10));
    });
  }

  function bindColor(section, fieldKey, colorId, displayId) {
    const picker = el(colorId);
    const display = el(displayId);
    if (!picker) return;
    picker.addEventListener('input', () => {
      const v = picker.value;
      if (display) display.textContent = v;
      setVal(section, fieldKey, v);
      if (fieldKey === 'primary_color') applyBrandingPreview();
    });
    picker.addEventListener('change', () => {
      const v = picker.value;
      if (display) display.textContent = v;
      setVal(section, fieldKey, v);
      if (fieldKey === 'primary_color') applyBrandingPreview();
    });
  }

  /* ─── File upload handler ─── */
  function bindUpload(section, fieldKey, inputId, previewId, nameId, folder) {
    const input = el(inputId);
    if (!input) return;
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const btn = input.closest('.sfg-upload')?.querySelector('.sfg-upload-btn');
      if (btn) btn.classList.add('loading');
      try {
        const url = await NAGRIVA_SettingsAPI.uploadFile(file, folder);
        setPreview(previewId, url);
        setUploadName(nameId, file.name);
        setVal(section, fieldKey, url);
        toast('success', 'Upload Complete', file.name + ' uploaded successfully.');
      } catch (err) {
        toast('error', 'Upload Failed', err.message || 'Could not upload file.');
      }
      if (btn) btn.classList.remove('loading');
      input.value = '';
    });
    const btn = input.closest('.sfg-upload')?.querySelector('.sfg-upload-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        input.click();
      });
    }
  }

  /* ─── Queue autosave ─── */
  function queueSave(section) {
    if (!saveQueue[section]) saveQueue[section] = true;
    setSaveIndicator('saving');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, SAVE_DELAY);
  }

  async function flushSave() {
    if (isSaving) return;
    isSaving = true;
    saveTimer = null;
    const keys = Object.keys(saveQueue);
    saveQueue = {};
    try {
      for (const key of keys) {
        await NAGRIVA_SettingsAPI.saveSetting(key, settingsData[key]);
      }
      setSaveIndicator('saved');
    } catch (err) {
      console.error('[AdminSettings] Save error:', err);
      toast('error', 'Save Failed', err.message || 'Could not save settings.');
      setSaveIndicator('saved');
    }
    isSaving = false;
  }

  /* ─── Branding preview ─── */
  function applyBrandingPreview() {
    const primary = val('branding', 'primary_color') || '#00f5c4';
    const secondary = val('branding', 'secondary_color') || '#00c2a8';
    document.documentElement.style.setProperty('--accent-preview', primary);
    document.documentElement.style.setProperty('--accent2-preview', secondary);
  }

  /* ─── Populate General ─── */
  function populateGeneral() {
    populateSelect('set_timezone', TIMEZONES, val('general', 'timezone'));
    populateSelect('set_language', LANGUAGES, val('general', 'language'));
    setEl('set_company_name', val('general', 'company_name'));
    setEl('set_support_email', val('general', 'support_email'));
    setEl('set_whatsapp', val('general', 'whatsapp_number'));
    setPreview('set_logo_preview', val('general', 'logo_url'));
    setPreview('set_favicon_preview', val('general', 'favicon_url'));
    setUploadName('set_logo_name', val('general', 'logo_url') ? 'Logo uploaded' : '');
    setUploadName('set_favicon_name', val('general', 'favicon_url') ? 'Favicon uploaded' : '');

    bindAutoSave('general', 'company_name', 'set_company_name');
    bindAutoSave('general', 'support_email', 'set_support_email');
    bindAutoSave('general', 'whatsapp_number', 'set_whatsapp');
    bindAutoSave('general', 'timezone', 'set_timezone');
    bindAutoSave('general', 'language', 'set_language');
    bindUpload('general', 'logo_url', 'set_logo_input', 'set_logo_preview', 'set_logo_name', 'logos');
    bindUpload('general', 'favicon_url', 'set_favicon_input', 'set_favicon_preview', 'set_favicon_name', 'favicons');
  }

  /* ─── Populate Branding ─── */
  function populateBranding() {
    const primary = val('branding', 'primary_color') || '#00f5c4';
    const secondary = val('branding', 'secondary_color') || '#00c2a8';
    el('set_primary_color').value = primary;
    el('set_secondary_color').value = secondary;
    el('set_primary_display').textContent = primary;
    el('set_secondary_display').textContent = secondary;
    el('set_glow_intensity').value = val('branding', 'glow_intensity') || 100;
    el('set_glow_value').textContent = val('branding', 'glow_intensity') || 100;
    el('set_border_radius').value = val('branding', 'border_radius') || 22;
    el('set_radius_value').textContent = val('branding', 'border_radius') || 22;
    buildThemePresets();

    bindColor('branding', 'primary_color', 'set_primary_color', 'set_primary_display');
    bindColor('branding', 'secondary_color', 'set_secondary_color', 'set_secondary_display');
    bindRange('branding', 'glow_intensity', 'set_glow_intensity', 'set_glow_value');
    bindRange('branding', 'border_radius', 'set_border_radius', 'set_radius_value');

    el('set_primary_color').addEventListener('input', () => applyBrandingPreview());
    el('set_secondary_color').addEventListener('input', () => applyBrandingPreview());
    applyBrandingPreview();

    document.querySelectorAll('.theme-preset').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.theme;
        const preset = THEME_PRESETS.find(p => p.id === id);
        if (!preset) return;
        selectThemePreset(id);
        el('set_primary_color').value = preset.colors[0];
        el('set_secondary_color').value = preset.colors[1];
        el('set_primary_display').textContent = preset.colors[0];
        el('set_secondary_display').textContent = preset.colors[1];
        setVal('branding', 'primary_color', preset.colors[0]);
        setVal('branding', 'secondary_color', preset.colors[1]);
        setVal('branding', 'theme_preset', id);
        applyBrandingPreview();
      });
    });
  }

  function buildThemePresets() {
    const container = document.querySelector('.theme-presets');
    if (!container) return;
    container.innerHTML = '';
    const activePreset = val('branding', 'theme_preset') || 'dark-emerald';
    THEME_PRESETS.forEach(p => {
      const div = document.createElement('div');
      div.className = 'theme-preset' + (p.id === activePreset ? ' active' : '');
      div.dataset.theme = p.id;
      div.innerHTML =
        '<div class="theme-preset-swatches">' +
          '<span class="theme-preset-swatch" style="background:' + p.colors[0] + '"></span>' +
          '<span class="theme-preset-swatch" style="background:' + p.colors[1] + '"></span>' +
        '</div>' +
        '<div class="theme-preset-name">' + p.name + '</div>';
      container.appendChild(div);
    });
  }

  function selectThemePreset(id) {
    document.querySelectorAll('.theme-preset').forEach(el => {
      el.classList.toggle('active', el.dataset.theme === id);
    });
  }

  /* ─── Populate Support Chat ─── */
  function populateSupportChat() {
    setChecked('set_chat_enabled', val('support_chat', 'chat_enabled') !== false);
    setChecked('set_chat_online', val('support_chat', 'chat_online') !== false);
    setChecked('set_chat_typing', val('support_chat', 'chat_typing_indicator') !== false);
    setEl('set_chat_welcome', val('support_chat', 'chat_welcome_message'));
    setEl('set_chat_auto_reply', val('support_chat', 'chat_auto_reply'));
    setPreview('set_chat_avatar_preview', val('support_chat', 'chat_avatar_url'));
    setUploadName('set_chat_avatar_name', val('support_chat', 'chat_avatar_url') ? 'Avatar uploaded' : '');

    bindToggle('support_chat', 'chat_enabled', 'set_chat_enabled');
    bindToggle('support_chat', 'chat_online', 'set_chat_online');
    bindToggle('support_chat', 'chat_typing_indicator', 'set_chat_typing');
    bindAutoSave('support_chat', 'chat_welcome_message', 'set_chat_welcome');
    bindAutoSave('support_chat', 'chat_auto_reply', 'set_chat_auto_reply');
    bindUpload('support_chat', 'chat_avatar_url', 'set_chat_avatar_input', 'set_chat_avatar_preview', 'set_chat_avatar_name', 'chat-avatars');
  }

  /* ─── Populate Orders ─── */
  function populateOrders() {
    setEl('set_default_status', val('orders', 'default_order_status'));
    setChecked('set_auto_order_ids', val('orders', 'auto_generate_order_ids') !== false);
    setEl('set_revisions_limit', val('orders', 'revisions_limit') || 3);
    setEl('set_deadline_days', val('orders', 'deadline_default_days') || 14);

    bindAutoSave('orders', 'default_order_status', 'set_default_status');
    bindToggle('orders', 'auto_generate_order_ids', 'set_auto_order_ids');
    bindAutoSave('orders', 'revisions_limit', 'set_revisions_limit', v => parseInt(v, 10) || 0);
    bindAutoSave('orders', 'deadline_default_days', 'set_deadline_days', v => parseInt(v, 10) || 1);
  }

  /* ─── Populate Payments ─── */
  function populatePayments() {
    populateSelect('set_currency', CURRENCIES, val('payments', 'currency'));
    setEl('set_stripe_public', val('payments', 'stripe_public_key'));
    setEl('set_stripe_secret', val('payments', 'stripe_secret_key'));
    setEl('set_paypal_client', val('payments', 'paypal_client_id'));
    setEl('set_paypal_secret', val('payments', 'paypal_secret'));
    setEl('set_invoice_prefix', val('payments', 'invoice_prefix'));
    setEl('set_tax_percentage', val('payments', 'tax_percentage') || 0);

    bindAutoSave('payments', 'currency', 'set_currency');
    bindAutoSave('payments', 'stripe_public_key', 'set_stripe_public');
    bindAutoSave('payments', 'stripe_secret_key', 'set_stripe_secret');
    bindAutoSave('payments', 'paypal_client_id', 'set_paypal_client');
    bindAutoSave('payments', 'paypal_secret', 'set_paypal_secret');
    bindAutoSave('payments', 'invoice_prefix', 'set_invoice_prefix');
    bindAutoSave('payments', 'tax_percentage', 'set_tax_percentage', v => parseFloat(v) || 0);
  }

  /* ─── Populate Notifications ─── */
  function populateNotifications() {
    setChecked('set_email_notifs', val('notifications', 'email_notifications_enabled') !== false);
    setChecked('set_push_notifs', val('notifications', 'push_notifications_enabled') !== false);
    setChecked('set_admin_alerts', val('notifications', 'admin_alerts') !== false);
    setChecked('set_sound_notifs', val('notifications', 'sound_notifications') !== false);

    bindToggle('notifications', 'email_notifications_enabled', 'set_email_notifs');
    bindToggle('notifications', 'push_notifications_enabled', 'set_push_notifs');
    bindToggle('notifications', 'admin_alerts', 'set_admin_alerts');
    bindToggle('notifications', 'sound_notifications', 'set_sound_notifs');
  }

  /* ─── Populate SEO ─── */
  function populateSEO() {
    setEl('set_meta_title', val('seo', 'meta_title'));
    setEl('set_meta_desc', val('seo', 'meta_description'));
    setEl('set_ga_id', val('seo', 'google_analytics_id'));
    setPreview('set_og_preview', val('seo', 'og_image_url'));
    setUploadName('set_og_name', val('seo', 'og_image_url') ? 'OG Image uploaded' : '');

    bindAutoSave('seo', 'meta_title', 'set_meta_title');
    bindAutoSave('seo', 'meta_description', 'set_meta_desc');
    bindAutoSave('seo', 'google_analytics_id', 'set_ga_id');
    bindUpload('seo', 'og_image_url', 'set_og_input', 'set_og_preview', 'set_og_name', 'og-images');

    const metaTitle = el('set_meta_title');
    const metaDesc = el('set_meta_desc');
    if (metaTitle) {
      const tc = el('meta_title_count');
      if (tc) tc.textContent = metaTitle.value.length;
      metaTitle.addEventListener('input', () => {
        if (tc) tc.textContent = metaTitle.value.length;
      });
    }
    if (metaDesc) {
      const dc = el('meta_desc_count');
      if (dc) dc.textContent = metaDesc.value.length;
      metaDesc.addEventListener('input', () => {
        if (dc) dc.textContent = metaDesc.value.length;
      });
    }
  }

  /* ─── Content Management ─── */
  const CONTENT_GROUPS = [
    {
      title: 'Navigation',
      desc: 'Navbar links, buttons, and dropdown items.',
      keys: ['nav.home', 'nav.services', 'nav.results', 'nav.pricing', 'nav.about', 'nav.contact', 'nav.blog', 'nav.web-design', 'nav.seo', 'nav.branding', 'nav.ai-automation', 'nav.social-media', 'nav.signin', 'nav.book-call']
    },
    {
      title: 'Hero Section',
      desc: 'Main headline, subtitle, and call-to-action buttons.',
      keys: ['hero.badge', 'hero.title', 'hero.subtitle', 'hero.cta', 'hero.view-results', 'hero.trust-fast', 'hero.trust-seo', 'hero.trust-conversion']
    },
    {
      title: 'Dashboard',
      desc: 'User dashboard greetings, stat labels, and section titles.',
      keys: ['dash.greeting', 'dash.subtitle', 'dash.badge', 'dash.active-label', 'dash.active-hint', 'dash.completed-label', 'dash.completed-hint', 'dash.pending-label', 'dash.pending-hint', 'dash.messages-label', 'dash.messages-hint', 'dash.orders-title', 'dash.activity-title']
    },
    {
      title: 'Footer',
      desc: 'Footer description, copyright, and link headings.',
      keys: ['footer.desc', 'footer.copyright', 'footer.quick-links', 'footer.services', 'footer.legal', 'footer.newsletter', 'footer.newsletter-desc', 'footer.newsletter-placeholder', 'footer.privacy-policy', 'footer.terms-of-service']
    },
    {
      title: 'CTA Section',
      desc: 'Call-to-action section text and button.',
      keys: ['cta.title', 'cta.desc', 'cta.btn']
    },
    {
      title: 'Contact',
      desc: 'Contact section labels and form placeholders.',
      keys: ['contact.badge', 'contact.title', 'contact.desc', 'contact.name', 'contact.email', 'contact.message', 'contact.send']
    },
    {
      title: 'Services',
      desc: 'Services section headings.',
      keys: ['services.tag', 'services.title', 'services.subtitle', 'services.cta']
    },
    {
      title: 'Results & FAQ',
      desc: 'Results and FAQ section headings.',
      keys: ['results.tag', 'results.title', 'results.subtitle', 'faq.tag', 'faq.title', 'faq.subtitle']
    },
    {
      title: 'Support Widget',
      desc: 'Chat widget messages and status text.',
      keys: ['support.welcome', 'support.auto-reply', 'support.placeholder', 'support.online', 'support.offline']
    },
    {
      title: 'Auth & Section Headings',
      desc: 'Authentication modal and general section headings.',
      keys: ['auth.welcome', 'auth.subtitle', 'auth.signin', 'auth.signup', 'auth.create-account', 'section.testimonials', 'section.projects', 'section.pricing', 'section.social-proof', 'section.brands-label']
    },
    {
      title: 'Admin Sidebar',
      desc: 'Admin dashboard sidebar navigation labels.',
      keys: ['admin.sidebar-dashboard', 'admin.sidebar-orders', 'admin.sidebar-clients', 'admin.sidebar-messages', 'admin.sidebar-files', 'admin.sidebar-revisions', 'admin.sidebar-services', 'admin.sidebar-payments', 'admin.sidebar-invoices', 'admin.sidebar-analytics', 'admin.sidebar-settings']
    }
  ];

  let contentDirty = {};
  let contentData = {};

  async function populateContent() {
    const defaults = NAGRIVA_ContentLoader.getDefaults();
    try {
      contentData = await NAGRIVA_ContentAPI.getAllContent();
    } catch (e) {
      contentData = {};
    }
    const merged = { ...defaults, ...contentData };
    contentDirty = {};

    const container = document.getElementById('contentEditor');
    if (!container) return;

    let html = '';
    CONTENT_GROUPS.forEach((group, gi) => {
      html += '<div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.04);' + (gi === CONTENT_GROUPS.length - 1 ? 'border:none;margin:0;padding:0;' : '') + '">';
      html += '<h3 style="font-family:Syne,sans-serif;font-size:0.9rem;font-weight:600;color:var(--white);margin-bottom:2px;">' + group.title + '</h3>';
      html += '<p style="font-size:0.78rem;color:var(--gray2);margin-bottom:14px;">' + group.desc + '</p>';
      html += '<div class="settings-form">';
      group.keys.forEach(key => {
        const val = merged[key] || '';
        const isLong = val.length > 80 || key === 'hero.title' || key === 'cta.title' || key === 'footer.desc' || key === 'services.title' || key === 'results.title' || key === 'faq.title' || key === 'contact.title' || key === 'contact.desc' || key === 'support.welcome' || key === 'support.auto-reply' || key === 'dash.subtitle' || key === 'hero.subtitle';
        html += '<div class="sfg' + (isLong ? ' full-width' : '') + '">';
        html += '<label class="sfg-label" style="font-size:0.72rem;font-family:monospace;color:var(--gray3);">' + key + '</label>';
        if (isLong) {
          html += '<textarea class="sfg-input content-field" data-content-key="' + key + '" rows="3">' + escHtml(val) + '</textarea>';
        } else {
          html += '<input type="text" class="sfg-input content-field" data-content-key="' + key + '" value="' + escHtml(val) + '" />';
        }
        html += '</div>';
      });
      html += '</div></div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.content-field').forEach(input => {
      input.addEventListener('input', () => {
        contentDirty[input.dataset.contentKey] = input.value;
      });
    });

    const badge = document.getElementById('contentSaveBadge');
    if (badge) {
      badge.addEventListener('click', async () => {
        const keys = Object.keys(contentDirty);
        if (keys.length === 0) { toast('info', 'No Changes', 'No content changes to save.'); return; }
        badge.textContent = 'Saving...';
        badge.style.opacity = '0.6';
        try {
          await NAGRIVA_ContentAPI.bulkSave(contentDirty);
          if (NAGRIVA_ContentLoader && NAGRIVA_ContentLoader.refresh) {
            await NAGRIVA_ContentLoader.refresh(true);
          }
          contentDirty = {};
          toast('success', 'Content Saved', keys.length + ' text fields updated. The website now shows your custom content.');
          badge.textContent = 'Save All Changes';
          badge.style.opacity = '1';
        } catch (err) {
          toast('error', 'Save Failed', err.message || 'Could not save content.');
          badge.textContent = 'Save All Changes';
          badge.style.opacity = '1';
        }
      });
    }
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ─── Populate AI Assistant ─── */
  function populateAIAssistant() {
    setEl('set_ai_name', val('ai_assistant', 'ai_assistant_name'));
    setEl('set_ai_prompt', val('ai_assistant', 'ai_personality_prompt'));
    setChecked('set_ai_suggestions', val('ai_assistant', 'ai_suggestions_enabled') !== false);
    setChecked('set_smart_reply', val('ai_assistant', 'smart_reply_enabled') !== false);

    bindAutoSave('ai_assistant', 'ai_assistant_name', 'set_ai_name');
    bindAutoSave('ai_assistant', 'ai_personality_prompt', 'set_ai_prompt');
    bindToggle('ai_assistant', 'ai_suggestions_enabled', 'set_ai_suggestions');
    bindToggle('ai_assistant', 'smart_reply_enabled', 'set_smart_reply');
  }

  /* ─── Tab switching ─── */
  function initTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    const sections = document.querySelectorAll('.settings-section');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.section;
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        sections.forEach(s => s.classList.remove('active'));
        const section = document.getElementById('section-' + target);
        if (section) section.classList.add('active');
      });
    });
  }

  /* ─── Init ─── */
  async function init() {
    showSkeleton();
    initTabs();
    await loadSettings();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('page-settings')) {
    NAGRIVA_AdminSettings.init();
  }
});
