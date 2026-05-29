/* ════════════════════════════════════════════════════════
   NAGRIVA — Compact CMS Settings (Accordion + Search)
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
    { value: 'en', label: 'English' }, { value: 'fr', label: 'Français' },
    { value: 'ar', label: 'العربية' }, { value: 'es', label: 'Español' },
    { value: 'de', label: 'Deutsch' }, { value: 'pt', label: 'Português' }
  ];
  const THEME_PRESETS = [
    { id: 'dark-emerald', name: 'Emerald', colors: ['#00f5c4', '#00c2a8'] },
    { id: 'dark-cyan', name: 'Cyan', colors: ['#06b6d4', '#0891b2'] },
    { id: 'dark-purple', name: 'Royal', colors: ['#a78bfa', '#7c3aed'] },
    { id: 'dark-gold', name: 'Gold', colors: ['#fbbf24', '#d97706'] },
    { id: 'dark-rose', name: 'Rose', colors: ['#fb7185', '#e11d48'] }
  ];

  const CONTENT_GROUPS = [
    { title: 'Navigation', desc: 'Navbar links, buttons, and dropdown items.',
      keys: ['nav.home','nav.services','nav.results','nav.pricing','nav.about','nav.contact','nav.blog','nav.web-design','nav.seo','nav.branding','nav.ai-automation','nav.social-media','nav.signin','nav.book-call'] },
    { title: 'Hero Section', desc: 'Main headline, subtitle, and CTA buttons.',
      keys: ['hero.badge','hero.title','hero.subtitle','hero.cta','hero.view-results','hero.trust-fast','hero.trust-seo','hero.trust-conversion'] },
    { title: 'Dashboard', desc: 'Dashboard greetings, stat labels, section titles.',
      keys: ['dash.greeting','dash.subtitle','dash.badge','dash.active-label','dash.active-hint','dash.completed-label','dash.completed-hint','dash.pending-label','dash.pending-hint','dash.messages-label','dash.messages-hint','dash.orders-title','dash.activity-title'] },
    { title: 'Footer', desc: 'Footer description, copyright, link headings.',
      keys: ['footer.desc','footer.copyright','footer.quick-links','footer.services','footer.legal','footer.newsletter','footer.newsletter-desc','footer.newsletter-placeholder','footer.privacy-policy','footer.terms-of-service'] },
    { title: 'CTA Section', desc: 'Call-to-action section text and button.',
      keys: ['cta.title','cta.desc','cta.btn'] },
    { title: 'Contact', desc: 'Contact section labels and form placeholders.',
      keys: ['contact.badge','contact.title','contact.desc','contact.name','contact.email','contact.message','contact.send'] },
    { title: 'Services', desc: 'Services section headings.',
      keys: ['services.tag','services.title','services.subtitle','services.cta'] },
    { title: 'Results & FAQ', desc: 'Results and FAQ section headings.',
      keys: ['results.tag','results.title','results.subtitle','faq.tag','faq.title','faq.subtitle'] },
    { title: 'Support Widget', desc: 'Chat widget messages and status text.',
      keys: ['support.welcome','support.auto-reply','support.placeholder','support.online','support.offline'] },
    { title: 'Auth & Section Headings', desc: 'Auth modal and general section headings.',
      keys: ['auth.welcome','auth.subtitle','auth.signin','auth.signup','auth.create-account','section.projects','section.pricing'] },
    { title: 'Admin Sidebar', desc: 'Admin dashboard sidebar navigation labels.',
      keys: ['admin.sidebar-dashboard','admin.sidebar-orders','admin.sidebar-clients','admin.sidebar-messages','admin.sidebar-files','admin.sidebar-revisions','admin.sidebar-services','admin.sidebar-payments','admin.sidebar-invoices','admin.sidebar-analytics','admin.sidebar-settings'] }
  ];

  let contentDirty = {};
  let contentData = {};
  let contentSaveTimer = null;
  let contentSaveBadge = null;
  let previewTimer = null;
  let activeSectionId = null;

  /* ─── Toast ─── */
  function toast(type, title, msg) {
    if (window.NAGRIVA_Toast) { NAGRIVA_Toast[type](title, msg); return; }
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast';
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    t.innerHTML = '<div class="toast-icon ' + type + '"><i class="fas ' + (icons[type]||icons.info) + '"></i></div><div class="toast-content"><div class="toast-title">' + title + '</div><div class="toast-message">' + msg + '</div></div><button class="toast-close"><i class="fas fa-times"></i></button>';
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('visible'));
    t.querySelector('.toast-close').addEventListener('click', () => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); });
    setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); }, 4000);
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
      el.innerHTML = '<i class="fas fa-check-circle"></i> All changes saved';
    } else {
      el.innerHTML = '<i class="fas fa-circle" style="font-size:6px;opacity:0.4;"></i> Autosave';
    }
  }

  /* ─── Validation ─── */
  const VALIDATORS = {
    required: v => v && String(v).trim().length > 0,
    email: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    url: v => !v || /^https?:\/\/.+/.test(v),
    number: v => v === '' || v === null || !isNaN(parseFloat(v)),
    minLength: min => v => !v || String(v).length >= min,
    maxLength: max => v => !v || String(v).length <= max,
    password: v => !v || v.length >= 6
  };

  function validateField(inputId, rules) {
    const input = el(inputId);
    if (!input) return true;
    const value = input.value;
    const container = input.closest('.cms-field') || input.parentElement;
    let existing = container.querySelector('.sfg-validation-error');
    const label = container.querySelector('.cms-field-label')?.textContent || inputId;
    for (const rule of rules) {
      if (typeof rule === 'function') {
        if (!rule(value)) {
          if (!existing) {
            existing = document.createElement('div');
            existing.className = 'sfg-validation-error';
            existing.textContent = label + ' is required';
            container.appendChild(existing);
          }
          input.style.borderColor = 'rgba(255,80,80,0.35)';
          return false;
        }
      }
    }
    if (existing) existing.remove();
    input.style.borderColor = '';
    return true;
  }

  function showValidationError(inputId, message) {
    const input = el(inputId);
    if (!input) return;
    const container = input.closest('.cms-field') || input.parentElement;
    let existing = container.querySelector('.sfg-validation-error');
    if (!existing) {
      existing = document.createElement('div');
      existing.className = 'sfg-validation-error';
      container.appendChild(existing);
    }
    existing.textContent = message;
    input.style.borderColor = 'rgba(255,80,80,0.35)';
  }

  function clearValidation(inputId) {
    const input = el(inputId);
    if (!input) return;
    const container = input.closest('.cms-field') || input.parentElement;
    const existing = container.querySelector('.sfg-validation-error');
    if (existing) existing.remove();
    input.style.borderColor = '';
  }

  /* ─── Load settings ─── */
  async function loadSettings() {
    try {
      await NAGRIVA_SettingsAPI.ensureBucket();
      settingsData = await NAGRIVA_SettingsAPI.getAllSettingsWithDefaults();
      await populateContent();
      populateAll();
      setSaveIndicator('saved');
      hideSkeleton();
      NAGRIVA_SettingsAPI.subscribeToRealtime(handleRealtimeChange);
    } catch (err) {
      console.error('[AdminSettings] Load error:', err);
      const cached = NAGRIVA_SettingsAPI.getCached();
      if (cached) {
        settingsData = cached;
        populateContent();
        populateAll();
        setSaveIndicator('saved');
        hideSkeleton();
        toast('info', 'Offline Mode', 'Showing cached settings.');
      } else {
        toast('error', 'Load Failed', err.message);
        hideSkeleton();
      }
    }
  }

  function handleRealtimeChange(payload) {
    if (payload.new && payload.new.setting_key) {
      const key = payload.new.setting_key;
      const value = payload.new.setting_value;
      if (settingsData[key]) settingsData[key] = { ...settingsData[key], ...value };
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
      '<div style="flex:1">' +
        '<div class="settings-skel-tabs"></div>' +
        '<div class="settings-skel-content">' +
          '<div class="settings-skel-card"></div>' +
          '<div class="settings-skel-card"></div>' +
          '<div class="settings-skel-card"></div>' +
          '<div class="settings-skel-card"></div>' +
          '<div class="settings-skel-card"></div>' +
        '</div>' +
      '</div>';
    container.appendChild(skel);
  }

  function hideSkeleton() {
    const skel = document.getElementById('settingsSkeleton');
    if (skel) { skel.style.opacity = '0'; setTimeout(() => skel.remove(), 250); }
    const sections = document.getElementById('settingsSections');
    if (sections) sections.style.display = 'block';
  }

  /* ─── Populate all ─── */
  function populateAll() {
    populateGeneral();
    populateBranding();
    populateSupportChat();
    populateOrders();
    populatePayments();
    populateNotifications();
    populateSEO();
    populateAIAssistant();
  }

  function populateSection(sectionKey) {
    switch (sectionKey) {
      case 'general': populateGeneral(); break;
      case 'branding': populateBranding(); break;
      case 'support_chat': populateSupportChat(); break;
      case 'orders': populateOrders(); break;
      case 'payments': populatePayments(); break;
      case 'notifications': populateNotifications(); break;
      case 'seo': populateSEO(); break;
      case 'ai_assistant': populateAIAssistant(); break;
    }
  }

  /* ─── Value helpers ─── */
  function val(section, key) { return settingsData[section] ? settingsData[section][key] : ''; }

  function setVal(section, key, value) {
    if (!settingsData[section]) settingsData[section] = {};
    settingsData[section][key] = value;
    queueSave(section);
  }

  function el(id) { return document.getElementById(id); }
  function elVal(id) { const e = el(id); return e ? e.value : ''; }
  function setEl(id, value) { const e = el(id); if (e) e.value = value; }

  function populateSelect(id, options, selectedValue) {
    const sel = el(id);
    if (!sel) return;
    sel.innerHTML = '';
    options.forEach(opt => {
      const o = document.createElement('option');
      if (typeof opt === 'object') { o.value = opt.value; o.textContent = opt.label; }
      else { o.value = opt; o.textContent = opt; }
      if (o.value === selectedValue) o.selected = true;
      sel.appendChild(o);
    });
  }

  function setChecked(id, checked) {
    const e = el(id);
    if (e) { if (checked) e.classList.add('active'); else e.classList.remove('active'); }
  }

  function setPreview(id, url) {
    const container = el(id);
    if (!container) return;
    container.innerHTML = url ? '<img src="' + url + '" alt="preview" loading="lazy" />' : '<i class="fas fa-image placeholder-icon"></i>';
  }

  function setUploadName(id, name) {
    const e = document.getElementById(id);
    if (e) e.textContent = name || 'No file selected';
  }

  /* ─── Bind helpers ─── */
  function bindAutoSave(section, fieldKey, inputId, transform, validators) {
    const input = el(inputId);
    if (!input) return;
    const handler = () => {
      if (validators && !validators.every(v => validateField(inputId, [v]))) return;
      clearValidation(inputId);
      let value = input.value;
      if (transform) value = transform(value);
      setVal(section, fieldKey, value);
    };
    input.addEventListener('input', handler);
    input.addEventListener('change', handler);
    input.addEventListener('blur', () => { if (validators) validators.every(v => validateField(inputId, [v])); });
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
      setVal(section, fieldKey, parseInt(v,10));
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

  function updateNavbarLogo(url) {
    const navLogo = document.querySelector('.nav-logo img');
    if (navLogo && url) navLogo.src = url;
    const dashLogo = document.querySelector('.sidebar-logo img');
    if (dashLogo && url) dashLogo.src = url;
  }

  function bindUpload(section, fieldKey, inputId, previewId, nameId, folder, updateNavbar) {
    const input = el(inputId);
    if (!input) return;
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const btn = input.closest('.cms-field-upload')?.querySelector('.cms-upload-btn');
      if (btn) btn.classList.add('loading');
      try {
        const url = await NAGRIVA_SettingsAPI.uploadFile(file, folder);
        setPreview(previewId, url);
        setUploadName(nameId, file.name);
        setVal(section, fieldKey, url);
        if (updateNavbar) updateNavbarLogo(url);
        toast('success', 'Upload Complete', file.name + ' uploaded.');
      } catch (err) { toast('error', 'Upload Failed', err.message); }
      if (btn) btn.classList.remove('loading');
      input.value = '';
    });
    const btns = input.closest('.cms-field-upload')?.querySelectorAll('.cms-upload-btn');
    if (btns) btns.forEach(b => b.addEventListener('click', e => { e.preventDefault(); input.click(); }));
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
      for (const key of keys) await NAGRIVA_SettingsAPI.saveSetting(key, settingsData[key]);
      setSaveIndicator('saved');
    } catch (err) {
      console.error('[AdminSettings] Save error:', err);
      toast('error', 'Save Failed', err.message);
      setSaveIndicator('saved');
    }
    isSaving = false;
  }

  /* ─── Branding preview ─── */
  function applyBrandingPreview() {
    const primary = val('branding','primary_color') || '#00f5c4';
    const secondary = val('branding','secondary_color') || '#00c2a8';
    document.documentElement.style.setProperty('--accent-preview', primary);
    document.documentElement.style.setProperty('--accent2-preview', secondary);
  }

  /* ─── Populate General ─── */
  function populateGeneral() {
    populateSelect('set_timezone', TIMEZONES, val('general','timezone'));
    populateSelect('set_language', LANGUAGES, val('general','language'));
    setEl('set_company_name', val('general','company_name'));
    setEl('set_support_email', val('general','support_email'));
    setEl('set_whatsapp', val('general','whatsapp_number'));
    setPreview('set_logo_preview', val('general','logo_url'));
    setUploadName('set_logo_name', val('general','logo_url') ? 'Logo uploaded' : '');
    bindAutoSave('general','company_name','set_company_name');
    bindAutoSave('general','support_email','set_support_email');
    bindAutoSave('general','whatsapp_number','set_whatsapp');
    bindAutoSave('general','timezone','set_timezone');
    bindAutoSave('general','language','set_language');
    bindUpload('general','logo_url','set_logo_input','set_logo_preview','set_logo_name','logos',true);
    el('set_company_name')?.addEventListener('input', queuePreviewUpdate);
  }

  /* ─── Populate Branding ─── */
  function populateBranding() {
    const primary = val('branding','primary_color') || '#00f5c4';
    const secondary = val('branding','secondary_color') || '#00c2a8';
    if (el('set_primary_color')) {
      el('set_primary_color').value = primary;
      el('set_secondary_color').value = secondary;
      el('set_primary_display').textContent = primary;
      el('set_secondary_display').textContent = secondary;
      el('set_glow_intensity').value = val('branding','glow_intensity') || 100;
      el('set_glow_value').textContent = val('branding','glow_intensity') || 100;
      el('set_border_radius').value = val('branding','border_radius') || 22;
      el('set_radius_value').textContent = val('branding','border_radius') || 22;
    }
    buildThemePresets();
    bindColor('branding','primary_color','set_primary_color','set_primary_display');
    bindColor('branding','secondary_color','set_secondary_color','set_secondary_display');
    bindRange('branding','glow_intensity','set_glow_intensity','set_glow_value');
    bindRange('branding','border_radius','set_border_radius','set_radius_value');
    el('set_primary_color')?.addEventListener('input', () => { applyBrandingPreview(); queuePreviewUpdate(); });
    el('set_secondary_color')?.addEventListener('input', () => { applyBrandingPreview(); queuePreviewUpdate(); });
    applyBrandingPreview();
    const themeContainer = document.querySelector('.cms-theme-grid');
    if (themeContainer) {
      themeContainer.querySelectorAll('.cms-theme-card').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.theme;
          const preset = THEME_PRESETS.find(p => p.id === id);
          if (!preset) return;
          selectThemePreset(id);
          if (el('set_primary_color')) {
            el('set_primary_color').value = preset.colors[0];
            el('set_secondary_color').value = preset.colors[1];
            el('set_primary_display').textContent = preset.colors[0];
            el('set_secondary_display').textContent = preset.colors[1];
          }
          setVal('branding','primary_color', preset.colors[0]);
          setVal('branding','secondary_color', preset.colors[1]);
          setVal('branding','theme_preset', id);
          applyBrandingPreview();
          queuePreviewUpdate();
        });
      });
    }
  }

  function buildThemePresets() {
    const container = document.querySelector('.cms-theme-grid');
    if (!container) return;
    container.innerHTML = '';
    const activePreset = val('branding','theme_preset') || 'dark-emerald';
    THEME_PRESETS.forEach(p => {
      const div = document.createElement('div');
      div.className = 'cms-theme-card' + (p.id === activePreset ? ' active' : '');
      div.dataset.theme = p.id;
      div.innerHTML = '<div class="cms-theme-swatches"><span class="cms-theme-swatch" style="background:' + p.colors[0] + '"></span><span class="cms-theme-swatch" style="background:' + p.colors[1] + '"></span></div><div class="cms-theme-name">' + p.name + '</div>';
      container.appendChild(div);
    });
  }

  function selectThemePreset(id) {
    document.querySelectorAll('.cms-theme-card').forEach(el => el.classList.toggle('active', el.dataset.theme === id));
  }

  /* ─── Populate Support Chat ─── */
  function populateSupportChat() {
    setChecked('set_chat_enabled', val('support_chat','chat_enabled') !== false);
    setChecked('set_chat_online', val('support_chat','chat_online') !== false);
    setChecked('set_chat_typing', val('support_chat','chat_typing_indicator') !== false);
    setEl('set_chat_welcome', val('support_chat','chat_welcome_message'));
    setEl('set_chat_auto_reply', val('support_chat','chat_auto_reply'));
    setPreview('set_chat_avatar_preview', val('support_chat','chat_avatar_url'));
    setUploadName('set_chat_avatar_name', val('support_chat','chat_avatar_url') ? 'Avatar uploaded' : '');
    bindToggle('support_chat','chat_enabled','set_chat_enabled');
    bindToggle('support_chat','chat_online','set_chat_online');
    bindToggle('support_chat','chat_typing_indicator','set_chat_typing');
    bindAutoSave('support_chat','chat_welcome_message','set_chat_welcome');
    bindAutoSave('support_chat','chat_auto_reply','set_chat_auto_reply');
    bindUpload('support_chat','chat_avatar_url','set_chat_avatar_input','set_chat_avatar_preview','set_chat_avatar_name','chat-avatars');
  }

  /* ─── Populate Orders ─── */
  function populateOrders() {
    setEl('set_default_status', val('orders','default_order_status'));
    setChecked('set_auto_order_ids', val('orders','auto_generate_order_ids') !== false);
    setEl('set_revisions_limit', val('orders','revisions_limit') || 3);
    setEl('set_deadline_days', val('orders','deadline_default_days') || 14);
    bindAutoSave('orders','default_order_status','set_default_status');
    bindToggle('orders','auto_generate_order_ids','set_auto_order_ids');
    bindAutoSave('orders','revisions_limit','set_revisions_limit', v => parseInt(v,10) || 0);
    bindAutoSave('orders','deadline_default_days','set_deadline_days', v => parseInt(v,10) || 1);
  }

  /* ─── Populate Payments ─── */
  function populatePayments() {
    populateSelect('set_currency', CURRENCIES, val('payments','currency'));
    setEl('set_stripe_public', val('payments','stripe_public_key'));
    setEl('set_stripe_secret', val('payments','stripe_secret_key'));
    setEl('set_paypal_client', val('payments','paypal_client_id'));
    setEl('set_paypal_secret', val('payments','paypal_secret'));
    setEl('set_invoice_prefix', val('payments','invoice_prefix'));
    setEl('set_tax_percentage', val('payments','tax_percentage') || 0);
    bindAutoSave('payments','currency','set_currency');
    bindAutoSave('payments','stripe_public_key','set_stripe_public');
    bindAutoSave('payments','stripe_secret_key','set_stripe_secret');
    bindAutoSave('payments','paypal_client_id','set_paypal_client');
    bindAutoSave('payments','paypal_secret','set_paypal_secret');
    bindAutoSave('payments','invoice_prefix','set_invoice_prefix');
    bindAutoSave('payments','tax_percentage','set_tax_percentage', v => parseFloat(v) || 0);
  }

  /* ─── Populate Notifications ─── */
  function populateNotifications() {
    setChecked('set_email_notifs', val('notifications','email_notifications_enabled') !== false);
    setChecked('set_push_notifs', val('notifications','push_notifications_enabled') !== false);
    setChecked('set_admin_alerts', val('notifications','admin_alerts') !== false);
    setChecked('set_sound_notifs', val('notifications','sound_notifications') !== false);
    bindToggle('notifications','email_notifications_enabled','set_email_notifs');
    bindToggle('notifications','push_notifications_enabled','set_push_notifs');
    bindToggle('notifications','admin_alerts','set_admin_alerts');
    bindToggle('notifications','sound_notifications','set_sound_notifs');
  }

  /* ─── Populate SEO ─── */
  function populateSEO() {
    setEl('set_meta_title', val('seo','meta_title'));
    setEl('set_meta_desc', val('seo','meta_description'));
    setEl('set_ga_id', val('seo','google_analytics_id'));
    setPreview('set_og_preview', val('seo','og_image_url'));
    setUploadName('set_og_name', val('seo','og_image_url') ? 'OG Image uploaded' : '');
    setPreview('set_favicon_preview', val('seo','favicon_url'));
    setUploadName('set_favicon_name', val('seo','favicon_url') ? 'Favicon uploaded' : '');
    bindAutoSave('seo','meta_title','set_meta_title');
    bindAutoSave('seo','meta_description','set_meta_desc');
    bindAutoSave('seo','google_analytics_id','set_ga_id');
    bindUpload('seo','og_image_url','set_og_input','set_og_preview','set_og_name','og-images');
    bindUpload('seo','favicon_url','set_favicon_input','set_favicon_preview','set_favicon_name','favicons');
    const metaTitle = el('set_meta_title');
    const metaDesc = el('set_meta_desc');
    if (metaTitle) {
      const tc = el('meta_title_count');
      if (tc) tc.textContent = metaTitle.value.length;
      metaTitle.addEventListener('input', () => { if (tc) tc.textContent = metaTitle.value.length; queuePreviewUpdate(); });
    }
    if (metaDesc) {
      const dc = el('meta_desc_count');
      if (dc) dc.textContent = metaDesc.value.length;
      metaDesc.addEventListener('input', () => { if (dc) dc.textContent = metaDesc.value.length; });
    }
  }

  /* ─── Populate AI Assistant ─── */
  function populateAIAssistant() {
    setEl('set_ai_name', val('ai_assistant','ai_assistant_name'));
    setEl('set_ai_welcome', val('ai_assistant','ai_welcome_message'));
    setEl('set_ai_prompt', val('ai_assistant','ai_personality_prompt'));
    setEl('set_ai_system_prompt', val('ai_assistant','ai_system_prompt'));
    populateSelect('set_ai_tone', [{value:'professional',label:'Professional'},{value:'friendly',label:'Friendly'},{value:'casual',label:'Casual'},{value:'formal',label:'Formal'}], val('ai_assistant','ai_tone'));
    populateSelect('set_ai_response_style', [{value:'concise',label:'Concise'},{value:'balanced',label:'Balanced'},{value:'detailed',label:'Detailed'}], val('ai_assistant','ai_response_style'));
    setChecked('set_ai_suggestions', val('ai_assistant','ai_suggestions_enabled') !== false);
    setChecked('set_smart_reply', val('ai_assistant','smart_reply_enabled') !== false);
    bindAutoSave('ai_assistant','ai_assistant_name','set_ai_name');
    bindAutoSave('ai_assistant','ai_welcome_message','set_ai_welcome');
    bindAutoSave('ai_assistant','ai_personality_prompt','set_ai_prompt');
    bindAutoSave('ai_assistant','ai_system_prompt','set_ai_system_prompt');
    bindAutoSave('ai_assistant','ai_tone','set_ai_tone');
    bindAutoSave('ai_assistant','ai_response_style','set_ai_response_style');
    bindToggle('ai_assistant','ai_suggestions_enabled','set_ai_suggestions');
    bindToggle('ai_assistant','smart_reply_enabled','set_smart_reply');
    el('set_ai_name')?.addEventListener('input', queuePreviewUpdate);
    el('set_ai_welcome')?.addEventListener('input', queuePreviewUpdate);
  }

  /* ─── Content Management ─── */
  async function populateContent() {
    const defaults = NAGRIVA_ContentLoader ? NAGRIVA_ContentLoader.getDefaults() : {};
    try { contentData = await NAGRIVA_ContentAPI.getAllContent(); } catch (e) { contentData = {}; }
    const merged = { ...defaults, ...contentData };
    contentDirty = {};
    contentSaveBadge = document.getElementById('contentSaveBadge');

    CONTENT_GROUPS.forEach((group, gi) => {
      const sectionMap = {
        'Navigation': 'cms-content-nav',
        'Hero Section': 'cms-content-hero',
        'CTA Section': 'cms-content-cta',
        'Footer': 'cms-content-footer'
      };
      const targetId = sectionMap[group.title];
      const containers = [];
      if (targetId) { const c = document.getElementById(targetId); if (c) containers.push(c); }
      if (containers.length === 0) { const c = document.getElementById('contentEditor'); if (c) containers.push(c); }

      containers.forEach(container => {
        if (!container) return;
        let html = '';
        group.keys.forEach(key => {
          const v = merged[key] || '';
          const isLong = v.length > 80 || ['hero.title','hero.subtitle','cta.title','footer.desc','services.title','results.title','faq.title','contact.title','contact.desc','support.welcome','support.auto-reply','dash.subtitle','nav.book-call','hero.cta','footer.copyright','footer.newsletter','footer.newsletter-desc'].includes(key);
          const label = key.split('.').pop().replace(/-/g,' ').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
          html += '<div class="cms-field" draggable="true" data-content-group="' + gi + '" data-content-key="' + key + '">' +
            '<div class="cms-field-header">' +
              '<div class="cms-field-left">' +
                '<span class="cms-field-drag"><i class="fas fa-grip-vertical"></i></span>' +
                '<span class="cms-field-label">' + label + '</span>' +
                '<span class="cms-field-key">' + key + '</span>' +
              '</div>' +
              '<div class="cms-field-actions">' +
                '<span class="cms-field-status idle" data-status-for="' + key + '"><i class="fas fa-circle"></i> Saved</span>' +
                '<button class="cms-field-edit-btn" title="Edit"><i class="fas fa-pencil-alt"></i></button>' +
              '</div>' +
            '</div>' +
            '<div class="cms-row-content">' +
              (isLong
                ? '<textarea class="cms-field-input content-field" data-content-key="' + key + '" rows="2" placeholder="Enter ' + label + '...">' + escHtml(v) + '</textarea>'
                : '<input type="text" class="cms-field-input content-field" data-content-key="' + key + '" value="' + escHtml(v) + '" placeholder="Enter ' + label + '..." />') +
            '</div></div>';
        });
        container.innerHTML = html;

        container.querySelectorAll('.content-field').forEach(input => {
          input.addEventListener('input', () => {
            const key = input.dataset.contentKey;
            contentDirty[key] = input.value;
            queueContentSave();
            const status = document.querySelector('[data-status-for="' + key + '"]');
            if (status) { status.className = 'cms-field-status saving'; status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }
            schedulePreviewUpdate();
          });
        });

        container.querySelectorAll('.cms-field-edit-btn').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const field = btn.closest('.cms-field');
            if (!field) return;
            const input = field.querySelector('.content-field');
            if (input) { input.focus(); input.select(); }
            field.classList.add('is-editing');
          });
        });

        container.querySelectorAll('.content-field').forEach(input => {
          input.addEventListener('focus', () => input.closest('.cms-field')?.classList.add('is-editing'));
          input.addEventListener('blur', () => input.closest('.cms-field')?.classList.remove('is-editing'));
        });
      });
    });

    if (contentSaveBadge) contentSaveBadge.addEventListener('click', async () => { await flushContentSave(); });
    initDragDrop();
  }

  function queueContentSave() {
    if (contentSaveBadge) { contentSaveBadge.textContent = 'Autosaving...'; contentSaveBadge.style.opacity = '0.6'; }
    if (contentSaveTimer) clearTimeout(contentSaveTimer);
    contentSaveTimer = setTimeout(flushContentSave, 2000);
  }

  async function flushContentSave() {
    if (contentSaveTimer) { clearTimeout(contentSaveTimer); contentSaveTimer = null; }
    const keys = Object.keys(contentDirty);
    if (keys.length === 0) {
      if (contentSaveBadge) { contentSaveBadge.textContent = 'All saved'; setTimeout(() => { if (contentSaveBadge) contentSaveBadge.textContent = 'Save Changes'; }, 2000); }
      return;
    }
    try {
      await NAGRIVA_ContentAPI.bulkSave(contentDirty);
      if (NAGRIVA_ContentLoader && NAGRIVA_ContentLoader.refresh) await NAGRIVA_ContentLoader.refresh(true);
      const dirtyKeys = Object.keys(contentDirty);
      contentDirty = {};
      dirtyKeys.forEach(key => {
        const status = document.querySelector('[data-status-for="' + key + '"]');
        if (status) { status.className = 'cms-field-status saved'; status.innerHTML = '<i class="fas fa-check-circle"></i> Saved'; setTimeout(() => { if (status) { status.className = 'cms-field-status idle'; status.innerHTML = '<i class="fas fa-circle"></i> Saved'; } }, 2500); }
      });
      if (contentSaveBadge) { contentSaveBadge.textContent = 'Saved'; setTimeout(() => { if (contentSaveBadge) contentSaveBadge.textContent = 'Save Changes'; }, 2000); }
      schedulePreviewUpdate();
      toast('success', 'Content Saved', dirtyKeys.length + ' text fields updated.');
    } catch (err) { toast('error', 'Save Failed', err.message); if (contentSaveBadge) contentSaveBadge.textContent = 'Failed'; }
  }

  function escHtml(str) { if (!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#039;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function formatLabel(key) {
    return key.split('.').pop().replace(/-/g,' ').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  }

  /* ─── Accordion Tabs ─── */
  function initTabs() {
    const tabs = document.querySelectorAll('.cms-tab');
    const sections = document.querySelectorAll('.cms-section');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const sectionId = tab.dataset.section;
        const section = document.getElementById(sectionId);
        if (!section) return;

        const isAlreadyActive = section.classList.contains('active');
        const body = section.querySelector('.cms-section-body');
        const toggle = section.querySelector('.cms-section-toggle');

        if (isAlreadyActive && body?.classList.contains('open')) {
          body.classList.remove('open');
          if (toggle) toggle.classList.remove('open');
          section.classList.remove('active');
          tabs.forEach(t => t.classList.remove('active'));
          activeSectionId = null;
          return;
        }

        sections.forEach(s => {
          s.classList.remove('active');
          const sb = s.querySelector('.cms-section-body');
          const st = s.querySelector('.cms-section-toggle');
          if (sb) sb.classList.remove('open');
          if (st) st.classList.remove('open');
        });
        tabs.forEach(t => t.classList.remove('active'));

        tab.classList.add('active');
        section.classList.add('active');
        if (body) body.classList.add('open');
        if (toggle) toggle.classList.add('open');
        activeSectionId = sectionId;

        setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      });
    });
  }

  /* ─── Accordion click on section header ─── */
  function initAccordion() {
    const sections = document.querySelectorAll('.cms-section');
    sections.forEach(section => {
      const header = section.querySelector('.cms-section-header');
      const body = section.querySelector('.cms-section-body');
      const toggle = section.querySelector('.cms-section-toggle');
      if (!header || !body) return;

      header.addEventListener('click', (e) => {
        if (e.target.closest('.cms-field-edit-btn') || e.target.closest('.cms-upload-btn') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('select') || e.target.closest('button')) return;

        const isOpen = body.classList.contains('open');
        const sectionId = section.id;
        const tab = document.querySelector('.cms-tab[data-section="' + sectionId + '"]');

        if (isOpen) {
          body.classList.remove('open');
          if (toggle) toggle.classList.remove('open');
          section.classList.remove('active');
          if (tab) tab.classList.remove('active');
          activeSectionId = null;
        } else {
          sections.forEach(s => {
            s.classList.remove('active');
            const sb = s.querySelector('.cms-section-body');
            const st = s.querySelector('.cms-section-toggle');
            if (sb) sb.classList.remove('open');
            if (st) st.classList.remove('open');
          });
          document.querySelectorAll('.cms-tab').forEach(t => t.classList.remove('active'));

          body.classList.add('open');
          if (toggle) toggle.classList.add('open');
          section.classList.add('active');
          if (tab) tab.classList.add('active');
          activeSectionId = sectionId;
        }
      });
    });
  }

  /* ─── Drag and Drop ─── */
  function initDragDrop() {
    let dragSrc = null;
    document.addEventListener('dragstart', e => {
      const f = e.target.closest('.cms-field');
      if (!f || e.target.closest('.cms-field-edit-btn') || e.target.closest('.content-field')) return;
      if (!e.target.closest('.cms-field-drag') && !e.target.closest('.cms-field')) return;
      f.classList.add('dragging'); dragSrc = f;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', f.dataset.contentKey || '');
    });
    document.addEventListener('dragend', () => {
      document.querySelectorAll('.cms-field').forEach(el => el.classList.remove('dragging','drag-over'));
      dragSrc = null;
    });
    document.addEventListener('dragover', e => {
      const f = e.target.closest('.cms-field');
      if (!f || f === dragSrc) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      f.classList.add('drag-over');
    });
    document.addEventListener('dragleave', e => {
      const f = e.target.closest('.cms-field');
      if (f) f.classList.remove('drag-over');
    });
    document.addEventListener('drop', e => {
      e.preventDefault();
      const t = e.target.closest('.cms-field');
      if (!t || !dragSrc || t === dragSrc) return;
      t.classList.remove('drag-over');
      const p = t.parentNode;
      if (p) {
        const all = [...p.querySelectorAll('.cms-field')];
        const ti = all.indexOf(t), si = all.indexOf(dragSrc);
        p.insertBefore(dragSrc, ti > si ? t.nextSibling : t);
      }
    });
  }

  /* ─── Search / Filter ─── */
  function initSearch() {
    const input = document.getElementById('cmsSearchInput');
    const clear = document.getElementById('cmsSearchClear');
    const count = document.getElementById('cmsSearchCount');
    if (!input) return;

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      if (clear) clear.classList.toggle('visible', q.length > 0);

      if (!q) {
        document.querySelectorAll('.cms-field').forEach(f => f.classList.remove('hidden-field','highlight'));
        document.querySelectorAll('.cms-section').forEach(s => s.classList.remove('search-hidden'));
        document.querySelectorAll('.cms-no-results').forEach(r => r.remove());
        if (count) count.textContent = '';
        return;
      }

      let total = 0;
      document.querySelectorAll('.cms-field').forEach(f => {
        const label = f.querySelector('.cms-field-label')?.textContent?.toLowerCase() || '';
        const key = f.dataset.contentKey?.toLowerCase() || '';
        const ph = f.querySelector('.cms-field-input')?.placeholder?.toLowerCase() || '';
        const match = label.includes(q) || key.includes(q) || ph.includes(q);
        f.classList.toggle('hidden-field', !match);
        f.classList.toggle('highlight', match);
        if (match) total++;
      });

      document.querySelectorAll('.cms-section').forEach(s => {
        const visible = s.querySelectorAll('.cms-field:not(.hidden-field)').length > 0 || s.querySelectorAll('.cms-field-toggle:not(.hidden-field), .cms-field-color:not(.hidden-field), .cms-field-range:not(.hidden-field), .cms-field-upload:not(.hidden-field)').length > 0;
        s.classList.toggle('search-hidden', !visible);
        if (visible) {
          const body = s.querySelector('.cms-section-body');
          const toggle = s.querySelector('.cms-section-toggle');
          if (body && !body.classList.contains('open')) {
            body.classList.add('open');
            if (toggle) toggle.classList.add('open');
          }
        }
      });

      document.querySelectorAll('.cms-no-results').forEach(r => r.remove());
      if (total === 0) {
        const container = document.querySelector('.cms-accordion');
        if (container) {
          const nr = document.createElement('div');
          nr.className = 'cms-no-results';
          nr.innerHTML = '<i class="fas fa-search"></i><h4>No results found</h4><p>No settings match "' + escHtml(q) + '"</p>';
          container.appendChild(nr);
        }
      }

      if (count) count.textContent = total > 0 ? total + ' matches' : '';
    });

    if (clear) {
      clear.addEventListener('click', () => {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
      });
    }
  }

  /* ─── Quick Actions ─── */
  function initQuickActions() {
    const bar = document.querySelector('.cms-float-bar');
    if (!bar) return;

    const saveBtn = bar.querySelector('[data-action="save-all"]');
    const resetBtn = bar.querySelector('[data-action="reset"]');
    const collapseBtn = bar.querySelector('[data-action="collapse-all"]');
    const expandBtn = bar.querySelector('[data-action="expand-all"]');

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        await flushSave();
        await flushContentSave();
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
        setTimeout(() => { saveBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Save All'; }, 2000);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (!activeSectionId) { toast('info', 'No Section Active', 'Open a section first to reset it.'); return; }
        const sectionEl = document.getElementById(activeSectionId);
        const sectionName = sectionEl?.querySelector('.cms-section-info h3')?.textContent || activeSectionId;
        const sectionKey = activeSectionId.replace('section-','').replace(/-/g,'_');

                const CONTENT_ONLY = ['nav', 'hero', 'cta', 'footer', 'other-content'];
                if (CONTENT_ONLY.includes(sectionKey)) {
                  toast('info', 'Cannot Reset', 'Content sections cannot be reset automatically.');
                  return;
                }

        try {
          const fresh = await NAGRIVA_SettingsAPI.getSetting(sectionKey);
          if (fresh) { settingsData[sectionKey] = fresh; }
          else { const d = NAGRIVA_SettingsAPI.DEFAULT_VALUES; if (d[sectionKey]) settingsData[sectionKey] = { ...d[sectionKey] }; }
          populateSection(sectionKey);
          toast('info', 'Section Reset', sectionName + ' reset to saved values.');
        } catch (err) { toast('error', 'Reset Failed', err.message); }
      });
    }

    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        document.querySelectorAll('.cms-section').forEach(s => {
          s.classList.remove('active');
          const sb = s.querySelector('.cms-section-body');
          const st = s.querySelector('.cms-section-toggle');
          if (sb) sb.classList.remove('open');
          if (st) st.classList.remove('open');
        });
        document.querySelectorAll('.cms-tab').forEach(t => t.classList.remove('active'));
        activeSectionId = null;
      });
    }

    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        const first = document.querySelector('.cms-tab');
        if (first) first.click();
      });
    }

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const tabs = document.querySelector('.sticky-tabs-wrap');
      if (tabs) {
        const tabsBottom = tabs.getBoundingClientRect().bottom + 40;
        bar.classList.toggle('visible', tabsBottom < 0 && scrollY > lastScroll);
        lastScroll = scrollY;
      }
    }, { passive: true });
  }

  /* ─── Live Preview ─── */
  function updatePreview() {
    const preview = document.getElementById('previewContent');
    if (!preview) return;
    const companyName = val('general','company_name') || 'NAGRIVA';
    const navItems = {};
    const heroContent = {};
    const contentKeys = ['nav.home','nav.services','nav.about','nav.contact','hero.badge','hero.title','hero.subtitle','hero.cta'];
    contentKeys.forEach(key => {
      let value = '';
      if (contentDirty[key] !== undefined) value = contentDirty[key];
      else if (contentData[key]) value = contentData[key];
      else { const d = NAGRIVA_ContentLoader ? NAGRIVA_ContentLoader.getDefaults() : {}; value = d[key] || ''; }
      if (key.startsWith('nav.')) navItems[key] = value;
      if (key.startsWith('hero.')) heroContent[key.replace('hero.','')] = value;
    });
    const navLinks = ['nav.home','nav.services','nav.about','nav.contact'];
    const navHtml = navLinks.map(k => '<span class="preview-nav-link">' + escHtml(navItems[k] || k.replace('nav.','').replace(/^./,c=>c.toUpperCase())) + '</span>').join('');
    preview.innerHTML =
      '<div class="preview-frame-inner">' +
        '<div class="preview-nav-bar"><div class="preview-nav-logo">' + escHtml(companyName) + '</div><div class="preview-nav-links">' + navHtml + '</div></div>' +
        '<div class="preview-hero"><div class="preview-hero-badge">' + escHtml(heroContent.badge || 'Trusted by 500+ brands') + '</div><div class="preview-hero-title">' + escHtml(heroContent.title || 'Premium Digital Agency') + '</div><div class="preview-hero-subtitle">' + escHtml(heroContent.subtitle || 'We build brands that dominate.') + '</div><div class="preview-hero-btn">' + escHtml(heroContent.cta || 'Book a Call') + '</div></div>' +
        '<div class="preview-footer"><div class="preview-footer-text">&copy; ' + new Date().getFullYear() + ' ' + escHtml(companyName) + '. All rights reserved.</div></div>' +
      '</div>';
  }

  function queuePreviewUpdate() { if (previewTimer) clearTimeout(previewTimer); previewTimer = setTimeout(() => { updatePreview(); previewTimer = null; }, 150); }
  function schedulePreviewUpdate() { queuePreviewUpdate(); }

  function initPreview() {
    const toggleBtn = document.querySelector('.preview-toggle-btn');
    const panel = document.querySelector('.settings-preview');
    if (toggleBtn && panel) toggleBtn.addEventListener('click', () => panel.classList.toggle('collapsed'));
    const deviceBtns = document.querySelectorAll('.preview-device-btn');
    const frame = document.querySelector('.preview-frame');
    deviceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        deviceBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (frame) frame.classList.toggle('mobile', btn.dataset.device === 'mobile');
      });
    });
    updatePreview();
  }

  /* ─── Init ─── */
  async function init() {
    showSkeleton();
    initTabs();
    initAccordion();
    initPreview();
    initSearch();
    initQuickActions();
    await loadSettings();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('page-settings')) NAGRIVA_AdminSettings.init();
});
