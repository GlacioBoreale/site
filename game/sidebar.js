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
  lightTheme:               false,
  showConnections:          true,
  showGrid:                 true,
  radioVolume:              80,
  radioMuted:               false,
};
let CFG = { ...SETTINGS_DEFAULT };

function loadSettings() {
  try { const r = localStorage.getItem(SETTINGS_KEY); if (r) CFG = { ...SETTINGS_DEFAULT, ...JSON.parse(r) }; } catch (_) {}
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(CFG)); }



const ITEMS = [
  { id: 'settings',     icon: 'fa-gear',         labelKey: 'sidebar.settings',     color: 'si-c-settings',  panel: 'panel-settings',     wip: false },
  { id: 'stats',        icon: 'fa-chart-bar',    labelKey: 'sidebar.stats',        color: 'si-c-stats',     panel: 'panel-stats',        wip: false },
  { id: 'achievements', icon: 'fa-trophy',       labelKey: 'sidebar.achievements', color: 'si-c-achiev',    panel: 'panel-achievements', wip: false },
  { id: 'menu',         icon: 'fa-bars',         labelKey: 'sidebar.menu',         color: '',               panel: null,                 wip: false },
  { id: 'leaderboard',  icon: 'fa-ranking-star', labelKey: 'sidebar.leaderboard',  color: 'si-c-leader',    panel: 'panel-leaderboard',  wip: false  },
  { id: 'updatelog',    icon: 'fa-scroll',       labelKey: 'sidebar.updatelog',    color: 'si-c-updatelog', panel: 'panel-updatelog',    wip: true  },
  { id: 'maintenance',  icon: 'fa-wrench',       labelKey: 'sidebar.maintenance',  color: 'si-c-maintain',  panel: 'panel-maintenance',  wip: true  },
];
function _sbLabel(item) { return gt(item.labelKey) || item.labelKey; }

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
      btn.id = 'sb-menu-btn';
      btn.innerHTML = `
        <div class="sb-icon"><i class="fas fa-bars" id="sb-menu-icon"></i></div>
        <div class="sb-label" id="sb-menu-label">${_sbLabel(item)}</div>
      `;
      btn.addEventListener('click', toggleMenu);
    } else {
      btn.innerHTML = `
        <div class="sb-icon ${item.color}"><i class="fas ${item.icon}"></i></div>
        <div class="sb-label">${_sbLabel(item)}</div>
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
    label.textContent = gt('sidebar.close') || 'CLOSE';
    PAIRS.forEach(([a, b], i) => {
      setTimeout(() => {
        btnEls[a]?.classList.add('visible');
        btnEls[b]?.classList.add('visible');
      }, i * PAIR_DELAY);
    });
  } else {
    icon.className  = 'fas fa-bars';
    label.textContent = gt('sidebar.menu') || 'MENU';
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
  document.getElementById('sidebar-wrapper')?.classList.add('panel-open');
  activePanelId = panelId;
  if (panelId === 'panel-achievements') renderGameAchievements('all');
  if (panelId === 'panel-stats') initStatsPanel();
  if (panelId === 'panel-leaderboard') initLeaderboard();
  if (panelId === 'panel-settings') {
    const buyMaxRow = document.querySelector('.set-row.indent[data-key="buyMaxPointUpgrades"]');
    if (buyMaxRow) buyMaxRow.style.display = (typeof G !== 'undefined' && G.fastAndFurious) ? '' : 'none';
  }
}

function closePanel() {
  if (activePanelId) {
    document.getElementById(activePanelId)?.classList.remove('open');
    activePanelId = null;
  }
  document.getElementById('panel-overlay')?.classList.remove('open');
  document.getElementById('sidebar-wrapper')?.classList.remove('panel-open');
}

function closeAll() {
  closePanel();
  if (menuOpen) {
    menuOpen = false;
    const icon  = document.getElementById('sb-menu-icon');
    const label = document.getElementById('sb-menu-label');
    if (icon)  icon.className  = 'fas fa-bars';
    if (label) label.textContent = gt('sidebar.menu') || 'MENU';
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
  insert(buildLeaderboardPanel());
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
      <div class="set-section" data-i18n="settings.sectionDisplay"></div>
      <div class="set-row">
        <div class="set-row-left">
          <span class="set-label">formato numeri</span>
          <span class="set-sublabel">come vengono mostrati i numeri grandi</span>
        </div>
        <select class="set-select" id="set-statDisplayMode">
          <option value="default">abbreviato</option>
          <option value="scientific">scientifico</option>
        </select>
      </div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">scala UI <span id="set-uiScale-val">100</span>%</span></div>
        <div class="set-slider-wrap">
          <input type="range" class="set-slider" id="set-uiScale" min="70" max="130" step="5" value="100">
          <button class="set-reset-btn" id="set-uiScale-reset" title="Reset"><i class="fas fa-rotate-left"></i></button>
        </div>
      </div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">aggiornamento valuta <span id="set-cui-val">3</span>/s</span>
          <span class="set-sublabel">frequenza di aggiornamento del display ₽</span>
        </div>
        <div class="set-slider-wrap">
          <input type="range" class="set-slider" id="set-currencyInterval" min="1" max="20" step="1" value="3">
          <button class="set-reset-btn" id="set-cui-reset" title="Reset"><i class="fas fa-rotate-left"></i></button>
        </div>
      </div>
      <div class="set-section" data-i18n="settings.sectionGameplay"></div>
      <div class="set-row">
        <div class="set-row-left">
          <span class="set-label">compra massimo</span>
          <span class="set-sublabel">abilita la funzione compra max</span>
        </div>
        <div class="set-checkbox" id="set-buyMaxEnabled"></div>
      </div>
      <div class="set-row indent">
        <div class="set-row-left"><span class="set-label">boards (tasto destro)</span></div>
        <div class="set-checkbox" id="set-buyMaxBoards"></div>
      </div>
      <div class="set-row indent" data-key="buyMaxPointUpgrades">
        <div class="set-row-left"><span class="set-label">upgrade punti (da #5p)</span></div>
        <div class="set-checkbox" id="set-buyMaxPointUpgrades"></div>
      </div>
      <div class="set-row">
        <div class="set-row-left">
          <span class="set-label">cursore di gioco</span>
          <span class="set-sublabel">usa il cursore grab sul canvas</span>
        </div>
        <div class="set-checkbox" id="set-useGameCursor"></div>
      </div>
    </div>
    <div class="settings-tab-content" data-tab="graphics">
      <div class="set-section" data-i18n="settings.sectionTheme"></div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">tema scuro / chiaro</span></div>
        <div class="set-checkbox" id="set-lightTheme"></div>
      </div>
      <div class="set-section" data-i18n="settings.sectionNodes"></div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">mostra connessioni</span></div>
        <div class="set-checkbox" id="set-showConnections"></div>
      </div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">mostra griglia</span></div>
        <div class="set-checkbox" id="set-showGrid"></div>
      </div>
    </div>
    <div class="settings-tab-content" data-tab="audio">
      <div class="set-section" data-i18n="settings.sectionRadio"></div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">volume <span id="set-radioVol-val">80</span>%</span></div>
        <div class="set-slider-wrap">
          <input type="range" class="set-slider" id="set-radioVolume" min="0" max="100" step="5" value="80">
          <button class="set-reset-btn" id="set-radioVol-reset" title="Reset"><i class="fas fa-rotate-left"></i></button>
        </div>
      </div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">muto</span></div>
        <div class="set-checkbox" id="set-radioMuted"></div>
      </div>
    </div>
    <div class="settings-tab-content" data-tab="keybinds">
      <div class="set-section" data-i18n="settings.sectionCamera"></div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">ricentra vista</span></div>
        <span class="set-keybind">Home</span>
      </div>
      <div class="set-row">
        <div class="set-row-left"><span class="set-label">apri menu</span></div>
        <span class="set-keybind">Tab</span>
      </div>

    </div>
    <div class="settings-tab-content" data-tab="misc">
      <div class="set-section" data-i18n="settings.sectionPartita"></div>
      <div class="set-row">
        <div class="set-row-left">
          <span class="set-label">Reset partita</span>
          <span class="set-sublabel">Cancella tutti i progressi e ricomincia da zero</span>
        </div>
        <button class="set-danger-btn" id="set-reset-btn"><i class="fas fa-rotate-left"></i> Reset</button>
      </div>
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

// ══════════════════════════════════════════════════════════════
//  LEADERBOARD
// ══════════════════════════════════════════════════════════════
function buildLeaderboardPanel() {
  return `
<div class="game-panel" id="panel-leaderboard">
  <div class="panel-header">
    <span class="panel-title">
      <div class="panel-title-icon si-c-leader"><i class="fas fa-ranking-star"></i></div>
      Leaderboard
    </span>
    <button class="panel-close"><i class="fas fa-times"></i></button>
  </div>
  <div class="lb-optin-row" id="lb-optin-row">
    <span class="lb-optin-label" id="lb-optin-label"></span>
    <button class="lb-optin-btn" id="lb-optin-btn"></button>
  </div>
  <div class="lb-tabs">
    <button class="lb-tab active" data-lbtab="points">₽ Points</button>
    <button class="lb-tab" data-lbtab="prestige">✦ Prestige</button>
    <button class="lb-tab" data-lbtab="xp_level">XP Level</button>
  </div>
  <div class="panel-body" id="lb-body">
    <div class="lb-loading"><i class="fas fa-spinner fa-spin"></i></div>
  </div>
</div>`;
}

let _lbData = null;
let _lbLoaded = false;

async function loadLeaderboard() {
  const body = document.getElementById('lb-body');
  const row  = document.getElementById('lb-optin-row');
  if (!body) return;

  if (typeof G === 'undefined' || !G.leaderboardUnlocked) {
    body.innerHTML = `<div class="panel-wip"><i class="fas fa-lock"></i> Sblocca l'upgrade "Nella storia" a sinistra di #9 per partecipare</div>`;
    if (row) row.style.display = 'none';
    return;
  }

  body.innerHTML = '<div class="lb-loading"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    if (typeof Api === 'undefined') throw new Error('no api');
    const raw = await Api.leaderboard.get();
    _lbData = raw.leaderboard || raw;
    _lbLoaded = true;
    renderLeaderboard();
  } catch (_) {
    body.innerHTML = `<div class="panel-wip"><i class="fas fa-ranking-star"></i>${gt('lb.noData') || 'Nessun dato'}</div>`;
  }
}

