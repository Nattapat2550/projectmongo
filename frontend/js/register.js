document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('register-form');
  const msg  = document.getElementById('msg');
  const btnGoogle = document.getElementById('btn-google');

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    msg.textContent='Processing...';
    const email = document.getElementById('email').value.trim();
    const res = await fetch('/api/auth/register', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email })
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok){ msg.textContent = data.message || 'Failed'; return; }
    location.href = '/check.html?email=' + encodeURIComponent(email);
  });

  btnGoogle.addEventListener('click', ()=>{
    location.href = window.apiURL('/api/auth/google');
  });
});
