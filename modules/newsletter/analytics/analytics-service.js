/* ════════════════════════════════════════════════════════
   NAGRIVA — Newsletter Analytics Service
   Tracks signups, sources, conversions, and engagement
   ════════════════════════════════════════════════════════ */

const NAGRIVA_NewsletterAnalytics = (() => {
  const ANALYTICS_TABLE = 'newsletter_analytics';

  /* ─── Log an analytics event ─── */
  async function logEvent(eventType, data = {}) {
    try {
      const payload = {
        event_type: eventType,
        subscriber_id: data.subscriberId || null,
        email: data.email || null,
        source: data.source || null,
        metadata: data.metadata || {}
      };

      const { error } = await window.supabaseClient
        .from(ANALYTICS_TABLE)
        .insert(payload);

      if (error) {
        console.warn('[NewsletterAnalytics] Log error:', error.message);
      }

      return { success: !error, error: error ? error.message : null };
    } catch (err) {
      console.warn('[NewsletterAnalytics] Log exception:', err.message);
      return { success: false, error: err.message };
    }
  }

  /* ─── Get total subscriber count (active) ─── */
  async function getTotalSubscribers() {
    try {
      const { count, error } = await window.supabaseClient
        .from('newsletter_subscribers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.warn('[NewsletterAnalytics] getTotalSubscribers error:', err.message);
      return 0;
    }
  }

  /* ─── Get signups by source ─── */
  async function getSignupsBySource() {
    try {
      const { data, error } = await window.supabaseClient
        .from('newsletter_analytics')
        .select('source')
        .eq('event_type', 'signup');

      if (error) throw error;

      const counts = {};
      if (data) {
        data.forEach(row => {
          const src = row.source || 'unknown';
          counts[src] = (counts[src] || 0) + 1;
        });
      }
      return counts;
    } catch (err) {
      console.warn('[NewsletterAnalytics] getSignupsBySource error:', err.message);
      return {};
    }
  }

  /* ─── Get dashboard stats ─── */
  async function getDashboardStats() {
    try {
      const totalSubscribers = await getTotalSubscribers();

      const { data: recentSignups, error: recentError } = await window.supabaseClient
        .from('newsletter_subscribers')
        .select('id, email, subscribed_at, source')
        .eq('status', 'active')
        .order('subscribed_at', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      const bySource = await getSignupsBySource();

      const { data: totalEvents, error: eventsError } = await window.supabaseClient
        .from('newsletter_analytics')
        .select('event_type');

      if (eventsError) throw eventsError;

      const eventCounts = {};
      if (totalEvents) {
        totalEvents.forEach(e => {
          eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
        });
      }

      return {
        totalSubscribers,
        recentSignups: recentSignups || [],
        bySource,
        eventCounts
      };
    } catch (err) {
      console.warn('[NewsletterAnalytics] getDashboardStats error:', err.message);
      return {
        totalSubscribers: 0,
        recentSignups: [],
        bySource: {},
        eventCounts: {}
      };
    }
  }

  /* ─── Track conversion event ─── */
  async function trackConversion(email, source, metadata = {}) {
    return await logEvent('signup', { email, source, metadata });
  }

  return {
    logEvent,
    getTotalSubscribers,
    getSignupsBySource,
    getDashboardStats,
    trackConversion
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NAGRIVA_NewsletterAnalytics;
}