function renderLeaderboard() {
  const body = document.getElementById('lb-body');
  if (!body || !_lbData) return;
  const tab = document.querySelector('.lb-tab.active')?.dataset.lbtab || 'points';
  const rows = [...(_lbData[tab] || [])].sort((a, b) => b[tab] - a[tab]);
  const myUser = typeof Auth !== 'undefined' && Auth.isLoggedIn() ? Auth.getUser() : null;

  if (!rows.length) {
    body.innerHTML = `<div class="panel-wip"><i class="fas fa-ranking-star"></i>${gt('lb.noData') || 'Nessun dato'}</div>`;
    return;
  }

  body.innerHTML = rows.map((r, i) => {
    const isMe = myUser && r.username === myUser.username;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span class="lb-rank">#${i + 1}</span>`;
    const val = tab === 'points' ? fmt(r[tab]) + ' ₽'
              : tab === 'prestige' ? fmt(r[tab]) + ' ✦'
              : (gt('lb.level') || 'Lv') + ' ' + r[tab];
    return `<div class="lb-row${isMe ? ' lb-me' : ''}">
      <span class="lb-pos">${medal}</span>
      <span class="lb-name">${r.username}</span>
      <span class="lb-val">${val}</span>
    </div>`;
  }).join('');
  if (!myUser) {
    const note = document.createElement('div');
    note.className = 'lb-guest-note';
    note.innerHTML = `<i class="fas fa-circle-info"></i> ${gt('lb.loginToAppear') || 'Accedi per apparire in classifica'}`;
    body.appendChild(note);
  }
}

