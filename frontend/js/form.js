document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('form-complete');
  const msg = document.getElementById('msg');
  const qs = new URLSearchParams(location.search);
  const isGoogle = (qs.get('source')==='google');
  if (isGoogle) document.getElementById('pw-wrap').style.display='none';
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = isGoogle ? undefined : document.getElementById('password').value;
    try{
      const res = await fetch('/api/auth/complete-registration', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username, password})});
      const data = await res.json();
      if(!res.ok) throw new Error(data.message||'Failed');
      window.captureTokenFromResponse && window.captureTokenFromResponse(data);
      location.href = data.role==='admin' ? '/admin.html' : '/home.html';
    }catch(err){ msg.textContent = err.message||'Error'; }
  });
});