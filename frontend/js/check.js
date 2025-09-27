document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('check-form');
  const message = document.getElementById('message');
  const emailInput = document.getElementById('email');
  const codeInput = document.getElementById('code');

  // Prefill email
  const pendingEmail = localStorage.getItem('pendingEmail') || new URLSearchParams(window.location.search).get('email');
  if (pendingEmail) {
    emailInput.value = pendingEmail;
    localStorage.removeItem('pendingEmail');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const code = codeInput.value.trim();
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      showMessage('Enter a valid 6-digit code', 'error');
      return;
    }

    try {
      const data = await apiFetch('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      if (data.ok && data.redirect) {
        showMessage('Verified! Redirecting...', 'success');
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