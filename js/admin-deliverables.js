const NAGRIVA_AdminDeliverables = (() => {
  'use strict';

  let _deliverables = [];
  let _orderId = null;
  let _subscriptions = [];
  let _realtimeChannel = null;

  function getFileIcon(fileType, fileName) {
    if (!fileType && !fileName) return 'fa-file';
    const name = (fileName || '').toLowerCase();
    const type = (fileType || '').toLowerCase();

    if (type.includes('pdf') || name.endsWith('.pdf')) return 'fa-file-pdf';
    if (type.includes('zip') || name.endsWith('.zip')) return 'fa-file-archive';
    if (type.includes('png') || name.endsWith('.png')) return 'fa-file-image';
    if (type.includes('jpeg') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'fa-file-image';
    if (type.includes('mp4') || name.endsWith('.mp4')) return 'fa-file-video';
    if (type.includes('word') || type.includes('document') || name.endsWith('.docx')) return 'fa-file-word';
    return 'fa-file';
  }

  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML = `
      <div class="toast-icon ${type}"><i class="fas ${icons[type] || icons.info}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close"><i class="fas fa-times"></i></button>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    });
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  function renderDeliverablesSection(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const list = _deliverables.map(d => {
      const icon = getFileIcon(d.file_type, d.file_name);
      return `
        <div class="deliverable-item" data-id="${d.id}">
          <div class="deliverable-icon"><i class="fas ${icon}"></i></div>
          <div class="deliverable-info">
            <div class="deliverable-name">${escapeHtml(d.file_name)}</div>
            <div class="deliverable-meta">
              ${formatFileSize(d.file_size)} &middot; ${formatDate(d.created_at)}
            </div>
          </div>
          <div class="deliverable-actions">
            <a href="${d.file_url}" target="_blank" class="deliverable-action-btn" title="Download" download>
              <i class="fas fa-download"></i>
            </a>
            <button class="deliverable-action-btn danger" data-deliverable-id="${d.id}" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    const count = _deliverables.length;
    const uploadBtn = `
      <button class="btn btn-primary btn-sm" id="deliverableUploadBtn">
        <i class="fas fa-upload"></i> Upload File
      </button>`;

    container.innerHTML = `
      <div class="deliverables-section">
        <div class="deliverables-header">
          <div class="deliverables-title">
            <i class="fas fa-file-export"></i> Deliverables
            ${count > 0 ? `<span class="deliverables-count">${count}</span>` : ''}
          </div>
          ${uploadBtn}
        </div>
        ${count > 0
          ? `<div class="deliverables-list">${list}</div>`
          : `<div class="deliverables-empty">
              <div class="deliverables-empty-icon"><i class="fas fa-cloud-upload-alt"></i></div>
              <div class="deliverables-empty-text">No deliverables uploaded yet</div>
              <div class="deliverables-empty-hint">Upload ZIP, PDF, PNG, JPG, MP4, or DOCX files</div>
            </div>`
        }
      </div>`;

    bindEvents(container);
  }

  function bindEvents(container) {
    const uploadBtn = container.querySelector('#deliverableUploadBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        openFilePicker();
      });
    }

    container.querySelectorAll('[data-deliverable-id]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.dataset.deliverableId;
        const confirmed = await NAGRIVA_Modal.showConfirm('Delete Deliverable', 'Are you sure you want to delete this file? This action cannot be undone.');
        if (!confirmed) return;
        try {
          await NAGRIVA_DeliverablesAPI.deleteDeliverable(id);
          _deliverables = _deliverables.filter(d => d.id !== id);
          renderDeliverablesSection('deliverablesContainer');
          showToast('success', 'File Deleted', 'Deliverable has been removed.');
        } catch (err) {
          showToast('error', 'Delete Failed', err.message || 'Could not delete file.');
        }
      });
    });
  }

  function openFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.pdf,.png,.jpg,.jpeg,.mp4,.docx';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file || !_orderId) return;
      await uploadFile(file);
    };
    input.click();
  }

  async function uploadFile(file) {
    try {
      const uploadBtn = document.getElementById('deliverableUploadBtn');
      if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
      }

      const deliverable = await NAGRIVA_DeliverablesAPI.uploadDeliverable(_orderId, file);

      _deliverables.unshift(deliverable);
      renderDeliverablesSection('deliverablesContainer');

      await triggerNotifications(deliverable);

      showToast('success', 'File Uploaded', file.name + ' has been uploaded as a deliverable.');
    } catch (err) {
      showToast('error', 'Upload Failed', err.message || 'Could not upload file.');
    } finally {
      const uploadBtn = document.getElementById('deliverableUploadBtn');
      if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload File';
      }
    }
  }

  async function triggerNotifications(deliverable) {
    try {
      const targetUserId = await NAGRIVA_DeliverablesAPI.getOrderClientUserId(_orderId);
      if (!targetUserId) return;

      if (typeof NAGRIVA_NotificationTriggers !== 'undefined') {
        await NAGRIVA_NotificationTriggers.adminAction(
          targetUserId,
          'New File Delivered',
          'A new file has been uploaded to your order.',
          '/pages/order-tracking.html?id=' + _orderId,
          { trigger: 'file_delivered', order_id: _orderId, deliverable_id: deliverable.id, type: 'file' }
        );
      } else {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        await window.supabaseClient.from('notifications').insert({
          user_id: targetUserId,
          type: 'file',
          title: 'New File Delivered',
          message: 'A new file has been uploaded to your order.',
          link: '/pages/order-tracking.html?id=' + _orderId,
          metadata: { trigger: 'file_delivered', order_id: _orderId, deliverable_id: deliverable.id }
        });
      }

      const { data: { user } } = await window.supabaseClient.auth.getUser();
      await window.supabaseClient.from('activity_log').insert({
        order_id: _orderId,
        user_id: user ? user.id : null,
        action: 'file_uploaded',
        description: 'New deliverable uploaded: ' + deliverable.file_name
      });

    } catch (e) {
      console.warn('[AdminDeliverables] Failed to trigger notifications:', e.message || e);
    }
  }

  async function loadDeliverables(orderId) {
    _orderId = orderId;
    try {
      const data = await NAGRIVA_DeliverablesAPI.getDeliverables(orderId);
      _deliverables = data || [];
      renderDeliverablesSection('deliverablesContainer');
    } catch (err) {
      console.error('[AdminDeliverables] Failed to load deliverables:', err);
      const container = document.getElementById('deliverablesContainer');
      if (container) {
        container.innerHTML = '<div class="deliverables-error">Failed to load deliverables</div>';
      }
    }
  }

  function setupRealtime(orderId) {
    if (_realtimeChannel) {
      window.supabaseClient.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }

    _realtimeChannel = window.supabaseClient
      .channel('admin-deliverables-' + orderId)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deliverables',
          filter: 'order_id=eq.' + orderId
        },
        async (payload) => {
          const { data } = await window.supabaseClient
            .from('deliverables')
            .select('*')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            _deliverables.unshift(data);
            renderDeliverablesSection('deliverablesContainer');
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'deliverables',
          filter: 'order_id=eq.' + orderId
        },
        (payload) => {
          _deliverables = _deliverables.filter(d => d.id !== payload.old.id);
          renderDeliverablesSection('deliverablesContainer');
        }
      )
      .subscribe();
  }

  function cleanup() {
    if (_realtimeChannel) {
      window.supabaseClient.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }
    _subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e) {} });
    _subscriptions = [];
    _deliverables = [];
    _orderId = null;
  }

  return {
    loadDeliverables,
    renderDeliverablesSection,
    uploadFile,
    setupRealtime,
    cleanup,
    getFileIcon,
    formatFileSize,
    formatDate
  };
})();
