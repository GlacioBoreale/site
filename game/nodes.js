'use strict';

// helper shorthand — disponibile dopo i18n.js
const _nd = {
  perm:       () => gt('nodes.permanent'),
  right:      () => gt('nodes.buyRight'),
  left:       () => gt('nodes.buyLeft'),
  lockHint:   () => gt('nodes.lockHint'),
  p3:         () => gt('nodes.buy3p'),
  p3zone:     () => gt('nodes.buy3pZone'),
  gold:       () => gt('nodes.goldBoost'),
  rc:         () => gt('nodes.researchCenter'),
  stereo:     () => gt('nodes.stereo'),
  lc:         () => gt('nodes.levelingCenter'),
  obelisk:    () => gt('nodes.mysticObelisk'),
  t:          (id) => gt('nodes.titles.' + id) || id,
};

const NODE_DEFS = [
  //  ZONA BASE
  {
    id: 'start',
    x: 0, y: 0,
    label: '#1',
    title: 'Generic Beginning',
    desc: (page) => {
      if (page === 1 && G.startGoldLevels > 0) {
        return [
          { text: _nd.gold(), color: '#fbbf24' },
          { text: 'x' + (1.5 * G.startGoldLevels).toFixed(1) + ' \u20bd', color: null },
          { text: 'x' + (1.25 * G.startGoldLevels).toFixed(2) + ' \u03bb', color: '#38bdf8' },
        ];
      }
      return [
        { text: 'Start getting "Points" \u20bd', color: null },
        { text: 'at a rate of 1/s', color: null },
      ];
    },
    descPages: () => G.startGoldLevels > 0 ? 2 : 1,
    maxLevel: 1,
    baseCost: 0,
    costScale: 1,
    zone: 'base',
    gold: () => G.startGoldLevels > 0,
    statLabel: '+1 \u20bd/s',
    parents: [],
    onBuy: (lvl) => { G.basePps += 1; recalcPps(); },
  },
  {
    id: 'flat2x',
    x: 340, y: 0,
    label: '#2',
    title: 'An increment',
    desc: (page) => {
      if (page === 1 && (nodeState['flat2x']?.level ?? 0) >= 2) {
        return [
          { text: _nd.gold(), color: '#fbbf24' },
          { text: 'x1.5 \u20bd bonus', color: null },
        ];
      }
      return [{ text: 'x2 \u20bd gain', color: null }];
    },
    descPages: () => (nodeState['flat2x']?.level ?? 0) >= 2 ? 2 : 1,
    maxLevel: 1,
    baseCost: 5,
    costFn: (lvl) => lvl === 0 ? 5 : 25e15,
    costScale: 1,
    zone: 'base',
    gold: () => (nodeState['flat2x']?.level ?? 0) >= 2,
    statLabel: (lvl) => lvl >= 2 ? 'x2 \u20bd | x1.5 \u20bd' : 'x2 \u20bd',
    parents: ['start'],
    onBuy: (lvl) => { G.flatMulti *= lvl === 1 ? 2 : 1.5; recalcPps(); },
  },
  {
    id: 'flat3x',
    x: 340, y: -200,
    label: '#3',
    title: 'A bigger increment',
    desc: (page) => {
      if (page === 1 && (nodeState['flat3x']?.level ?? 0) >= 2) {
        return [
          { text: _nd.gold(), color: '#fbbf24' },
          { text: 'x2 \u20bd bonus', color: null },
        ];
      }
      return [{ text: 'x3 \u20bd gain', color: null }];
    },
    descPages: () => (nodeState['flat3x']?.level ?? 0) >= 2 ? 2 : 1,
    maxLevel: 1,
    baseCost: 12,
    costFn: (lvl) => lvl === 0 ? 12 : 500e15,
    costScale: 1,
    zone: 'base',
    gold: () => (nodeState['flat3x']?.level ?? 0) >= 2,
    statLabel: (lvl) => lvl >= 2 ? 'x3 \u20bd | x2 \u20bd' : 'x3 \u20bd',
    parents: ['flat2x'],
    onBuy: (lvl) => { G.flatMulti *= lvl === 1 ? 3 : 2; recalcPps(); },
  },
  {
    id: 'multiInc',
    x: 340, y: 200,
    label: '#4',
    title: 'More than one increment',
    desc: [
      { text: '+0.5x \u20bd per level', color: null },
      { text: '(starts at x1)', color: null },
    ],
    maxLevel: 3,
    costFn: (lvl) => {
      const fixed = [25, 40, 55, 300, 400, 500, 600, 700, 800, 900];
      if (lvl < fixed.length) return fixed[lvl];
      if (lvl < 40) return 500000000 + (lvl - 10) * 50000000;
      return Math.round(13.41e12 * Math.pow(1.253, lvl - 40));
    },
    baseCost: 0,
    costScale: 1,
    zone: 'base',
    statLabel: (lvl) => `x${1 + 0.5 * lvl} \u20bd`,
    parents: ['flat2x'],
    onBuy: (lvl) => { G.multiIncBonus = 1 + 0.5 * lvl; recalcPps(); },
  },
  {
    id: 'selfBoost',
    x: -340, y: 0,
    label: '#5',
    title: 'An advanced increment',
    desc: () => [
      { text: '\u20bd boosts itself', color: null },
      { text: `x(\u20bd^${G.selfBoostExp.toFixed(2)}, min 1)`, color: '#4ade80' },
    ],
    maxLevel: 1,
    baseCost: 100,
    costScale: 1,
    zone: 'base',
    statLabel: (lvl) => lvl > 0
      ? `x${fmtMulti(Math.max(1, Math.pow(G.points, G.selfBoostExp)))}`
      : `x(\u20bd^${G.selfBoostExp.toFixed(2)}, min 1)`,
    parents: ['start'],
    onBuy: (lvl) => { G.selfBoost = true; recalcPps(); },
  },
  {
    id: 'grows',
    x: -680, y: 0,
    label: '#6',
    title: 'It grows...',
    desc: [
      { text: 'For each point upgrade unlocked,', color: null },
      { text: 'x1.2\u20bd compounding', color: '#4ade80' },
    ],
    maxLevel: 1,
    baseCost: 500,
    costScale: 1,
    zone: 'base',
    statLabel: (lvl) => lvl > 0
      ? `x${fmtMulti(Math.pow(1.2, unlockedBaseNodes()))} (${unlockedBaseNodes()} nodes)`
      : 'x1.2 per base node',
    parents: ['selfBoost'],
    onBuy: (lvl) => { G.growsUnlocked = true; recalcPps(); },
  },
  {
    id: 'morelvls',
    x: -680, y: -200,
    label: '#7',
    title: 'Even more levels',
    desc: [{ text: '+7 level cap to #4', color: '#4ade80' }],
    maxLevel: 1,
    baseCost: 1000,
    costScale: 1,
    zone: 'base',
    statLabel: '',
    parents: ['selfBoost'],
    onBuy: (lvl) => {
      G.extraLevels += 7;
      NODE_DEFS.find(n => n.id === 'multiInc').maxLevel += 7;
      recalcPps();
    },
  },
  {
    id: 'researchUnlock',
    x: 0, y: -200,
    label: '#8',
    title: 'New Techs',
    desc: () => [
      { text: 'Unlocks the', color: null },
      { text: _nd.rc(), color: '#38bdf8' },
      { text: _nd.perm(), color: '#f87171' },
    ],
    maxLevel: 1,
    baseCost: 10000,
    costScale: 1,
    zone: 'base',
    statLabel: '',
    parents: ['start'],
    permanent: true,
    onBuy: (lvl) => { G.researchUnlocked = true; recalcPps(); },
  },
  {
    id: 'boombox',
    x: 0, y: 400,
    label: '#9',
    title: 'But it\'s not that empty',
    desc: () => [
      { text: 'Unlocks the', color: null },
      { text: _nd.stereo(), color: '#fbbf24' },
      { text: _nd.perm(), color: '#f87171' },
    ],
    maxLevel: 1,
    baseCost: 1000,
    costScale: 1,
    zone: 'base',
    statLabel: '',
    parents: ['start'],
    permanent: true,
    onBuy: (lvl) => { G.boomboxUnlocked = true; recalcPps(); syncRadioVisibility(); },
  },
  {
    id: 'leaderboardUnlock',
    x: -340, y: 400,
    label: '🏆',
    title: 'Engraved in history',
    desc: () => [
      { text: 'Choose if you want to show up', color: null },
      { text: 'in the global rankings', color: '#fbbf24' },
      { text: _nd.perm(), color: '#f87171' },
    ],
    maxLevel: 1,
    baseCost: 0,
    costScale: 1,
    costInPrestige: true,
    zone: 'base',
    statLabel: lvl => lvl > 0 ? 'check the leaderboard' : '',
    parents: ['boombox'],
    permanent: true,
    onBuy: () => {
      G.leaderboardUnlocked = true;
      if (typeof syncLeaderboardBtn === 'function') syncLeaderboardBtn();
    },
  },
  {
    id: 'thereItIs',
    x: 680, y: 0,
    label: '#10',
    title: 'There it is',
    desc: () => G.rightSideUnlocked
      ? [{ text: 'x4 \u20bd gain', color: '#4ade80' }]
      : [{ text: _nd.right(), color: '#f87171' },
         { text: _nd.lockHint(), color: '#f87171' }],
    maxLevel: 1,
    baseCost: 125000,
    costScale: 1,
    zone: 'base',
    statLabel: 'x4\u20bd',
    parents: ['flat2x'],
    onBuy: (lvl) => { G.flatMulti *= 4; recalcPps(); },
  },
  {
    id: 'push4research',
    x: -1020, y: 0,
    label: '#11',
    title: 'Press 4 research',
    desc: () => G.leftSideUnlocked
      ? [{ text: '\u20bd gain is boosted by \u03bb', color: null },
         { text: '', color: '#4ade80' }]
      : [{ text: _nd.left(), color: '#f87171' },
         { text: _nd.lockHint(), color: '#f87171' }],
    maxLevel: 1,
    baseCost: 500000,
    costScale: 1,
    zone: 'base',
    statLabel: (lvl) => lvl > 0
      ? `x${fmtMulti(Math.max(1, Math.pow(50 + G.research, 0.18)))}`
      : 'x((50+\u03bb)^0.18, min 1)',
    parents: ['selfBoost'],
    onBuy: (lvl) => { G.push4research = true; recalcPps(); },
  },
  {
    id: 'nowWithExponents',
    x: 1020, y: 0,
    label: '#12',
    title: 'Now with exponents',
    desc: () => G.rightSideUnlocked
      ? [{ text: 'x1.3 \u20bd per level', color: '#4ade80' }]
      : [{ text: _nd.right(), color: '#f87171' },
         { text: _nd.lockHint(), color: '#f87171' }],
    maxLevel: 20,
    costFn: (lvl) => {
      const div = Math.pow(50, nodeState['costCutting']?.level ?? 0);
      return Math.floor(1000000 * Math.pow(10, lvl) / div);
    },
    baseCost: 1000000,
    costScale: 1,
    zone: 'base',
    statLabel: (lvl) => `x${fmtMulti(Math.pow(1.3, lvl))} \u20bd`,
    parents: ['thereItIs'],
    onBuy: (lvl) => { G.flatMulti *= 1.3; recalcPps(); },
  },
  {
    id: 'costCutting',
    x: 1020, y: 200,
    label: '#13',
    title: 'Cost Cutting',
    desc: () => G.rightSideUnlocked
      ? [{ text: '\u00f7(50^level) to #12 cost', color: '#4ade80' }]
      : [{ text: _nd.right(), color: '#f87171' },
         { text: _nd.lockHint(), color: '#f87171' }],
    maxLevel: 5,
    costFn: (lvl) => [10000000, 250000000, 6250000000, 156250000000, 3906250000000][lvl] ?? 0,
    baseCost: 0,
    costScale: 1,
    zone: 'base',
    statLabel: (lvl) => lvl > 0 ? `\u00f7${Math.pow(50, lvl).toExponential(1)}` : '\u00f750^lvl on #12',
    parents: ['multiInc'],
    onBuy: (lvl) => { recalcPps(); },
  },
  {
    id: 'ThatsaLot',
    x: 680, y: -200,
    label: '#14',
    title: 'This is big',
    desc: () => G.rightSideUnlocked
      ? [{ text: 'x5 \u20bd', color: '#4ade80' }]
      : [{ text: _nd.right(), color: '#f87171' },
         { text: _nd.lockHint(), color: '#f87171' }],
    maxLevel: 1,
    baseCost: 400000000,
    costScale: 1,
    zone: 'base',
    statLabel: 'x5 \u20bd',
    parents: ['flat3x'],
    onBuy: (lvl) => { G.flatMulti *= 5; recalcPps(); },
  },
  {
    id: 'toomanylvls',
    x: -1020, y: -200,
    label: '#15',
    title: 'TOO MANY LEVELS',
    desc: () => G.leftSideUnlocked
      ? [{ text: '+30 max levels to #4', color: '#4ade80' }]
      : [{ text: _nd.left(), color: '#f87171' },
         { text: _nd.lockHint(), color: '#f87171' }],
    maxLevel: 1,
    baseCost: 10000000000,
    costScale: 1,
    zone: 'base',
    statLabel: '',
    parents: ['morelvls'],
    onBuy: (lvl) => {
      G.extraLevels += 30;
      NODE_DEFS.find(n => n.id === 'multiInc').maxLevel += 30;
      recalcPps();
    },
  },
  {
    id: 'soloLeveling',
    x: 1020, y: -200,
    label: '#16',
    title: 'Solo leveling',
    desc: () => G.rightSideUnlocked
      ? [{ text: 'Unlocks the', color: null },
         { text: _nd.lc(), color: '#4ade80' },
         { text: _nd.perm(), color: '#f87171' }]
      : [{ text: _nd.right(), color: '#f87171' },
         { text: _nd.lockHint(), color: '#f87171' }],
    maxLevel: 1,
    baseCost: 100000000000,
    costScale: 1,
    zone: 'base',
    statLabel: '',
    parents: ['ThatsaLot'],
    permanent: true,
    onBuy: () => { G.soloLevelingUnlocked = true; recalcPps(); },
  },
  {
    id: 'moreButDifferent',
    x: 340, y: -400,
    label: '#19',
    title: 'More but different',
    desc: () => G.rightSideUnlocked
      ? [{ text: 'x3 \u03bb', color: '#38bdf8' }]
      : [{ text: _nd.right(), color: '#f87171' },
         { text: _nd.lockHint(), color: '#f87171' }],
    maxLevel: 1,
    baseCost: 1000000000000,
    costScale: 1,
    zone: 'base',
    statLabel: 'x3\u03bb',
    parents: ['flat3x'],
    onBuy: (lvl) => { G.rMulti *= 3; recalcPps(); },
  },
  {
    id: 'upgradeGenetics',
    x: -340, y: 200,
    label: '#21',
    title: 'Genetics Upgrade',
    desc: () => G.leftSideUnlocked
      ? [{ text: '+0.05 exponent to #5', color: '#4ade80' },
         { text: _nd.perm(), color: '#f87171' }]
      : [{ text: _nd.left(), color: '#f87171' },
         { text: _nd.lockHint(), color: '#f87171' }],
    maxLevel: 1,
    baseCost: 100000,
    costScale: 1,
    zone: 'base',
    costInLambda: true,
    statLabel: (lvl) => lvl > 0 ? `#5 exp: ${G.selfBoostExp.toFixed(2)}` : '+0.05 exp to #5',
    parents: ['selfBoost'],
    permanent: true,
    onBuy: (lvl) => { G.selfBoostExp += 0.05; recalcPps(); },
  },
  {
    id: 'absolutefrenzy',
    x: -1020, y: -400,
    label: '#30',
    title: 'Absolute FRENZY',
    desc: () => G.leftSideUnlocked
      ? [{ text: '+250 max levels to #4', color: '#4ade80' }]
      : [{ text: _nd.left(), color: '#f87171' },
         { text: _nd.lockHint(), color: '#f87171' }],
    maxLevel: 1,
    baseCost: 10e30,
    costScale: 1,
    zone: 'base',
    statLabel: '',
    parents: ['toomanylvls'],
    onBuy: (lvl) => {
      G.extraLevels += 250;
      NODE_DEFS.find(n => n.id === 'multiInc').maxLevel += 250;
      recalcPps();
    },
  },


  //  ZONA RICERCA
  {
    id: 'r_pointGain',
    x: 0, y: -1200,
    label: 'R1',
    title: 'Point Gain 1',
    desc: [
      { text: '+1x \u20bd multiplier', color: null },
      { text: 'per level', color: null },
    ],
    maxLevel: 20,
    costFn: (lvl) => 0.2 + (lvl * 0.2),
    baseCost: 0,
    costScale: 1,
    zone: 'research',
    statLabel: (lvl) => `x${1 + lvl} \u20bd`,
    parents: ['researchUnlock'],
    onBuy: (lvl) => { G.rMulti += 1; recalcPps(); },
  },
  {
    id: 'r_leftSide',
    x: -340, y: -1200,
    label: 'R2',
    title: 'Left side',
    desc: [
      { text: 'Unlocks more upgrades on the left', color: null },
      { text: 'of the main tree', color: null },
      { text: 'Recommended to take R3 first', color: '#fbbf24' },
    ],
    maxLevel: 1,
    baseCost: 10,
    costScale: 1,
    zone: 'research',
    statLabel: 'unlocks left side',
    parents: ['r_pointGain'],
    onBuy: (lvl) => { G.leftSideUnlocked = true; recalcPps(); },
  },
  {
    id: 'r_rightSide',
    x: 340, y: -1200,
    label: 'R3',
    title: 'Right side',
    desc: [
      { text: 'Unlocks more upgrades on the right', color: null },
      { text: 'of the main tree', color: null },
      { text: 'Recommended to take first', color: '#4ade80' },
    ],
    maxLevel: 1,
    baseCost: 10,
    costScale: 1,
    zone: 'research',
    statLabel: 'unlocks right side',
    parents: ['r_pointGain'],
    onBuy: (lvl) => { G.rightSideUnlocked = true; recalcPps(); },
  },
  {
    id: 'r_pointGain2',
    x: 0, y: -1400,
    label: 'R4',
    title: 'Point Gain 2',
    desc: [
      { text: '+0.5x \u20bd multiplier', color: null },
      { text: 'per level', color: null },
    ],
    maxLevel: 10,
    costFn: (lvl) => 100 + (lvl * 100),
    baseCost: 0,
    costScale: 1,
    zone: 'research',
    statLabel: (lvl) => `x${(1 + lvl * 0.5).toFixed(1)} \u20bd`,
    parents: ['r_pointGain'],
    onBuy: (lvl) => { G.rMulti += 0.5; recalcPps(); },
  },
  {
    id: 'r_materialize',
    x: 340, y: -1400,
    label: 'R5',
    title: 'Materialize',
    desc: [
      { text: 'Unlocks more upgrade tiers', color: null },
      { text: '+1 gold level to #1', color: '#fbbf24' },
    ],
    maxLevel: 1,
    baseCost: 3000000,
    costScale: 1,
    zone: 'research',
    statLabel: '+1 gold lvl to #1',
    parents: ['r_pointGain'],
    onBuy: (lvl) => {
      const nd = NODE_DEFS.find(n => n.id === 'start');
      nd.maxLevel += 1;
      G.startGoldLevels += 1;
      G.startGoldMultiP = Math.pow(1.5, G.startGoldLevels);
      G.startGoldMultiL = Math.pow(1.25, G.startGoldLevels);
      recalcPps();
    },
  },
  {
    id: 'r_materialize2',
    x: 340, y: -1600,
    label: 'R5b',
    title: 'Materialize 2',
    desc: [
      { text: '+1 max level to #2 and #3', color: '#fbbf24' },
    ],
    maxLevel: 1,
    baseCost: 500000000,
    costScale: 1,
    zone: 'research',
    statLabel: (lvl) => lvl > 0 ? '#2 and #3 gold' : '',
    parents: ['r_materialize'],
    onBuy: () => {
      const n2 = NODE_DEFS.find(n => n.id === 'flat2x');
      const n3 = NODE_DEFS.find(n => n.id === 'flat3x');
      if (n2.maxLevel < 2) n2.maxLevel = 2;
      if (n3.maxLevel < 2) n3.maxLevel = 2;
      G.mat2Unlocked = true;
      recalcPps();
    },
  },
  {
    id: 'r_pointGain3',
    x: 0, y: -1600,
    label: 'R6',
    title: 'Point Gain 3',
    desc: [
      { text: '+0.5x \u20bd multiplier', color: null },
      { text: 'per level', color: null },
    ],
    maxLevel: 10,
    costFn: (lvl) => 100000 + lvl * 100000,
    baseCost: 100000,
    costScale: 1,
    zone: 'research',
    statLabel: (lvl) => `x${(1 + lvl * 0.5).toFixed(1)} \u20bd`,
    parents: ['r_pointGain2'],
    onBuy: (lvl) => { G.rMulti += 0.5; recalcPps(); },
  },
  {
    id: 'r_pointGain4',
    x: 0, y: -1800,
    label: 'R7',
    title: 'Point Gain 4',
    desc: [
      { text: '+0.5x \u20bd multiplier', color: null },
      { text: 'per level', color: null },
    ],
    maxLevel: 10,
    costFn: (lvl) => [100e9, 400e9, 1.2e12, 3.2e12, 8e12, 19.2e12, 44.8e12, 102.4e12, 230.4e12, 512e12][lvl] ?? 512e12,
    baseCost: 0,
    costScale: 1,
    zone: 'research',
    statLabel: (lvl) => `x${(1 + lvl * 0.5).toFixed(1)} \u20bd`,
    parents: ['r_pointGain3'],
    onBuy: (lvl) => { G.rMulti += 0.5; recalcPps(); },
  },
  {
    id: 'r_pointGain1b',
    x: 340, y: -1800,
    label: 'R8',
    title: 'Point Gain 1B',
    desc: [
      { text: 'x2 \u20bd per level', color: null },
      { text: '(compounding, from x1)', color: null },
    ],
    maxLevel: 5,
    costFn: (lvl) => [10e12, 100e12, 1e15, 10e15, 100e15][lvl] ?? 1e21,
    baseCost: 0,
    costScale: 1,
    zone: 'research',
    statLabel: (lvl) => `x${Math.pow(2, lvl)} \u20bd`,
    parents: ['r_pointGain4'],
    onBuy: () => { G.flatMulti *= 2; recalcPps(); },
  },


  //  ZONA PRESTIGE
  {
    id: 'prestigeUnlock',
    x: 1620, y: 200,
    label: '',
    title: 'PRESTIGE',
    isPrestigeBtn: true,
    desc: () => {
      const gain = pendingPrestige() - G.prestige;
      return [
        { text: gt('nodes.prestigeQuote'), color: '#C39131' },
        { text: gt('nodes.prestigeReset'), color: null },
        { text: gt('nodes.prestigeReset2'), color: null },
        G.points >= 10e15
          ? { text: `\u20bd \u2192 +${fmt(gain)} \u00a5`, color: '#C39131' }
          : { text: gt('nodes.prestigeNeedPoints'), color: '#f87171' },
      ];
    },
    maxLevel: Infinity,
    baseCost: 0,
    costScale: 1,
    zone: 'prestige',
    statLabel: () => G.prestige > 0 ? `${fmt(G.prestige)} \u00a5 total` : '',
    parents: ['nowWithExponents'],
    permanent: true,
    onBuy: () => {},
  },
  {
    id: 'theChallenge',
    x: 1960, y: 200,
    label: '#1p',
    title: 'The Challenge.',
    desc: () => [
      { text: 'Unlocks the', color: null },
      { text: _nd.obelisk(), color: '#B874BA' },
      { text: _nd.perm(), color: '#f87171' },
    ],
    maxLevel: 1,
    baseCost: 250,
    costScale: 1,
    zone: 'prestige',
    statLabel: () => gt('nodes.checkSettings') || 'Not yet implemented',
    parents: ['prestigeUnlock'],
    permanent: true,
    onBuy: () => {},
  },
  {
    id: 'rocketShot',
    x: 1620, y: 500,
    label: '#2p',
    title: 'Rocket Shot',
    desc: [
      { text: '+1x \u20bd and +0.5x \u03bb gain', color: '#fbbf24' },
      { text: 'per level', color: null },
    ],
    maxLevel: 50,
    costFn: (lvl) => +(0.05 + lvl * 0.05).toFixed(2),
    baseCost: 0,
    costScale: 1,
    zone: 'prestige',
    statLabel: (lvl) => `x${1 + lvl} \u20bd | x${(1 + lvl * 0.5).toFixed(1)} \u03bb`,
    parents: ['prestigeUnlock'],
    onBuy: () => { G.rMulti += 1; G.rLambdaMulti += 0.5; recalcPps(); },
  },
  {
    id: 'toNewHeights',
    x: 1620, y: 0,
    label: '#3p',
    title: 'The Higher Heights',
    desc: () => [
      { text: 'Expands the points upgrade tree', color: null },
      { text: _nd.perm(), color: '#f87171' },
    ],
    maxLevel: 1,
    baseCost: 0,
    costScale: 1,
    zone: 'prestige',
    statLabel: '',
    parents: ['prestigeUnlock'],
    permanent: true,
    onBuy: () => { G.toNewHeightsUnlocked = true; },
  },
  {
    id: 'dupingIq',
    x: 1960, y: 500,
    label: '#4p',
    title: 'Duping IQ',
    desc: [
      { text: 'x2 \u03bb earned (compounding)', color: '#38bdf8' },
    ],
    maxLevel: 5,
    baseCost: 3,
    costScale: 2,
    zone: 'prestige',
    statLabel: (lvl) => `x${Math.pow(2, lvl)} \u03bb`,
    parents: ['rocketShot'],
    onBuy: () => { G.rLambdaMulti *= 2; recalcPps(); },
  },
  {
    id: 'fastAndFurious',
    x: 1620, y: -200,
    label: '#5p',
    title: 'Fast and Furious',
    desc: () => [
      { text: 'Point upgrades buy max', color: null },
      { text: 'on click', color: null },
      { text: _nd.perm(), color: '#f87171' },
    ],
    maxLevel: 1,
    baseCost: 0,
    costScale: 1,
    zone: 'prestige',
    statLabel: () => gt('nodes.checkSettings') || 'Check the settings',
    parents: ['toNewHeights'],
    permanent: true,
    onBuy: () => {
      G.fastAndFurious = true;
      if (typeof CFG !== 'undefined') {
        CFG.buyMaxEnabled = true;
        CFG.buyMaxPointUpgrades = true;
        if (typeof saveSettings === 'function') saveSettings();
        if (typeof applySettings === 'function') applySettings();
        if (typeof syncBuyMaxPointUpgradesRow === 'function') syncBuyMaxPointUpgradesRow();
      }
    },
  },
  {
    id: 'genericFiller',
    x: 1960, y: -200,
    label: '#10p',
    title: 'Generic Filler',
    desc: [
      { text: 'x2 \u20bd and x2 \u00a5 gain', color: '#fbbf24' },
    ],
    maxLevel: 1,
    baseCost: 20,
    costScale: 1,
    costInPrestige: true,
    zone: 'prestige',
    statLabel: (lvl) => lvl > 0 ? 'x2 \u20bd | x2 \u00a5' : '',
    parents: ['fastAndFurious'],
    onBuy: () => { G.flatMulti *= 2; G.prestigeGainMulti *= 2; recalcPps(); },
  },
  {
    id: 'angelicResearchers',
    x: 1620, y: 700,
    label: '#6p',
    title: 'Angelic Researchers',
    desc: [
      { text: 'Generates 1% of \u03bb', color: '#38bdf8' },
      { text: 'earned every second', color: '#38bdf8' },
    ],
    maxLevel: 1,
    baseCost: 2,
    costScale: 1,
    zone: 'prestige',
    statLabel: () => G.passiveLambda ? `+${fmtLambda(pendingResearch() * 0.01)}/s` : '',
    parents: ['rocketShot'],
    onBuy: () => { G.passiveLambda = true; },
  },
  {
    id: 'twoup',
    x: 2300, y: 500,
    label: '#8p',
    title: '2UP!',
    desc: [
      { text: 'x2 XP per click (compounding)', color: '#4ade80' },
    ],
    maxLevel: 5,
    costFn: (lvl) => [300, 600, 1200, 2400, 4800][lvl] ?? 4800,
    baseCost: 0,
    costScale: 1,
    zone: 'prestige',
    statLabel: (lvl) => lvl > 0 ? `x${Math.pow(2, lvl)} XP/click` : 'x2 XP/click per lvl',
    parents: ['dupingIq'],
    onBuy: (lvl) => { G.xpClickMulti = Math.pow(2, lvl); },
  },
  {
    id: 'unlazyScientists',
    x: 1960, y: 700,
    label: '#11p',
    title: 'Not so lazy scientists',
    desc: () => [
      { text: 'Unlocks new upgrades', color: null },
      { text: 'in the research zone', color: '#38bdf8' },
      { text: _nd.perm(), color: '#f87171' },
    ],
    maxLevel: 1,
    baseCost: 10000,
    costScale: 1,
    zone: 'prestige',
    statLabel: () => gt('nodes.checkSettings') || 'Not yet implemented',
    parents: ['dupingIq'],
    permanent: true,
    onBuy: () => { G.unlazyScientists = true; },
  },
  {
    id: 'ultraRocketShot',
    x: 1620, y: 900,
    label: '#13p',
    title: 'Rocket Shot Ultra',
    desc: [
      { text: '+2x \u20bd per level', color: '#fbbf24' },
    ],
    maxLevel: 50,
    costFn: (lvl) => 50 + lvl * 50,
    baseCost: 0,
    costScale: 1,
    zone: 'prestige',
    statLabel: (lvl) => `x${1 + lvl * 2} \u20bd`,
    parents: ['angelicResearchers'],
    onBuy: () => { G.rMulti += 2; recalcPps(); },
  },
  //  NODI SBLOCCATI DA #3p (Le alte altezze)
  {
    id: 'oneUp',
    x: 1020, y: 400,
    label: '#22',
    title: '1UP!',
    desc: () => G.toNewHeightsUnlocked
      ? [{ text: '+2 XP per click', color: '#4ade80' },
         { text: 'per level of this upgrade', color: null }]
      : [{ text: _nd.p3(), color: '#f87171' },
         { text: _nd.p3zone(), color: '#f87171' }],
    maxLevel: 15,
    costFn: (lvl) => 1e18 * Math.pow(1.5, lvl),
    baseCost: 0,
    costScale: 1,
    zone: 'base',
    statLabel: (lvl) => lvl > 0 ? `+${lvl * 2} XP/click` : '+2 XP/click per lvl',
    parents: ['costCutting'],
    onBuy: (lvl) => { G.xpPerClick = 1 + lvl * 2; },
  },
  {
    id: 'downsizing',
    x: 680, y: 400,
    label: '#23',
    title: 'Downsizing',
    desc: () => G.toNewHeightsUnlocked
      ? [{ text: 'Reduces XP requirements', color: '#4ade80' },
         { text: 'by \u00f71.5 compounding', color: null }]
      : [{ text: _nd.p3(), color: '#f87171' },
         { text: _nd.p3zone(), color: '#f87171' }],
    maxLevel: 10,
    costFn: (lvl) => 1e18 * Math.pow(2.5, lvl),
    baseCost: 0,
    costScale: 1,
    zone: 'base',
    statLabel: (lvl) => lvl > 0 ? `\u00f7${Math.pow(1.5, lvl).toFixed(2)} XP req` : '\u00f71.5 XP req per lvl',
    parents: ['oneUp'],
    onBuy: (lvl) => { G.xpReqDiv = Math.pow(1.5, lvl); },
  },
  {
    id: 'holyGrail',
    x: 1020, y: 600,
    label: '#24',
    title: 'Holy Grail',
    desc: () => G.toNewHeightsUnlocked
      ? [{ text: '\u20bd boosted by Prestige', color: '#fbbf24' },
         { text: 'x((\u00a5+5)^0.4, min 1)', color: '#4ade80' }]
      : [{ text: _nd.p3(), color: '#f87171' },
         { text: _nd.p3zone(), color: '#f87171' }],
    maxLevel: 1,
    baseCost: 1e24,
    costScale: 1,
    zone: 'base',
    statLabel: '',
    parents: ['oneUp'],
    onBuy: () => { G.holyGrailUnlocked = true; recalcPps(); },
  },
  {
    id: 'afterHalcyon',
    x: 680, y: 600,
    label: '#25',
    title: 'Dopo l\'Halcyon',
    desc: () => G.toNewHeightsUnlocked
      ? [{ text: '^1.05 \u20bd gain after all', color: null },
         { text: 'multipliers', color: null }]
      : [{ text: _nd.p3(), color: '#f87171' },
         { text: _nd.p3zone(), color: '#f87171' }],
    maxLevel: 1,
    baseCost: 1e27,
    costScale: 1,
    zone: 'base',
    statLabel: '',
    parents: ['holyGrail'],
    onBuy: () => { G.afterHalcyonUnlocked = true; recalcPps(); },
  },
  {
    id: 'delayedGratification',
    x: 1020, y: 800,
    label: '#27',
    title: 'Delayed Gratification',
    desc: () => G.toNewHeightsUnlocked
      ? [{ text: 'The longer you have this', color: null },
         { text: 'upgrade, the more \u20bd you get', color: null },
         { text: 'x(time^0.65/30+1); time isn\'t reset!', color: '#4ade80' }]
      : [{ text: _nd.p3(), color: '#f87171' },
         { text: _nd.p3zone(), color: '#f87171' }],
    maxLevel: 1,
    baseCost: 50e24,
    costScale: 1,
    zone: 'base',
    statLabel: () => {
      if (!G.delayedGratUnlocked) return '';
      const t = G.delayedGratTime;
      const h = Math.floor(t / 3600);
      const m = Math.floor((t % 3600) / 60);
      const s = Math.floor(t % 60);
      const timeStr = h > 0
        ? `${h}h ${m}m ${s}s`
        : m > 0 ? `${m}m ${s}s` : `${s}s`;
      const multi = (Math.pow(t, 0.65) / 30 + 1).toFixed(2);
      return `x${multi} \u20bd | ${timeStr}`;
    },
    parents: ['holyGrail'],
    onBuy: () => { G.delayedGratUnlocked = true; recalcPps(); },
  },

];
