// /frontend/js/admin.js

// Entry
async function loadAdmin() {
  if (typeof populateNavbar === 'function') { try { await populateNavbar(); } catch {} }
  if (typeof initDropdown === 'function')   { try { initDropdown(); } catch {} }
  await Promise.all([renderUsers(), renderHomepage(), renderCarousel()]);
}

// =============== Users =================
async function renderUsers() {
  const tbody = document.querySelector('#users-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) throw new Error('failed');
    const users = await res.json();
    tbody.innerHTML = users.map(u => `
      <tr data-id="${u._id || ''}">
        <td contenteditable="true" class="username">${escapeHtml(u.username || '')}</td>
        <td>${escapeHtml(u.email || '')}</td>
        <td>
          <select class="role">
            <option value="user"${u.role === 'user' ? ' selected' : ''}>user</option>
            <option value="admin"${u.role === 'admin' ? ' selected' : ''}>admin</option>
          </select>
        </td>
        <td>
          <button class="btn small" onclick="saveUser(this)">Save</button>
        </td>
      </tr>
    `).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="4">Error loading users</td></tr>';
  }
}

async function saveUser(btn) {
  const tr = btn.closest('tr');
  const id = tr.dataset.id;
  const role = tr.querySelector('.role').value;
  const username = tr.querySelector('.username').textContent.trim();
  btn.disabled = true;
  try {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, username })
    });
    if (!res.ok) throw new Error('update failed');
    btn.textContent = 'Saved';
    setTimeout(() => (btn.textContent = 'Save'), 900);
  } catch (e) {
    btn.textContent = 'Error';
    setTimeout(() => (btn.textContent = 'Save'), 1200);
  } finally {
    btn.disabled = false;
  }
}

// =============== Homepage content =================
async function renderHomepage() {
  const ta = document.getElementById('home-body');
  if (!ta) return;
  try {
    const res = await fetch('/api/admin/homepage-content');
    const data = await res.json();
    ta.value = data.body || '';
  } catch {
    ta.value = '';
  }
}

async function saveHomepage() {
  const ta = document.getElementById('home-body');
  const msg = document.getElementById('h-msg');
  if (!ta) return;
  msg.textContent = 'Saving...';
  try {
    const res = await fetch('/api/admin/homepage-content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: ta.value || '' })
    });
    msg.textContent = res.ok ? 'Saved' : 'Error';
  } catch {
    msg.textContent = 'Error';
  } finally {
    setTimeout(() => (msg.textContent = ''), 1500);
  }
}

