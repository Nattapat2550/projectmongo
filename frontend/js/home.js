document.addEventListener('DOMContentLoaded', async () => {
  const message = document.getElementById('message'); // Optional, for errors
  const hero = document.getElementById('hero');
  const blocks = document.getElementById('blocks');

  try {
    // Navbar handles user
    await setupNavbar(); // From main.js

    // Fetch and render homepage content
    const data = await apiFetch('/api/homepage/content');
    if (data.ok && data.data) {
      hero.innerHTML = `<h2>${data.data.title}</h2><p>${data.data.hero}</p>`;
      const blockList = document.createElement('ul');
      data.data.blocks.forEach(block => {
        const li = document.createElement('li');
        li.textContent = block;
        blockList.appendChild(li);
      });
      blocks.appendChild(blockList);
    }
  } catch (err) {
    console.error('Failed to load home content:', err);
    if (message) showMessage('Failed to load content', 'error');
  }

  const showMessage = (msg, type) => {
    if (message) {
      message.textContent = msg;
      message.className = type;
    } else {
      alert(msg);
    }
  };
});