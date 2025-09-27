// Common utilities
const SERVER_URL = 'https://projectmongo.onrender.com'; // Override with env if needed; for prod use window.location.origin or env
         const apiFetch = async (path, options = {}) => {
           const url = `${SERVER_URL}${path}`; // SERVER_URL = 'https://projectmongo.onrender.com' for prod
           const defaults = {
             headers: { 'Content-Type': 'application/json' },
             credentials: 'include', // Sends cookies for auth
           };
           try {
             const response = await fetch(url, { ...defaults, ...options });
             if (!response.ok) {
               const errorData = await response.json().catch(() => ({})); // Handle non-JSON errors
               if (response.status === 401) {
                 // Graceful: Clear cache on auth fail
                 localStorage.removeItem('userCache');
                 currentUser  = null;
                 throw new Error('Unauthorized - please log in'); // Or return null below
               }
               throw new Error(errorData.message || `HTTP ${response.status}`);
             }
             return response.json();
           } catch (err) {
             console.error('API Fetch Error:', err); // Log but don't crash UI
             throw err;
           }
         };

// Get current user (caches briefly in localStorage)
let currentUser  = null;
const getCurrentUser  = async () => {
           if (currentUser ) return currentUser ;
           try {
             const data = await apiFetch('/api/users/me');
             if (data.ok) {
               currentUser  = data.data;
               localStorage.setItem('userCache', JSON.stringify({ ...data.data, timestamp: Date.now() }));
               return data.data;
             }
           } catch (err) {
             if (err.message.includes('Unauthorized')) {
               console.log('No user session - showing login UI');
               return null; // Graceful: No user, hide profile
             }
             console.error('Failed to get user:', err);
           }
           // Clear expired cache
           const cached = localStorage.getItem('userCache');
           if (cached) {
             const { timestamp } = JSON.parse(cached);
             if (Date.now() - timestamp > 5 * 60 * 1000) localStorage.removeItem('userCache');
           }
           return null;
         };

// Theme toggle
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.className = savedTheme;
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.checked = savedTheme === 'dark';
};
const toggleTheme = () => {
  const isDark = document.body.classList.contains('dark');
  document.body.className = isDark ? 'light' : 'dark';
  localStorage.setItem('theme', document.body.className);
  if (document.getElementById('theme-toggle')) {
    document.getElementById('theme-toggle').checked = !isDark;
  }
};

// Navbar setup
const setupNavbar = async () => {
  const user = await getCurrentUser ();
  const navRight = document.getElementById('nav-right');
  const profileDropdown = document.getElementById('profile-dropdown');
  if (user) {
    navRight.style.display = 'none';
    profileDropdown.style.display = 'flex';
    document.getElementById('username-nav').textContent = user.username;
    document.getElementById('avatar').src = user.photo || '/images/user.png';
    profileDropdown.addEventListener('click', () => {
      profileDropdown.classList.toggle('active');
    });
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          const data = await apiFetch('/api/auth/logout', { method: 'POST' });
          if (data.ok && data.redirect) window.location.href = data.redirect;
        } catch (err) {
          alert('Logout failed: ' + err.message);
        }
      });
    }
  } else {
    navRight.style.display = 'flex';
    profileDropdown.style.display = 'none';
    localStorage.removeItem('userCache');
    currentUser  = null;
  }
};

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  if (document.getElementById('theme-toggle')) {
    document.getElementById('theme-toggle').addEventListener('change', toggleTheme);
  }
  setupNavbar();
});