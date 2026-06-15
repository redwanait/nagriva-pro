/* ════════════════════════════════════════════════════════
   Nagriva — Subscription Manager
   Handles Stripe Checkout redirects, portal management,
   subscription status display, and plan syncing.
   ════════════════════════════════════════════════════════ */

'use strict';

const NagrivaSubscriptionManager = (() => {
  const STRIPE_MONTHLY_PRICE_ID = 'price_1TiVkkBz7eLMEaEQprypvh6i';
  const STRIPE_YEARLY_PRICE_ID = 'price_1TiVkkBz7eLMEaEQjOpt08wF';

  let _subscription = null;
  let _loading = true;

  /* ─── Get auth token for API calls ─── */
  async function _getAuthToken() {
    const session = NagrivaAuthStore.getSession();
    if (!session) throw new Error('Not authenticated');
    return session.access_token;
  }

  /* ─── Redirect to Stripe Checkout ─── */
  async function redirectToCheckout(priceId) {
    if (!priceId) {
      priceId = STRIPE_MONTHLY_PRICE_ID;
    }

    try {
      const token = await _getAuthToken();
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ priceId, mode: 'subscription' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('[SubscriptionManager] Checkout error:', err);
      throw err;
    }
  }

  /* ─── Redirect to Stripe Customer Portal ─── */
  async function redirectToPortal() {
    try {
      const token = await _getAuthToken();
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (err) {
      console.error('[SubscriptionManager] Portal error:', err);
      throw err;
    }
  }

  /* ─── Fetch subscription from Supabase ─── */
  async function fetchSubscription(userId) {
    if (!userId) {
      _subscription = null;
      _loading = false;
      return null;
    }

    _loading = true;

    try {
      const { data, error } = await window.supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('[SubscriptionManager] Fetch error:', error);
      }

      _subscription = data || null;
    } catch (e) {
      console.warn('[SubscriptionManager] Fetch exception:', e);
      _subscription = null;
    }

    _loading = false;
    return _subscription;
  }

  /* ─── Getters ─── */
  function getSubscription() {
    return _subscription;
  }

  function isLoading() {
    return _loading;
  }

  function hasActiveSubscription() {
    if (!_subscription) return false;
    return _subscription.status === 'active' || _subscription.status === 'trialing';
  }

  function isOnMonthly() {
    if (!_subscription || !_subscription.stripe_price_id) return null;
    return _subscription.stripe_price_id === STRIPE_MONTHLY_PRICE_ID;
  }

  function isOnYearly() {
    if (!_subscription || !_subscription.stripe_price_id) return null;
    return _subscription.stripe_price_id === STRIPE_YEARLY_PRICE_ID;
  }

  function getPeriodEnd() {
    if (!_subscription || !_subscription.current_period_end) return null;
    return new Date(_subscription.current_period_end);
  }

  function getPeriodStart() {
    if (!_subscription || !_subscription.current_period_start) return null;
    return new Date(_subscription.current_period_start);
  }

  function formatDate(date) {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function formatShortDate(date) {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /* ─── Init: subscribe to auth changes ─── */
  function init() {
    if (!window.NagrivaAuthStore) {
      setTimeout(init, 30);
      return;
    }

    bindCheckoutButtons();

    const user = NagrivaAuthStore.getUser();
    if (user) {
      fetchSubscription(user.id);
    }

    NagrivaAuthStore.subscribe(state => {
      if (state.user) {
        fetchSubscription(state.user.id);
      } else {
        _subscription = null;
        _loading = false;
      }
    });
  }

  /* ─── Bind checkout buttons ─── */
  let _buttonsBound = false;
  function bindCheckoutButtons() {
    if (_buttonsBound) return;
    _buttonsBound = true;
    document.querySelectorAll('[data-checkout]').forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.preventDefault();
        const priceId = this.getAttribute('data-checkout');
        const originalText = this.textContent;
        this.disabled = true;
        this.textContent = 'Redirecting...';

        try {
          await redirectToCheckout(priceId);
        } catch (err) {
          this.textContent = 'Error - Try Again';
          this.disabled = false;
          setTimeout(() => {
            this.textContent = originalText;
          }, 3000);
        }
      });
    });

    // Bind portal buttons
    document.querySelectorAll('[data-portal]').forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.preventDefault();
        const originalText = this.textContent;
        this.disabled = true;
        this.textContent = 'Opening...';

        try {
          await redirectToPortal();
        } catch (err) {
          this.textContent = 'Error - Try Again';
          this.disabled = false;
          setTimeout(() => {
            this.textContent = originalText;
          }, 3000);
        }
      });
    });
  }

  return {
    init: init,
    redirectToCheckout: redirectToCheckout,
    redirectToPortal: redirectToPortal,
    fetchSubscription: fetchSubscription,
    getSubscription: getSubscription,
    isLoading: isLoading,
    hasActiveSubscription: hasActiveSubscription,
    isOnMonthly: isOnMonthly,
    isOnYearly: isOnYearly,
    getPeriodEnd: getPeriodEnd,
    getPeriodStart: getPeriodStart,
    formatDate: formatDate,
    formatShortDate: formatShortDate,
    bindCheckoutButtons: bindCheckoutButtons,
    STRIPE_MONTHLY_PRICE_ID: STRIPE_MONTHLY_PRICE_ID,
    STRIPE_YEARLY_PRICE_ID: STRIPE_YEARLY_PRICE_ID
  };
})();

window.NagrivaSubscriptionManager = NagrivaSubscriptionManager;

/* ─── Auto-init ─── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NagrivaSubscriptionManager.init());
} else {
  NagrivaSubscriptionManager.init();
}
