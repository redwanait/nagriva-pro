console.log('[UserAvatar] Script file executing')

const NAGRIVA_UserAvatar = (() => {
  'use strict'
  console.log('[UserAvatar] IIFE entered')

  try {

  let _initialized = false
  let _state = { session: null, user: null, profile: null, loading: true }
  let _dropdownOpen = false
  let _refs = {}

  /* ─── Helpers ─── */
  function getInitials(name) {
    if (!name) return 'R'
    return name.split(' ').map(function(w) { return w[0] }).join('').toUpperCase().slice(0, 2) || 'R'
  }

  function getDisplayName(profile, user) {
    if (profile && profile.full_name) return profile.full_name
    if (user && user.user_metadata && user.user_metadata.full_name) return user.user_metadata.full_name
    if (user && user.email) return user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase() })
    return 'User'
  }

  function getAvatarUrl(profile, user) {
    if (profile && profile.avatar_url) return profile.avatar_url
    if (user && user.user_metadata && user.user_metadata.avatar_url) return user.user_metadata.avatar_url
    if (user && user.user_metadata && user.user_metadata.picture) return user.user_metadata.picture
    return null
  }

  function getUserEmail(profile, user) {
    if (profile && profile.email) return profile.email
    if (user && user.email) return user.email
    return ''
  }

  function getUserRole(profile) {
    if (profile && profile.role) return profile.role
    return 'client'
  }

  /* ─── DOM Refs ─── */
  function cacheRefs() {
    _refs = {
      authBtn: document.getElementById('authBtn'),
      bookBtn: document.getElementById('bookBtn'),
      userAvatar: document.getElementById('userAvatar'),
      userImg: document.getElementById('userImg'),
      skeleton: document.getElementById('avatarSkeleton'),
      dropdown: document.getElementById('userDropdown'),
      dropdownName: document.getElementById('dropdownName'),
      dropdownRole: document.getElementById('dropdownRole'),
      dropdownAvatar: document.getElementById('dropdownAvatar'),
      signoutBtn: document.getElementById('signoutBtn'),
      adminLink: document.getElementById('adminNavLink'),
      mobileAdminLink: document.getElementById('mobileAdminNavLink'),
      mobileAuthBtn: document.getElementById('mobileAuthBtn'),
      mobileAuthText: document.getElementById('mobileAuthText'),
      hamburger: document.getElementById('hamburger')
    }
  }

  /* ─── Inject avatar container into navbar if missing ─── */
  function ensureAvatarContainer() {
    if (document.getElementById('userAvatar')) {
      console.log('[UserAvatar] navbar target found')
      return true
    }

    console.log('[UserAvatar] #userAvatar NOT found in DOM — injecting')

    var navRight = document.querySelector('.nav-right')
    if (!navRight) {
      console.warn('[UserAvatar] .nav-right not found, cannot inject avatar')
      return false
    }

    var container = document.createElement('div')
    container.className = 'nav-user-avatar'
    container.id = 'userAvatar'
    container.setAttribute('role', 'button')
    container.setAttribute('tabindex', '0')
    container.setAttribute('aria-expanded', 'false')
    container.setAttribute('aria-haspopup', 'true')
    container.style.display = 'none'

    container.innerHTML =
      '<div class="nav-avatar-skeleton" id="avatarSkeleton"></div>' +
      '<div class="nav-user-img" id="userImg">U</div>' +
      '<div class="user-dropdown" id="userDropdown" role="menu" aria-label="User menu">' +
        '<div class="user-dropdown-header">' +
          '<div class="user-dropdown-avatar" id="dropdownAvatar">U</div>' +
          '<div class="user-dropdown-info">' +
            '<div class="user-dropdown-name" id="dropdownName">User</div>' +
            '<span class="user-dropdown-role" id="dropdownRole">Admin</span>' +
          '</div>' +
        '</div>' +
        '<div class="user-dropdown-menu">' +
          '<button class="user-dropdown-item" data-nav="dashboard" role="menuitem">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>' +
            ' Dashboard' +
          '</button>' +
          '<button class="user-dropdown-item" data-nav="profile" role="menuitem">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
            ' Profile' +
          '</button>' +
          '<button class="user-dropdown-item" data-nav="orders" role="menuitem">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
            ' Orders' +
          '</button>' +
          '<button class="user-dropdown-item" data-nav="messages" role="menuitem">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
            ' Messages' +
          '</button>' +
          '<button class="user-dropdown-item" data-nav="notifications" role="menuitem">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
            ' Notifications' +
          '</button>' +
          '<button class="user-dropdown-item" data-nav="settings" role="menuitem">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
            ' Settings' +
          '</button>' +
          '<button class="user-dropdown-item" data-nav="admin" role="menuitem" id="adminNavLink" style="display:none;">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
            ' Admin Panel' +
          '</button>' +
        '</div>' +
        '<div class="user-dropdown-divider"></div>' +
        '<button class="user-dropdown-item signout" id="signoutBtn" data-nav="signout" role="menuitem">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
          ' Logout' +
        '</button>' +
      '</div>'

    var bookBtn = document.getElementById('bookBtn')
    var hamburger = document.getElementById('hamburger')
    var ref = bookBtn || hamburger || null
    if (ref && ref.parentNode === navRight) {
      navRight.insertBefore(container, ref)
    } else {
      navRight.appendChild(container)
    }

    console.log('[UserAvatar] avatar container injected into .nav-right')
    return true
  }

  /* ─── Avatar Image / Initials ─── */
  function setAvatarImage(el, url, displayName) {
    if (!el) return
    var existingImg = el.querySelector('img.avatar-image')
    if (existingImg) existingImg.remove()
    el.classList.remove('has-image')
    el.textContent = getInitials(displayName)
    if (url) {
      var img = document.createElement('img')
      img.className = 'avatar-image'
      img.alt = displayName || 'Avatar'
      img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;position:absolute;inset:0;'
      img.loading = 'lazy'
      img.onload = function() {
        el.classList.add('has-image')
        el.textContent = ''
        el.appendChild(img)
      }
      img.onerror = function() {
        el.classList.remove('has-image')
        el.textContent = getInitials(displayName)
      }
      img.src = url
    }
  }

  /* ─── UI Update ─── */
  function updateUI() {
    var r = _refs
    var s = _state

    if (s.loading) {
      if (r.userAvatar) r.userAvatar.classList.add('loading')
      return
    }

    if (r.userAvatar) r.userAvatar.classList.remove('loading')

    if (s.session && s.user) {
      var displayName = getDisplayName(s.profile, s.user)
      var avatarUrl = getAvatarUrl(s.profile, s.user)
      var role = getUserRole(s.profile)

      if (r.authBtn) r.authBtn.style.display = 'none'
      if (r.bookBtn) r.bookBtn.style.display = 'none'
      if (r.userAvatar) {
        r.userAvatar.style.display = 'flex'
        r.userAvatar.classList.add('visible')
        r.userAvatar.classList.remove('loading')
      }
      setAvatarImage(r.userImg, avatarUrl, displayName)

      if (r.dropdownName) r.dropdownName.textContent = displayName
      if (r.dropdownRole) {
        var roleLabel = role === 'admin' ? 'Admin' : role.charAt(0).toUpperCase() + role.slice(1)
        r.dropdownRole.textContent = roleLabel
        r.dropdownRole.style.display = 'inline-flex'
      }
      setAvatarImage(r.dropdownAvatar, avatarUrl, displayName)

      if (r.mobileAuthBtn) r.mobileAuthBtn.style.display = 'none'
      if (r.mobileAuthText) r.mobileAuthText.textContent = 'Sign In'

      var isAdmin = role === 'admin'
      if (r.adminLink) r.adminLink.style.display = isAdmin ? '' : 'none'
      if (r.mobileAdminLink) r.mobileAdminLink.style.display = isAdmin ? '' : 'none'

      console.log('[UserAvatar] avatar rendered')
    } else {
      if (r.authBtn) r.authBtn.style.display = ''
      if (r.bookBtn) r.bookBtn.style.display = ''
      if (r.userAvatar) {
        r.userAvatar.style.display = 'none'
        r.userAvatar.classList.remove('visible', 'loading')
      }
      if (r.mobileAuthBtn) r.mobileAuthBtn.style.display = ''
      if (r.mobileAuthText) r.mobileAuthText.textContent = 'Sign In'
      if (r.adminLink) r.adminLink.style.display = 'none'
      if (r.mobileAdminLink) r.mobileAdminLink.style.display = 'none'
    }
  }

  /* ─── Dropdown ─── */
  function closeDropdown() {
    if (_refs.dropdown) _refs.dropdown.classList.remove('open')
    if (_refs.userAvatar) _refs.userAvatar.setAttribute('aria-expanded', 'false')
    _dropdownOpen = false
  }

  function openDropdown() {
    if (_refs.dropdown) _refs.dropdown.classList.add('open')
    if (_refs.userAvatar) _refs.userAvatar.setAttribute('aria-expanded', 'true')
    _dropdownOpen = true
    if (typeof NAGRIVA_NotificationsDropdown !== 'undefined') {
      NAGRIVA_NotificationsDropdown.close()
    }
  }

  function toggleDropdown() {
    if (_dropdownOpen) { closeDropdown() } else { openDropdown() }
  }

  /* ─── Sign Out ─── */
  async function handleSignOut() {
    closeDropdown()
    try { await window.supabaseClient.auth.signOut() } catch (_) {}
    _state.session = null
    _state.user = null
    _state.profile = null
    updateUI()
    window.location.href = '/pages/signin.html'
  }

  /* ─── Event Binding ─── */
  function bindEvents() {
    var r = _refs
    if (!r.userAvatar) return

    r.userAvatar.addEventListener('click', function(e) {
      e.stopPropagation()
      toggleDropdown()
    })

    r.userAvatar.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleDropdown()
      }
    })

    if (r.signoutBtn) {
      r.signoutBtn.addEventListener('click', function(e) {
        e.preventDefault()
        handleSignOut()
      })
    }

    document.addEventListener('click', function(e) {
      if (r.userAvatar && !r.userAvatar.contains(e.target) && r.dropdown && r.dropdown.classList.contains('open')) {
        closeDropdown()
      }
    })

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && _dropdownOpen) closeDropdown()
    })
  }

  /* ─── Dropdown Navigation ─── */
  function bindNav() {
    var NAV_MAP = {
      'dashboard': '/pages/dashboard.html',
      'profile': '/pages/profile.html',
      'orders': '/pages/order-tracking.html',
      'messages': '/pages/client-portal.html',
      'notifications': '/pages/notifications.html',
      'settings': '/pages/settings.html',
      'admin': '/pages/admin-dashboard.html'
    }
    document.querySelectorAll('.user-dropdown-item[data-nav]').forEach(function(item) {
      var nav = item.getAttribute('data-nav')
      if (nav === 'signout') return
      var href = NAV_MAP[nav]
      if (!href) return
      item.addEventListener('click', function(e) {
        e.stopPropagation()
        closeDropdown()
        window.location.href = href
      })
    })
  }

  /* ─── Profile Loading ─── */
  async function loadProfile(session) {
    _state.loading = true
    updateUI()
    try {
      if (!session) {
        var supabase = window.supabaseClient
        var { data } = await supabase.auth.getSession()
        session = data.session
      }
      console.log('[UserAvatar] session status:', session ? 'exists' : 'null')
      if (!session) {
        if (_state.session) { _state.loading = false; updateUI(); return }
        _state.session = null; _state.user = null; _state.profile = null
        _state.loading = false
        updateUI()
        return
      }
      console.log('[UserAvatar] session found')
      _state.session = session
      _state.user = session.user
      console.log('[UserAvatar] user id:', session.user.id)
      var { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url, role')
        .eq('id', session.user.id)
        .single()
      if (error) console.warn('[UserAvatar] profile query error:', error.message)
      if (profile) {
        _state.profile = profile
        console.log('[UserAvatar] profile loaded')
        console.log('[UserAvatar]   full_name:', profile.full_name)
        console.log('[UserAvatar]   avatar_url:', profile.avatar_url)
        console.log('[UserAvatar]   email:', profile.email)
        console.log('[UserAvatar]   role:', profile.role)
      }
    } catch (err) {
      console.warn('[UserAvatar] loadProfile error:', err)
    } finally {
      _state.loading = false
      updateUI()
    }
  }

  /* ─── Realtime Profile Subscription ─── */
  function subscribeProfile() {
    if (!_state.user) return
    window.supabaseClient
      .channel('user-avatar-profile')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'id=eq.' + _state.user.id },
        function(payload) {
          _state.profile = payload.new
          updateUI()
        }
      )
      .subscribe()
  }

  /* ─── Auth Listener ─── */
  function initAuthListener() {
    window.supabaseClient.auth.onAuthStateChange(function(event, session) {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        _state.session = session
        _state.user = session ? session.user : null
        loadProfile(session)
      } else if (event === 'SIGNED_OUT') {
        _state.session = null; _state.user = null; _state.profile = null
        _state.loading = false
        updateUI()
      } else if (event === 'USER_UPDATED') {
        loadProfile()
      }
    })
  }

  /* ─── Init ─── */
  async function init() {
    console.log('[UserAvatar] init() called')
    if (_initialized) {
      cacheRefs()
      if (_refs.userAvatar) {
        ensureAvatarContainer()
        cacheRefs()
        bindEvents()
        bindNav()
      }
      updateUI()
      return
    }
    _initialized = true
    cacheRefs()

    var hasAvatar = ensureAvatarContainer()
    if (!hasAvatar) {
      console.warn('[UserAvatar] could not find or create avatar container — aborting')
      return
    }
    cacheRefs()

    if (!_refs.userAvatar) {
      console.warn('[UserAvatar] #userAvatar still missing after injection — aborting')
      return
    }

    console.log('[UserAvatar] navbar target found')
    await loadProfile()
    bindEvents()
    bindNav()
    subscribeProfile()
    initAuthListener()
    console.log('[UserAvatar] init() complete')
  }

  /* ─── Refresh profile (called after avatar upload) ─── */
  async function refreshProfile() {
    if (!_state.user) {
      if (!_initialized) { init(); return }
      return
    }
    _state.loading = true
    updateUI()
    try {
      var { data: profile, error } = await window.supabaseClient
        .from('profiles')
        .select('full_name, email, avatar_url, role')
        .eq('id', _state.user.id)
        .single()
      if (!error && profile) _state.profile = profile
    } catch (err) {
      console.warn('[UserAvatar] refreshProfile error:', err)
    } finally {
      _state.loading = false
      updateUI()
    }
  }

  /* ─── Auto-init on navbar load ─── */
  document.addEventListener('navbar:loaded', function onNavbarLoad() {
    console.log('[UserAvatar] EVENT navbar:loaded received')
    init()
  })

  var nc = document.getElementById('navbar-container')
  if (nc && nc.children.length > 0) {
    console.log('[UserAvatar] navbar-container already populated — calling init()')
    init()
  } else {
    console.log('[UserAvatar] navbar-container empty or missing — waiting for navbar:loaded event')
  }

  /* ─── Public API ─── */
  return {
    init: init,
    refreshProfile: refreshProfile,
    closeDropdown: closeDropdown,
    getState: function() { return { session: _state.session, user: _state.user, profile: _state.profile } }
  }

  } catch (err) {
    console.error('[UserAvatar FATAL] Exception at IIFE top-level:', err)
    console.error('[UserAvatar FATAL] Stack:', err.stack)
    throw err
  }
})()

console.log('[UserAvatar] Module registered')
