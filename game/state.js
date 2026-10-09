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
  startGoldLevels:   0,
  startGoldMultiP:   1,
  startGoldMultiL:   1,
  prestige:          0,
  hasPrestiged:      false,
  prestigeMulti:     1,
  prestigeGainMulti: 1,
  rLambdaMulti:      1,
  passiveLambda:     false,
  fastAndFurious:    false,
  genericFiller:     false,
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
  leaderboardUnlocked: false,
  leaderboardOptIn:    false,
  autonio:           0,
  bits:              0,
  bitsUnlocked:      false,
  pointCostMult:     1,
  levelTransformerUnlocked: false,
  automationUnlocked:       false,
  automationEnabled:        true,
  equippedTransformer:      null,
  reachedLvl100:            false,
  automatorBought:          false,
  boosterPBought:           false,
  cubeClicks:               0,
};

// ─── STATO NODI ───────────────────────────────────────────────────────────────
const nodeState = {};
NODE_DEFS.forEach(n => { nodeState[n.id] = { level: 0 }; });

// ─── VISIBILITÀ ───────────────────────────────────────────────────────────────
const REQUIRES_RIGHT    = new Set(['thereItIs', 'nowWithExponents', 'costCutting', 'ThatsaLot', 'moreButDifferent']);
const REQUIRES_LEFT     = new Set(['push4research', 'toomanylvls', 'upgradeGenetics']);
const REQUIRES_PRESTIGE = new Set(['p_firstUpgrade']);
const REQUIRES_TNH      = new Set(['oneUp', 'downsizing', 'holyGrail', 'afterHalcyon', 'delayedGratification']);

function isVisible(nd) {
  if (nd.zone === 'research' && nd.id !== 'researchUnlock') return false;
  if (nd.zone === 'automation') {
    if (!G.automationUnlocked) return false;
    if (nd.parents.length === 0) return true;
    if (nd.parents.includes('incrementalDream')) return true;
    return nd.parents.every(pid => (nodeState[pid]?.level ?? 0) >= 1);
  }
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
  let cost = nd.costFn ? nd.costFn(lvl) : Math.floor(nd.baseCost * Math.pow(nd.costScale, lvl));
  if (nd.zone === 'base') cost = Math.floor(cost * G.pointCostMult);
  return cost;
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
  const gain = Math.pow(G.points / PRESTIGE_SCALE, 0.16) * G.prestigeGainMulti * lvlMPres;
  return G.prestige + gain;
}

// ─── HELPERS / LEVELING ───────────────────────────────────────────────────────
function _autoNodeBought(id) {
  return (nodeState[id]?.level || 0) > 0;
}
function _autoNodeLevel(id) {
  return nodeState[id]?.level || 0;
}
function _countBoughtByLabelSuffix(suffix) {
  let n = 0;
  for (const nd of NODE_DEFS) {
    if (nd.zone !== 'automation') continue;
    if (!nd.label || !nd.label.startsWith('#')) continue;
    if (!nd.label.endsWith(suffix)) continue;
    if ((nodeState[nd.id]?.level || 0) > 0) n++;
  }
  return n;
}

function bitsExponent() {
  let exp = 0.01;
  if (_autoNodeBought('bg_pow1')) exp += 0.0025;
  if (_autoNodeBought('bg_evil')) exp *= 2;
  if (_autoNodeBought('bg_pow2')) exp += 0.0025;
  return exp;
}

function bitsPerSec() {
  if (!G.automationUnlocked) return 0;
  if (!_autoNodeBought('a_startAuto')) return 0;

  const pg = Math.max(0, G.pps);
  let gain = Math.pow(pg, bitsExponent());

  if (_autoNodeBought('bg_multi'))
    gain *= Math.pow(1.5, _autoNodeLevel('bg_multi'));

  if (_autoNodeBought('bg_mulSelf'))
    gain *= Math.pow(1.125, _countBoughtByLabelSuffix('bg'));

  if (_autoNodeBought('bg_mulA'))
    gain *= Math.pow(1.1, _countBoughtByLabelSuffix('a'));

  if (_autoNodeBought('bg_gain2x'))
    gain *= 2;

  if (_autoNodeBought('bg_random'))
    gain *= 1 + Math.random() * 2;

  if (_autoNodeBought('bg_25x'))
    gain *= 2.5;

  if (_autoNodeBought('bg_lambdaBoost')) {
    const lam = Math.max(0, G.research);
    const boost = Math.log(1 + lam) / Math.log(5);
    gain *= Math.max(1, Math.pow(boost, 0.75) / 10);
  }

  return gain;
}

