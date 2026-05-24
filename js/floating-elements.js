(function () {
  'use strict';

  var bookCallLink = window.location.pathname === '/' || window.location.pathname === '/index.html' ? '#contact' : '../index.html#contact';

  var HTML = `
<div id="nagriva-floating-elements">
  <div class="chat-fab-wrapper">
    <button class="chat-fab" id="globalChatFab" aria-label="Toggle chat">
      <img src="/assets/images/branding/nagriva-logo.png" alt="NAGRIVA" />
    </button>
  </div>

  <a class="book-call-btn" href="${bookCallLink}" id="globalBookCallBtn" aria-label="Book a Free Call">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
    <span>Book a Free Call</span>
    <svg class="book-call-sparkle" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/>
    </svg>
  </a>
</div>`;

  function init() {
    if (document.getElementById('nagriva-floating-elements')) return;

    document.body.insertAdjacentHTML('beforeend', HTML);

    var fab = document.getElementById('globalChatFab');
    if (fab) {
      fab.addEventListener('click', function () {
        if (typeof window.openNagrivaChat === 'function') {
          window.openNagrivaChat();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
