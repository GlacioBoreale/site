'use strict';

// ─── STATO GLOBALE ────────────────────────────────────────────────────────────
const G = {
  points:            0,
  pps:               0,
  totalEarned:       0,
  lastTick:          0,
  basePps:           0,
  multiplier:        1,
  flatMulti:         1,
  multiIncBonus:     1,
  selfBoost:         false,
  selfBoostExp:      0.16,
  growsUnlocked:     false,
  extraLevels:       0,
  push4research:     false,
  boomboxUnlocked:   false,
  rightSideUnlocked: false,
  leftSideUnlocked:  false,
  startGoldLevels:  0,
  startGoldMultiP:   1,
  startGoldMultiL:   1,
  prestige:          0,
  hasPrestiged:      false,
  prestigeMulti:     1,
  prestigeGainMulti: 1,
  rLambdaMulti:      1,
  passiveLambda:     false,
  fastAndFurious:    false,
  unlazyScientists:  false,
  mat2Unlocked:      false,
  soloLevelingUnlocked: false,
  xp:                0,
  xpLevel:           0,
  toNewHeightsUnlocked: false,
  xpPerClick:        1,
  xpReqDiv:          1,
  holyGrailUnlocked: false,
  afterHalcyonUnlocked: false,
  delayedGratTime:   0,
  delayedGratUnlocked: false,
  research:          0,
  researchUnlocked:  false,
  rBasePps:          0,
  rMulti:            1,
};

// ─── STATO NODI ───────────────────────────────────────────────────────────────
const nodeState = {};
NODE_DEFS.forEach(n => { nodeState[n.id] = { level: 0 }; });

// ─── VISIBILITÀ ───────────────────────────────────────────────────────────────
const REQUIRES_RIGHT   = new Set(['thereItIs', 'nowWithExponents', 'costCutting', 'ThatsaLot', 'moreButDifferent']);
const REQUIRES_LEFT    = new Set(['push4research', 'toomanylvls', 'upgradeGenetics']);
const REQUIRES_PRESTIGE = new Set(['p_firstUpgrade']);
const REQUIRES_TNH     = new Set(['oneUp', 'downsizing', 'holyGrail', 'afterHalcyon', 'delayedGratification']);

function isVisible(nd) {
  if (nd.zone === 'research' && nd.id !== 'researchUnlock') return false;
  if (nd.zone === 'prestige') {
    if (!G.hasPrestiged && !nd.isPrestigeBtn && (nodeState['prestigeUnlock']?.level ?? 0) < 1) return false;
    if (G.hasPrestiged && nd.parents.includes('prestigeUnlock')) return true;
    if (nd.isPrestigeBtn) return G.hasPrestiged || nd.parents.every(pid => (nodeState[pid]?.level ?? 0) >= 1);
  }
  if (nd.parents.length === 0) return true;
  if ((nd.permanent || nd.isPrestigeBtn) && (nodeState[nd.id]?.level ?? 0) >= 1) return true;
  return nd.parents.every(pid => (nodeState[pid]?.level ?? 0) >= 1);
}

function isLocked(nd) {
  if (REQUIRES_RIGHT.has(nd.id)    && !G.rightSideUnlocked)    return true;
  if (REQUIRES_LEFT.has(nd.id)     && !G.leftSideUnlocked)     return true;
  if (REQUIRES_PRESTIGE.has(nd.id) && G.prestige < 1)          return true;
  if (REQUIRES_TNH.has(nd.id)      && !G.toNewHeightsUnlocked) return true;
  return false;
}

// ─── COSTI ────────────────────────────────────────────────────────────────────
function nodeCost(nd, lvl) {
  if (nd.costFn) return nd.costFn(lvl);
  return Math.floor(nd.baseCost * Math.pow(nd.costScale, lvl));
}

function researchCost(nd, lvl) {
  if (nd.costFn) return nd.costFn(lvl);
  return nd.baseCost * Math.pow(nd.costScale, lvl);
}

function pendingResearch() {
  const lvlML = G.soloLevelingUnlocked ? levelMultiL() : 1;
  return 0.00078 * Math.pow(Math.max(0, G.points), 0.75) * G.startGoldMultiL * G.rLambdaMulti * lvlML;
}

