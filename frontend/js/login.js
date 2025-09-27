document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const message = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value
    };

    try {
      const response = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify(data) });
      setToken(response.token);
      window.location.href = 'home.html';
    } catch (error) {
      message.textContent = error.message;
      message.className = 'error';
    }
  });
});