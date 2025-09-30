async function loadAdmin(){
  try{ await populateNavbar(); }catch{} try{ initDropdown(); }catch{}
  await Promise.all([renderHomepage(), renderCarousel(), renderUsers()]);
}

/* Homepage body */
async function renderHomepage(){
  const ta=document.getElementById('home-body'); if(!ta) return;
  try{ const r=await fetch('/api/admin/homepage-content'); const d=await r.json(); ta.value=d.body||''; }catch{ ta.value=''; }
}
async function saveHomepage(){
  const ta=document.getElementById('home-body'); const msg=document.getElementById('h-msg');
  msg.textContent='Saving...';
  try{ const r=await fetch('/api/admin/homepage-content',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:ta.value||''})}); msg.textContent=r.ok?'Saved':'Error'; }catch{ msg.textContent='Error'; }
  setTimeout(()=>msg.textContent='',1200);
}

/* Users */
async function renderUsers(){
  const tbody=document.querySelector('#users-table tbody'); if(!tbody) return;
  tbody.innerHTML='<tr><td colspan="4">Loading...</td></tr>';
  try{
    const r=await fetch('/api/admin/users'); const users=await r.json();
    tbody.innerHTML = users.map(u=>`
      <tr data-id="${u._id}">
        <td contenteditable="true" class="username">${escapeHtml(u.username||'')}</td>
        <td>${escapeHtml(u.email||'')}</td>
        <td>
          <select class="role">
            <option value="user"${u.role==='user'?' selected':''}>user</option>
            <option value="admin"${u.role==='admin'?' selected':''}>admin</option>
          </select>
        </td>
        <td><button class="btn small" onclick="saveUser(this)">Save</button></td>
      </tr>
    `).join('');
  }catch{ tbody.innerHTML='<tr><td colspan="4">Error</td></tr>'; }
}
async function saveUser(btn){
  const tr=btn.closest('tr'); const id=tr.dataset.id; const role=tr.querySelector('.role').value; const username=tr.querySelector('.username').textContent.trim();
  btn.disabled=true;
  try{ const r=await fetch(`/api/admin/users/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({role,username})}); btn.textContent=r.ok?'Saved':'Error'; }catch{ btn.textContent='Error'; }
  setTimeout(()=>btn.textContent='Save',900); btn.disabled=false;
}

/* Carousel */
async function renderCarousel(){
  const tbody=document.querySelector('#carousel-table tbody'); if(!tbody) return;
  try{
    const r=await fetch('/api/admin/carousel'); const items=await r.json();
    tbody.innerHTML=(items||[]).map(it=>`
      <tr data-id="${it._id}">
        <td><input type="number" class="c-index" value="${Number(it.index)||0}" style="width:80px"></td>
        <td><img src="${buildAssetURL(it.imageUrl)}" style="width:96px;height:64px;object-fit:cover;border-radius:8px"></td>
        <td><input type="text" class="c-title" value="${escapeAttr(it.title||'')}" style="width:160px"></td>
        <td><input type="text" class="c-subtitle" value="${escapeAttr(it.subtitle||'')}" style="width:160px"></td>
        <td><input type="checkbox" class="c-active"${it.active?' checked':''}></td>
        <td style="min-width:240px">
          <button class="btn small" onclick="pickImage(this)">Image…</button>
          <button class="btn small" onclick="updateCarousel(this)">Update</button>
          <button class="btn small danger" onclick="delCarousel(this)">Delete</button>
        </td>
      </tr>
      <tr class="desc-row" data-id="${it._id}">
        <td colspan="6">
          <label style="display:block;margin:6px 0 6px">Description</label>
          <textarea class="c-desc" rows="2" style="width:100%">${escapeHtml(it.description||'')}</textarea>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6">No items</td></tr>';
  }catch{ tbody.innerHTML='<tr><td colspan="6">Error</td></tr>'; }
}
async function createCarouselItem(){
  const idxEl=document.getElementById('c-index'), titleEl=document.getElementById('c-title'), subEl=document.getElementById('c-subtitle'), descEl=document.getElementById('c-desc'), activeEl=document.getElementById('c-active'), fileEl=document.getElementById('c-image'), msg=document.getElementById('c-msg');
  const index=Number(idxEl.value||0), title=titleEl.value||'', subtitle=subEl.value||'', description=descEl.value||'', active=!!activeEl.checked;
  msg.textContent='Saving...';
  let imageUrl='/images/user.png'; const f=fileEl.files?.[0];
  if(f){ try{ const fd=new FormData(); fd.append('avatar',f); const up=await fetch('/api/users/settings/upload-picture',{method:'POST',body:fd}); const d=await up.json(); if(!up.ok) throw new Error(); imageUrl=d.profilePicture; }catch{ msg.textContent='Upload failed'; setTimeout(()=>msg.textContent='',1200); return; } }
  try{
    const r=await fetch('/api/admin/carousel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({index,title,subtitle,description,imageUrl,active})});
    if(!r.ok) throw new Error(); msg.textContent='Added'; await renderCarousel(); fileEl.value='';
  }catch{ msg.textContent='Error'; } finally{ setTimeout(()=>msg.textContent='',1200); }
}
async function pickImage(btn){
  const input=document.createElement('input'); input.type='file'; input.accept='image/*';
  input.addEventListener('change', async ()=>{
    if(!input.files?.[0]) return;
    const fd=new FormData(); fd.append('avatar', input.files[0]);
    try{
      const up=await fetch('/api/users/settings/upload-picture',{method:'POST',body:fd}); const d=await up.json();
      if(!up.ok) throw new Error();
      const tr=btn.closest('tr'); tr.querySelector('img').src=buildAssetURL(d.profilePicture);
      await updateCarousel(btn, d.profilePicture);
    }catch{}
  }); input.click();
}
async function updateCarousel(btn, forcedUrl){
  const tr=btn.closest('tr'); const id=tr.dataset.id;
  const idx=Number(tr.querySelector('.c-index').value||0);
  const title=tr.querySelector('.c-title').value||'';
  const subtitle=tr.querySelector('.c-subtitle').value||'';
  const active=tr.querySelector('.c-active').checked;
  const desc=tr.nextElementSibling?.querySelector('.c-desc')?.value||'';
  const body={ index:idx, title, subtitle, description:desc, active };
  if(forcedUrl) body.imageUrl=forcedUrl;
  btn.disabled=true;
  try{ const r=await fetch(`/api/admin/carousel/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); btn.textContent=r.ok?'Updated':'Error'; }catch{ btn.textContent='Error'; }
  setTimeout(()=>btn.textContent='Update',900); btn.disabled=false;
}
async function delCarousel(btn){
  const tr=btn.closest('tr'); const id=tr.dataset.id; btn.disabled=true;
  try{ await fetch(`/api/admin/carousel/${id}`,{method:'DELETE'}); const desc=tr.nextElementSibling; tr.remove(); if(desc?.classList.contains('desc-row')) desc.remove(); }catch{} btn.disabled=false;
}
function escapeHtml(s){ const map={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}; return String(s).replace(/[&<>"']/g,ch=>map[ch]); }
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }

window.loadAdmin=loadAdmin; window.saveHomepage=saveHomepage; window.createCarouselItem=createCarouselItem; window.updateCarousel=updateCarousel; window.delCarousel=delCarousel; window.pickImage=pickImage;
