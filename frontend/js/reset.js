document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('reset-form');
  const msg  = document.getElementById('msg');
  const hint = document.getElementById('token-hint');

  // อ่าน token จาก URL (?token=...) และจาก hash (#token=...) เผื่อกรณี redirect แนวอื่น
  const qs   = new URLSearchParams(location.search);
  let token  = (qs.get('token') || '').trim();

  if (!token) {
    const m = (location.hash || '').match(/[#&]token=([^&]+)/);
    if (m) token = decodeURIComponent(m[1]).trim();
  }

  // แสดง hint ให้รู้ว่ามี token ไหม
  hint.textContent = token ? 'พบโทเค็นรีเซ็ตในลิงก์แล้ว' : 'ไม่พบโทเค็นในลิงก์ หากคุณเปิดหน้านี้เอง กรุณาคลิกลิงก์จากอีเมลรีเซ็ตรหัสผ่าน';

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    msg.textContent='Updating...';

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

    try {
      // ส่ง token ไปทั้งใน body และแนบใน query (เพื่อความชัวร์)
      const url = token ? `/api/auth/reset-password?token=${encodeURIComponent(token)}` : `/api/auth/reset-password`;
      const res = await fetch(url, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword })
      });
      const data = await res.json().catch(()=>({}));

      if (!res.ok) {
        msg.textContent = data.message || 'รีเซ็ตไม่สำเร็จ';
        return;
        // ตัวอย่างข้อความที่อาจเจอ:
        // - "Missing token"
        // - "Passwords do not match"
        // - "Invalid or expired token"
      }

      msg.textContent='อัปเดตรหัสผ่านแล้ว กำลังพาไปหน้าเข้าสู่ระบบ...';
      setTimeout(()=> location.href='/login.html', 1200);
    } catch {
      msg.textContent='เครือข่ายมีปัญหา ลองใหม่อีกครั้ง';
    }
  });
});
