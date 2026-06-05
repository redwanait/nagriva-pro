/* ════════════════════════════════════════════════════════
   Nagriva — Automatic Notification Triggers
   notifications-triggers.js
   Creates notifications for system events using the API
════════════════════════════════════════════════════════ */

const NAGRIVA_NotificationTriggers = (() => {
  'use strict';

  /* ─── Deduplication cache ─── */
  const _recentKeys = new Set();
  let _dedupTimer = null;

  const DEDUP_WINDOW_MS = 5000;
  const MAX_CACHE_SIZE = 500;

  function _makeKey(userId, type, title) {
    return userId + '::' + type + '::' + title + '::' + Math.floor(Date.now() / DEDUP_WINDOW_MS);
  }

  function _isDuplicate(userId, type, title) {
    const key = _makeKey(userId, type, title);
    if (_recentKeys.has(key)) return true;

    _recentKeys.add(key);

    if (_recentKeys.size > MAX_CACHE_SIZE) {
      const first = _recentKeys.values().next().value;
      if (first) _recentKeys.delete(first);
    }

    if (!_dedupTimer) {
      _dedupTimer = setTimeout(() => {
        _recentKeys.clear();
        _dedupTimer = null;
      }, DEDUP_WINDOW_MS * 2);
    }

    return false;
  }

  /* ─── Fetch all admin user IDs ─── */
  async function _getAdminUserIds() {
    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('id')
        .eq('role', 'admin');
      if (error) throw error;
      return (data || []).map(p => p.id);
    } catch (err) {
      console.warn('[NotificationTriggers] Failed to fetch admin IDs:', err.message);
      return [];
    }
  }

  /* ─── Create notification (wraps API with dedup) ─── */
  async function _create(userId, type, title, message, link, metadata) {
    if (!userId) return null;
    if (_isDuplicate(userId, type, title)) return null;

    try {
      const payload = {
        user_id: userId,
        type: type,
        title: title,
        message: message || '',
        link: link || ''
      };
      if (metadata) payload.metadata = metadata;

      if (typeof NAGRIVA_NotificationsAPI !== 'undefined') {
        return await NAGRIVA_NotificationsAPI.createNotification(payload);
      }

      const { data, error } = await window.supabaseClient
        .from('notifications')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[NotificationTriggers] Create failed:', err.message);
      return null;
    }
  }

  /* ─── 1. New Order ─── */
  /* Called when a client submits an order or admin creates one for client */
  async function newOrder(order, userId) {
    if (!userId || !order) return null;

    const service = order.service_type || order.service || 'a service';
    const title = 'Order Submitted';
    const message = 'Your order for ' + service + ' has been received.';
    const link = '/pages/order-tracking.html?id=' + (order.id || order.orderId);
    const metadata = {
      trigger: 'new_order',
      order_id: order.id || order.orderId,
      service: service,
      project_title: order.project_title || order.projectTitle || ''
    };

    await _create(userId, 'new_order', title, message, link, metadata);

    /* Also notify all admins */
    const adminIds = await _getAdminUserIds();
    const adminTitle = 'New Order Received';
    const adminMessage = 'A new ' + service + ' order has been placed.';
    const adminMetadata = Object.assign({}, metadata, { recipient_role: 'admin' });

    await Promise.all(
      adminIds.map(adminId =>
        _create(adminId, 'new_order', adminTitle, adminMessage, link, adminMetadata)
      )
    );
  }

  /* ─── 2. Order Updated / Status Changed ─── */
  /* Called when an admin updates an order or its status */
  async function orderUpdated(order, userId, changeDescription) {
    if (!userId || !order) return null;

    const desc = changeDescription || 'Your order has been updated.';
    const service = order.service_type || order.service || 'Order';
    const title = 'Order Updated';
    const link = '/pages/order-tracking.html?id=' + (order.id || order.orderId);
    const metadata = {
      trigger: 'order_updated',
      order_id: order.id || order.orderId,
      service: service,
      change: desc
    };

    await _create(userId, 'order_updated', title, desc, link, metadata);
  }

  /* ─── 3. Status Changed (convenience wrapper) ─── */
  async function statusChanged(order, userId, newStatus) {
    if (!userId || !order) return null;

    const label = (typeof NAGRIVA_AdminOrders !== 'undefined' && NAGRIVA_AdminOrders.STATUS)
      ? (NAGRIVA_AdminOrders.STATUS[newStatus] && NAGRIVA_AdminOrders.STATUS[newStatus].label) || newStatus
      : newStatus;
    const service = order.service_type || order.service || 'Order';
    const title = 'Status Update';
    const message = service + ' status changed to ' + label;
    const link = '/pages/order-tracking.html?id=' + (order.id || order.orderId);
    const metadata = {
      trigger: 'order_updated',
      order_id: order.id || order.orderId,
      status: newStatus,
      status_label: label
    };

    await _create(userId, 'order_updated', title, message, link, metadata);
  }

  /* ─── 4. New Client Registered ─── */
  /* Called after a new user signs up */
  async function newClient(user) {
    if (!user) return null;

    const name = user.user_metadata?.full_name || user.email || 'A new user';
    const userId = user.id;

    /* Notify all admins */
    const adminIds = await _getAdminUserIds();
    if (adminIds.length === 0) return null;

    const title = 'New Client Registered';
    const message = name + ' has joined Nagriva.';
    const link = '/pages/dashboard.html';
    const metadata = {
      trigger: 'new_client',
      user_id: userId,
      user_name: name,
      user_email: user.email || ''
    };

    await Promise.all(
      adminIds.map(adminId =>
        _create(adminId, 'new_client', title, message, link, metadata)
      )
    );
  }

  /* ─── 5. Admin Action ─── */
  /* Generic notification for admin-triggered events */
  async function adminAction(targetUserId, title, message, link, extraMeta) {
    if (!targetUserId || !title) return null;

    const metadata = Object.assign({
      trigger: 'admin_action',
    }, extraMeta || {});

    await _create(targetUserId, 'admin_action', title, message, link, metadata);
  }

  /* ─── Notify all admins of an event ─── */
  async function notifyAdmins(title, message, link, extraMeta) {
    if (!title) return;

    const adminIds = await _getAdminUserIds();
    if (adminIds.length === 0) return;

    const metadata = Object.assign({
      trigger: 'admin_action',
    }, extraMeta || {});

    await Promise.all(
      adminIds.map(adminId =>
        _create(adminId, 'admin_action', title, message, link, metadata)
      )
    );
  }

  /* ─── Cleanup ─── */
  function destroy() {
    if (_dedupTimer) {
      clearTimeout(_dedupTimer);
      _dedupTimer = null;
    }
    _recentKeys.clear();
  }

  return {
    newOrder: newOrder,
    orderUpdated: orderUpdated,
    statusChanged: statusChanged,
    newClient: newClient,
    adminAction: adminAction,
    notifyAdmins: notifyAdmins,
    destroy: destroy
  };
})();
