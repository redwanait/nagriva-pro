const NAGRIVA_Messages = (() => {
  let conversations = [];
  let messages = {};
  let activeConversationId = null;
  let filters = { search: '' };
  let unreadCount = 0;
  let onChangeCallbacks = [];
  let realtimeChannels = [];
  let _loading = false;
  let _error = null;

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
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

  async function fetchConversations() {
    const { data: allOrders, error: ordersError } = await window.supabaseClient
      .from('orders')
      .select('id, client_name, project_title, service, created_at')
      .order('created_at', { ascending: false });
    if (ordersError) throw ordersError;

    const { data: allMessages, error: messagesError } = await window.supabaseClient
      .from('messages')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    if (messagesError) throw messagesError;

    const grouped = {};
    (allMessages || []).forEach(msg => {
      const orderId = msg.order_id;
      if (!grouped[orderId]) grouped[orderId] = [];
      grouped[orderId].push(msg);
    });

    const convos = (allOrders || []).map(order => {
      const orderMessages = grouped[order.id] || [];
      const lastMsg = orderMessages.length > 0 ? orderMessages[0] : null;
      const unread = orderMessages.filter(m => m.sender_role === 'client').length;
      return {
        id: order.id,
        clientName: order.client_name || order.project_title || 'Unknown',
        projectTitle: order.project_title || '',
        service: order.service || '',
        lastMessage: lastMsg ? lastMsg.message : null,
        lastMessageTime: lastMsg ? lastMsg.created_at : order.created_at,
        lastSenderRole: lastMsg ? lastMsg.sender_role : null,
        lastSenderName: lastMsg && lastMsg.profiles ? lastMsg.profiles.full_name : null,
        unreadCount: unread,
        messageCount: orderMessages.length,
        messages: orderMessages.reverse()
      };
    });

    convos.sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));

    messages = {};
    convos.forEach(c => { messages[c.id] = c.messages; });

    return convos;
  }

  async function init(containerEl) {
    _loading = true;
    _error = null;
    if (containerEl) containerEl.innerHTML = renderSkeleton();
    try {
      conversations = await fetchConversations();
      _loading = false;
      if (containerEl) renderConversations(containerEl);
      updateUnreadCount();
      notifyChange();
      setupRealtime();
    } catch (err) {
      _loading = false;
      _error = err;
      console.error('[Messages] init failed:', err);
      if (containerEl) {
        containerEl.innerHTML = `
          <div class="orders-empty">
            <div class="orders-empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <h3>Failed to Load Messages</h3>
            <p>${err.message || 'Could not connect to database.'}</p>
            <button class="btn btn-primary empty-new-order-btn" style="margin-top:20px;" onclick="NAGRIVA_Messages.init(document.getElementById('messagesContainer'))">
              <i class="fas fa-sync"></i> Retry
            </button>
          </div>`;
      }
    }
  }

  function setupRealtime() {
    cleanupChannels();
    const channel = window.supabaseClient
      .channel('admin-messages-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          try {
            const { data: fullMsg } = await window.supabaseClient
              .from('messages')
              .select('*, profiles(full_name)')
              .eq('id', payload.new.id)
              .single();
            if (!fullMsg) return;
            const convId = fullMsg.order_id;
            if (messages[convId]) {
              messages[convId].push(fullMsg);
            } else {
              messages[convId] = [fullMsg];
            }
            const conv = conversations.find(c => c.id === convId);
            if (conv) {
              conv.lastMessage = fullMsg.message;
              conv.lastMessageTime = fullMsg.created_at;
              conv.lastSenderRole = fullMsg.sender_role;
              conv.lastSenderName = fullMsg.profiles ? fullMsg.profiles.full_name : null;
              conv.messageCount = (conv.messageCount || 0) + 1;
              if (fullMsg.sender_role === 'client') conv.unreadCount = (conv.unreadCount || 0) + 1;
            }
            conversations.sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));
            updateUnreadCount();
            notifyChange();
            const container = document.getElementById('messagesContainer');
            if (container) renderConversations(container);
            if (activeConversationId === convId) {
              renderActiveConversation(convId);
            }
          } catch (e) {
            console.warn('[Messages] Realtime sync error:', e.message || e);
          }
        }
      )
      .subscribe();
    realtimeChannels.push(channel);
  }

  function cleanupChannels() {
    realtimeChannels.forEach(ch => {
      window.supabaseClient.removeChannel(ch);
    });
    realtimeChannels = [];
  }

  function updateUnreadCount() {
    unreadCount = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    const badge = document.querySelector('.sidebar-item[data-page="messages"] .badge-dot');
    if (badge) {
      badge.style.display = unreadCount > 0 ? '' : 'none';
    }
    const countBadge = document.querySelector('.sidebar-item[data-page="messages"] .badge-count');
    if (countBadge) {
      countBadge.textContent = unreadCount;
      countBadge.style.display = unreadCount > 0 ? '' : 'none';
    }
  }

  function getUnreadCount() {
    return unreadCount;
  }

  function setSearch(query) {
    filters.search = (query || '').toLowerCase().trim();
    return getFilteredConversations();
  }

  function getFilteredConversations() {
    if (!filters.search) return conversations;
    const q = filters.search;
    return conversations.filter(c =>
      (c.clientName || '').toLowerCase().includes(q) ||
      (c.projectTitle || '').toLowerCase().includes(q) ||
      (c.service || '').toLowerCase().includes(q) ||
      (c.lastMessage || '').toLowerCase().includes(q)
    );
  }

  function getConversations() {
    return [...conversations];
  }

  function getMessages(orderId) {
    return messages[orderId] || [];
  }

  async function loadMessages(orderId) {
    const { data, error } = await window.supabaseClient
      .from('messages')
      .select('*, profiles(full_name)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    messages[orderId] = data || [];
    return messages[orderId];
  }

  async function sendMessage(orderId, text) {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (!text.trim()) throw new Error('Message cannot be empty');

    const { data, error } = await window.supabaseClient
      .from('messages')
      .insert({
        order_id: orderId,
        user_id: user.id,
        sender_role: 'admin',
        message: text.trim()
      })
      .select('*, profiles(full_name)')
      .single();
    if (error) throw error;

    if (messages[orderId]) {
      messages[orderId].push(data);
    } else {
      messages[orderId] = [data];
    }

    const conv = conversations.find(c => c.id === orderId);
    if (conv) {
      conv.lastMessage = data.message;
      conv.lastMessageTime = data.created_at;
      conv.lastSenderRole = 'admin';
      conv.lastSenderName = data.profiles ? data.profiles.full_name : 'Admin';
    }

    try {
      await logActivity(orderId, user.id, 'message_sent', 'Admin replied to order');
    } catch (_) {}

    return data;
  }

  async function logActivity(orderId, userId, action, description) {
    await window.supabaseClient
      .from('activity_log')
      .insert({ order_id: orderId, user_id: userId, action, description });
  }

  function setActiveConversation(orderId) {
    activeConversationId = orderId;
    const conv = conversations.find(c => c.id === orderId);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      updateUnreadCount();
    }
    renderActiveConversation(orderId);
  }

  function renderSkeleton() {
    let html = '<div style="padding:0;">';
    for (let i = 0; i < 5; i++) {
      html += `
        <div style="display:flex;gap:12px;padding:16px 0;border-bottom:1px solid var(--border);">
          <div class="orders-skeleton-bar circle" style="width:40px;height:40px;flex-shrink:0;"></div>
          <div style="flex:1;">
            <div class="orders-skeleton-bar w60" style="margin-bottom:8px;"></div>
            <div class="orders-skeleton-bar w80"></div>
          </div>
        </div>`;
    }
    html += '</div>';
    return html;
  }

  function renderConversations(container) {
    if (!container) return;
    if (_loading) {
      container.innerHTML = renderSkeleton();
      return;
    }
    const filtered = getFilteredConversations();
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="orders-empty" style="padding:20px;">
          <div class="orders-empty-icon"><i class="fas fa-comment-dots"></i></div>
          <h3>${filters.search ? 'No conversations match your search' : 'No conversations yet'}</h3>
          <p>${filters.search ? 'Try different keywords.' : 'Messages from clients will appear here.'}</p>
        </div>`;
      return;
    }
    container.innerHTML = filtered.map(c => {
      const isActive = c.id === activeConversationId;
      const preview = c.lastMessage ? escapeHtml(c.lastMessage.substring(0, 80)) + (c.lastMessage.length > 80 ? '...' : '') : 'No messages yet';
      return `
        <div class="message-item ${isActive ? 'active-conversation' : ''}" data-conv-id="${c.id}" style="cursor:pointer;${isActive ? 'background:var(--accent-glow);border-radius:var(--r-xs);padding:12px;' : 'padding:12px;'}" onclick="NAGRIVA_Messages.setActiveConversation('${c.id}')">
          <div class="message-avatar ma1">${getInitials(c.clientName)}</div>
          <div class="message-body">
            <div class="message-head">
              <span class="message-name">${escapeHtml(c.clientName)}</span>
              ${c.unreadCount > 0 ? '<span class="badge-count" style="display:inline-flex;">' + c.unreadCount + '</span>' : ''}
              <span class="message-time">${formatDate(c.lastMessageTime)}</span>
            </div>
            <div class="message-text">${preview}</div>
            <div style="font-size:0.68rem;color:var(--gray3);margin-top:2px;">${escapeHtml(c.projectTitle || c.service || '')}</div>
          </div>
        </div>`;
    }).join('');
  }

  async function renderActiveConversation(orderId) {
    const container = document.getElementById('activeConversation');
    if (!container) return;
    const conv = conversations.find(c => c.id === orderId);
    if (!conv) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray3);">Conversation not found</div>';
      return;
    }

    let msgs = messages[orderId];
    if (!msgs || msgs.length === 0) {
      try {
        msgs = await loadMessages(orderId);
      } catch (_) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray3);">Failed to load messages</div>';
        return;
      }
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;">
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);margin-bottom:12px;">
          <div class="message-avatar ma1">${getInitials(conv.clientName)}</div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:0.88rem;color:var(--white);">${escapeHtml(conv.clientName)}</div>
            <div style="font-size:0.72rem;color:var(--gray2);">${escapeHtml(conv.projectTitle || conv.service || '')}</div>
          </div>
        </div>
        <div id="messageHistory" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px;max-height:400px;">
          ${msgs.map(m => {
            const isAdmin = m.sender_role === 'admin';
            return `
              <div style="display:flex;${isAdmin ? 'justify-content:flex-end;' : 'justify-content:flex-start;'}margin-bottom:4px;">
                <div style="max-width:80%;padding:10px 14px;border-radius:${isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};background:${isAdmin ? 'var(--accent)' : 'var(--surface)'};${isAdmin ? 'color:var(--bg);' : 'color:var(--white);'}font-size:0.82rem;line-height:1.4;">
                  <div>${escapeHtml(m.message)}</div>
                  <div style="font-size:0.62rem;${isAdmin ? 'color:rgba(0,0,0,0.5);' : 'color:var(--gray3);'}margin-top:4px;text-align:${isAdmin ? 'right' : 'left'};">${formatDate(m.created_at)}</div>
                </div>
              </div>`;
          }).join('')}
        </div>
        <div class="message-input" style="margin-top:8px;border-top:1px solid var(--border);padding-top:12px;">
          <input type="text" id="conversationMessageInput" placeholder="Type your reply..." />
          <button class="btn btn-primary" id="conversationSendBtn"><i class="fas fa-paper-plane"></i> Send</button>
        </div>
      </div>`;

    setTimeout(() => {
      const history = document.getElementById('messageHistory');
      if (history) history.scrollTop = history.scrollHeight;
    }, 50);

    const input = document.getElementById('conversationMessageInput');
    const sendBtn = document.getElementById('conversationSendBtn');

    async function doSend() {
      const text = input.value.trim();
      if (!text) return;
      input.disabled = true;
      sendBtn.disabled = true;
      try {
        await sendMessage(orderId, text);
        input.value = '';
        input.focus();
        await renderActiveConversation(orderId);
      } catch (err) {
        showToast('error', 'Send Failed', err.message || 'Could not send message');
      }
      input.disabled = false;
      sendBtn.disabled = false;
    }

    sendBtn.addEventListener('click', doSend);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
  }

  function onChange(cb) {
    onChangeCallbacks.push(cb);
    return () => {
      onChangeCallbacks = onChangeCallbacks.filter(fn => fn !== cb);
    };
  }

  function notifyChange() {
    onChangeCallbacks.forEach(fn => fn([...conversations], unreadCount));
  }

  function destroy() {
    cleanupChannels();
    onChangeCallbacks = [];
    conversations = [];
    messages = {};
    activeConversationId = null;
    unreadCount = 0;
  }

  return {
    init,
    sendMessage,
    getConversations,
    getMessages,
    getFilteredConversations,
    getUnreadCount,
    setSearch,
    setActiveConversation,
    renderConversations,
    renderActiveConversation,
    onChange,
    formatDate,
    getInitials,
    destroy,
    get loading() { return _loading; },
    get error() { return _error; }
  };
})();
