/* ════════════════════════════════════════════════════════
   NAGRIVA — Premium Audit Loading Manager
   audit-loading.js
   Full-screen generation overlay · Skeletons · Modals
   PDF loading · Share loading · Upload loading · Toasts
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_AuditLoading = (function () {
  'use strict';

  /* ─── Step definitions ─── */
  var STEPS = [
    'Connecting to Google PageSpeed...',
    'Analyzing Website Performance...',
    'Checking Technical SEO...',
    'Generating Recommendations...',
    'Creating AI Insights...',
    'Preparing Results...'
  ];

  /* ─── Escape HTML ─── */
  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ═══════════════════════════════════════════════
     1. FULL-SCREEN AUDIT GENERATION OVERLAY
     ═══════════════════════════════════════════════ */
  var overlayState = null;

  function showGenerationOverlay(url) {
    hideGenerationOverlay();

    var displayUrl = url ? url.replace(/^https?:\/\//, '').split('/')[0] : '';
    var overlay = document.createElement('div');
    overlay.className = 'al-overlay';
    overlay.id = 'alGenerationOverlay';

    var stepsHtml = '';
    for (var i = 0; i < STEPS.length; i++) {
      var cls = i === 0 ? 'active' : 'pending';
      stepsHtml += '<div class="al-step ' + cls + '" data-step="' + i + '">' +
        '<div class="al-step-icon">' +
          '<span class="al-step-num">' + (i + 1) + '</span>' +
          '<svg class="al-step-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="display:none;"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</div>' +
        '<div class="al-step-label">' + esc(STEPS[i]) + '</div>' +
      '</div>';
    }

    var urlHtml = displayUrl
      ? '<div class="al-url"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span>' + esc(displayUrl) + '</span></div>'
      : '';

    overlay.innerHTML =
      '<div class="al-overlay-inner">' +
        '<div class="al-brand">' +
          '<div class="al-brand-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' +
          '</div>' +
          '<span class="al-brand-text">Website Audit</span>' +
        '</div>' +
        '<div class="al-spinner">' +
          '<div class="al-spinner-ring"></div>' +
          '<div class="al-spinner-ring"></div>' +
          '<div class="al-spinner-ring"></div>' +
        '</div>' +
        urlHtml +
        '<div class="al-steps">' + stepsHtml + '</div>' +
        '<div class="al-progress">' +
          '<div class="al-progress-track">' +
            '<div class="al-progress-fill" id="alProgressFill"></div>' +
          '</div>' +
          '<div class="al-progress-pct" id="alProgressPct">0%</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    requestAnimationFrame(function () {
      overlay.classList.add('active');
    });

    var stepEls = overlay.querySelectorAll('.al-step');
    var progressFill = overlay.querySelector('#alProgressFill');
    var progressPct = overlay.querySelector('#alProgressPct');
    var currentStep = 0;
    var progress = 0;
    var completed = false;

    var msgInterval = setInterval(function () {
      if (completed) return;
      stepEls.forEach(function (el) { el.className = 'al-step pending'; });
      currentStep = (currentStep + 1) % stepEls.length;
      stepEls[currentStep].className = 'al-step active';
    }, 1800);

    var progressInterval = setInterval(function () {
      if (completed) return;
      progress += Math.random() * 6 + 2;
      if (progress >= 100) {
        progress = 100;
        completed = true;
        clearInterval(msgInterval);
        clearInterval(progressInterval);
      }
      if (progressFill) progressFill.style.width = Math.min(progress, 100) + '%';
      if (progressPct) progressPct.textContent = Math.min(Math.round(progress), 100) + '%';
    }, 250);

    overlayState = {
      overlay: overlay,
      stepEls: stepEls,
      progressFill: progressFill,
      progressPct: progressPct,
      completed: completed,
      msgInterval: msgInterval,
      progressInterval: progressInterval
    };

    return overlayState;
  }

  function completeGenerationOverlay() {
    if (!overlayState) return;
    overlayState.completed = true;
    clearInterval(overlayState.msgInterval);
    clearInterval(overlayState.progressInterval);
    if (overlayState.progressFill) overlayState.progressFill.style.width = '100%';
    if (overlayState.progressPct) overlayState.progressPct.textContent = '100%';
    overlayState.stepEls.forEach(function (el) {
      el.className = 'al-step completed';
      var icon = el.querySelector('.al-step-icon');
      if (icon) {
        var num = icon.querySelector('.al-step-num');
        var check = icon.querySelector('.al-step-check');
        if (num) num.style.display = 'none';
        if (check) check.style.display = 'block';
      }
    });
  }

  function hideGenerationOverlay() {
    if (overlayState) {
      overlayState.completed = true;
      clearInterval(overlayState.msgInterval);
      clearInterval(overlayState.progressInterval);
      if (overlayState.overlay && overlayState.overlay.parentNode) {
        overlayState.overlay.classList.remove('active');
        setTimeout(function () {
          if (overlayState.overlay && overlayState.overlay.parentNode) {
            overlayState.overlay.parentNode.removeChild(overlayState.overlay);
          }
        }, 400);
      }
      overlayState = null;
    }
    var existing = document.getElementById('alGenerationOverlay');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  /* ═══════════════════════════════════════════════
     2. SCORE CARDS SKELETON
     ═══════════════════════════════════════════════ */
  function scoreCardsSkeleton() {
    var html = '';
    var labels = ['SEO', 'Performance', 'Accessibility', 'Best Practices', 'UX'];

    html += '<div class="ask-overall">' +
      '<div class="ask-overall-ring ask-shimmer"></div>' +
      '<div class="ask-overall-label ask-shimmer"></div>' +
    '</div>';

    html += '<div class="ask-score-grid">';
    for (var i = 0; i < labels.length; i++) {
      html += '<div class="ask-score-card">' +
        '<div class="ask-score-ring ask-shimmer"></div>' +
        '<div class="ask-score-label ask-shimmer"></div>' +
        '<div class="ask-score-label-short ask-shimmer"></div>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  function injectScoreCardsSkeleton(containerId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    el.innerHTML = scoreCardsSkeleton();
  }

  function removeScoreCardsSkeleton(containerId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    var skeletons = el.querySelectorAll('.ask-overall, .ask-score-grid');
    skeletons.forEach(function (s) { s.remove(); });
  }

  /* ═══════════════════════════════════════════════
     3. RECOMMENDATIONS SKELETON
     ═══════════════════════════════════════════════ */
  function recommendationsSkeleton(count) {
    count = count || 5;
    var html = '<div class="ask-recs-section">' +
      '<div class="ask-recs-header">' +
        '<div class="ask-recs-title ask-shimmer"></div>' +
        '<div class="ask-recs-count ask-shimmer"></div>' +
      '</div>' +
      '<div class="ask-recs-list">';
    for (var i = 0; i < count; i++) {
      html += '<div class="ask-rec-card">' +
        '<div class="ask-rec-icon ask-shimmer"></div>' +
        '<div class="ask-rec-body">' +
          '<div class="ask-rec-title ask-shimmer"></div>' +
          '<div class="ask-rec-desc ask-shimmer"></div>' +
        '</div>' +
        '<div class="ask-rec-badge ask-shimmer"></div>' +
      '</div>';
    }
    html += '</div></div>';
    return html;
  }

  function injectRecommendationsSkeleton(containerId, count) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    el.innerHTML = recommendationsSkeleton(count);
  }

  /* ═══════════════════════════════════════════════
     4. AI INSIGHTS LOADING
     ═══════════════════════════════════════════════ */
  function aiInsightsLoadingHTML() {
    return '<div class="al-ai-loading">' +
      '<div class="al-ai-icon">' +
        '<div class="al-ai-icon-ring"></div>' +
        '<div class="al-ai-icon-ring"></div>' +
        '<div class="al-ai-icon-ring">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
        '</div>' +
      '</div>' +
      '<div class="al-ai-text">' +
        '<strong>AI is analyzing your website...</strong><br>' +
        'Generating personalized insights' +
      '</div>' +
      '<div class="al-ai-dots">' +
        '<div class="al-ai-dot"></div>' +
        '<div class="al-ai-dot"></div>' +
        '<div class="al-ai-dot"></div>' +
      '</div>' +
    '</div>';
  }

  function injectAiInsightsLoading(containerId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    el.innerHTML = aiInsightsLoadingHTML();
  }

  /* ═══════════════════════════════════════════════
     5. COMPETITOR COMPARISON LOADING
     ═══════════════════════════════════════════════ */
  function competitorLoadingHTML() {
    return '<div class="al-comp-loading">' +
      '<div class="al-comp-icon">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
      '</div>' +
      '<div class="al-comp-text">' +
        '<strong>Comparing websites...</strong><br>' +
        'Analyzing competitor strengths...' +
      '</div>' +
      '<div class="al-ai-dots">' +
        '<div class="al-ai-dot"></div>' +
        '<div class="al-ai-dot"></div>' +
        '<div class="al-ai-dot"></div>' +
      '</div>' +
    '</div>';
  }

  function injectCompetitorLoading(containerId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    el.innerHTML = competitorLoadingHTML();
  }

  function comparisonTableSkeleton(rows) {
    rows = rows || 4;
    var html = '<div class="ask-comp-table">';
    for (var i = 0; i < rows; i++) {
      html += '<div class="ask-comp-row">' +
        '<div class="ask-comp-cell ask-shimmer"></div>' +
        '<div class="ask-comp-cell ask-shimmer"></div>' +
        '<div class="ask-comp-cell ask-shimmer"></div>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  function injectComparisonTableSkeleton(containerId, rows) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    el.innerHTML = comparisonTableSkeleton(rows);
  }

  /* ═══════════════════════════════════════════════
     6. AUDIT HISTORY SKELETON
     ═══════════════════════════════════════════════ */
  function historySkeleton(count) {
    count = count || 4;
    var items = '';
    for (var i = 0; i < count; i++) {
      items += '<div class="ask-history-item">' +
        '<div class="ask-history-info">' +
          '<div class="ask-history-site ask-shimmer"></div>' +
          '<div class="ask-history-date ask-shimmer"></div>' +
        '</div>' +
        '<div class="ask-history-score ask-shimmer"></div>' +
      '</div>';
    }
    return '<div class="ask-history-section">' +
      '<div class="ask-history-header">' +
        '<div class="ask-history-title ask-shimmer"></div>' +
        '<div class="ask-history-toggle ask-shimmer"></div>' +
      '</div>' +
      '<div class="ask-history-list">' + items + '</div>' +
    '</div>';
  }

  function injectHistorySkeleton(containerId, count) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    el.innerHTML = historySkeleton(count);
  }

  function dashboardSkeletons(count) {
    count = count || 4;
    var html = '<div class="ask-dash-grid">';
    for (var i = 0; i < count; i++) {
      html += '<div class="ask-dash-card">' +
        '<div class="ask-dash-stat ask-shimmer"></div>' +
        '<div class="ask-dash-label ask-shimmer"></div>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  function injectDashboardSkeletons(containerId, count) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    el.innerHTML = dashboardSkeletons(count);
  }

  /* ═══════════════════════════════════════════════
     7. PDF GENERATION MODAL
     ═══════════════════════════════════════════════ */
  var pdfModalState = null;

  function showPdfModal() {
    hidePdfModal();

    var modal = document.createElement('div');
    modal.className = 'al-pdf-modal';
    modal.id = 'alPdfModal';
    modal.innerHTML =
      '<div class="al-pdf-card">' +
        '<div class="al-pdf-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
        '</div>' +
        '<div class="al-pdf-title">Generating PDF Report</div>' +
        '<div class="al-pdf-desc">Preparing your professional audit report...</div>' +
        '<div class="al-pdf-spinner"></div>' +
      '</div>';

    document.body.appendChild(modal);

    requestAnimationFrame(function () {
      modal.classList.add('active');
    });

    pdfModalState = modal;
    return modal;
  }

  function hidePdfModal() {
    if (pdfModalState) {
      pdfModalState.classList.remove('active');
      setTimeout(function () {
        if (pdfModalState && pdfModalState.parentNode) {
          pdfModalState.parentNode.removeChild(pdfModalState);
        }
        pdfModalState = null;
      }, 350);
    }
    var existing = document.getElementById('alPdfModal');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    pdfModalState = null;
  }

  /* ═══════════════════════════════════════════════
     8. SHARE REPORT LOADING
     ═══════════════════════════════════════════════ */
  function showShareLoading(containerId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    el.innerHTML =
      '<div class="al-share-loading">' +
        '<div class="al-share-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>' +
        '</div>' +
        '<div class="al-share-text">' +
          '<strong>Creating share link...</strong><br>' +
          'Generating secure access URL...' +
        '</div>' +
        '<div class="al-pdf-spinner"></div>' +
      '</div>';
  }

  /* ═══════════════════════════════════════════════
     9. UPLOAD LOADING
     ═══════════════════════════════════════════════ */
  function showUploadLoading(containerId, message) {
    message = message || 'Saving report...';
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    el.style.display = 'flex';
    el.className = 'aud-storage-status';
    el.innerHTML =
      '<div class="al-upload-loading">' +
        '<div class="al-upload-spinner"></div>' +
        '<span>' + esc(message) + '</span>' +
      '</div>';
  }

  function showUploadSuccess(containerId, message) {
    message = message || 'Report Saved Successfully';
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    el.style.display = 'flex';
    el.className = 'aud-storage-status success';
    el.innerHTML =
      '<div class="al-success">' +
        '<div class="al-success-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</div>' +
        '<span>' + esc(message) + '</span>' +
      '</div>';
  }

  function showUploadError(containerId, message) {
    message = message || 'Upload failed';
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    el.style.display = 'flex';
    el.className = 'aud-storage-status error';
    el.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;font-size:0.85rem;color:var(--al-red);">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' +
        '<span>' + esc(message) + '</span>' +
      '</div>';
  }

  /* ═══════════════════════════════════════════════
     10. SUCCESS TOASTS
     ═══════════════════════════════════════════════ */
  function showSuccessToast(title, message) {
    if (window.NAGRIVA_Toast) {
      NAGRIVA_Toast.success(title, message);
    }
  }

  function showErrorToast(title, message) {
    if (window.NAGRIVA_Toast) {
      NAGRIVA_Toast.error(title, message);
    }
  }

  function showInfoToast(title, message) {
    if (window.NAGRIVA_Toast) {
      NAGRIVA_Toast.info(title, message);
    }
  }

  /* ═══════════════════════════════════════════════
     11. CONVENIENCE: RUN FULL AUDIT LOAD FLOW
     ═══════════════════════════════════════════════
     Call this when user clicks "Analyze Website"
     It shows the overlay, then on complete hides it
     and shows skeletons in result areas.
     ═══════════════════════════════════════════════ */
  function startAuditLoad(url, options) {
    options = options || {};
    var scoreContainer = options.scoreContainer || 'audResults';
    var recContainer = options.recContainer || 'recCards';
    var aiContainer = options.aiContainer || 'aiInsightsContainer';

    showGenerationOverlay(url);

    if (options.showScoreSkeleton !== false) {
      injectScoreCardsSkeleton(scoreContainer);
    }
    if (options.showRecSkeleton !== false) {
      injectRecommendationsSkeleton(recContainer, options.recCount || 5);
    }
    if (options.showAiSkeleton !== false) {
      injectAiInsightsLoading(aiContainer);
    }

    return {
      overlay: overlayState,
      complete: function () {
        completeGenerationOverlay();
        setTimeout(function () {
          hideGenerationOverlay();
        }, 800);
      },
      hideOverlay: function () {
        hideGenerationOverlay();
      },
      showResults: function () {
        removeScoreCardsSkeleton(scoreContainer);
      }
    };
  }

  /* ═══════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════ */
  return {
    /* --- Full-screen generation overlay --- */
    showGenerationOverlay: showGenerationOverlay,
    completeGenerationOverlay: completeGenerationOverlay,
    hideGenerationOverlay: hideGenerationOverlay,

    /* --- Score cards skeleton --- */
    scoreCardsSkeleton: scoreCardsSkeleton,
    injectScoreCardsSkeleton: injectScoreCardsSkeleton,
    removeScoreCardsSkeleton: removeScoreCardsSkeleton,

    /* --- Recommendations skeleton --- */
    recommendationsSkeleton: recommendationsSkeleton,
    injectRecommendationsSkeleton: injectRecommendationsSkeleton,

    /* --- AI Insights loading --- */
    aiInsightsLoadingHTML: aiInsightsLoadingHTML,
    injectAiInsightsLoading: injectAiInsightsLoading,

    /* --- Competitor comparison --- */
    competitorLoadingHTML: competitorLoadingHTML,
    injectCompetitorLoading: injectCompetitorLoading,
    comparisonTableSkeleton: comparisonTableSkeleton,
    injectComparisonTableSkeleton: injectComparisonTableSkeleton,

    /* --- Audit history --- */
    historySkeleton: historySkeleton,
    injectHistorySkeleton: injectHistorySkeleton,
    dashboardSkeletons: dashboardSkeletons,
    injectDashboardSkeletons: injectDashboardSkeletons,

    /* --- PDF generation modal --- */
    showPdfModal: showPdfModal,
    hidePdfModal: hidePdfModal,

    /* --- Share loading --- */
    showShareLoading: showShareLoading,

    /* --- Upload loading --- */
    showUploadLoading: showUploadLoading,
    showUploadSuccess: showUploadSuccess,
    showUploadError: showUploadError,

    /* --- Success toasts --- */
    showSuccessToast: showSuccessToast,
    showErrorToast: showErrorToast,
    showInfoToast: showInfoToast,

    /* --- Convenience flow --- */
    startAuditLoad: startAuditLoad
  };
})();
