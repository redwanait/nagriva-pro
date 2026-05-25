const NAGRIVA_InvoiceActivity = (() => {
  'use strict';

  const _recentKeys = new Set();
  let _dedupTimer = null;

  const DEDUP_WINDOW_MS = 4000;
  const MAX_CACHE_SIZE = 300;

  function _makeDedupKey(action, invoiceId, userId) {
    return action + '::' + (invoiceId || '') + '::' + (userId || '');
  }

  function _isDuplicate(action, invoiceId, userId) {
    const key = _makeDedupKey(action, invoiceId, userId);
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

  async function _createLog(action, userId, orderId, clientId, description) {
    if (!action) return null;
    if (!orderId && !clientId && !userId) return null;
    if (_isDuplicate(action, orderId, userId)) return null;

    try {
      const payload = {
        order_id: orderId || null,
        user_id: userId || null,
        action: action,
        description: description || null
      };

      if (typeof NAGRIVA_ActivityLogsAPI !== 'undefined') {
        const result = await NAGRIVA_ActivityLogsAPI.createLog(payload);
        if (result && typeof NAGRIVA_ActivityLogsRealtime !== 'undefined') {
          NAGRIVA_ActivityLogsRealtime.optimisticAdd(result);
        }
        return result;
      }

      const { data, error } = await window.supabaseClient
        .from('activity_log')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      if (data && typeof NAGRIVA_ActivityLogsRealtime !== 'undefined') {
        NAGRIVA_ActivityLogsRealtime.optimisticAdd(data);
      }

      return data;
    } catch (err) {
      console.warn('[InvoiceActivity] Create failed:', err.message);
      return null;
    }
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
      console.warn('[InvoiceActivity] Failed to fetch admin IDs:', err.message);
      return [];
    }
  }

  async function invoiceCreated(invoice, userId) {
    if (!invoice || !userId) return null;

    const invNum = invoice.invoiceNumber || invoice.invoice_number || 'N/A';
    const total = invoice.total || invoice.amount || 0;
    const formattedTotal = '$' + Number(total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const orderId = invoice.orderId || invoice.order_id || null;
    const clientId = invoice.clientId || invoice.client_id || null;
    const desc = 'Invoice ' + invNum + ' created for ' + formattedTotal;

    await _createLog('invoice_created', userId, orderId, clientId, desc);

    const adminIds = await _getAdminUserIds();
    if (adminIds.length > 0) {
      const adminDesc = 'Invoice ' + invNum + ' created for ' + formattedTotal;
      await Promise.all(
        adminIds.map(adminId =>
          _createLog('invoice_created', adminId, orderId, clientId, adminDesc)
        )
      );
    }
  }

  async function invoiceUpdated(invoice, userId, description) {
    if (!invoice || !userId) return null;

    const invNum = invoice.invoiceNumber || invoice.invoice_number || 'N/A';
    const orderId = invoice.orderId || invoice.order_id || null;
    const clientId = invoice.clientId || invoice.client_id || null;
    const desc = description || 'Invoice ' + invNum + ' updated';

    return await _createLog('invoice_updated', userId, orderId, clientId, desc);
  }

  async function invoicePaid(invoice, userId) {
    if (!invoice || !userId) return null;

    const invNum = invoice.invoiceNumber || invoice.invoice_number || 'N/A';
    const total = invoice.total || invoice.amount || 0;
    const formattedTotal = '$' + Number(total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const orderId = invoice.orderId || invoice.order_id || null;
    const clientId = invoice.clientId || invoice.client_id || null;
    const desc = 'Invoice ' + invNum + ' paid — ' + formattedTotal;

    await _createLog('invoice_paid', userId, orderId, clientId, desc);

    const adminIds = await _getAdminUserIds();
    if (adminIds.length > 0) {
      const adminDesc = 'Invoice ' + invNum + ' paid — ' + formattedTotal;
      await Promise.all(
        adminIds.map(adminId =>
          _createLog('invoice_paid', adminId, orderId, clientId, adminDesc)
        )
      );
    }
  }

  async function invoiceDeleted(invoice, userId) {
    if (!invoice || !userId) return null;

    const invNum = invoice.invoiceNumber || invoice.invoice_number || 'N/A';
    const orderId = invoice.orderId || invoice.order_id || null;
    const clientId = invoice.clientId || invoice.client_id || null;
    const desc = 'Invoice ' + invNum + ' deleted';

    await _createLog('invoice_deleted', userId, orderId, clientId, desc);

    const adminIds = await _getAdminUserIds();
    if (adminIds.length > 0) {
      const adminDesc = 'Invoice ' + invNum + ' deleted';
      await Promise.all(
        adminIds.map(adminId =>
          _createLog('invoice_deleted', adminId, orderId, clientId, adminDesc)
        )
      );
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
    invoiceCreated,
    invoiceUpdated,
    invoicePaid,
    invoiceDeleted,
    destroy
  };
})();
