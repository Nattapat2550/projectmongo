document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('check-form');
  const msg  = document.getElementById('msg');
  const qs = new URLSearchParams(location.search);
  const email = qs.get('email');

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const verificationCode = document.getElementById('code').value.trim();
    msg.textContent='Verifying...';
    const res = await fetch('/api/auth/verify-email', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, verificationCode })
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok){ msg.textContent = data.message || 'Invalid code'; return; }
    captureTokenFromResponse(data);
    location.href = '/form.html';
  });
});
