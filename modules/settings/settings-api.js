const NAGRIVA_SettingsAPI = (() => {
  'use strict';

  const TABLE = 'settings';
  const STORAGE_BUCKET = 'settings';
  const CACHE_KEY = 'nagriva_settings_cache';
  const CACHE_TTL = 5 * 60 * 1000;

  let realtimeSub = null;
  let onChangeCallbacks = [];

  const DEFAULT_VALUES = {
    general: {
      company_name: 'Nagriva',
      logo_url: '',
      support_email: 'hello@nagriva.com',
      whatsapp_number: '',
      timezone: 'UTC',
      language: 'en'
    },
    branding: {
      primary_color: '#3b82f6',
      secondary_color: '#2563EB',
      glow_intensity: 100,
      border_radius: 22,
      theme_preset: 'dark-blue'
    },
    orders: {
      default_order_status: 'pending',
      auto_generate_order_ids: true,
      revisions_limit: 3,
      deadline_default_days: 14
    },
    payments: {
      currency: 'MAD',
      stripe_public_key: '',
      stripe_secret_key: '',
      paypal_client_id: '',
      paypal_secret: '',
      invoice_prefix: 'INV-',
      tax_percentage: 0
    },
    notifications: {
      email_notifications_enabled: true,
      push_notifications_enabled: true,
      admin_alerts: true,
      sound_notifications: true
    },
    seo: {
      meta_title: 'Nagriva — Premium Digital Agency',
      meta_description: 'Premium digital agency offering web design, SEO, branding, AI automation, and social media management services.',
      og_image_url: '',
      favicon_url: '',
      google_analytics_id: ''
    },
  };

  /* ─── Local Cache ─── */
  function getCached() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data.settings;
    } catch { return null; }
  }

  function setCached(settings) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ settings, ts: Date.now() }));
    } catch {}
  }

  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  }

  /* ─── Realtime Subscriptions ─── */
  function subscribeToRealtime(callback) {
    if (callback) onChangeCallbacks.push(callback);
    if (realtimeSub) return;
    try {
      realtimeSub = window.supabaseClient
        .channel('settings-realtime')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: TABLE },
          (payload) => {
            clearCache();
            onChangeCallbacks.forEach(cb => cb(payload));
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[SettingsAPI] Realtime subscription failed:', err.message);
    }
  }

  function unsubscribe() {
    if (realtimeSub) {
      window.supabaseClient.removeChannel(realtimeSub);
      realtimeSub = null;
    }
    onChangeCallbacks = [];
  }

  async function getAllSettings() {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('setting_key, setting_value');
    if (error) throw error;
    const settings = {};
    (data || []).forEach(s => {
      settings[s.setting_key] = s.setting_value;
    });
    return settings;
  }

  async function getAllSettingsWithDefaults(useCache) {
    if (useCache !== false) {
      const cached = getCached();
      if (cached) return cached;
    }
    const raw = await getAllSettings();
    const merged = {};
    Object.keys(DEFAULT_VALUES).forEach(key => {
      merged[key] = { ...DEFAULT_VALUES[key], ...(raw[key] || {}) };
    });
    setCached(merged);
    return merged;
  }

  async function getSetting(key) {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('setting_value')
      .eq('setting_key', key)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return DEFAULT_VALUES[key] || null;
      throw error;
    }
    return data?.setting_value || DEFAULT_VALUES[key] || null;
  }

  async function saveSetting(key, value, optimisticData) {
    if (optimisticData) {
      const cached = getCached();
      if (cached) {
        cached[key] = { ...cached[key], ...value };
        setCached(cached);
      }
    }
    try {
      const { data, error } = await window.supabaseClient
        .rpc('upsert_setting', { p_key: key, p_value: value });
      if (error) {
        const { data: upsertData, error: upsertError } = await window.supabaseClient
          .from(TABLE)
          .upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' })
          .select()
          .single();
        if (upsertError) throw upsertError;
        clearCache();
        return upsertData;
      }
      clearCache();
      return data;
    } catch (err) {
      clearCache();
      throw err;
    }
  }

  async function bulkSave(settingsMap) {
    const results = {};
    for (const [key, value] of Object.entries(settingsMap)) {
      try {
        await saveSetting(key, value);
        results[key] = true;
      } catch (err) {
        console.error(`[SettingsAPI] Failed to save ${key}:`, err);
        results[key] = false;
      }
    }
    return results;
  }

  async function deleteSetting(key) {
    const { error } = await window.supabaseClient
      .from(TABLE)
      .delete()
      .eq('setting_key', key);
    if (error) throw error;
    return true;
  }

  async function uploadFile(file, folder) {
    const fileExt = file.name.split('.').pop();
    const filePath = folder + '/' + Date.now() + '.' + fileExt;
    const { error: uploadError } = await window.supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = window.supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);
    return publicUrl;
  }

  async function ensureBucket() {
    try {
      const { data: buckets } = await window.supabaseClient.storage.listBuckets();
      if (!buckets || !buckets.some(b => b.name === STORAGE_BUCKET)) {
        await window.supabaseClient.storage.createBucket(STORAGE_BUCKET, {
          public: true,
          fileSizeLimit: 5242880
        });
      }
    } catch (err) {
      console.warn('[SettingsAPI] Bucket setup:', err.message);
    }
  }

  return {
    getAllSettings,
    getAllSettingsWithDefaults,
    getSetting,
    saveSetting,
    bulkSave,
    deleteSetting,
    uploadFile,
    ensureBucket,
    subscribeToRealtime,
    unsubscribe,
    clearCache,
    getCached,
    DEFAULT_VALUES
  };
})();
