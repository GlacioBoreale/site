'use strict';

// ══════════════════════════════════════════════════════════════
//  STATS — definizioni statiche
// ══════════════════════════════════════════════════════════════
const STATS_DEFS = {
  currencies: [
    {
      id:      'points',
      label:   () => fmt(G.points) + ' ₽',
      rate:    () => '+' + fmt(G.pps) + ' ₽/s',
      color:   '#ffffff',
      bg:      'rgba(255,255,255,0.08)',
      icon:    '₽',
      always:  true,
    },
    {
      id:      'research',
      label:   () => fmtLambda(G.research) + ' λ',
      rate:    () => '+' + fmtLambda(pendingResearch()) + ' λ/pending',
      color:   '#38bdf8',
      bg:      'rgba(56,189,248,0.13)',
      icon:    'λ',
      check:   () => G.researchUnlocked,
    },
    {
      id:      'prestige',
      label:   () => fmt(G.prestige) + ' ✦',
      rate:    () => { const p = pendingPrestige() - G.prestige; return p > 0.005 ? '+' + fmt(p) + ' ✦/pending' : ''; },
      color:   '#fbbf24',
      bg:      'rgba(251,191,36,0.13)',
      icon:    '✦',
      check:   () => G.hasPrestiged,
    },
    {
      id:      'automation',
      label:   () => fmt(G.automation) + ' ✦',
      rate:    () => {'+' + ftmAuto(G.autonio)},// gain a parte
      color:   '#be453c',
      bg:      'rgba(37, 20, 20, 0.13)',
      icon:    '✦',
      check:   () => G.hasPrestiged,
    },
  ],
  levels: [
    {
      id:    'xpLevel',
      label: () => 'Level ' + G.xpLevel,
      extra: () => {
        const need = xpForLevel(G.xpLevel);
        return fmt(G.xp) + '/' + fmt(need) + ' XP';
      },
      bar:   () => G.xp / xpForLevel(G.xpLevel),
      color: '#a3e635',
      bg:    'rgba(163,230,53,0.13)',
      check: () => G.soloLevelingUnlocked,
    },
  ],
  other: [
    {
      id:    'sessionTime',
      label: () => _statFmtTime(_statsSessionSec) + ' ' + (window._gt_session || 'session time'),
      color: '#f87171',
      bg:    'rgba(248,113,113,0.13)',
    },
    {
      id:    'totalTime',
      label: () => _statFmtTime(G.totalTimeSec || 0) + ' ' + (window._gt_total || 'total time'),
      color: '#38bdf8',
      bg:    'rgba(56,189,248,0.10)',
    },
    {
      id:    'prestigeCount',
      label: () => (G.prestigeCount || 0) + ' ' + (window._gt_prestiges || 'prestiges'),
      color: '#fbbf24',
      bg:    'rgba(251,191,36,0.10)',
      check: () => G.hasPrestiged,
    },
  ],
};

// ══════════════════════════════════════════════════════════════
//  RUNTIME
// ══════════════════════════════════════════════════════════════
let _statsSessionSec = 0;
let _statsLastTick   = 0;
const STATS_PIN_KEY  = 'glaciopia_stats_pins';
let _statsPinned     = [];   // array ordinato di stat id

function _statLoadPins() {
  try { _statsPinned = JSON.parse(localStorage.getItem(STATS_PIN_KEY)) || []; } catch (_) { _statsPinned = []; }
}
function _statSavePins() {
  localStorage.setItem(STATS_PIN_KEY, JSON.stringify(_statsPinned));
}

function _statFmtTime(s) {
  s = Math.floor(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return h + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  return m + ':' + String(sec).padStart(2,'0');
}

function _statAllDefs() {
  return [
    ...STATS_DEFS.currencies,
    ...STATS_DEFS.levels,
    ...STATS_DEFS.other,
  ];
}

function _statById(id) {
  return _statAllDefs().find(d => d.id === id);
}

function _statVisible(def) {
  return !def.check || def.check();
}

function _statTogglePin(id) {
  const idx = _statsPinned.indexOf(id);
  if (idx === -1) {
    _statsPinned.push(id);
  } else {
    _statsPinned.splice(idx, 1);
  }
  _statSavePins();
  _statRenderPinnedBar();
  _statsUpdatePanel();
}

// ══════════════════════════════════════════════════════════════
//  TICK (chiamato dal loop ogni frame)
// ══════════════════════════════════════════════════════════════
let _statsTickAcc = 0;
function tickStats(dt) {
  _statsSessionSec += dt;
  if (G.totalTimeSec === undefined) G.totalTimeSec = 0;
  G.totalTimeSec += dt;

  _statsTickAcc += dt;
  const interval = (window._settingsCurrencyInterval || 300) / 1000;
  if (_statsTickAcc >= interval) {
    _statsTickAcc = 0;
    if (document.getElementById('panel-stats')?.classList.contains('open')) _statsUpdatePanel();
    _statRenderPinnedBar();
  }
}

// ══════════════════════════════════════════════════════════════
//  PANEL BUILD
// ══════════════════════════════════════════════════════════════
function buildStatsPanel() {
  return `
<div class="game-panel" id="panel-stats">
  <div class="panel-header">
    <span class="panel-title">
      <div class="panel-title-icon si-c-stats"><i class="fas fa-chart-bar"></i></div>
      Statistiche
    </span>
    <button class="panel-close"><i class="fas fa-times"></i></button>
  </div>
  <div class="stats-tabs">
    <button class="stats-tab active" data-stab="currencies">Valute</button>
    <button class="stats-tab" data-stab="levels">Livelli</button>
    <button class="stats-tab" data-stab="other">Altro</button>
  </div>
  <div class="panel-body stats-body" id="stats-body"></div>
  <div class="stats-pin-count" id="stats-pin-count"></div>
</div>`;
}

function initStatsPanel() {
  _statLoadPins();

  document.querySelectorAll('.stats-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _statsUpdatePanel();
    });
  });

  _statsUpdatePanel();
  _statBuildPinnedBar();
}