// mappa: id nodo automate -> [min, max] label punti che automatizza
const AUTOMATE_RANGES = {
  a_automate1_5:   [1, 5],
  a_automate6_8:   [6, 8],
  a_automate9_15:  [9, 15],
  a_automate16_20: [16, 20],
  a_automate21_25: [21, 25],
  a_automate26_30: [26, 30],
};

// mappa: id nodo r_upg automation -> id nodo ricerca da automatizzare
const RUPG_MAP = {
  a_rupgPg:   'r_pointGain',
  a_rupgLs:   'r_leftSide',
  a_rupgRs:   'r_rightSide',
  a_rupgPg2:  'r_pointGain2',
  a_rupgPg3:  'r_pointGain3',
  a_rupgM:    'r_materialize',
  a_rupgM2:   'r_materialize2',
  a_rupgPg4:  'r_pointGain4',
  a_rupgPg1b: 'r_pointGain1b',
  // non ancora esistenti (arriveranno): a_rupgPg5, a_rupgM3, a_rupgM1b
};

// cache label -> nodo punti (zona base), costruita una volta
let _pointNodeByNum = null;
function _getPointNodeByNum(num) {
  if (!_pointNodeByNum) {
    _pointNodeByNum = {};
    for (const nd of NODE_DEFS) {
      if (nd.zone !== 'base') continue;
      const m = /^#(\d+)$/.exec(nd.label || '');
      if (m) _pointNodeByNum[+m[1]] = nd;
    }
  }
  return _pointNodeByNum[num] || null;
}

function _autoBuyNode(nd, ultra) {
  const st = nodeState[nd.id];
  if (!st || !isVisible(nd) || isLocked(nd)) return false;
  let bought = false;
  do {
    if (st.level >= nd.maxLevel) break;
    const cost = nodeCost(nd, st.level);
    if (G.points < cost) break;
    G.points -= cost;
    st.level++;
    nd.onBuy(st.level);
    bought = true;
  } while (ultra);
  return bought;
}

function _autoBuyResearchNode(nd, ultra) {
  const st = nodeState[nd.id];
  if (!st) return false;
  if (!G.researchUnlocked) return false;
  if (isLocked(nd)) return false;
  // i nodi ricerca hanno isVisible=false (pannello separato): uso i prerequisiti reali
  const parentsOk = nd.parents.every(pid => (nodeState[pid]?.level ?? 0) >= 1);
  if (!parentsOk) return false;
  let bought = false;
  do {
    if (st.level >= nd.maxLevel) break;
    const cost = researchCost(nd, st.level);
    if (G.research < cost) break;
    G.research -= cost;
    st.level++;
    nd.onBuy(st.level);
    bought = true;
  } while (ultra);
  return bought;
}

function runAutomation(dt) {
  if (!G.automationUnlocked) return;
  if (!G.automationEnabled) return;
  if (!_autoNodeBought('a_startAuto')) return;

  // leggero delay dopo una conversione, prima di ricomprare i nodi (come nell'originale):
  // evita il loop research<->punti quando si converte ripetutamente
  if (G.lastConvertTime && (Date.now() - G.lastConvertTime) < 500) return;

  const ultra = _autoNodeBought('a_ultra');
  let anyBought = false;

  // automate(N,M): compra i nodi punti #N-M
  for (const autoId in AUTOMATE_RANGES) {
    if (!_autoNodeBought(autoId)) continue;
    const [min, max] = AUTOMATE_RANGES[autoId];
    for (let num = min; num <= max; num++) {
      const nd = _getPointNodeByNum(num);
      if (!nd) continue;
      if (_autoBuyNode(nd, ultra)) anyBought = true;
    }
  }

  // r_upg(...): automatizza i nodi ricerca corrispondenti
  for (const autoId in RUPG_MAP) {
    if (!_autoNodeBought(autoId)) continue;
    const rNode = NODE_DEFS.find(n => n.id === RUPG_MAP[autoId]);
    if (!rNode) continue;
    if (_autoBuyResearchNode(rNode, ultra)) anyBought = true;
  }

  if (anyBought) recalcPps();
}

