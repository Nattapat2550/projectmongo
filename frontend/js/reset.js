document.addEventListener('DOMContentLoaded', () => {
  const forgotForm = document.getElementById('forgot-form');
  const resetForm = document.getElementById('reset-form');
  const message = document.getElementById('message');

  // Check for token in URL (after email click)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    forgotForm.style.display = 'none';
    resetForm.style.display = 'block';
    resetForm.querySelector('input[name="token"]').value = token; // Hidden input if needed
  }

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = { email: document.getElementById('email').value };

    try {
      await apiCall('/auth/forgot', { method: 'POST', body: JSON.stringify(data) });
      message.textContent = 'Reset link sent to your email.';
      message.className = 'success';
    } catch (error) {
      message.textContent = error.message;
      message.className = 'error';
    }
  });

  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      token,
      password: document.getElementById('new-password').value
    };

    try {
      await apiCall('/auth/reset', { method: 'POST', body: JSON.stringify(data) });
      message.textContent = 'Password reset successful! Login now.';
      message.className = 'success';
      window.location.href = 'login.html';
    } catch (error) {
      message.textContent = error.message;
      message.className = 'error';
    }
  });
});