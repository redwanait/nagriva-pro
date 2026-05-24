const NAGRIVA_Files = (() => {
  let files = [];
  let orders = [];
  let filters = { search: '', type: '' };
  let onChangeCallbacks = [];
  let realtimeChannel = null;
  let _loading = false;
  let _error = null;

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function getFileIcon(type) {
    if (!type) return 'fa-file';
    if (type.startsWith('image/')) return 'fa-file-image';
    if (type.startsWith('video/')) return 'fa-file-video';
    if (type.startsWith('audio/')) return 'fa-file-audio';
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return 'fa-file-archive';
    if (type.includes('word') || type.includes('document')) return 'fa-file-word';
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return 'fa-file-excel';
    return 'fa-file';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  async function fetchFiles() {
    const { data: allOrders, error: ordersError } = await window.supabaseClient
      .from('orders')
      .select('id, client_name, project_title, order_number')
      .order('created_at', { ascending: false });
    if (ordersError) throw ordersError;
    orders = allOrders || [];

    const { data: allFiles, error: filesError } = await window.supabaseClient
      .from('files')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    if (filesError) throw filesError;

    return (allFiles || []).map(f => {
      const order = orders.find(o => o.id === f.order_id);
      const { data: urlData } = window.supabaseClient.storage
        .from('order-files')
        .getPublicUrl(f.storage_path);
      return {
        ...f,
        public_url: urlData.publicUrl,
        orderName: order ? (order.client_name || order.project_title || order.order_number) : 'Unknown Order',
        uploaderName: f.profiles ? f.profiles.full_name : 'Unknown'
      };
    });
  }

  async function init(containerEl) {
    _loading = true;
    _error = null;
    if (containerEl) containerEl.innerHTML = renderSkeleton();
    try {
      files = await fetchFiles();
      _loading = false;
      if (containerEl) renderFiles(containerEl);
      notifyChange();
      setupRealtime();
    } catch (err) {
      _loading = false;
      _error = err;
      console.error('[Files] init failed:', err);
      if (containerEl) {
        containerEl.innerHTML = `
          <div class="orders-empty">
            <div class="orders-empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <h3>Failed to Load Files</h3>
            <p>${err.message || 'Could not connect to database.'}</p>
            <button class="btn btn-primary empty-new-order-btn" style="margin-top:20px;" onclick="NAGRIVA_Files.init(document.getElementById('filesContainer'))">
              <i class="fas fa-sync"></i> Retry
            </button>
          </div>`;
      }
      showToast('error', 'Connection Error', 'Could not load files from database.');
    }
  }

  function setupRealtime() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    realtimeChannel = window.supabaseClient
      .channel('admin-files-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'files' },
        async () => {
          try {
            files = await fetchFiles();
            notifyChange();
            const container = document.getElementById('filesContainer');
            if (container) renderFiles(container);
          } catch (e) {
            console.warn('[Files] Realtime sync error:', e.message || e);
          }
        }
      )
      .subscribe();
  }

  async function uploadFile(file, orderId) {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const filePath = user.id + '/' + orderId + '/' + Date.now() + '_' + file.name;
    const { error: uploadError } = await window.supabaseClient.storage
      .from('order-files')
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = window.supabaseClient.storage
      .from('order-files')
      .getPublicUrl(filePath);

    const { data, error: dbError } = await window.supabaseClient
      .from('files')
      .insert({
        order_id: orderId,
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || 'application/octet-stream',
        storage_path: filePath,
        uploaded_by: 'admin'
      })
      .select()
      .single();
    if (dbError) throw dbError;

    files = await fetchFiles();
    notifyChange();
    showToast('success', 'File Uploaded', file.name + ' uploaded successfully');
    return { ...data, public_url: urlData.publicUrl };
  }

  async function deleteFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) throw new Error('File not found');

    const { error: storageError } = await window.supabaseClient.storage
      .from('order-files')
      .remove([file.storage_path]);
    if (storageError) console.warn('[Files] Storage delete warning:', storageError);

    const { error: dbError } = await window.supabaseClient
      .from('files')
      .delete()
      .eq('id', fileId);
    if (dbError) throw dbError;

    files = files.filter(f => f.id !== fileId);
    notifyChange();
    showToast('info', 'File Deleted', file.file_name + ' has been removed.');
    return true;
  }

  function getFileUrl(fileId) {
    const file = files.find(f => f.id === fileId);
    return file ? file.public_url : null;
  }

  function getFiles() {
    return [...files];
  }

  function getOrders() {
    return [...orders];
  }

  function setSearch(query) {
    filters.search = (query || '').toLowerCase().trim();
    return getFilteredFiles();
  }

  function setTypeFilter(type) {
    filters.type = type || '';
    return getFilteredFiles();
  }

  function getFilteredFiles() {
    let result = [...files];
    if (filters.search) {
      const q = filters.search;
      result = result.filter(f =>
        (f.file_name || '').toLowerCase().includes(q) ||
        (f.orderName || '').toLowerCase().includes(q) ||
        (f.file_type || '').toLowerCase().includes(q)
      );
    }
    if (filters.type) {
      if (filters.type === 'image') result = result.filter(f => (f.file_type || '').startsWith('image/'));
      else if (filters.type === 'document') result = result.filter(f => (f.file_type || '').includes('pdf') || (f.file_type || '').includes('word') || (f.file_type || '').includes('document'));
      else if (filters.type === 'archive') result = result.filter(f => (f.file_type || '').includes('zip') || (f.file_type || '').includes('rar'));
    }
    return result;
  }

  function onChange(cb) {
    onChangeCallbacks.push(cb);
    return () => {
      onChangeCallbacks = onChangeCallbacks.filter(fn => fn !== cb);
    };
  }

  function notifyChange() {
    onChangeCallbacks.forEach(fn => fn([...files]));
  }

  function renderSkeleton() {
    let html = '<div class="orders-skeleton">';
    for (let i = 0; i < 5; i++) {
      html += `
        <div class="orders-skeleton-row">
          <div class="orders-skeleton-bar row"><div class="orders-skeleton-bar" style="width:32px;height:32px;border-radius:8px;"></div><div><div class="orders-skeleton-bar w60"></div></div></div>
          <div class="orders-skeleton-bar w50"></div>
          <div class="orders-skeleton-bar w30"></div>
          <div class="orders-skeleton-bar w40"></div>
        </div>`;
    }
    html += '</div>';
    return html;
  }

  function renderFiles(container) {
    if (!container) return;
    if (_loading) {
      container.innerHTML = renderSkeleton();
      return;
    }
    const filtered = getFilteredFiles();
    const countEl = document.getElementById('filesCount');
    if (countEl) {
      countEl.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${files.length}</strong> files`;
    }
    if (files.length === 0) {
      container.innerHTML = `
        <div class="orders-empty">
          <div class="orders-empty-icon"><i class="fas fa-folder-open"></i></div>
          <h3>No files yet</h3>
          <p>Files uploaded to orders will appear here.</p>
        </div>`;
      return;
    }
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="orders-empty">
          <div class="orders-empty-icon"><i class="fas fa-search"></i></div>
          <h3>No files match your search</h3>
          <p>Try different keywords or filters.</p>
        </div>`;
      return;
    }
    container.innerHTML = `
      <div class="orders-table-wrap">
        <table class="orders-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Order</th>
              <th>Uploaded By</th>
              <th>Size</th>
              <th>Date</th>
              <th style="width:80px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(f => `
              <tr data-id="${f.id}">
                <td>
                  <div class="td-user">
                    <div class="td-avatar" style="background:var(--surface);color:var(--accent);border:1px solid var(--border);font-size:0.8rem;"><i class="fas ${getFileIcon(f.file_type)}"></i></div>
                    <div>
                      <div class="td-name" style="font-size:0.82rem;">${escapeHtml(f.file_name)}</div>
                      <div class="td-email">${f.file_type || 'Unknown'}</div>
                    </div>
                  </div>
                </td>
                <td><span style="color:var(--gray);font-size:0.8rem;">${escapeHtml(f.orderName)}</span></td>
                <td><span style="color:var(--gray);font-size:0.8rem;">${escapeHtml(f.uploaderName)}</span></td>
                <td><span class="td-amount" style="font-weight:400;">${formatFileSize(f.file_size)}</span></td>
                <td><span style="color:var(--gray2);font-size:0.78rem;">${formatDate(f.created_at)}</span></td>
                <td>
                  <div class="td-actions">
                    <a href="${f.public_url}" target="_blank" class="td-action-btn" title="Download"><i class="fas fa-download"></i></a>
                    <button class="td-action-btn danger" data-action="delete-file" title="Delete"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function destroy() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    onChangeCallbacks = [];
    files = [];
    orders = [];
  }

  return {
    init,
    uploadFile,
    deleteFile,
    getFileUrl,
    getFiles,
    getOrders,
    getFilteredFiles,
    setSearch,
    setTypeFilter,
    onChange,
    renderFiles,
    formatFileSize,
    getFileIcon,
    destroy,
    get loading() { return _loading; },
    get error() { return _error; }
  };
})();
