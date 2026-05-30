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

  function renderSkeleton() {
    var html = '';
    for (var i = 0; i < 5; i++) {
      html += '<div class="cf-skeleton-row">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<div class="cf-skeleton-bar icon"></div>' +
          '<div style="flex:1;"><div class="cf-skeleton-bar w60" style="width:60%;"></div><div class="cf-skeleton-bar w40" style="width:40%;margin-top:6px;"></div></div>' +
        '</div>' +
        '<div class="cf-skeleton-bar w50"></div>' +
        '<div class="cf-skeleton-bar w40"></div>' +
        '<div class="cf-skeleton-bar w30"></div>' +
        '<div class="cf-skeleton-bar w50"></div>' +
        '<div class="cf-skeleton-bar w40" style="width:60px;"></div>' +
      '</div>';
    }
    return html;
  }

  function renderEmpty() {
    return '<div class="cf-empty">' +
      '<div class="cf-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
      '<h3>No files yet</h3>' +
      '<p>Files and deliverables from your orders will appear here once they are uploaded by the team.</p>' +
    '</div>';
  }

  function renderError(msg) {
    return '<div class="cf-empty">' +
      '<div class="cf-empty-icon" style="color:#ff5050;border-color:rgba(255,80,80,0.2);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>' +
      '<h3>Failed to load files</h3>' +
      '<p>' + escapeHtml(msg || 'An error occurred while loading your files.') + '</p>' +
    '</div>';
  }

  function updateStats() {
    document.getElementById('cfTotalFiles').textContent = _files.length;
    var totalBytes = _files.reduce(function (sum, f) { return sum + (f.file_size || 0); }, 0);
    document.getElementById('cfStorageUsed').textContent = formatFileSize(totalBytes);
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
      var downloadUrl = f.public_url || f.file_url || '#';
      var fileTypeLabel = getFileTypeLabel(f.file_type, f.file_name);

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
        '<td data-label="Type"><span style="font-size:0.78rem;">' + escapeHtml(fileTypeLabel) + '</span></td>' +
        '<td data-label="Size"><span style="font-weight:500;color:var(--white);">' + formatFileSize(f.file_size) + '</span></td>' +
        '<td data-label="Upload Date"><span style="font-size:0.78rem;">' + formatDate(f.created_at) + '</span></td>' +
        '<td data-label="Related Order">' + orderLink + '</td>' +
        '<td data-label="Download"><a href="' + downloadUrl + '" target="_blank" class="cf-download-btn" download><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download</a></td>' +
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
          '<th style="width:120px;">Download</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';
  }

  async function loadFiles() {
    var container = document.getElementById('cfContent');
    if (container) container.innerHTML = renderSkeleton();
    updateStats();

    try {
      _user = await NagrivaOrders.getCurrentUser();
      console.log('[ClientFiles] Current user:', _user);

      if (!_user) {
        if (container) container.innerHTML = renderError('Please sign in to view your files.');
        return;
      }

      _orders = await NagrivaOrders.getUserOrders();
      console.log('[ClientFiles] Client orders:', _orders);

      if (!_orders || _orders.length === 0) {
        if (container) container.innerHTML = renderEmpty();
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

      console.log('[ClientFiles] Files loaded:', _files);
      renderFiles();
      updateStats();
    } catch (err) {
      console.error('[ClientFiles] Error loading files:', err);
      var container2 = document.getElementById('cfContent');
      if (container2) container2.innerHTML = renderError(err.message || 'An unexpected error occurred.');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadFiles();
  });
})();
