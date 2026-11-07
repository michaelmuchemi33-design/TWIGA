/* Lightweight pointer field and real latest-APK metadata. */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const heroVisual = document.querySelector(".hero-visual");
const canvas = document.getElementById("cursorField");
if (heroVisual && canvas && !reduceMotion) {
  const ctx = canvas.getContext("2d");
  let width = 0, height = 0, raf = 0, pointer = null;
  const points = [];
  const resize = () => {
    const rect = heroVisual.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    points.length = 0;
    const cols = Math.max(8, Math.floor(width / 42));
    const rows = Math.max(8, Math.floor(height / 42));
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) {
      points.push({x:x*width/cols,y:y*height/rows,ox:x*width/cols,oy:y*height/rows});
    }
    draw();
  };
  const draw = () => {
    raf = 0; ctx.clearRect(0,0,width,height);
    if (!pointer) return;
    const near = [];
    for (const p of points) {
      const dx=p.ox-pointer.x, dy=p.oy-pointer.y, d=Math.hypot(dx,dy);
      const influence=Math.max(0,1-d/185);
      p.x=p.ox+(d?dx/d:0)*influence*9;
      p.y=p.oy+(d?dy/d:0)*influence*9;
      if(d<155) near.push(p);
    }
    ctx.lineWidth=0.7;
    for(let i=0;i<near.length;i++) for(let j=i+1;j<near.length;j++){
      const a=near[i],b=near[j],d=Math.hypot(a.x-b.x,a.y-b.y);
      if(d<65){ctx.strokeStyle="rgba(244,119,33,"+((1-d/65)*.22)+")";ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    }
    for(const p of near){const d=Math.hypot(p.ox-pointer.x,p.oy-pointer.y);ctx.fillStyle="rgba(255,177,125,"+((1-d/185)*.55)+")";ctx.beginPath();ctx.arc(p.x,p.y,1.2,0,Math.PI*2);ctx.fill();}
    ctx.beginPath();ctx.arc(pointer.x,pointer.y,3,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,.7)";ctx.fill();
  };
  const queue = () => { if(!raf) raf=requestAnimationFrame(draw); };
  heroVisual.addEventListener("pointermove",e=>{const r=heroVisual.getBoundingClientRect();pointer={x:e.clientX-r.left,y:e.clientY-r.top};heroVisual.style.setProperty("--cursor-x",(pointer.x/width*100)+"%");heroVisual.style.setProperty("--cursor-y",(pointer.y/height*100)+"%");heroVisual.classList.add("cursor-active");queue();});
  heroVisual.addEventListener("pointerleave",()=>{pointer=null;heroVisual.classList.remove("cursor-active");if(raf)cancelAnimationFrame(raf);ctx.clearRect(0,0,width,height);});
  new ResizeObserver(resize).observe(heroVisual); resize();
}
const apkLink=document.getElementById("apkDownloadHero");
const apkVersion=document.getElementById("apkVersionHero");
if(apkLink&&apkVersion){
  fetch("https://api.github.com/repos/michaelmuchemi33-design/twiga-android-app/releases/tags/latest-apk",{headers:{Accept:"application/vnd.github+json"},cache:"no-store"})
    .then(r=>{if(!r.ok)throw new Error("Latest APK release not found");return r.json();})
    .then(release=>{
      const asset=(release.assets||[]).find(a=>a.name==="twiga.apk");
      if(asset){apkLink.href=asset.browser_download_url;apkVersion.textContent=" · Latest build · "+(asset.size/1048576).toFixed(1)+" MB";}
    }).catch(()=>{apkVersion.textContent=" · Android download";});
}
const reveal=document.querySelector(".tagline-reveal");
if(reveal){
  const words=[...reveal.querySelectorAll("span")];
  if(reduceMotion) words.forEach(w=>w.classList.add("is-active"));
  else {
    const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){
        words.forEach((w,i)=>setTimeout(()=>w.classList.add("is-active"),i*220));
        observer.unobserve(reveal);
      }
    }),{threshold:.45});
    observer.observe(reveal);
  }
}
