const SHADES = {
  coral: { name: 'Coral', hex: '#ff6f61' },
  blush: { name: 'Blush', hex: '#ffb3c1' },
  plum: { name: 'Plum', hex: '#8e5a8f' },
  gold: { name: 'Gold', hex: '#e8b55b' },
  mint: { name: 'Mint', hex: '#7ec8b0' }
};

const TOOLS = {
  oil: 'Massage oil',
  scrub: 'Sugar scrub',
  lotion: 'Shea lotion',
  polish: 'Polish'
};

const CLIENTS = [
  {
    name: 'Mira',
    initial: 'M',
    mood: 'Sunset stroll · tired but hopeful',
    quote: 'I have been on my feet all day. Something warm, please.',
    tip: 24,
    note: 'The arch holds the day. Work slowly, and let the oil warm between your palms.',
    steps: [
      { type: 'massage', tool: 'oil', zone: 'arch', count: 3, verb: 'Warm-up massage', action: 'Massage the arch', detail: 'Warm oil, slow circles' },
      { type: 'polish', color: 'coral', colorName: 'Coral', count: 5, verb: 'Coral gloss', action: 'Paint every toenail', detail: 'Coral, high gloss' },
      { type: 'lotion', tool: 'lotion', zone: 'heel', count: 1, verb: 'Seal the heel', action: 'Seal the heel', detail: 'Lotion, gentle press' }
    ]
  },
  {
    name: 'Jules',
    initial: 'J',
    mood: 'Bookshop closing shift · quietly glowing',
    quote: 'The ball of my foot is one big knot. Be brave about it.',
    tip: 32,
    note: 'A firm touch is a kindness here. Scrub first, then let the plum do the talking.',
    steps: [
      { type: 'massage', tool: 'scrub', zone: 'ball', count: 4, verb: 'Sugar scrub', action: 'Buff the ball', detail: 'Sugar scrub, firm circles' },
      { type: 'polish', color: 'plum', colorName: 'Plum', count: 5, verb: 'Plum lacquer', action: 'Paint every toenail', detail: 'Plum, glass finish' },
      { type: 'lotion', tool: 'lotion', zone: 'arch', count: 2, verb: 'Arch seal', action: 'Lotion the arch', detail: 'Shea lotion, slow press' }
    ]
  },
  {
    name: 'Noor',
    initial: 'N',
    mood: 'Dance rehearsal · ready for a reset',
    quote: 'Gold, please. Something that catches the light when I move.',
    tip: 41,
    note: 'Noor notices tiny details. Keep the heel soft and the gold layer even.',
    steps: [
      { type: 'massage', tool: 'oil', zone: 'heel', count: 3, verb: 'Heel rescue', action: 'Massage the heel', detail: 'Warm oil, deep press' },
      { type: 'polish', color: 'gold', colorName: 'Gold', count: 5, verb: 'Gold leaf', action: 'Paint every toenail', detail: 'Gold, high shine' },
      { type: 'lotion', tool: 'lotion', zone: 'ball', count: 2, verb: 'Final glow', action: 'Lotion the ball', detail: 'Shea lotion, feather-light' }
    ]
  }
];

const NAIL_IDS = ['big', 'two', 'three', 'four', 'five'];

const state = {
  started: false,
  busy: false,
  clientIndex: 0,
  stepIndex: 0,
  progress: 0,
  money: 0,
  comfort: 70,
  tool: 'oil',
  shade: null,
  painted: new Set(),
  polishedColor: null,
  ritualComplete: false,
  clientsServed: 0,
  comfortSum: 0
};

const app = document.getElementById('app');
const menu = document.getElementById('menu');
const studio = document.getElementById('studio');
const summary = document.getElementById('summary');
const foot = document.getElementById('foot');
const toastEl = document.getElementById('toast');
const collectBtn = document.getElementById('collect');
const stepList = document.getElementById('step-list');
const toolsEl = document.getElementById('tools');
const shadesEl = document.getElementById('shades');
const howTo = document.getElementById('how-to-dialog');

let toastTimer = 0;

function currentClient() {
  return CLIENTS[state.clientIndex] || CLIENTS[0];
}

