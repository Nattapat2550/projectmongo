document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('reset-form');
  const msg = document.getElementById('msg');
  const qs = new URLSearchParams(location.search);
  const token = qs.get('token');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    try{
      const res = await fetch('/api/auth/reset-password', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token,newPassword,confirmPassword})});
      const data = await res.json();
      if(!res.ok) throw new Error(data.message||'Failed');
      msg.textContent = 'เปลี่ยนรหัสผ่านสำเร็จ';
      setTimeout(()=> location.href='/login.html', 900);
    }catch(err){ msg.textContent = err.message||'Error'; }
  });
});