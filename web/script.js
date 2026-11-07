import Vapi from "@vapi-ai/web";
import { inject } from "@vercel/analytics";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  inject();

  // Public Vapi key is intended for browser use. Never place a private Vapi key here.
  const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || "3b23fdc9-f276-4fe8-9b99-5a2a1c5ae0e9";
  const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID || "ea3ae8f7-fb6f-430e-9c33-96d9a919ade3";

  const nav = $("#mainNav");
  const menu = $("#menuToggle");
  const toast = $("#toast");
  const startButton = $("#startCall");
  const endButton = $("#endCall");
  const muteButton = $("#muteCall");
  const status = $("#callStatus");
  const statusText = $("#callStatus span");
  const headline = $("#callHeadline");
  const subhead = $("#callSubhead");
  const transcript = $("#transcriptList");
  const transcriptMode = $("#transcriptMode");
  const callFootnote = $("#callFootnote");
  const callOrb = $("#callOrb");
  const callWave = $("#callWave");
  const voiceChoice = $("#voiceChoice");
  let vapi = null;
  let isLive = false;
  let toastTimer;
  let lastTranscriptKey = "";

  $("#year").textContent = String(new Date().getFullYear());

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
  }

  function setStatus(message, mode = "") {
    statusText.textContent = message;
    status.classList.remove("live", "error");
    if (mode) status.classList.add(mode);
  }

  function setCallState(live) {
    isLive = live;
    startButton.disabled = live;
    endButton.disabled = !live;
    muteButton.disabled = !live;
    callOrb.classList.toggle("active", live);
    callWave.classList.toggle("active", live);
    startButton.innerHTML = live ? "<span>●</span> Live conversation" : "<span>●</span> Start live call";
  }

  function appendTranscript(role, text) {
    const clean = String(text || "").trim();
    if (!clean) return;
    const key = `${role}:${clean}`;
    if (key === lastTranscriptKey) return;
    lastTranscriptKey = key;
    const line = document.createElement("div");
    line.className = `transcript-line ${role === "user" ? "customer-line" : "ai-line"} live-line`;
    const speaker = document.createElement("b");
    speaker.textContent = role === "user" ? "YOU" : "TWIGA · AI RECEPTIONIST";
    const words = document.createElement("p");
    words.textContent = clean;
    line.append(speaker, words);
    transcript.appendChild(line);
    transcript.scrollTop = transcript.scrollHeight;
  }

  function prepareLiveTranscript() {
    transcript.replaceChildren();
    transcriptMode.textContent = "LIVE";
    callFootnote.textContent = "Live browser conversation · Microphone required";
    lastTranscriptKey = "";
  }

  function stopUi(message = "Call ended") {
    setCallState(false);
    setStatus("Ready when you are");
    headline.textContent = "Meet your AI receptionist";
    subhead.textContent = message;
    muteButton.textContent = "Mute mic";
  }

  // Mobile navigation
  menu.addEventListener("click", () => {
    const opened = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(opened));
    menu.setAttribute("aria-label", opened ? "Close navigation" : "Open navigation");
  });
  $$(".main-nav a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }));

  // Real browser voice demo using the user's existing Vapi assistant.
  async function startLiveCall() {
    if (isLive) return;
    if (!VAPI_PUBLIC_KEY || !VAPI_ASSISTANT_ID) {
      setStatus("Demo is not configured", "error");
      showToast("The live demo is not configured yet.");
      return;
    }

    startButton.disabled = true;
    endButton.disabled = true;
    muteButton.disabled = true;
    setStatus("Connecting to TWIGA…");
    headline.textContent = "Getting your call ready";
    subhead.textContent = "Allow microphone access when your browser asks.";
    prepareLiveTranscript();

    try {
      if (!vapi) {
        vapi = new Vapi(VAPI_PUBLIC_KEY);
        vapi.on("call-start", () => {
          setCallState(true);
          setStatus("You're speaking with TWIGA", "live");
          headline.textContent = "TWIGA is listening";
          subhead.textContent = "Speak naturally. You can interrupt, ask a question or end the call at any time.";
        });
        vapi.on("call-end", () => {
          stopUi("Your live call has ended. You can start another conversation whenever you're ready.");
          showToast("Live demo ended.");
        });
        vapi.on("message", (message) => {
          if (message?.type === "transcript" && message.transcript && (!message.transcriptType || message.transcriptType === "final")) {
            appendTranscript(message.role === "user" ? "user" : "assistant", message.transcript);
          }
        });
        vapi.on("speech-start", () => {
          callOrb.classList.add("active");
          callWave.classList.add("active");
        });
        vapi.on("speech-end", () => {
          callWave.classList.remove("active");
          if (!isLive) callOrb.classList.remove("active");
        });
        vapi.on("error", (error) => {
          const message = error?.error?.message || error?.message || "Something interrupted the voice connection.";
          setStatus("Call needs attention", "error");
          headline.textContent = "We couldn't connect just now";
          subhead.textContent = message;
          startButton.disabled = false;
          endButton.disabled = !isLive;
          muteButton.disabled = !isLive;
        });
        vapi.on("volume-level", (level) => {
          const strength = Math.max(0, Math.min(1, Number(level) || 0));
          callWave.style.opacity = String(0.35 + strength * 0.65);
        });
      }

      // Voice is overridden per web call, so no changes are made to the saved assistant.
      // The selected ElevenLabs voice is synthesised by Vapi during this live session.
      const assistantOverrides = {
        firstMessage: "[cheerfully] Hello! Thanks for trying TWIGA. How can I help you today?",
        voice: {
          provider: "11labs",
          model: "eleven_v3",
          voiceId: voiceChoice.value,
          stability: 0.58,
          similarityBoost: 0.78,
          style: 0.18,
          useSpeakerBoost: false
        }
      };

      await vapi.start(VAPI_ASSISTANT_ID, assistantOverrides);
      // The call-start event is the authority for switching the UI to live state.
    } catch (error) {
      console.error("TWIGA Vapi web call failed", error);
      setCallState(false);
      setStatus("Unable to start call", "error");
      headline.textContent = "Check your microphone and try again";
      subhead.textContent = error?.message || "The browser voice connection could not be started.";
      startButton.disabled = false;
      showToast("The live call could not start. Please check browser microphone permission.");
    }
  }

  async function endLiveCall() {
    if (!vapi || !isLive) return;
    endButton.disabled = true;
    try {
      await vapi.stop();
    } catch (error) {
      console.warn("TWIGA call stop warning", error);
      stopUi("The session was closed.");
    }
  }

  function toggleMute() {
    if (!vapi || !isLive) return;
    const muted = !vapi.isMuted();
    vapi.setMuted(muted);
    muteButton.textContent = muted ? "Unmute mic" : "Mute mic";
    showToast(muted ? "Microphone muted." : "Microphone is on.");
  }

  // Demo requests are stored in the TWIGA Supabase database, not sent through a visitor's mail app.
  const demoForm = $("#demoRequest");
  const demoDate = $("#demoDate");
  if (demoDate) {
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    demoDate.min = localToday;
    demoDate.value = localToday;
  }
  demoForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(demoForm).entries());
    const submit = demoForm.querySelector('button[type="submit"]');
    const statusLine = $("#demoFormStatus");
    if (submit) { submit.disabled = true; submit.textContent = "Sending request…"; }
    statusLine.textContent = "Saving your demo request securely…";
    try {
      const response = await fetch("/api/demo-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Please try again.");
      demoForm.reset();
      statusLine.textContent = result.message || "Your request has been received. The TWIGA team will contact you.";
      showToast("Demo request received.");
    } catch (error) {
      statusLine.textContent = error?.message || "We couldn't save your request. Please try again.";
    } finally {
      if (submit) { submit.disabled = false; submit.innerHTML = 'Request my free demo <span aria-hidden="true">↗</span>'; }
    }
  });

  // The APK URL stays stable; each successful release replaces the latest-apk asset.
  fetch("https://api.github.com/repos/michaelmuchemi33-design/twiga-android-app/releases/tags/latest-apk", {
    headers: { Accept: "application/vnd.github+json" }, cache: "no-store"
  })
    .then(response => { if (!response.ok) throw new Error("Latest release unavailable"); return response.json(); })
    .then(release => {
      const apk = (release.assets || []).find(asset => asset.name === "unity-ai-receptionist.apk");
      if (apk) {
        const downloadUrl = apk.browser_download_url;
        if ($("#apkDownload")) $("#apkDownload").href = downloadUrl;
        if ($("#apkDownloadHero")) $("#apkDownloadHero").href = downloadUrl;
        const version = " · Latest · " + Math.round(apk.size / 1048576) + " MB";
        if ($("#apkVersion")) $("#apkVersion").textContent = version;
        if ($("#apkVersionHero")) $("#apkVersionHero").textContent = version;
      }
    })
    .catch(() => {});


  // Pointer field across the complete hero. It is intentionally disabled on touch devices.
  const hero = $(".hero");
  const cursorCanvas = $("#cursorField");
  if (hero && cursorCanvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const ctx = cursorCanvas.getContext("2d", { alpha: true });
    let width = 0, height = 0, dpr = 1, raf = 0;
    let pointer = { x: 0, y: 0, active: false };
    let dots = [];
    const resizeField = () => {
      const rect = hero.getBoundingClientRect();
      width = rect.width; height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cursorCanvas.width = Math.round(width * dpr);
      cursorCanvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      const step = width < 700 ? 32 : 36;
      for (let y = 16; y < height; y += step) {
        for (let x = 16; x < width; x += step) dots.push({ x, y });
      }
      drawField();
    };
    const drawField = () => {
      raf = 0;
      ctx.clearRect(0, 0, width, height);
      if (!pointer.active) return;
      const radius = width < 700 ? 150 : 210;
      const nearby = [];
      for (const dot of dots) {
        const dx = dot.x - pointer.x, dy = dot.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < radius) {
          const power = 1 - distance / radius;
          const push = power * 9;
          nearby.push({ x: dot.x + (distance ? dx / distance : 0) * push,
            y: dot.y + (distance ? dy / distance : 0) * push, power });
        }
      }
      ctx.lineWidth = .8;
      for (let i = 0; i < nearby.length; i++) {
        for (let j = i + 1; j < nearby.length; j++) {
          const a = nearby[i], b = nearby[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < 42) {
            ctx.strokeStyle = "rgba(244,119,33," +
              (Math.min(a.power, b.power) * (1 - distance / 42) * .4) + ")";
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const dot of nearby) {
        ctx.beginPath(); ctx.arc(dot.x, dot.y, 1.1 + dot.power * .65, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(217,95,18," + (.18 + dot.power * .52) + ")";
        ctx.fill();
      }
      const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius);
      glow.addColorStop(0, "rgba(244,119,33,.08)");
      glow.addColorStop(1, "rgba(244,119,33,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(pointer.x - radius, pointer.y - radius, radius * 2, radius * 2);
      ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(244,119,33,.48)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = "#F47721"; ctx.fill();
    };
    const scheduleDraw = () => { if (!raf) raf = requestAnimationFrame(drawField); };
    hero.addEventListener("pointermove", event => {
      if (event.pointerType === "touch") return;
      const rect = hero.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top, active: true };
      scheduleDraw();
    }, { passive: true });
    hero.addEventListener("pointerleave", () => {
      pointer.active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ctx.clearRect(0, 0, width, height);
    });
    if ("ResizeObserver" in window) new ResizeObserver(resizeField).observe(hero);
    else window.addEventListener("resize", resizeField, { passive: true });
    resizeField();
  }

  startButton.addEventListener("click", startLiveCall);
  endButton.addEventListener("click", endLiveCall);
  muteButton.addEventListener("click", toggleMute);

  window.addEventListener("beforeunload", () => {
    if (vapi && isLive) vapi.stop();
  });
})();
