const NAGRIVA_NotificationsRealtime = (() => {
  'use strict';

  const CHANNEL_PREFIX = 'nagriva-notifications-realtime-';
  const TABLE = 'notifications';

  let _channel = null;
  let _userId = null;
  let _insertCallbacks = [];
  let _updateCallbacks = [];
  let _changeCallbacks = [];
  let _subscribed = false;

  function subscribe(userId) {
    if (!userId) return;

    if (_subscribed && _userId === userId && _channel) return;

    unsubscribe();

    _userId = userId;

    const channelName = CHANNEL_PREFIX + userId;

    _channel = window.supabaseClient
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLE,
          filter: 'user_id=eq.' + userId
        },
        (payload) => {
          const notification = payload.new;
          _notifyInsert(notification);
          _notifyChange('INSERT', notification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: TABLE,
          filter: 'user_id=eq.' + userId
        },
        (payload) => {
          const notification = payload.new;
          _notifyUpdate(notification);
          _notifyChange('UPDATE', notification);
        }
      )
      .subscribe();

    _subscribed = true;
  }

  function unsubscribe() {
    if (_channel) {
      window.supabaseClient.removeChannel(_channel);
      _channel = null;
    }
    _subscribed = false;
    _userId = null;
  }

  function _notifyInsert(notification) {
    _insertCallbacks.forEach(fn => {
      try { fn(notification); } catch (e) { console.error('[NotificationsRealtime] insert callback error:', e); }
    });
  }

  function _notifyUpdate(notification) {
    _updateCallbacks.forEach(fn => {
      try { fn(notification); } catch (e) { console.error('[NotificationsRealtime] update callback error:', e); }
    });
  }

  function _notifyChange(event, notification) {
    _changeCallbacks.forEach(fn => {
      try { fn(event, notification); } catch (e) { console.error('[NotificationsRealtime] change callback error:', e); }
    });
  }

  function onInsert(callback) {
    if (typeof callback !== 'function') return noop;
    _insertCallbacks.push(callback);
    return () => {
      _insertCallbacks = _insertCallbacks.filter(fn => fn !== callback);
    };
  }

  function onUpdate(callback) {
    if (typeof callback !== 'function') return noop;
    _updateCallbacks.push(callback);
    return () => {
      _updateCallbacks = _updateCallbacks.filter(fn => fn !== callback);
    };
  }

  function onChange(callback) {
    if (typeof callback !== 'function') return noop;
    _changeCallbacks.push(callback);
    return () => {
      _changeCallbacks = _changeCallbacks.filter(fn => fn !== callback);
    };
  }

  function noop() {}

  function isSubscribed() {
    return _subscribed;
  }

  function getUserId() {
    return _userId;
  }

  function destroy() {
    unsubscribe();
    _insertCallbacks = [];
    _updateCallbacks = [];
    _changeCallbacks = [];
  }

  return {
    subscribe,
    unsubscribe,
    onInsert,
    onUpdate,
    onChange,
    isSubscribed,
    getUserId,
    destroy
  };
})();
