(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const nav = $('#mainNav');
  const menu = $('#menuToggle');
  const modal = $('#demoModal');
  const toast = $('#toast');
  const callDemo = $('#callDemo');
  const playButton = $('#playCall');
  const demoWave = $('#demoWave');
  const transcript = $('#transcriptContent');
  let toastTimer;
  let utterance = null;
  let playing = false;
  let activeScenario = 'salon';

  $('#year').textContent = String(new Date().getFullYear());

  // Build a lightweight voice waveform so the sample panel is visual even before playback.
  for (let i = 0; i < 112; i += 1) {
    const bar = document.createElement('i');
    bar.style.setProperty('--bar', `${8 + ((i * 17) % 47)}px`);
    demoWave.appendChild(bar);
  }

  const scenarios = {
    salon: {
      title: 'Booking a haircut',
      subtitle: 'Glow Hair Studio · Caller: Emma W.',
      length: '0:28',
      lines: [
        ['Emma', 'Hi! Can I get a cut on Friday afternoon?', 'customer'],
        ['TWIGA', 'Of course. Sara has 3:00 or 4:30 free. Which works better?', 'ai'],
        ['Emma', 'Three is perfect.', 'customer'],
        ['TWIGA', 'Done! Your haircut is booked for Friday at 3:00 PM. We will send you a reminder.', 'ai']
      ]
    },
    dental: {
      title: 'Scheduling a check-up',
      subtitle: 'Brightsmile Dental · Caller: Daniel K.',
      length: '0:31',
      lines: [
        ['Daniel', 'Hello, I need to book a dental check-up.', 'customer'],
        ['TWIGA', 'Certainly. Is this a routine check-up or do you need help with something specific?', 'ai'],
        ['Daniel', 'Just a routine check-up, please.', 'customer'],
        ['TWIGA', 'I can help with that. Let me check the clinic schedule and find an available time.', 'ai']
      ]
    },
    spa: {
      title: 'Enquiring about a treatment',
      subtitle: 'Lumen Wellness · Caller: Aisha M.',
      length: '0:26',
      lines: [
        ['Aisha', 'Hi, I would like to know more about your facial treatments.', 'customer'],
        ['TWIGA', 'Absolutely. Are you looking for a relaxing facial or something for a specific concern?', 'ai'],
        ['Aisha', 'Something hydrating before the weekend.', 'customer'],
        ['TWIGA', 'I can explain the options and arrange a consultation with the team.', 'ai']
      ]
    }
  };

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function openModal() {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => $('input[name="name"]', modal)?.focus(), 80);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  $$('[data-open-demo]').forEach((button) => button.addEventListener('click', openModal));
  $('#closeModal').addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  menu.addEventListener('click', () => {
    const opened = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(opened));
    menu.setAttribute('aria-label', opened ? 'Close navigation' : 'Open navigation');
  });
  $$('.main-nav a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
  }));

  function renderTranscript(key, activeIndex = -1) {
    const scenario = scenarios[key];
    transcript.replaceChildren();
    scenario.lines.forEach((line, index) => {
      const speaker = document.createElement('div');
      speaker.className = `speaker ${line[2] === 'ai' ? 'ai' : ''}`;
      speaker.textContent = line[0];
      const words = document.createElement('p');
      words.textContent = line[1];
      if (index === activeIndex) words.classList.add('active-line');
      transcript.append(speaker, words);
    });
  }

  function stopPlayback(status = 'Sample paused') {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    playing = false;
    callDemo.classList.remove('playing');
    playButton.textContent = '▶';
    playButton.classList.remove('playing');
    $('#demoStatus').textContent = status;
  }

  function setScenario(key) {
    stopPlayback('Press play to hear a sample conversation');
    activeScenario = key;
    const scenario = scenarios[key];
    $('#demoTitle').textContent = scenario.title;
    $('#demoSubtitle').textContent = scenario.subtitle;
    $('#demoLength').textContent = scenario.length;
    $$('.demo-tab').forEach((tab) => {
      const isActive = tab.dataset.scenario === key;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    renderTranscript(key);
  }

  $$('.demo-tab').forEach((tab) => tab.addEventListener('click', () => setScenario(tab.dataset.scenario)));

  function playSample() {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      showToast('Audio playback is not supported in this browser.');
      return;
    }
    stopPlayback('Preparing sample…');
    const scenario = scenarios[activeScenario];
    utterance = new SpeechSynthesisUtterance(scenario.lines.map((line) => `${line[0]} says: ${line[1]}`).join('. '));
    utterance.rate = 0.93;
    utterance.pitch = 1.02;
    utterance.onstart = () => {
      playing = true;
      callDemo.classList.add('playing');
      playButton.textContent = 'Ⅱ';
      playButton.classList.add('playing');
      $('#demoStatus').textContent = 'Playing sample conversation';
      renderTranscript(activeScenario, 0);
    };
    utterance.onend = () => {
      stopPlayback('Sample call complete');
      renderTranscript(activeScenario);
    };
    utterance.onerror = () => {
      stopPlayback('Sample audio unavailable');
      renderTranscript(activeScenario);
    };
    window.speechSynthesis.speak(utterance);
  }

  playButton.addEventListener('click', () => {
    if (playing || ('speechSynthesis' in window && window.speechSynthesis.paused)) {
      stopPlayback();
      renderTranscript(activeScenario);
    } else playSample();
  });

  function jumpToDemo() {
    $('#listen').scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      if (!playing) playSample();
    }, 700);
  }
  $('#heroSample').addEventListener('click', jumpToDemo);
  $('#ctaSample').addEventListener('click', jumpToDemo);

  $$('.billing-option').forEach((button) => button.addEventListener('click', () => {
    $$('.billing-option').forEach((option) => {
      const active = option === button;
      option.classList.toggle('active', active);
      option.setAttribute('aria-pressed', String(active));
    });
    showToast(button.dataset.billing === 'annual' ? 'Annual pricing is tailored to your business.' : 'Monthly billing selected.');
  }));

  $('#demoForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = [
      'Hello TWIGA AI team,', '',
      'I would like to request a demo.', '',
      `Name: ${data.get('name')}`,
      `Business: ${data.get('business')}`,
      `Email: ${data.get('email')}`,
      `Phone: ${data.get('phone') || 'Not provided'}`,
      `Business type: ${data.get('type')}`,
      '', 'Please let me know the next steps.'
    ].join('\n');
    const url = `mailto:developer.muchemi@proton.me?subject=${encodeURIComponent('TWIGA AI demo request')}&body=${encodeURIComponent(body)}`;
    closeModal();
    window.location.href = url;
    showToast('Your email app should open with the demo request prepared.');
  });
})();