document.addEventListener('DOMContentLoaded', ()=>{
  try{ populateNavbar(); }catch{}
  try{ initDropdown(); }catch{}
  initCarousel();
});

async function initCarousel() {
  const track   = document.getElementById('carousel-track');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const dotsEl  = document.getElementById('carousel-dots');
  const titleEl = document.getElementById('carousel-title');
  const descEl  = document.getElementById('carousel-desc');
  const carousel= document.getElementById('carousel');
  if (!track || !prevBtn || !nextBtn || !dotsEl || !titleEl || !descEl || !carousel) return;

  let items = [];
  try { const r=await fetch('/api/homepage/carousel'); items=await r.json(); } catch {}
  if(!Array.isArray(items) || !items.length){
    track.innerHTML = `<div class="carousel-item active"><img class="slide-img" src="/images/user.png" alt="Placeholder"></div>`;
    titleEl.textContent='ยังไม่มีสไลด์';
    descEl.innerHTML = `<div class="muted">ไปที่ Admin เพื่อเพิ่มรูป</div>`;
    dotsEl.innerHTML='';
    prevBtn.style.display='none'; nextBtn.style.display='none';
    return;
  }

  track.innerHTML = items.map((it,i)=>`
    <div class="carousel-item${i===0?' active':''}" data-idx="${i}">
      <img class="slide-img" src="${buildAssetURL(it.imageUrl)}" alt="${escapeHtml(it.title||'slide')}">
    </div>
  `).join('');

  dotsEl.innerHTML = items.map((it,i)=>`
    <li data-goto="${i}" class="${i===0?'active':''}" aria-label="ไปสไลด์ ${i+1}">
      <img src="${buildAssetURL(it.imageUrl)}" alt="${escapeHtml(it.title||('slide '+(i+1)))}">
    </li>
  `).join('');

  const renderTitle = (i)=>{ const it=items[i]||{}; titleEl.textContent=(it.title||it.subtitle||`สไลด์ที่ ${i+1}`); };
  const renderDesc  = (i)=>{ const it=items[i]||{}; const sub=it.subtitle||''; const des=it.description||''; 
    descEl.innerHTML = `${sub?`<div class="cap-sub">${escapeHtml(sub)}</div>`:''}${des?`<div class="cap-desc">${escapeHtml(des)}</div>`:''}`;
  };

  let current=0, total=items.length, anim=false;
  renderTitle(0); renderDesc(0); track.style.setProperty('--i',0);

  const goTo=(i)=>{
    if(anim || i===current) return; anim=true;
    const slides=[...track.querySelectorAll('.carousel-item')];
    const dots=[...dotsEl.querySelectorAll('li')];
    slides[current]?.classList.remove('active'); dots[current]?.classList.remove('active');
    current=(i+total)%total;
    slides[current]?.classList.add('active'); dots[current]?.classList.add('active');
    renderTitle(current); renderDesc(current);
    track.style.setProperty('--i', current);
    setTimeout(()=>anim=false, 350);
  };

  prevBtn.addEventListener('click', ()=>goTo(current-1));
  nextBtn.addEventListener('click', ()=>goTo(current+1));
  dotsEl.addEventListener('click',(e)=>{ const li=e.target.closest('li[data-goto]'); if(!li) return; goTo(Number(li.dataset.goto)||0); });

  let timer=setInterval(()=>goTo(current+1), 5000);
  carousel.addEventListener('mouseenter',()=>clearInterval(timer));
  carousel.addEventListener('mouseleave',()=>{ timer=setInterval(()=>goTo(current+1),5000); });

  let startX=null;
  carousel.addEventListener('touchstart',(e)=>{ startX=e.touches?.[0]?.clientX ?? null; },{passive:true});
  carousel.addEventListener('touchend',(e)=>{ if(startX==null) return; const endX=e.changedTouches?.[0]?.clientX ?? startX; const dx=endX-startX; if(dx>40) goTo(current-1); if(dx<-40) goTo(current+1); startX=null; },{passive:true});
}
function escapeHtml(s){ const map={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}; return String(s).replace(/[&<>"']/g,ch=>map[ch]); }