function _syncLbOptinBtn() {
  const row = document.getElementById('lb-optin-row');
  const lbl = document.getElementById('lb-optin-label');
  const btn = document.getElementById('lb-optin-btn');
  if (!row || !lbl || !btn) return;
  const loggedIn = typeof Auth !== 'undefined' && Auth.isLoggedIn();
  if (!loggedIn) {
    lbl.textContent = gt('lb.loginToAppear') || 'Accedi per apparire in classifica';
    btn.style.display = 'none';
    row.style.display = '';
    return;
  }
  const optIn = !!(typeof G !== 'undefined' && G.leaderboardOptIn);
  lbl.textContent = optIn
    ? (gt('lb.optedIn')  || 'Sei visibile in classifica')
    : (gt('lb.optedOut') || 'Non sei visibile in classifica');
  btn.textContent = optIn
    ? (gt('lb.optOut') || 'Rimuoviti')
    : (gt('lb.optIn')  || 'Partecipa');
  btn.className = 'lb-optin-btn' + (optIn ? ' lb-optin-btn--in' : '');
  btn.style.display = '';
  row.style.display = '';
}

function initLeaderboard() {
  document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (_lbLoaded) renderLeaderboard();
    });
  });
  const optBtn = document.getElementById('lb-optin-btn');
  if (optBtn) {
    optBtn.addEventListener('click', () => {
      if (typeof G === 'undefined') return;
      G.leaderboardOptIn = !G.leaderboardOptIn;
      _syncLbOptinBtn();
      if (typeof saveGame === 'function') saveGame();
    });
  }
  _syncLbOptinBtn();
  loadLeaderboard();
}

