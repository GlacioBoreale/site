'use strict';

// ─── TOOLTIP ──────────────────────────────────────────────────────────────────
const tooltip = document.getElementById('game-tooltip');

function updateTooltip() {
  if (!hoveredNode || hasDragged) { hideTooltip(); return; }
  const nd    = hoveredNode;
  const st    = nodeState[nd.id];
  const maxed = st.level >= nd.maxLevel;
  const isRNode = nd.zone === 'research' && nd.id !== 'researchUnlock';
  const isPrestNode = !!nd.costInPrestige;
  const cost  = isRNode ? researchCost(nd, st.level) : nodeCost(nd, st.level);

  const _ttTitle = typeof nd.title === 'function' ? nd.title() : nd.title;
  const rawDesc = typeof nd.desc === 'function' ? nd.desc(getDescPage(nd.id)) : nd.desc;
  let descHtml;
  if (Array.isArray(rawDesc)) {
    descHtml = rawDesc.map(l => `<span style="${l.color ? 'color:' + l.color : ''}">${l.text}</span>`).join('<br>');
  } else {
    descHtml = String(rawDesc).replace(/\n/g, '<br>');
  }
  let html = `<strong>${_ttTitle}</strong><br>${descHtml}`;
  if (maxed) {
    html += `<br><em style="color:#4ade80">${gt('tooltip.maxed')}</em>`;
  } else if (isPrestNode && !G.hasPrestiged) {
    html += `<br><em style="color:#f87171">Richiede almeno 1 Prestige</em>`;
  } else {
    const canAfford = isPrestNode ? G.prestige >= cost : isRNode ? G.research >= cost : G.points >= cost;
    const costStr   = isPrestNode ? fmt(cost) + ' ✦' : isRNode ? fmtLambda(cost) + ' λ' : fmt(cost) + ' ₽';
    html += `<br>${gt('tooltip.cost')} <span style="color:${canAfford ? '#38bdf8' : '#f87171'}">${costStr}</span>`;
  }
  tooltip.innerHTML    = html;
  tooltip.style.display = 'block';

  const rect = canvas.getBoundingClientRect();
  let tx = mousePos.x + rect.left + 14;
  let ty = mousePos.y + rect.top  - 10;
  if (tx + 240 > window.innerWidth) tx -= 260;
  tooltip.style.left = tx + 'px';
  tooltip.style.top  = ty + 'px';
}

function hideTooltip() { tooltip.style.display = 'none'; }

// ─── HUD ──────────────────────────────────────────────────────────────────────
let _lastHudUpdate = 0;

function updateHUD(force = false) {
  const now = performance.now();
  const _cuiMs2 = window._settingsCurrencyInterval || 300;
  if (!force && now - _lastHudUpdate < _cuiMs2) return;
  _lastHudUpdate = now;
  updateConvertPanel();
}

// ─── CONVERSIONE ──────────────────────────────────────────────────────────────
const convertPanel = document.getElementById('convert-panel');
const convertInfo  = document.getElementById('convert-info');
const btnConvert   = document.getElementById('btn-convert');

function updateConvertPanel() {
  if (!G.researchUnlocked) { convertPanel.style.display = 'none'; return; }
  convertPanel.style.display = 'flex';
  const pending = pendingResearch();
  if (pending < 1) {
    convertInfo.innerHTML     = `<strong>${fmt(G.points)} ₽ → ${fmtLambda(pending)} λ</strong><br><span class="convert-warn">${gt('convert.notEnough')}</span>`;
    btnConvert.style.display  = 'none';
  } else {
    convertInfo.innerHTML     = `<strong>${fmt(G.points)} ₽ → ${fmtLambda(pending)} λ</strong>`;
    btnConvert.style.display  = 'block';
  }
}

