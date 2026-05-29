const NAGRIVA_UserAvatar = (() => {
  'use strict'

  let _initialized = false
  let _state = { session: null, user: null, profile: null, loading: true }
  let _dropdownOpen = false
  let _refs = {}

  /* ─── Helpers ─── */
  function getInitials(name) {
    if (!name) return 'N'
    return name.split(' ').map(function(w) { return w[0] }).join('').toUpperCase().slice(0, 2) || 'N'
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
      userAvatar: document.getElementById('userAvatar'),
      userName: document.getElementById('userName'),
      userImg: document.getElementById('userImg'),
      skeleton: document.getElementById('avatarSkeleton'),
      dropdown: document.getElementById('userDropdown'),
      dropdownName: document.getElementById('dropdownName'),
      dropdownEmail: document.getElementById('dropdownEmail'),
      dropdownAvatar: document.getElementById('dropdownAvatar'),
      signoutBtn: document.getElementById('signoutBtn'),
      adminLink: document.getElementById('adminNavLink'),
      mobileAdminLink: document.getElementById('mobileAdminNavLink'),
      mobileAuthBtn: document.getElementById('mobileAuthBtn'),
      mobileAuthText: document.getElementById('mobileAuthText')
    }
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
      var email = getUserEmail(s.profile, s.user)
      var role = getUserRole(s.profile)

      if (r.authBtn) r.authBtn.style.display = 'none'
      if (r.userAvatar) {
        r.userAvatar.classList.add('visible')
        r.userAvatar.classList.remove('loading')
      }
      if (r.userName) r.userName.textContent = displayName
      setAvatarImage(r.userImg, avatarUrl, displayName)

      if (r.dropdownName) r.dropdownName.textContent = displayName
      if (r.dropdownEmail) r.dropdownEmail.textContent = email
      setAvatarImage(r.dropdownAvatar, avatarUrl, displayName)

      if (r.mobileAuthBtn) r.mobileAuthBtn.style.display = 'none'
      if (r.mobileAuthText) r.mobileAuthText.textContent = 'Sign In'

      var isAdmin = role === 'admin'
      if (r.adminLink) r.adminLink.style.display = isAdmin ? '' : 'none'
      if (r.mobileAdminLink) r.mobileAdminLink.style.display = isAdmin ? '' : 'none'
    } else {
      if (r.authBtn) r.authBtn.style.display = ''
      if (r.userAvatar) r.userAvatar.classList.remove('visible', 'loading')
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
  async function loadProfile() {
    _state.loading = true
    updateUI()
    try {
      var supabase = window.supabaseClient
      var { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        _state.session = null; _state.user = null; _state.profile = null
        _state.loading = false
        updateUI()
        return
      }
      _state.session = session
      _state.user = session.user
      var { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url, role')
        .eq('id', session.user.id)
        .single()
      if (!error && profile) _state.profile = profile
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
        loadProfile()
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
    if (_initialized) return
    _initialized = true
    cacheRefs()
    if (!_refs.userAvatar) return
    await loadProfile()
    bindEvents()
    bindNav()
    subscribeProfile()
    initAuthListener()
  }

  /* ─── Auto-init on navbar load ─── */
  document.addEventListener('navbar:loaded', function onNavbarLoad() {
    document.removeEventListener('navbar:loaded', onNavbarLoad)
    init()
  })

  if (document.getElementById('navbar-container') && document.getElementById('navbar-container').children.length > 0) {
    init()
  }

  /* ─── Public API ─── */
  return {
    init: init,
    refresh: function() { _initialized = false; init() },
    closeDropdown: closeDropdown,
    getState: function() { return { session: _state.session, user: _state.user, profile: _state.profile } }
  }
})()
