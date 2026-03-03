'use strict';

const SAVE_KEY = 'glaciopia_idle';

function saveGame() {
  const save = {
    points:            G.points,
    totalEarned:       G.totalEarned,
    basePps:           G.basePps,
    multiplier:        G.multiplier,
    flatMulti:         G.flatMulti,
    multiIncBonus:     G.multiIncBonus,
    selfBoost:         G.selfBoost,
    selfBoostExp:      G.selfBoostExp,
    growsUnlocked:     G.growsUnlocked,
    extraLevels:       G.extraLevels,
    push4research:     G.push4research,
    boomboxUnlocked:   G.boomboxUnlocked,
    rightSideUnlocked: G.rightSideUnlocked,
    leftSideUnlocked:  G.leftSideUnlocked,
    research:          G.research,
    researchUnlocked:  G.researchUnlocked,
    rBasePps:          G.rBasePps,
    rMulti:            G.rMulti,
    prestige:          G.prestige,
    hasPrestiged:      G.hasPrestiged,
    prestigeMulti:     G.prestigeMulti,
    prestigeGainMulti: G.prestigeGainMulti,
    rLambdaMulti:      G.rLambdaMulti,
    passiveLambda:     G.passiveLambda,
    fastAndFurious:    G.fastAndFurious,
    unlazyScientists:  G.unlazyScientists,
    mat2Unlocked:        G.mat2Unlocked,
    soloLevelingUnlocked:  G.soloLevelingUnlocked,
    xp:                    G.xp,
    xpLevel:               G.xpLevel,
    toNewHeightsUnlocked:  G.toNewHeightsUnlocked,
    xpPerClick:            G.xpPerClick,
    xpReqDiv:              G.xpReqDiv,
    holyGrailUnlocked:     G.holyGrailUnlocked,
    afterHalcyonUnlocked:  G.afterHalcyonUnlocked,
    delayedGratTime:       G.delayedGratTime,
    delayedGratUnlocked:   G.delayedGratUnlocked,
    totalTimeSec:           G.totalTimeSec || 0,
    prestigeCount:         G.prestigeCount || 0,
    nodes:                 {},
  };
  NODE_DEFS.forEach(n => { save.nodes[n.id] = { ...nodeState[n.id] }; });
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const save = JSON.parse(raw);
    G.points            = save.points            || 0;
    G.totalEarned       = save.totalEarned       || 0;
    G.basePps           = save.basePps           || 0;
    G.multiplier        = save.multiplier        || 1;
    G.flatMulti         = save.flatMulti         || 1;
    G.multiIncBonus     = save.multiIncBonus      || 1;
    G.selfBoost         = save.selfBoost         || false;
    G.selfBoostExp      = save.selfBoostExp      ?? 0.16;
    G.growsUnlocked     = save.growsUnlocked     || false;
    G.extraLevels       = save.extraLevels       || 0;
    G.push4research     = save.push4research     || false;
    G.boomboxUnlocked   = save.boomboxUnlocked   || false;
    G.rightSideUnlocked = save.rightSideUnlocked || false;
    G.leftSideUnlocked  = save.leftSideUnlocked  || false;
    G.research          = save.research          || 0;
    G.researchUnlocked  = save.researchUnlocked  || false;
    G.rBasePps          = save.rBasePps          || 0;
    G.rMulti            = save.rMulti            || 1;
    G.prestige          = save.prestige          || 0;
    G.hasPrestiged      = save.hasPrestiged      || false;
    G.prestigeMulti     = save.prestigeMulti     || 1;
    G.prestigeGainMulti = save.prestigeGainMulti || 1;
    G.rLambdaMulti      = save.rLambdaMulti      || 1;
    G.passiveLambda     = save.passiveLambda     || false;
    G.fastAndFurious    = save.fastAndFurious    || false;
    G.unlazyScientists  = save.unlazyScientists  || false;
    G.mat2Unlocked         = save.mat2Unlocked         || false;
    G.soloLevelingUnlocked  = save.soloLevelingUnlocked  || false;
    G.xp                    = save.xp                    || 0;
    G.xpLevel               = save.xpLevel               || 0;
    G.toNewHeightsUnlocked  = save.toNewHeightsUnlocked  || false;
    G.xpPerClick            = save.xpPerClick            || 1;
    G.xpReqDiv              = save.xpReqDiv              || 1;
    G.holyGrailUnlocked     = save.holyGrailUnlocked     || false;
    G.afterHalcyonUnlocked  = save.afterHalcyonUnlocked  || false;
    G.delayedGratTime       = save.delayedGratTime       || 0;
    G.delayedGratUnlocked   = save.delayedGratUnlocked   || false;
    G.totalTimeSec          = save.totalTimeSec          || 0;
    G.prestigeCount         = save.prestigeCount         || 0;
    if (save.nodes) {
      Object.keys(save.nodes).forEach(id => {
        if (nodeState[id]) Object.assign(nodeState[id], save.nodes[id]);
      });
      replayEffects();
    }
    recalcPps();
    if (G.hasPrestiged && typeof Radio !== 'undefined') setTimeout(() => Radio.unlockPrestigeTrack(), 0);
  } catch (e) {
    console.warn('Save corrotto, ignorato.', e);
  }
}

function replayEffects() {
  G.basePps           = 0;
  G.multiplier        = 1;
  G.flatMulti         = 1;
  G.multiIncBonus     = 1;
  G.selfBoost         = false;
  G.selfBoostExp      = 0.16;
  G.growsUnlocked     = false;
  G.extraLevels       = 0;
  G.push4research     = false;
  G.rightSideUnlocked = false;
  G.leftSideUnlocked  = false;
  G.researchUnlocked  = false;
  G.rBasePps             = 0;
  G.rMulti               = 1;
  G.toNewHeightsUnlocked = false;
  G.xpPerClick           = 1;
  G.xpReqDiv             = 1;
  G.holyGrailUnlocked    = false;
  G.afterHalcyonUnlocked = false;
  G.delayedGratUnlocked  = false;
  NODE_DEFS.find(n => n.id === 'multiInc').maxLevel = 3;
  NODE_DEFS.find(n => n.id === 'start').maxLevel    = 1;
  topologicalSort().forEach(nd => {
    const lvl = nodeState[nd.id].level;
    for (let i = 0; i < lvl; i++) nd.onBuy(i + 1);
  });
}

function topologicalSort() {
  const visited = new Set();
  const result  = [];
  function visit(nd) {
    if (visited.has(nd.id)) return;
    visited.add(nd.id);
    nd.parents.forEach(pid => {
      const p = NODE_DEFS.find(n => n.id === pid);
      if (p) visit(p);
    });
    result.push(nd);
  }
  NODE_DEFS.forEach(nd => visit(nd));
  return result;
}

setInterval(saveGame, 10000);
window.addEventListener('beforeunload', saveGame);
