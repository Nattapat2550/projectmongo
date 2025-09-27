document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('check-form');
  const message = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      email: document.getElementById('email').value,
      code: document.getElementById('code').value
    };

    try {
      await apiCall('/auth/verify', { method: 'POST', body: JSON.stringify(data) });
      message.textContent = 'Email verified! Complete your profile.';
      message.className = 'success';
      window.location.href = 'form.html';
    } catch (error) {
      message.textContent = error.message;
      message.className = 'error';
    }
  });
});