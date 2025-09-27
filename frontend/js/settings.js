document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');

  // Load current settings
  apiCall('/users/profile')
    .then(user => {
      document.getElementById('theme').value = user.theme;
    });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('profile-pic-upload');
    const formData = new FormData();
    if (fileInput.files[0]) {
      formData.append('profilePicture', fileInput.files[0]);
    }
    formData.append('theme', document.getElementById('theme').value);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        body: formData,
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const user = await response.json();
      saveTheme(user.theme);
      alert('Settings updated!');
    } catch (error) {
      alert(error.message);
    }
  });
});