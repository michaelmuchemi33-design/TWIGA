import Vapi from "@vapi-ai/web";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Public Vapi key is intended for browser use. Never place a private Vapi key here.
  const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || "605ebb25-4c52-4e85-bbb7-95aa65e7a2a0";
  const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID || "84b009c6-0634-44e2-9861-13d746e82542";

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
        firstMessage: "Hi there, thanks for trying TWIGA. I'm the AI receptionist. What can I help you with today?",
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

  startButton.addEventListener("click", startLiveCall);
  endButton.addEventListener("click", endLiveCall);
  muteButton.addEventListener("click", toggleMute);

  window.addEventListener("beforeunload", () => {
    if (vapi && isLive) vapi.stop();
  });
})();
