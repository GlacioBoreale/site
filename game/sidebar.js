'use strict';

// ══════════════════════════════════════════════════════════════
//  SETTINGS STATE
// ══════════════════════════════════════════════════════════════
const SETTINGS_KEY = 'glaciopia_settings';
const SETTINGS_DEFAULT = {
  statDisplayMode:          'default',
  uiScale:                  100,
  scientificThreshold:      'never',
  currencyUpdateInterval:   300,
  compactMode:              false,
  buyMaxEnabled:            true,
  buyMaxBoards:             true,
  buyMaxPointUpgrades:      false,
  useGameCursor:            true,
};
let CFG = { ...SETTINGS_DEFAULT };

function loadSettings() {
  try { const r = localStorage.getItem(SETTINGS_KEY); if (r) CFG = { ...SETTINGS_DEFAULT, ...JSON.parse(r) }; } catch (_) {}
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(CFG)); }

// ══════════════════════════════════════════════════════════════
//  CONFIG
//  Ordine: 7 items, il 4° (index 3) è il menu hamburger
//  Quando aperto: escono in coppie simmetriche partendo dal centro
//  Pair 1: index 2 e 4  (±1 dal centro)
//  Pair 2: index 1 e 5  (±2)
//  Pair 3: index 0 e 6  (±3)
// ══════════════════════════════════════════════════════════════
const ITEMS = [
  { id: 'settings',     icon: 'fa-gear',         label: 'Impostazioni', color: 'si-c-settings',  panel: 'panel-settings',     wip: false },  // 0 — top
  { id: 'stats',        icon: 'fa-chart-bar',    label: 'Statistiche',  color: 'si-c-stats',     panel: 'panel-stats',        wip: false },  // 1
  { id: 'achievements', icon: 'fa-trophy',       label: 'Achievements', color: 'si-c-achiev',    panel: 'panel-achievements', wip: false },  // 2
  { id: 'menu',         icon: 'fa-bars',         label: '',             color: '',               panel: null,                 wip: false },  // 3 — MENU BTN
  { id: 'leaderboard',  icon: 'fa-ranking-star', label: 'Leaderboard',  color: 'si-c-leader',    panel: 'panel-leaderboard',  wip: true  },  // 4
  { id: 'updatelog',    icon: 'fa-scroll',       label: 'Update Log',   color: 'si-c-updatelog', panel: 'panel-updatelog',    wip: true  },  // 5
  { id: 'maintenance',  icon: 'fa-wrench',       label: 'Manutenzione', color: 'si-c-maintain',  panel: 'panel-maintenance',  wip: true  },  // 6 — bottom
];

// Pairs to reveal in order (indices into ITEMS, skipping center=3)
const PAIRS = [[2, 4], [1, 5], [0, 6]];
// Delay between each pair appearing (ms) — matches video ~150ms
const PAIR_DELAY = 150;

let menuOpen = false;
let activePanelId = null;
let btnEls = [];   // parallel array to ITEMS
let menuAnimating = false;

// ══════════════════════════════════════════════════════════════
//  BUILD
// ══════════════════════════════════════════════════════════════
function buildSidebar() {
  const wrapper = document.createElement('div');
  wrapper.id = 'sidebar-wrapper';

  ITEMS.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.className = 'sb-btn' + (item.wip ? ' wip' : '') + (i !== 3 ? ' sb-item' : '');
    btn.id = 'sb-btn-' + item.id;

    if (i === 3) {
      // Menu button
      btn.id = 'sb-menu-btn';
      btn.innerHTML = `
        <div class="sb-icon"><i class="fas fa-bars" id="sb-menu-icon"></i></div>
        <div class="sb-label" id="sb-menu-label">MENU</div>
      `;
      btn.addEventListener('click', toggleMenu);
    } else {
      btn.innerHTML = `
        <div class="sb-icon ${item.color}"><i class="fas ${item.icon}"></i></div>
        <div class="sb-label">${item.label}</div>
      `;
      if (!item.wip && item.panel) {
        btn.addEventListener('click', () => {
          if (activePanelId === item.panel) closePanel();
          else openPanel(item.panel);
        });
      }
    }

    wrapper.appendChild(btn);
    btnEls[i] = btn;
  });

  document.body.appendChild(wrapper);

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'panel-overlay';
  overlay.addEventListener('click', closeAll);
  document.body.appendChild(overlay);
}

