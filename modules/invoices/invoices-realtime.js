const NAGRIVA_InvoicesRealtime = (() => {
  'use strict';

  let channel = null;
  let onChangeCallback = null;

  function subscribe(callback) {
    onChangeCallback = callback || null;

    if (channel) {
      window.supabaseClient.removeChannel(channel);
      channel = null;
    }

    channel = window.supabaseClient
      .channel('admin-invoices-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        async (payload) => {
          if (typeof onChangeCallback === 'function') {
            onChangeCallback(payload);
          }
        }
      )
      .subscribe(function(status) {
        if (status === 'SUBSCRIBED') {
          console.log('[InvoicesRealtime] Channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[InvoicesRealtime] Channel error');
        } else if (status === 'TIMED_OUT') {
          console.warn('[InvoicesRealtime] Channel timed out');
        }
      });
  }

  function unsubscribe() {
    if (channel) {
      window.supabaseClient.removeChannel(channel);
      channel = null;
    }
    onChangeCallback = null;
  }

  return {
    subscribe,
    unsubscribe,
  };
})();
