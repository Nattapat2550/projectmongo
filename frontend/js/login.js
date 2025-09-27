document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const message = document.getElementById('message');
  const passwordInput = document.getElementById('password');
  const hideCheckbox = document.getElementById('hide-password');
  const googleBtn = document.getElementById('google-login');

  // Password hide toggle
  hideCheckbox.addEventListener('change', () => {
    passwordInput.type = hideCheckbox.checked ? 'password' : 'text';
  });

  // Google login
  googleBtn.addEventListener('click', () => {
    window.location.href = `${SERVER_URL}/api/auth/google`;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;
    const remember = document.getElementById('remember').checked;

    if (!email || !password) {
      showMessage('Email and password required', 'error');
      return;
    }

    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, remember }),
      });
      if (data.ok && data.redirect) {
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