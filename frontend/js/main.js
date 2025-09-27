// Base API URL (adjust for production)
const API_BASE = window.location.origin + '/api';

// Token management
const getToken = () => localStorage.getItem('token') || document.cookie.split('; ').find(row => row.startsWith('token=')).split('=')[1];
const setToken = (token) => {
  localStorage.setItem('token', token);
  document.cookie = `token=${token}; path=/; max-age=3600`; // 1 hour
};
const removeToken = () => {
  localStorage.removeItem('token');
  document.cookie = 'token=; path=/; max-age=0';
};

// Auth check for protected pages
const checkAuth = () => {
  if (!getToken()) {
    window.location.href = 'login.html';
  }
};

// API helper
const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    credentials: 'include', // For sessions/cookies
    ...options
  };
  const response = await fetch(`${API_BASE}${endpoint}`, config);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
};

// Logout
const logout = () => {
  removeToken();
  window.location.href = 'login.html';
};

// Theme toggle (load/save)
const loadTheme = () => {
  const theme = localStorage.getItem('theme') || 'light';
  document.body.className = theme;
  const select = document.getElementById('theme');
  if (select) select.value = theme;
};
const saveTheme = (theme) => {
  localStorage.setItem('theme', theme);
  document.body.className = theme;
};

// Google Login Redirect
const googleLogin = () => {
  window.location.href = `${API_BASE}/auth/google`;
};

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  // Check auth if on protected page (home, settings, admin)
  if (window.location.pathname.includes('home.html') || window.location.pathname.includes('settings.html') || window.location.pathname.includes('admin.html')) {
    checkAuth();
  }
});