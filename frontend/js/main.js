(function () {
  const FRONTEND_HOST = 'https://projectmongo-1.onrender.com';
  const BACKEND_HOST  = 'https://projectmongo.onrender.com';
  const onFrontend = location.origin === FRONTEND_HOST;
  window.API_BASE = onFrontend ? BACKEND_HOST : '';

  function setToken(t){ if(!t)return; try{sessionStorage.setItem('authToken',t)}catch{} try{localStorage.setItem('authToken',t)}catch{} }
  function getToken(){ let t=null; try{t=sessionStorage.getItem('authToken')}catch{} if(!t){try{t=localStorage.getItem('authToken')}catch{}} return t||null; }
  function clearToken(){ try{sessionStorage.removeItem('authToken')}catch{} try{localStorage.removeItem('authToken')}catch{} }

  (function captureTokenFromURL(){
    let token=null; const m=(location.hash||'').match(/[#&]token=([^&]+)/);
    if(m) token=decodeURIComponent(m[1]);
    if(!token){ const qs=new URLSearchParams(location.search); if(qs.get('token')) token=qs.get('token'); }
    if(token){
      setToken(token);
      const cleanQS = location.search.replace(/([?&])token=[^&]+(&)?/,'$1').replace(/[?&]$/,'');
      history.replaceState({}, document.title, location.pathname + cleanQS);
    }
  })();

  function autoRedirectIfLoggedIn(){
    const path = location.pathname;
    const isIndex = path === '/' || path.endsWith('/index.html');
    if(!isIndex) return;
    const t = getToken();
    if(t){ location.replace('/home.html'); return; }
    (async()=>{ try{ const r=await fetch('/api/users/me'); if(r.ok) location.replace('/home.html'); }catch{} })();
  }

  window.buildAssetURL = function(p){
    if(!p) return '/images/user.png';
    if(/^(https?:)?\/\//i.test(p)) return p;
    if(/^\/+(?=https?:\/\/)/i.test(p)) return p.replace(/^\/+(?=https?:\/\/)/i,'');
    if(p.startsWith('/images/uploads/')) p = p.replace('/images/uploads/','/uploads/');
    if(p.startsWith('/api/') || p.startsWith('/uploads/')) return (window.API_BASE||'') + p;
    return p;
  };

  const ORIG_FETCH = window.fetch.bind(window);
  window.fetch = (input, init={})=>{
    if(typeof input==='string' && input.startsWith('/api/')) input=(window.API_BASE||'')+input;
    init.credentials='include';
    init.headers=init.headers||{};
    const t=getToken();
    if(t && !('Authorization' in init.headers)) init.headers['Authorization']=`Bearer ${t}`;
    return ORIG_FETCH(input, init);
  };

  window.captureTokenFromResponse = function(data){ if(data && data.token) setToken(data.token); };
  window.apiURL = (path)=> (path && path.startsWith('/api/') ? ((window.API_BASE||'')+path) : path);

  (function initTheme(){
    const saved=localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark':'light');
    document.documentElement.classList.remove('theme-light','theme-dark');
    document.documentElement.classList.add(theme==='dark'?'theme-dark':'theme-light');
  })();
  window.toggleTheme = function(){
    const isDark = document.documentElement.classList.contains('theme-dark');
    const next = isDark ? 'theme-light':'theme-dark';
    document.documentElement.classList.remove('theme-light','theme-dark');
    document.documentElement.classList.add(next);
    localStorage.setItem('theme', next==='theme-dark'?'dark':'light');
  };

  window.populateNavbar = async function(){
    const nameEl = document.getElementById('nav-username');
    const imgEl  = document.getElementById('nav-avatar');
    if(imgEl){ imgEl.src='/images/user.png'; imgEl.onerror=()=>{imgEl.src='/images/user.png'}; }
    try{
      const res = await fetch('/api/users/me');
      if(!res.ok) return;
      const data = await res.json();
      if(nameEl) nameEl.textContent = data.username || data.email || 'User';
      if(imgEl){
        let p = data.profilePicture || '/images/user.png';
        p = p.replace(/^\/+(?=https?:\/\/)/i,'');
        if(/^(https?:)?\/\//i.test(p)) imgEl.src=p;
        else if(p.startsWith('/api/') || p.startsWith('/uploads/')) imgEl.src=(window.API_BASE||'')+p;
        else if(p.startsWith('/images/')) imgEl.src=p;
        else imgEl.src='/images/user.png';
      }
    }catch{}
  };

  window.initDropdown = (function(){
    return function(){
      const dd=document.querySelector('.dropdown');
      if(!dd || dd.dataset.init==='1') return; dd.dataset.init='1';
      dd.addEventListener('click',(e)=>{ if(!e.target.closest('.menu')) dd.classList.toggle('open'); e.stopPropagation();});
      document.addEventListener('click',(e)=>{ if(!dd.contains(e.target)) dd.classList.remove('open'); });
      document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') dd.classList.remove('open'); });
    };
  })();

  window.handleLogout = async function(){
    try{ await fetch('/api/auth/logout',{method:'POST'});}catch{}
    try{ sessionStorage.removeItem('authToken'); localStorage.removeItem('authToken'); }catch{}
    location.href='/login.html';
  };
  document.addEventListener('click',(e)=>{ const btn=e.target.closest('#logout-btn'); if(btn){ e.preventDefault(); handleLogout(); } });

  document.addEventListener('DOMContentLoaded', ()=>{
    autoRedirectIfLoggedIn();
    const img=document.getElementById('nav-avatar');
    if(img){ const raw=img.getAttribute('src')||''; if(/^\/+(?=https?:\/\/)/i.test(raw)) img.setAttribute('src', raw.replace(/^\/+(?=https?:\/\/)/i,'')); img.onerror=()=>{img.src='/images/user.png'}; }
  });
})();
