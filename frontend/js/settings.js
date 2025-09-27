document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settings-form');
  const messageEl = document.getElementById('message');
  const usernameInput = document.getElementById('username');
  const photoInput = document.getElementById('photo');
  const photoPreview = document.getElementById('photo-preview');
  const changePasswordBtn = document.getElementById('change-password-btn');
  const deleteBtn = document.getElementById('delete-account-btn');

  let currentUser  = null;

  try {
    currentUser  = await getCurrentUser ();
    if (!currentUser ) {
      window.location.href = '/login.html';
      return;
    }
    usernameInput.value = currentUser .username || '';
    photoPreview.src = currentUser .photo || '/images/user.png';
    photoPreview.style.display = 'block';
  } catch (err) {
    showMessage('Failed to load profile', 'error');
  }

  // Photo preview on select
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => photoPreview.src = ev.target.result;
      reader.readAsDataURL(file);
      photoPreview.style.display = 'block';
    }
  });

  // Update profile
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (username && (username.length < 3 || username.length > 30)) {
      showMessage('Username must be 3-30 characters', 'error');
      return;
    }

    const formData = new FormData();
    if (username) formData.append('username', username);
    if (photoInput.files[0]) formData.append('photo', photoInput.files[0]);

    try {
      const options = {
        method: 'PUT',
        body: formData,
      };
      delete options.headers; // Let FormData set multipart
      const data = await fetch(`${SERVER_URL}/api/users/me`, options).then(res => res.json());
      if (data.ok) {
        showMessage('Profile updated!', 'success');
        // Refresh user
        currentUser  = data.data;
        photoPreview.src = currentUser .photo;
      } else {
        showMessage(data.message || 'Update failed', 'error');
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
  });

  // Change password (simple prompt for demo; in prod, use modal)
  changePasswordBtn.addEventListener('click', async () => {
    const oldPass = prompt('Enter old password:');
    if (!oldPass) return;
    const newPass = prompt('Enter new password (8+ chars):');
    if (!newPass || newPass.length < 8) {
      showMessage('Invalid new password', 'error');
      return;
    }
    const confirmPass = prompt('Confirm new password:');
    if (newPass !== confirmPass) {
      showMessage('Passwords do not match', 'error');
      return;
    }

    try {
      const data = await apiFetch('/api/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
      });
      if (data.ok) {
        showMessage('Password changed!', 'success');
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
  });

  // Delete account
  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure? This deletes your account permanently.')) return;
    try {
      const data = await apiFetch('/api/users/me', { method: 'DELETE' });
      if (data.ok) {
        showMessage('Account deleted. Redirecting...', 'success');
        window.location.href = '/index.html';
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