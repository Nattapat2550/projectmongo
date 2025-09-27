document.addEventListener('DOMContentLoaded', () => {
  const usersList = document.getElementById('users-list');
  const form = document.getElementById('homepage-form');

  // Load users
  apiCall('/admin/users')
    .then(users => {
      usersList.innerHTML = users.map(user => `
        <div class="user-item">
          <span>${user.email} (${user.role})</span>
          <button onclick="deleteUser ('${user._id}')">Delete</button>
        </div>
      `).join('');
    })
    .catch(() => window.location.href = 'home.html'); // Not admin

  // Update homepage content
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById('title').value,
      body: document.getElementById('body').value,
      metadata: {} // Add if needed
    };

    try {
      await apiCall(`/admin/homepage/${document.getElementById('slug').value}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      alert('Content updated!');
    } catch (error) {
      alert(error.message);
    }
  });
});

// Global delete function (for buttons)
window.deleteUser  = async (id) => {
  if (confirm('Delete user?')) {
    try {
      await apiCall(`/admin/users/${id}`, { method: 'DELETE' });
      location.reload();
    } catch (error) {
      alert(error.message);
    }
  }
};