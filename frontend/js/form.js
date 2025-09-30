document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('form-complete');
  const msg  = document.getElementById('msg');
  const pwWrap = document.getElementById('pw-wrap');
  const qs = new URLSearchParams(location.search);
  const fromGoogle = qs.get('source') === 'google';
  if(fromGoogle) pwWrap.style.display='none';

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    msg.textContent='Saving...';
    const payload = {
      username: document.getElementById('username').value.trim(),
      password: fromGoogle ? undefined : document.getElementById('password').value
    };
    const res = await fetch('/api/auth/complete-registration', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok){ msg.textContent = data.message || 'Failed'; return; }
    captureTokenFromResponse(data);
    location.href = data.role === 'admin' ? '/admin.html' : '/home.html';
  });
});
