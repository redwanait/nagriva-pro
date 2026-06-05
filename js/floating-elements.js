(function () {
  'use strict';

  /* Dynamically inject client-messages.css if not already present */
  (function ensureCSS() {
    if (document.querySelector('link[href*="client-messages.css"]')) return;
    var link = document.createElement('link');
    var path = window.location.pathname;
    var basePath = path.startsWith('/pages/') || path.startsWith('/admin/') ? '../' : '/';
    link.rel = 'stylesheet';
    link.href = basePath + 'css/client-messages.css';
    document.head.appendChild(link);
  })();

  var bookCallLink = window.location.pathname === '/' || window.location.pathname === '/index.html' ? '#contact' : '../index.html#contact';

  /* ─── State ─── */
  var popupOpen = false;
  var supportOpen = false;
  var supportAuthChecked = false;
  var supportAuthed = false;
  var supportUser = null;
  var supportConversationId = localStorage.getItem('nagriva_support_conv_id') || null;
  var supportMessages = [];
  var supportSending = false;
  var supportUnread = 0;
  var supportChannel = null;
  var SUPPORT_READ_KEY = 'nagriva_support_read_at';

  /* ─── Helpers ─── */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(d) {
    if (!d) return '';
    var date = new Date(d);
    var diff = (Date.now() - date) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function ensureConversationId() {
    if (!supportConversationId) {
      supportConversationId = generateUUID();
      localStorage.setItem('nagriva_support_conv_id', supportConversationId);
    }
    return supportConversationId;
  }

  function getSupportReadAt() {
    try { return localStorage.getItem(SUPPORT_READ_KEY); } catch(e) { return null; }
  }

  function setSupportReadAt() {
    try { localStorage.setItem(SUPPORT_READ_KEY, new Date().toISOString()); } catch(e) {}
  }

  /* ─── Popup ─── */
  function togglePopup() {
    if (popupOpen) closePopup();
    else openPopup();
  }

  function openPopup() {
    var popup = document.getElementById('fabPopup');
    var fab = document.getElementById('globalChatFab');
    if (!popup) return;
    popupOpen = true;
    popup.classList.add('open');
    if (fab) fab.classList.add('open');
  }

  function closePopup() {
    var popup = document.getElementById('fabPopup');
    var fab = document.getElementById('globalChatFab');
    popupOpen = false;
    if (popup) popup.classList.remove('open');
    if (fab) fab.classList.remove('open');
  }

  /* ─── HTML ─── */
  var HTML = '\n\
<div id="nagriva-floating-elements">\n\
  <div class="fab-container">\n\
    <div class="fab-popup" id="fabPopup">\n\
      <div class="fab-popup-item" id="fabPopupAI">\n\
        <div class="fab-popup-icon">\n\
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n\
            <path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>\n\
          </svg>\n\
        </div>\n\
        <div class="fab-popup-info">\n\
          <span class="fab-popup-title">AI Assistant</span>\n\
          <span class="fab-popup-desc">Instant AI-powered help</span>\n\
        </div>\n\
      </div>\n\
      <div class="fab-popup-divider"></div>\n\
      <div class="fab-popup-item" id="fabPopupSupport">\n\
        <div class="fab-popup-icon">\n\
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n\
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>\n\
          </svg>\n\
        </div>\n\
        <div class="fab-popup-info">\n\
          <span class="fab-popup-title">Support Chat</span>\n\
          <span class="fab-popup-desc">Talk with our support team</span>\n\
        </div>\n\
      </div>\n\
    </div>\n\
    <div class="chat-fab-wrapper">\n\
      <button class="chat-fab" id="globalChatFab" aria-label="NAGRIVA Assistant">\n\
        <img src="https://i.ibb.co/QLzsBT8/1-removebg-preview.png" alt="NAGRIVA" />\n\
      </button>\n\
      <span class="chat-fab-badge" id="globalChatBadge"></span>\n\
    </div>\n\
  </div>\n\
\n\
  <div class="support-overlay" id="supportOverlay"></div>\n\
\n\
  <div class="support-modal" id="supportModal">\n\
    <div class="support-modal-header">\n\
      <div class="support-modal-header-left">\n\
        <div class="support-modal-avatar">&#x2726;</div>\n\
        <div class="support-modal-header-info">\n\
          <h4>NAGRIVA Support</h4>\n\
          <span class="support-status"><span class="chat-status-dot"></span> Online</span>\n\
        </div>\n\
      </div>\n\
      <button class="support-modal-close" id="supportClose" aria-label="Close">\n\
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>\n\
      </button>\n\
    </div>\n\
    <div class="support-modal-body" id="supportModalBody"></div>\n\
  </div>\n\
\n\
  <a class="book-call-btn" href="' + bookCallLink + '" id="globalBookCallBtn" aria-label="Book a Free Call">\n\
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n\
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>\n\
    </svg>\n\
    <span>Book a Free Call</span>\n\
    <svg class="book-call-sparkle" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n\
      <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/>\n\
    </svg>\n\
  </a>\n\
</div>';

  /* ─── Auth Check ─── */
  async function checkAuth() {
    if (supportAuthChecked) return supportAuthed;
    try {
      var result = await window.supabaseClient.auth.getUser();
      supportUser = result.data.user;
      supportAuthed = !!supportUser;
      supportAuthChecked = true;
      return supportAuthed;
    } catch(e) {
      supportAuthed = false;
      supportAuthChecked = true;
      return false;
    }
  }

  /* ─── Fetch Support Messages ─── */
  async function fetchSupportMessages() {
    if (!supportUser || !supportConversationId) return [];
    try {
      var res = await window.supabaseClient
        .from('messages')
        .select('*')
        .eq('conversation_id', supportConversationId)
        .order('created_at', { ascending: true });
      if (res.error) {
        return [];
      }
      supportMessages = res.data || [];
      return supportMessages;
    } catch(e) {
      return [];
    }
  }

  /* ─── Send Support Message ─── */
  async function sendSupportMessage(text) {
    if (!supportUser || !text.trim() || supportSending) return null;
    var convId = ensureConversationId();
    supportSending = true;
    var sendBtn = document.getElementById('supportChatSend');
    var input = document.getElementById('supportChatInput');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.classList.add('disabled'); }
    if (input) input.disabled = true;
    try {
      var res = await window.supabaseClient.from('messages').insert({
        order_id: null,
        conversation_id: convId,
        user_id: supportUser.id,
        sender_role: 'client',
        message: text.trim()
      }).select().single();
      if (res.error) {
        if (typeof NAGRIVA_Toast !== 'undefined') {
          NAGRIVA_Toast.error('Failed to send', 'Please try again.');
        }
        return null;
      }
      supportMessages.push(res.data);
      var list = document.getElementById('supportMsgList');
      if (list) {
        list.innerHTML = '';
        supportMessages.forEach(function(m) { appendMsgBubble(list, m); });
        scrollSupportMessages();
      }
      showSupportTyping();
      setTimeout(hideSupportTyping, 1800);
      return res.data;
    } catch(e) {
      if (typeof NAGRIVA_Toast !== 'undefined') {
        NAGRIVA_Toast.error('Failed to send', 'Please try again.');
      }
      return null;
    } finally {
      supportSending = false;
      if (sendBtn) { sendBtn.disabled = false; sendBtn.classList.remove('disabled'); }
      if (input) {
        input.disabled = false;
        input.focus();
      }
    }
  }

  /* ─── Update Badge ─── */
  function updateSupportBadge() {
    var badge = document.getElementById('globalChatBadge');
    if (badge) {
      badge.classList.toggle('visible', supportUnread > 0);
    }
  }

  /* ─── Bubble rendering ─── */
  function appendMsgBubble(list, msg) {
    var isClient = msg.sender_role === 'client';
    var initials = isClient ? 'U' : 'S';
    var html = '\n\
      <div class="track-chat-message ' + (isClient ? 'client' : 'admin') + '">\n\
        <div class="chat-message-avatar">' + initials + '</div>\n\
        <div>\n\
          <div class="chat-message-bubble">' + escapeHtml(msg.message) + '</div>\n\
          <div class="chat-message-time">' + fmtDate(msg.created_at) + '</div>\n\
        </div>\n\
      </div>';
    list.insertAdjacentHTML('beforeend', html);
  }

  function scrollSupportMessages() {
    var list = document.getElementById('supportMsgList');
    if (list) list.scrollTop = list.scrollHeight;
  }

  /* ─── Typing indicator ─── */
  function showSupportTyping() {
    var list = document.getElementById('supportMsgList');
    if (!list || document.getElementById('supportTypingIndicator')) return;
    var html = '\n\
      <div class="typing-indicator" id="supportTypingIndicator">\n\
        <span class="typing-dot"></span>\n\
        <span class="typing-dot"></span>\n\
        <span class="typing-dot"></span>\n\
      </div>';
    list.insertAdjacentHTML('beforeend', html);
    scrollSupportMessages();
  }

  function hideSupportTyping() {
    var el = document.getElementById('supportTypingIndicator');
    if (el) el.remove();
  }

  /* ─── Render Auth View ─── */
  function renderAuthView(container) {
    container.innerHTML = '\n\
      <div class="support-modal-auth">\n\
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>\n\
        <h3>Support Chat</h3>\n\
        <p>Sign in to message our team.</p>\n\
        <a href="/pages/login.html" class="btn-primary" style="padding:10px 24px;border-radius:12px;font-size:0.82rem;font-weight:600;background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--bg);border:none;cursor:pointer;text-decoration:none;transition:all 0.3s ease;">Sign In</a>\n\
        <div style="display:flex;gap:8px;margin-top:4px;">\n\
          <a href="/pages/signup.html" style="font-size:0.72rem;color:var(--gray2);text-decoration:underline;">Create an account</a>\n\
        </div>\n\
      </div>';
  }

  /* ─── Render Chat View (Intercom-style) ─── */
  function renderChatView(container) {
    container.innerHTML = '\n\
      <div class="support-modal-chat">\n\
        <div class="track-chat-messages" id="supportMsgList"></div>\n\
        <div class="track-chat-input-area">\n\
          <div class="track-chat-input-row">\n\
            <input type="text" class="track-chat-input" id="supportChatInput" placeholder="Type your message..." autocomplete="off" />\n\
            <button class="track-chat-send" id="supportChatSend">\n\
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>\n\
            </button>\n\
          </div>\n\
        </div>\n\
      </div>';

    var list = document.getElementById('supportMsgList');
    if (supportMessages.length === 0) {
      if (list) list.innerHTML = NAGRIVA_EmptyState.render({
        icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        title: 'No messages yet',
        description: 'Start a conversation with NAGRIVA Support',
        variant: 'inline'
      });
    } else {
      if (list) supportMessages.forEach(function(m) { appendMsgBubble(list, m); });
    }

    /* Wire up send */
    var input = document.getElementById('supportChatInput');
    var sendBtn = document.getElementById('supportChatSend');
    if (input && sendBtn) {
      var doSend = function() {
        var text = input.value.trim();
        if (!text) return;
        input.value = '';
        sendSupportMessage(text);
      };
      sendBtn.addEventListener('click', doSend);
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          doSend();
        }
      });
      setTimeout(function() { input.focus(); }, 100);
    }
  }

  /* ─── Open / Close Support ─── */
  async function openSupport() {
    var modal = document.getElementById('supportModal');
    var overlay = document.getElementById('supportOverlay');
    var body = document.getElementById('supportModalBody');
    if (!modal) return;

    supportOpen = true;
    modal.classList.add('open');
    if (overlay) overlay.classList.add('open');

    var isAuth = await checkAuth();
    if (!isAuth) {
      renderAuthView(body);
      return;
    }

    /* Clear unread when opening */
    supportUnread = 0;
    updateSupportBadge();
    setSupportReadAt();

    /* Ensure realtime */
    if (!supportChannel) {
      setupSupportRealtime();
    }

    await fetchSupportMessages();
    renderChatView(body);
    setTimeout(scrollSupportMessages, 50);
  }

  function closeSupport() {
    var modal = document.getElementById('supportModal');
    var overlay = document.getElementById('supportOverlay');
    supportOpen = false;
    if (modal) modal.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  /* ─── Setup Realtime for Support ─── */
  function setupSupportRealtime() {
    if (supportChannel) {
      window.supabaseClient.removeChannel(supportChannel);
    }

    supportChannel = window.supabaseClient
      .channel('floating-support-rt')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        function(payload) {
          if (!supportAuthed || !supportUser || !payload.new) return;
          var msg = payload.new;
          if (!msg.conversation_id || msg.conversation_id !== supportConversationId) return;
          if (msg.user_id === supportUser.id && msg.sender_role === 'client') return;

          /* Avoid duplicates */
          var exists = supportMessages.some(function(m) { return m.id === msg.id; });
          if (exists) return;

          supportMessages.push(msg);

          if (supportOpen) {
            var list = document.getElementById('supportMsgList');
            if (list) {
              hideSupportTyping();
              appendMsgBubble(list, msg);
              scrollSupportMessages();
            }
          } else {
            supportUnread++;
            updateSupportBadge();
          }

          if (document.visibilityState !== 'visible' && typeof NAGRIVA_Toast !== 'undefined') {
            NAGRIVA_Toast.info('NAGRIVA Support',
              msg.message.length > 60 ? msg.message.substring(0, 60) + '...' : msg.message,
              { duration: 5000 }
            );
          }
        }
      )
      .subscribe();
  }

  /* ─── Init ─── */
  function init() {
    if (document.getElementById('nagriva-floating-elements')) return;

    document.body.insertAdjacentHTML('beforeend', HTML);

    /* FAB - toggle popup */
    var fab = document.getElementById('globalChatFab');
    if (fab) {
      fab.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePopup();
      });
    }

    /* Popup items */
    var popupAI = document.getElementById('fabPopupAI');
    var popupSupport = document.getElementById('fabPopupSupport');

    if (popupAI) {
      popupAI.addEventListener('click', function(e) {
        e.stopPropagation();
        closePopup();
        if (typeof window.openNagrivaChat === 'function') {
          window.openNagrivaChat();
        }
      });
    }

    if (popupSupport) {
      popupSupport.addEventListener('click', function(e) {
        e.stopPropagation();
        closePopup();
        if (supportOpen) closeSupport();
        else openSupport();
      });
    }

    /* Click outside to close popup */
    document.addEventListener('click', function(e) {
      if (popupOpen && !e.target.closest('.fab-container')) {
        closePopup();
      }
    });

    /* Support close button and overlay */
    var supportClose = document.getElementById('supportClose');
    var supportOverlay = document.getElementById('supportOverlay');

    if (supportClose) {
      supportClose.addEventListener('click', closeSupport);
    }
    if (supportOverlay) {
      supportOverlay.addEventListener('click', closeSupport);
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (popupOpen) closePopup();
        if (supportOpen) closeSupport();
      }
    });

    /* Background auth check + realtime setup */
    setTimeout(function() {
      checkAuth().then(function(authed) {
        if (authed && supportConversationId) {
          fetchSupportMessages().then(function() {
            var readAt = getSupportReadAt();
            if (readAt) {
              supportUnread = supportMessages.filter(function(m) {
                return m.sender_role === 'admin' && new Date(m.created_at) > new Date(readAt);
              }).length;
            } else {
              supportUnread = supportMessages.filter(function(m) {
                return m.sender_role === 'admin';
              }).length;
            }
            updateSupportBadge();
          });
          setupSupportRealtime();
        } else if (authed) {
          setupSupportRealtime();
        }
      });
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
