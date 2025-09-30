document.addEventListener('DOMContentLoaded', ()=>{
  try{ populateNavbar(); }catch{}
  try{ initDropdown(); }catch{}

  const nameInput = document.getElementById('set-username');
  const upBtn = document.getElementById('btn-upload');
  const svBtn = document.getElementById('btn-save-username');
  const delBtn= document.getElementById('btn-delete');
  const msg   = document.getElementById('up-msg');

  // preload current name
  (async()=>{
    try{ const r=await fetch('/api/users/me'); if(!r.ok) return; const u=await r.json(); if(nameInput) nameInput.value=u.username||''; }catch{}
  })();

  svBtn?.addEventListener('click', async ()=>{
    const username = nameInput.value.trim();
    msg.textContent='Saving...';
    const r=await fetch('/api/users/settings',{ method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username }) });
    const data=await r.json().catch(()=>({})); msg.textContent = r.ok ? 'Saved' : (data.message||'Error'); setTimeout(()=>msg.textContent='',1200);
  });

  upBtn?.addEventListener('click', async ()=>{
    const file = document.getElementById('set-avatar').files?.[0];
    if(!file){ msg.textContent='Choose a file'; setTimeout(()=>msg.textContent='',1200); return; }
    const fd=new FormData(); fd.append('avatar', file);
    msg.textContent='Uploading...';
    const r=await fetch('/api/users/settings/upload-picture',{ method:'POST', body: fd });
    const data=await r.json().catch(()=>({}));
    msg.textContent = r.ok ? 'Uploaded' : (data.message||'Error');
    if(r.ok){ try{ populateNavbar(); }catch{} }
    setTimeout(()=>msg.textContent='',1200);
  });

  delBtn?.addEventListener('click', async ()=>{
    if(!confirm('Delete account? This cannot be undone.')) return;
    const r=await fetch('/api/users/account',{method:'DELETE'});
    if(r.ok){ alert('Account deleted'); handleLogout(); }
  });
});
