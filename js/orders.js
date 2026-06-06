/* ════════════════════════════════════════════════════════
   Nagriva — Orders & Client Management
   Handles order CRUD, file uploads, messaging, activity
   ════════════════════════════════════════════════════════ */

'use strict';

const SERVICE_NAMES = {
  "website-development": "Website Development",
  "blog-creation": "Blog Creation",
  "video-editing": "Video Editing",
  "seo": "SEO Optimization",
  "ecommerce-stores": "E-commerce Stores",
  "social-media": "Social Media Growth",
  "social-media-growth": "Social Media Growth",
  "branding": "Brand Identity",
  "brand-identity": "Brand Identity",
  "ai-automation": "AI Automation",
  "web-design": "Web Design",
  "performance-marketing": "Performance Marketing"
};

function safeServiceType(s) {
  if (!s) return 'Service';
  if (SERVICE_NAMES[s]) return SERVICE_NAMES[s];
  return String(s).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

const NagrivaOrders = (() => {

  /* ─── Helpers ─── */
  function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  function formatDate(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
    return formatDate(dateStr);
  }

  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function normalizeStatus(s) {
    if (!s) return 'pending';
    var lower = s.toLowerCase().replace(/ /g, '_');
    var map = {
      'pending': 'pending',
      'paid': 'paid',
      'approved': 'approved',
      'in_progress': 'in_progress',
      'in progress': 'in_progress',
      'review': 'review',
      'delivered': 'completed',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };
    return map[lower] || 'pending';
  }

  function getStatusBadgeClass(status) {
    const n = normalizeStatus(status);
    const map = {
      pending: 'pending',
      paid: 'paid',
      approved: 'approved',
      in_progress: 'in_progress',
      review: 'review',
      delivered: 'completed',
      completed: 'completed',
      cancelled: 'cancelled'
    };
    return map[n] || 'pending';
  }

  function getStatusLabel(status) {
    const n = normalizeStatus(status);
    const map = {
      pending: 'Pending',
      paid: 'Paid',
      approved: 'Approved',
      in_progress: 'In Progress',
      review: 'Review',
      delivered: 'Completed',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return map[n] || status;
  }

  function getStageLabel(stage) {
    const map = {
      order_received: 'Order Received',
      project_approved: 'Project Approved',
      work_started: 'Work Started',
      first_draft: 'First Draft',
      client_review: 'Client Review',
      final_delivery: 'Final Delivery'
    };
    return map[stage] || stage || 'Order Received';
  }

  function getProgressForStage(stage) {
    const map = {
      order_received: 10,
      project_approved: 25,
      work_started: 45,
      first_draft: 70,
      client_review: 85,
      final_delivery: 100
    };
    return map[stage] || 0;
  }

  /* ─── Get Current User ─── */
  async function getCurrentUser() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    return user;
  }

  /* ─── Get User Profile ─── */
  async function getProfile(userId) {
    const { data } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  }

  /* ─── Ensure Orphan Orders Are Linked to User ─── */
  async function ensureUserIdLinked(user) {
    if (!user || !user.email) return;
    try {
      await NAGRIVA_OrdersAPI.linkOrphanOrders(user);
    } catch (err) {
      console.warn('[NagrivaOrders] ensureUserIdLinked failed:', err.message || err);
    }
  }

  /* ════════════════════════════════════════════
     ORDER OPERATIONS
     ════════════════════════════════════════════ */

  /* ─── Create Order ─── */
  async function createOrder(orderData, _attempt) {
    _attempt = _attempt || 0;
    if (_attempt > 5) throw new Error('Failed to generate unique order number after 5 attempts');

    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const orderNumber = generateOrderNumber();

    let data;
    try {
      data = await NAGRIVA_OrdersAPI.createOrder({
        user_id: user.id,
        user_email: user.email || '',
        service_type: orderData.service_type,
        project_title: orderData.project_title,
        project_description: orderData.project_description || '',
        additional_notes: orderData.additional_notes || '',
        budget: orderData.budget || null,
        deadline: orderData.deadline || null,
        status: 'pending',
        order_number: orderNumber
      });
    } catch (insertError) {
      if (insertError && insertError.code === '23505') {
        return createOrder(orderData, _attempt + 1);
      }
      console.error('[NagrivaOrders] createOrder insert error:', insertError);
      throw insertError;
    }

    console.log('[TEST] createOrder activity log start', {orderId: data.id, userId: user.id});
    try {
      await logActivity(data.id, user.id, 'order_created', 'Order submitted: ' + orderData.service_type);
    } catch (e) {
      console.warn('[NagrivaOrders] Failed to log activity:', e);
    }
    console.log('[TEST] createOrder activity log finished');

    try {
      if (typeof NAGRIVA_NotificationTriggers !== 'undefined') {
        await NAGRIVA_NotificationTriggers.newOrder(data, user.id);
      }
    } catch (e) {
      console.warn('[NagrivaOrders] Failed to notify:', e);
    }

    /* Send order confirmation email via Edge Function */
    sendOrderConfirmationEmail(data, user).catch(function(e) {
      console.warn('[NagrivaOrders] Failed to send order confirmation email:', e.message || e);
    });

    return data;
  }

  /* ─── Generate Order Number (NRV-YYYY-XXXX) ─── */
  function generateOrderNumber() {
    var year = new Date().getFullYear();
    var seq = Date.now().toString().slice(-4);
    var rand = Math.floor(10 + Math.random() * 90);
    return 'NRV-' + year + '-' + seq + rand;
  }

  /* ─── Get User's Orders ─── */
  async function getUserOrders() {
    try {
      const user = await getCurrentUser();
      if (!user) return [];

      await ensureUserIdLinked(user);

      return await NAGRIVA_OrdersAPI.getUserOrders(user.id);
    } catch (err) {
      console.error('[NagrivaOrders] getUserOrders failed:', err.message || err);
      throw err;
    }
  }

  /* ─── Get Single Order (scoped to current user unless admin) ─── */
  async function getOrder(orderId) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getProfile(user.id);
    const isAdmin = profile?.role === 'admin';

    return await NAGRIVA_OrdersAPI.getOrderById(orderId, isAdmin ? null : user.id);
  }

  /* ─── Get Own Order (scoped to current user, non-admin) ─── */
  async function getOwnOrder(orderId) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    return await NAGRIVA_OrdersAPI.getOrderById(orderId, user.id);
  }

  /* ─── Get All Orders (Admin only) with client join ─── */
  async function getAllOrders() {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getProfile(user.id);
    if (profile?.role !== 'admin') throw new Error('Admin access required');

    const data = await NAGRIVA_OrdersAPI.fetchAllOrders();
    return data || [];
  }

  /* ─── Update Order Status (Admin only) ─── */
  async function updateOrderStatus(orderId, status) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getProfile(user.id);
    if (profile?.role !== 'admin') throw new Error('Admin access required');

    const data = await NAGRIVA_OrdersAPI.updateOrder(orderId, { status });

    await logActivity(orderId, user.id, 'status_changed',
      'Status changed to ' + getStatusLabel(status));

    try {
      if (typeof NAGRIVA_NotificationTriggers !== 'undefined') {
        var targetUserId = data.user_id || data.client_id;
        if (targetUserId) {
          await NAGRIVA_NotificationTriggers.statusChanged(data, targetUserId, status);
        }
      }
    } catch (e) {
      console.warn('[NagrivaOrders] Failed to notify status change:', e);
    }

    return data;
  }

  /* ─── Update Order (Admin only) ─── */
  async function updateOrder(orderId, updates) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getProfile(user.id);
    if (profile?.role !== 'admin') throw new Error('Admin access required');

    const data = await NAGRIVA_OrdersAPI.updateOrder(orderId, updates);

    if (updates.project_manager) {
      await logActivity(orderId, user.id, 'manager_assigned',
        'Project manager set to ' + updates.project_manager);
    }

    return data;
  }

  /* ════════════════════════════════════════════
     PROJECTS
     ════════════════════════════════════════════ */

  async function getProjects(orderId) {
    const { data, error } = await window.supabaseClient
      .from('projects')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async function createProject(orderId, title, description) {
    const user = await getCurrentUser();

    const { data, error } = await window.supabaseClient
      .from('projects')
      .insert({
        order_id: orderId,
        title,
        description: description || '',
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(orderId, user.id, 'project_added', 'Project milestone: ' + title);

    return data;
  }

  async function updateProjectStatus(projectId, status) {
    const user = await getCurrentUser();

    const { data, error } = await window.supabaseClient
      .from('projects')
      .update({ status })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    if (status === 'completed') {
      const project = data;
      await logActivity(project.order_id, user.id, 'project_completed',
        'Milestone completed: ' + project.title);
    }

    return data;
  }

  /* ════════════════════════════════════════════
     MESSAGES
     ════════════════════════════════════════════ */

  async function getMessages(orderId) {
    const { data, error } = await window.supabaseClient
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async function sendMessage(orderId, text) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getProfile(user.id);
    const senderRole = profile?.role === 'admin' ? 'admin' : 'client';

    const { data, error } = await window.supabaseClient
      .from('messages')
      .insert({
        order_id: orderId,
        user_id: user.id,
        sender_role: senderRole,
        message: text
      })
      .select('*')
      .single();

    if (error) throw error;

    await logActivity(orderId, user.id, 'message_sent', 'New message from ' + senderRole);

    try {
      if (typeof NAGRIVA_NotificationTriggers !== 'undefined') {
        if (senderRole === 'client') {
          await NAGRIVA_NotificationTriggers.notifyAdmins(
            'New Message',
            'New message regarding order #' + orderId.slice(0, 8),
            '/pages/admin-messages.html?id=' + orderId,
            { trigger: 'new_message', order_id: orderId }
          );
        } else {
          var { data: order } = await window.supabaseClient
            .from('orders')
            .select('user_id')
            .eq('id', orderId)
            .single();
          if (order && order.user_id) {
            await NAGRIVA_NotificationTriggers.adminAction(
              order.user_id,
              'New Message',
              'You have a new message regarding your order.',
              '/pages/client-portal.html?id=' + orderId,
              { trigger: 'new_message', order_id: orderId }
            );
          }
        }
      }
    } catch (e) {
      console.warn('[NagrivaOrders] Failed to notify message:', e);
    }

    return data;
  }

  function subscribeToMessages(orderId, callback) {
    const subscription = window.supabaseClient
      .channel('messages-' + orderId)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'order_id=eq.' + orderId
        },
        async (payload) => {
          const { data } = await window.supabaseClient
            .from('messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();
          if (data) callback(data);
        }
      )
      .subscribe();

    return subscription;
  }

  /* ════════════════════════════════════════════
     FILES
     ════════════════════════════════════════════ */

  async function uploadFile(orderId, file, uploadedBy) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const filePath = user.id + '/' + orderId + '/' + Date.now() + '_' + file.name;

    const { error: uploadError } = await window.supabaseClient.storage
      .from('order-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: publicUrl } = window.supabaseClient.storage
      .from('order-files')
      .getPublicUrl(filePath);

    const { data, error: dbError } = await window.supabaseClient
      .from('files')
      .insert({
        order_id: orderId,
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: filePath,
        uploaded_by: uploadedBy
      })
      .select()
      .single();

    if (dbError) throw dbError;

    await logActivity(orderId, user.id, 'file_uploaded',
      uploadedBy + ' uploaded: ' + file.name);

    return { ...data, public_url: publicUrl.publicUrl };
  }

  async function getFiles(orderId) {
    const { data, error } = await window.supabaseClient
      .from('files')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const withUrls = (data || []).map(f => {
      const { data: urlData } = window.supabaseClient.storage
        .from('order-files')
        .getPublicUrl(f.storage_path);
      return { ...f, public_url: urlData.publicUrl };
    });

    return withUrls;
  }

  function subscribeToFiles(orderId, callback) {
    const subscription = window.supabaseClient
      .channel('files-' + orderId)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'files',
          filter: 'order_id=eq.' + orderId
        },
        async (payload) => {
          const { data: urlData } = window.supabaseClient.storage
            .from('order-files')
            .getPublicUrl(payload.new.storage_path);
          callback({ ...payload.new, public_url: urlData.publicUrl });
        }
      )
      .subscribe();

    return subscription;
  }

  /* ════════════════════════════════════════════
     ACTIVITY LOG
     ════════════════════════════════════════════ */

  /* ─── Send Order Confirmation Email ─── */
  async function sendOrderConfirmationEmail(order, user) {
    try {
      var email = user.email || order.user_email || '';
      if (!email) return;
      var fullName = user.user_metadata?.full_name || '';
      var firstName = fullName.split(' ')[0] || email.split('@')[0];
      await window.supabaseClient.functions.invoke('send-email', {
        body: {
          type: 'order_confirmation',
          user_id: user.id,
          email: email,
          full_name: fullName,
          first_name: firstName,
          order_id: order.id,
          order_number: order.order_number,
          service_type: order.service_type,
          status: order.status
        }
      });
    } catch (e) {
      console.warn('[NagrivaOrders] sendOrderConfirmationEmail error:', e);
    }
  }

  async function logActivity(orderId, userId, action, description) {
    console.log('[TEST] logActivity called', {orderId, userId, action});
    if (!orderId) { console.warn('[NagrivaOrders] logActivity skipped: no orderId'); return null; }
    try {
      var payload = { user_id: userId, action: action, description: description };
      if (orderId) payload.order_id = orderId;
      console.log('[TEST] inserting into activity_log', JSON.stringify(payload));
      var { data, error } = await window.supabaseClient
        .from('activity_log')
        .insert(payload)
        .select()
        .single();
      console.log('[TEST] insert result', {data, error: error ? error.message : null});
      if (error) {
        console.warn('[NagrivaOrders] logActivity insert error:', error.message);
        if (error.message && error.message.includes('column') && error.message.includes('order_id')) {
          console.warn('[NagrivaOrders] activity_log table missing order_id column — run the migration (supabase-migration-activity-log-fix.sql / supabase-notification-fix.sql).');
          delete payload.order_id;
          var { data: retryData, error: retryError } = await window.supabaseClient
            .from('activity_log')
            .insert(payload)
            .select()
            .single();
          if (retryError) console.warn('[NagrivaOrders] logActivity fallback also failed:', retryError.message);
          return retryData || null;
        }
        return null;
      }
      return data;
    } catch (e) {
      console.warn('[NagrivaOrders] logActivity unexpected error:', e.message || e);
      return null;
    }
  }

  async function getActivity(orderId) {
    try {
      const { data, error } = await window.supabaseClient
        .from('activity_log')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
          console.warn('[NagrivaOrders] activity_log table missing order_id column — run the migration.');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (err) {
      console.warn('[NagrivaOrders] getActivity failed:', err.message || err);
      return [];
    }
  }

  function subscribeToActivity(orderId, callback) {
    const subscription = window.supabaseClient
      .channel('activity-' + orderId)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: 'order_id=eq.' + orderId
        },
        async (payload) => {
          const { data } = await window.supabaseClient
            .from('activity_log')
            .select('*')
            .eq('id', payload.new.id)
            .single();
          if (data) callback(data);
        }
      )
      .subscribe();

    return subscription;
  }

  /* ════════════════════════════════════════════
     DASHBOARD STATS
     ════════════════════════════════════════════ */

  async function getUserDashboardStats() {
    try {
      const user = await getCurrentUser();
      if (!user) return { active: 0, completed: 0, pending: 0, total: 0 };

      await ensureUserIdLinked(user);

      return await NAGRIVA_OrdersAPI.getUserDashboardStats(user.id);
    } catch (err) {
      console.error('[NagrivaOrders] getUserDashboardStats failed:', err.message || err);
      return { active: 0, completed: 0, pending: 0, total: 0 };
    }
  }

  async function getAdminDashboardStats() {
    try {
      return await NAGRIVA_OrdersAPI.getAdminDashboardStats();
    } catch (err) {
      console.error('[NagrivaOrders] getAdminDashboardStats failed:', err.message || err);
      return { total: 0, pending: 0, in_progress: 0, review: 0, delivered: 0, cancelled: 0 };
    }
  }

  async function getRecentActivity(limit = 10) {
    try {
      const user = await getCurrentUser();
      if (!user) return [];

      await ensureUserIdLinked(user);

      const orderIds = await NAGRIVA_OrdersAPI.getUserOrderIds(user.id);
      if (orderIds.length === 0) return [];

      const { data, error } = await window.supabaseClient
        .from('activity_log')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[NagrivaOrders] getRecentActivity error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[NagrivaOrders] getRecentActivity failed:', err.message || err);
      return [];
    }
  }

  /* ─── Check if Admin ─── */
  async function isAdmin() {
    const user = await getCurrentUser();
    if (!user) return false;
    const profile = await getProfile(user.id);
    return profile?.role === 'admin';
  }

  /* ─── Storage Bucket Setup ─── */
  async function ensureStorageBucket() {
    try {
      const { data: buckets } = await window.supabaseClient.storage.listBuckets();
      const exists = buckets?.some(b => b.name === 'order-files');
      if (!exists) {
        await window.supabaseClient.storage.createBucket('order-files', {
          public: true,
          fileSizeLimit: 52428800
        });
      }
    } catch (e) {
      console.warn('Storage bucket may already exist:', e);
    }
  }

  /* ─── Public API ─── */
  return {
    getCurrentUser,
    getProfile,
    ensureUserIdLinked,
    getInitials,
    formatDate,
    formatTimeAgo,
    formatFileSize,
    getStatusBadgeClass,
    getStatusLabel,
    getStageLabel,
    getProgressForStage,
    safeServiceType,
    createOrder,
    getUserOrders,
    getOrder,
    getOwnOrder,
    getAllOrders,
    updateOrderStatus,
    updateOrder,
    getProjects,
    createProject,
    updateProjectStatus,
    getMessages,
    sendMessage,
    subscribeToMessages,
    uploadFile,
    getFiles,
    subscribeToFiles,
    getActivity,
    subscribeToActivity,
    logActivity,
    getUserDashboardStats,
    getAdminDashboardStats,
    getRecentActivity,
    isAdmin,
    ensureStorageBucket
  };
})();
