const NAGRIVA_ActivityLogsTrigger = (() => {
  'use strict';

  const _recentKeys = new Set();
  let _dedupTimer = null;

  const DEDUP_WINDOW_MS = 4000;
  const MAX_CACHE_SIZE = 300;

  function _makeDedupKey(action, orderId, userId) {
    return action + '::' + (orderId || '') + '::' + (userId || '');
  }

  function _isDuplicate(action, orderId, userId) {
    const key = _makeDedupKey(action, orderId, userId);
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

  function _encodeEntityMeta(description, meta) {
    if (!meta) return description || '';
    const eType = meta.entityType || meta.entity_type;
    const eId = meta.entityId || meta.entity_id;
    if (eType && eId) {
      return (description || '') + ' [' + eType + ':' + eId + ']';
    }
    return description || '';
  }

  async function _createLog(action, userId, orderId, description, meta) {
    if (!action) return null;
    if (!orderId && !userId) return null;
    if (_isDuplicate(action, orderId, userId)) return null;

    try {
      const finalDesc = _encodeEntityMeta(description, meta);

      if (typeof NAGRIVA_ActivityLogsAPI !== 'undefined') {
        return await NAGRIVA_ActivityLogsAPI.createLog({
          action: action,
          user_id: userId,
          order_id: orderId,
          description: finalDesc
        });
      }

      const payload = {
        order_id: orderId,
        user_id: userId || null,
        action: action,
        description: finalDesc || null
      };

      const { data, error } = await window.supabaseClient
        .from('activity_log')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[ActivityLogsTrigger] Create failed:', err.message);
      return null;
    }
  }

  async function orderCreated(order, userId) {
    if (!order) return null;

    const orderId = order.id || order.orderId;
    const service = order.service_type || order.service || 'a service';
    const projectTitle = order.project_title || order.projectTitle || '';
    const desc = 'Order created for ' + service + (projectTitle ? ' — ' + projectTitle : '');
    const meta = {
      entityType: 'order',
      entityId: orderId,
      service: service,
      projectTitle: projectTitle
    };

    await _createLog('order_created', userId, orderId, desc, meta);

    const adminIds = await _getAdminUserIds();
    if (adminIds.length > 0) {
      const adminDesc = 'New order created for ' + service + (projectTitle ? ' — ' + projectTitle : '');
      await Promise.all(
        adminIds.map(adminId =>
          _createLog('order_created', adminId, orderId, adminDesc, meta)
        )
      );
    }
  }

  async function orderUpdated(order, userId, changeDescription) {
    if (!order || !userId) return null;

    const orderId = order.id || order.orderId;
    const desc = changeDescription || 'Order updated';
    const meta = {
      entityType: 'order',
      entityId: orderId,
      change: changeDescription || ''
    };

    return await _createLog('order_updated', userId, orderId, desc, meta);
  }

  async function statusChanged(order, userId, newStatus) {
    if (!order || !userId || !newStatus) return null;

    const orderId = order.id || order.orderId;
    const label = (typeof NAGRIVA_AdminOrders !== 'undefined' && NAGRIVA_AdminOrders.STATUS)
      ? (NAGRIVA_AdminOrders.STATUS[newStatus] && NAGRIVA_AdminOrders.STATUS[newStatus].label) || newStatus
      : newStatus;
    const service = order.service_type || order.service || 'Order';
    const desc = service + ' status changed to ' + label;
    const meta = {
      entityType: 'order',
      entityId: orderId,
      status: newStatus,
      statusLabel: label
    };

    return await _createLog('order_updated', userId, orderId, desc, meta);
  }

  async function clientRegistered(user) {
    if (!user) return null;

    const userId = user.id;
    const name = user.user_metadata?.full_name || user.email || 'A new user';
    const desc = name + ' has registered as a new client';
    const meta = {
      entityType: 'user',
      entityId: userId,
      userName: name,
      userEmail: user.email || ''
    };

    const adminIds = await _getAdminUserIds();
    if (adminIds.length > 0) {
      await Promise.all(
        adminIds.map(adminId =>
          _createLog('client_registered', adminId, null, desc, meta)
        )
      );
    }

    return await _createLog('client_registered', userId, null, desc, meta);
  }

  async function profileUpdated(userId, description, meta) {
    if (!userId) return null;

    const desc = description || 'Profile updated';
    const entityMeta = Object.assign({
      entityType: 'user',
      entityId: userId
    }, meta || {});

    return await _createLog('profile_updated', userId, null, desc, entityMeta);
  }

  async function notificationSent(notification, userId) {
    if (!notification || !userId) return null;

    const notifId = notification.id;
    const title = notification.title || 'Notification';
    const desc = 'Notification sent: ' + title;
    const meta = {
      entityType: 'notification',
      entityId: notifId,
      notificationType: notification.type || '',
      notificationTitle: title
    };

    return await _createLog('notification_sent', userId, null, desc, meta);
  }

  async function adminAction(userId, description, meta) {
    if (!userId || !description) return null;

    const entityMeta = Object.assign({
      entityType: 'admin_action'
    }, meta || {});

    return await _createLog('admin_action', userId, null, description, entityMeta);
  }

  async function _getAdminUserIds() {
    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('id')
        .eq('role', 'admin');
      if (error) throw error;
      return (data || []).map(p => p.id);
    } catch (err) {
      console.warn('[ActivityLogsTrigger] Failed to fetch admin IDs:', err.message);
      return [];
    }
  }

  function destroy() {
    if (_dedupTimer) {
      clearTimeout(_dedupTimer);
      _dedupTimer = null;
    }
    _recentKeys.clear();
  }

  return {
    orderCreated,
    orderUpdated,
    statusChanged,
    clientRegistered,
    profileUpdated,
    notificationSent,
    adminAction,
    destroy
  };
})();
