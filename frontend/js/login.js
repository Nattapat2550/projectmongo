document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('login-form');
  const msg  = document.getElementById('msg');
  const showPw = document.getElementById('show-pw');
  const remember = document.getElementById('remember');
  const btnGoogle = document.getElementById('btn-google');

  showPw.addEventListener('change', ()=>{
    const pw = document.getElementById('password');
    pw.type = showPw.checked ? 'text' : 'password';
  });

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    msg.textContent='Signing in...';
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const res = await fetch('/api/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password, rememberMe: !!remember.checked })
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok){ msg.textContent=data.message||'Login failed'; return; }
    captureTokenFromResponse(data);
    location.href = data.role === 'admin' ? '/admin.html' : '/home.html';
  });

  btnGoogle.addEventListener('click', ()=>{
    location.href = window.apiURL('/api/auth/google');
  });
});