function xpForLevel(lvl) {
  return Math.round(2 * Math.pow(2, lvl) / (G.xpReqDiv || 1));
}

function totalXpForLevel(lvl) {
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
  const holyM = G.holyGrailUnlocked ? Math.max(1, Math.pow(G.prestige + 5, 0.4)) : 1;
  const dgM   = G.delayedGratUnlocked ? (Math.pow(G.delayedGratTime, 0.65) / 30 + 1) : 1;
  let pps = base * multi * flat * G.multiIncBonus * G.startGoldMultiP * G.prestigeMulti * lvlMP * holyM * dgM;
  if (G.afterHalcyonUnlocked) pps = Math.pow(pps, 1.05);
  G.pps = pps;
}

// ─── FORMATTAZIONE ────────────────────────────────────────────────────────────
const SUFFIXES = [
  '', 'k', 'M', 'B', 'T',
  'Qd', 'Qn', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'Ud', 'Dd', 'Td', 'QtD', 'QnD', 'SxD', 'SpD', 'OcD', 'NvD',
  'Vg', 'UVg', 'DVg', 'TVg', 'QtVg', 'QnVg', 'SxVg', 'SpVg', 'OcVg', 'NvVg',
  'Tg', 'UTg', 'DTg', 'TTg', 'QtTg', 'QnTg', 'SxTg', 'SpTg', 'OcTg', 'NvTg',
  'Qag', 'UQag', 'DQag', 'TQag', 'QtQag', 'QnQag', 'SxQag', 'SpQag', 'OcQag', 'NvQag',
  'Qig', 'UQig', 'DQig', 'TQig', 'QtQig', 'QnQig', 'SxQig', 'SpQig', 'OcQig', 'NvQig',
  'Sxg', 'USxg', 'DSxg', 'TSxg', 'QtSxg', 'QnSxg', 'SxSxg', 'SpSxg', 'OcSxg', 'NvSxg',
  'Spg', 'USpg', 'DSpg', 'TSpg', 'QtSpg', 'QnSpg', 'SxSpg', 'SpSpg', 'OcSpg', 'NvSpg',
  'Ocg', 'UOcg', 'DOcg', 'TOcg', 'QtOcg', 'QnOcg', 'SxOcg', 'SpOcg', 'OcOcg', 'NvOcg',
  'Nvg', 'UNvg', 'DNvg', 'TNvg', 'QtNvg', 'QnNvg', 'SxNvg', 'SpNvg', 'OcNvg', 'NvNvg',
  'Ct',
];

function trimDecimals(s) {
  return s.replace(/(\.[0-9]*?)0+$/, '$1').replace(/\.$/, '');
}

function fmt(n) {
  n = Number(n);
  if (!isFinite(n) || isNaN(n)) return '0';
  if (n < 1000) return trimDecimals(n.toFixed(n < 10 ? 2 : 0));
  let i = 0;
  while (n >= 1000 && i < SUFFIXES.length - 1) { n /= 1000; i++; }
  return trimDecimals(n.toFixed(2)) + SUFFIXES[i];
}

function fmtLambda(n) {
  n = Number(n);
  if (!isFinite(n) || isNaN(n)) return '0';
  if (n < 1000) return trimDecimals(n.toFixed(2));
  let i = 0;
  while (n >= 1000 && i < SUFFIXES.length - 1) { n /= 1000; i++; }
  return trimDecimals(n.toFixed(2)) + SUFFIXES[i];
}

function fmtMulti(val) {
  if (!isFinite(val) || isNaN(val)) return '?';
  if (val < 1e4) return val.toFixed(val < 100 ? 2 : 0);
  if (val < 1e6)  return (val / 1e3).toFixed(1)  + 'k';
  if (val < 1e9)  return (val / 1e6).toFixed(2)  + 'M';
  if (val < 1e12) return (val / 1e9).toFixed(2)  + 'B';
  if (val < 1e15) return (val / 1e12).toFixed(2) + 'T';
  return fmt(val);
}