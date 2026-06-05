const NAGRIVA_ActivityLogsRealtime = (() => {
  'use strict';

  const CHANNEL_PREFIX = 'nagriva-activity-logs-realtime-';
  const TABLE = 'activity_log';

  let _channel = null;
  let _channelName = null;
  let _insertCallbacks = [];
  let _updateCallbacks = [];
  let _changeCallbacks = [];
  let _subscribed = false;
  let _optimisticIds = new Set();

  function subscribe() {
    if (_subscribed && _channel) return;

    unsubscribe();

    _channelName = CHANNEL_PREFIX + 'admin';

    _channel = window.supabaseClient
      .channel(_channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLE
        },
        (payload) => {
          const log = payload.new;
          if (_optimisticIds.has(log.id)) {
            _optimisticIds.delete(log.id);
            return;
          }
          _notifyInsert(log);
          _notifyChange('INSERT', log);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: TABLE
        },
        (payload) => {
          const log = payload.new;
          _notifyUpdate(log);
          _notifyChange('UPDATE', log);
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
    _channelName = null;
  }

  function optimisticAdd(log) {
    if (!log || !log.id) return;

    _optimisticIds.add(log.id);

    _notifyInsert(log);
    _notifyChange('INSERT', log);
  }

  function _notifyInsert(log) {
    _insertCallbacks.forEach(fn => {
      try { fn(log); } catch (e) { console.error('[ActivityLogsRealtime] insert callback error:', e); }
    });
  }

  function _notifyUpdate(log) {
    _updateCallbacks.forEach(fn => {
      try { fn(log); } catch (e) { console.error('[ActivityLogsRealtime] update callback error:', e); }
    });
  }

  function _notifyChange(event, log) {
    _changeCallbacks.forEach(fn => {
      try { fn(event, log); } catch (e) { console.error('[ActivityLogsRealtime] change callback error:', e); }
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

  function getChannelName() {
    return _channelName;
  }

  function destroy() {
    unsubscribe();
    _insertCallbacks = [];
    _updateCallbacks = [];
    _changeCallbacks = [];
    _optimisticIds.clear();
  }

  return {
    subscribe,
    unsubscribe,
    optimisticAdd,
    onInsert,
    onUpdate,
    onChange,
    isSubscribed,
    getChannelName,
    destroy
  };
})();
