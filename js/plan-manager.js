/* ════════════════════════════════════════════════════════
   Nagriva — Plan Manager
   Centralized plan state management.
   Reads plan from profiles table, caches in memory,
   and notifies listeners on changes.
   ════════════════════════════════════════════════════════ */

'use strict';

const NagrivaPlanManager = (() => {
  let _plan = 'free';
  let _loading = true;
  let _userId = null;
  const _listeners = [];

  function getPlan() {
    return _plan;
  }

  function isPro() {
    return _plan === 'pro';
  }

  function isFree() {
    return _plan === 'free';
  }

  function isLoading() {
    return _loading;
  }

  function subscribe(fn) {
    _listeners.push(fn);
    return function unsubscribe() {
      const idx = _listeners.indexOf(fn);
      if (idx !== -1) _listeners.splice(idx, 1);
    };
  }

  function _notify() {
    const snapshot = { plan: _plan, isPro: isPro(), isFree: isFree(), loading: _loading };
    _listeners.forEach(fn => {
      try { fn(snapshot); } catch (e) { console.warn('[PlanManager] listener error:', e); }
    });
  }

  async function fetchPlan(userId) {
    if (!userId) {
      _plan = 'free';
      _loading = false;
      _userId = null;
      _notify();
      return 'free';
    }

    if (userId === _userId && !_loading) return _plan;

    _loading = true;
    _userId = userId;
    _notify();

    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[PlanManager] fetch error:', error);
        _plan = 'free';
      } else {
        _plan = (data && data.plan) || 'free';
      }
    } catch (e) {
      console.warn('[PlanManager] fetch exception:', e);
      _plan = 'free';
    }

    _loading = false;
    _notify();
    return _plan;
  }

  function init() {
    if (!window.NagrivaAuthStore) {
      setTimeout(init, 30);
      return;
    }

    const user = NagrivaAuthStore.getUser();
    if (user) {
      fetchPlan(user.id);
    }

    NagrivaAuthStore.subscribe(state => {
      if (state.user && state.user.id !== _userId) {
        fetchPlan(state.user.id);
      } else if (!state.user) {
        fetchPlan(null);
      }
    });
  }

  /* ─── Force refresh plan from server ─── */
  async function refreshPlan() {
    const user = window.NagrivaAuthStore ? NagrivaAuthStore.getUser() : null;
    if (user) {
      return await fetchPlan(user.id);
    }
    return 'free';
  }

  /* ─── Directly set plan (used by subscription manager on checkout success) ─── */
  function setPlan(plan) {
    if (plan !== 'free' && plan !== 'pro') return;
    _plan = plan;
    _notify();
  }

  return {
    init: init,
    getPlan: getPlan,
    isPro: isPro,
    isFree: isFree,
    isLoading: isLoading,
    fetchPlan: fetchPlan,
    refreshPlan: refreshPlan,
    setPlan: setPlan,
    subscribe: subscribe
  };
})();

window.NagrivaPlanManager = NagrivaPlanManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NagrivaPlanManager.init());
} else {
  NagrivaPlanManager.init();
}
