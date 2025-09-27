document.addEventListener('DOMContentLoaded', async () => {
  const contentForm = document.getElementById('content-form');
  const titleInput = document.getElementById('title');
  const heroInput = document.getElementById('hero');
  const blocksInput = document.getElementById('blocks');
  const usersTableBody = document.querySelector('#users-table tbody');
  const pagination = document.getElementById('pagination');
  const exportBtn = document.getElementById('export-users');
  const messageEl = document.getElementById('message');

  let currentUser  = null;
  let currentPage = 1;
  const limit = 10;

  // Check admin
  try {
    currentUser  = await getCurrentUser ();
    if (!currentUser  || currentUser .role !== 'admin') {
      window.location.href = '/home.html';
      return;
    }
  } catch (err) {
    showMessage('Access denied', 'error');
    window.location.href = '/login.html';
    return;
  }

  // Load homepage content
  try {
    const data = await apiFetch('/api/homepage/content');
    if (data.ok && data.data) {
      titleInput.value = data.data.title;
      heroInput.value = data.data.hero;
      blocksInput.value = JSON.stringify(data.data.blocks, null, 2);
    }
  } catch (err) {
    showMessage('Failed to load content', 'error');
  }

  // Update content
  contentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let blocks = [];
    try {
      blocks = JSON.parse(blocksInput.value || '[]');
      if (!Array.isArray(blocks)) throw new Error('Invalid blocks');
    } catch (err) {
      showMessage('Blocks must be a valid JSON array', 'error');
      return;
    }

    try {
      const data = await apiFetch('/api/homepage/content', {
        method: 'PUT',
        body: JSON.stringify({
          title: titleInput.value.trim(),
          hero: heroInput.value.trim(),
          blocks,
        }),
      });
      if (data.ok) showMessage('Content updated!', 'success');
    } catch (err) {
      showMessage(err.message, 'error');
    }
  });

  // Load users
  const loadUsers = async (page = 1) => {
    try {
      const data = await apiFetch(`/api/admin/users?page=${page}&limit=${limit}`);
      if (data.ok && data.data) {
        usersTableBody.innerHTML = '';
        data.data.users.forEach(user => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${user.username || 'N/A'}</td>
            <td>${user.email}</td>
            <td>
              <select class="role-select" data-id="${user._id}">
                <option value="user" ${user.role === 'user' ? 'selected' : ''}>User </option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </td>
            <td>
              <button class="delete-user" data-id="${user._id}">Delete</button>
            </td>
          `;
          usersTableBody.appendChild(row);
        });

        // Role change auto-save
        document.querySelectorAll('.role-select').forEach(select => {
          select.addEventListener('change', async (e) => {
            const id = e.target.dataset.id;
            const role = e.target.value;
            try {
              const updateData = await apiFetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ role }),
              });
              if (updateData.ok) showMessage('Role updated', 'success');
            } catch (err) {
              showMessage(err.message, 'error');
              e.target.value = currentUser .role; // Revert
            }
          });
        });

        // Delete buttons
        document.querySelectorAll('.delete-user').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (!confirm(`Delete user ${id}?`)) return;
            try {
              const deleteData = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
              if (deleteData.ok) {
                e.target.closest('tr').remove();
                showMessage('User  deleted', 'success');
              }
            } catch (err) {
              showMessage(err.message, 'error');
            }
          });
        });

        // Pagination
        pagination.innerHTML = '';
        const { pages, total } = data.data.pagination;
        for (let i = 1; i <= pages; i++) {
          const btn = document.createElement('button');
          btn.textContent = i;
          btn.disabled = i === page;
          btn.addEventListener('click', () => {
            currentPage = i;
            loadUsers(i);
          });
          pagination.appendChild(btn);
        }
      }
    } catch (err) {
      showMessage('Failed to load users', 'error');
    }
  };
  loadUsers();

  // Export users
  exportBtn.addEventListener('click', async () => {
    try {
      const data = await apiFetch('/api/admin/export-users');
      if (data.ok && data.data) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users.json';
        a.click();
        URL.revokeObjectURL(url);
        showMessage('Users exported', 'success');
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
  });

  const showMessage = (msg, type) => {
    messageEl.textContent = msg;
    messageEl.className = type;
  };
});