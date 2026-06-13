/* ════════════════════════════════════════════════════════
   NAGRIVA — Audit Reports API Module
   Supabase Storage + Database operations for audit reports
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_ReportsAPI = (function() {
  'use strict';

  var TABLE = 'audit_reports';
  var BUCKET = 'audit-reports';

  var ET = window.NAGRIVA_ErrorHandler ? NAGRIVA_ErrorHandler.ERROR_TYPES : {};

  function handleApiError(error, errorType, context) {
    if (window.NAGRIVA_ErrorHandler) {
      NAGRIVA_ErrorHandler.handleError(errorType, error, context);
    }
    return Promise.reject(error);
  }

  function getDatePath() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function sanitizeFileName(website) {
    return website
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .toLowerCase();
  }

  function uploadPdf(leadId, website, pdfBlob, score) {
    var datePath = getDatePath();
    var fileName = sanitizeFileName(website);
    var storagePath = 'reports/' + datePath + '/' + fileName + '.pdf';

    return window.supabaseClient
      .storage
      .from(BUCKET)
      .upload(storagePath, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      })
      .then(function(uploadResult) {
        if (uploadResult.error) {
          return handleApiError(uploadResult.error, ET.SUPABASE_UPLOAD, 'reports_api_upload_pdf');
        }

        return window.supabaseClient
          .from(TABLE)
          .insert([{
            lead_id: leadId,
            website: website,
            report_url: storagePath,
            audit_score: score
          }])
          .select()
          .then(function(dbResult) {
            if (dbResult.error) {
              return handleApiError(dbResult.error, ET.SUPABASE_DB, 'reports_api_db_insert');
            }
            return {
              storagePath: storagePath,
              report: dbResult.data[0]
            };
          });
      });
  }

  function getSignedUrl(storagePath) {
    return window.supabaseClient
      .storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600)
      .then(function(result) {
        if (result.error) {
          return handleApiError(result.error, ET.SUPABASE_DB, 'reports_api_get_signed_url');
        }
        return result.data.signedUrl;
      });
  }

  function downloadPdf(storagePath) {
    return getSignedUrl(storagePath).then(function(url) {
      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = storagePath.split('/').pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }).catch(function(err) {
      return handleApiError(err, ET.SUPABASE_DB, 'reports_api_download_pdf');
    });
  }

  function getReportsByLeadId(leadId) {
    return window.supabaseClient
      .from(TABLE)
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .then(function(result) {
        if (result.error) {
          return handleApiError(result.error, ET.SUPABASE_DB, 'reports_api_get_by_lead');
        }
        return result;
      });
  }

  function getReportsByEmail(email) {
    if (!window.NAGRIVA_LeadsAPI) {
      if (window.NAGRIVA_ErrorHandler) {
        NAGRIVA_ErrorHandler.handleError(NAGRIVA_ErrorHandler.ERROR_TYPES.AUDIT_MISSING_DATA, new Error('LeadsAPI not available'), 'reports_api_get_by_email');
      }
      return Promise.reject(new Error('LeadsAPI not available'));
    }
    return window.NAGRIVA_LeadsAPI.getLeadsByEmail(email)
      .then(function(result) {
        if (result.error) {
          return handleApiError(result.error, ET.SUPABASE_DB, 'reports_api_get_leads_by_email');
        }
        var leads = result.data;
        if (!leads || leads.length === 0) return [];

        var leadIds = leads.map(function(l) { return l.id; });
        return window.supabaseClient
          .from(TABLE)
          .select('*')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false });
      })
      .then(function(result) {
        if (result.error) {
          return handleApiError(result.error, ET.SUPABASE_DB, 'reports_api_get_reports_by_email');
        }
        return result.data || [];
      });
  }

  function getAllReports() {
    return window.supabaseClient
      .from(TABLE)
      .select('*, audit_leads(*)')
      .order('created_at', { ascending: false })
      .then(function(result) {
        if (result.error) {
          return handleApiError(result.error, ET.SUPABASE_DB, 'reports_api_get_all');
        }
        return result;
      });
  }

  return {
    uploadPdf: uploadPdf,
    getSignedUrl: getSignedUrl,
    downloadPdf: downloadPdf,
    getReportsByLeadId: getReportsByLeadId,
    getReportsByEmail: getReportsByEmail,
    getAllReports: getAllReports
  };
})();
