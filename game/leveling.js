'use strict';

// ══════════════════════════════════════════════════════════════
//  LEVELING PANEL — fisso in basso a destra, non segue la camera
// ══════════════════════════════════════════════════════════════

let _lpBuilt = false;
let _lpEl    = null;
let _lpBarEl        = null;
let _lpLevelLabelEl = null;
let _lpFractionEl   = null;
let _lpBtnEl        = null;
let _lpBuffEls      = []; // [{ el, buff }]

const LP_BUFFS = [
  {
    id:          'pGain1',
    req:         1,
    labelActive: (lvl) => (1 + lvl * 0.1).toFixed(1) + ' P gain',
    tooltip:     'x(1+lvl×0.1) P gain',
  },
  {
    id:          'pGain2',
    req:         5,
    labelActive: (lvl) => Math.pow(1.1, lvl - 4).toFixed(2) + ' P gain',
    tooltip:     'x(1.1^(lvl-4)) P gain',
  },
  {
    id:          'lGain',
    req:         10,
    labelActive: (lvl) => (1 + (lvl - 9) * 0.1).toFixed(1) + ' λ gain',
    tooltip:     'x(1+(lvl-9)×0.1) λ gain',
  },
  {
    id:          'presGain',
    req:         15,
    labelActive: (lvl) => (1 + (lvl - 14) * 0.1).toFixed(1) + ' ✦ gain',
    tooltip:     'x(1+(lvl-14)×0.1) ✦ gain',
  },
];

function buildLevelingPanel() {
  if (_lpBuilt) return;
  _lpBuilt = true;

  const el = document.createElement('div');
  el.id = 'leveling-panel';
  el.innerHTML = `
    <div class="lp-header" id="lp-header">Leveling</div>
    <div class="lp-body">
      <div class="lp-buffs" id="lp-buffs"></div>
      <div class="lp-right">
        <div class="lp-desc" id="lp-desc"></div>
        <div class="lp-level-display">
          <span class="lp-level-label" id="lp-level-label">0</span>
          <span class="lp-level-fraction" id="lp-level-fraction">0 / 2 XP</span>
        </div>
        <div class="lp-xp-bar-wrap"><div class="lp-xp-bar" id="lp-xp-bar"></div></div>
        <button class="lp-btn" id="lp-btn"></button>
      </div>
    </div>
  `;

  document.querySelector('.game-main').appendChild(el);
  _lpEl = el;

  const buffsEl = el.querySelector('#lp-buffs');
  LP_BUFFS.forEach(b => {
    const div = document.createElement('div');
    div.className = 'lp-buff inactive';
    div.id = 'lp-buff-' + b.id;

    // nodo testo per il label
    const textNode = document.createTextNode('lvl req ' + b.req);
    div.appendChild(textNode);

    // tooltip con formula — sempre visibile all'hover
    const tip = document.createElement('span');
    tip.className = 'lp-buff-tip';
    tip.textContent = b.tooltip;
    div.appendChild(tip);

    buffsEl.appendChild(div);
    _lpBuffEls.push({ el: div, textNode, buff: b });
  });

  _lpBarEl        = el.querySelector('#lp-xp-bar');
  _lpLevelLabelEl = el.querySelector('#lp-level-label');
  _lpFractionEl   = el.querySelector('#lp-level-fraction');
  _lpBtnEl        = el.querySelector('#lp-btn');

  let _lastClick = 0;
  _lpBtnEl.addEventListener('click', () => {
    const now = Date.now();
    if (now - _lastClick < 50) return;
    _lastClick = now;
    onLevelingClick();
  });
}

function onLevelingClick() {
  if (!G.soloLevelingUnlocked) return;
  G.xp += (G.xpPerClick || 1) * (G.xpClickMulti || 1);

  let needed = xpForLevel(G.xpLevel);
  while (G.xp >= needed) {
    G.xp    -= needed;
    G.xpLevel++;
    needed   = xpForLevel(G.xpLevel);
    recalcPps();
  }

  updateLevelingPanel();
}

function updateLevelingPanel() {
  if (!_lpBuilt || !_lpEl) return;

  const lvl    = G.xpLevel;
  const xp     = G.xp;
  const needed = xpForLevel(lvl);
  const pct    = Math.min(100, (xp / needed) * 100);

  const _gtLevel  = (typeof gt === 'function' && gt('leveling.level'))  || 'LEVEL';
  const _gtLvlReq = (typeof gt === 'function' && gt('leveling.lvlReq')) || 'lvl req';
  _lpLevelLabelEl.textContent = _gtLevel + ' ' + lvl;
  _lpFractionEl.textContent   = xp + ' / ' + needed + ' XP';
  _lpBarEl.style.width        = pct + '%';

  _lpBuffEls.forEach(({ el, textNode, buff }) => {
    const active = lvl >= buff.req;
    el.classList.toggle('active',   active);
    el.classList.toggle('inactive', !active);
    textNode.textContent = active
      ? buff.labelActive(lvl)
      : _gtLvlReq + ' ' + buff.req;
  });
}

function positionLevelingPanel() {
  if (!_lpEl) return;
  _lpEl.style.position  = 'absolute';
  _lpEl.style.transform = '';
  _lpEl.style.bottom    = '';
  _lpEl.style.maxHeight = '';
  _lpEl.style.overflowY = '';

  const nd = NODE_DEFS.find(n => n.id === 'soloLeveling');
  if (!nd || !isVisible(nd)) return;

  const GAP    = 14;

  const panelW = (_lpEl.offsetWidth  || 310) * zoom;
  const panelH = (_lpEl.offsetHeight || 220) * zoom;
  const sx = (nd.x + camX) * zoom;
  const sy = (nd.y + camY) * zoom;

  _lpEl.style.left            = (sx - panelW / 2) + 'px';
  _lpEl.style.top             = (sy - NODE_H * zoom / 2 - panelH - GAP) + 'px';
  _lpEl.style.transformOrigin = 'top left';
  _lpEl.style.transform       = `scale(${zoom})`;
}

window.addEventListener('languageChanged', () => {
  if (_lpBuilt) {
    updateLevelingPanel();
    if (typeof applyLevelingTranslations === 'function') applyLevelingTranslations();
  }
});

// chiamato ogni frame
function tickLevelingPanel() {
  if (!G.soloLevelingUnlocked) {
    if (_lpEl) _lpEl.classList.remove('lp-visible');
    return;
  }
  if (!_lpBuilt) {
    buildLevelingPanel();
    updateLevelingPanel();
  }
  _lpEl.classList.add('lp-visible');
  positionLevelingPanel();
}