// =============== Carousel =================
async function renderCarousel() {
  const res = await fetch('/api/admin/carousel');
  const items = await res.json();
  const tbody = document.querySelector('#carousel-table tbody');
  if (!tbody) return;
  tbody.innerHTML = (items || []).map(it => `
    <tr data-id="${it._id}">
      <td><input type="number" class="c-index" value="${Number(it.index) || 0}" style="width:80px"></td>
      <td>
        <img src="${buildAssetURL(it.imageUrl)}" style="width:96px;height:64px;object-fit:cover;border-radius:8px">
      </td>
      <td><input type="text" class="c-title" value="${escapeAttr(it.title || '')}" style="width:160px"></td>
      <td><input type="text" class="c-subtitle" value="${escapeAttr(it.subtitle || '')}" style="width:160px"></td>
      <td><input type="checkbox" class="c-active"${it.active ? ' checked' : ''}></td>
      <td style="min-width:240px">
        <button class="btn small" onclick="pickImage(this)">Image…</button>
        <button class="btn small" onclick="updateCarousel(this)">Update</button>
        <button class="btn small danger" onclick="delCarousel(this)">Delete</button>
      </td>
    </tr>
    <tr class="desc-row" data-id="${it._id}">
      <td colspan="6">
        <label style="display:block;margin:6px 0 6px">Description</label>
        <textarea class="c-desc" rows="2" style="width:100%">${escapeHtml(it.description || '')}</textarea>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6">No items</td></tr>';
}

async function createCarouselItem() {
  const idxEl = document.getElementById('c-index');
  const titleEl = document.getElementById('c-title');
  const subEl = document.getElementById('c-subtitle');
  const descEl = document.getElementById('c-desc');
  const activeEl = document.getElementById('c-active');
  const fileEl = document.getElementById('c-image');
  const msg = document.getElementById('c-msg');

  const index = Number(idxEl.value || 0);
  const title = titleEl.value || '';
  const subtitle = subEl.value || '';
  const description = descEl.value || '';
  const active = !!activeEl.checked;

  msg.textContent = 'Saving...';

  // อัพโหลดรูป (reuse endpoint อวตาร)
  let imageUrl = '/images/user.png';
  const file = fileEl.files[0];
  if (file) {
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const up = await fetch('/api/users/settings/upload-picture', { method: 'POST', body: fd });
      const data = await up.json();
      if (!up.ok) throw new Error(data.message || 'upload failed');
      imageUrl = data.profilePicture;
    } catch (e) {
      msg.textContent = 'Upload failed';
      setTimeout(() => (msg.textContent = ''), 1500);
      return;
    }
  }

  try {
    const res = await fetch('/api/admin/carousel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, title, subtitle, description, imageUrl, active })
    });
    if (!res.ok) throw new Error('create failed');
    msg.textContent = 'Added';
    await renderCarousel();
    // reset form
    fileEl.value = '';
  } catch {
    msg.textContent = 'Error';
  } finally {
    setTimeout(() => (msg.textContent = ''), 1500);
  }
}

async function pickImage(btn) {
  // เปิด file input ชั่วคราวเพื่ออัปโหลด แล้วอัปเดตแถวนี้
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async () => {
    if (!input.files || !input.files[0]) return;
    const fd = new FormData();
    fd.append('avatar', input.files[0]);
    try {
      const up = await fetch('/api/users/settings/upload-picture', { method: 'POST', body: fd });
      const data = await up.json();
      if (!up.ok) throw new Error(data.message || 'upload failed');
      // set preview
      const tr = btn.closest('tr');
      const img = tr.querySelector('img');
      img.src = buildAssetURL(data.profilePicture);
      // update row immediately
      await updateCarousel(btn, data.profilePicture);
    } catch {
      // ignore
    }
  });
  input.click();
}

async function updateCarousel(btn, forcedImageUrl) {
  const tr = btn.closest('tr');
  const id = tr.dataset.id;

  const idx = Number(tr.querySelector('.c-index').value || 0);
  const title = tr.querySelector('.c-title').value || '';
  const subtitle = tr.querySelector('.c-subtitle').value || '';
  const active = tr.querySelector('.c-active').checked;

  // desc อยู่ในแถวถัดไป
  const descRow = tr.nextElementSibling;
  const description = descRow?.querySelector('.c-desc')?.value || '';

  const body = { index: idx, title, subtitle, description, active };
  if (forcedImageUrl) body.imageUrl = forcedImageUrl;

  btn.disabled = true;
  try {
    const res = await fetch(`/api/admin/carousel/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('update failed');
    btn.textContent = 'Updated';
    setTimeout(() => (btn.textContent = 'Update'), 900);
  } catch {
    btn.textContent = 'Error';
    setTimeout(() => (btn.textContent = 'Update'), 1200);
  } finally {
    btn.disabled = false;
  }
}

async function delCarousel(btn) {
  const tr = btn.closest('tr');
  const id = tr.dataset.id;
  btn.disabled = true;
  try {
    await fetch(`/api/admin/carousel/${id}`, { method: 'DELETE' });
    // remove row + desc row
    const descRow = tr.nextElementSibling;
    tr.remove();
    if (descRow?.classList.contains('desc-row')) descRow.remove();
  } catch {
    // ignore
  } finally {
    btn.disabled = false;
  }
}

// ========= helpers =========
function escapeHtml(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(s).replace(/[&<>"']/g, ch => map[ch]);
}
function escapeAttr(s) {
  // ใช้กับ value="" ใน input
  return escapeHtml(s).replace(/"/g, '&quot;');
}

// expose
window.loadAdmin = loadAdmin;
window.saveHomepage = saveHomepage;
window.createCarouselItem = createCarouselItem;
window.updateCarousel = updateCarousel;
window.delCarousel = delCarousel;
window.pickImage = pickImage;
