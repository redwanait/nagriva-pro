/* ════════════════════════════════════════════════════════
   NAGRIVA — Admin Services Module
   Service listing, creation, editing, deletion
   ════════════════════════════════════════════════════════ */

const NAGRIVA_AdminServices = (() => {
  const STATUS_CONFIG = {
    draft:     { label: 'Draft',     cls: 'pending',   color: '#f59e0b' },
    published: { label: 'Published', cls: 'completed', color: '#10b981' },
    archived:  { label: 'Archived',  cls: 'revision',  color: '#a855f7' }
  };

  let services = [];
  let filters = { search: '', status: '' };
  let onChangeCallbacks = [];
  let realtimeChannel = null;
  let _loading = false;
  let _error = null;

  function mapFromDB(row) {
    return {
      id: row.id,
      title: row.title || '',
      slug: row.slug || '',
      category: row.category || '',
      shortDescription: row.short_description || '',
      description: row.full_description || '',
      metaTitle: row.meta_title || '',
      metaDescription: row.meta_description || '',
      image: row.image || '',
      featured: !!row.featured,
      status: row.status || 'draft',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || null
    };
  }

  function mapToDB(data) {
    return {
      title: data.title || '',
      slug: data.slug || '',
      category: data.category || '',
      short_description: data.shortDescription || '',
      full_description: data.description || '',
      meta_title: data.metaTitle || '',
      meta_description: data.metaDescription || '',
      image: data.image || '',
      featured: !!data.featured,
      status: data.status || 'draft'
    };
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function slugify(text) {
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(type, title, message) {
    if (typeof NAGRIVA_Toast !== 'undefined') {
      NAGRIVA_Toast.show(type, title, message);
      return;
    }
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML = '<div class="toast-icon ' + type + '"><i class="fas ' + (icons[type] || icons.info) + '"></i></div><div class="toast-content"><div class="toast-title">' + title + '</div><div class="toast-message">' + message + '</div></div><button class="toast-close"><i class="fas fa-times"></i></button>';
    container.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('visible'); });
    toast.querySelector('.toast-close').addEventListener('click', function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 400);
    });
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 400);
    }, 4000);
  }

  async function fetchAllServices() {
    try {
      const data = await NAGRIVA_ServicesAPI.fetchAllServices();
      return (data || []).map(mapFromDB);
    } catch (error) {
      console.error('[AdminServices] fetchAllServices failed:', error);
      throw error;
    }
  }

  let _fetchInProgress = false;

  async function init(containerEl) {
    if (_fetchInProgress) return;
    _loading = true;
    _error = null;
    _fetchInProgress = true;
    if (containerEl) containerEl.innerHTML = renderSkeleton();
    try {
      services = await fetchAllServices();
      _loading = false;
      _fetchInProgress = false;
      if (containerEl) renderServices(containerEl);
      notifyChange();
      setupRealtime();
    } catch (err) {
      _loading = false;
      _fetchInProgress = false;
      _error = err;
      console.error('[AdminServices] init failed:', err);
      if (containerEl) {
        const detailMsg = err.hint || err.details || '';
        containerEl.innerHTML = `
          <div class="orders-empty">
            <div class="orders-empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <h3>Failed to Load Services</h3>
            <p>${escapeHtml(err.message || 'Could not connect to database.')}</p>
            ${detailMsg ? '<p style="font-size:0.75rem;color:var(--gray3);margin-top:4px;">' + escapeHtml(detailMsg) + '</p>' : ''}
            <button class="btn btn-primary empty-new-service-btn" style="margin-top:20px;" onclick="NAGRIVA_AdminServices.init(document.getElementById('servicesContainer'))">
              <i class="fas fa-sync"></i> Retry
            </button>
          </div>`;
      }
      showToast('error', 'Connection Error', 'Could not load services from database.');
    }
  }

  function setupRealtime() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    realtimeChannel = window.supabaseClient
      .channel('admin-services-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        async function(payload) {
          try {
            const fresh = await fetchAllServices();
            services = fresh;
            notifyChange();
            const container = document.getElementById('servicesContainer');
            if (container) renderServices(container);
          } catch (e) {
            console.warn('[AdminServices] Realtime sync error:', e.message || e);
          }
        }
      )
      .subscribe(function(status) {
        if (status === 'SUBSCRIBED') {
          console.log('[AdminServices] Realtime channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[AdminServices] Realtime channel error');
        } else if (status === 'TIMED_OUT') {
          console.warn('[AdminServices] Realtime channel timed out');
        }
      });
  }

  let _createInProgress = false;

  async function createService(data) {
    if (_createInProgress) throw new Error('A create operation is already in progress');
    _createInProgress = true;
    try {
      const payload = mapToDB(data);
      if (!payload.slug) payload.slug = slugify(payload.title);
      console.log('[AdminServices] createService payload:', JSON.stringify(payload, null, 2));
      const inserted = await NAGRIVA_ServicesAPI.createService(payload);
      const service = mapFromDB(inserted);
      services.unshift(service);
      notifyChange();
      showToast('success', 'Service Created', service.title + ' created successfully');
      return service;
    } catch (err) {
      console.error('[AdminServices] createService failed:', err);
      showToast('error', 'Create Failed', err.message || 'Could not create service.');
      throw err;
    } finally {
      _createInProgress = false;
    }
  }

  let _updateInProgress = false;

  async function updateService(id, updates) {
    if (_updateInProgress) throw new Error('An update operation is already in progress');
    _updateInProgress = true;
    try {
      const payload = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.slug !== undefined) payload.slug = updates.slug;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.shortDescription !== undefined) payload.short_description = updates.shortDescription;
      if (updates.description !== undefined) payload.full_description = updates.description;
      if (updates.metaTitle !== undefined) payload.meta_title = updates.metaTitle;
      if (updates.metaDescription !== undefined) payload.meta_description = updates.metaDescription;
      if (updates.image !== undefined) payload.image = updates.image;
      if (updates.featured !== undefined) payload.featured = !!updates.featured;
      if (updates.status !== undefined) payload.status = updates.status;

      const updated = await NAGRIVA_ServicesAPI.updateService(id, payload);
      const service = mapFromDB(updated);
      const idx = services.findIndex(s => s.id === id);
      if (idx !== -1) services[idx] = service;
      notifyChange();
      showToast('success', 'Service Updated', service.title + ' updated successfully');
      return service;
    } catch (err) {
      console.error('[AdminServices] updateService failed:', err);
      showToast('error', 'Update Failed', err.message || 'Could not update service.');
      throw err;
    } finally {
      _updateInProgress = false;
    }
  }

  async function deleteService(id) {
    await NAGRIVA_ServicesAPI.deleteService(id);
    const idx = services.findIndex(s => s.id === id);
    let removed = null;
    if (idx !== -1) removed = services.splice(idx, 1)[0];
    notifyChange();
    if (removed) {
      showToast('info', 'Service Deleted', removed.title + ' has been removed');
    }
    return true;
  }

  function getService(id) {
    return services.find(s => s.id === id) || null;
  }

  function getAllServices() {
    return [...services];
  }

  function setSearch(query) {
    filters.search = (query || '').toLowerCase().trim();
    return getFilteredServices();
  }

  function setStatusFilter(status) {
    filters.status = status || '';
    return getFilteredServices();
  }

  function getFilteredServices() {
    let result = [...services];
    if (filters.search) {
      const q = filters.search;
      result = result.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.slug || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.shortDescription || '').toLowerCase().includes(q)
      );
    }
    if (filters.status && STATUS_CONFIG[filters.status]) {
      result = result.filter(s => s.status === filters.status);
    }
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return result;
  }

  function getStats() {
    const total = services.length;
    const published = services.filter(s => s.status === 'published').length;
    const draft = services.filter(s => s.status === 'draft').length;
    const archived = services.filter(s => s.status === 'archived').length;
    return { total, published, draft, archived };
  }

  function onChange(cb) {
    onChangeCallbacks.push(cb);
    return function() {
      onChangeCallbacks = onChangeCallbacks.filter(function(fn) { return fn !== cb; });
    };
  }

  function notifyChange() {
    const stats = getStats();
    onChangeCallbacks.forEach(function(fn) { fn([...services], stats); });
  }

  function renderStatusBadge(status) {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) return '<span class="order-status-badge pending"><span class="status-dot"></span>Unknown</span>';
    return '<span class="order-status-badge ' + cfg.cls + '"><span class="status-dot"></span>' + cfg.label + '</span>';
  }

  function renderTableRow(service) {
    return '<tr data-id="' + service.id + '">' +
      '<td><div class="td-service-title"><span class="svc-title">' + escapeHtml(service.title) + '</span></div></td>' +
      '<td><span class="td-category">' + escapeHtml(service.category || '\u2014') + '</span></td>' +
      '<td><code class="td-slug">' + escapeHtml(service.slug) + '</code></td>' +
      '<td><div class="td-desc">' + escapeHtml((service.shortDescription || '').substring(0, 80)) + '</div></td>' +
      '<td>' + renderStatusBadge(service.status) + '</td>' +
      '<td><span class="td-date">' + formatDate(service.createdAt) + '</span></td>' +
      '<td>' +
        '<div class="td-actions">' +
          '<button class="td-action-btn" data-action="edit-service" title="Edit"><i class="fas fa-pen"></i></button>' +
          '<button class="td-action-btn danger" data-action="delete-service" title="Delete"><i class="fas fa-trash"></i></button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }

  function renderSkeleton() {
    var html = '<div class="orders-skeleton">';
    for (var i = 0; i < 5; i++) {
      html += '<div class="services-skeleton-row">' +
        '<div class="orders-skeleton-bar w60"></div>' +
        '<div class="orders-skeleton-bar w40"></div>' +
        '<div class="orders-skeleton-bar w35"></div>' +
        '<div class="orders-skeleton-bar w50"></div>' +
        '<div class="orders-skeleton-bar w30"></div>' +
        '<div class="orders-skeleton-bar w40"></div>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderEmpty(filtered) {
    if (filtered) {
      return '<div class="orders-empty">' +
        '<div class="orders-empty-icon"><i class="fas fa-search"></i></div>' +
        '<h3>No matching services</h3>' +
        '<p>No services match your current search. Try adjusting your keywords or clearing your filters to see all services.</p>' +
      '</div>';
    }
    return '<div class="orders-empty">' +
      '<div class="orders-empty-icon"><i class="fas fa-cube"></i></div>' +
      '<h3>No services yet</h3>' +
      '<p>Create your first service to start managing your offerings from one place. All service data and updates will appear here.</p>' +
      '<button class="btn btn-primary empty-new-service-btn" style="margin-top:20px;">' +
        '<i class="fas fa-plus"></i> Create Service' +
      '</button>' +
    '</div>';
  }

  function renderServices(container) {
    if (!container) return;
    if (_loading) {
      container.innerHTML = renderSkeleton();
      return;
    }
    const filtered = getFilteredServices();
    const countEl = document.getElementById('servicesCount');
    if (countEl) {
      countEl.innerHTML = 'Showing <strong>' + filtered.length + '</strong> of <strong>' + services.length + '</strong> services';
    }
    if (services.length === 0) {
      container.innerHTML = renderEmpty(false);
      return;
    }
    if (filtered.length === 0) {
      container.innerHTML = renderEmpty(true);
      return;
    }
    container.innerHTML = '<div class="orders-table-wrap">' +
      '<table class="orders-table services-table">' +
        '<thead>' +
          '<tr>' +
            '<th>Title</th>' +
            '<th>Category</th>' +
            '<th>Slug</th>' +
            '<th>Description</th>' +
            '<th>Status</th>' +
            '<th>Created</th>' +
            '<th style="width:80px;">Actions</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          filtered.map(function(s) { return renderTableRow(s); }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>';
  }

  function renderStats() {
    const stats = getStats();
    const el = function(id) { return document.getElementById(id); };
    if (el('svcTotal')) el('svcTotal').textContent = stats.total;
    if (el('svcPublished')) el('svcPublished').textContent = stats.published;
    if (el('svcDraft')) el('svcDraft').textContent = stats.draft;
    if (el('svcArchived')) el('svcArchived').textContent = stats.archived;
  }

  function openServiceModal(serviceData) {
    const isEditing = !!serviceData;
    const overlay = document.createElement('div');
    overlay.className = 'order-modal-overlay';
    overlay.id = 'serviceModal';
    overlay.innerHTML = '' +
      '<div class="order-modal">' +
        '<div class="order-modal-glow"></div>' +
        '<div class="order-modal-header">' +
          '<div>' +
            '<h2>' + (isEditing ? 'Edit Service' : 'Create Service') + '</h2>' +
            '<p>' + (isEditing ? 'Update your service offering details.' : 'Add a new service to your catalog.') + '</p>' +
          '</div>' +
          '<button class="order-modal-close" id="serviceModalClose"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<div class="order-modal-body">' +
          '<form id="serviceForm" autocomplete="off">' +
            '<div class="order-form-grid">' +
              '<div class="order-form-field full-width">' +
                '<label>Title <span class="required">*</span></label>' +
                '<input type="text" id="sf_title" placeholder="e.g. Web Design" value="' + escapeHtml(serviceData ? serviceData.title : '') + '" required />' +
              '</div>' +
              '<div class="order-form-field">' +
                '<label>Slug <span class="required">*</span></label>' +
                '<input type="text" id="sf_slug" placeholder="e.g. web-design" value="' + escapeHtml(serviceData ? serviceData.slug : '') + '" required />' +
              '</div>' +
              '<div class="order-form-field">' +
                '<label>Category <span class="required">*</span></label>' +
                '<input type="text" id="sf_category" placeholder="e.g. Design & Development" value="' + escapeHtml(serviceData ? serviceData.category : '') + '" required />' +
              '</div>' +
              '<div class="order-form-field full-width">' +
                '<label>Short Description</label>' +
                '<textarea id="sf_shortDescription" placeholder="Brief description of the service..." rows="2">' + escapeHtml(serviceData ? serviceData.shortDescription : '') + '</textarea>' +
              '</div>' +
              '<div class="order-form-field full-width">' +
                '<label>Full Description</label>' +
                '<textarea id="sf_description" placeholder="Detailed description of the service..." rows="3">' + escapeHtml(serviceData ? serviceData.description : '') + '</textarea>' +
              '</div>' +
              '<div class="order-form-field">' +
                '<label>Status</label>' +
                '<select id="sf_status">' +
                  '<option value="draft"' + (isEditing && serviceData.status === 'draft' ? ' selected' : '') + '>Draft</option>' +
                  '<option value="published"' + (isEditing && serviceData.status === 'published' ? ' selected' : '') + '>Published</option>' +
                  '<option value="archived"' + (isEditing && serviceData.status === 'archived' ? ' selected' : '') + '>Archived</option>' +
                '</select>' +
              '</div>' +
              '<div class="order-form-field full-width">' +
                '<label>Card Image URL</label>' +
                '<input type="url" id="sf_image" placeholder="https://example.com/image.jpg" value="' + escapeHtml(serviceData ? serviceData.image : '') + '" />' +
              '</div>' +
              '<div class="order-form-field" style="justify-content:flex-end;">' +
                '<label style="margin-bottom:0;">&nbsp;</label>' +
                '<div style="display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:var(--r-xs);background:rgba(255,255,255,0.025);border:1px solid var(--border);cursor:pointer;" onclick="this.querySelector(\'input\').click()">' +
                  '<input type="checkbox" id="sf_featured" style="width:16px;height:16px;cursor:pointer;" ' + (isEditing && serviceData.featured ? 'checked' : '') + ' />' +
                  '<label for="sf_featured" style="cursor:pointer;font-size:0.82rem;color:var(--gray);margin:0;">Featured Service</label>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</form>' +
        '</div>' +
        '<div class="order-modal-footer">' +
          '<button class="btn btn-secondary" id="serviceModalCancel">Cancel</button>' +
          '<button class="btn btn-primary" id="serviceModalSubmit"><i class="fas ' + (isEditing ? 'fa-save' : 'fa-plus') + '"></i> ' + (isEditing ? 'Save Changes' : 'Create Service') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.classList.add('active'); });

    function closeModal() {
      overlay.classList.remove('active');
      setTimeout(function() { overlay.remove(); }, 400);
    }
    overlay.querySelector('#serviceModalClose').addEventListener('click', closeModal);
    overlay.querySelector('#serviceModalCancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });

    var titleInput = overlay.querySelector('#sf_title');
    var slugInput = overlay.querySelector('#sf_slug');
    if (!isEditing) {
      titleInput.addEventListener('input', function() {
        if (!slugInput.dataset.userEdited) {
          slugInput.value = slugify(this.value);
        }
      });
      slugInput.addEventListener('input', function() {
        this.dataset.userEdited = this.value.length > 0 ? 'true' : '';
      });
    }

    overlay.querySelector('#serviceModalSubmit').addEventListener('click', async function() {
      const title = overlay.querySelector('#sf_title').value.trim();
      const slug = overlay.querySelector('#sf_slug').value.trim();
      const category = overlay.querySelector('#sf_category').value.trim();
      const shortDescription = overlay.querySelector('#sf_shortDescription').value.trim();
      const description = overlay.querySelector('#sf_description').value.trim();
      const image = overlay.querySelector('#sf_image').value.trim();
      const status = overlay.querySelector('#sf_status').value;
      const featured = overlay.querySelector('#sf_featured').checked;

      if (!title) { showToast('error', 'Validation Error', 'Title is required'); return; }
      if (!slug) { showToast('error', 'Validation Error', 'Slug is required'); return; }
      if (!category) { showToast('error', 'Validation Error', 'Category is required'); return; }

      this.disabled = true;
      var originalHtml = this.innerHTML;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

      try {
        if (isEditing) {
          await NAGRIVA_AdminServices.updateService(serviceData.id, {
            title: title,
            slug: slug,
            category: category,
            shortDescription: shortDescription,
            description: description,
            image: image,
            status: status,
            featured: featured
          });
          closeModal();
        } else {
          await NAGRIVA_AdminServices.createService({
            title: title,
            slug: slug,
            category: category,
            shortDescription: shortDescription,
            description: description,
            image: image,
            status: status,
            featured: featured
          });
          closeModal();
        }
        renderServices(document.getElementById('servicesContainer'));
        renderStats();
      } catch (err) {
        this.disabled = false;
        this.innerHTML = originalHtml;
        showToast('error', 'Operation Failed', err.message || 'Something went wrong');
      }
    });
  }

  function showConfirm(title, message) {
    return new Promise(function(resolve) {
      var overlayEl = document.createElement('div');
      overlayEl.className = 'confirm-modal-overlay';
      overlayEl.innerHTML = '' +
        '<div class="confirm-modal">' +
          '<div class="confirm-modal-icon"><i class="fas fa-exclamation-triangle"></i></div>' +
          '<h3>' + title + '</h3>' +
          '<p>' + message + '</p>' +
          '<div class="confirm-modal-actions">' +
            '<button class="btn btn-secondary" id="svcConfirmCancel">Cancel</button>' +
            '<button class="btn btn-primary" id="svcConfirmOk" style="background:var(--danger);color:#fff;">Delete</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlayEl);
      requestAnimationFrame(function() { overlayEl.classList.add('active'); });

      function closeConfirm() {
        overlayEl.classList.remove('active');
        setTimeout(function() { overlayEl.remove(); }, 300);
      }

      overlayEl.querySelector('#svcConfirmCancel').addEventListener('click', function() { closeConfirm(); resolve(false); });
      overlayEl.querySelector('#svcConfirmOk').addEventListener('click', function() { closeConfirm(); resolve(true); });
      overlayEl.addEventListener('click', function(e) { if (e.target === overlayEl) { closeConfirm(); resolve(false); } });
    });
  }

  function destroy() {
    if (realtimeChannel) {
      window.supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    onChangeCallbacks = [];
    services = [];
  }

  return {
    init,
    createService,
    updateService,
    deleteService,
    getService,
    getAllServices,
    getFilteredServices,
    getStats,
    setSearch,
    setStatusFilter,
    onChange,
    renderServices,
    renderStats,
    openServiceModal,
    showConfirm,
    formatDate,
    escapeHtml,
    slugify,
    destroy,
    get loading() { return _loading; },
    get error() { return _error; }
  };
})();
