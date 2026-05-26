const NAGRIVA_ActivityLogsAPI = (() => {
  'use strict';

  const TABLE = 'activity_log';
  const DEFAULT_PER_PAGE = 50;
  const MAX_PER_PAGE = 200;

  function validatePage(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  }

  function validatePerPage(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), MAX_PER_PAGE) : DEFAULT_PER_PAGE;
  }

  async function fetchLogs(options) {
    options = options || {};

    const page = validatePage(options.page || 1);
    const perPage = validatePerPage(options.per_page || DEFAULT_PER_PAGE);
    const offset = (page - 1) * perPage;
    const sortField = options.sort_by || 'created_at';
    const sortAsc = options.sort_asc === true;

    let query = window.supabaseClient
      .from(TABLE)
      .select('*', { count: 'exact' });

    if (options.action) {
      query = query.eq('action', options.action);
    }

    if (options.user_id) {
      query = query.eq('user_id', options.user_id);
    }

    if (options.order_id) {
      query = query.eq('order_id', options.order_id);
    }

    if (options.search) {
      const term = `%${options.search}%`;
      query = query.or(`description.ilike.${term},action.ilike.${term}`);
    }

    if (options.date_from) {
      query = query.gte('created_at', options.date_from);
    }

    if (options.date_to) {
      query = query.lte('created_at', options.date_to);
    }

    if (options.metadata && typeof options.metadata === 'object') {
      Object.keys(options.metadata).forEach(key => {
        const val = options.metadata[key];
        if (val !== undefined && val !== null) {
          query = query.eq(key, val);
        }
      });
    }

    if (sortAsc) {
      query = query.order(sortField, { ascending: true });
    } else {
      query = query.order(sortField, { ascending: false });
    }

    query = query.range(offset, offset + perPage - 1);

    try {
      const { data, error, count } = await query;
      if (error) throw error;
      return {
        data: (data || []).map(a => ({
          ...a,
          actorName: 'System'
        })),
        count: count || 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count || 0) / perPage)
      };
    } catch (err) {
      console.error('[ActivityLogsAPI] fetchLogs error:', err.message || err);
      return {
        data: [],
        count: 0,
        page,
        per_page: perPage,
        total_pages: 0
      };
    }
  }

  async function createLog(data) {
    if (!data || !data.action) {
      throw new Error('Activity log requires at least an action field.');
    }

    const payload = {
      order_id: data.order_id,
      user_id: data.user_id || null,
      action: data.action,
      description: data.description || null
    };

    try {
      const { data: result, error } = await window.supabaseClient
        .from(TABLE)
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      if (result) {
        result.actorName = 'System';
      }

      return result;
    } catch (err) {
      console.error('[ActivityLogsAPI] createLog error:', err.message || err);
      return null;
    }
  }

  async function fetchUserLogs(userId, options) {
    if (!userId) throw new Error('User ID is required.');

    return fetchLogs({
      ...(options || {}),
      user_id: userId
    });
  }

  async function fetchEntityLogs(entityType, entityId, options) {
    if (!entityType || !entityId) {
      throw new Error('Both entityType and entityId are required.');
    }

    const fieldMap = {
      order: 'order_id'
    };

    const field = fieldMap[entityType];
    if (!field) {
      throw new Error(`Unsupported entity type: "${entityType}". Supported: ${Object.keys(fieldMap).join(', ')}`);
    }

    return fetchLogs({
      ...(options || {}),
      metadata: {
        [field]: entityId
      }
    });
  }

  return {
    fetchLogs,
    createLog,
    fetchUserLogs,
    fetchEntityLogs
  };
})();