function currentStep() {
  return currentClient().steps[state.stepIndex] || null;
}

function comfortBonus() {
  if (state.comfort >= 90) return 8;
  if (state.comfort >= 80) return 4;
  return 0;
}

function setScreen(name) {
  menu.hidden = name !== 'menu';
  studio.hidden = name !== 'studio';
  summary.hidden = name !== 'summary';
  app.dataset.screen = name;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function toast(message, tone = '') {
  window.clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.dataset.tone = tone;
  toastEl.classList.add('show');
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2100);
}

function setComfort(value) {
  state.comfort = Math.max(0, Math.min(100, value));
}

function renderSteps() {
  const client = currentClient();
  stepList.innerHTML = client.steps.map((step, index) => {
    const done = index < state.stepIndex;
    const active = index === state.stepIndex && !state.ritualComplete;
    const shown = done ? step.count : active ? Math.min(state.progress, step.count) : 0;
    const label = step.type === 'polish' ? `${step.action} ${step.colorName}` : step.action;
    return `
      <li class="step${active ? ' is-active' : ''}${done ? ' is-done' : ''}">
        <span class="step-index">${done ? '✓' : index + 1}</span>
        <span class="step-body">
          <p>${label}</p>
          <small>${step.detail}</small>
        </span>
        <span class="step-count">${shown}/${step.count}</span>
      </li>`;
  }).join('');
}

