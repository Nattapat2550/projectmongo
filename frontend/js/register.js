document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const message = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
      username: document.getElementById('username').value || null
    };

    try {
      await apiCall('/auth/register', { method: 'POST', body: JSON.stringify(data) });
      message.textContent = 'Registration successful! Check your email for verification code.';
      message.className = 'success';
      window.location.href = 'check.html';
    } catch (error) {
      message.textContent = error.message;
      message.className = 'error';
    }
  });
});