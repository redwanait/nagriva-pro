const NAGRIVA_DeliverablesAPI = (() => {
  'use strict';

  const TABLE = 'deliverables';
  const BUCKET = 'deliverables';
  const MAX_SIZE = 50 * 1024 * 1024;

  const ALLOWED_TYPES = [
    'application/zip',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'video/mp4',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const ALLOWED_EXTENSIONS = ['.zip', '.pdf', '.png', '.jpg', '.jpeg', '.mp4', '.docx'];

  function validateFile(file) {
    if (!file) throw new Error('No file provided');
    if (file.size > MAX_SIZE) throw new Error('File exceeds 50MB limit');
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error('Unsupported file type. Allowed: ZIP, PDF, PNG, JPG, JPEG, MP4, DOCX');
    }
    return true;
  }

  async function getCurrentUser() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return user;
  }

  async function getAdminProfile(userId) {
    const { data } = await window.supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (!data || data.role !== 'admin') throw new Error('Admin access required');
    return data;
  }

  async function uploadDeliverable(orderId, file) {
    validateFile(file);

    const user = await getCurrentUser();
    await getAdminProfile(user.id);

    const filePath = user.id + '/' + orderId + '/' + Date.now() + '_' + file.name;

    const { error: uploadError } = await window.supabaseClient.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = window.supabaseClient.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const payload = {
      order_id: orderId,
      uploaded_by: user.id,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      file_type: file.type || 'application/octet-stream'
    };

    const { data, error: dbError } = await window.supabaseClient
      .from(TABLE)
      .insert(payload)
      .select()
      .single();

    if (dbError) {
      await window.supabaseClient.storage
        .from(BUCKET)
        .remove([filePath]);
      throw dbError;
    }

    return data;
  }

  async function getDeliverables(orderId) {
    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async function deleteDeliverable(deliverableId) {
    const user = await getCurrentUser();
    await getAdminProfile(user.id);

    const { data: deliverable, error: fetchError } = await window.supabaseClient
      .from(TABLE)
      .select('*')
      .eq('id', deliverableId)
      .single();

    if (fetchError) throw fetchError;
    if (!deliverable) throw new Error('Deliverable not found');

    const storagePath = deliverable.file_url.split(BUCKET + '/').pop();
    if (storagePath) {
      const fullPath = decodeURIComponent(storagePath.split('?')[0]);
      await window.supabaseClient.storage
        .from(BUCKET)
        .remove([fullPath]);
    }

    const { error: dbError } = await window.supabaseClient
      .from(TABLE)
      .delete()
      .eq('id', deliverableId);

    if (dbError) throw dbError;

    return true;
  }

  function subscribeToDeliverables(orderId, callback) {
    const subscription = window.supabaseClient
      .channel('deliverables-' + orderId)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLE,
          filter: 'order_id=eq.' + orderId
        },
        async (payload) => {
          const { data } = await window.supabaseClient
            .from(TABLE)
            .select('*')
            .eq('id', payload.new.id)
            .single();
          if (data) callback(data);
        }
      )
      .subscribe();

    return subscription;
  }

  function subscribeToDeliverableDeletes(orderId, callback) {
    const subscription = window.supabaseClient
      .channel('deliverables-deletes-' + orderId)
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: TABLE,
          filter: 'order_id=eq.' + orderId
        },
        (payload) => {
          callback(payload.old.id);
        }
      )
      .subscribe();

    return subscription;
  }

  async function getOrderClientUserId(orderId) {
    const { data, error } = await window.supabaseClient
      .from('orders')
      .select('user_id')
      .eq('id', orderId)
      .single();
    if (error) throw error;
    return data ? data.user_id : null;
  }

  return {
    uploadDeliverable,
    getDeliverables,
    deleteDeliverable,
    subscribeToDeliverables,
    subscribeToDeliverableDeletes,
    getOrderClientUserId,
    validateFile,
    ALLOWED_EXTENSIONS,
    ALLOWED_TYPES
  };
})();