function renderTools() {
  toolsEl.querySelectorAll('[data-tool]').forEach(button => {
    const active = state.tool === button.dataset.tool;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  shadesEl.querySelectorAll('[data-shade]').forEach(button => {
    const active = state.shade === button.dataset.shade;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function renderNails() {
  foot.querySelectorAll('.nail-wrap').forEach(wrap => {
    const nail = wrap.dataset.nail;
    const painted = state.painted.has(nail) && state.polishedColor;
    if (painted) {
      wrap.style.setProperty('--nail-color', SHADES[state.polishedColor].hex);
    } else {
      wrap.style.removeProperty('--nail-color');
    }
    const step = currentStep();
    const shouldPulse = step && step.type === 'polish' && !state.ritualComplete && !state.painted.has(nail) && state.tool === 'polish' && state.shade === step.color;
    wrap.classList.toggle('polishing', Boolean(shouldPulse));
  });
}

function renderHint() {
  const hint = document.getElementById('hint');
  if (state.ritualComplete) {
    hint.textContent = 'Every detail is finished. The tip is waiting.';
    return;
  }
  const step = currentStep();
  if (!step) return;
  if (step.type === 'polish') {
    const remaining = step.count - state.progress;
    if (!state.shade) hint.textContent = 'Choose a shade from the polish bar.';
    else if (state.shade !== step.color) hint.textContent = `${currentClient().name} asked for ${step.colorName}. Choose that shade.`;
    else hint.textContent = `${remaining} toenail${remaining === 1 ? '' : 's'} left. Tap each nail.`;
    return;
  }
  const toolName = TOOLS[step.tool].toLowerCase();
  if (state.tool !== step.tool) hint.textContent = `Reach for the ${toolName}, then work the ${step.zone}.`;
  else hint.textContent = `${TOOLS[step.tool]} selected. Work the glowing ${step.zone}.`;
}

function render() {
  const client = currentClient();
  const step = currentStep();

  document.getElementById('stat-money').textContent = `$${state.money}`;
  document.getElementById('stat-shift').textContent = String(state.clientIndex + 1);
  document.getElementById('stat-vibe').textContent = state.comfort >= 90 ? 'Radiant' : state.comfort >= 80 ? 'Calm' : state.comfort >= 65 ? 'Soft' : 'Tense';

  document.getElementById('client-avatar').textContent = client.initial;
  document.getElementById('client-name').textContent = client.name;
  document.getElementById('client-mood').textContent = client.mood;
  document.getElementById('client-quote').textContent = client.quote;
  document.getElementById('client-tip').textContent = `$${client.tip}`;
  document.getElementById('client-bonus').textContent = state.ritualComplete ? `Comfort bonus +$${comfortBonus()}` : 'Comfort bonus at 80+';
  document.getElementById('stage-client').textContent = client.name;
  document.getElementById('stage-title').textContent = state.ritualComplete ? 'Final check' : step ? step.verb : 'Ready';
  document.getElementById('house-note').textContent = client.note;
  document.getElementById('comfort-value').textContent = String(state.comfort);
  document.getElementById('comfort-fill').style.width = `${state.comfort}%`;

  const activeName = state.tool === 'polish'
    ? `${SHADES[state.shade]?.name || ''} polish`.trim()
    : TOOLS[state.tool];
  document.getElementById('active-tool-name').textContent = activeName;

  if (state.ritualComplete) {
    collectBtn.hidden = false;
    collectBtn.textContent = `Collect $${client.tip + comfortBonus()}`;
    foot.dataset.target = '';
  } else {
    collectBtn.hidden = true;
    foot.dataset.target = !step ? '' : step.type === 'polish' ? 'toes' : step.zone;
  }

  renderSteps();
  renderTools();
  renderNails();
  renderHint();
}

function applyToolForStep(step) {
  if (!step) return;
  if (step.type === 'polish') {
    state.tool = 'polish';
    state.shade = step.color;
  } else {
    state.tool = step.tool;
    state.shade = null;
  }
}

function resetNails() {
  state.painted.clear();
  state.polishedColor = null;
}

function loadClient(index) {
  state.clientIndex = index;
  state.stepIndex = 0;
  state.progress = 0;
  state.comfort = 70;
  state.ritualComplete = false;
  state.busy = false;
  resetNails();
  applyToolForStep(currentStep());
  render();
}

function startGame() {
  state.started = true;
  state.money = 0;
  state.clientsServed = 0;
  state.comfortSum = 0;
  state.clientIndex = 0;
  state.stepIndex = 0;
  state.progress = 0;
  state.tool = 'oil';
  state.shade = null;
  state.ritualComplete = false;
  state.busy = false;
  resetNails();
  setScreen('studio');
  loadClient(0);
  document.body.dataset.studioReady = 'true';
}

function afterProgress() {
  const step = currentStep();
  const client = currentClient();
  if (!step || state.progress < step.count) {
    render();
    return;
  }
  state.stepIndex += 1;
  state.progress = 0;
  if (state.stepIndex >= client.steps.length) {
    state.ritualComplete = true;
    toast('Ritual complete. The tip is yours.', 'good');
    render();
    return;
  }
  const next = currentStep();
  applyToolForStep(next);
  toast(`Lovely. Next: ${next.action.toLowerCase()}.`, 'good');
  render();
}

function flashZone(zone) {
  const el = foot.querySelector(`.zone[data-zone="${zone}"]`);
  if (!el) return;
  el.classList.remove('flash');
  el.getBoundingClientRect();
  el.classList.add('flash');
  window.setTimeout(() => el.classList.remove('flash'), 460);
}

function pulseNail(nail) {
  const wrap = foot.querySelector(`.nail-wrap[data-nail="${nail}"]`);
  if (!wrap) return;
  wrap.classList.remove('just-painted');
  wrap.getBoundingClientRect();
  wrap.classList.add('just-painted');
  window.setTimeout(() => wrap.classList.remove('just-painted'), 440);
}

function handleAction(zone, nail) {
  if (!state.started || state.busy || state.ritualComplete) return;
  const step = currentStep();
  if (!step) return;
  const client = currentClient();

  if (step.type === 'polish') {
    if (!nail) {
      toast('Use the nail tips for polish.', 'hint');
      return;
    }
    if (state.tool !== 'polish') {
      toast('Choose a polish shade first.', 'hint');
      return;
    }
    if (state.shade !== step.color) {
      toast(`${client.name} asked for ${step.colorName}, not ${SHADES[state.shade]?.name || 'that'}.`, 'hint');
      setComfort(state.comfort - 2);
      render();
      return;
    }
    if (state.painted.has(nail)) {
      toast('That toenail is already finished.', 'hint');
      return;
    }
    state.painted.add(nail);
    state.polishedColor = step.color;
    state.progress += 1;
    setComfort(state.comfort + 2);
    pulseNail(nail);
    const remaining = step.count - state.progress;
    if (remaining > 0) toast(`${SHADES[step.color].name} on. ${remaining} to go.`, 'good');
    afterProgress();
    return;
  }

  if (state.tool !== step.tool) {
    toast(`Reach for the ${TOOLS[step.tool].toLowerCase()} first.`, 'hint');
    return;
  }
  if (zone !== step.zone) {
    toast(`The ${step.zone} still needs you tonight.`, 'hint');
    setComfort(state.comfort - 2);
    render();
    return;
  }

  state.progress += 1;
  setComfort(state.comfort + (step.type === 'lotion' ? 5 : 3));
  flashZone(step.zone);
  toast(step.type === 'massage' ? 'Slow circles. That is the spot.' : 'Sealed with a soft press.', 'good');
  afterProgress();
}

function collectTip() {
  if (!state.ritualComplete || state.busy) return;
  state.busy = true;
  const client = currentClient();
  const total = client.tip + comfortBonus();
  state.money += total;
  state.clientsServed += 1;
  state.comfortSum += state.comfort;
  render();
  toast(`${client.name} leaves a $${total} tip.`, 'good');

  if (state.clientIndex + 1 < CLIENTS.length) {
    window.setTimeout(() => {
      loadClient(state.clientIndex + 1);
      toast(`Next guest: ${currentClient().name}.`, '');
    }, 720);
  } else {
    window.setTimeout(showSummary, 760);
  }
}

function showSummary() {
  state.busy = false;
  const average = state.clientsServed ? Math.round(state.comfortSum / state.clientsServed) : 0;
  document.getElementById('summary-guests').textContent = String(state.clientsServed);
  document.getElementById('summary-money').textContent = `$${state.money}`;
  document.getElementById('summary-comfort').textContent = String(average);
  const note = average >= 90
    ? 'Every detail landed. The last guest leaves with a softer step and a brighter mood.'
    : average >= 80
      ? 'A warm, careful shift. The studio smells like sugar and the tips agree.'
      : 'A gentle shift with room to grow. The next ritual will be even more deliberate.';
  document.getElementById('summary-note').textContent = note;
  setScreen('summary');
}

function selectTool(tool) {
  if (state.busy || state.ritualComplete) return;
  state.tool = tool;
  state.shade = null;
  render();
}

function selectShade(shade) {
  if (state.busy || state.ritualComplete) return;
  state.tool = 'polish';
  state.shade = shade;
  render();
}

foot.addEventListener('click', event => {
  const nailEl = event.target.closest('[data-nail]');
  const zoneEl = event.target.closest('[data-zone]');
  const nail = nailEl ? nailEl.dataset.nail : null;
  const zone = zoneEl ? zoneEl.dataset.zone : nail ? 'toes' : null;
  if (!zone && !nail) return;
  handleAction(zone, nail);
});

toolsEl.addEventListener('click', event => {
  const button = event.target.closest('[data-tool]');
  if (button) selectTool(button.dataset.tool);
});

shadesEl.addEventListener('click', event => {
  const button = event.target.closest('[data-shade]');
  if (button) selectShade(button.dataset.shade);
});

collectBtn.addEventListener('click', collectTip);

document.getElementById('start-game').addEventListener('click', startGame);

document.getElementById('new-shift').addEventListener('click', () => {
  startGame();
  toast('A fresh evening. First guest is ready.', '');
});

document.getElementById('back-menu').addEventListener('click', () => {
  setScreen('menu');
});

document.getElementById('brand-home').addEventListener('click', event => {
  event.preventDefault();
  setScreen('menu');
});

document.getElementById('how-to').addEventListener('click', () => {
  if (typeof howTo.showModal === 'function') howTo.showModal();
  else howTo.setAttribute('open', '');
});

document.getElementById('close-how-to').addEventListener('click', () => {
  howTo.close();
});

howTo.addEventListener('click', event => {
  if (event.target === howTo) howTo.close();
});

render();

requestAnimationFrame(() => {
  app.dataset.ready = 'true';
});
