const NAGRIVA_InvoiceNotifications = (() => {
  'use strict';

  const _recentKeys = new Set();
  let _dedupTimer = null;

  const DEDUP_WINDOW_MS = 5000;
  const MAX_CACHE_SIZE = 500;

  function _makeKey(userId, type, invoiceId) {
    return userId + '::' + type + '::' + invoiceId + '::' + Math.floor(Date.now() / DEDUP_WINDOW_MS);
  }

  function _isDuplicate(userId, type, invoiceId) {
    const key = _makeKey(userId, type, invoiceId);
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

  async function _getAdminUserIds() {
    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('id')
        .eq('role', 'admin');
      if (error) throw error;
      return (data || []).map(p => p.id);
    } catch (err) {
      console.warn('[InvoiceNotifications] Failed to fetch admin IDs:', err.message);
      return [];
    }
  }

  async function _create(userId, type, title, message, link, metadata) {
    if (!userId) return null;
    if (_isDuplicate(userId, type, (metadata && (metadata.invoice_id || '')) || title)) return null;

    try {
      const payload = {
        user_id: userId,
        type: type,
        title: title,
        message: message || '',
        link: link || '',
        metadata: metadata || {}
      };

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
      console.warn('[InvoiceNotifications] Create failed:', err.message);
      return null;
    }
  }

  async function invoiceCreated(invoice, userId) {
    if (!invoice || !userId) return null;

    const invNum = invoice.invoiceNumber || invoice.invoice_number || 'N/A';
    const total = invoice.total || invoice.amount || 0;
    const formattedTotal = '$' + Number(total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const title = 'Invoice Created';
    const message = 'Invoice ' + invNum + ' for ' + formattedTotal + ' has been created.';
    const link = '/pages/admin-dashboard.html?page=invoices';
    const metadata = {
      trigger: 'invoice_created',
      invoice_id: invoice.id,
      invoice_number: invNum,
      amount: total,
      client_id: invoice.clientId || invoice.client_id
    };

    await _create(userId, 'invoice_created', title, message, link, metadata);

    const adminIds = await _getAdminUserIds();
    const adminTitle = 'New Invoice Created';
    const adminMessage = 'Invoice ' + invNum + ' for ' + formattedTotal + ' has been created.';
    const adminMetadata = Object.assign({}, metadata, { recipient_role: 'admin' });

    await Promise.all(
      adminIds.map(adminId =>
        _create(adminId, 'invoice_created', adminTitle, adminMessage, link, adminMetadata)
      )
    );
  }

  async function invoiceStatusChanged(invoice, userId, oldStatus, newStatus) {
    if (!invoice || !userId) return null;

    const invNum = invoice.invoiceNumber || invoice.invoice_number || 'N/A';
    const statusLabel = (typeof NAGRIVA_AdminInvoices !== 'undefined' && NAGRIVA_AdminInvoices.STATUS)
      ? (NAGRIVA_AdminInvoices.STATUS[newStatus] && NAGRIVA_AdminInvoices.STATUS[newStatus].label) || newStatus
      : newStatus;
    const title = 'Invoice ' + statusLabel;
    const message = 'Invoice ' + invNum + ' status changed to ' + statusLabel + (oldStatus ? ' (was ' + oldStatus + ')' : '');
    const link = '/pages/admin-dashboard.html?page=invoices';
    const metadata = {
      trigger: 'invoice_updated',
      invoice_id: invoice.id,
      invoice_number: invNum,
      old_status: oldStatus,
      new_status: newStatus,
      client_id: invoice.clientId || invoice.client_id
    };

    await _create(userId, 'invoice_updated', title, message, link, metadata);

    const adminIds = await _getAdminUserIds();
    const adminTitle = 'Invoice ' + statusLabel;
    const adminMessage = 'Invoice ' + invNum + ' status changed to ' + statusLabel;
    const adminMetadata = Object.assign({}, metadata, { recipient_role: 'admin' });

    await Promise.all(
      adminIds.map(adminId =>
        _create(adminId, 'invoice_updated', adminTitle, adminMessage, link, adminMetadata)
      )
    );
  }

  async function invoicePaid(invoice, userId) {
    if (!invoice || !userId) return null;

    const invNum = invoice.invoiceNumber || invoice.invoice_number || 'N/A';
    const total = invoice.total || invoice.amount || 0;
    const formattedTotal = '$' + Number(total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const title = 'Invoice Paid';
    const message = 'Invoice ' + invNum + ' for ' + formattedTotal + ' has been paid.';
    const link = '/pages/admin-dashboard.html?page=invoices';
    const metadata = {
      trigger: 'invoice_paid',
      invoice_id: invoice.id,
      invoice_number: invNum,
      amount: total,
      client_id: invoice.clientId || invoice.client_id
    };

    await _create(userId, 'invoice_paid', title, message, link, metadata);

    const adminIds = await _getAdminUserIds();
    const adminTitle = 'Invoice Paid';
    const adminMessage = 'Invoice ' + invNum + ' for ' + formattedTotal + ' has been paid.';
    const adminMetadata = Object.assign({}, metadata, { recipient_role: 'admin' });

    await Promise.all(
      adminIds.map(adminId =>
        _create(adminId, 'invoice_paid', adminTitle, adminMessage, link, adminMetadata)
      )
    );
  }

  async function invoiceOverdue(invoice, userId) {
    if (!invoice || !userId) return null;

    const invNum = invoice.invoiceNumber || invoice.invoice_number || 'N/A';
    const total = invoice.total || invoice.amount || 0;
    const formattedTotal = '$' + Number(total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const title = 'Invoice Overdue';
    const message = 'Invoice ' + invNum + ' for ' + formattedTotal + ' is now overdue.';
    const link = '/pages/admin-dashboard.html?page=invoices';
    const metadata = {
      trigger: 'invoice_overdue',
      invoice_id: invoice.id,
      invoice_number: invNum,
      amount: total,
      client_id: invoice.clientId || invoice.client_id
    };

    await _create(userId, 'invoice_overdue', title, message, link, metadata);

    const adminIds = await _getAdminUserIds();
    const adminTitle = 'Invoice Overdue';
    const adminMessage = 'Invoice ' + invNum + ' for ' + formattedTotal + ' is overdue.';
    const adminMetadata = Object.assign({}, metadata, { recipient_role: 'admin' });

    await Promise.all(
      adminIds.map(adminId =>
        _create(adminId, 'invoice_overdue', adminTitle, adminMessage, link, adminMetadata)
      )
    );
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
    invoiceStatusChanged,
    invoicePaid,
    invoiceOverdue,
    destroy
  };
})();
