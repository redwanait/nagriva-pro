/* ════════════════════════════════════════════════════════
   Nagriva — AI Chatbot Widget
   chatbot.js
════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const QUICK_REPLIES = ['Services', 'Pricing', 'Book a Free Call', 'SEO Help'];
  const GREETING = 'Hey 👋 Need help growing your brand?';

  const HTML = `
<div id="nagriva-chat">
  <div class="chat-glow-bg" id="chatGlow"></div>

  <div class="chat-window" id="chatWindow">
    <div class="chat-header">
      <div class="chat-header-left">
        <div class="chat-avatar">✦</div>
        <div class="chat-header-info">
          <h4>Nagriva AI</h4>
          <span class="chat-status"><span class="chat-status-dot"></span> Online</span>
        </div>
      </div>
      <button class="chat-header-close" id="chatClose" aria-label="Close chat">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>

    <div class="chat-messages" id="chatMessages"></div>

    <div class="quick-replies" id="quickReplies"></div>

    <div class="chat-input-area">
      <input class="chat-input" id="chatInput" type="text" placeholder="Type a message..." autocomplete="off" />
      <button class="chat-send" id="chatSend" aria-label="Send message" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
      </button>
    </div>
  </div>
</div>`;

  /* ─── STATE ─── */
  let isOpen = false;
  let isTyping = false;
  let hasGreeted = false;
  let conversationHistory = [];

  let fab, windowEl, glowEl, messagesEl, quickRepliesEl, inputEl, sendEl, closeEl;

  function init() {
    var path = window.location.pathname;
    if (path !== '/' && !path.endsWith('index.html')) return;
    if (path.includes('/industries/')) return;

    if (document.getElementById('nagriva-chat')) return;

    document.body.insertAdjacentHTML('beforeend', HTML);

    fab = document.querySelector('.chat-fab');
    windowEl = document.getElementById('chatWindow');
    glowEl = document.getElementById('chatGlow');
    messagesEl = document.getElementById('chatMessages');
    quickRepliesEl = document.getElementById('quickReplies');
    inputEl = document.getElementById('chatInput');
    sendEl = document.getElementById('chatSend');
    closeEl = document.getElementById('chatClose');

    closeEl.addEventListener('click', closeChat);
    sendEl.addEventListener('click', sendUserMessage);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage();
      }
    });
    inputEl.addEventListener('input', function () {
      sendEl.disabled = !this.value.trim();
    });

    document.addEventListener('click', function (e) {
      if (isOpen && !e.target.closest('#nagriva-chat') && !e.target.closest('.chat-fab') && !e.target.closest('.faq-chat-btn')) {
        closeChat();
      }
    });

    if (window.__chatRequested) {
      setTimeout(openChat, 100);
    }
  }

  function openChat() {
    if (isOpen) return;
    isOpen = true;
    if (fab) fab.classList.add('open');
    windowEl.classList.add('open');
    glowEl.classList.add('visible');

    if (!hasGreeted) {
      hasGreeted = true;
      setTimeout(function () {
        showBotMessage(GREETING);
        showQuickReplies(QUICK_REPLIES);
      }, 350);
    }

    setTimeout(function () {
      inputEl.focus();
    }, 400);
  }

  function closeChat() {
    if (!isOpen) return;
    isOpen = false;
    if (fab) fab.classList.remove('open');
    windowEl.classList.remove('open');
    glowEl.classList.remove('visible');
  }

  /* ─── MESSAGES ─── */

  function typeBotMessage(text) {
    return new Promise(function (resolve) {
      var div = document.createElement('div');
      div.className = 'message bot';
      messagesEl.appendChild(div);
      scrollBottom();

      var index = 0;
      var len = text.length;

      function type() {
        if (index < len) {
          var currentText = text.slice(0, index + 1);
          div.innerHTML = currentText.replace(/\n/g, '<br>') + '<span class="typing-cursor"></span>';
          index++;
          scrollBottom();

          var char = text[index - 1];
          var delay;
          if (char === '.' || char === '!' || char === '?') delay = 100;
          else if (char === ',' || char === ';' || char === ':') delay = 55;
          else if (char === ' ') delay = 18;
          else delay = 18 + Math.random() * 18;

          setTimeout(type, delay);
        } else {
          div.innerHTML = text.replace(/\n/g, '<br>');
          scrollBottom();
          resolve();
        }
      }

      setTimeout(type, 280);
    });
  }

  function showBotMessage(text) {
    var div = document.createElement('div');
    div.className = 'message bot';
    div.innerHTML = text.replace(/\n/g, '<br>');
    messagesEl.appendChild(div);
    scrollBottom();
  }

  function showUserMessage(text) {
    var div = document.createElement('div');
    div.className = 'message user';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollBottom();
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'chatTyping';
    div.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    messagesEl.appendChild(div);
    scrollBottom();
  }

  function hideTyping() {
    var el = document.getElementById('chatTyping');
    if (el) el.remove();
  }

  function showQuickReplies(buttons) {
    quickRepliesEl.innerHTML = '';
    buttons.forEach(function (label) {
      var btn = document.createElement('button');
      btn.className = 'quick-btn';
      btn.textContent = label;
      btn.addEventListener('click', function () {
        handleQuickReply(label);
      });
      quickRepliesEl.appendChild(btn);
    });
  }

  function hideQuickReplies() {
    quickRepliesEl.innerHTML = '';
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /* ─── RESPONSE LOGIC ─── */

  async function fetchAIResponse(userMessage) {
    var url = '/api/chat';
    var payload = {
      message: userMessage,
      history: conversationHistory,
    };

    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        var errorBody = null;
        try { errorBody = await res.json(); } catch (_) {}
        var errMsg = (errorBody && errorBody.error) || 'HTTP ' + res.status;
        throw new Error(errMsg);
      }

      var data = await res.json();
      return data.reply;
    } catch (err) {

      return "Thanks for reaching out! I'm having a brief technical moment. Please try again, or <a href=\"https://calendly.com/redwanaitlhadj16/30min\" target=\"_blank\" rel=\"noopener\" style=\"color:#3b82f6;text-decoration:underline\">book a free call</a> and we'll get right back to you.";
    }
  }

  async function handleQuickReply(label) {
    if (isTyping) return;
    hideQuickReplies();
    showUserMessage(label);
    conversationHistory.push({ role: 'user', content: label });
    await botReply(label);
  }

  async function sendUserMessage() {
    var text = inputEl.value.trim();
    if (!text || isTyping) return;

    inputEl.value = '';
    sendEl.disabled = true;
    hideQuickReplies();
    showUserMessage(text);
    conversationHistory.push({ role: 'user', content: text });
    await botReply(text);
  }

  async function botReply(userMessage) {
    isTyping = true;
    showTyping();

    var reply = await fetchAIResponse(userMessage);

    hideTyping();
    await typeBotMessage(reply);
    conversationHistory.push({ role: 'assistant', content: reply });

    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10);
    }

    isTyping = false;

    if (conversationHistory.length >= 4) {
      showQuickReplies(['Book a Free Call', 'Pricing', 'Tell Me More']);
    }

    scrollBottom();
  }

  /* ─── EXPOSE GLOBAL API ─── */
  window.openNagrivaChat = function () {
    if (isOpen) {
      inputEl.focus();
      windowEl.classList.add('attention');
      setTimeout(function () {
        windowEl.classList.remove('attention');
      }, 600);
    } else {
      openChat();
    }
  };

  /* ─── START ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
