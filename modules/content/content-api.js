/* ════════════════════════════════════════════════════════
   NAGRIVA — Content Settings API
   CRUD for dynamic content management.
   ════════════════════════════════════════════════════════ */

'use strict';

const NAGRIVA_ContentAPI = (() => {
  const TABLE = 'content_settings';

  async function getAllContent() {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('content_key, content_value')
      .order('content_key', { ascending: true });
    if (error) throw error;
    const map = {};
    (data || []).forEach(row => {
      map[row.content_key] = row.content_value;
    });
    return map;
  }

  async function getContent(key) {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('content_value')
      .eq('content_key', key)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data?.content_value || null;
  }

  async function saveContent(key, value) {
    const { data, error } = await window.supabaseClient
      .rpc('upsert_content', { p_key: key, p_value: String(value) });
    if (error) {
      const { data: upsertData, error: upsertError } = await window.supabaseClient
        .from(TABLE)
        .upsert({ content_key: key, content_value: String(value) }, { onConflict: 'content_key' })
        .select()
        .single();
      if (upsertError) throw upsertError;
      return upsertData;
    }
    return data;
  }

  async function bulkSave(contentMap) {
    const results = {};
    for (const [key, value] of Object.entries(contentMap)) {
      try {
        await saveContent(key, String(value));
        results[key] = true;
      } catch (err) {
        console.error('[ContentAPI] Failed to save', key, err);
        results[key] = false;
      }
    }
    return results;
  }

  async function deleteContent(key) {
    const { error } = await window.supabaseClient
      .from(TABLE)
      .delete()
      .eq('content_key', key);
    if (error) throw error;
    return true;
  }

  return {
    getAllContent,
    getContent,
    saveContent,
    bulkSave,
    deleteContent
  };
})();
