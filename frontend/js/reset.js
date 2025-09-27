document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reset-form');
  const message = document.getElementById('message');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirm-password');
  const hideCheckbox = document.getElementById('hide-password');

  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (!token) {
    showMessage('Invalid reset link', 'error');
    return;
  }

  // Password hide toggle
  hideCheckbox.addEventListener('change', () => {
    const type = hideCheckbox.checked ? 'password' : 'text';
    passwordInput.type = type;
    confirmInput.type = type;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (password.length < 8 || password !== confirm) {
      showMessage('Password must be 8+ characters and match', 'error');
      return;
    }

    try {
      const data = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      if (data.ok && data.redirect) {
        showMessage('Password reset! Redirecting...', 'success');
        window.location.href = data.redirect;
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
  });

  const showMessage = (msg, type) => {
    message.textContent = msg;
    message.className = type;
  };
});