// Redirect to login if not logged in
if (!localStorage.getItem('token')) {
  window.location.href = 'login.html';
}