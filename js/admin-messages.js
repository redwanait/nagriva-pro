const NAGRIVA_Messages = (() => {
  let conversations = [];
  let messages = {};
  let activeOrderId = null;
  let filters = { search: '' };
  let unreadCount = 0;
  let onChangeCallbacks = [];
  let realtimeChannels = [];
  let _loading = false;
  let _error = null;

  let activeTab = 'orders';
  let supportConversations = [];
  let supportMessages = {};
  let activeSupportConvId = null;
  let supportUnreadCount = 0;
  let supportFetched = false;

  const supabaseClient = window.supabaseClient;

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

  function getClientName(conv) {
    if (conv && conv.clientName) return conv.clientName;
    if (conv && conv.clientEmail) return conv.clientEmail.split('@')[0];
    return 'Unknown Client';
  }

  var _profileCache = {};

  async function fetchProfilesForUserIds(userIds) {
    var uniq = [...new Set(userIds.filter(Boolean))];
    var uncached = uniq.filter(function(id) { return !_profileCache[id]; });
    if (uncached.length === 0) return;
    var chunkSize = 100;
    for (var i = 0; i < uncached.length; i += chunkSize) {
      var chunk = uncached.slice(i, i + chunkSize);
      var { data: profiles } = await supabaseClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', chunk);
      if (profiles) {
        profiles.forEach(function(p) { _profileCache[p.id] = p; });
      }
    }
  }

  function attachProfileToMsg(msg) {
    if (!msg) return msg;
    var p = _profileCache[msg.user_id];
    if (p) {
      msg._profileName = p.full_name || '';
      msg._profileEmail = p.email || '';
    } else {
      msg._profileName = '';
      msg._profileEmail = '';
    }
    return msg;
  }

  async function fetchConversations() {
    var { data: allMessages, error: messagesError } = await supabaseClient
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (messagesError) throw messagesError;

    if (!allMessages || allMessages.length === 0) return [];

    var userIds = allMessages.map(function(m) { return m.user_id; });
    await fetchProfilesForUserIds(userIds);
    allMessages.forEach(attachProfileToMsg);

    var { data: orders } = await supabaseClient
      .from('orders')
      .select('id, order_number, project_title, project_name, user_id');

    var orderMap = {};
    if (orders) orders.forEach(function(o) { orderMap[o.id] = o; });

    var grouped = {};
    allMessages.forEach(function(msg) {
      var oid = msg.order_id;
      if (!oid) return;
      if (!grouped[oid]) grouped[oid] = [];
      grouped[oid].push(msg);
    });

    var convos = Object.keys(grouped).map(function(oid) {
      var msgs = grouped[oid];
      var lastMsg = msgs[0];
      var order = orderMap[oid] || {};
      var clientMsgs = msgs.filter(function(m) { return m.sender_role === 'client'; });
      var unread = clientMsgs.length;

      var firstClientMsg = msgs.find(function(m) { return m.sender_role === 'client'; }) || msgs[0];

      return {
        id: oid,
        clientName: firstClientMsg._profileName || order.project_title || order.project_name || 'Unknown',
        clientEmail: firstClientMsg._profileEmail || '',
        projectTitle: order.project_title || order.project_name || '',
        orderNumber: order.order_number || '#' + oid.slice(0, 8),
        lastMessage: lastMsg ? lastMsg.message : null,
        lastMessageTime: lastMsg ? lastMsg.created_at : null,
        lastSenderRole: lastMsg ? lastMsg.sender_role : null,
        unreadCount: unread,
        messageCount: msgs.length,
        messages: msgs.slice().reverse()
      };
    });

    convos.sort(function(a, b) {
      var aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      var bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return bTime - aTime;
    });

    messages = {};
    convos.forEach(function(c) { messages[c.id] = c.messages; });

    return convos;
  }

  async function fetchSupportConversations() {
    var { data: msgs, error } = await supabaseClient
      .from('messages')
      .select('*')
      .is('order_id', null)
      .not('conversation_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!msgs || msgs.length === 0) return [];

    var userIds = msgs.map(function(m) { return m.user_id; });
    await fetchProfilesForUserIds(userIds);
    msgs.forEach(attachProfileToMsg);

    var grouped = {};
    msgs.forEach(function(msg) {
      var cid = msg.conversation_id;
      if (!cid) return;
      if (!grouped[cid]) grouped[cid] = [];
      grouped[cid].push(msg);
    });

    var convos = Object.keys(grouped).map(function(cid) {
      var convMsgs = grouped[cid];
      var lastMsg = convMsgs[0];
      var firstClientMsg = convMsgs.find(function(m) { return m.sender_role === 'client'; }) || convMsgs[0];
      var clientName = firstClientMsg._profileName || firstClientMsg._profileEmail || 'Unknown User';

      var unread = convMsgs.filter(function(m) { return m.sender_role === 'client' && !m.is_read; }).length;

      return {
        id: cid,
        clientName: clientName,
        clientEmail: firstClientMsg._profileEmail || '',
        lastMessage: lastMsg ? lastMsg.message : null,
        lastMessageTime: lastMsg ? lastMsg.created_at : null,
        lastSenderRole: lastMsg ? lastMsg.sender_role : null,
        unreadCount: unread,
        messageCount: convMsgs.length,
        isSupport: true
      };
    });

    convos.sort(function(a, b) { return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0); });

    supportMessages = {};
    convos.forEach(function(c) {
      var sorted = (grouped[c.id] || []).slice().reverse();
      supportMessages[c.id] = sorted;
    });

    supportConversations = convos;
    supportFetched = true;
    return convos;
  }

  async function loadSupportMessages(convId) {
    var { data, error } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    var msgs = data || [];
    var userIds = msgs.map(function(m) { return m.user_id; });
    await fetchProfilesForUserIds(userIds);
    msgs.forEach(attachProfileToMsg);
    supportMessages[convId] = msgs;
    return supportMessages[convId];
  }

  async function markSupportConversationRead(convId) {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      await supabaseClient
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', convId)
        .eq('sender_role', 'client')
        .eq('is_read', false);
    } catch (e) {
      console.warn('[AdminMessages] markSupportAsRead error:', e);
    }

    const conv = supportConversations.find(c => c.id === convId);
    if (conv) conv.unreadCount = 0;

    supportUnreadCount = supportConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    updateUnreadCount();
    notifyChange();

    const msgContainer = document.getElementById('messagesContainer');
    if (msgContainer && activeTab === 'support') renderSupportConversations(msgContainer);
  }

  async function init(containerEl) {
    _loading = true;
    _error = null;
    if (containerEl) containerEl.innerHTML = renderSkeleton();

    const timeout = setTimeout(() => {
      if (_loading) {
        _loading = false;
        _error = new Error('Loading timed out');
        if (containerEl) {
          containerEl.innerHTML = renderError(
            'Request timed out. Please check your connection and try again.',
            'messagesContainer'
          );
        }
      }
    }, 20000);

    try {
      conversations = await fetchConversations();
      clearTimeout(timeout);
      _loading = false;
      if (containerEl) renderConversations(containerEl);
      updateUnreadCount();
      notifyChange();
      setupRealtime();
    } catch (err) {
      clearTimeout(timeout);
      _loading = false;
      _error = err;
      if (containerEl) {
        containerEl.innerHTML = renderError(
          err.message || 'Could not connect to database.',
          'messagesContainer'
        );
      }
    }
  }

  function renderError(message, targetId) {
    return `
      <div class="orders-empty">
        <div class="orders-empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <h3>Failed to Load Messages</h3>
        <p>${escapeHtml(message)}</p>
        <button class="btn btn-primary empty-new-order-btn" style="margin-top:20px;" onclick="NAGRIVA_Messages.init(document.getElementById('${targetId}'))">
          <i class="fas fa-sync"></i> Retry
        </button>
      </div>`;
  }

  function setupRealtime() {
    cleanupChannels();
    const channel = supabaseClient
      .channel('admin-messages-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          try {
            var { data: fullMsg, error } = await supabaseClient
              .from('messages')
              .select('*')
              .eq('id', payload.new.id)
              .single();
            if (error || !fullMsg) return;
            await fetchProfilesForUserIds([fullMsg.user_id]);
            attachProfileToMsg(fullMsg);

            const oid = fullMsg.order_id;

            if (oid) {
              if (messages[oid]) {
                messages[oid].push(fullMsg);
              } else {
                messages[oid] = [fullMsg];
              }

              const conv = conversations.find(c => c.id === oid);
              if (conv) {
                conv.lastMessage = fullMsg.message;
                conv.lastMessageTime = fullMsg.created_at;
                conv.lastSenderRole = fullMsg.sender_role;
                conv.messageCount = (conv.messageCount || 0) + 1;
                if (fullMsg.sender_role === 'client') conv.unreadCount = (conv.unreadCount || 0) + 1;
              } else {
                conversations.unshift({
                  id: oid,
                  clientName: fullMsg._profileName || 'Unknown',
                  clientEmail: fullMsg._profileEmail || '',
                  projectTitle: '',
                  orderNumber: '#' + oid.slice(0, 8),
                  lastMessage: fullMsg.message,
                  lastMessageTime: fullMsg.created_at,
                  lastSenderRole: fullMsg.sender_role,
                  unreadCount: fullMsg.sender_role === 'client' ? 1 : 0,
                  messageCount: 1,
                  messages: [fullMsg]
                });
                if (fullMsg.sender_role === 'client') unreadCount++;
              }

              conversations.sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));
              updateUnreadCount();
              notifyChange();
              const container = document.getElementById('messagesContainer');
              if (container && activeTab === 'orders') renderConversations(container);
              if (activeOrderId === oid) renderActiveConversation(oid);
            }

            const cid = fullMsg.conversation_id;
            if (!oid && cid) {
              if (!supportMessages[cid]) supportMessages[cid] = [];
              supportMessages[cid].push(fullMsg);

              let existingConv = supportConversations.find(c => c.id === cid);
              if (!existingConv) {
                existingConv = {
                  id: cid,
                  clientName: fullMsg._profileName || fullMsg._profileEmail || 'Unknown User',
                  clientEmail: fullMsg._profileEmail || '',
                  lastMessage: null,
                  lastMessageTime: null,
                  lastSenderRole: null,
                  unreadCount: 0,
                  messageCount: 0,
                  isSupport: true
                };
                supportConversations.unshift(existingConv);
              }

              existingConv.lastMessage = fullMsg.message;
              existingConv.lastMessageTime = fullMsg.created_at;
              existingConv.lastSenderRole = fullMsg.sender_role;
              existingConv.messageCount = (existingConv.messageCount || 0) + 1;
              if (fullMsg.sender_role === 'client' && !fullMsg.is_read) {
                existingConv.unreadCount = (existingConv.unreadCount || 0) + 1;
              }

              supportConversations.sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));
              updateUnreadCount();
              notifyChange();
              const container = document.getElementById('messagesContainer');
              if (container && activeTab === 'support') renderSupportConversations(container);
              if (activeSupportConvId === cid) renderActiveSupportConversation(cid);

              if (document.visibilityState !== 'visible' && typeof NAGRIVA_Toast !== 'undefined') {
                var sender = fullMsg.sender_role === 'client' ? (fullMsg._profileName || 'Client') : 'NAGRIVA Support';
                NAGRIVA_Toast.info('New Message from ' + sender,
                  fullMsg.message.length > 60 ? fullMsg.message.substring(0, 60) + '...' : fullMsg.message,
                  { duration: 5000 }
                );
              }
            }
          } catch (e) {
            console.warn('[AdminMessages] Realtime sync error:', e.message || e);
          }
        }
      )
      .subscribe();
    realtimeChannels.push(channel);
  }

  function cleanupChannels() {
    realtimeChannels.forEach(ch => {
      supabaseClient.removeChannel(ch);
    });
    realtimeChannels = [];
  }

  function updateUnreadCount() {
    const orderUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    supportUnreadCount = supportConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    unreadCount = orderUnread + supportUnreadCount;

    const badge = document.querySelector('.sidebar-item[data-page="messages"] .badge-dot');
    if (badge) badge.style.display = unreadCount > 0 ? '' : 'none';

    const countBadge = document.querySelector('.sidebar-item[data-page="messages"] .badge-count');
    if (countBadge) {
      countBadge.textContent = unreadCount;
      countBadge.style.display = unreadCount > 0 ? '' : 'none';
    }

    const topbarBadge = document.getElementById('topbarMsgBadge');
    if (topbarBadge) {
      topbarBadge.textContent = unreadCount;
      topbarBadge.style.display = unreadCount > 0 ? '' : 'none';
    }
  }

  function getUnreadCount() {
    return unreadCount;
  }

  function getSupportUnreadCount() {
    return supportUnreadCount;
  }

  function setSearch(query) {
    filters.search = (query || '').toLowerCase().trim();
    return getFilteredConversations();
  }

  function getFilteredConversations() {
    if (activeTab === 'support') {
      if (!filters.search) return supportConversations;
      const q = filters.search;
      return supportConversations.filter(c =>
        (c.clientName || '').toLowerCase().includes(q) ||
        (c.clientEmail || '').toLowerCase().includes(q) ||
        (c.lastMessage || '').toLowerCase().includes(q)
      );
    }
    if (!filters.search) return conversations;
    const q = filters.search;
    return conversations.filter(c =>
      (getClientName(c) || '').toLowerCase().includes(q) ||
      (c.clientEmail || '').toLowerCase().includes(q) ||
      (c.projectTitle || '').toLowerCase().includes(q) ||
      (c.lastMessage || '').toLowerCase().includes(q)
    );
  }

  function getConversations() {
    return [...conversations];
  }

  function getSupportConversations() {
    return [...supportConversations];
  }

  function getMessages(convId) {
    return messages[convId] || [];
  }

  function getSupportMessages(convId) {
    return supportMessages[convId] || [];
  }

  async function loadMessages(orderId) {
    var { data, error } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    var msgs = data || [];
    var userIds = msgs.map(function(m) { return m.user_id; });
    await fetchProfilesForUserIds(userIds);
    msgs.forEach(attachProfileToMsg);
    messages[orderId] = msgs;
    return messages[orderId];
  }

  async function sendMessage(orderId, text) {
    if (!text || !text.trim()) throw new Error('Message cannot be empty');
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabaseClient
      .from('messages')
      .insert({
        order_id: orderId,
        user_id: user.id,
        sender_role: 'admin',
        message: text.trim()
      })
      .select('*')
      .single();
    if (error) throw error;

    if (messages[orderId]) messages[orderId].push(data);
    else messages[orderId] = [data];

    const conv = conversations.find(c => c.id === orderId);
    if (conv) {
      conv.lastMessage = data.message;
      conv.lastMessageTime = data.created_at;
      conv.lastSenderRole = 'admin';
    }

    return data;
  }

  async function sendSupportReply(convId, text) {
    if (!text || !text.trim()) throw new Error('Message cannot be empty');
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabaseClient
      .from('messages')
      .insert({
        order_id: null,
        conversation_id: convId,
        user_id: user.id,
        sender_role: 'admin',
        message: text.trim()
      })
      .select('*')
      .single();
    if (error) throw error;

    if (supportMessages[convId]) supportMessages[convId].push(data);
    else supportMessages[convId] = [data];

    const conv = supportConversations.find(c => c.id === convId);
    if (conv) {
      conv.lastMessage = data.message;
      conv.lastMessageTime = data.created_at;
      conv.lastSenderRole = 'admin';
    }

    return data;
  }

  function setActiveConversation(convId) {
    activeOrderId = convId;
    const conv = conversations.find(c => c.id === convId);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      updateUnreadCount();
    }
    renderActiveConversation(convId);
  }

  function setActiveSupportConversation(convId) {
    activeSupportConvId = convId;
    markSupportConversationRead(convId);
    renderActiveSupportConversation(convId);
  }

  function setActiveTab(tab) {
    activeTab = tab;
    if (tab === 'support' && !supportFetched) {
      loadSupport().catch(e => console.warn('[AdminMessages] Failed to load support:', e));
    }
    const container = document.getElementById('messagesContainer');
    if (container) renderConversations(container);

    const tabs = document.querySelectorAll('.msg-tab');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

    const convContainer = document.getElementById('activeConversation');
    if (convContainer) {
      if (tab === 'support' && activeSupportConvId) {
        renderActiveSupportConversation(activeSupportConvId);
      } else if (tab === 'orders' && activeOrderId) {
        renderActiveConversation(activeOrderId);
      } else {
        convContainer.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--gray3);text-align:center;padding:40px;">
            <i class="fas fa-comment-dots" style="font-size:2rem;margin-bottom:12px;opacity:0.5;"></i>
            <p>Select a ${tab === 'support' ? 'support' : ''} conversation to view messages</p>
          </div>`;
      }
    }
  }

  async function loadSupport() {
    try {
      await fetchSupportConversations();
      const container = document.getElementById('messagesContainer');
      if (container && activeTab === 'support') renderSupportConversations(container);
      updateUnreadCount();
      notifyChange();
    } catch (err) {
      console.warn('[AdminMessages] loadSupport error:', err);
    }
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
    if (activeTab === 'support') {
      renderSupportConversations(container);
      return;
    }

    if (_loading) {
      container.innerHTML = renderSkeleton();
      return;
    }
    const filtered = getFilteredConversations();
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="orders-empty" style="padding:20px;">
          <div class="orders-empty-icon"><i class="fas fa-comment-dots"></i></div>
          <h3>${filters.search ? 'No matching conversations' : 'No conversations yet'}</h3>
          <p>${filters.search ? 'No conversations match your search.' : 'Messages will appear here once clients start conversations.'}</p>
        </div>`;
      return;
    }
    container.innerHTML = filtered.map(c => {
      const isActive = c.id === activeOrderId;
      const name = getClientName(c);
      const title = c.projectTitle || name;
      const preview = c.lastMessage ? escapeHtml(c.lastMessage.substring(0, 80)) + (c.lastMessage.length > 80 ? '...' : '') : 'No messages yet';
      return `
        <div class="message-item ${isActive ? 'active-conversation' : ''}" data-conv-id="${c.id}" style="cursor:pointer;${isActive ? 'background:var(--accent-glow);border-radius:var(--r-xs);padding:12px;' : 'padding:12px;'}" onclick="NAGRIVA_Messages.setActiveConversation('${c.id}')">
          <div class="message-avatar ma1">${getInitials(name)}</div>
          <div class="message-body">
            <div class="message-head">
              <span class="message-name">${escapeHtml(title)}</span>
              ${c.unreadCount > 0 ? '<span class="badge-count" style="display:inline-flex;">' + c.unreadCount + '</span>' : ''}
              <span class="message-time">${formatDate(c.lastMessageTime)}</span>
            </div>
            <div class="message-text">${preview}</div>
          </div>
        </div>`;
    }).join('');
  }

  function renderSupportConversations(container) {
    if (!container) return;
    if (supportFetched && supportConversations.length === 0) {
      container.innerHTML = `
        <div class="orders-empty" style="padding:20px;">
          <div class="orders-empty-icon"><i class="fas fa-headset"></i></div>
          <h3>No support conversations</h3>
          <p>Support messages from users will appear here.</p>
        </div>`;
      return;
    }
    if (!supportFetched) {
      container.innerHTML = renderSkeleton();
      return;
    }

    const filtered = getFilteredConversations();
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="orders-empty" style="padding:20px;">
          <div class="orders-empty-icon"><i class="fas fa-search"></i></div>
          <h3>${filters.search ? 'No matching conversations' : 'No support conversations'}</h3>
          <p>${filters.search ? 'No conversations match your search.' : 'Support messages will appear here once users start conversations.'}</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered.map(c => {
      const isActive = c.id === activeSupportConvId;
      const name = c.clientName;
      const preview = c.lastMessage ? escapeHtml(c.lastMessage.substring(0, 80)) + (c.lastMessage.length > 80 ? '...' : '') : 'No messages yet';
      return `
        <div class="message-item ${isActive ? 'active-conversation' : ''}" data-conv-id="${c.id}" style="cursor:pointer;${isActive ? 'background:var(--accent-glow);border-radius:var(--r-xs);padding:12px;' : 'padding:12px;'}" onclick="NAGRIVA_Messages.setActiveSupportConversation('${c.id}')">
          <div class="message-avatar ma1">${getInitials(name)}</div>
          <div class="message-body">
            <div class="message-head">
              <span class="message-name">${escapeHtml(name)}</span>
              ${c.unreadCount > 0 ? '<span class="badge-count" style="display:inline-flex;">' + c.unreadCount + '</span>' : ''}
              <span class="message-time">${formatDate(c.lastMessageTime)}</span>
            </div>
            <div class="message-text">${preview}</div>
            <div style="font-size:0.62rem;color:var(--accent);margin-top:2px;display:flex;align-items:center;gap:4px;">
              <span style="width:5px;height:5px;border-radius:50%;background:var(--accent);display:inline-block;"></span> Support Chat
            </div>
          </div>
        </div>`;
    }).join('');
  }

  async function renderActiveConversation(convId) {
    const container = document.getElementById('activeConversation');
    if (!container) return;

    const conv = conversations.find(c => c.id === convId);
    if (!conv) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray3);">Conversation not found</div>';
      return;
    }

    let msgs = messages[convId];
    if (!msgs || msgs.length === 0) {
      try {
        msgs = await loadMessages(convId);
      } catch (_) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray3);">Failed to load messages</div>';
        return;
      }
    }

    const name = getClientName(conv);

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;">
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);margin-bottom:12px;">
          <div class="message-avatar ma1">${getInitials(name)}</div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:0.88rem;color:var(--white);">${escapeHtml(name)}</div>
            <div style="font-size:0.72rem;color:var(--gray2);">${escapeHtml(conv.clientEmail || '')}${conv.orderNumber ? ' · ' + conv.orderNumber : ''}</div>
          </div>
        </div>
        <div id="messageHistory" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px;max-height:400px;">
          ${msgs.map(m => {
            const isAdminMsg = m.sender_role === 'admin';
            return `
              <div style="display:flex;${isAdminMsg ? 'justify-content:flex-end;' : 'justify-content:flex-start;'}margin-bottom:4px;">
                <div style="max-width:80%;padding:10px 14px;border-radius:${isAdminMsg ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};background:${isAdminMsg ? 'var(--accent)' : 'var(--surface)'};${isAdminMsg ? 'color:var(--bg);' : 'color:var(--white);'}font-size:0.82rem;line-height:1.4;">
                  <div>${escapeHtml(m.message)}</div>
                  <div style="font-size:0.62rem;${isAdminMsg ? 'color:rgba(0,0,0,0.5);' : 'color:var(--gray3);'}margin-top:4px;text-align:${isAdminMsg ? 'right' : 'left'};">${formatDate(m.created_at)}</div>
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
        await sendMessage(convId, text);
        input.value = '';
        input.focus();
        await renderActiveConversation(convId);
      } catch (err) {
        if (typeof NAGRIVA_Toast !== 'undefined') {
          NAGRIVA_Toast.error('Send Failed', err.message || 'Could not send message');
        }
      }
      input.disabled = false;
      sendBtn.disabled = false;
    }

    sendBtn.addEventListener('click', doSend);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
  }

  async function renderActiveSupportConversation(convId) {
    const container = document.getElementById('activeConversation');
    if (!container) return;

    const conv = supportConversations.find(c => c.id === convId);
    if (!conv) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray3);">Conversation not found</div>';
      return;
    }

    let msgs = supportMessages[convId];
    if (!msgs || msgs.length === 0) {
      try {
        msgs = await loadSupportMessages(convId);
      } catch (_) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray3);">Failed to load messages</div>';
        return;
      }
    }

    const name = conv.clientName;

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;">
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);margin-bottom:12px;">
          <div class="message-avatar ma1">${getInitials(name)}</div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:0.88rem;color:var(--white);">${escapeHtml(name)}</div>
            <div style="font-size:0.72rem;color:var(--accent);display:flex;align-items:center;gap:4px;">
              <span style="width:6px;height:6px;border-radius:50%;background:var(--accent);display:inline-block;animation:pulse 2s ease infinite;"></span> Support Chat
              ${conv.clientEmail ? ' <span style="color:var(--gray2);">· ' + escapeHtml(conv.clientEmail) + '</span>' : ''}
            </div>
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
        await sendSupportReply(convId, text);
        input.value = '';
        input.focus();
        await renderActiveSupportConversation(convId);
      } catch (err) {
        if (typeof NAGRIVA_Toast !== 'undefined') {
          NAGRIVA_Toast.error('Send Failed', err.message || 'Could not send message');
        }
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
    onChangeCallbacks.forEach(fn => fn([...conversations, ...supportConversations], unreadCount));
  }

  function destroy() {
    cleanupChannels();
    onChangeCallbacks = [];
    conversations = [];
    messages = {};
    activeOrderId = null;
    unreadCount = 0;
    _loading = false;
    _error = null;
    supportConversations = [];
    supportMessages = {};
    activeSupportConvId = null;
    supportUnreadCount = 0;
    supportFetched = false;
  }

  return {
    init,
    sendMessage,
    sendSupportReply,
    getConversations,
    getSupportConversations,
    getMessages,
    getSupportMessages,
    getFilteredConversations,
    getUnreadCount,
    getSupportUnreadCount,
    setSearch,
    setActiveConversation,
    setActiveSupportConversation,
    setActiveTab,
    renderConversations,
    renderActiveConversation,
    renderActiveSupportConversation,
    onChange,
    formatDate,
    getInitials,
    destroy,
    get loading() { return _loading; },
    get error() { return _error; },
    get activeTab() { return activeTab; }
  };
})();
