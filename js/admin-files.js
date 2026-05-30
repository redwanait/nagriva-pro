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

  async function fetchFiles() {
    console.log('[Files] Fetching from deliverables bucket...');

    const allOrders = await NAGRIVA_OrdersAPI.fetchOrdersList('id, client_name, project_title, order_number');
    orders = allOrders || [];
    console.log('[Files] Orders loaded:', orders.length);

    const { data: allDeliverables, error } = await window.supabaseClient
      .from('deliverables')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    console.log('[Files] Deliverables loaded from DB:', allDeliverables ? allDeliverables.length : 0);

    const enriched = (allDeliverables || []).map(d => {
      const order = orders.find(o => o.id === d.order_id);
      return {
        ...d,
        public_url: d.file_url,
        orderName: order ? (order.client_name || order.project_title || order.order_number) : 'Unknown Order',
        uploaderName: 'Admin'
      };
    });

    console.log('[Files] Total files found:', enriched.length);
    return enriched;
  }

  async function init(containerEl) {
    _loading = true;
    _error = null;
    if (containerEl) containerEl.innerHTML = renderSkeleton();
    updateStats();

    const timeout = setTimeout(() => {
      if (_loading) {
        _loading = false;
        _error = new Error('Loading timed out');
        console.error('[Files] Loading timed out');
        if (containerEl) {
          containerEl.innerHTML = NAGRIVA_EmptyState.render({
            icon: 'fas fa-exclamation-triangle',
            title: 'Failed to Load Files',
            description: 'Request timed out. Please check your connection and try again.',
            variant: 'error',
            primaryCta: { icon: 'fas fa-sync', label: 'Retry', onclick: 'NAGRIVA_Files.init(document.getElementById(\'filesContainer\'))' }
          });
        }
        NAGRIVA_Toast.error('Connection Error', 'Files request timed out.');
      }
    }, 20000);

    try {
      files = await fetchFiles();
      clearTimeout(timeout);
      _loading = false;
      if (containerEl) renderFiles(containerEl);
      updateStats();
      notifyChange();
      setupRealtime();
    } catch (err) {
      clearTimeout(timeout);
      _loading = false;
      _error = err;
      console.error('[Files] init failed:', err);
      if (containerEl) {
        containerEl.innerHTML = NAGRIVA_EmptyState.render({
          icon: 'fas fa-exclamation-triangle',
          title: 'Failed to Load Files',
          description: err.message || 'Could not connect to database.',
          variant: 'error',
          primaryCta: { icon: 'fas fa-sync', label: 'Retry', onclick: 'NAGRIVA_Files.init(document.getElementById(\'filesContainer\'))' }
        });
      }
      NAGRIVA_Toast.error('Connection Error', 'Could not load files from database.');
    }
  }

  function updateStats() {
    const totalCountEl = document.getElementById('filesTotalCount');
    const storageUsedEl = document.getElementById('filesStorageUsed');
    if (totalCountEl) totalCountEl.textContent = files.length;
    if (storageUsedEl) {
      const totalBytes = files.reduce((sum, f) => sum + (f.file_size || 0), 0);
      storageUsedEl.textContent = formatFileSize(totalBytes);
    }
    const statsGrid = document.getElementById('filesStats');
    if (statsGrid) statsGrid.style.display = files.length > 0 ? '' : 'none';
  }

  function setupRealtime() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    realtimeChannel = window.supabaseClient
      .channel('admin-files-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'deliverables' },
        async () => {
          try {
            files = await fetchFiles();
            notifyChange();
            updateStats();
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
      .from('deliverables')
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = window.supabaseClient.storage
      .from('deliverables')
      .getPublicUrl(filePath);

    const { data, error: dbError } = await window.supabaseClient
      .from('deliverables')
      .insert({
        order_id: orderId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type || 'application/octet-stream'
      })
      .select()
      .single();
    if (dbError) throw dbError;

    files = await fetchFiles();
    notifyChange();
    updateStats();
    NAGRIVA_Toast.success('File Uploaded', file.name + ' uploaded successfully');
    return data;
  }

  async function deleteFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) throw new Error('File not found');

    const pathPart = file.file_url.split('deliverables/').pop();
    const storagePath = decodeURIComponent(pathPart.split('?')[0]);
    if (storagePath) {
      const { error: storageError } = await window.supabaseClient.storage
        .from('deliverables')
        .remove([storagePath]);
      if (storageError) console.warn('[Files] Storage delete warning:', storageError);
    }

    const { error: dbError } = await window.supabaseClient
      .from('deliverables')
      .delete()
      .eq('id', fileId);
    if (dbError) throw dbError;

    files = files.filter(f => f.id !== fileId);
    notifyChange();
    updateStats();
    NAGRIVA_Toast.info('File Deleted', file.file_name + ' has been removed.');
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
        <div class="orders-skeleton-row" style="grid-template-columns:2fr 1.2fr 1fr 0.8fr 1fr 80px;">
          <div class="orders-skeleton-bar row"><div class="orders-skeleton-bar" style="width:32px;height:32px;border-radius:8px;"></div><div><div class="orders-skeleton-bar w60"></div><div class="orders-skeleton-bar w40" style="margin-top:6px;"></div></div></div>
          <div class="orders-skeleton-bar w50"></div>
          <div class="orders-skeleton-bar w40"></div>
          <div class="orders-skeleton-bar w30"></div>
          <div class="orders-skeleton-bar w40"></div>
          <div class="orders-skeleton-bar w40" style="width:32px;height:32px;border-radius:6px;margin:0 auto;"></div>
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
      container.innerHTML = NAGRIVA_EmptyState.render({
        icon: 'fas fa-folder-open',
        title: 'No files uploaded',
        description: 'Upload files to any order to collaborate with your team. All project files, assets, and deliverables will be stored here.'
      });
      return;
    }
    if (filtered.length === 0) {
      container.innerHTML = NAGRIVA_EmptyState.render({
        icon: 'fas fa-search',
        title: 'No matching files',
        description: 'No files match your current search. Try different keywords or clear your filters.',
        variant: 'search'
      });
      return;
    }
    container.innerHTML = `
      <div class="orders-table-wrap">
        <table class="orders-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Order</th>
              <th>Type</th>
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
                <td><span style="color:var(--gray);font-size:0.8rem;">${(f.file_type || 'Unknown').split('/').pop().toUpperCase()}</span></td>
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
    updateStats,
    destroy,
    get loading() { return _loading; },
    get error() { return _error; }
  };
})();
