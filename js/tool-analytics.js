/* ════════════════════════════════════════════════════════
   Nagriva — Tool Analytics
   Centralized analytics tracking for all tools.
   Records tool usage to Supabase and provides
   aggregated stats for the dashboard.
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_ToolAnalytics = (function () {
  'use strict';

  var _cache = { stats: null, activity: null, lastFetch: 0 };
  var CACHE_TTL = 30000;

  function isCacheValid() {
    return _cache.lastFetch && (Date.now() - _cache.lastFetch) < CACHE_TTL;
  }

  function getUserId(userId) {
    if (userId) return userId;
    var u = window.NagrivaAuthStore ? NagrivaAuthStore.getUser() : null;
    return u ? u.id : null;
  }

  async function trackToolUse(toolName) {
    var uid = getUserId();
    if (!uid) return false;

    try {
      var { error } = await window.supabaseClient
        .from('tool_usage')
        .insert({ user_id: uid, tool_name: toolName, created_at: new Date().toISOString() });

      if (error) {
        console.warn('[ToolAnalytics] track error:', error);
        return false;
      }

      _cache.lastFetch = 0;
      return true;
    } catch (e) {
      console.warn('[ToolAnalytics] track exception:', e);
      return false;
    }
  }

  async function getUserStats(userId) {
    var uid = getUserId(userId);
    if (!uid) return null;

    if (_cache.stats && isCacheValid()) return _cache.stats;

    var plan = 'free';
    if (window.NagrivaPlanManager) {
      plan = NagrivaPlanManager.getPlan();
    }

    try {
      var memberSince = null;
      var { data: profile } = await window.supabaseClient
        .from('profiles')
        .select('created_at')
        .eq('id', uid)
        .single();
      if (profile) memberSince = profile.created_at;
    } catch (e) { /* ignore */ }

    var totalUses = 0;
    try {
      var { count } = await window.supabaseClient
        .from('tool_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid);
      totalUses = count || 0;
    } catch (e) { /* ignore */ }

    var toolCounts = {};
    var mostUsedTool = 'N/A';
    var maxCount = 0;
    try {
      var { data: allTools } = await window.supabaseClient
        .from('tool_usage')
        .select('tool_name')
        .eq('user_id', uid);
      if (allTools) {
        allTools.forEach(function (row) {
          toolCounts[row.tool_name] = (toolCounts[row.tool_name] || 0) + 1;
          if (toolCounts[row.tool_name] > maxCount) {
            maxCount = toolCounts[row.tool_name];
            mostUsedTool = row.tool_name;
          }
        });
      }
    } catch (e) { /* ignore */ }

    var lastUsedTool = 'N/A';
    var lastUsedAt = null;
    try {
      var { data: lastData } = await window.supabaseClient
        .from('tool_usage')
        .select('tool_name, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1);
      if (lastData && lastData.length > 0) {
        lastUsedTool = lastData[0].tool_name;
        lastUsedAt = lastData[0].created_at;
      }
    } catch (e) { /* ignore */ }

    var totalSessions = 0;
    try {
      var { data: allDates } = await window.supabaseClient
        .from('tool_usage')
        .select('created_at')
        .eq('user_id', uid);
      if (allDates) {
        var uniqueDays = {};
        allDates.forEach(function (row) {
          var d = new Date(row.created_at);
          uniqueDays[d.toISOString().split('T')[0]] = true;
        });
        totalSessions = Object.keys(uniqueDays).length;
      }
    } catch (e) { /* ignore */ }

    var remainingFreeUses = '—';
    if (plan === 'pro') {
      remainingFreeUses = 'Unlimited';
    } else if (window.NAGRIVA_FreeTrialTracker) {
      remainingFreeUses = NAGRIVA_FreeTrialTracker.getRemaining();
    }

    var stats = {
      totalUses: totalUses,
      mostUsedTool: mostUsedTool,
      lastUsedTool: lastUsedTool,
      lastUsedAt: lastUsedAt,
      remainingFreeUses: remainingFreeUses,
      plan: plan,
      memberSince: memberSince,
      totalSessions: totalSessions
    };

    _cache.stats = stats;
    _cache.lastFetch = Date.now();
    return stats;
  }

  async function getRecentActivity(userId, limit) {
    limit = limit || 10;
    var uid = getUserId(userId);
    if (!uid) return [];

    if (_cache.activity && isCacheValid()) return _cache.activity;

    try {
      var { data, error } = await window.supabaseClient
        .from('tool_usage')
        .select('tool_name, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[ToolAnalytics] activity error:', error);
        return [];
      }

      _cache.activity = data || [];
      _cache.lastFetch = Date.now();
      return _cache.activity;
    } catch (e) {
      console.warn('[ToolAnalytics] activity exception:', e);
      return [];
    }
  }

  function formatToolName(name) {
    if (!name || name === 'N/A') return name;
    return name
      .replace(/-/g, ' ')
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  return {
    trackToolUse: trackToolUse,
    getUserStats: getUserStats,
    getRecentActivity: getRecentActivity,
    formatToolName: formatToolName
  };
})();
