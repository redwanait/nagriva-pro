const NAGRIVA_OrdersAPI = (() => {
  'use strict';

  const TABLE = 'orders';

  /* ─── Admin: Fetch All Orders with relational client join ─── */
  async function fetchAllOrders() {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /* ─── Admin: Lightweight order list (files/messages/clients pages) ─── */
  async function fetchOrdersList(fields) {
    const cols = fields || 'id, client_name, project_title, order_number, service, created_at';
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select(cols)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /* ─── Admin: Orders for client stats ─── */
  async function fetchOrdersForClientStats() {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('id, user_id, client_id, budget, status, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /* ─── Dashboard: All statuses only ─── */
  async function fetchAllStatuses() {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('status');
    if (error) throw error;
    return data || [];
  }

  /* ─── Get single order (optionally scoped to user) ─── */
  async function getOrderById(orderId, userId) {
    let query = window.supabaseClient
      .from(TABLE)
      .select('*')
      .eq('id', orderId);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  }

  /* ─── Get user's own orders ─── */
  async function getUserOrders(userId) {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /* ─── Create order ─── */
  async function createOrder(payload) {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /* ─── Update order ─── */
  async function updateOrder(id, payload) {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /* ─── Delete order ─── */
  async function deleteOrder(id) {
    if (!id) {
      const err = new Error('Cannot delete order: missing order ID.');
      err.code = 'INVALID_ID';
      console.error('[OrdersAPI] deleteOrder called without valid id:', id);
      throw err;
    }

    console.debug('[OrdersAPI] deleteOrder — deleting order id:', id);
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[OrdersAPI] deleteOrder — Supabase error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status: error.status,
        statusText: error.statusText,
      });
      throw error;
    }

    console.debug('[OrdersAPI] deleteOrder — delete executed successfully. Response data:', data);
    return true;
  }

  /* ─── Link orphan orders to user by email ─── */
  async function linkOrphanOrders(user) {
    if (!user || !user.email) return [];
    const { data: orphans, error } = await window.supabaseClient
      .from(TABLE)
      .select('id')
      .is('user_id', null)
      .eq('user_email', user.email);
    if (error) throw error;
    if (orphans && orphans.length > 0) {
      const ids = orphans.map(o => o.id);
      await window.supabaseClient
        .from(TABLE)
        .update({ user_id: user.id })
        .in('id', ids);
    }
    return orphans || [];
  }

  /* ─── Client dashboard stats ─── */
  async function getUserDashboardStats(userId) {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('status')
      .eq('user_id', userId);
    if (error) throw error;
    const orders = data || [];
    return {
      total: orders.length,
      active: orders.filter(o => o.status === 'in_progress' || o.status === 'review').length,
      completed: orders.filter(o => o.status === 'delivered').length,
      pending: orders.filter(o => o.status === 'pending').length
    };
  }

  /* ─── Admin dashboard stats ─── */
  async function getAdminDashboardStats() {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('status');
    if (error) throw error;
    const orders = data || [];
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      in_progress: orders.filter(o => o.status === 'in_progress').length,
      review: orders.filter(o => o.status === 'review').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };
  }

  /* ─── Get user's order IDs for activity queries ─── */
  async function getUserOrderIds(userId) {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('id')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map(o => o.id);
  }

  return {
    fetchAllOrders,
    fetchOrdersList,
    fetchOrdersForClientStats,
    fetchAllStatuses,
    getOrderById,
    getUserOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    linkOrphanOrders,
    getUserDashboardStats,
    getAdminDashboardStats,
    getUserOrderIds,
  };
})();