btnConvert.addEventListener('click', () => {
  const gained = pendingResearch();
  if (gained < 1) return;
  G.research         += gained;
  G.points            = 0;
  G.totalEarned       = 0;
  G.basePps           = 0;
  G.multiplier        = 1;
  G.flatMulti         = 1;
  G.selfBoost         = false;
  G.growsUnlocked     = false;
  G.extraLevels       = 0;
  G.push4research     = false;
  NODE_DEFS.find(n => n.id === 'multiInc').maxLevel = 3;
  NODE_DEFS.forEach(nd => {
    if (nd.zone === 'base' && !nd.permanent) nodeState[nd.id].level = 0;
  });
  topologicalSort().forEach(nd => {
    if (nd.permanent) {
      const lvl = nodeState[nd.id].level;
      for (let i = 0; i < lvl; i++) nd.onBuy(i + 1);
    }
  });
  recalcPps();
  saveGame();
  updateHUD(true);
});

// ─── PRESTIGE ─────────────────────────────────────────────────────────────────
function doPrestige() {
  const gained = pendingPrestige() - G.prestige;
  if (gained <= 0) return;
  const firstEver = !G.hasPrestiged;
  G.hasPrestiged       = true;
  G.prestigeCount      = (G.prestigeCount || 0) + 1;
  G.prestige          += gained;
  G.points             = 0;
  G.totalEarned        = 0;
  G.basePps            = 0;
  G.multiplier         = 1;
  G.flatMulti          = 1;
  G.multiIncBonus      = 1;
  G.selfBoost          = false;
  G.selfBoostExp       = 0.16;
  G.growsUnlocked      = false;
  G.extraLevels        = 0;
  G.push4research      = false;
  G.rBasePps           = 0;
  G.rMulti             = 1;
  G.rLambdaMulti       = 1;
  G.prestigeGainMulti  = 1;
  G.passiveLambda      = false;
  G.fastAndFurious     = false;
  G.unlazyScientists   = false;
  G.soloLevelingUnlocked = false;
  G.xp                   = 0;
  G.xpLevel              = 0;
  G.xpPerClick           = 1;
  G.xpReqDiv             = 1;
  G.xpClickMulti         = 1;
  G.toNewHeightsUnlocked = false;
  G.holyGrailUnlocked    = false;
  G.afterHalcyonUnlocked = false;
  G.delayedGratUnlocked  = false;
  G.research             = 0;
  G.researchUnlocked   = false;
  G.rightSideUnlocked  = false;
  G.leftSideUnlocked   = false;
  G.startGoldLevels    = 0;
  G.startGoldMultiP    = 1;
  G.startGoldMultiL    = 1;
  NODE_DEFS.find(n => n.id === 'multiInc').maxLevel = 3;
  NODE_DEFS.find(n => n.id === 'start').maxLevel    = 1;
  NODE_DEFS.forEach(nd => {
    if (nd.zone !== 'prestige' && !nd.permanent && !nd.isPrestigeBtn) nodeState[nd.id].level = 0;
  });
  topologicalSort().forEach(nd => {
    if (nd.permanent || nd.zone === 'prestige' || nd.isPrestigeBtn) {
      const lvl = nodeState[nd.id].level;
      for (let i = 0; i < lvl; i++) nd.onBuy(i + 1);
    }
  });
  recalcPps();
  camX = canvas.width  / 2;
  camY = canvas.height / 2;
  if (typeof _lpBuilt !== 'undefined') {
    _lpBuilt = false;
    _lpEl?.remove();
    _lpEl = null;
  }
  if (firstEver && typeof Radio !== 'undefined') Radio.unlockPrestigeTrack();
  saveGame();
  updateHUD(true);
}

// ─── RESET ────────────────────────────────────────────────────────────────────
const resetOverlay = document.getElementById('reset-overlay');

function openResetDialog() { resetOverlay.classList.add('open'); }

['reset-cancel', 'reset-cancel2'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => resetOverlay.classList.remove('open'));
});
document.getElementById('reset-confirm').addEventListener('click', () => {
  window.removeEventListener('beforeunload', saveGame);
  localStorage.removeItem('glaciopia_idle');
  location.reload();
});

document.getElementById('btn-center').addEventListener('click', () => {
  camX = canvas.width  / 2;
  camY = canvas.height / 2;
});
