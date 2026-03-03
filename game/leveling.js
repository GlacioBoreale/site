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
    <div class="lp-header">Leveling</div>
    <div class="lp-body">
      <div class="lp-buffs" id="lp-buffs"></div>
      <div class="lp-right">
        <div class="lp-desc">
          Cos'\u00e8 un incremental senza dei livelli?<br>
          Guadagna <span style="color:#4ade80">Esperienza</span> e
          <span style="color:#4ade80">Livelli</span> cliccando.<br>
          I boost sono nel pannello a sinistra.<br>
          <span style="color:rgba(255,255,255,0.3);font-size:.67rem">(i livelli si resettano col prestige)</span>
        </div>
        <div class="lp-level-display">
          <span class="lp-level-label" id="lp-level-label">LIVELLO 0</span>
          <span class="lp-level-fraction" id="lp-level-fraction">0 / 2 XP</span>
        </div>
        <div class="lp-xp-bar-wrap"><div class="lp-xp-bar" id="lp-xp-bar"></div></div>
        <button class="lp-btn" id="lp-btn">Clicca qui!</button>
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
  G.xp += G.xpPerClick || 1;

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

  _lpLevelLabelEl.textContent = 'LIVELLO ' + lvl;
  _lpFractionEl.textContent   = xp + ' / ' + needed + ' XP';
  _lpBarEl.style.width        = pct + '%';

  _lpBuffEls.forEach(({ el, textNode, buff }) => {
    const active = lvl >= buff.req;
    el.classList.toggle('active',   active);
    el.classList.toggle('inactive', !active);
    textNode.textContent = active
      ? buff.labelActive(lvl)
      : 'lvl req ' + buff.req;
  });
}

function positionLevelingPanel() {
  const nd = NODE_DEFS.find(n => n.id === 'soloLeveling');
  if (!nd || !isVisible(nd)) return;

  const gameMain = document.querySelector('.game-main');
  const gw = gameMain.offsetWidth;
  const gh = gameMain.offsetHeight;

  const panelW = _lpEl.offsetWidth  || 310;
  const panelH = _lpEl.offsetHeight || 220;
  const GAP    = 14; // px tra nodo e pannello

  // centro del nodo in coordinate schermo
  const sx = nd.x + camX;
  const sy = nd.y + camY;

  // posizione ideale: centrato sopra il nodo
  let left = sx - panelW / 2;
  let top  = sy - (NODE_H / 2) - panelH - GAP;

  _lpEl.style.left = left + 'px';
  _lpEl.style.top  = top  + 'px';
}

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
