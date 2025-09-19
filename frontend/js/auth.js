// Redirect to home if already logged in
if (localStorage.getItem('token')) {
  window.location.href = 'index.html';
}

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const errorMsg = document.getElementById('error-msg');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const res = await fetch('https://projectmongo.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      localStorage.setItem('token', data.token);
      window.location.href = 'index.html';
    } catch (err) {
      errorMsg.textContent = err.message;
    }
  });

  // Google login button
  const googleBtn = document.getElementById('google-login-btn');
  googleBtn.addEventListener('click', () => {
    window.location.href = 'https://projectmongo.onrender.com/api/auth/google';
  });

  // Handle Google OAuth redirect with token
  const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('token')) {
  const token = urlParams.get('token');
  localStorage.setItem('token', token);
  window.history.replaceState({}, document.title, 'login.html'); // Clean URL
  window.location.href = 'index.html';
}
// Redirect to home if already logged in
if (localStorage.getItem('token')) {
  window.location.href = 'index.html';
}
}

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const res = await fetch('https://projectmongo.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      localStorage.setItem('token', data.token);
      window.location.href = 'index.html';
    } catch (err) {
      errorMsg.textContent = err.message;
    }
  });
}