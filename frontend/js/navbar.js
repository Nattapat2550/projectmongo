const navbarContainer = document.getElementById('navbar-container');

async function fetchUserProfile() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const res = await fetch('https://projectmongo.onrender.com/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return await res.json();
  } catch {
    return null;
  }
}

function createNavbar(user) {
  const profilePic = user?.profilePicture || 'assets/user.png';
  const username = user?.username || 'Guest';

  navbarContainer.innerHTML = `
    <nav class="navbar">
      <div class="site-name"><a href="index.html">ProjectMongo</a></div>
      <div class="nav-links">
        <a href="about.html">About</a>
        <a href="contact.html">Contact</a>
      </div>
      <div class="profile-container" id="profile-container" tabindex="0" aria-haspopup="true" aria-expanded="false">
        <img src="${profilePic}" alt="Profile Picture" onerror="this.src='assets/user.png'" />
        <span>${username}</span>
        <div class="dropdown-menu" id="dropdown-menu" role="menu" aria-label="User  menu">
          <a href="settings.html" role="menuitem">Settings</a>
          <button id="logout-btn" role="menuitem">Logout</button>
        </div>
      </div>
    </nav>
  `;

  const profileContainer = document.getElementById('profile-container');
  const dropdownMenu = document.getElementById('dropdown-menu');
  const logoutBtn = document.getElementById('logout-btn');

  profileContainer.addEventListener('click', () => {
    const expanded = profileContainer.getAttribute('aria-expanded') === 'true';
    profileContainer.setAttribute('aria-expanded', !expanded);
    dropdownMenu.classList.toggle('show');
  });

  // Close dropdown if clicked outside
  document.addEventListener('click', (e) => {
    if (!profileContainer.contains(e.target)) {
      dropdownMenu.classList.remove('show');
      profileContainer.setAttribute('aria-expanded', false);
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });
}

async function initNavbar() {
  const user = await fetchUserProfile();
  createNavbar(user);
}

if (navbarContainer) {
  initNavbar();
}