// ══════════════════════════════════════════════════════════════
//  TOGGLE
// ══════════════════════════════════════════════════════════════
function toggleMenu() {
  if (menuAnimating) return;
  menuOpen = !menuOpen;
  menuAnimating = true;

  const icon  = document.getElementById('sb-menu-icon');
  const label = document.getElementById('sb-menu-label');
  // total anim duration = last pair delay + transition duration
  const totalMs = (PAIRS.length - 1) * PAIR_DELAY + 300;

  if (menuOpen) {
    icon.className  = 'fas fa-times';
    label.textContent = 'CLOSE';
    PAIRS.forEach(([a, b], i) => {
      setTimeout(() => {
        btnEls[a]?.classList.add('visible');
        btnEls[b]?.classList.add('visible');
      }, i * PAIR_DELAY);
    });
  } else {
    icon.className  = 'fas fa-bars';
    label.textContent = 'MENU';
    ITEMS.forEach((_, i) => {
      if (i === 3) return;
      const el = btnEls[i];
      if (!el) return;
      el.style.transitionDelay = '0ms';
      el.classList.remove('visible');
    });
    closePanel();
  }

  setTimeout(() => { menuAnimating = false; }, totalMs);
}

// ══════════════════════════════════════════════════════════════
//  PANELS
// ══════════════════════════════════════════════════════════════
function openPanel(panelId) {
  closePanel();
  const panel = document.getElementById(panelId);
  if (!panel) return;
  panel.classList.add('open');
  document.getElementById('panel-overlay').classList.add('open');
  activePanelId = panelId;
  if (panelId === 'panel-achievements') renderGameAchievements('all');
  if (panelId === 'panel-stats') initStatsPanel();
}

function closePanel() {
  if (activePanelId) {
    document.getElementById(activePanelId)?.classList.remove('open');
    activePanelId = null;
  }
  document.getElementById('panel-overlay')?.classList.remove('open');
}

function closeAll() {
  closePanel();
  if (menuOpen) {
    menuOpen = false;
    const icon  = document.getElementById('sb-menu-icon');
    const label = document.getElementById('sb-menu-label');
    if (icon)  icon.className  = 'fas fa-bars';
    if (label) label.textContent = 'MENU';
    ITEMS.forEach((_, i) => { if (i !== 3) btnEls[i]?.classList.remove('visible'); });
  }
}

// ══════════════════════════════════════════════════════════════
//  BUILD PANELS HTML
// ══════════════════════════════════════════════════════════════
function buildPanels() {
  const insert = html => document.body.insertAdjacentHTML('beforeend', html);

  insert(buildSettingsPanel());
  insert(buildStatsPanel());
  insert(buildAchievementsPanel());
  insert(buildWipPanel('panel-leaderboard',  'Leaderboard',  'fa-ranking-star', 'si-c-leader'));
  insert(buildWipPanel('panel-updatelog',    'Update Log',   'fa-scroll',       'si-c-updatelog'));
  insert(buildWipPanel('panel-maintenance',  'Manutenzione', 'fa-wrench',       'si-c-maintain'));

  document.querySelectorAll('.panel-close').forEach(btn => btn.addEventListener('click', closeAll));

  document.querySelectorAll('#game-ach-filters .game-ach-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#game-ach-filters .game-ach-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGameAchievements(btn.dataset.cat);
    });
  });

  document.querySelectorAll('#panel-settings .stab').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.dataset.tab;
      document.querySelectorAll('#panel-settings .stab').forEach(s => s.classList.toggle('active', s.dataset.tab === t));
      document.querySelectorAll('#panel-settings .settings-tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === t));
    });
  });

  initSettingsControls();
}

