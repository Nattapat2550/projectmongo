document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('register-form');
  const msg = document.getElementById('msg');
  const btnGoogle = document.getElementById('btn-google');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    msg.textContent = 'Processing...';
    const email = document.getElementById('email').value.trim();
    try{
      const res = await fetch('/api/auth/register',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email})});
      const data = await res.json();
      if(!res.ok) throw new Error(data.message||'Failed');
      location.href = `/check.html?email=${encodeURIComponent(email)}`;
    }catch(err){ msg.textContent = err.message||'Error'; }
  });
  btnGoogle.addEventListener('click', ()=>{
    location.href = (window.API_BASE||'') + '/api/auth/google';
  });
});