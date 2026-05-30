const NAGRIVA_ClientMessages = (() => {
  let _conversations = [];
  let _messages = {};
  let _activeOrderId = null;
  let _filters = { search: '' };
  let _unread = {};
  let _onChangeCallbacks = [];
  let _realtimeChannels = [];
  let _loading = false;
  let _error = null;
  let _typingTimers = {};
  let _currentUser = null;
  let _currentProfile = null;
  let _unreadBadgeEls = [];
  let _convListEl = null;
  let _messageAreaEl = null;

  const LS_KEY = 'nagriva_msg_unread';
  const LS_READ_KEY = 'nagriva_msg_read_at';

  function log(...args) { console.log('[ClientMessages]', ...args); }
  function warn(...args) { console.warn('[ClientMessages]', ...args); }

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
    if (!name) return '?';
    return name.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function ensureUser() {
    if (_currentUser) return _currentUser;
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    _currentUser = user;
    return user;
  }

  async function ensureProfile() {
    if (_currentProfile) return _currentProfile;
    const user = await ensureUser();
    if (!user) return null;
    const { data } = await window.supabaseClient.from('profiles').select('*').eq('id', user.id).single();
    _currentProfile = data;
    return data;
  }

  function loadPersistedUnread() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) _unread = JSON.parse(raw);
    } catch (e) { _unread = {}; }
  }

  function persistUnread() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(_unread)); } catch (e) {}
  }

  function loadReadTimestamps() {
    try {
      const raw = localStorage.getItem(LS_READ_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveReadTimestamps(timestamps) {
    try { localStorage.setItem(LS_READ_KEY, JSON.stringify(timestamps)); } catch (e) {}
  }

  async function fetchConversations() {
    log('fetchConversations — loading...');
    const user = await ensureUser();
    if (!user) return [];

    const { data: orders, error: ordersError } = await window.supabaseClient
      .from('orders')
      .select('id, order_number, project_title, service_type, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) { throw ordersError; }
    if (!orders || orders.length === 0) return [];

    const orderIds = orders.map(o => o.id);

    const { data: allMessages, error: msgError } = await window.supabaseClient
      .from('messages')
      .select('*')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false });

    if (msgError) { throw msgError; }

    const msgByOrder = {};
    if (allMessages) {
      allMessages.forEach(m => {
        if (!msgByOrder[m.order_id]) msgByOrder[m.order_id] = [];
        msgByOrder[m.order_id].push(m);
      });
    }

    const readTs = loadReadTimestamps();
    const convos = orders.map(order => {
      const msgs = msgByOrder[order.id] || [];
      const sortedMsgs = msgs.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const lastMsg = msgs.length > 0 ? msgs[0] : null;

      let unreadCount = 0;
      const lastRead = readTs[order.id];
      if (lastRead) {
        unreadCount = msgs.filter(m => {
          if (m.user_id === user.id && m.sender_role === 'client') return false;
          return new Date(m.created_at) > new Date(lastRead);
        }).length;
      } else {
        unreadCount = msgs.filter(m => !(m.user_id === user.id && m.sender_role === 'client')).length;
      }

      if (unreadCount > 0) _unread[order.id] = unreadCount;
      else delete _unread[order.id];
      persistUnread();

      return {
        id: order.id,
        orderNumber: order.order_number || '#' + (order.id || '').slice(0, 8),
        projectTitle: order.project_title || 'Untitled',
        serviceType: order.service_type,
        status: order.status,
        orderCreatedAt: order.created_at,
        lastMessage: lastMsg ? lastMsg.message : null,
        lastMessageTime: lastMsg ? lastMsg.created_at : order.created_at,
        lastSenderRole: lastMsg ? lastMsg.sender_role : null,
        unreadCount: unreadCount,
        messageCount: msgs.length,
        messages: sortedMsgs
      };
    });

    convos.sort((a, b) => {
      const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return bTime - aTime;
    });

    _messages = {};
    convos.forEach(c => { _messages[c.id] = c.messages; });

    _conversations = convos;
    log('fetchConversations — loaded', convos.length, 'conversations');
    return convos;
  }

  async function fetchMessages(orderId) {
    log('fetchMessages — orderId:', orderId);
    const { data, error } = await window.supabaseClient
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    _messages[orderId] = data || [];
    return _messages[orderId];
  }

  async function sendMessage(orderId, text) {
    if (!text || !text.trim()) throw new Error('Message cannot be empty');
    const user = await ensureUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await ensureProfile();
    const senderRole = profile?.role === 'admin' ? 'admin' : 'client';

    const { data, error } = await window.supabaseClient
      .from('messages')
      .insert({
        order_id: orderId,
        user_id: user.id,
        sender_role: senderRole,
        message: text.trim()
      })
      .select('*')
      .single();

    if (error) throw error;

    if (_messages[orderId]) {
      _messages[orderId].push(data);
    } else {
      _messages[orderId] = [data];
    }

    const conv = _conversations.find(c => c.id === orderId);
    if (conv) {
      conv.lastMessage = data.message;
      conv.lastMessageTime = data.created_at;
      conv.lastSenderRole = 'client';
      conv.messageCount = (conv.messageCount || 0) + 1;
    }

    updateUnreadBadges();
    notifyChange();

    try {
      if (typeof NAGRIVA_NotificationTriggers !== 'undefined' && senderRole === 'client') {
        NAGRIVA_NotificationTriggers.notifyAdmins(
          'New Message',
          'New message regarding ' + (conv ? conv.projectTitle : 'order'),
          '/pages/admin-messages.html?id=' + orderId,
          { trigger: 'new_message', order_id: orderId }
        );
      }
    } catch (e) {
      warn('Failed to notify:', e);
    }

    return data;
  }

  function setupRealtime() {
    cleanupChannels();

    const channel = window.supabaseClient
      .channel('client-messages-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          try {
            const { data: fullMsg, error } = await window.supabaseClient
              .from('messages')
              .select('*')
              .eq('id', payload.new.id)
              .single();
            if (error || !fullMsg) return;

            const oid = fullMsg.order_id;
            if (!oid) return;

            const user = await ensureUser();
            if (!user) return;

            const isOwnOrder = _conversations.some(c => c.id === oid);
            if (!isOwnOrder) return;

            if (_messages[oid]) {
              _messages[oid].push(fullMsg);
            } else {
              _messages[oid] = [fullMsg];
            }

            const conv = _conversations.find(c => c.id === oid);
            if (conv) {
              conv.lastMessage = fullMsg.message;
              conv.lastMessageTime = fullMsg.created_at;
              conv.lastSenderRole = fullMsg.sender_role;
              conv.messageCount = (conv.messageCount || 0) + 1;
              const isOwn = fullMsg.user_id === user.id && fullMsg.sender_role === 'client';
              if (!isOwn) {
                conv.unreadCount = (conv.unreadCount || 0) + 1;
                _unread[oid] = (_unread[oid] || 0) + 1;
                persistUnread();
              }
            }

            _conversations.sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));

            updateUnreadBadges();
            notifyChange();

            if (_convListEl) renderConversationList(_convListEl);
            if (_activeOrderId === oid && _messageAreaEl) {
              renderMessageArea(_messageAreaEl, oid);
            }

            const isOwn = fullMsg.user_id === user.id && fullMsg.sender_role === 'client';
            if (!isOwn && document.visibilityState === 'visible') {
              showNewMessageToast(fullMsg, conv);
            }

            if (!isOwn && typeof NAGRIVA_NotificationTriggers !== 'undefined') {
              const convName = conv ? conv.projectTitle : 'Order';
              await NAGRIVA_NotificationTriggers.adminAction(
                user.id,
                'New Message',
                'New message regarding: ' + convName,
                '/pages/client-portal.html?id=' + oid,
                { trigger: 'new_message', order_id: oid }
              );
            }
          } catch (e) {
            warn('Realtime sync error:', e.message || e);
          }
        }
      )
      .subscribe();

    _realtimeChannels.push(channel);
    log('Realtime subscription established');
  }

  function showNewMessageToast(msg, conv) {
    if (typeof NAGRIVA_Toast === 'undefined') return;
    const name = conv ? conv.projectTitle : 'Order';
    const preview = msg.message.length > 60 ? msg.message.substring(0, 60) + '...' : msg.message;
    const toast = NAGRIVA_Toast.info('New Message', name + ': ' + preview, {
      duration: 5000,
      onclick: () => {
        window.location.href = 'client-portal.html?id=' + (conv ? conv.id : msg.order_id);
      }
    });
  }

  function cleanupChannels() {
    _realtimeChannels.forEach(ch => {
      window.supabaseClient.removeChannel(ch);
    });
    _realtimeChannels = [];
  }

  function updateUnreadBadges() {
    const total = getUnreadCount();
    _unreadBadgeEls.forEach(el => {
      if (el.dataset.orderId) {
        const count = _unread[el.dataset.orderId] || 0;
        el.textContent = count;
        el.style.display = count > 0 ? '' : 'none';
      } else {
        el.textContent = total;
        el.style.display = total > 0 ? '' : 'none';
      }
    });

    const sidebarBadge = document.querySelector('.portal-nav-item[data-tab="messages-tab"] .nav-badge');
    if (sidebarBadge) {
      sidebarBadge.textContent = total;
      sidebarBadge.style.display = total > 0 ? '' : 'none';
    }

    const dashMsgLink = document.getElementById('dashMsgCount');
    if (dashMsgLink) {
      dashMsgLink.textContent = total;
      dashMsgLink.style.display = total > 0 ? '' : 'none';
    }

    const supportBadge = document.getElementById('supportChatBadge');
    if (supportBadge) {
      supportBadge.textContent = total;
      supportBadge.style.display = total > 0 ? '' : 'none';
    }
  }

  function getUnreadCount() {
    return Object.values(_unread).reduce((sum, c) => sum + c, 0);
  }

  function getConversationUnread(orderId) {
    return _unread[orderId] || 0;
  }

  async function markAsRead(orderId) {
    const user = await ensureUser();
    if (!user) return;

    const readTs = loadReadTimestamps();
    readTs[orderId] = new Date().toISOString();
    saveReadTimestamps(readTs);

    delete _unread[orderId];
    persistUnread();

    const conv = _conversations.find(c => c.id === orderId);
    if (conv) {
      conv.unreadCount = 0;
    }

    updateUnreadBadges();
    notifyChange();
    if (_convListEl) renderConversationList(_convListEl);
  }

  function setSearch(query) {
    _filters.search = (query || '').toLowerCase().trim();
    if (_convListEl) renderConversationList(_convListEl);
  }

  function getFilteredConversations() {
    if (!_filters.search) return _conversations;
    const q = _filters.search;
    return _conversations.filter(c =>
      (c.projectTitle || '').toLowerCase().includes(q) ||
      (c.orderNumber || '').toLowerCase().includes(q) ||
      (c.serviceType || '').toLowerCase().includes(q) ||
      (c.lastMessage || '').toLowerCase().includes(q)
    );
  }

  function getConversations() { return [..._conversations]; }

  function registerBadgeEl(el) {
    if (el) _unreadBadgeEls.push(el);
  }

  function getMessages(orderId) {
    return _messages[orderId] || [];
  }

  function setActiveOrder(orderId) {
    _activeOrderId = orderId;
    if (orderId) markAsRead(orderId);
    if (_messageAreaEl) renderMessageArea(_messageAreaEl, orderId);
  }

  function renderSkeleton() {
    let html = '';
    for (let i = 0; i < 4; i++) {
      html += `
        <div style="display:flex;gap:12px;padding:12px;margin-bottom:4px;">
          <div style="width:40px;height:40px;border-radius:12px;flex-shrink:0;background:rgba(255,255,255,0.03);"></div>
          <div style="flex:1;">
            <div style="height:12px;width:60%;border-radius:99px;margin-bottom:8px;background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%);background-size:200% 100%;animation:pos-shimmer 1.5s ease-in-out infinite;"></div>
            <div style="height:8px;width:80%;border-radius:99px;background:linear-gradient(90deg,rgba(255,255,255,0.02) 25%,rgba(255,255,255,0.04) 50%,rgba(255,255,255,0.02) 75%);background-size:200% 100%;animation:pos-shimmer 1.5s ease-in-out infinite 0.15s;"></div>
          </div>
        </div>`;
    }
    return html;
  }

  function renderConversationList(container) {
    _convListEl = container;
    if (!container) return;

    if (_loading) {
      container.innerHTML = renderSkeleton();
      return;
    }

    const filtered = getFilteredConversations();
    if (filtered.length === 0) {
      container.innerHTML = NAGRIVA_EmptyState.render({
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        title: _filters.search ? 'No matching conversations' : 'No conversations yet',
        description: _filters.search ? 'Try different keywords.' : 'Messages will appear here once conversations begin.',
        variant: _filters.search ? 'search' : 'sm'
      });
      return;
    }

    container.innerHTML = filtered.map(c => {
      const isActive = c.id === _activeOrderId;
      const initials = getInitials(c.projectTitle);
      const preview = c.lastMessage ? escapeHtml(c.lastMessage.substring(0, 70)) + (c.lastMessage.length > 70 ? '...' : '') : 'No messages yet';
      const unread = c.unreadCount || _unread[c.id] || 0;
      return `
        <div class="chat-conv-item ${isActive ? 'active' : ''}" data-order-id="${c.id}" onclick="NAGRIVA_ClientMessages.selectConversation('${c.id}')">
          <div class="chat-conv-avatar">${initials}</div>
          <div class="chat-conv-info">
            <div class="chat-conv-name">${escapeHtml(c.projectTitle)}</div>
            <div class="chat-conv-preview">${preview}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
            ${unread > 0 ? '<span class="chat-conv-badge">' + unread + '</span>' : ''}
            <span class="chat-conv-time">${formatDate(c.lastMessageTime)}</span>
          </div>
        </div>`;
    }).join('');
  }

  function renderMessageArea(container, orderId) {
    _messageAreaEl = container;
    if (!container) return;

    if (!orderId) {
      container.innerHTML = NAGRIVA_EmptyState.render({
        icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        title: 'Select a conversation',
        description: 'Choose an order from the sidebar to view and send messages.',
        variant: 'inline'
      });
      return;
    }

    const conv = _conversations.find(c => c.id === orderId);
    if (!conv) {
      container.innerHTML = NAGRIVA_EmptyState.render({
        icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        title: 'Conversation not found',
        description: 'The selected conversation could not be found.',
        variant: 'sm'
      });
      return;
    }

    const msgs = _messages[orderId];
    if (!msgs || msgs.length === 0) {
      container.innerHTML = NAGRIVA_EmptyState.render({
        icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
        title: 'No messages yet',
        description: 'Start the conversation! Send a message to your project team.',
        variant: 'inline'
      });
      return;
    }

    container.innerHTML = msgs.map(m => {
      const isClient = m.sender_role === 'client';
      const senderName = isClient ? 'You' : 'Team';
      const initials = isClient ? getInitials(_currentUser?.user_metadata?.full_name || 'You') : 'T';
      return `
        <div class="chat-message ${isClient ? 'client' : 'admin'}">
          <div class="chat-message-avatar">${initials}</div>
          <div>
            <div class="chat-message-bubble">${escapeHtml(m.message)}</div>
            <div class="chat-message-time">${formatDate(m.created_at)}</div>
          </div>
        </div>`;
    }).join('');

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }

  function showTypingIndicator(container) {
    if (!container) return;
    const existing = container.querySelector('.typing-indicator');
    if (existing) return;
    const div = document.createElement('div');
    div.className = 'typing-indicator admin';
    div.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function hideTypingIndicator(container) {
    if (!container) return;
    const el = container.querySelector('.typing-indicator');
    if (el) el.remove();
  }

  async function selectConversation(orderId) {
    _activeOrderId = orderId;

    document.querySelectorAll('.chat-conv-item').forEach(el => {
      el.classList.toggle('active', el.dataset.orderId === orderId);
    });

    try {
      const msgs = await fetchMessages(orderId);
      await markAsRead(orderId);

      const conv = _conversations.find(c => c.id === orderId);
      const headerOrderEl = document.getElementById('chatActiveOrder');
      const headerStatusEl = document.getElementById('chatActiveStatus');
      if (headerOrderEl && conv) {
        headerOrderEl.textContent = conv.projectTitle + ' (' + conv.orderNumber + ')';
      }
      if (headerStatusEl && conv) {
        headerStatusEl.textContent = conv.status ? (conv.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) : '';
      }

      if (_messageAreaEl) renderMessageArea(_messageAreaEl, orderId);
      if (_convListEl) renderConversationList(_convListEl);
    } catch (err) {
      warn('Failed to load messages:', err);
      if (_messageAreaEl) {
        _messageAreaEl.innerHTML = NAGRIVA_EmptyState.render({
          icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
          title: 'Unable to load messages',
          description: 'Something went wrong. Please try again.',
          variant: 'error'
        });
      }
    }
  }

  async function init(containerEl) {
    log('init');
    _loading = true;
    _error = null;

    loadPersistedUnread();

    try {
      await ensureUser();
      await ensureProfile();

      const conversations = await fetchConversations();
      _loading = false;
      log('init complete —', conversations.length, 'conversations');

      if (containerEl) renderConversationList(containerEl);
      updateUnreadBadges();
      notifyChange();
      setupRealtime();

      const params = new URLSearchParams(window.location.search);
      const orderId = params.get('id');
      if (orderId) {
        const conv = _conversations.find(c => c.id === orderId);
        if (conv) {
          setTimeout(() => selectConversation(orderId), 300);
        }
      }
    } catch (err) {
      _loading = false;
      _error = err;
      warn('init failed:', err);
      if (containerEl) {
        containerEl.innerHTML = NAGRIVA_EmptyState.render({
          icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
          title: 'Failed to Load Messages',
          description: escapeHtml(err.message || 'Could not connect to database.'),
          variant: 'error',
          primaryCta: { icon: 'fas fa-sync', label: 'Retry', onclick: 'NAGRIVA_ClientMessages.init(document.getElementById(\'chatConversations\'))' }
        });
      }
    }
  }

  function onChange(cb) {
    _onChangeCallbacks.push(cb);
    return () => {
      _onChangeCallbacks = _onChangeCallbacks.filter(fn => fn !== cb);
    };
  }

  function notifyChange() {
    const data = [..._conversations];
    const total = getUnreadCount();
    _onChangeCallbacks.forEach(fn => fn(data, total));
  }

  function destroy() {
    cleanupChannels();
    _onChangeCallbacks = [];
    _conversations = [];
    _messages = {};
    _activeOrderId = null;
    _unread = {};
    _loading = false;
    _error = null;
    _currentUser = null;
    _currentProfile = null;
    _typingTimers = {};
    _unreadBadgeEls = [];
    _convListEl = null;
    _messageAreaEl = null;
  }

  return {
    init,
    sendMessage,
    fetchConversations,
    fetchMessages,
    getMessages,
    getConversations,
    getFilteredConversations,
    getUnreadCount,
    getConversationUnread,
    markAsRead,
    setSearch,
    selectConversation,
    setActiveOrder: selectConversation,
    registerBadgeEl,
    renderConversationList,
    renderMessageArea,
    onChange,
    showTypingIndicator,
    hideTypingIndicator,
    updateUnreadBadges,
    formatDate,
    getInitials,
    destroy,
    get loading() { return _loading; },
    get error() { return _error; },
    get activeOrderId() { return _activeOrderId; }
  };
})();
