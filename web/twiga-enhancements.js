/* TWIGA pointer field, scroll reveal and latest Android release metadata. */
/* TWIGA interactive orange cursor field. The canvas spans the whole hero. */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hero = document.querySelector(".hero");
const canvas = document.getElementById("cursorField");

if (hero && canvas && !reduceMotion) {
  const ctx = canvas.getContext("2d", { alpha: true });
  let width = 0, height = 0, dpr = 1, raf = 0;
  let pointer = { x: -1000, y: -1000, active: false };
  let dots = [];

  function resizeField() {
    const rect = hero.getBoundingClientRect();
    width = rect.width; height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = [];
    const step = width < 650 ? 27 : 31;
    for (let y = 14; y < height; y += step) {
      for (let x = 14; x < width; x += step) dots.push({ x, y });
    }
    drawField();
  }

  function drawField() {
    raf = 0;
    ctx.clearRect(0, 0, width, height);
    if (!pointer.active) return;
    const radius = width < 650 ? 145 : 205;
    const active = [];
    for (const dot of dots) {
      const dx = dot.x - pointer.x, dy = dot.y - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist < radius) {
        const power = 1 - dist / radius;
        const push = power * 10;
        active.push({ x: dot.x + (dist ? dx / dist : 0) * push,
          y: dot.y + (dist ? dy / dist : 0) * push, power });
      }
    }
    ctx.lineWidth = .8;
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i], b = active[j], dist = Math.hypot(a.x-b.x,a.y-b.y);
        if (dist < 40) {
          ctx.strokeStyle = "rgba(244,119,33," + (Math.min(a.power,b.power)*(1-dist/40)*.55) + ")";
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }
    for (const dot of active) {
      ctx.beginPath(); ctx.arc(dot.x,dot.y,1.15+dot.power*.8,0,Math.PI*2);
      ctx.fillStyle = "rgba(218,103,36," + (.2+dot.power*.65) + ")"; ctx.fill();
    }
    const glow = ctx.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,radius);
    glow.addColorStop(0,"rgba(244,119,33,.095)");
    glow.addColorStop(1,"rgba(244,119,33,0)");
    ctx.fillStyle=glow;ctx.fillRect(pointer.x-radius,pointer.y-radius,radius*2,radius*2);
    ctx.beginPath();ctx.arc(pointer.x,pointer.y,14,0,Math.PI*2);
    ctx.strokeStyle="rgba(244,119,33,.55)";ctx.lineWidth=1;ctx.stroke();
    ctx.beginPath();ctx.arc(pointer.x,pointer.y,2.5,0,Math.PI*2);
    ctx.fillStyle="#F47721";ctx.fill();
  }

  function scheduleDraw(){ if(!raf) raf=requestAnimationFrame(drawField); }
  hero.addEventListener("pointermove",event=>{
    if(event.pointerType==="touch") return;
    const rect=hero.getBoundingClientRect();
    pointer={x:event.clientX-rect.left,y:event.clientY-rect.top,active:true};
    scheduleDraw();
  },{passive:true});
  hero.addEventListener("pointerleave",()=>{
    pointer.active=false;
    if(raf) cancelAnimationFrame(raf);
    raf=0;ctx.clearRect(0,0,width,height);
  });
  if("ResizeObserver" in window) new ResizeObserver(resizeField).observe(hero);
  else window.addEventListener("resize",resizeField,{passive:true});
  resizeField();
}

const apkLink = document.getElementById("apkDownloadHero");
const apkVersion = document.getElementById("apkVersionHero");
if (apkLink && apkVersion) {
  fetch("https://api.github.com/repos/michaelmuchemi33-design/twiga-android-app/releases/tags/latest-apk", {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store"
  })
    .then(response => {
      if (!response.ok) throw new Error("Latest APK release not found");
      return response.json();
    })
    .then(release => {
      const asset = (release.assets || []).find(item => item.name === "twiga.apk");
      if (!asset) throw new Error("APK asset is not published");
      apkLink.href = asset.browser_download_url;
      apkVersion.textContent = ` · Latest build · ${(asset.size / 1048576).toFixed(1)} MB`;
    })
    .catch(() => {
      apkVersion.textContent = " · Android download";
    });
}

const reveal = document.querySelector(".tagline-reveal");
if (reveal) {
  const words = [...reveal.querySelectorAll("span")];
  if (reduceMotion || !("IntersectionObserver" in window)) {
    words.forEach(word => word.classList.add("is-active"));
  } else {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        words.forEach((word, index) => {
          window.setTimeout(() => word.classList.add("is-active"), index * 220);
        });
        observer.unobserve(reveal);
      }
    }, { threshold: 0.35 });
    observer.observe(reveal);
  }
}
