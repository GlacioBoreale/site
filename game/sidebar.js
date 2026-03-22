'use strict';

// ===============
//  SETTINGS STATE
// ===============
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

const PAIRS = [[2, 4], [1, 5], [0, 6]];
const PAIR_DELAY = 150;

let menuOpen = false;
let activePanelId = null;
let btnEls = [];
let menuAnimating = false;

// ======
//  BUILD
// ======
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

  const overlay = document.createElement('div');
  overlay.id = 'panel-overlay';
  overlay.addEventListener('click', closeAll);
  document.body.appendChild(overlay);
}

// =======
//  TOGGLE
// =======
function toggleMenu() {
  if (menuAnimating) return;
  menuOpen = !menuOpen;
  menuAnimating = true;

  const icon  = document.getElementById('sb-menu-icon');
  const label = document.getElementById('sb-menu-label');
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

// =======
//  PANELS
// =======
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
  if (panelId === 'panel-settings') syncBuyMaxPointUpgradesRow();
}

function syncBuyMaxPointUpgradesRow() {
  const row = document.querySelector('.set-row.indent[data-key="buyMaxPointUpgrades"]');
  if (!row) return;
  const show = typeof G !== 'undefined' && G.fastAndFurious;
  row.style.display = show ? '' : 'none';
  if (show) {
    const cb = document.getElementById('set-buyMaxPointUpgrades');
    if (cb) cb.classList.toggle('checked', !!CFG.buyMaxPointUpgrades);
  }
}

