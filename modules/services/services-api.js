/* ════════════════════════════════════════════════════════
   NAGRIVA — Services API
   Supabase queries for the services table
   All write operations require admin role verification.
   ════════════════════════════════════════════════════════ */

const NAGRIVA_ServicesAPI = (() => {
  const TABLE = 'services';
  const SELECT_FIELDS = 'id, title, slug, category, short_description, full_description, meta_title, meta_description, image, featured, status, created_at, updated_at';

  function handleError(error, context = {}) {
    console.error('[ServicesAPI] Error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      status: error.status,
      statusText: error.statusText,
      ...context
    });
    throw error;
  }

  /* ─── Verify current user is admin ─── */
  async function _requireAdmin() {
    try {
      var { data: { session } } = await window.supabaseClient.auth.getSession();
      if (!session) throw new Error('Authentication required');
      var { data: profile } = await window.supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (!profile || profile.role !== 'admin') throw new Error('Admin access required');
      return true;
    } catch (err) {
      if (err.message === 'Authentication required' || err.message === 'Admin access required') throw err;
      throw new Error('Admin access required');
    }
  }

  async function fetchAllServices() {
    try {
      const { data, error } = await window.supabaseClient
        .from(TABLE)
        .select(SELECT_FIELDS)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[ServicesAPI] fetchAllServices error:', JSON.stringify(error, null, 2));
        throw error;
      }
      return data || [];
    } catch (err) {
      handleError(err, { operation: 'fetchAllServices' });
    }
  }

  async function fetchServiceById(id) {
    try {
      const { data, error } = await window.supabaseClient
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error('[ServicesAPI] fetchServiceById error:', JSON.stringify(error, null, 2));
        throw error;
      }
      return data;
    } catch (err) {
      handleError(err, { operation: 'fetchServiceById', id });
    }
  }

  async function createService(payload) {
    await _requireAdmin();
    try {
      console.log('[ServicesAPI] createService payload:', JSON.stringify(payload, null, 2));
      const { data, error } = await window.supabaseClient
        .from(TABLE)
        .insert(payload)
        .select(SELECT_FIELDS)
        .single();
      if (error) {
        console.error('[ServicesAPI] Supabase insert error response:', JSON.stringify(error, null, 2));
        throw error;
      }
      console.log('[ServicesAPI] createService success:', JSON.stringify(data, null, 2));
      return data;
    } catch (err) {
      handleError(err, { operation: 'createService', payload });
    }
  }

  async function updateService(id, payload) {
    await _requireAdmin();
    try {
      console.log('[ServicesAPI] updateService payload:', JSON.stringify(payload, null, 2));
      const { data, error } = await window.supabaseClient
        .from(TABLE)
        .update(payload)
        .eq('id', id)
        .select(SELECT_FIELDS)
        .single();
      if (error) {
        console.error('[ServicesAPI] Supabase update error:', JSON.stringify(error, null, 2));
        throw error;
      }
      console.log('[ServicesAPI] updateService success:', JSON.stringify(data, null, 2));
      return data;
    } catch (err) {
      handleError(err, { operation: 'updateService', id, payload });
    }
  }

  async function deleteService(id) {
    await _requireAdmin();
    try {
      console.log('[ServicesAPI] deleteService id:', id);
      const { error } = await window.supabaseClient
        .from(TABLE)
        .delete()
        .eq('id', id);
      if (error) {
        console.error('[ServicesAPI] delete error:', JSON.stringify(error, null, 2));
        throw error;
      }
      console.log('[ServicesAPI] deleteService success:', id);
      return true;
    } catch (err) {
      handleError(err, { operation: 'deleteService', id });
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
