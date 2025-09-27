document.addEventListener('DOMContentLoaded', () => {
  // Load user profile
  apiCall('/users/profile')
    .then(user => {
      document.getElementById('username').textContent = user.username || user.email;
      document.getElementById('email').textContent = user.email;
      if (user.profilePicture) {
        document.getElementById('profile-pic').src = user.profilePicture;
      }
      // Load homepage content dynamically
      apiCall('/homepage')
        .then(contents => {
          // Render sections, e.g., hero
          const hero = contents.find(c => c.slug === 'hero');
          if (hero) {
            document.getElementById('hero').innerHTML = `<h1>${hero.title}</h1><p>${hero.body}</p>`;
          }
        })
        .catch(console.error);
    })
    .catch(() => logout()); // Redirect if unauthorized
});