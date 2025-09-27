document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-complete');
  const message = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      username: document.getElementById('username').value || null,
      theme: document.getElementById('theme').value
    };

    try {
      await apiCall('/auth/complete', { method: 'POST', body: JSON.stringify(data) });
      message.textContent = 'Profile completed! You can now login.';
      message.className = 'success';
      window.location.href = 'login.html';
    } catch (error) {
      message.textContent = error.message;
      message.className = 'error';
    }
  });
});