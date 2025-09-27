document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-form');
  const message = document.getElementById('message');
  const emailInput = document.getElementById('email');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirm-password');
  const hideCheckbox = document.getElementById('hide-password');

  // Prefill email from URL
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  if (email) emailInput.value = decodeURIComponent(email);

  // Password hide toggle
  hideCheckbox.addEventListener('change', () => {
    const type = hideCheckbox.checked ? 'password' : 'text';
    passwordInput.type = type;
    confirmInput.type = type;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (!username || username.length < 3 || username.length > 30) {
      showMessage('Username must be 3-30 characters', 'error');
      return;
    }
    if (password.length < 8 || password !== confirm) {
      showMessage('Password must be 8+ characters and match confirmation', 'error');
      return;
    }

    try {
      const data = await apiFetch('/api/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify({ email, username, password }),
      });
      if (data.ok && data.redirect) {
        showMessage('Profile completed! Redirecting...', 'success');
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