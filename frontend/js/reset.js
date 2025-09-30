document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('reset-form');
  const msg  = document.getElementById('msg');

  // สร้าง token-hint ถ้าไม่มีใน DOM
  let hint = document.getElementById('token-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'token-hint';
    hint.className = 'mt-12 muted';
    // แทรกใต้ฟอร์มถ้าหาได้ ไม่งั้นแทรกท้าย <main>
    if (form && form.parentElement) form.parentElement.appendChild(hint);
    else document.body.appendChild(hint);
  }

  // อ่าน token จาก ?token=... หรือ #token=...
  const qs   = new URLSearchParams(location.search);
  let token  = (qs.get('token') || '').trim();
  if (!token) {
    const m = (location.hash || '').match(/[#&]token=([^&]+)/);
    if (m) token = decodeURIComponent(m[1]).trim();
  }

  hint.textContent = token
    ? 'พบโทเค็นรีเซ็ตในลิงก์แล้ว'
    : 'ไม่พบโทเค็นในลิงก์ กรุณาเปิดจากอีเมล “ลืมรหัสผ่าน” ล่าสุดของคุณ';

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const newPassword     = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword.length < 8) {
      msg.textContent = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
      return;
    }
    if (newPassword !== confirmPassword) {
      msg.textContent = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
      return;
    }

    msg.textContent='Updating...';

    try {
      const url = token
        ? `/api/auth/reset-password?token=${encodeURIComponent(token)}`
        : `/api/auth/reset-password`;

      const res = await fetch(url, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword })
      });
      const data = await res.json().catch(()=>({}));

      if (!res.ok) {
        msg.textContent = data.message || 'รีเซ็ตไม่สำเร็จ';
        // แสดงคำแนะนำกรณี token มีปัญหา
        if (data.message && /token/i.test(data.message)) {
          hint.textContent = 'โทเค็นไม่ถูกต้องหรือหมดอายุ กรุณากด “ลืมรหัสผ่าน?” เพื่อรับอีเมลใหม่';
        }
        return;
      }

      msg.textContent='อัปเดตรหัสผ่านแล้ว กำลังพาไปหน้าเข้าสู่ระบบ...';
      setTimeout(()=> location.href='/login.html', 1200);
    } catch {
      msg.textContent='เครือข่ายมีปัญหา ลองใหม่อีกครั้ง';
    }
  });
});
