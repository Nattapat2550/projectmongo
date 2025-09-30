document.addEventListener('DOMContentLoaded', () => {
  if (typeof populateNavbar === 'function') { try { populateNavbar(); } catch {} }
  if (typeof initDropdown   === 'function') { try { initDropdown(); } catch {} }
  wireSettingsPage(); loadMe();
});
function $(s){return document.querySelector(s)}; function flash(el,msg,ok=true){ if(!el) return; el.textContent=msg||''; el.style.color = ok?'var(--success)':'var(--danger)'; }
async function loadMe(){
  const nameInput = $('#set-username'); const msg = $('#up-msg');
  try{ const res = await fetch('/api/users/me'); if(res.status===401){ location.href='/login.html'; return; }
    const me = await res.json(); if(nameInput) nameInput.value = me.username||'';
    const navImg = document.getElementById('nav-avatar'); if(navImg && me.profilePicture){
      let src = (window.buildAssetURL?window.buildAssetURL(me.profilePicture):me.profilePicture); src = src.replace(/^\/+(?=https?:\/\/)/i,''); navImg.src = src; navImg.onerror=()=>{navImg.src='/images/user.png'};
    }
    flash(msg,'โหลดข้อมูลสำเร็จ',true);
  }catch{ flash(msg,'โหลดข้อมูลไม่สำเร็จ',false); }
}
function wireSettingsPage(){
  const btnSave=$('#btn-save-username'); const btnUpload=$('#btn-upload'); const fileInput=$('#set-avatar'); const btnDelete=$('#btn-delete');
  if(btnSave) btnSave.addEventListener('click', saveUsername);
  if(btnUpload) btnUpload.addEventListener('click', uploadPic);
  if(fileInput) fileInput.addEventListener('change', previewSelected);
  if(btnDelete) btnDelete.addEventListener('click', deleteAccount);
}
async function saveUsername(){ const input=$('#set-username'); const msg=$('#up-msg'); const username=(input.value||'').trim(); if(!username){ flash(msg,'กรุณากรอกชื่อผู้ใช้',false); return; }
  this.disabled=true; try{ const res=await fetch('/api/users/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({username})}); const data=await res.json(); if(!res.ok) throw new Error(data.message||'อัปเดตชื่อผู้ใช้ไม่สำเร็จ'); flash(msg,'บันทึกชื่อผู้ใช้เรียบร้อย',true); const nameEl=document.getElementById('nav-username'); if(nameEl) nameEl.textContent=username; }catch(e){ flash(msg,e.message||'เกิดข้อผิดพลาด',false);} finally{ this.disabled=false; } }
function previewSelected(){ const input=$('#set-avatar'); const msg=$('#up-msg'); if(!input||!input.files||!input.files[0])return; const f=input.files[0]; const MAX=5; if(f.size>MAX*1024*1024){ input.value=''; flash(msg,`ไฟล์ใหญ่เกินไป (> ${MAX}MB)`,false); return;} const navImg=document.getElementById('nav-avatar'); if(navImg){ const url=URL.createObjectURL(f); navImg.src=url; navImg.onload=()=>URL.revokeObjectURL(url);} }
async function uploadPic(){ const input=$('#set-avatar'); const msg=$('#up-msg'); if(!input||!input.files||!input.files[0]){ flash(msg,'กรุณาเลือกไฟล์รูปภาพ',false); return;} const f=input.files[0]; const MAX=5; if(f.size>MAX*1024*1024){ flash(msg,`ไฟล์ใหญ่เกินไป (> ${MAX}MB)`,false); return;} this.disabled=true; flash(msg,'กำลังอัปโหลด...',true);
  try{ const fd=new FormData(); fd.append('avatar', f); const res=await fetch('/api/users/settings/upload-picture',{method:'POST', body: fd}); const data=await res.json(); if(!res.ok) throw new Error(data.message||'อัปโหลดรูปไม่สำเร็จ'); const newPath=data.profilePicture||data.path||data.url; const navImg=document.getElementById('nav-avatar'); if(navImg){ let src=newPath||'/images/user.png'; if(typeof window.buildAssetURL==='function') src=window.buildAssetURL(src); src=src.replace(/^\/+(?=https?:\/\/)/i,''); navImg.src=src; navImg.onerror=()=>{navImg.src='/images/user.png';} } flash(msg,'อัปโหลดรูปสำเร็จ',true); input.value=''; }catch(e){ flash(msg,e.message||'อัปโหลดรูปไม่สำเร็จ',false);} finally{ this.disabled=false; } }
async function deleteAccount(){ const msg=$('#up-msg'); if(!confirm('ยืนยันลบบัญชีของคุณหรือไม่?')) return; this.disabled=true; try{ const res=await fetch('/api/users/account',{method:'DELETE'}); const data=await res.json(); if(!res.ok) throw new Error(data.message||'ลบบัญชีไม่สำเร็จ'); sessionStorage.removeItem('authToken'); location.href='/'; }catch(e){ flash(msg,e.message||'เกิดข้อผิดพลาด',false);} finally{ this.disabled=false; } }