function buildSettingsPanel() {
  return `
<div class="game-panel" id="panel-settings">
  <div class="panel-header">
    <span class="panel-title">
      <div class="panel-title-icon si-c-settings"><i class="fas fa-gear"></i></div>
      Impostazioni
    </span>
    <button class="panel-close"><i class="fas fa-times"></i></button>
  </div>
  <div class="settings-tabs">
    <button class="stab active" data-tab="general">Generale</button>
    <button class="stab" data-tab="graphics">Grafiche</button>
    <button class="stab" data-tab="audio">Audio</button>
    <button class="stab" data-tab="keybinds">Comandi</button>
    <button class="stab" data-tab="misc">Misc.</button>
  </div>
  <div class="panel-body">
    <div class="settings-tab-content active" data-tab="general">
      <div class="set-section">Display</div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">stat display mode</span></div>
        <select class="set-select" id="set-statDisplayMode">
          <option value="default">default</option>
          <option value="scientific">scientific</option>
          <option value="engineering">engineering</option>
        </select>
      </div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">ui scale <span id="set-uiScale-val">100</span>%</span></div>
        <div class="set-slider-wrap">
          <input type="range" class="set-slider" id="set-uiScale" min="70" max="130" step="5" value="100">
          <button class="set-reset-btn" id="set-uiScale-reset" title="Reset"><i class="fas fa-rotate-left"></i></button>
        </div>
      </div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">scientific threshold</span></div>
        <select class="set-select" id="set-scientificThreshold">
          <option value="never">never</option>
          <option value="1e6">1M</option>
          <option value="1e9">1B</option>
          <option value="1e12">1T</option>
        </select>
      </div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">currency update interval <span id="set-cui-val">3</span>/s</span></div>
        <div class="set-slider-wrap">
          <input type="range" class="set-slider" id="set-currencyInterval" min="1" max="20" step="1" value="3">
          <button class="set-reset-btn" id="set-cui-reset" title="Reset"><i class="fas fa-rotate-left"></i></button>
        </div>
      </div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">compact mode</span></div>
        <div class="set-checkbox" id="set-compactMode"></div>
      </div>
      <div class="set-section">Gameplay</div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">buy max functionality</span></div>
        <div class="set-checkbox" id="set-buyMaxEnabled"></div>
      </div>
      <div class="set-row indent">
        <div class="set-row-left"><span class="set-label">boards (with right click)</span></div>
        <div class="set-checkbox" id="set-buyMaxBoards"></div>
      </div>
      <div class="set-row indent">
        <div class="set-row-left"><span class="set-label">point upgrades (from #5p)</span></div>
        <div class="set-checkbox" id="set-buyMaxPointUpgrades"></div>
      </div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">use game cursor</span></div>
        <div class="set-checkbox" id="set-useGameCursor"></div>
      </div>
    </div>
    <div class="settings-tab-content" data-tab="graphics">
      <div class="panel-wip"><i class="fas fa-palette"></i>Grafiche — coming soon</div>
    </div>
    <div class="settings-tab-content" data-tab="audio">
      <div class="panel-wip"><i class="fas fa-music"></i>Audio — coming soon</div>
    </div>
    <div class="settings-tab-content" data-tab="keybinds">
      <div class="panel-wip"><i class="fas fa-keyboard"></i>Comandi — coming soon</div>
    </div>
    <div class="settings-tab-content" data-tab="misc">
      <div class="panel-wip"><i class="fas fa-sliders"></i>Misc. — coming soon</div>
    </div>
  </div>
</div>`;
}

function buildAchievementsPanel() {
  return `
<div class="game-panel" id="panel-achievements">
  <div class="panel-header">
    <span class="panel-title">
      <div class="panel-title-icon si-c-achiev"><i class="fas fa-trophy"></i></div>
      Achievements
    </span>
    <button class="panel-close"><i class="fas fa-times"></i></button>
  </div>
  <div class="game-ach-filters" id="game-ach-filters">
    <button class="game-ach-filter active" data-cat="all">Tutti</button>
    <button class="game-ach-filter" data-cat="esplora">Esplora</button>
    <button class="game-ach-filter" data-cat="segreto">Segreti</button>
    <button class="game-ach-filter" data-cat="varie">Varie</button>
  </div>
  <div class="game-ach-progress-wrap">
    <div class="game-ach-progress-bar" id="game-ach-bar"></div>
  </div>
  <div class="panel-body" id="game-ach-list"></div>
</div>`;
}

function renderGameAchievements(cat = 'all') {
  const list = document.getElementById('game-ach-list');
  const bar  = document.getElementById('game-ach-bar');
  if (!list) return;

  // usa loadData / ACHIEVEMENTS dal sistema sito
  const data = typeof loadData === 'function' ? loadData() : {};
  const achs = typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS : [];

  const filtered = cat === 'all' ? [...achs] : achs.filter(a => a.category === cat);
  filtered.sort((a, b) => {
    const ta = data[a.id] || 0, tb = data[b.id] || 0;
    if ((ta > 0) !== (tb > 0)) return ta > 0 ? -1 : 1;
    if (ta && tb) return tb - ta;
    return 0;
  });

  const unlocked = Object.keys(data).length;
  const total    = achs.length;
  if (bar) bar.style.width = total ? (unlocked / total * 100) + '%' : '0%';

  list.innerHTML = '';
  filtered.forEach(ach => {
    const done = !!data[ach.id];
    const date = done ? new Date(data[ach.id]).toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'2-digit' }) : null;
    const row  = document.createElement('div');
    row.className = 'game-ach-row' + (done ? ' unlocked' : ' locked');

    const isSecret = ach.secret && !done;
    const name = isSecret ? '???' : (typeof t === 'function' ? t('ach.' + ach.id + '_name') : ach.name);
    const desc = isSecret
      ? (typeof t === 'function' ? t('ach.' + ach.id + '_hint') : ach.hint)
      : (done
          ? (typeof t === 'function' ? t('ach.' + ach.id + '_desc') : ach.desc)
          : (typeof t === 'function' ? t('ach.' + ach.id + '_hint') : ach.hint));

    row.innerHTML = `
      <div class="game-ach-icon">${isSecret ? '?' : ach.icon}</div>
      <div class="game-ach-body">
        <span class="game-ach-name">${name}</span>
        <span class="game-ach-desc">${desc}</span>
        ${done && date ? `<span class="game-ach-date"><i class="fas fa-calendar-check"></i> ${date}</span>` : ''}
      </div>
      <div class="game-ach-badge ${done ? 'done' : 'lock'}">
        <i class="fas ${done ? 'fa-check' : 'fa-lock'}"></i>
      </div>
    `;
    list.appendChild(row);
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div class="panel-wip"><i class="fas fa-trophy"></i>Nessun achievement qui</div>';
  }
}

