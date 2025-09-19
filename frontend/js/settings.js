// Redirect to login if not logged in
if (!localStorage.getItem('token')) {
  window.location.href = 'login.html';
}

const nameForm = document.getElementById('edit-name-form');
const pictureForm = document.getElementById('upload-picture-form');
const toggleThemeBtn = document.getElementById('toggle-theme-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');

const nameMsg = document.getElementById('name-msg');
const pictureMsg = document.getElementById('picture-msg');
const deleteMsg = document.getElementById('delete-msg');

async function fetchUserProfile() {
  try {
    const res = await fetch('https://projectmongo.onrender.com/api/user/profile', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return await res.json();
  } catch {
    return null;
  }
}

async function updateName(username) {
  try {
    const res = await fetch('https://projectmongo.onrender.com/api/user/update-name', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update name');
    return data;
  } catch (err) {
    throw err;
  }
}

async function uploadProfilePicture(file) {
  const formData = new FormData();
  formData.append('profilePicture', file);

  try {
    const res = await fetch('https://projectmongo.onrender.com/api/user/upload-profile-picture', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to upload picture');
    return data;
  } catch (err) {
    throw err;
  }
}

async function deleteAccount() {
  try {
    const res = await fetch('https://projectmongo.onrender.com/api/user/delete-account', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete account');
    return data;
  } catch (err) {
    throw err;
  }
}

// Load current username into input
(async () => {
  const user = await fetchUserProfile();
  if (user) {
    document.getElementById('new-username').value = user.username || '';
  }
})();

nameForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  nameMsg.textContent = '';
  const newUsername = document.getElementById('new-username').value.trim();
  if (!newUsername) {
    nameMsg.textContent = 'Username cannot be empty';
    return;
  }
  try {
    await updateName(newUsername);
    nameMsg.textContent = 'Username updated successfully';
  } catch (err) {
    nameMsg.textContent = err.message;
  }
});

pictureForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  pictureMsg.textContent = '';
  const fileInput = document.getElementById('profile-picture');
  if (fileInput.files.length === 0) {
    pictureMsg.textContent = 'Please select a picture';
    return;
  }
  const file = fileInput.files[0];
  try {
    await uploadProfilePicture(file);
    pictureMsg.textContent = 'Profile picture updated. Reload page to see changes.';
  } catch (err) {
    pictureMsg.textContent = err.message;
  }
});

toggleThemeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  // Save preference
  if (document.body.classList.contains('dark')) {
    localStorage.setItem('theme', 'dark');
  } else {
    localStorage.setItem('theme', 'light');
  }
});

// Load theme preference
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

deleteAccountBtn.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
  deleteMsg.textContent = '';
  try {
    await deleteAccount();
    localStorage.removeItem('token');
    alert('Account deleted successfully');
    window.location.href = 'register.html';
  } catch (err) {
    deleteMsg.textContent = err.message;
  }
});