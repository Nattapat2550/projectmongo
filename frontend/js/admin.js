async function loadAdmin(){
  if (typeof populateNavbar === 'function') { try { await populateNavbar(); } catch {} }
  if (typeof initDropdown === 'function')   { try { initDropdown(); } catch {} }
  await renderUsers(); await renderHomepage(); await renderCarousel();
}
async function renderUsers(){
  const tbody = document.querySelector('#users-table tbody'); if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
  try{ const res = await fetch('/api/admin/users'); const users = await res.json();
    tbody.innerHTML = users.map(u=>`<tr data-id="${u._id||''}"><td>${escapeHtml(u.username||'')}</td><td>${escapeHtml(u.email||'')}</td><td><select class="role"><option value="user"${u.role==='user'?' selected':''}>user</option><option value="admin"${u.role==='admin'?' selected':''}>admin</option></select></td><td><button class="btn small" onclick="saveUser(this)">Save</button></td></tr>`).join('');
  }catch{ tbody.innerHTML = '<tr><td colspan="4">Error</td></tr>'; }
}
async function saveUser(btn){
  const tr = btn.closest('tr'); const id = tr.dataset.id; const role = tr.querySelector('.role').value;
  const name = tr.children[0].textContent.trim();
  await fetch(`/api/admin/users/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ role, username: name })});
  btn.textContent='Saved'; setTimeout(()=> btn.textContent='Save', 800);
}
async function renderHomepage(){
  const res = await fetch('/api/admin/homepage-content'); const data = await res.json();
  document.getElementById('home-body').value = data.body||'';
}
async function saveHomepage(){
  const body = document.getElementById('home-body').value;
  const res = await fetch('/api/admin/homepage-content', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ body })});
  document.getElementById('h-msg').textContent = res.ok ? 'Saved' : 'Error';
}
async function renderCarousel(){
  const res = await fetch('/api/admin/carousel'); const items = await res.json();
  const tbody = document.querySelector('#carousel-table tbody');
  tbody.innerHTML = items.map(it=>`<tr data-id="${it._id}"><td>${it.index}</td><td><img src="${buildAssetURL(it.imageUrl)}" style="width:96px;height:64px;object-fit:cover;border-radius:8px"></td><td>${escapeHtml(it.title||'')}</td><td>${escapeHtml(it.subtitle||'')}</td><td><input type="checkbox" class="c-active"${it.active?' checked':''}></td><td><button class="btn small" onclick="updateCarousel(this)">Update</button> <button class="btn small danger" onclick="delCarousel(this)">Delete</button></td></tr>`).join('');
}
async function createCarouselItem(){
  const idx = Number(document.getElementById('c-index').value||0);
  const title = document.getElementById('c-title').value||'';
  const subtitle = document.getElementById('c-subtitle').value||'';
  const desc = document.getElementById('c-desc').value||'';
  const active = document.getElementById('c-active').checked;
  const file = document.getElementById('c-image').files[0];
  let imageUrl = '';
  if (file) {
    // Upload via /api/users/settings/upload-picture to reuse upload handler (returns /uploads/...)
    const fd = new FormData(); fd.append('avatar', file);
    const up = await fetch('/api/users/settings/upload-picture', { method:'POST', body: fd });
    const data = await up.json(); if (!up.ok) throw new Error(data.message||'upload failed');
    imageUrl = data.profilePicture;
  } else {
    imageUrl = '/images/user.png';
  }
  const res = await fetch('/api/admin/carousel', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ index: idx, title, subtitle, description: desc, imageUrl, active })});
  document.getElementById('c-msg').textContent = res.ok ? 'Added' : 'Error';
  await renderCarousel();
}
async function updateCarousel(btn){
  const tr = btn.closest('tr'); const id = tr.dataset.id;
  const active = tr.querySelector('.c-active').checked;
  await fetch(`/api/admin/carousel/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ active })});
  btn.textContent='Updated'; setTimeout(()=> btn.textContent='Update', 800);
}
async function delCarousel(btn){
  const tr = btn.closest('tr'); const id = tr.dataset.id;
  await fetch(`/api/admin/carousel/${id}`, {method:'DELETE'});
  tr.remove();
}
function escapeHtml(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;').replaceAll(\"'\",'&#039;');}