function closePanel() {
  if (activePanelId) {
    document.getElementById(activePanelId)?.classList.remove('open');
    activePanelId = null;
  }
  document.getElementById('panel-overlay')?.classList.remove('open');
  document.getElementById('sidebar-wrapper')?.classList.remove('panel-open');
  document.querySelectorAll('.mtb-btn').forEach(b => b.classList.remove('active'));
  if (typeof window._mtbSyncActive === 'function') window._mtbSyncActive();
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

// ==================
//  BUILD PANELS HTML
// ==================
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

// ============
//  LEADERBOARD
// ============
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
    <button class="lb-tab active" data-lbtab="points"><i class="fas fa-coins"></i> Points</button>
    <button class="lb-tab" data-lbtab="research"><i class="fas fa-flask"></i> Research</button>
    <button class="lb-tab" data-lbtab="prestige"><i class="fas fa-yen-sign"></i> Prestige</button>
    <button class="lb-tab" data-lbtab="xp_level"><i class="fas fa-bolt"></i> XP Level</button>
    <button class="lb-tab" data-lbtab="total_time_sec"><i class="fas fa-clock"></i> Time</button>
  </div>
  <div class="lb-table">
    <div class="lb-table-header">
      <span class="lb-th-rank">#</span>
      <span class="lb-th-name">USERNAME</span>
      <span class="lb-th-val" id="lb-col-label">POINTS</span>
    </div>
    <div class="lb-rows" id="lb-rows">
      <div class="lb-loading" id="lb-loading"><i class="fas fa-spinner fa-spin"></i></div>
    </div>
    <div class="lb-footer" id="lb-footer">
      <div class="lb-separator" id="lb-divider" style="display:none"></div>
      <div id="lb-me-row"></div>
      <div id="lb-guest-note"></div>
    </div>
  </div>
</div>`;
}

function _fmtLbTime(sec) {
  sec = Math.floor(sec || 0);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return d + 'd ' + h + 'h';
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'm';
}

const LB_TAB_META = {
  points:         { colLabel: 'POINTS',   color: '#ffffff', fmtVal: r => fmt(r.points)              + ' ₽' },
  research:       { colLabel: 'RESEARCH', color: '#38bdf8', fmtVal: r => fmtLambda(r.research)      + ' λ' },
  prestige:       { colLabel: 'PRESTIGE', color: '#fbbf24', fmtVal: r => fmtLambda(r.prestige)      + ' ¥' },
  xp_level:       { colLabel: 'LEVEL',    color: '#a3e635', fmtVal: r => 'Lv ' + (r.xp_level || 0) },
  total_time_sec: { colLabel: 'TIME',     color: '#fb923c', fmtVal: r => _fmtLbTime(r.total_time_sec) },
};

let _lbData = null;
let _lbLoaded = false;

async function loadLeaderboard() {
  const loadingEl = document.getElementById('lb-loading');
  const rowsEl    = document.getElementById('lb-rows');
  if (!rowsEl) return;
  if (loadingEl) { loadingEl.style.display = 'flex'; rowsEl.innerHTML = ''; rowsEl.appendChild(loadingEl); }
  try {
    if (typeof Api === 'undefined') throw new Error('no api');
    const raw = await Api.leaderboard.get();
    const data = raw.leaderboard || raw;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      _lbData = data;
    } else if (Array.isArray(data)) {
      _lbData = { points: data, research: data, prestige: data, xp_level: data, total_time_sec: data };
    } else {
      throw new Error('unexpected format');
    }
    _lbLoaded = true;
    if (loadingEl) loadingEl.style.display = 'none';
    renderLeaderboard();
  } catch (err) {
    console.error('[LB error]', err);
    if (loadingEl) loadingEl.style.display = 'none';
    if (rowsEl) rowsEl.innerHTML = '<div class="panel-wip"><i class="fas fa-ranking-star"></i>Nessun dato</div>';
  }
}

function renderLeaderboard(forcedTab) {
  const rowsEl    = document.getElementById('lb-rows');
  const dividerEl = document.getElementById('lb-divider');
  const meRowEl   = document.getElementById('lb-me-row');
  const guestEl   = document.getElementById('lb-guest-note');
  const colLabel  = document.getElementById('lb-col-label');
  if (!rowsEl || !_lbData) return;

  const tab   = forcedTab || document.querySelector('.lb-tab.active')?.dataset.lbtab || 'points';
  const meta  = LB_TAB_META[tab] || LB_TAB_META.points;
  const color = meta.color || '#fff';
  if (colLabel) colLabel.textContent = meta.colLabel;

  const myUser  = typeof Auth !== 'undefined' && Auth.isLoggedIn() ? Auth.getUser() : null;
  const allRows = [...(_lbData[tab] || [])];
  const top10   = allRows.slice(0, 10);

  let html = '';
  for (let i = 0; i < 10; i++) {
    const r    = top10[i];
    const isMe = myUser && r && r.username === myUser.username;
    if (r) {
      html += '<div class="lb-row' + (isMe ? ' lb-me' : '') + '" style="--lb-color:' + color + '">' +
        '<span class="lb-pos">' + (i + 1) + '</span>' +
        '<span class="lb-name">' + r.username + '</span>' +
        '<span class="lb-val">' + meta.fmtVal(r) + '</span>' +
        '</div>';
    } else {
      html += '<div class="lb-row lb-empty">' +
        '<span class="lb-pos">' + (i + 1) + '</span>' +
        '<span class="lb-name"></span>' +
        '<span class="lb-val"></span>' +
        '</div>';
    }
  }
  rowsEl.innerHTML = html;

  const myInTop  = myUser && top10.some(r => r && r.username === myUser.username);
  const myIdx    = myUser ? allRows.findIndex(r => r && r.username === myUser.username) : -1;
  const footerEl = document.getElementById('lb-footer');

  if (dividerEl) dividerEl.style.display = 'none';

  if (myUser && !myInTop && myIdx !== -1) {
    const r = allRows[myIdx];
    if (meRowEl) meRowEl.innerHTML =
      '<div class="lb-me-row" style="--lb-color:' + color + '">' +
      '<span class="lb-my-pos">' + (myIdx + 1) + '</span>' +
      '<span class="lb-my-name">' + r.username + ' <span style="font-size:0.7rem;opacity:0.55">(tu)</span></span>' +
      '<span class="lb-my-val">' + meta.fmtVal(r) + '</span>' +
      '</div>';
    if (guestEl) guestEl.innerHTML = '';
    if (footerEl) footerEl.classList.add('lb-footer--visible');
  } else {
    if (meRowEl) meRowEl.innerHTML = '';
    if (guestEl) guestEl.innerHTML = !myUser
      ? '<div class="lb-guest-note"><i class="fas fa-circle-info"></i> Accedi per apparire in classifica</div>'
      : '';
    if (footerEl) footerEl.classList.toggle('lb-footer--visible', !myUser);
  }
}

function _syncLbOptinBtn() {
  const row = document.getElementById('lb-optin-row');
  const lbl = document.getElementById('lb-optin-label');
  const btn = document.getElementById('lb-optin-btn');
  if (!row || !lbl || !btn) return;
  const loggedIn = typeof Auth !== 'undefined' && Auth.isLoggedIn();
  const unlocked = typeof G !== 'undefined' && G.leaderboardUnlocked;
  if (!loggedIn || !unlocked) {
    lbl.textContent = !loggedIn
      ? (gt('lb.loginToAppear') || 'Accedi per apparire in classifica')
      : (gt('lb.unlockToAppear') || 'Sblocca "Nella storia" per partecipare');
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

let _lbInited = false;

function initLeaderboard() {
  _syncLbOptinBtn();
  if (_lbInited) {
    if (_lbLoaded) renderLeaderboard();
    else loadLeaderboard();
    return;
  }
  _lbInited = true;

  document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (_lbLoaded) renderLeaderboard(tab.dataset.lbtab);
    });
  });

  const optBtn = document.getElementById('lb-optin-btn');
  if (optBtn) {
    optBtn.addEventListener('click', () => {
      if (typeof G === 'undefined') return;
      G.leaderboardOptIn = !G.leaderboardOptIn;
      _syncLbOptinBtn();
      if (typeof saveGame === 'function') saveGame();
      if (typeof scheduleCloudSave === 'function') scheduleCloudSave();
    });
  }

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

// ==================
//  SETTINGS CONTROLS
// ==================
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

  const radioVolEl  = document.getElementById('set-radioVolume');
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

  const canvas = document.getElementById('game-canvas');
  if (canvas) canvas.style.cursor = CFG.useGameCursor ? 'grab' : 'default';

  document.documentElement.setAttribute('data-theme', CFG.lightTheme ? 'light' : 'dark');

  window._cfgShowConnections = CFG.showConnections;
  window._cfgShowGrid        = CFG.showGrid;

  const scale = CFG.uiScale / 100;
  document.documentElement.style.setProperty('--ui-scale', scale);
  const spb = document.querySelector('#stats-pinned-bar');
  if (spb) spb.style.zoom = scale;
  const sw = document.getElementById('sidebar-wrapper');
  if (sw) sw.style.zoom = scale;
  if (window.innerWidth > 900) {
    document.querySelectorAll('.game-panel').forEach(el => { el.style.zoom = scale; });
  }
  const rw = document.getElementById('radio-widget');
  if (rw) rw.style.zoom = scale;

  window._cfgNumFormat = CFG.statDisplayMode;

  const indentRows = document.querySelectorAll('#panel-settings .set-row.indent');
  indentRows.forEach(r => r.style.opacity = CFG.buyMaxEnabled ? '' : '0.35');
  window._cfgBuyMaxEnabled = CFG.buyMaxEnabled;
  window._cfgBuyMaxBoards  = CFG.buyMaxBoards;
  if (typeof syncBuyMaxPointUpgradesRow === 'function') syncBuyMaxPointUpgradesRow();

  if (typeof Radio !== 'undefined') {
    Radio.setVolume(CFG.radioVolume / 100);
    Radio.setMuted(CFG.radioMuted);
  }
}

// =====
//  INIT
// =====
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  buildSidebar();
  buildPanels();
  applySettings();
  _statLoadPins();
  _statBuildPinnedBar();
  _statRenderPinnedBar();
  buildMobileTabBar();
});

function buildMobileTabBar() {
  const bar = document.getElementById('mobile-bottom-bar');
  if (!bar) return;

  const MBB_ITEMS = [
    { id: 'settings',     panel: 'panel-settings'    },
    { id: 'stats',        panel: 'panel-stats'        },
    { id: 'achievements', panel: 'panel-achievements' },
    { id: 'leaderboard',  panel: 'panel-leaderboard'  },
    { id: 'updatelog',    panel: 'panel-updatelog'    },
    { id: 'maintenance',  panel: 'panel-maintenance'  },
  ];

  MBB_ITEMS.forEach(item => {
    const btn = document.getElementById('mbb-' + item.id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (activePanelId === item.panel) {
        closePanel();
      } else {
        MBB_ITEMS.forEach(it => document.getElementById('mbb-' + it.id)?.classList.remove('mbb-active'));
        btn.classList.add('mbb-active');
        openPanel(item.panel);
      }
    });
  });

  document.getElementById('panel-overlay')?.addEventListener('click', () => {
    MBB_ITEMS.forEach(it => document.getElementById('mbb-' + it.id)?.classList.remove('mbb-active'));
  });

  window._mtbSyncActive = () => {
    MBB_ITEMS.forEach(it => document.getElementById('mbb-' + it.id)?.classList.remove('mbb-active'));
    if (activePanelId) {
      const match = MBB_ITEMS.find(t => t.panel === activePanelId);
      if (match) document.getElementById('mbb-' + match.id)?.classList.add('mbb-active');
    }
  };
}
