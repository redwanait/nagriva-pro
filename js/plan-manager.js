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
    console.log('[PlanManager] getPlan() called — returning:', _plan);
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

  async function fetchPlan(userId, forceRefresh = false) {
    if (!userId) {
      console.log('[PlanManager] fetchPlan(null) — clearing plan to free');
      _plan = 'free';
      _loading = false;
      _userId = null;
      _notify();
      return 'free';
    }

    console.log('[PlanManager] fetchPlan called — userId:', userId, '| cached _userId:', _userId, '| cached _plan:', _plan, '| _loading:', _loading, '| forceRefresh:', forceRefresh);
    if (!forceRefresh && userId === _userId && !_loading) {
      console.log('[PlanManager] CACHE HIT — returning cached plan:', _plan, 'without querying Supabase');
      return _plan;
    }

    if (forceRefresh) {
      console.log('[PlanManager] Force refresh triggered');
    }

    _loading = true;
    _userId = userId;
    _notify();

    console.log('[PlanManager] QUERYING — from: profiles | select: plan | eq id:', userId);
    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .maybeSingle();

      console.log('[PlanManager] Supabase profile response', data, error);
      console.log('[PlanManager] profile.plan value:', data?.plan, '| cached _plan:', _plan);
      console.log('[PlanManager] Cache guard condition — forceRefresh:', forceRefresh, '| userId === _userId:', userId === _userId, '| !_loading:', !_loading, '| result:', !forceRefresh && userId === _userId && !_loading);

      if (error) {
        console.warn('[PlanManager] fetch error:', error);
        _plan = 'free';
      } else if (data) {
        _plan = data.plan;
      } else {
        _plan = 'free';
      }
    } catch (e) {
      console.warn('[PlanManager] fetch exception:', e);
      _plan = 'free';
    }

    console.log('[PlanManager] Fresh plan from Supabase:', _plan);
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
      return await fetchPlan(user.id, true);
    }
    return 'free';
  }

  /* ─── Directly set plan (used by subscription manager on checkout success) ─── */
  function setPlan(plan) {
    if (plan !== 'free' && plan !== 'pro') return;
    _plan = plan;
    _notify();
  }

  /* ─── Clear in-memory cache ─── */
  function clearCache() {
    console.log('[PlanManager] clearCache() — resetting _userId to null, _plan to null');
    _userId = null;
    _plan = null;
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
    clearCache: clearCache,
    subscribe: subscribe
  };
})();

window.NagrivaPlanManager = NagrivaPlanManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NagrivaPlanManager.init());
} else {
  NagrivaPlanManager.init();
}
