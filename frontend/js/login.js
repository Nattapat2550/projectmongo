document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('login-form');
  const msg  = document.getElementById('msg');
  const showPw = document.getElementById('show-pw');
  const remember = document.getElementById('remember');
  const btnGoogle = document.getElementById('btn-google');

  // ========= แสดง/ซ่อนรหัสผ่าน =========
  showPw.addEventListener('change', ()=>{
    const pw = document.getElementById('password');
    pw.type = showPw.checked ? 'text' : 'password';
  });

  // ========= เข้าสู่ระบบ =========
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    msg.textContent='Signing in...';

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const res = await fetch('/api/auth/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password, rememberMe: !!remember.checked })
    });
    const data = await res.json().catch(()=>({}));

    if(!res.ok){
      msg.textContent = data.message || 'Login failed';
      return;
    }

    // เก็บ token (กัน third-party cookies)
    captureTokenFromResponse(data);

    location.href = data.role === 'admin' ? '/admin.html' : '/home.html';
  });

  // ========= Google OAuth =========
  btnGoogle.addEventListener('click', ()=>{
    location.href = window.apiURL('/api/auth/google');
  });

  // ========= ลืมรหัสผ่าน: เปิด modal =========
  const modal = document.getElementById('forgot-modal');
  const openForgot = document.getElementById('forgot-link');
  const fpSend = document.getElementById('fp-send');
  const fpCancel = document.getElementById('fp-cancel');
  const fpEmail = document.getElementById('fp-email');
  const fpMsg   = document.getElementById('fp-msg');

  openForgot.addEventListener('click', (e)=>{
    e.preventDefault();
    fpEmail.value = document.getElementById('email').value.trim();
    fpMsg.textContent = '';
    modal.classList.add('open');
    fpEmail.focus();
  });

  fpCancel.addEventListener('click', ()=>{
    modal.classList.remove('open');
  });

  // ส่งคำขอรีเซ็ตรหัสผ่าน -> backend จะส่งอีเมลพร้อมลิงก์ /reset.html?token=...
  fpSend.addEventListener('click', async ()=>{
    const email = fpEmail.value.trim();
    if(!email){
      fpMsg.textContent = 'กรุณากรอกอีเมล';
      return;
    }
    fpMsg.textContent = 'กำลังส่งอีเมล...';

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email })
      });
      // เพื่อความปลอดภัย ฝั่ง backend จะตอบ success เสมอ (แม้อีเมลไม่อยู่)
      if (res.ok) {
        fpMsg.textContent = 'ส่งลิงก์รีเซ็ตไปที่อีเมลแล้ว (โปรดตรวจสอบกล่องจดหมาย/สแปม)';
        // ปิด modal ช้า ๆ เพื่อให้ผู้ใช้เห็นข้อความยืนยัน
        setTimeout(()=> modal.classList.remove('open'), 1500);
      } else {
        const data = await res.json().catch(()=>({}));
        fpMsg.textContent = data.message || 'ส่งไม่สำเร็จ ลองอีกครั้ง';
      }
    } catch {
      fpMsg.textContent = 'เครือข่ายผิดพลาด ลองใหม่อีกครั้ง';
    }
  });

  // ปิด modal เมื่อคลิกนอกกล่อง
  modal.addEventListener('click', (e)=>{
    if (e.target === modal) modal.classList.remove('open');
  });

  // ปิดด้วย ESC
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape') modal.classList.remove('open');
  });
});
