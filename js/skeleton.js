/* ════════════════════════════════════════════════════════
   Nagriva — Premium Reusable Skeleton Loader
   skeleton.js
   Unified skeleton generator for all pages
   ════════════════════════════════════════════════════════ */
window.NAGRIVA_Skeleton = (function () {
  'use strict';

  function shimmer() {
    return ' class="sk-shimmer"';
  }

  /* ─── Dashboard Stat Skeletons ─── */
  function stats(count) {
    count = count || 5;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-stat">' +
        '<div class="sk-stat-icon sk-shimmer"></div>' +
        '<div class="sk-stat-value sk-shimmer"></div>' +
        '<div class="sk-stat-label sk-shimmer"></div>' +
        '<div class="sk-stat-change sk-shimmer"></div>' +
        '</div>';
    }
    return html;
  }

  /* ─── Row Skeletons (orders, activity, messages) ─── */
  function rows(count) {
    count = count || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-row">' +
        '<div class="sk-row-icon sk-shimmer"></div>' +
        '<div class="sk-row-body">' +
        '<div class="sk-row-line sk-shimmer"></div>' +
        '<div class="sk-row-line-sm sk-shimmer"></div>' +
        '</div>' +
        '<div class="sk-row-end sk-shimmer"></div>' +
        '</div>';
    }
    return '<div class="sk-stagger">' + html + '</div>';
  }

  /* ─── Avatar Row Skeletons (messages) ─── */
  function avatarRows(count) {
    count = count || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-avatar-row">' +
        '<div class="sk-avatar sk-shimmer"></div>' +
        '<div class="sk-avatar-body">' +
        '<div class="sk-avatar-name sk-shimmer"></div>' +
        '<div class="sk-avatar-preview sk-shimmer"></div>' +
        '</div>' +
        '<div class="sk-avatar-time sk-shimmer"></div>' +
        '</div>';
    }
    return '<div class="sk-stagger">' + html + '</div>';
  }

  /* ─── Notification Skeletons ─── */
  function notifications(count) {
    count = count || 4;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-notif">' +
        '<div class="sk-notif-icon sk-shimmer"></div>' +
        '<div class="sk-notif-body">' +
        '<div class="sk-notif-title sk-shimmer"></div>' +
        '<div class="sk-notif-msg sk-shimmer"></div>' +
        '<div class="sk-notif-time sk-shimmer"></div>' +
        '</div>' +
        '</div>';
    }
    return '<div class="sk-stagger">' + html + '</div>';
  }

  /* ─── Timeline Skeletons (activity feed) ─── */
  function timeline(count) {
    count = count || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-timeline">' +
        '<div class="sk-timeline-dot sk-shimmer"></div>' +
        '<div class="sk-timeline-body">' +
        '<div class="sk-timeline-title sk-shimmer"></div>' +
        '<div class="sk-timeline-desc sk-shimmer"></div>' +
        '<div class="sk-timeline-time sk-shimmer"></div>' +
        '</div>' +
        '</div>';
    }
    return '<div class="sk-stagger">' + html + '</div>';
  }

  /* ─── Project Card Skeletons ─── */
  function projects(count) {
    count = count || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-project">' +
        '<div class="sk-project-line sk-shimmer w70"></div>' +
        '<div class="sk-project-line sk-shimmer w50"></div>' +
        '<div class="sk-project-line sk-shimmer w40" style="height:8px;margin-top:4px;"></div>' +
        '</div>';
    }
    return '<div class="sk-stagger" style="display:contents;">' + html + '</div>';
  }

  /* ─── Profile Header Skeletons ─── */
  function profile() {
    return '<div class="sk-profile">' +
      '<div class="sk-profile-avatar sk-shimmer"></div>' +
      '<div class="sk-profile-info">' +
      '<div class="sk-profile-name sk-shimmer"></div>' +
      '<div class="sk-profile-email sk-shimmer"></div>' +
      '<div class="sk-profile-joined sk-shimmer"></div>' +
      '</div>' +
      '</div>';
  }

  function profileCard(count) {
    count = count || 2;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-widget">' +
        '<div class="sk-widget-header">' +
        '<div class="sk-widget-title sk-shimmer"></div>' +
        '</div>' +
        '<div class="sk-row-line sk-shimmer" style="margin-bottom:8px;"></div>' +
        '<div class="sk-row-line-sm sk-shimmer" style="margin-bottom:8px;"></div>' +
        '<div class="sk-row-line-sm sk-shimmer" style="width:40%;"></div>' +
        '</div>';
    }
    return '<div class="sk-stagger">' + html + '</div>';
  }

  /* ─── Service Card Skeletons ─── */
  function serviceCards(count) {
    count = count || 6;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-service-card">' +
        '<div class="sk-service-img sk-shimmer"></div>' +
        '<div class="sk-service-body">' +
        '<div class="sk-service-line sk-shimmer w70"></div>' +
        '<div class="sk-service-line sk-shimmer w50"></div>' +
        '<div class="sk-service-line sk-shimmer w40"></div>' +
        '</div>' +
        '</div>';
    }
    return '<div class="sk-stagger" style="display:contents;">' + html + '</div>';
  }

  /* ─── Admin Stat Skeletons ─── */
  function adminStats(count) {
    count = count || 4;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-admin-stat">' +
        '<div class="sk-admin-stat-icon sk-shimmer"></div>' +
        '<div class="sk-admin-stat-value sk-shimmer"></div>' +
        '<div class="sk-admin-stat-label sk-shimmer"></div>' +
        '</div>';
    }
    return '<div class="sk-stagger">' + html + '</div>';
  }

  /* ─── Admin Table Row Skeletons ─── */
  function adminTableRows(count) {
    count = count || 5;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-admin-tr">' +
        '<div class="sk-admin-td sk-shimmer w15"></div>' +
        '<div class="sk-admin-td sk-shimmer w25"></div>' +
        '<div class="sk-admin-td sk-shimmer w35"></div>' +
        '<div class="sk-admin-td sk-shimmer w15"></div>' +
        '<div class="sk-admin-td sk-shimmer w10"></div>' +
        '</div>';
    }
    return '<div class="sk-stagger">' + html + '</div>';
  }

  /* ─── Admin Analytics Widget Skeletons ─── */
  function adminWidgets(count) {
    count = count || 2;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-widget" style="grid-column:span 1;min-height:200px;">' +
        '<div class="sk-widget-header">' +
        '<div class="sk-widget-title sk-shimmer"></div>' +
        '<div class="sk-widget-action sk-shimmer"></div>' +
        '</div>' +
        '<div style="display:flex;gap:12px;margin-top:24px;">' +
        '<div class="sk-admin-stat-value sk-shimmer" style="width:25%;height:40px;"></div>' +
        '<div class="sk-admin-stat-value sk-shimmer" style="width:25%;height:40px;"></div>' +
        '<div class="sk-admin-stat-value sk-shimmer" style="width:25%;height:40px;"></div>' +
        '<div class="sk-admin-stat-value sk-shimmer" style="width:25%;height:40px;"></div>' +
        '</div>' +
        '<div class="sk-row-line sk-shimmer" style="margin-top:24px;"></div>' +
        '<div class="sk-row-line-sm sk-shimmer"></div>' +
        '<div class="sk-row-line-sm sk-shimmer" style="width:45%;"></div>' +
        '</div>';
    }
    return '<div class="sk-stagger">' + html + '</div>';
  }

  /* ─── Order Card Skeletons (Client Portal) ─── */
  function orderCards(count) {
    count = count || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-order-card">' +
        '<div class="sk-order-icon sk-shimmer"></div>' +
        '<div class="sk-order-body">' +
        '<div class="sk-order-name sk-shimmer"></div>' +
        '<div class="sk-order-meta sk-shimmer"></div>' +
        '</div>' +
        '<div class="sk-order-right">' +
        '<div class="sk-order-badge sk-shimmer"></div>' +
        '<div class="sk-order-progress">' +
        '<div class="sk-order-bar sk-shimmer"></div>' +
        '<div class="sk-order-pct sk-shimmer"></div>' +
        '</div>' +
        '</div>' +
        '</div>';
    }
    return '<div class="sk-stagger">' + html + '</div>';
  }

  /* ─── Result / Project Card Skeletons ─── */
  function resultCards(count, isFull) {
    count = count || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
      var fullClass = (i === 0 && isFull) ? ' cs-full' : '';
      html += '<div class="sk-result-card' + fullClass + '">' +
        '<div class="sk-result-img sk-shimmer"></div>' +
        '<div class="sk-result-body">' +
        '<div class="sk-result-tag sk-shimmer"></div>' +
        '<div class="sk-result-title sk-shimmer"></div>' +
        '<div class="sk-result-desc sk-shimmer"></div>' +
        '<div class="sk-result-desc-sm sk-shimmer"></div>' +
        '<div class="sk-result-services">' +
        '<div class="sk-result-service-tag sk-shimmer"></div>' +
        '<div class="sk-result-service-tag sk-shimmer"></div>' +
        '<div class="sk-result-service-tag sk-shimmer"></div>' +
        '</div>' +
        '</div>' +
        '</div>';
    }
    return '<div class="sk-stagger" style="display:contents;">' + html + '</div>';
  }

  /* ─── Auth Check Page Shell Skeleton ─── */
  function pageShell() {
    var navItems = '';
    for (var i = 0; i < 4; i++) {
      navItems += '<div class="sk-shell-nav-item sk-shimmer"></div>';
    }
    return '<div class="sk-page-shell">' +
      '<div class="sk-shell-header">' +
      '<div class="sk-shell-logo sk-shimmer"></div>' +
      '<div class="sk-shell-nav">' + navItems + '</div>' +
      '</div>' +
      '<div class="sk-shell-body">' +
      '<div class="sk-shell-card">' +
      '<div class="sk-shell-brand sk-shimmer"></div>' +
      '<div class="sk-shell-title sk-shimmer"></div>' +
      '<div class="sk-shell-desc sk-shimmer"></div>' +
      '<div class="sk-shell-indicator">' +
      '<div class="sk-shell-dot-pulse"></div>' +
      '<div class="sk-shell-text sk-shimmer"></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  /* ─── Chat Conversation Skeletons ─── */
  function chatConversations(count) {
    count = count || 4;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="sk-avatar-row" style="margin-bottom:4px;">' +
        '<div class="sk-avatar sk-shimmer" style="width:40px;height:40px;border-radius:12px;"></div>' +
        '<div class="sk-avatar-body">' +
        '<div class="sk-avatar-name sk-shimmer"></div>' +
        '<div class="sk-avatar-preview sk-shimmer"></div>' +
        '</div>' +
        '<div class="sk-avatar-time sk-shimmer" style="width:28px;"></div>' +
        '</div>';
    }
    return '<div class="sk-stagger">' + html + '</div>';
  }

  /* ─── Generic Skeleton Injection ─── */
  function inject(containerId, skeletonHtml) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = skeletonHtml;
  }

  function remove(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
  }

  /* ─── Fade-in wrapper ─── */
  function wrapContent(containerId, contentHtml) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div class="sk-fade-container">' +
      '<div class="sk-skeleton sk-hidden">' + el.innerHTML + '</div>' +
      '<div class="sk-content sk-visible">' + contentHtml + '</div>' +
      '</div>';
  }

  function showContent(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var skeleton = el.querySelector('.sk-skeleton');
    var content = el.querySelector('.sk-content');
    if (skeleton) skeleton.classList.add('sk-hidden');
    if (content) content.classList.add('sk-visible');
  }

  return {
    shimmer: shimmer,
    stats: stats,
    rows: rows,
    avatarRows: avatarRows,
    notifications: notifications,
    timeline: timeline,
    projects: projects,
    profile: profile,
    profileCard: profileCard,
    serviceCards: serviceCards,
    resultCards: resultCards,
    pageShell: pageShell,
    adminStats: adminStats,
    adminTableRows: adminTableRows,
    adminWidgets: adminWidgets,
    orderCards: orderCards,
    chatConversations: chatConversations,
    inject: inject,
    remove: remove,
    wrapContent: wrapContent,
    showContent: showContent
  };
})();
