document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('reset-form');
  const msg  = document.getElementById('msg');
  const hint = document.getElementById('token-hint');
  const fallbackWrap = document.getElementById('token-fallback');
  const tokenInput   = document.getElementById('tokenInput');

  // 1) อ่าน token จาก URL (query หรือ hash)
  const qs  = new URLSearchParams(location.search);
  let token = (qs.get('token') || '').trim();
  if (!token) {
    const m = (location.hash || '').match(/[#&]token=([^&]+)/);
    if (m) token = decodeURIComponent(m[1]).trim();
  }

  // 2) ไม่พบ token ใน URL -> ให้ผู้ใช้วางเอง
  if (!token) {
    hint.textContent = 'ไม่พบโทเค็นในลิงก์ กรุณาคลิกลิงก์จากอีเมล "ลืมรหัสผ่าน" ล่าสุด หรือวาง token ด้านบน';
    fallbackWrap.classList.add('show');
  } else {
    hint.textContent = 'พบโทเค็นรีเซ็ตในลิงก์แล้ว';
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();

    // ถ้าไม่มีใน URL ลองดึงจากช่อง fallback
    let effectiveToken = token || (tokenInput?.value || '').trim();

    const newPassword     = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // ตรวจฝั่ง client ก่อน
    if (!effectiveToken) {
      msg.textContent = 'ขาดโทเค็นรีเซ็ต กรุณาคลิกลิงก์จากอีเมลหรือวาง token';
      return;
    }
    if (newPassword.length < 8) {
      msg.textContent = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
      return;
    }
    if (newPassword !== confirmPassword) {
      msg.textContent = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
      return;
    }

    msg.textContent = 'Updating...';

    try {
      // ส่ง token ทั้งใน query และ body เพื่อความชัวร์
      const url = `/api/auth/reset-password?token=${encodeURIComponent(effectiveToken)}`;
      const res = await fetch(url, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ token: effectiveToken, newPassword, confirmPassword })
      });

      let data = {};
      try { data = await res.json(); } catch {}

      if (!res.ok) {
        // โชว์ข้อความจากฝั่ง server ตรง ๆ เพื่อวินิจฉัยได้
        msg.textContent = data.message || 'รีเซ็ตไม่สำเร็จ';
        if (/token/i.test(msg.textContent)) {
          hint.textContent = 'โทเค็นไม่ถูกต้องหรือหมดอายุ กด "ลืมรหัสผ่าน?" เพื่อรับอีเมลใหม่ แล้วคลิกลิงก์ล่าสุดเท่านั้น';
        }
        return;
      }

      msg.textContent = 'อัปเดตรหัสผ่านแล้ว กำลังพาไปหน้าเข้าสู่ระบบ...';
      setTimeout(()=> location.href='/login.html', 1200);
    } catch (err) {
      msg.textContent = 'เครือข่ายมีปัญหา ลองใหม่อีกครั้ง';
    }
  });
});
