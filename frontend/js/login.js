document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('login-form');
  const msg = document.getElementById('msg');
  const btnGoogle = document.getElementById('btn-google');
  const showPw = document.getElementById('show-pw');
  showPw.addEventListener('change', ()=>{
    const pw = document.getElementById('password');
    pw.type = showPw.checked ? 'text' : 'password';
  });
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember').checked;
    try{
      const res = await fetch('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password,rememberMe})});
      const data = await res.json();
      if(!res.ok) throw new Error(data.message||'Failed');
      window.captureTokenFromResponse && window.captureTokenFromResponse(data);
      location.href = data.role==='admin' ? '/admin.html' : '/home.html';
    }catch(err){ msg.textContent = err.message||'Error'; }
  });
  btnGoogle.addEventListener('click', ()=>{
    location.href = (window.API_BASE||'') + '/api/auth/google';
  });
});