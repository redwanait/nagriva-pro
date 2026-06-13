/* ════════════════════════════════════════════════════════
   NAGRIVA — Report Export & Share Module
   Share links · QR codes · Social sharing · PDF export · Analytics
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_ReportShare = (function() {
  'use strict';

  var SHARE_PAGE = '/pages/report-viewer.html';

  function generateCode() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var code = '';
    for (var i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function getShareUrl(shareCode) {
    var origin = window.location.origin;
    return origin + '/report/' + shareCode;
  }

  function getClient() {
    return window.supabaseClient;
  }

  function ensureShareLink(reportId, website) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase not available'));

    return client
      .from('report_shares')
      .select('*')
      .eq('report_id', reportId)
      .maybeSingle()
      .then(function(result) {
        if (result.error && result.error.code !== 'PGRST116') throw result.error;
        if (result.data) return result.data;

        var code = generateCode();
        return client
          .from('report_shares')
          .insert([{ report_id: reportId, share_code: code, is_public: true }])
          .select()
          .single()
          .then(function(ir) {
            if (ir.error) {
              if (window.NAGRIVA_ErrorHandler) {
                NAGRIVA_ErrorHandler.handleError(NAGRIVA_ErrorHandler.ERROR_TYPES.SUPABASE_DB, ir.error, 'report_share_ensure_link');
              }
              throw ir.error;
            }
            return ir.data;
          });
      });
  }

  function openShareModal(report) {
    var overlay = document.getElementById('rsModalOverlay');
    if (!overlay) return console.warn('[ReportShare] Modal overlay not found');

    var reportId = report && (report.id || report.report_id);
    var website = report && (report.website || '');

    if (!reportId) {
      if (typeof NAGRIVA_Toast !== 'undefined') {
        NAGRIVA_Toast.error('Share Error', 'Report ID not found.');
      }
      return;
    }

    var urlEl = document.getElementById('rsReportUrl');
    if (urlEl) urlEl.textContent = website;

    /* ─── Show share loading state ─── */
    var linkSection = document.querySelector('.rs-link-section');
    var qrSection = document.querySelector('.rs-qr-section');
    var socialSection = document.querySelector('.rs-social-section');
    var shareEmptyEl = document.getElementById('rsShareEmpty');
    if (shareEmptyEl) shareEmptyEl.style.display = 'none';
    var shareLoadingEl = document.getElementById('rsShareLoading');
    if (!shareLoadingEl) {
      shareLoadingEl = document.createElement('div');
      shareLoadingEl.id = 'rsShareLoading';
      shareLoadingEl.style.cssText = 'text-align:center;padding:24px 0;';
      if (linkSection && linkSection.parentNode) {
        linkSection.parentNode.insertBefore(shareLoadingEl, linkSection);
      }
    }
    shareLoadingEl.style.display = 'block';
    if (linkSection) linkSection.style.display = 'none';
    if (qrSection) qrSection.style.display = 'none';
    if (socialSection) socialSection.style.display = 'none';

    if (window.NAGRIVA_AuditLoading) {
      shareLoadingEl.innerHTML = window.NAGRIVA_AuditLoading.aiInsightsLoadingHTML().replace('AI is analyzing your website...', 'Creating share link...').replace('Generating personalized insights', 'Generating secure access URL...');
    } else {
      shareLoadingEl.innerHTML = '<div style="color:var(--gray2);font-size:0.85rem;padding:20px 0;"><div style="width:24px;height:24px;border:2px solid rgba(250,204,21,0.1);border-top-color:#FACC15;border-radius:50%;animation:audSpin 0.8s linear infinite;margin:0 auto 12px;"></div>Creating share link...</div>';
    }

    ensureShareLink(reportId, website).then(function(shareRecord) {
      if (shareLoadingEl) shareLoadingEl.style.display = 'none';
      if (linkSection) linkSection.style.display = '';
      if (qrSection) qrSection.style.display = '';
      if (socialSection) socialSection.style.display = '';
      if (typeof NAGRIVA_AuditLoading !== 'undefined' && NAGRIVA_AuditLoading) {
        NAGRIVA_AuditLoading.showSuccessToast('Share Link Created', 'Your report is ready to share.');
      }
      var shareCode = shareRecord.share_code;
      var shareUrl = getShareUrl(shareCode);

      var linkInput = document.getElementById('rsShareLink');
      var qrContainer = document.getElementById('rsQRCode');
      var copyBtn = document.getElementById('rsCopyBtn');

      if (linkInput) linkInput.value = shareUrl;

      if (qrContainer) {
        qrContainer.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='
          + encodeURIComponent(shareUrl)
          + '" alt="QR Code" class="rs-qr-img" loading="lazy" width="160" height="160" onerror="this.onerror=null;this.parentNode.innerHTML=\'<div style=padding:20px;text-align:center;color:var(--gray2);font-size:0.8rem;>QR code unavailable</div>\'">';
      }

      if (copyBtn) {
        copyBtn._shareUrl = shareUrl;
        var newBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newBtn, copyBtn);
        newBtn._shareUrl = shareUrl;
        newBtn.addEventListener('click', function() {
          copyToClipboard(newBtn._shareUrl);
        });
      }

      setupSocialButtons(shareUrl, report, shareCode);

      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }).catch(function(err) {
      if (window.NAGRIVA_ErrorHandler) {
        NAGRIVA_ErrorHandler.handleError(NAGRIVA_ErrorHandler.ERROR_TYPES.SHARE_FAILED, err, 'report_share_open_modal');
      } else {
        console.error('[ReportShare] Create share link error:', err);
        if (typeof NAGRIVA_Toast !== 'undefined') {
          NAGRIVA_Toast.error('Share Error', 'Could not create share link. Please try again.');
        }
      }
    });
  }

  function closeShareModal() {
    var overlay = document.getElementById('rsModalOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showCopySuccess();
      }).catch(function() {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      showCopySuccess();
    } catch (e) {
      console.error('[ReportShare] Copy failed:', e);
    }
    document.body.removeChild(ta);
  }

  function showCopySuccess() {
    var btn = document.getElementById('rsCopyBtn');
    if (btn) {
      var origHtml = btn.innerHTML;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
      btn.classList.add('copied');
      setTimeout(function() {
        btn.innerHTML = origHtml;
        btn.classList.remove('copied');
      }, 2500);
    }
    if (typeof NAGRIVA_Toast !== 'undefined') {
      NAGRIVA_Toast.success('Link copied successfully', 'The share link has been copied to your clipboard.');
    }
  }

  function setupSocialButtons(shareUrl, report, shareCode) {
    var text = encodeURIComponent('Check out my website audit report on Nagriva!');
    var url = encodeURIComponent(shareUrl);

    var linkedinBtn = document.getElementById('rsShareLinkedin');
    var twitterBtn = document.getElementById('rsShareTwitter');
    var facebookBtn = document.getElementById('rsShareFacebook');
    var whatsappBtn = document.getElementById('rsShareWhatsapp');

    if (linkedinBtn) linkedinBtn.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + url;
    if (twitterBtn) twitterBtn.href = 'https://twitter.com/intent/tweet?text=' + text + '&url=' + url;
    if (facebookBtn) facebookBtn.href = 'https://www.facebook.com/sharer/sharer.php?u=' + url;
    if (whatsappBtn) whatsappBtn.href = 'https://wa.me/?text=' + text + '%20' + url;

    [linkedinBtn, twitterBtn, facebookBtn, whatsappBtn].forEach(function(btn) {
      if (btn) {
        var platform = btn.id.replace('rsShare', '').toLowerCase();
        btn.onclick = function() {
          trackShare(report, shareCode, platform);
        };
      }
    });
  }

  function trackShare(report, shareCode, platform) {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'share', {
        event_category: 'Report',
        event_label: platform,
        value: shareCode
      });
    }
    var reportId = report && (report.id || report.report_id);
    if (reportId) {
      var client = getClient();
      if (client) {
        client.rpc('increment_report_shares', { p_report_id: reportId }).catch(function(err) {
          if (err.code !== 'PGRST116') console.error('[ReportShare] Track share error:', err);
        });
      }
    }
  }

  function copyShareLink(report) {
    var reportId = report && (report.id || report.report_id);
    if (!reportId) {
      if (typeof NAGRIVA_Toast !== 'undefined') {
        NAGRIVA_Toast.error('Copy Error', 'Report ID not found.');
      }
      return;
    }

    ensureShareLink(reportId, report.website).then(function(shareRecord) {
      var shareUrl = getShareUrl(shareRecord.share_code);
      copyToClipboard(shareUrl);
    }).catch(function(err) {
      if (window.NAGRIVA_ErrorHandler) {
        NAGRIVA_ErrorHandler.handleError(NAGRIVA_ErrorHandler.ERROR_TYPES.SHARE_FAILED, err, 'report_share_copy_link');
      } else {
        console.error('[ReportShare] Copy link error:', err);
        if (typeof NAGRIVA_Toast !== 'undefined') {
          NAGRIVA_Toast.error('Copy Error', 'Could not generate share link.');
        }
      }
    });
  }

  function exportPdf(report) {
    var reportUrl = report && report.report_url;
    if (reportUrl && window.NAGRIVA_ReportsAPI) {
      NAGRIVA_ReportsAPI.downloadPdf(reportUrl);

      var client = getClient();
      var reportId = report.id || report.report_id;
      if (client && reportId) {
        client.rpc('increment_report_downloads', { p_report_id: reportId }).catch(function(err) {
          if (window.NAGRIVA_ErrorHandler) {
            NAGRIVA_ErrorHandler.logError(NAGRIVA_ErrorHandler.ERROR_TYPES.SUPABASE_DB, err, 'report_share_track_download');
          }
        });
      }
    } else {
      var errMsg = 'No report file available for download.';
      if (typeof NAGRIVA_Toast !== 'undefined') {
        NAGRIVA_Toast.error('Download Error', errMsg);
      }
    }
  }

  function getReportFromTableRow(row) {
    return {
      id: row.id,
      lead_id: row.lead_id,
      website: row.website,
      report_url: row.report_url,
      audit_score: row.audit_score,
      created_at: row.created_at
    };
  }

  function initExportDropdown(triggerId, menuId, currentReportFn) {
    var trigger = document.getElementById(triggerId);
    var menu = document.getElementById(menuId);

    if (!trigger || !menu) return;

    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = menu.classList.contains('open');
      menu.classList.toggle('open');
      trigger.classList.toggle('open');
      if (!isOpen) {
        document.addEventListener('click', closeMenuOnOutside);
      }
    });

    function closeMenuOnOutside(e) {
      if (!menu.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
        menu.classList.remove('open');
        trigger.classList.remove('open');
        document.removeEventListener('click', closeMenuOnOutside);
      }
    }

    var items = menu.querySelectorAll('[data-rs-action]');
    items.forEach(function(item) {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        menu.classList.remove('open');
        trigger.classList.remove('open');
        document.removeEventListener('click', closeMenuOnOutside);

        var action = item.getAttribute('data-rs-action');
        var report = typeof currentReportFn === 'function' ? currentReportFn() : currentReportFn;

        if (!report) {
          if (typeof NAGRIVA_Toast !== 'undefined') {
            NAGRIVA_Toast.error('No Report Selected', 'Please select a report first.');
          }
          return;
        }

        switch (action) {
          case 'pdf':
            exportPdf(report);
            break;
          case 'share':
            openShareModal(report);
            break;
          case 'copy':
            copyShareLink(report);
            break;
        }
      });
    });
  }

  return {
    generateCode: generateCode,
    getShareUrl: getShareUrl,
    ensureShareLink: ensureShareLink,
    openShareModal: openShareModal,
    closeShareModal: closeShareModal,
    copyToClipboard: copyToClipboard,
    copyShareLink: copyShareLink,
    exportPdf: exportPdf,
    getReportFromTableRow: getReportFromTableRow,
    initExportDropdown: initExportDropdown
  };
})();
