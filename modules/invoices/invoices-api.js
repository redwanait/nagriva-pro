const NAGRIVA_InvoicesAPI = (() => {
  'use strict';

  const TABLE = 'invoices';
  const DEFAULT_PER_PAGE = 20;
  const MAX_PER_PAGE = 100;

  const CLIENT_SELECT = `
    id,
    full_name,
    email,
    avatar_url
  `;

  const ORDER_SELECT = `
    id,
    order_number,
    service_type,
    project_name,
    status,
    budget,
    created_at
  `;

  const INVOICE_SELECT = `
    *,
    client:profiles(${CLIENT_SELECT}),
    order:orders(${ORDER_SELECT})
  `;

  function validatePage(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  }

  function validatePerPage(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), MAX_PER_PAGE) : DEFAULT_PER_PAGE;
  }

  async function fetchInvoices(options) {
    options = options || {};

    const page = validatePage(options.page || 1);
    const perPage = validatePerPage(options.per_page || DEFAULT_PER_PAGE);
    const offset = (page - 1) * perPage;

    let query = window.supabaseClient
      .from(TABLE)
      .select(INVOICE_SELECT, { count: 'exact' });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.client_id) {
      query = query.eq('client_id', options.client_id);
    }

    if (options.order_id) {
      query = query.eq('order_id', options.order_id);
    }

    if (options.search) {
      const term = `%${options.search}%`;
      query = query.or(`invoice_number.ilike.${term},notes.ilike.${term}`);
    }

    if (options.date_from) {
      query = query.gte('issued_date', options.date_from);
    }

    if (options.date_to) {
      query = query.lte('issued_date', options.date_to);
    }

    if (options.due_from) {
      query = query.gte('due_date', options.due_from);
    }

    if (options.due_to) {
      query = query.lte('due_date', options.due_to);
    }

    if (options.metadata && typeof options.metadata === 'object') {
      Object.keys(options.metadata).forEach(key => {
        const val = options.metadata[key];
        if (val !== undefined && val !== null) {
          query = query.eq(key, val);
        }
      });
    }

    query = query.order('created_at', { ascending: false });

    query = query.range(offset, offset + perPage - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage)
    };
  }

  async function fetchInvoiceById(id) {
    if (!id) throw new Error('Invoice ID is required.');

    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select(INVOICE_SELECT)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async function createInvoice(data) {
    if (!data) throw new Error('Invoice data is required.');
    if (!data.order_id) throw new Error('Order ID is required.');
    if (!data.client_id) throw new Error('Client ID is required.');
    if (data.amount === undefined || data.amount === null) throw new Error('Amount is required.');
    if (!data.due_date) throw new Error('Due date is required.');

    const total = data.total || (data.amount + (data.tax || 0));

    const payload = {
      order_id: data.order_id,
      client_id: data.client_id,
      invoice_number: data.invoice_number || null,
      amount: data.amount,
      tax: data.tax || 0,
      total,
      status: data.status || 'pending',
      issued_date: data.issued_date || new Date().toISOString().split('T')[0],
      due_date: data.due_date,
      paid_date: data.paid_date || null,
      notes: data.notes || null,
      metadata: data.metadata || {}
    };

    const { data: result, error } = await window.supabaseClient
      .from(TABLE)
      .insert(payload)
      .select(INVOICE_SELECT)
      .single();

    if (error) throw error;
    return result;
  }

  async function updateInvoice(id, data) {
    if (!id) throw new Error('Invoice ID is required.');
    if (!data || Object.keys(data).length === 0) throw new Error('Update data is required.');

    const allowedFields = [
      'amount', 'tax', 'total', 'status', 'issued_date',
      'due_date', 'paid_date', 'notes', 'metadata'
    ];

    const payload = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        payload[field] = data[field];
      }
    });

    if (Object.keys(payload).length === 0) throw new Error('No valid fields to update.');

    const { data: result, error } = await window.supabaseClient
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select(INVOICE_SELECT)
      .single();

    if (error) throw error;
    return result;
  }

  async function deleteInvoice(id) {
    if (!id) throw new Error('Invoice ID is required.');

    const { error } = await window.supabaseClient
      .from(TABLE)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async function fetchClientInvoices(clientId, options) {
    if (!clientId) throw new Error('Client ID is required.');

    return fetchInvoices({
      ...(options || {}),
      client_id: clientId
    });
  }

  async function fetchOrderInvoice(orderId) {
    if (!orderId) throw new Error('Order ID is required.');

    const result = await fetchInvoices({
      order_id: orderId,
      per_page: 1
    });

    return result.data && result.data.length > 0 ? result.data[0] : null;
  }

  return {
    fetchInvoices,
    fetchInvoiceById,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    fetchClientInvoices,
    fetchOrderInvoice
  };
})();
