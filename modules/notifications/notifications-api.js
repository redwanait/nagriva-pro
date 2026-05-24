const NAGRIVA_NotificationsAPI = (() => {
  'use strict';

  const TABLE = 'notifications';

  async function fetchNotifications(userId) {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function getUnreadCount(userId) {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return data ? data.length : 0;
  }

  async function getNotificationById(notificationId) {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('*')
      .eq('id', notificationId)
      .single();
    if (error) throw error;
    return data;
  }

  async function createNotification(data) {
    const { data: result, error } = await window.supabaseClient
      .from(TABLE)
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async function markAsRead(notificationId) {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function markAllAsRead(userId) {
    const { error } = await window.supabaseClient
      .from(TABLE)
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return true;
  }

  async function deleteNotification(notificationId) {
    const { error } = await window.supabaseClient
      .from(TABLE)
      .delete()
      .eq('id', notificationId);
    if (error) throw error;
    return true;
  }

  return {
    fetchNotifications,
    getUnreadCount,
    getNotificationById,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
})();
