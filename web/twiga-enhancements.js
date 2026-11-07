/* TWIGA pointer field, scroll reveal and latest Android release metadata. */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hero = document.querySelector(".hero");
const canvas = document.getElementById("cursorField");

if (hero && canvas && !reduceMotion && matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const ctx = canvas.getContext("2d", { alpha: true });
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let pointer = null;
  let points = [];

  const resize = () => {
    const rect = hero.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const columns = Math.max(10, Math.ceil(width / 34));
    const rows = Math.max(8, Math.ceil(height / 34));
    points = [];
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= columns; x++) {
        points.push({ x: x * width / columns, y: y * height / rows });
      }
    }
    paint();
  };

  const paint = () => {
    frame = 0;
    ctx.clearRect(0, 0, width, height);
    if (!pointer) return;

    const radius = Math.min(230, Math.max(150, width * 0.19));
    const nearby = [];
    for (const point of points) {
      const dx = point.x - pointer.x;
      const dy = point.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < radius) {
        const force = 1 - distance / radius;
        nearby.push({
          x: point.x + (distance ? dx / distance : 0) * force * 11,
          y: point.y + (distance ? dy / distance : 0) * force * 11,
          force
        });
      }
    }

    ctx.lineWidth = 0.8;
    for (let i = 0; i < nearby.length; i++) {
      const a = nearby[i];
      for (let j = i + 1; j < nearby.length; j++) {
        const b = nearby[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < 43) {
          const alpha = Math.min(a.force, b.force) * (1 - distance / 43) * 0.42;
          ctx.strokeStyle = `rgba(244,119,33,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const point of nearby) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.35 + point.force * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(221,104,35,${0.18 + point.force * 0.58})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 13, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(244,119,33,.26)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#F47721";
    ctx.fill();
  };

  const schedulePaint = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };

  hero.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    const rect = hero.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    schedulePaint();
  }, { passive: true });

  hero.addEventListener("pointerleave", () => {
    pointer = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    ctx.clearRect(0, 0, width, height);
  });

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(hero);
  else window.addEventListener("resize", resize, { passive: true });
  resize();
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
