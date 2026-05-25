const NAGRIVA_Toast = (() => {
  const DURATIONS = { success: 4000, error: 6000, warning: 5000, info: 4000 };
  let _offset = 0;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function createContainer() {
    const existing = document.getElementById('toastContainer');
    if (existing) return existing;
    const div = document.createElement('div');
    div.className = 'toast-container';
    div.id = 'toastContainer';
    document.body.appendChild(div);
    return div;
  }

  function dismiss(toast) {
    if (!toast || toast._dismissed) return;
    toast._dismissed = true;
    toast.classList.remove('visible');
    toast.classList.add('hiding');
    _offset = Math.max(0, _offset - 1);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  }

  function show(type, title, message, options) {
    const container = createContainer();
    options = options || {};
    const duration = options.duration != null ? options.duration : (DURATIONS[type] || 4000);

    const iconMap = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = 'toast';

    let actionHtml = '';
    if (options.action) {
      actionHtml = `<button class="toast-action">${escapeHtml(options.action.label)}</button>`;
    }

    toast.innerHTML =
      `<div class="toast-icon ${type}"><i class="fas ${iconMap[type] || iconMap.info}"></i></div>` +
      `<div class="toast-content">` +
        `<div class="toast-title">${escapeHtml(title)}</div>` +
        `<div class="toast-message">${escapeHtml(message)}</div>` +
      `</div>` +
      (options.duration !== 0 ? `<div class="toast-progress ${type}"></div>` : '') +
      actionHtml +
      `<button class="toast-close"><i class="fas fa-times"></i></button>`;

    container.appendChild(toast);

    _offset++;

    if (options.onclick) {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', function(e) {
        if (e.target.closest('.toast-close') || e.target.closest('.toast-action')) return;
        options.onclick(e);
      });
    }

    if (options.action) {
      toast.querySelector('.toast-action').addEventListener('click', function(e) {
        e.stopPropagation();
        options.action.onClick(e);
        dismiss(toast);
      });
    }

    toast.querySelector('.toast-close').addEventListener('click', function() {
      dismiss(toast);
    });

    requestAnimationFrame(function() {
      toast.classList.add('visible');
      requestAnimationFrame(function() {
        const bar = toast.querySelector('.toast-progress');
        if (bar && duration > 0) {
          bar.style.transition = `transform ${duration}ms linear`;
          bar.style.transform = 'scaleX(0)';
        }
      });
    });

    if (duration > 0) {
      setTimeout(function() {
        dismiss(toast);
      }, duration);
    }

    return toast;
  }

  return {
    show: show,
    success: function(title, message, opts) { return show('success', title, message, opts); },
    error: function(title, message, opts) { return show('error', title, message, opts); },
    warning: function(title, message, opts) { return show('warning', title, message, opts); },
    info: function(title, message, opts) { return show('info', title, message, opts); },
    dismiss: dismiss
  };
})();
