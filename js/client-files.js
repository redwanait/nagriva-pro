(function () {
  'use strict';

  var _user = null;
  var _orders = [];
  var _files = [];

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
    var d = new Date(dateStr);
    var now = new Date();
    var diff = now - d;
    var oneDay = 86400000;
    if (diff < oneDay && d.getDate() === now.getDate()) {
      return 'Today at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    if (diff < 2 * oneDay && d.getDate() === now.getDate() - 1) {
      return 'Yesterday';
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function getFileIconSvg(fileType, fileName) {
    var ext = (fileName || '').split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
    }
    if (ext === 'pdf') {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
    }
    if (['zip', 'rar', 'tar', 'gz'].includes(ext)) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>';
    }
    if (['doc', 'docx'].includes(ext)) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
    }
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  }

  function getBadgeClass(fileType, fileName) {
    var ext = (fileName || '').split('.').pop().toLowerCase();
    var mime = (fileType || '').toLowerCase();
    if (mime.includes('pdf') || ext === 'pdf') return 'pdf';
    if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('gzip') || ['zip', 'rar', 'tar', 'gz'].includes(ext)) return 'zip';
    if (mime.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext)) return 'image';
    if (mime.includes('video') || ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return 'video';
    if (mime.includes('word') || mime.includes('document') || ['doc', 'docx'].includes(ext)) return 'doc';
    return 'default';
  }

  function getFileTypeLabel(fileType, fileName) {
    if (fileType) return fileType.split('/').pop().toUpperCase();
    var ext = (fileName || '').split('.').pop();
    return (ext || 'Unknown').toUpperCase();
  }

  function getOrderName(orderId) {
    var order = _orders.find(function (o) { return o.id === orderId; });
    if (!order) return 'Unknown Order';
    return order.order_number || '#' + (order.id || '').slice(0, 8);
  }

  function getOrderLink(orderId) {
    return '<a href="order-tracking.html?id=' + orderId + '" class="cf-order-link">' + escapeHtml(getOrderName(orderId)) + '</a>';
  }

  function isImageFile(fileName) {
    var ext = (fileName || '').split('.').pop().toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext);
  }

  function isVideoFile(fileName) {
    var ext = (fileName || '').split('.').pop().toLowerCase();
    return ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext);
  }

  function isPdfFile(fileType, fileName) {
    var ext = (fileName || '').split('.').pop().toLowerCase();
    var mime = (fileType || '').toLowerCase();
    return mime.includes('pdf') || ext === 'pdf';
  }

  /* ════════════════════════════════════════
     PREVIEW MODAL
     ════════════════════════════════════════ */

  function openPreview(file) {
    var overlay = document.getElementById('cfPreviewOverlay');
    var body = document.getElementById('cfPreviewBody');
    var nameEl = document.getElementById('cfPreviewName');
    var typeEl = document.getElementById('cfPreviewType');
    var sizeEl = document.getElementById('cfPreviewSize');
    var downloadLink = document.getElementById('cfPreviewDownload');
    if (!overlay || !body) return;

    var url = file.public_url || file.file_url || '';
    var fileName = file.file_name || 'file';
    var fileType = file.file_type || '';
    var fileSize = file.file_size || 0;

    nameEl.textContent = fileName;
    typeEl.textContent = getFileTypeLabel(fileType, fileName);
    sizeEl.textContent = formatFileSize(fileSize);
    downloadLink.href = url;
    downloadLink.download = fileName;

    body.innerHTML = '<div class="cf-modal-loading"><div class="cf-modal-spinner"></div></div>';
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(function () {
      if (url) {
        if (isImageFile(fileName)) {
          var img = new Image();
          img.onload = function () {
            body.innerHTML = '';
            body.appendChild(img);
          };
          img.onerror = function () {
            body.innerHTML = '<div class="cf-modal-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Failed to load image</span></div>';
          };
          img.src = url;
          img.alt = fileName;
          img.style.maxWidth = '100%';
          img.style.maxHeight = '65vh';
          img.style.objectFit = 'contain';
          img.style.display = 'block';
        } else if (isVideoFile(fileName)) {
          body.innerHTML = '<video src="' + escapeHtml(url) + '" controls autoplay style="max-width:100%;max-height:65vh;width:100%;display:block;"></video>';
        } else if (isPdfFile(fileType, fileName)) {
          body.innerHTML = '<embed src="' + escapeHtml(url) + '" type="application/pdf" style="width:100%;height:65vh;border:none;" />';
        } else {
          body.innerHTML = '<div class="cf-modal-placeholder">' + getFileIconSvg(fileType, fileName) + '<span>Preview not available for this file type</span></div>';
        }
      } else {
        body.innerHTML = '<div class="cf-modal-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>File URL not available</span></div>';
      }
    }, 300);
  }

  function closePreview() {
    var overlay = document.getElementById('cfPreviewOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  /* ════════════════════════════════════════
     RENDER FUNCTIONS
     ════════════════════════════════════════ */

  function renderSkeleton() {
    var html = '';
    for (var i = 0; i < 4; i++) {
      html += '<div class="cf-skeleton-row">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<div class="dash-skeleton icon"></div>' +
          '<div style="flex:1;"><div class="dash-skeleton" style="width:60%;margin-bottom:5px;"></div><div class="dash-skeleton" style="width:40%;height:10px;"></div></div>' +
        '</div>' +
        '<div class="dash-skeleton" style="width:50%;"></div>' +
        '<div class="dash-skeleton" style="width:40%;"></div>' +
        '<div class="dash-skeleton" style="width:35%;"></div>' +
        '<div class="dash-skeleton" style="width:50%;"></div>' +
        '<div class="dash-skeleton" style="width:100px;height:30px;border-radius:8px;margin:0 auto;"></div>' +
      '</div>';
    }
    return html;
  }

  function renderRecentSkeleton() {
    var html = '';
    for (var i = 0; i < 4; i++) {
      html += '<div class="dash-skeleton cf-skeleton-recent" style="padding:16px;display:flex;flex-direction:column;gap:10px;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<div class="dash-skeleton" style="width:36px;height:36px;border-radius:10px;"></div>' +
          '<div class="dash-skeleton" style="flex:1;height:12px;"></div>' +
        '</div>' +
        '<div class="dash-skeleton" style="width:60%;height:10px;"></div>' +
        '<div class="dash-skeleton" style="width:40%;height:8px;"></div>' +
      '</div>';
    }
    return html;
  }

  function renderEmpty() {
    return '<div class="dash-empty cf-empty-wrap">' +
      '<div class="dash-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
      '<div class="dash-empty-title">No files yet</div>' +
      '<div class="dash-empty-desc">Files and deliverables from your orders will appear here once they are uploaded by the team. Explore our services to get started.</div>' +
      '<div class="dash-empty-actions">' +
        '<a href="services.html" class="dash-empty-btn dash-empty-btn-primary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> Browse Services</a>' +
      '</div>' +
    '</div>';
  }

  function renderError(msg) {
    return '<div class="dash-error">' +
      '<div class="dash-error-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>' +
      '<div class="dash-error-title">Failed to load files</div>' +
      '<div class="dash-error-desc">' + escapeHtml(msg || 'An error occurred while loading your files.') + '</div>' +
    '</div>';
  }

  function updateStats() {
    var totalEl = document.getElementById('cfTotalFiles');
    var storageEl = document.getElementById('cfStorageUsed');
    var dateEl = document.getElementById('cfLatestDate');
    if (totalEl) totalEl.textContent = _files.length;
    var totalBytes = _files.reduce(function (sum, f) { return sum + (f.file_size || 0); }, 0);
    if (storageEl) storageEl.textContent = formatFileSize(totalBytes);
    if (dateEl) {
      var sorted = _files.slice().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
      dateEl.textContent = sorted.length > 0 ? formatDate(sorted[0].created_at) : '\u2014';
    }
  }

  function renderRecentDeliverables() {
    var grid = document.getElementById('cfRecentGrid');
    if (!grid) return;

    if (_files.length === 0) {
      grid.innerHTML = '';
      return;
    }

    var sorted = _files.slice().sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    var recent = sorted.slice(0, 4);

    var cards = recent.map(function (f) {
      var badgeClass = getBadgeClass(f.file_type, f.file_name);
      var badgeLabel = getFileTypeLabel(f.file_type, f.file_name);
      var orderName = getOrderName(f.order_id);
      var fileTypeLabel = getFileTypeLabel(f.file_type, f.file_name);

      return '<div class="cf-recent-card dash-fade-in" data-file-index="' + _files.indexOf(f) + '">' +
        '<div class="cf-recent-card-top">' +
          '<div class="cf-recent-card-icon">' + getFileIconSvg(f.file_type, f.file_name) + '</div>' +
          '<div class="cf-recent-card-name">' + escapeHtml(f.file_name) + '</div>' +
        '</div>' +
        '<div class="cf-recent-card-body">' +
          '<div class="cf-recent-card-meta">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>' +
            '<span>' + formatFileSize(f.file_size) + '</span>' +
          '</div>' +
          '<div class="cf-recent-card-meta">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
            '<span>' + formatDate(f.created_at) + '</span>' +
          '</div>' +
          '<div style="margin-top:4px;"><span class="cf-recent-card-badge ' + badgeClass + '">' + escapeHtml(badgeLabel) + '</span></div>' +
        '</div>' +
      '</div>';
    }).join('');

    grid.innerHTML = cards;

    grid.querySelectorAll('.cf-recent-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-file-index'), 10);
        if (idx >= 0 && idx < _files.length) {
          openPreview(_files[idx]);
        }
      });
    });
  }

  function renderFiles() {
    var container = document.getElementById('cfContent');
    if (!container) return;

    if (_files.length === 0) {
      container.innerHTML = renderEmpty();
      return;
    }

    var sorted = _files.slice().sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    var rows = sorted.map(function (f) {
      var orderName = getOrderName(f.order_id);
      var orderLink = getOrderLink(f.order_id);
      var fileTypeLabel = getFileTypeLabel(f.file_type, f.file_name);
      var badgeClass = getBadgeClass(f.file_type, f.file_name);
      var downloadUrl = f.public_url || f.file_url || '#';
      var fileIndex = _files.indexOf(f);

      return '<tr>' +
        '<td data-label="File Name">' +
          '<div class="cf-file-name">' +
            '<div class="cf-file-icon">' + getFileIconSvg(f.file_type, f.file_name) + '</div>' +
            '<div>' +
              '<div class="cf-file-title">' + escapeHtml(f.file_name) + '</div>' +
              '<div class="cf-file-meta">' + escapeHtml(orderName) + '</div>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td data-label="File Type"><span class="cf-type-badge ' + badgeClass + '">' + escapeHtml(fileTypeLabel) + '</span></td>' +
        '<td data-label="File Size"><span style="font-weight:500;color:var(--white);font-size:0.8rem;">' + formatFileSize(f.file_size) + '</span></td>' +
        '<td data-label="Upload Date"><span style="font-size:0.78rem;color:var(--gray2);">' + formatDate(f.created_at) + '</span></td>' +
        '<td data-label="Related Order">' + orderLink + '</td>' +
        '<td data-label="Actions">' +
          '<div class="cf-actions">' +
            '<button class="cf-action-btn cf-action-btn-preview" data-file-index="' + fileIndex + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>Preview</span></button>' +
            '<button class="cf-action-btn cf-action-btn-download" data-url="' + escapeHtml(downloadUrl) + '" data-name="' + escapeHtml(f.file_name || 'download') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span class="cf-btn-spinner"></span><span class="cf-btn-text">Download</span></button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    container.innerHTML =
      '<table class="cf-table">' +
        '<thead><tr>' +
          '<th>File Name</th>' +
          '<th>File Type</th>' +
          '<th>File Size</th>' +
          '<th>Upload Date</th>' +
          '<th>Related Order</th>' +
          '<th style="width:160px;">Actions</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';

    container.querySelectorAll('.cf-action-btn-preview').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-file-index'), 10);
        if (idx >= 0 && idx < _files.length) {
          openPreview(_files[idx]);
        }
      });
    });

    container.querySelectorAll('.cf-action-btn-download').forEach(function (btn) {
      var url = btn.getAttribute('data-url');
      var name = btn.getAttribute('data-name');
      if (url && url !== '#') {
        btn.addEventListener('click', function (e) {
          if (btn.classList.contains('loading')) return;
          btn.classList.add('loading');
          var a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.download = name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () {
            btn.classList.remove('loading');
          }, 1200);
        });
      } else {
        btn.style.opacity = '0.4';
        btn.style.pointerEvents = 'none';
        btn.querySelector('.cf-btn-text').textContent = 'Unavailable';
      }
    });
  }

  /* ════════════════════════════════════════
     DOWNLOAD ALL
     ════════════════════════════════════════ */

  async function downloadAllFiles() {
    var btn = document.getElementById('downloadAllBtn');
    if (!btn) return;
    if (btn.classList.contains('loading')) return;

    var downloadable = _files.filter(function (f) { return f.public_url || f.file_url; });
    if (downloadable.length === 0) return;

    btn.classList.add('loading');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<span class="cf-btn-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(4,4,4,0.2);border-top-color:var(--bg);border-radius:50%;animation:cfSpin 0.6s linear infinite;"></span> Downloading...';

    for (var i = 0; i < downloadable.length; i++) {
      var f = downloadable[i];
      try {
        var a = document.createElement('a');
        a.href = f.public_url || f.file_url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.download = f.file_name || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise(function (r) { setTimeout(r, 400); });
      } catch (e) {
        console.warn('[ClientFiles] Failed to download:', f.file_name, e);
      }
    }

    btn.classList.remove('loading');
    btn.innerHTML = originalText;
  }

  /* ════════════════════════════════════════
     DATA LOADING
     ════════════════════════════════════════ */

  async function loadFiles() {
    var container = document.getElementById('cfContent');
    var recentGrid = document.getElementById('cfRecentGrid');
    if (container) container.innerHTML = renderSkeleton();
    if (recentGrid) recentGrid.innerHTML = renderRecentSkeleton();
    updateStats();

    try {
      var { data: { session } } = await window.supabaseClient.auth.getSession();

      if (!session) {
        var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = 'login.html?redirect=' + returnUrl;
        return;
      }

      _user = session.user;

      try {
        var { data: profile } = await window.supabaseClient
          .from('profiles')
          .select('full_name, email, role')
          .eq('id', _user.id)
          .single();
      } catch (e) {
        console.warn('[ClientFiles] Profile load failed:', e);
      }

      _orders = await NagrivaOrders.getUserOrders();

      if (!_orders || _orders.length === 0) {
        if (container) container.innerHTML = renderEmpty();
        if (recentGrid) recentGrid.innerHTML = '';
        updateStats();
        return;
      }

      var allFiles = [];

      for (var i = 0; i < _orders.length; i++) {
        var orderId = _orders[i].id;

        try {
          var deliverables = typeof NAGRIVA_DeliverablesAPI !== 'undefined'
            ? await NAGRIVA_DeliverablesAPI.getDeliverables(orderId)
            : [];

          deliverables.forEach(function (d) {
            allFiles.push({
              id: d.id,
              order_id: d.order_id,
              file_name: d.file_name,
              file_size: d.file_size,
              file_type: d.file_type,
              created_at: d.created_at,
              public_url: d.file_url,
              source: 'deliverable'
            });
          });
        } catch (e) {
          console.warn('[ClientFiles] Failed to load deliverables for order ' + orderId + ':', e);
        }

        try {
          var uploadedFiles = await NagrivaOrders.getFiles(orderId);
          uploadedFiles.forEach(function (f) {
            allFiles.push({
              id: f.id,
              order_id: f.order_id,
              file_name: f.file_name,
              file_size: f.file_size,
              file_type: f.file_type,
              created_at: f.created_at,
              public_url: f.public_url,
              source: 'upload'
            });
          });
        } catch (e) {
          console.warn('[ClientFiles] Failed to load files for order ' + orderId + ':', e);
        }
      }

      var seen = {};
      _files = allFiles.filter(function (f) {
        var key = f.file_name + '_' + f.file_size + '_' + f.order_id;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });

      renderRecentDeliverables();
      renderFiles();
      updateStats();

      var downloadAllBtn = document.getElementById('downloadAllBtn');
      if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', function (e) {
          e.preventDefault();
          downloadAllFiles();
        });
      }
    } catch (err) {
      console.error('[ClientFiles] Error loading files:', err);
      var container2 = document.getElementById('cfContent');
      if (container2) container2.innerHTML = renderError(err.message || 'An unexpected error occurred.');
    }
  }

  /* ════════════════════════════════════════
     MODAL EVENT BINDING
     ════════════════════════════════════════ */

  document.addEventListener('DOMContentLoaded', function () {
    var overlay = document.getElementById('cfPreviewOverlay');
    var closeBtn = document.getElementById('cfPreviewClose');

    if (closeBtn) {
      closeBtn.addEventListener('click', closePreview);
    }
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closePreview();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePreview();
    });

    loadFiles();
  });
})();
