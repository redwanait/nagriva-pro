/* ════════════════════════════════════════════════════════
   NAGRIVA — Audit Leads API Module
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_LeadsAPI = (function() {
  'use strict';

  var TABLE = 'audit_leads';

  function createLead(data) {
    var payload = {
      name: data.name,
      email: data.email,
      website: data.website
    };
    if (data.company) payload.company = data.company;
    if (typeof data.audit_score === 'number') payload.audit_score = data.audit_score;

    return window.supabaseClient
      .from(TABLE)
      .insert([payload])
      .select();
  }

  function getLeads() {
    return window.supabaseClient
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
  }

  function getLeadsByEmail(email) {
    return window.supabaseClient
      .from(TABLE)
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });
  }

  function updateLeadScore(id, score) {
    return window.supabaseClient
      .from(TABLE)
      .update({ audit_score: score })
      .eq('id', id);
  }

  return {
    createLead: createLead,
    getLeads: getLeads,
    getLeadsByEmail: getLeadsByEmail,
    updateLeadScore: updateLeadScore
  };
})();
