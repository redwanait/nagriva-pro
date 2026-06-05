const NAGRIVA_NavbarAPI = (() => {
  'use strict';

  const DEFAULT_AVATAR = 'https://i.ibb.co/KzBBXjwt/Whats-App-Image-2026-01-29-at-11-43-13-3.jpg';

  function getInitials(name) {
    if (!name) return 'A';
    return name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2) || 'A';
  }

  /* ─── Profile ─── */
  async function getProfile(userId) {
    try {
      var { data, error } = await window.supabaseClient
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, created_at, updated_at')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data || null;
    } catch (err) {
      console.warn('[NavbarAPI] getProfile error:', err);
      return null;
    }
  }

  async function getCurrentUserAndProfile() {
    try {
      var { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return { user: null, profile: null };

      var profile = await getProfile(user.id);
      return { user, profile };
    } catch (err) {
      console.warn('[NavbarAPI] getCurrentUserAndProfile error:', err);
      return { user: null, profile: null };
    }
  }

  function getAvatarUrl(profile, user) {
    if (profile && profile.avatar_url) return profile.avatar_url;
    if (user && user.user_metadata && user.user_metadata.avatar_url) return user.user_metadata.avatar_url;
    return DEFAULT_AVATAR;
  }

  function getDisplayName(profile, user) {
    if (profile && profile.full_name) return profile.full_name;
    if (user && user.email) return user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    return 'Admin';
  }

  /* ─── Notifications ─── */
  async function getUnreadNotifications(userId) {
    if (!userId) return 0;
    try {
      var { count, error } = await window.supabaseClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.warn('[NavbarAPI] getUnreadNotifications error:', err);
      return 0;
    }
  }

  async function getRecentNotifications(userId, limit) {
    limit = limit || 5;
    if (!userId) return [];
    try {
      var { data, error } = await window.supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[NavbarAPI] getRecentNotifications error:', err);
      return [];
    }
  }

  async function markNotificationRead(id) {
    try {
      var { error } = await window.supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[NavbarAPI] markNotificationRead error:', err);
      return false;
    }
  }

  async function markAllNotificationsRead(userId) {
    if (!userId) return false;
    try {
      var { error } = await window.supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[NavbarAPI] markAllNotificationsRead error:', err);
      return false;
    }
  }

  /* ─── Messages (order messages + support) ─── */
  async function getAdminUnreadCount() {
    try {
      var { count: orderCount, error: orderErr } = await window.supabaseClient
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_role', 'client')
        .eq('is_read', false);
      if (orderErr) throw orderErr;

      var { count: supportCount, error: supportErr } = await window.supabaseClient
        .from('support_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_role', 'user')
        .eq('is_read', false);
      if (supportErr) throw supportErr;

      return (orderCount || 0) + (supportCount || 0);
    } catch (err) {
      console.warn('[NavbarAPI] getAdminUnreadCount error:', err);
      return 0;
    }
  }

  async function getAdminMessagesPreview(limit) {
    limit = limit || 4;
    try {
      var orderMessages = await window.supabaseClient
        .from('messages')
        .select('id, message, created_at, is_read, sender_role, order_id, user_id')
        .eq('sender_role', 'client')
        .order('created_at', { ascending: false })
        .limit(limit);
      return orderMessages.data || [];
    } catch (err) {
      console.warn('[NavbarAPI] getAdminMessagesPreview error:', err);
      return [];
    }
  }

  /* ─── Settings ─── */
  async function getSettings() {
    try {
      var { data, error } = await window.supabaseClient
        .from('settings')
        .select('setting_key, setting_value');
      if (error) throw error;
      var map = {};
      if (data) {
        data.forEach(function(s) { map[s.setting_key] = s.setting_value; });
      }
      return map;
    } catch (err) {
      console.warn('[NavbarAPI] getSettings error:', err);
      return {};
    }
  }

  /* ─── Realtime Subscriptions ─── */
  function subscribeToProfile(userId, callbacks) {
    if (!userId) return function() {};
    var channel = window.supabaseClient
      .channel('navbar-profile-' + userId)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'id=eq.' + userId },
        function(payload) {
          if (callbacks.onProfileUpdate) callbacks.onProfileUpdate(payload.new);
        }
      )
      .subscribe();
    return function() {
      window.supabaseClient.removeChannel(channel);
    };
  }

  function subscribeToNotifications(userId, callbacks) {
    if (!userId) return function() {};
    var channel = window.supabaseClient
      .channel('navbar-notifications-' + userId)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId },
        function(payload) {
          var notif = payload.new;
          if (callbacks.onNotificationInsert) callbacks.onNotificationInsert(notif);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId },
        function(payload) {
          var notif = payload.new;
          if (callbacks.onNotificationUpdate) callbacks.onNotificationUpdate(notif);
        }
      )
      .subscribe();
    return function() {
      window.supabaseClient.removeChannel(channel);
    };
  }

  function subscribeToMessages(callbacks) {
    var channels = [];
    var orderChannel = window.supabaseClient
      .channel('navbar-messages-orders')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        function(payload) {
          if (payload.new && payload.new.sender_role === 'client' && callbacks.onNewClientMessage) {
            callbacks.onNewClientMessage(payload.new);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: 'is_read=eq.true' },
        function(payload) {
          if (callbacks.onMessageRead) callbacks.onMessageRead(payload.new);
        }
      )
      .subscribe();
    channels.push(orderChannel);

    var supportChannel = window.supabaseClient
      .channel('navbar-messages-support')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        function(payload) {
          if (payload.new && payload.new.sender_role === 'user' && callbacks.onNewClientMessage) {
            callbacks.onNewClientMessage(payload.new);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_messages', filter: 'is_read=eq.true' },
        function(payload) {
          if (callbacks.onMessageRead) callbacks.onMessageRead(payload.new);
        }
      )
      .subscribe();
    channels.push(supportChannel);

    return function() {
      channels.forEach(function(ch) { window.supabaseClient.removeChannel(ch); });
    };
  }

  /* ─── Auth ─── */
  async function signOut() {
    try {
      var { error } = await window.supabaseClient.auth.signOut();
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[NavbarAPI] signOut error:', err);
      return false;
    }
  }

  var _tabVisibleCallbacks = [];
  function onTabVisible(cb) {
    _tabVisibleCallbacks.push(cb);
    return function() {
      _tabVisibleCallbacks = _tabVisibleCallbacks.filter(function(f) { return f !== cb; });
    };
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) {
        _tabVisibleCallbacks.forEach(function(cb) {
          try { cb(); } catch (e) { console.warn('[NavbarAPI] visibility callback error:', e); }
        });
      }
    });
  }

  return {
    getProfile: getProfile,
    getCurrentUserAndProfile: getCurrentUserAndProfile,
    getAvatarUrl: getAvatarUrl,
    getDisplayName: getDisplayName,
    getInitials: getInitials,
    getUnreadNotifications: getUnreadNotifications,
    getRecentNotifications: getRecentNotifications,
    markNotificationRead: markNotificationRead,
    markAllNotificationsRead: markAllNotificationsRead,
    getAdminUnreadCount: getAdminUnreadCount,
    getAdminMessagesPreview: getAdminMessagesPreview,
    getSettings: getSettings,
    subscribeToProfile: subscribeToProfile,
    subscribeToNotifications: subscribeToNotifications,
    subscribeToMessages: subscribeToMessages,
    signOut: signOut,
    onTabVisible: onTabVisible,
    DEFAULT_AVATAR: DEFAULT_AVATAR
  };
})();
