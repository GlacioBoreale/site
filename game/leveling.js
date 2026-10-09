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
    labelActive: (lvl) => (1 + (lvl - 14) * 0.1).toFixed(1) + ' ¥ gain',
    tooltip:     'x(1+(lvl-14)×0.1) ¥ gain',
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

  // #25a hold(true): tenendo premuto, clicca automaticamente alla velocità massima
  let _holdTimer = null;
  function _holdActive() {
    return (nodeState['a_holdTrue']?.level || 0) > 0;
  }
  function _startHold() {
    if (!_holdActive()) return;
    if (_holdTimer) return;
    _holdTimer = setInterval(() => {
      const now = Date.now();
      if (now - _lastClick < 50) return;
      _lastClick = now;
      onLevelingClick();
    }, 50);
  }
  function _stopHold() {
    if (_holdTimer) { clearInterval(_holdTimer); _holdTimer = null; }
  }
  _lpBtnEl.addEventListener('mousedown',  _startHold);
  _lpBtnEl.addEventListener('mouseup',    _stopHold);
  _lpBtnEl.addEventListener('mouseleave', _stopHold);
  _lpBtnEl.addEventListener('touchstart', (e) => { e.preventDefault(); _startHold(); }, { passive: false });
  _lpBtnEl.addEventListener('touchend',   _stopHold);
  _lpBtnEl.addEventListener('touchcancel', _stopHold);
}

function transformerXpMult() {
  let m = 1;
  const eq = G.equippedTransformer;
  if (eq === 'booster') m *= 1.5;
  if (eq === 'boosterP') m *= Math.pow(Math.max(1, G.pps), 0.01);
  // CUBE: boosta sempre, anche da non equipaggiato, in base ai cube clicks
  if (G.reachedLvl100 && (G.cubeClicks || 0) > 0)
    m *= Math.pow(1 + G.cubeClicks, 0.2);
  return m;
}

