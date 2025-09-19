const SERVER_URL = 'https://projectmongo.onrender.com/api';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
}

async function apiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers,
    credentials: 'include',
  };

  if (body) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  const res = await fetch(`${SERVER_URL}${endpoint}`, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }
  return res.json();
}