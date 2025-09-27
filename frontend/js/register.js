document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const message = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage('Valid email required', 'error');
      return;
    }

    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (data.ok) {
        showMessage(data.message, 'success');
        localStorage.setItem('pendingEmail', email); // For check.html
        setTimeout(() => window.location.href = '/check.html', 1500);
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