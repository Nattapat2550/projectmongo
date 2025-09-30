document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('check-form');
  const msg = document.getElementById('msg');
  const qs = new URLSearchParams(location.search);
  const email = qs.get('email')||'';
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const code = document.getElementById('code').value.trim();
    try{
      const res = await fetch('/api/auth/verify-email', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email, verificationCode: code})});
      const data = await res.json();
      if(!res.ok) throw new Error(data.message||'Failed');
      window.captureTokenFromResponse && window.captureTokenFromResponse(data);
      location.href = '/form.html';
    }catch(err){ msg.textContent = err.message||'Error'; }
  });
});