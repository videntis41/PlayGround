(() => {
  const app = document.querySelector('#app');
  const stage = document.querySelector('#scene');
  const footStage = document.querySelector('.foot-stage');
  const toolButtons = [...document.querySelectorAll('.tool')];
  const zones = [...document.querySelectorAll('.zone')];
  const continueBtn = document.querySelector('#continueBtn');
  const resetBtn = document.querySelector('#resetBtn');
  const soundToggle = document.querySelector('#soundToggle');
  const toast = document.querySelector('#toast');
  const floatNote = document.querySelector('#floatNote');
  const sessionTime = document.querySelector('#sessionTime');
  const moodLabel = document.querySelector('#moodLabel');
  const quote = document.querySelector('#quote');
  const progressText = document.querySelector('#progressText');
  const progressBar = document.querySelector('#progressBar');
  const ritualCount = document.querySelector('#ritualCount');
  const nextMilestone = document.querySelector('#nextMilestone');
  const toolHint = document.querySelector('#toolHint');
  const hearts = [...document.querySelectorAll('.heart')];
  const statElements = {
    warmth: [document.querySelector('#warmthValue'), document.querySelector('#warmthBar')],
    softness: [document.querySelector('#softnessValue'), document.querySelector('#softnessBar')],
    glow: [document.querySelector('#glowValue'), document.querySelector('#glowBar')]
  };

  const TOOLS = {
    soak: {
      name: 'Warm soak',
      note: 'soften',
      warmth: 9,
      softness: 4,
      glow: 1,
      devotion: 1,
      progress: 9,
      mood: 'unwinding',
      quote: 'The water is perfect. I can feel my shoulders drop already.',
      whisper: 'warm water, slow exhale'
    },
    scrub: {
      name: 'Sugar scrub',
      note: 'polish',
      warmth: 3,
      softness: 12,
      glow: 3,
      devotion: 2,
      progress: 12,
      mood: 'melting',
      quote: 'That little scratchy bit is my favourite. It wakes everything up.',
      whisper: 'sugar, salt, silk'
    },
    oil: {
      name: 'Warm oil',
      note: 'glow',
      warmth: 5,
      softness: 6,
      glow: 12,
      devotion: 3,
      progress: 13,
      mood: 'glowing',
      quote: 'Oh. That is exactly the right temperature. Don’t rush this part.',
      whisper: 'amber oil, warm palms'
    },
    press: {
      name: 'Reflex press',
      note: 'devotion',
      warmth: 3,
      softness: 2,
      glow: 4,
      devotion: 10,
      progress: 15,
      mood: 'floaty',
      quote: 'How does pressing there make my whole head feel lighter?',
      whisper: 'solar plexus, slow pressure'
    },
    mist: {
      name: 'Rose mist',
      note: 'refresh',
      warmth: 2,
      softness: 4,
      glow: 8,
      devotion: 4,
      progress: 11,
      mood: 'dreamy',
      quote: 'A little cool, then warm again. I like that contrast.',
      whisper: 'rose water, cool air'
    },
    wrap: {
      name: 'Silk wrap',
      note: 'rest',
      warmth: 7,
      softness: 7,
      glow: 5,
      devotion: 7,
      progress: 14,
      mood: 'somewhere else',
      quote: 'I could stay right here. Let the rest of the evening wait.',
      whisper: 'silk, stillness, rest'
    }
  };

  const ZONES = {
    toes: {
      name: 'toes',
      note: 'toes · release',
      quote: 'You found the tense little spot. Of course you did.',
      whisper: 'toes · let go',
      devotion: 4,
      glow: 2
    },
    ball: {
      name: 'ball',
      note: 'ball · ground',
      quote: 'That is the spot from all the pacing. Gentle. Yes, like that.',
      whisper: 'ball · ground down',
      devotion: 4,
      warmth: 2
    },
    arch: {
      name: 'arch',
      note: 'arch · unfurl',
      quote: 'My arch has been holding onto the whole day. Keep tracing.',
      whisper: 'arch · unfurl',
      devotion: 5,
      softness: 2
    },
    heel: {
      name: 'heel',
      note: 'heel · cradle',
      quote: 'Cradled. That is the word for it. I feel held.',
      whisper: 'heel · cradle',
      devotion: 5,
      warmth: 2
    }
  };

  const MILESTONES = [
    { at: 25, label: 'next: soften' },
    { at: 50, label: 'next: deepen' },
    { at: 75, label: 'next: linger' },
    { at: 100, label: 'complete' }
  ];

  const INITIAL = {
    warmth: 34,
    softness: 28,
    glow: 18,
    devotion: 8,
    progress: 12,
    tool: 'soak',
    actions: 0,
    seconds: 0,
    complete: false
  };

  let state = { ...INITIAL };
  let toastTimer = 0;
  let floatTimer = 0;
  let ambient = null;

  const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
  const pad = value => String(value).padStart(2, '0');

  function renderStats() {
    for (const [key, [valueElement, barElement]] of Object.entries(statElements)) {
      valueElement.textContent = pad(state[key]);
      barElement.style.setProperty('--value', `${state[key]}%`);
    }
    progressText.textContent = `${state.progress}%`;
    progressBar.style.setProperty('--value', `${state.progress}%`);
    ritualCount.textContent = `${pad((state.actions % 6) + 1)} / 06`;
    moodLabel.textContent = `mood: ${TOOLS[state.tool]?.mood || 'unwinding'}`;
    document.querySelector('#devotionValue').textContent = pad(state.devotion);
    const heartCount = Math.min(5, Math.ceil(state.devotion / 20));
    hearts.forEach((heart, index) => heart.classList.toggle('is-on', index < heartCount));
    const milestone = MILESTONES.find(item => state.progress < item.at) || MILESTONES[MILESTONES.length - 1];
    nextMilestone.textContent = milestone.label;
    toolHint.textContent = state.complete ? 'ritual complete' : '6 rituals';
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
  }

  function showFloatNote(message) {
    floatNote.textContent = message;
    floatNote.classList.remove('is-visible');
    void floatNote.offsetWidth;
    floatNote.classList.add('is-visible');
    window.clearTimeout(floatTimer);
    floatTimer = window.setTimeout(() => floatNote.classList.remove('is-visible'), 2000);
  }

  function burstAtFoot() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = footStage.getBoundingClientRect();
    const sceneBounds = stage.getBoundingClientRect();
    for (let index = 0; index < 9; index += 1) {
      const particle = document.createElement('span');
      particle.className = 'touch-particle';
      const angle = (Math.PI * 2 * index) / 9 + Math.random() * 0.4;
      const distance = 45 + Math.random() * 90;
      particle.style.left = `${bounds.left - sceneBounds.left + bounds.width * (0.38 + Math.random() * 0.24)}px`;
      particle.style.top = `${bounds.top - sceneBounds.top + bounds.height * (0.36 + Math.random() * 0.3)}px`;
      particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      particle.style.animationDelay = `${Math.random() * 100}ms`;
      stage.appendChild(particle);
      window.setTimeout(() => particle.remove(), 1100);
    }
  }

  function applyTool(toolKey) {
    const tool = TOOLS[toolKey];
    if (!tool || state.complete) return;
    state.tool = toolKey;
    state.actions += 1;
    state.warmth = clamp(state.warmth + tool.warmth);
    state.softness = clamp(state.softness + tool.softness);
    state.glow = clamp(state.glow + tool.glow);
    state.devotion = clamp(state.devotion + tool.devotion);
    state.progress = clamp(state.progress + tool.progress);
    toolButtons.forEach(button => {
      const active = button.dataset.tool === toolKey;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    quote.textContent = `“${tool.quote}”`;
    showToast(`${tool.name} · ${tool.whisper}`);
    showFloatNote(tool.whisper);
    burstAtFoot();
    if (state.progress >= 100) {
      state.complete = true;
      continueBtn.classList.add('is-complete');
      continueBtn.querySelector('span').textContent = 'Ritual complete';
      quote.textContent = '“That was exactly what I needed. Same time next week?”';
      showToast('Ritual complete · devotion 100');
    }
    renderStats();
  }

  function touchZone(zoneKey) {
    const zone = ZONES[zoneKey];
    if (!zone || state.complete) return;
    state.devotion = clamp(state.devotion + zone.devotion);
    state.warmth = clamp(state.warmth + (zone.warmth || 1));
    state.softness = clamp(state.softness + (zone.softness || 1));
    state.glow = clamp(state.glow + (zone.glow || 1));
    state.progress = clamp(state.progress + 3);
    state.actions += 1;
    quote.textContent = `“${zone.quote}”`;
    showToast(`${zone.note} · devotion +${zone.devotion}`);
    showFloatNote(zone.whisper);
    burstAtFoot();
    renderStats();
  }

  function resetSession() {
    state = { ...INITIAL };
    toolButtons.forEach(button => {
      const active = button.dataset.tool === 'soak';
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    continueBtn.classList.remove('is-complete');
    continueBtn.querySelector('span').textContent = 'Continue the ritual';
    quote.textContent = '“I\'ve been on my feet since six. Be gentle with me.”';
    showToast('Session reset · fresh towel, warm water');
    renderStats();
  }

  function tickSession() {
    state.seconds += 1;
    sessionTime.textContent = `${pad(Math.floor(state.seconds / 60))}:${pad(state.seconds % 60)}`;
  }

  function startAmbient() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    filter.Q.value = 0.6;
    filter.connect(master);
    const frequencies = [110, 164.81, 220];
    const oscillators = frequencies.map((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 2 ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.14 : 0.045;
      oscillator.connect(gain);
      gain.connect(filter);
      oscillator.start();
      return oscillator;
    });
    master.gain.linearRampToValueAtTime(0.045, context.currentTime + 1.2);
    return { context, master, oscillators };
  }

  toolButtons.forEach(button => {
    button.addEventListener('click', () => applyTool(button.dataset.tool));
  });

  zones.forEach(zone => {
    zone.addEventListener('click', () => {
      zone.classList.remove('is-hit');
      void zone.offsetWidth;
      zone.classList.add('is-hit');
      touchZone(zone.dataset.zone);
    });
  });

  continueBtn.addEventListener('click', () => {
    if (state.complete) {
      resetSession();
      return;
    }
    const keys = Object.keys(TOOLS);
    const current = keys.indexOf(state.tool);
    applyTool(keys[(current + 1) % keys.length]);
  });

  resetBtn.addEventListener('click', resetSession);

  soundToggle.addEventListener('click', async () => {
    if (!ambient) {
      ambient = startAmbient();
      if (!ambient) {
        showToast('Ambient sound is not available in this browser.');
        return;
      }
      await ambient.context.resume();
      soundToggle.setAttribute('aria-pressed', 'true');
      soundToggle.setAttribute('aria-label', 'Mute ambient sound');
      showToast('Ambient sound on · low light, low hum');
    } else {
      ambient.master.gain.linearRampToValueAtTime(0, ambient.context.currentTime + 0.3);
      const current = ambient;
      ambient = null;
      window.setTimeout(() => current.context.close().catch(() => {}), 400);
      soundToggle.setAttribute('aria-pressed', 'false');
      soundToggle.setAttribute('aria-label', 'Toggle ambient sound');
      showToast('Ambient sound off');
    }
  });

  stage.addEventListener('pointermove', event => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = stage.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    footStage.style.transform = `translateX(-50%) translate(${x * -5}px, ${y * -4}px)`;
  });

  stage.addEventListener('pointerleave', () => {
    footStage.style.transform = '';
  });

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const style = document.createElement('style');
  style.textContent = `
    .touch-particle {
      position: absolute;
      z-index: 11;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #ffe2bd;
      box-shadow: 0 0 9px rgba(255, 210, 160, .9);
      pointer-events: none;
      animation: touch-burst 900ms ease-out forwards;
    }
    @keyframes touch-burst {
      0% { opacity: 0; transform: translate(0, 0) scale(.5); }
      20% { opacity: 1; }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.1); }
    }
  `;
  document.head.appendChild(style);

  renderStats();
  sessionTime.textContent = '00:00';
  window.setInterval(tickSession, 1000);
  window.setTimeout(() => {
    app.dataset.appReady = 'true';
  }, 250);
})();