function initLeaderboardPanel() { initLeaderboard(); }

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
    document.getElementById('set-uiScale-val').textContent = e.target.value;
  });
  document.getElementById('set-uiScale')?.addEventListener('change', e => {
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
  // Grafiche
  document.getElementById('set-lightTheme')?.classList.toggle('checked', !!CFG.lightTheme);
  document.getElementById('set-lightTheme')?.addEventListener('click', () => {
    CFG.lightTheme = !CFG.lightTheme;
    document.getElementById('set-lightTheme')?.classList.toggle('checked', CFG.lightTheme);
    saveSettings(); applySettings();
  });
  document.getElementById('set-showConnections')?.classList.toggle('checked', !!CFG.showConnections);
  document.getElementById('set-showConnections')?.addEventListener('click', () => {
    CFG.showConnections = !CFG.showConnections;
    document.getElementById('set-showConnections')?.classList.toggle('checked', CFG.showConnections);
    saveSettings(); applySettings();
  });
  document.getElementById('set-showGrid')?.classList.toggle('checked', !!CFG.showGrid);
  document.getElementById('set-showGrid')?.addEventListener('click', () => {
    CFG.showGrid = !CFG.showGrid;
    document.getElementById('set-showGrid')?.classList.toggle('checked', CFG.showGrid);
    saveSettings(); applySettings();
  });

  // Audio
  const radioVolEl = document.getElementById('set-radioVolume');
  const radioVolVal = document.getElementById('set-radioVol-val');
  if (radioVolEl) { radioVolEl.value = CFG.radioVolume; if (radioVolVal) radioVolVal.textContent = CFG.radioVolume; }
  radioVolEl?.addEventListener('input', e => {
    CFG.radioVolume = +e.target.value;
    if (radioVolVal) radioVolVal.textContent = CFG.radioVolume;
    saveSettings(); applySettings();
  });
  document.getElementById('set-radioVol-reset')?.addEventListener('click', () => {
    CFG.radioVolume = SETTINGS_DEFAULT.radioVolume;
    if (radioVolEl) radioVolEl.value = CFG.radioVolume;
    if (radioVolVal) radioVolVal.textContent = CFG.radioVolume;
    saveSettings(); applySettings();
  });
  document.getElementById('set-radioMuted')?.classList.toggle('checked', !!CFG.radioMuted);
  document.getElementById('set-radioMuted')?.addEventListener('click', () => {
    CFG.radioMuted = !CFG.radioMuted;
    document.getElementById('set-radioMuted')?.classList.toggle('checked', CFG.radioMuted);
    saveSettings(); applySettings();
  });

  // Keybinds reali
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Home') { document.getElementById('btn-center')?.click(); }
    if (e.key === 'Tab')  { e.preventDefault(); document.getElementById('sb-menu-btn')?.click(); }
  });

  document.getElementById('set-reset-btn')?.addEventListener('click', () => {
    if (typeof openResetDialog === 'function') openResetDialog();
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

  // cursore canvas
  const canvas = document.getElementById('game-canvas');
  if (canvas) canvas.style.cursor = CFG.useGameCursor ? 'grab' : 'default';

  // tema
  document.documentElement.setAttribute('data-theme', CFG.lightTheme ? 'light' : 'dark');

  // griglia / connessioni
  window._cfgShowConnections = CFG.showConnections;
  window._cfgShowGrid        = CFG.showGrid;

  // scala UI — agisce su sidebar, panels, radio, leveling, stats bar
  const scale = CFG.uiScale / 100;
  document.documentElement.style.setProperty('--ui-scale', scale);
  // scala elementi UI — usa zoom su elementi che hanno già transform propri
  const spb = document.querySelector('#stats-pinned-bar');
  if (spb) spb.style.zoom = scale;
  // sidebar e panels: font-size relativo
  const sw = document.getElementById('sidebar-wrapper');
  if (sw) sw.style.zoom = scale;
  document.querySelectorAll('.game-panel').forEach(el => { el.style.zoom = scale; });
  // radio
  const rw = document.getElementById('radio-widget');
  if (rw) rw.style.zoom = scale;

  // formato numeri: sostituisce la funzione fmt globale
  window._cfgNumFormat = CFG.statDisplayMode;

  // buy max: disabilita le righe indent se buyMaxEnabled è false
  const indentRows = document.querySelectorAll('#panel-settings .set-row.indent');
  indentRows.forEach(r => r.style.opacity = CFG.buyMaxEnabled ? '' : '0.35');
  window._cfgBuyMaxEnabled = CFG.buyMaxEnabled;
  window._cfgBuyMaxBoards  = CFG.buyMaxBoards;

  // radio
  if (typeof Radio !== 'undefined') {
    Radio.setVolume(CFG.radioVolume / 100);
    Radio.setMuted(CFG.radioMuted);
  }
}

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  buildSidebar();
  buildPanels();
  applySettings();
  _statLoadPins();
  _statBuildPinnedBar();
  _statRenderPinnedBar();
});
