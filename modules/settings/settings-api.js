const NAGRIVA_SettingsAPI = (() => {
  'use strict';

  const TABLE = 'settings';
  const STORAGE_BUCKET = 'settings';

  const DEFAULT_VALUES = {
    general: {
      company_name: 'NAGRIVA',
      logo_url: '',
      favicon_url: '',
      support_email: 'hello@nagriva.com',
      whatsapp_number: '',
      timezone: 'UTC',
      language: 'en'
    },
    branding: {
      primary_color: '#00f5c4',
      secondary_color: '#00c2a8',
      glow_intensity: 100,
      border_radius: 22,
      theme_preset: 'dark-emerald'
    },
    support_chat: {
      chat_enabled: true,
      chat_online: true,
      chat_welcome_message: 'Hello! How can we help you today?',
      chat_auto_reply: 'Thank you for your message. Our team will get back to you shortly.',
      chat_typing_indicator: true,
      chat_avatar_url: ''
    },
    orders: {
      default_order_status: 'pending',
      auto_generate_order_ids: true,
      revisions_limit: 3,
      deadline_default_days: 14
    },
    payments: {
      currency: 'USD',
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
      meta_title: 'NAGRIVA — Premium Digital Agency',
      meta_description: 'Premium digital agency offering web design, SEO, branding, AI automation, and social media management services.',
      og_image_url: '',
      google_analytics_id: ''
    },
    ai_assistant: {
      ai_assistant_name: 'Nova',
      ai_personality_prompt: 'You are a helpful, professional digital agency assistant. Be concise, friendly, and knowledgeable about NAGRIVA services.',
      ai_suggestions_enabled: true,
      smart_reply_enabled: true
    }
  };

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

  async function getAllSettingsWithDefaults() {
    const raw = await getAllSettings();
    const merged = {};
    Object.keys(DEFAULT_VALUES).forEach(key => {
      merged[key] = { ...DEFAULT_VALUES[key], ...(raw[key] || {}) };
    });
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

  async function saveSetting(key, value) {
    const { data, error } = await window.supabaseClient
      .rpc('upsert_setting', { p_key: key, p_value: value });
    if (error) {
      const { data: upsertData, error: upsertError } = await window.supabaseClient
        .from(TABLE)
        .upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' })
        .select()
        .single();
      if (upsertError) throw upsertError;
      return upsertData;
    }
    return data;
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
    DEFAULT_VALUES
  };
})();
