/* ════════════════════════════════════════════
   Nagriva — Premium Empty State Renderer v2
   Lucide SVG icons · Glassmorphism · Glow effects
   Usage: NAGRIVA_EmptyState.render({ ... })
   ════════════════════════════════════════════ */
window.NAGRIVA_EmptyState = (function () {
  'use strict';

  /* ─── Lucide SVG Icon Map ─── */
  var ICONS = {
    package: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>',
    'bar-chart-3': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="10" x2="8" y2="21"/><line x1="16" y1="8" x2="16" y2="21"/><line x1="3" y1="15" x2="3" y2="21"/><line x1="21" y1="3" x2="21" y2="21"/></svg>',
    'message-square': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    'folder-kanban': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7h12"/><path d="M8 12h12"/><path d="M8 17h8"/><rect x="2" y="3" width="20" height="18" rx="2"/></svg>',
    bell: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    briefcase: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    'shopping-bag': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    'clock': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'alert-circle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    'check-circle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    'compass': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    'plus': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    'arrow-right': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    'rotate-ccw': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>'
  };

  function escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getIcon(icon) {
    if (!icon) return ICONS['package'];
    if (icon.indexOf('<') === 0 || icon.indexOf('<svg') > -1) return icon;
    if (ICONS[icon]) return ICONS[icon];
    var clean = icon.replace(/^fas fa-/, '').replace(/^fa-/, '');
    if (ICONS[clean]) return ICONS[clean];
    if (ICONS[icon.toLowerCase()]) return ICONS[icon.toLowerCase()];
    return ICONS['package'];
  }

  function render(config) {
    var icon = config.icon || 'package';
    var title = config.title || '';
    var desc = config.description || '';
    var primaryCta = config.primaryCta || null;
    var secondaryCta = config.secondaryCta || null;
    var variant = config.variant || 'default';
    var compact = config.compact || false;

    var iconSvg = getIcon(icon);

    var cls = 'ne';
    if (variant === 'search') cls += ' ne-search';
    else if (variant === 'error') cls += ' ne-error';
    else if (variant === 'sm') cls += ' ne-sm';
    else if (variant === 'inline') cls += ' ne-inline';
    if (compact) cls += ' ne-compact';

    var html = '<div class="' + cls + '">' +
      '<div class="ne-icon">' + iconSvg + '</div>' +
      '<h3 class="ne-title">' + escape(title) + '</h3>' +
      (desc ? '<p class="ne-desc">' + escape(desc) + '</p>' : '');

    if (primaryCta || secondaryCta) {
      html += '<div class="ne-actions">';
      if (primaryCta) {
        var pHref = primaryCta.url || '#';
        var pOnclick = primaryCta.onclick ? ' onclick="' + primaryCta.onclick + '"' : '';
        var pIcon = primaryCta.icon ? getIcon(primaryCta.icon) : '';
        html += '<a href="' + escape(pHref) + '" class="ne-btn ne-btn-primary"' + pOnclick + '>' +
          (pIcon || '') +
          escape(primaryCta.label || '') +
          '</a>';
      }
      if (secondaryCta) {
        var sHref = secondaryCta.url || '#';
        var sOnclick = secondaryCta.onclick ? ' onclick="' + secondaryCta.onclick + '"' : '';
        var sIcon = secondaryCta.icon ? getIcon(secondaryCta.icon) : '';
        html += '<a href="' + escape(sHref) + '" class="ne-btn ne-btn-secondary"' + sOnclick + '>' +
          (sIcon || '') +
          escape(secondaryCta.label || '') +
          '</a>';
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  function renderTo(container, config) {
    if (!container) return;
    container.innerHTML = render(config);
  }

  function renderCompact(container, config) {
    if (!container) return;
    config.compact = true;
    container.innerHTML = render(config);
  }

  return {
    render: render,
    renderTo: renderTo,
    renderCompact: renderCompact,
    icons: ICONS
  };
})();
