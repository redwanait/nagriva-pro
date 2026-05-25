/* ════════════════════════════════════════════════════════
   NAGRIVA — Services API
   Supabase queries for the services table
   ════════════════════════════════════════════════════════ */

const NAGRIVA_ServicesAPI = (() => {
  const TABLE = 'services';
  const SELECT_FIELDS = 'id, title, slug, category, short_description, description, meta_title, meta_description, featured, status, created_at, updated_at';

  function handleError(error) {
    console.error('[ServicesAPI] Error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }

  async function fetchAllServices() {
    try {
      const { data, error } = await window.supabaseClient
        .from(TABLE)
        .select(SELECT_FIELDS)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      handleError(err);
    }
  }

  async function fetchServiceById(id) {
    try {
      const { data, error } = await window.supabaseClient
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      handleError(err);
    }
  }

  async function createService(payload) {
    try {
      const { data, error } = await window.supabaseClient
        .from(TABLE)
        .insert(payload)
        .select(SELECT_FIELDS)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      handleError(err);
    }
  }

  async function updateService(id, payload) {
    try {
      const { data, error } = await window.supabaseClient
        .from(TABLE)
        .update(payload)
        .eq('id', id)
        .select(SELECT_FIELDS)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      handleError(err);
    }
  }

  async function deleteService(id) {
    try {
      const { error } = await window.supabaseClient
        .from(TABLE)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      handleError(err);
    }
  }

  async function getCategories() {
    try {
      const { data, error } = await window.supabaseClient
        .from(TABLE)
        .select('category')
        .neq('category', '')
        .order('category');
      if (error) throw error;
      const categories = [...new Set((data || []).map(r => r.category).filter(Boolean))];
      return categories.sort();
    } catch (err) {
      handleError(err);
    }
  }

  return {
    fetchAllServices,
    fetchServiceById,
    createService,
    updateService,
    deleteService,
    getCategories
  };
})();