function _statsActiveTab() {
  return document.querySelector('.stats-tab.active')?.dataset.stab || 'currencies';
}

function _statsUpdatePanel() {
  const tab  = _statsActiveTab();
  const body = document.getElementById('stats-body');
  const cnt  = document.getElementById('stats-pin-count');
  if (!body) return;

  const defs = STATS_DEFS[tab] || [];
  body.innerHTML = '';

  defs.forEach(def => {
    if (!_statVisible(def)) return;

    const pinned = _statsPinned.includes(def.id);
    const row    = document.createElement('div');
    row.className = 'stats-row' + (pinned ? ' pinned' : '');
    row.style.setProperty('--sc', def.color);
    row.style.setProperty('--sb', def.bg);

    const hasBar = typeof def.bar === 'function';

    if (hasBar) {
      const pct = Math.min(1, Math.max(0, def.bar())) * 100;
      row.innerHTML = `
        <div class="stats-row-bar" style="width:${pct.toFixed(1)}%"></div>
        <span class="stats-row-label">${def.label()}</span>
        <span class="stats-row-extra">${def.extra ? def.extra() : ''}</span>
        <button class="stats-pin-btn${pinned ? ' active' : ''}" data-sid="${def.id}" title="Pinna">
          <i class="fas fa-location-dot"></i>
        </button>`;
    } else {
      const rate = def.rate ? def.rate() : '';
      row.innerHTML = `
        <span class="stats-row-icon">${def.icon || ''}</span>
        <span class="stats-row-icon stats-row-icon-ghost">${def.icon || ''}</span>
        <span class="stats-row-icon stats-row-icon-ghost">${def.icon || ''}</span>
        <span class="stats-row-label">${def.label()}</span>
        ${rate ? `<span class="stats-row-rate">(${rate})</span>` : ''}
        <button class="stats-pin-btn${pinned ? ' active' : ''}" data-sid="${def.id}" title="Pinna">
          <i class="fas fa-location-dot"></i>
        </button>`;
    }

    body.appendChild(row);
  });

  if (!body.children.length) {
    body.innerHTML = '<div class="panel-wip" style="padding:2rem 1rem;color:rgba(255,255,255,0.2);font-family:Fredoka,sans-serif;font-size:0.88rem;display:flex;align-items:center;justify-content:center;">Nessuna statistica disponibile</div>';
  }

  if (cnt) {
    const n = _statsPinned.filter(id => _statVisible(_statById(id))).length;
    cnt.textContent = n + ' ' + (window._gt_pinned || 'PINNED');
  }

  body.querySelectorAll('.stats-pin-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _statTogglePin(btn.dataset.sid);
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  PINNED BAR (bottom center)
// ══════════════════════════════════════════════════════════════
function _statBuildPinnedBar() {
  if (document.getElementById('stats-pinned-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'stats-pinned-bar';
  document.body.appendChild(bar);
  _statRenderPinnedBar();
}

function _statRenderPinnedBar() {
  const bar = document.getElementById('stats-pinned-bar');
  if (!bar) return;

  const visible = _statsPinned
    .map(id => _statById(id))
    .filter(d => d && _statVisible(d));

  if (!visible.length) { bar.innerHTML = ''; bar.classList.remove('has-items'); return; }
  bar.classList.add('has-items');

  bar.innerHTML = visible.map(def => {
    const label = def.label();
    const rate  = def.rate ? def.rate() : '';
    return `<span class="spb-item" style="--sc:${def.color}">
      <span class="spb-label">${label}</span>${rate ? `<span class="spb-rate">${rate}</span>` : ''}
    </span>`;
  }).join('<span class="spb-sep">/</span>');
}