function buildWipPanel(id, title, icon, colorClass) {
  return `
<div class="game-panel" id="${id}">
  <div class="panel-header">
    <span class="panel-title">
      <div class="panel-title-icon ${colorClass}"><i class="fas ${icon}"></i></div>
      ${title}
    </span>
    <button class="panel-close"><i class="fas fa-times"></i></button>
  </div>
  <div class="panel-body">
    <div class="panel-wip"><i class="fas ${icon}"></i>${title} — coming soon</div>
  </div>
</div>`;
}

// ══════════════════════════════════════════════════════════════
//  SETTINGS CONTROLS
// ══════════════════════════════════════════════════════════════
function initSettingsControls() {
  function syncAll() {
    ['statDisplayMode','scientificThreshold'].forEach(key => {
      const el = document.getElementById('set-' + key); if (el) el.value = CFG[key];
    });
    ['compactMode','buyMaxEnabled','buyMaxBoards','buyMaxPointUpgrades','useGameCursor'].forEach(key => {
      document.getElementById('set-' + key)?.classList.toggle('checked', !!CFG[key]);
    });
    const uiS = document.getElementById('set-uiScale');
    if (uiS) { uiS.value = CFG.uiScale; document.getElementById('set-uiScale-val').textContent = CFG.uiScale; }
    const cuiS = document.getElementById('set-currencyInterval');
    if (cuiS) { const ips = Math.round(1000/CFG.currencyUpdateInterval); cuiS.value = ips; document.getElementById('set-cui-val').textContent = ips; }
  }
  syncAll();

  document.getElementById('set-statDisplayMode')?.addEventListener('change', e => { CFG.statDisplayMode = e.target.value; saveSettings(); applySettings(); });
  document.getElementById('set-scientificThreshold')?.addEventListener('change', e => { CFG.scientificThreshold = e.target.value; saveSettings(); applySettings(); });

  ['compactMode','buyMaxEnabled','buyMaxBoards','buyMaxPointUpgrades','useGameCursor'].forEach(key => {
    document.getElementById('set-' + key)?.addEventListener('click', () => {
      CFG[key] = !CFG[key];
      document.getElementById('set-' + key)?.classList.toggle('checked', CFG[key]);
      saveSettings(); applySettings();
    });
  });

  document.getElementById('set-uiScale')?.addEventListener('input', e => {
    CFG.uiScale = +e.target.value;
    document.getElementById('set-uiScale-val').textContent = CFG.uiScale;
    saveSettings(); applySettings();
  });
  document.getElementById('set-uiScale-reset')?.addEventListener('click', () => {
    CFG.uiScale = SETTINGS_DEFAULT.uiScale;
    document.getElementById('set-uiScale').value = CFG.uiScale;
    document.getElementById('set-uiScale-val').textContent = CFG.uiScale;
    saveSettings(); applySettings();
  });
  document.getElementById('set-currencyInterval')?.addEventListener('input', e => {
    const ips = +e.target.value;
    CFG.currencyUpdateInterval = Math.round(1000/ips);
    document.getElementById('set-cui-val').textContent = ips;
    window._settingsCurrencyInterval = CFG.currencyUpdateInterval;
    saveSettings();
  });
  document.getElementById('set-cui-reset')?.addEventListener('click', () => {
    CFG.currencyUpdateInterval = SETTINGS_DEFAULT.currencyUpdateInterval;
    const ips = Math.round(1000/CFG.currencyUpdateInterval);
    document.getElementById('set-currencyInterval').value = ips;
    document.getElementById('set-cui-val').textContent = ips;
    window._settingsCurrencyInterval = CFG.currencyUpdateInterval;
    saveSettings();
  });
}

function applySettings() {
  window._settingsCurrencyInterval = CFG.currencyUpdateInterval;
  const canvas = document.getElementById('game-canvas');
  if (canvas) canvas.style.cursor = CFG.useGameCursor ? 'grab' : 'default';
}

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  buildSidebar();
  buildPanels();
  applySettings();
});