const PRESTIGE_SCALE = 10e15;
function pendingPrestige() {
  if (G.points <= 0) return 0;
  const lvlMPres = G.soloLevelingUnlocked ? levelMultiPrestige() : 1;
  return (Math.pow(G.points / PRESTIGE_SCALE, 0.16) + G.prestige) * G.prestigeGainMulti * lvlMPres;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
// ─── LEVELING ────────────────────────────────────────────────────────────────
function xpForLevel(lvl) {
  return Math.round(2 * Math.pow(2, lvl) / (G.xpReqDiv || 1));
}

function totalXpForLevel(lvl) {
  // somma xpForLevel(0..lvl-1)
  let tot = 0;
  for (let i = 0; i < lvl; i++) tot += xpForLevel(i);
  return tot;
}

function levelMultiP() {
  const lvl = G.xpLevel;
  if (lvl < 1)  return 1;
  if (lvl < 5)  return 1 + lvl * 0.1;
  if (lvl < 10) return (1 + 1 * 0.1) * Math.pow(1.1, lvl - 4);
  return (1 + 1 * 0.1) * Math.pow(1.1, 5) * (1 + (lvl - 9) * 0.1);
}

function levelMultiL() {
  const lvl = G.xpLevel;
  if (lvl < 10) return 1;
  return 1 + (lvl - 9) * 0.1;
}

function levelMultiPrestige() {
  const lvl = G.xpLevel;
  if (lvl < 15) return 1;
  return 1 + (lvl - 14) * 0.1;
}

function unlockedBaseNodes() {
  return NODE_DEFS.filter(n => n.zone === 'base' && (nodeState[n.id]?.level ?? 0) > 0).length;
}

function recalcPps() {
  let base  = G.basePps + G.rBasePps;
  let multi = G.multiplier * G.rMulti;
  let flat  = G.flatMulti;
  if (G.selfBoost && G.points > 0) {
    multi *= Math.max(1, Math.pow(G.points, G.selfBoostExp));
  }
  if (G.growsUnlocked) {
    multi *= Math.pow(1.2, unlockedBaseNodes());
  }
  if (G.push4research && G.research > 0) {
    multi *= Math.max(1, Math.pow(50 + G.research, 0.18));
  }
  const lvlMP = G.soloLevelingUnlocked ? levelMultiP() : 1;
  const lvlML = G.soloLevelingUnlocked ? levelMultiL() : 1;

  // holy grail
  const holyM = G.holyGrailUnlocked ? Math.max(1, Math.pow(G.prestige + 5, 0.4)) : 1;
  // delayed gratification
  const dgM = G.delayedGratUnlocked ? (Math.pow(G.delayedGratTime, 0.65) / 30 + 1) : 1;

  let pps = base * multi * flat * G.multiIncBonus * G.startGoldMultiP * G.prestigeMulti * lvlMP * holyM * dgM;

  // after halcyon: ^1.05 dopo tutti i moltiplicatori
  if (G.afterHalcyonUnlocked) pps = Math.pow(pps, 1.05);

  G.pps = pps;
}

// ─── FORMATTAZIONE ────────────────────────────────────────────────────────────
const SUFFIXES = [
  '', 'k', 'M', 'B', 'T',
  'Qd', 'Qn', 'Sx', 'Sp', 'Oc', 'No',        // 10^15 - 10^33
  'Dc', 'Ud', 'Dd', 'Td', 'QtD', 'QnD', 'SxD', 'SpD', 'OcD', 'NvD', // 10^33 - 10^63
  'Vg', 'UVg', 'DVg', 'TVg', 'QtVg', 'QnVg', 'SxVg', 'SpVg', 'OcVg', 'NvVg', // 10^63 - 10^93
  'Tg', 'UTg', 'DTg', 'TTg', 'QtTg', 'QnTg', 'SxTg', 'SpTg', 'OcTg', 'NvTg', // 10^93 - 10^123
  'Qag', 'UQag', 'DQag', 'TQag', 'QtQag', 'QnQag', 'SxQag', 'SpQag', 'OcQag', 'NvQag', // 10^123 - 10^153
  'Qig', 'UQig', 'DQig', 'TQig', 'QtQig', 'QnQig', 'SxQig', 'SpQig', 'OcQig', 'NvQig', // 10^153 - 10^183
  'Sxg', 'USxg', 'DSxg', 'TSxg', 'QtSxg', 'QnSxg', 'SxSxg', 'SpSxg', 'OcSxg', 'NvSxg', // 10^183 - 10^213
  'Spg', 'USpg', 'DSpg', 'TSpg', 'QtSpg', 'QnSpg', 'SxSpg', 'SpSpg', 'OcSpg', 'NvSpg', // 10^213 - 10^243
  'Ocg', 'UOcg', 'DOcg', 'TOcg', 'QtOcg', 'QnOcg', 'SxOcg', 'SpOcg', 'OcOcg', 'NvOcg', // 10^243 - 10^273
  'Nvg', 'UNvg', 'DNvg', 'TNvg', 'QtNvg', 'QnNvg', 'SxNvg', 'SpNvg', 'OcNvg', 'NvNvg', // 10^273 - 10^303
  'Ct', // 10^303
];

function trimDecimals(s) {
  return s.replace(/(\.[0-9]*?)0+$/, '$1').replace(/\.$/, '');
}

function fmt(n) {
  if (!isFinite(n) || isNaN(n)) return '0';
  if (n < 1000) return trimDecimals(n.toFixed(n < 10 ? 2 : 0));
  let i = 0;
  while (n >= 1000 && i < SUFFIXES.length - 1) { n /= 1000; i++; }
  return trimDecimals(n.toFixed(2)) + SUFFIXES[i];
}

function fmtLambda(n) {
  if (!isFinite(n) || isNaN(n)) return '0';
  if (n < 1000) return trimDecimals(n.toFixed(2));
  let i = 0;
  while (n >= 1000 && i < SUFFIXES.length - 1) { n /= 1000; i++; }
  return trimDecimals(n.toFixed(2)) + SUFFIXES[i];
}
