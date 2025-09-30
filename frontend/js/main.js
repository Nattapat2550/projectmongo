// /frontend/js/main.js
(function () {
  const FRONTEND_HOST = 'https://projectmongo-1.onrender.com';
  const BACKEND_HOST  = 'https://projectmongo.onrender.com';
  const onFrontend = location.origin === FRONTEND_HOST;
  window.API_BASE = onFrontend ? BACKEND_HOST : '';

  // ============ Token from URL (Google callback) ============
  (function captureTokenFromURL() {
    let token = null;
    const hash = location.hash || '';
    const m = hash.match(/[#&]token=([^&]+)/);
    if (m) token = decodeURIComponent(m[1]);
    if (!token) {
      const qs = new URLSearchParams(location.search);
      if (qs.get('token')) token = qs.get('token');
    }
    if (token) {
      sessionStorage.setItem('authToken', token);
      history.replaceState({}, document.title, location.pathname + location.search);
    }
  })();

  // ============ Auto redirect index -> home ถ้าล็อกอินแล้ว ============
  function autoRedirectIfLoggedIn() {
    const path = location.pathname;
    const isIndex = path === '/' || path.endsWith('/index.html');
    if (!isIndex) return;
    (async () => {
      try {
        const res = await fetch('/api/users/me');
        if (res.ok) location.replace('/home.html');
      } catch {}
    })();
  }

  // ============ URL helper ============
  window.buildAssetURL = function (p) {
    if (!p) return '/images/user.png';
    if (/^(https?:)?\/\//i.test(p)) return p; // absolute
    if (/^\/+(?=https?:\/\/)/i.test(p)) return p.replace(/^\/+(?=https?:\/\/)/i, '');
    if (p.startsWith('/images/uploads/')) p = p.replace('/images/uploads/', '/uploads/');
    if (p.startsWith('/api/') || p.startsWith('/uploads/')) return (window.API_BASE||'') + p;
    return p;
  };

  // ============ fetch wrapper (/api/* -> backend + cookie + Bearer) ============
  const ORIG_FETCH = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    if (typeof input === 'string' && input.startsWith('/api/')) input = (window.API_BASE||'') + input;
    init.credentials = 'include';
    init.headers = init.headers || {};
    const t = sessionStorage.getItem('authToken');
    if (t && !('Authorization' in init.headers)) init.headers['Authorization'] = `Bearer ${t}`;
    return ORIG_FETCH(input, init);
  };

  window.captureTokenFromResponse = function (data) {
    if (data && data.token) sessionStorage.setItem('authToken', data.token);
  };
  window.apiURL = (path) => (path && path.startsWith('/api/') ? ((window.API_BASE||'') + path) : path);

  // ============ Theme ============
  (function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
  })();

  window.toggleTheme = function () {
    const isDark = document.documentElement.classList.contains('theme-dark');
    const next = isDark ? 'theme-light' : 'theme-dark';
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(next);
    localStorage.setItem('theme', next === 'theme-dark' ? 'dark' : 'light');
  };

  // ============ Navbar ============
  window.populateNavbar = async function () {
    const nameEl = document.getElementById('nav-username');
    const imgEl  = document.getElementById('nav-avatar');

    if (imgEl) {
      imgEl.src = '/images/user.png';
      imgEl.onerror = () => { imgEl.src = '/images/user.png'; };
    }
    try {
      const res = await fetch('/api/users/me');
      if (res.status === 401) { return; } // หน้า public ไม่ต้อง redirect
      const data = await res.json();
      if (nameEl) nameEl.textContent = data.username || data.email || 'User';
      if (imgEl) {
        let p = data.profilePicture || '/images/user.png';
        p = p.replace(/^\/+(?=https?:\/\/)/i, '');
        if (/^(https?:)?\/\//i.test(p)) imgEl.src = p;
        else if (p.startsWith('/api/') || p.startsWith('/uploads/')) imgEl.src = (window.API_BASE||'') + p;
        else if (p.startsWith('/images/')) imgEl.src = p;
        else imgEl.src = '/images/user.png';
      }
    } catch {}
  };

  // ============ Dropdown ============
  window.initDropdown = (function () {
    return function initDropdown() {
      const dd = document.querySelector('.dropdown');
      if (!dd || dd.dataset.init==='1') return;
      dd.dataset.init='1';
      const menu = dd.querySelector('.menu');
      dd.addEventListener('click', (e)=>{
        if (!e.target.closest('.menu')) dd.classList.toggle('open');
        e.stopPropagation();
      });
      document.addEventListener('click', (e)=>{ if (!dd.contains(e.target)) dd.classList.remove('open'); });
      document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') dd.classList.remove('open'); });
    };
  })();

  // ============ Logout ============
  window.handleLogout = async function () {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    sessionStorage.removeItem('authToken');
    location.href = '/login.html';
  };

  // ผูกปุ่ม Logout แบบรวมทุกหน้า (event delegation)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#logout-btn');
    if (btn) {
      e.preventDefault();
      if (typeof handleLogout === 'function') handleLogout();
    }
  });

  // ============ DOM Ready ============
  document.addEventListener('DOMContentLoaded', () => {
    autoRedirectIfLoggedIn();
    const img = document.getElementById('nav-avatar');
    if (img) {
      const raw = img.getAttribute('src') || '';
      if (/^\/+(?=https?:\/\/)/i.test(raw)) img.setAttribute('src', raw.replace(/^\/+(?=https?:\/\/)/i, ''));
      img.onerror = () => { img.src = '/images/user.png'; };
    }
  });
})();