function onLevelingClick(fromAutomator) {
  if (!G.soloLevelingUnlocked) return;
  // AUTOMATOR equipaggiato: disabilita il click manuale (solo l'automator può cliccare)
  if (G.equippedTransformer === 'automator' && !fromAutomator) return;

  G.xp += (G.xpPerClick || 1) * (G.xpClickMulti || 1) * transformerXpMult();

  let needed = xpForLevel(G.xpLevel);
  while (G.xp >= needed) {
    G.xp    -= needed;
    G.xpLevel++;
    if (G.xpLevel >= 100) G.reachedLvl100 = true;
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

let _automatorAcc = 0;
function tickAutomator(dt) {
  if (G.equippedTransformer !== 'automator') { _automatorAcc = 0; return; }
  if (!G.soloLevelingUnlocked) return;
  // 3 click/s base, 6 click/s con #24a (a_delayHalf)
  const rate = (nodeState['a_delayHalf']?.level || 0) > 0 ? 6 : 3;
  _automatorAcc += dt * rate;
  while (_automatorAcc >= 1) {
    _automatorAcc -= 1;
    onLevelingClick(true);
  }
}

// chiamato ogni frame
function tickLevelingPanel(dt) {
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
  tickTransformerPanel();
  tickAutomator(dt || 0);
}

// ════════════════════════════════════════════════════════
//  LEVEL TRANSFORMER PANEL — sopra il pannello Leveling, da #7p
// ════════════════════════════════════════════════════════

let _ltBuilt = false;
let _ltEl    = null;
let _ltListEl = null;
let _cubeEl  = null;

// un nodo è "visibile" nell'albero (per il velo di mistero ???)
function _nodeVisibleById(id) {
  const nd = NODE_DEFS.find(n => n.id === id);
  return nd ? isVisible(nd) : false;
}

// I 6 trasformatori. unlocked() = criterio soddisfatto. hint() = testo sblocco (con ??? a cascata).
const TRANSFORMERS = [
  {
    id:      'automator',
    name:    'AUTOMATOR',
    effect:  'Manual clicking is disabled but 3 clicks/s',
    cost:    () => '500k \u0e3f',
    unlocked: () => G.automatorBought,
    canBuy:  () => G.bits >= 500000,
    buy:     () => { if (G.bits >= 500000) { G.bits -= 500000; G.automatorBought = true; return true; } return false; },
    hint:    () => 'Costa 500.000 \u0e3f',
  },
  {
    id:      'cube',
    name:    'CUBE',
    effect:  'Clicks boost XP even while unequipped',
    cost:    () => 'Livello 100',
    unlocked: () => G.reachedLvl100,
    canBuy:  () => false,
    buy:     () => false,
    hint:    () => 'Raggiungi il livello 100 almeno una volta',
    noEquip: true,
  },
  {
    id:      'booster',
    name:    'BOOSTER',
    effect:  '\u00d71.5 XP gain',
    cost:    () => 'Free',
    unlocked: () => G.levelTransformerUnlocked,
    canBuy:  () => false,
    buy:     () => false,
    hint:    () => 'Sbloccato con #7p',
  },
  {
    id:      'coffeeMug',
    name:    'COFFEE MUG',
    effect:  'Clicking cooldown is halved',
    cost:    () => 'Get Funky',
    unlocked: () => false,
    canBuy:  () => false,
    buy:     () => false,
    hint:    () => {
      const obelisk = _nodeVisibleById('mysticObelisk');
      const sfida   = obelisk ? 'Get Funky' : '???';
      const luogo   = obelisk ? 'Obelisco' : '???';
      return 'Batti la sfida ' + sfida + ' nel ' + luogo;
    },
  },
  {
    id:      'boosterP',
    name:    'BOOSTER-\u20bd',
    effect:  'Boost XP gain based on \u20bd gain',
    cost:    () => '1UDe \u20bd',
    unlocked: () => G.boosterPBought,
    canBuy:  () => G.points >= 1e36,
    buy:     () => { if (G.points >= 1e36) { G.points -= 1e36; G.boosterPBought = true; return true; } return false; },
    hint:    () => 'Costa 1e36 \u20bd',
  },
  {
    id:      'ultimate',
    name:    'ULTIMATE TRANSFORMER',
    effect:  'All in one, but even better',
    cost:    () => 'Buy #8h',
    unlocked: () => false,
    canBuy:  () => false,
    buy:     () => false,
    hint:    () => {
      const node8h = _nodeVisibleById('hardcoreUnlock8h');
      const baseVisible = _nodeVisibleById('hardcoreUnlock');
      const nodo  = node8h ? '#8h' : '???';
      const luogo = baseVisible ? 'Hardcore Baseplate' : '???';
      return 'Acquista ' + nodo + ' nella ' + luogo;
    },
  },
];

function _transformerById(id) {
  return TRANSFORMERS.find(t => t.id === id) || null;
}

function equipTransformer(id) {
  const t = _transformerById(id);
  if (!t || t.noEquip || !t.unlocked()) return;
  G.equippedTransformer = (G.equippedTransformer === id) ? null : id;
  saveGame();
  renderTransformerList();
}

function buyTransformer(id) {
  const t = _transformerById(id);
  if (!t || t.unlocked() || !t.canBuy()) return;
  if (t.buy()) { saveGame(); renderTransformerList(); }
}

function buildTransformerPanel() {
  if (_ltBuilt) return;
  _ltBuilt = true;

  const el = document.createElement('div');
  el.id = 'transformer-panel';
  el.innerHTML = `
    <div class="lt-cube-slot"><div class="lt-cube" id="lt-cube" title="Cube"></div></div>
    <div class="lt-header">LEVEL TRANSFORMER</div>
    <div class="lt-list" id="lt-list"></div>
  `;
  document.querySelector('.game-main').appendChild(el);
  _ltEl     = el;
  _ltListEl = el.querySelector('#lt-list');
  _cubeEl   = el.querySelector('#lt-cube');

  _cubeEl.addEventListener('click', () => {
    if (!G.reachedLvl100) return;
    G.cubeClicks = (G.cubeClicks || 0) + 1;
  });

  renderTransformerList();
}

function renderTransformerList() {
  if (!_ltListEl) return;
  _ltListEl.innerHTML = '';
  TRANSFORMERS.forEach(t => {
    const unlocked = t.unlocked();
    const equipped = G.equippedTransformer === t.id;
    const row = document.createElement('div');
    row.className = 'lt-item' + (equipped ? ' equipped' : '') + (unlocked ? '' : ' locked');

    if (unlocked) {
      let btn = '';
      if (!t.noEquip) {
        btn = `<button class="lt-equip-btn" data-id="${t.id}">${equipped ? 'UNEQUIP' : 'EQUIP'}</button>`;
      } else {
        btn = `<span class="lt-cube-note">Sopra il pannello</span>`;
      }
      row.innerHTML = `
        <div class="lt-item-body">
          <div class="lt-item-name">${t.name}</div>
          <div class="lt-item-effect">${t.effect}</div>
        </div>
        ${btn}
      `;
    } else {
      // se non sbloccato ma acquistabile, mostra il bottone di acquisto; altrimenti ??? + hint
      if (t.canBuy && t.canBuy()) {
        row.innerHTML = `
          <div class="lt-item-body">
            <div class="lt-item-name">${t.name}</div>
            <div class="lt-item-effect">${t.effect}</div>
          </div>
          <button class="lt-buy-btn" data-id="${t.id}">${t.cost()}</button>
        `;
      } else {
        row.innerHTML = `
          <div class="lt-item-body">
            <div class="lt-item-name lt-mystery">???</div>
            <div class="lt-item-hint">${t.hint()}</div>
          </div>
        `;
      }
    }
    _ltListEl.appendChild(row);
  });

  _ltListEl.querySelectorAll('.lt-equip-btn').forEach(b => {
    b.addEventListener('click', () => equipTransformer(b.dataset.id));
  });
  _ltListEl.querySelectorAll('.lt-buy-btn').forEach(b => {
    b.addEventListener('click', () => buyTransformer(b.dataset.id));
  });
}

function positionTransformerPanel() {
  if (!_ltEl || !_lpEl) return;
  // posiziona sopra il pannello leveling
  const nd = NODE_DEFS.find(n => n.id === 'soloLeveling');
  if (!nd || !isVisible(nd)) return;

  const GAP    = 10;
  const panelW = (_ltEl.offsetWidth  || 310) * zoom;
  const panelH = (_ltEl.offsetHeight || 260) * zoom;
  const lpH    = (_lpEl.offsetHeight || 220) * zoom;
  const sx = (nd.x + camX) * zoom;
  const sy = (nd.y + camY) * zoom;

  _ltEl.style.position        = 'absolute';
  _ltEl.style.left            = (sx - panelW / 2) + 'px';
  _ltEl.style.top             = (sy - NODE_H * zoom / 2 - lpH - GAP - panelH - GAP) + 'px';
  _ltEl.style.transformOrigin = 'top left';
  _ltEl.style.transform       = `scale(${zoom})`;
}

let _ltLastRenderState = '';
function tickTransformerPanel() {
  if (!G.levelTransformerUnlocked) {
    if (_ltEl) _ltEl.classList.remove('lt-visible');
    return;
  }
  if (!_ltBuilt) buildTransformerPanel();
  _ltEl.classList.add('lt-visible');
  positionTransformerPanel();

  // ri-render solo se cambia qualcosa di rilevante (evita di ricostruire ogni frame)
  const stateKey = [
    G.equippedTransformer, G.automatorBought, G.boosterPBought,
    G.reachedLvl100, G.levelTransformerUnlocked,
    G.bits >= 500000, G.points >= 1e36,
    _nodeVisibleById('mysticObelisk'), _nodeVisibleById('hardcoreUnlock8h'),
  ].join('|');
  if (stateKey !== _ltLastRenderState) {
    _ltLastRenderState = stateKey;
    renderTransformerList();
  }
}
