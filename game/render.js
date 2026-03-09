'use strict';

// CANVAS
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');

let camX = 0, camY = 0;
let zoom = 1;

const NODE_W = 240;
const NODE_H = 120;
const CORNER = 12;
const GRID   = 60;

let _now = 0;
let _lastCurrencyUpdate = 0;
let _currencyCache = { points: 0, pps: 0, research: 0, pendingR: 0, prestige: 0, pendingP: 0 };

// STAT LABEL CACHE (throttled)
let _lastStatUpdate = 0;
const _statCache = {};

function getStatLabel(nd, lvl) {
  if (_now - _lastStatUpdate >= 500) {
    _lastStatUpdate = _now;
    Object.keys(_statCache).forEach(k => delete _statCache[k]);
  }
  if (_statCache[nd.id] !== undefined) return _statCache[nd.id];
  const raw = typeof nd.statLabel === 'function' ? nd.statLabel(lvl) : (nd.statLabel || '');
  let label = raw;
  if (raw && /x[\d.]/.test(raw) && !raw.includes('gain')) {
    if (raw.includes('\u20bd') || raw.includes('\u03bb') || raw.includes('\u2726')) {
      label = raw + ' gain';
    }
  }
  _statCache[nd.id] = label;
  return label;
}

// FMT MOLTIPLICATORE
// Abbrevia valori grandi mantenendo leggibile il tipo (x, ÷, ^)
function fmtMulti(val) {
  if (!isFinite(val) || isNaN(val)) return '?';
  if (val < 1e4) return val.toFixed(val < 100 ? 2 : 0);
  if (val < 1e6)  return (val / 1e3).toFixed(1)  + 'k';
  if (val < 1e9)  return (val / 1e6).toFixed(2)  + 'M';
  if (val < 1e12) return (val / 1e9).toFixed(2)  + 'B';
  if (val < 1e15) return (val / 1e12).toFixed(2) + 'T';
  // usa fmt generico per valori enormi
  return fmt(val);
}

// variabili condivise con input.js
let hoveredNode = null;
let hasDragged  = false;
let mousePos    = { x: 0, y: 0 };
let gameReady   = false;
const nodeDescPages = {};
function getDescPage(id) { return nodeDescPages[id] || 0; }
function setDescPage(id, p) { nodeDescPages[id] = p; }

function resize() {
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}

function centerCamera() {
  if (canvas.width < 600) {
    zoom = canvas.width / 600;
    camX = canvas.width  / 2 / zoom;
    camY = canvas.height / 2 / zoom;
  } else {
    zoom = 1;
    camX = canvas.width  / 2;
    camY = canvas.height / 2;
  }
}

function worldPos(cx, cy) {
  return { x: cx / zoom - camX, y: cy / zoom - camY };
}

function nodeAt(wx, wy) {
  return NODE_DEFS.find(n => {
    if (!isVisible(n)) return false;
    const nx = n.x - NODE_W / 2;
    const ny = n.y - NODE_H / 2;
    return wx >= nx && wx <= nx + NODE_W && wy >= ny && wy <= ny + NODE_H;
  }) || null;
}

// TEMA
const ZONE_COLORS = {
  base:       { a: '#ffffff', b: '#cccccc', glow: 'rgba(255,255,255,0.10)', border: 'rgba(255,255,255,0.55)' },
  research:   { a: '#38bdf8', b: '#7dd3fc', glow: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.55)'  },
  prestige:   { a: '#fbbf24', b: '#fde68a', glow: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.55)'  },
  automation: { a: '#f87171', b: '#fca5a5', glow: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.55)' },
};

function zoneColor(nd) {
  return ZONE_COLORS[nd.zone] || ZONE_COLORS.base;
}

function getTheme() {
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  return {
    light,
    bg:         light ? '#eef2ff'                : '#0a0a0f',
    grid:       light ? 'rgba(10,10,30,0.06)'    : 'rgba(255,255,255,0.035)',
    line:       light ? 'rgba(10,10,30,0.18)'    : 'rgba(255,255,255,0.18)',
    nodeBg:     light ? 'rgba(235,240,255,0.97)' : 'rgba(18,18,30,0.97)',
    nodeBorder: light ? 'rgba(10,10,20,0.10)'    : 'rgba(255,255,255,0.07)',
    text:       light ? '#0a0a14'                : '#ffffff',
    textMuted:  light ? 'rgba(10,10,20,0.5)'     : 'rgba(255,255,255,0.45)',
    textDim:    light ? 'rgba(10,10,20,0.28)'    : 'rgba(255,255,255,0.22)',
    green:      '#4ade80',
  };
}

// SFONDO ZONA
const ZONE_BG = {
  base:       [20,  20,  22],
  research:   [30,  36,  58],
  automation: [52,  24,  28],
  prestige:   [38,  36,  14],
};

let bgCur = [...ZONE_BG.base];

function getZoneAtCamera() {
  // determina quale zona è più vicina al centro della camera
  const wx = -camX + canvas.width  / 2;
  const wy = -camY + canvas.height / 2;
  // trova il nodo visibile più vicino al centro schermo
  let best = null, bestDist = Infinity;
  NODE_DEFS.forEach(n => {
    if (!isVisible(n)) return;
    const dx = n.x - wx, dy = n.y - wy;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = n; }
  });
  return best ? best.zone : 'base';
}

function lerpBg(dt) {
  const zone   = getZoneAtCamera();
  const target = ZONE_BG[zone] || ZONE_BG.base;
  const speed  = 3.5 * dt;
  bgCur[0] += (target[0] - bgCur[0]) * speed;
  bgCur[1] += (target[1] - bgCur[1]) * speed;
  bgCur[2] += (target[2] - bgCur[2]) * speed;
}

function drawBackground() {
  ctx.fillStyle = `rgb(${Math.round(bgCur[0])},${Math.round(bgCur[1])},${Math.round(bgCur[2])})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,      y + h, x, y + h - r,    r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,      y,     x + r, y,         r);
  ctx.closePath();
}

// GRIGLIA
function drawGrid(T) {
  if (window._cfgShowGrid === false) return;
  const offX = ((camX % GRID) + GRID) % GRID;
  const offY = ((camY % GRID) + GRID) % GRID;
  ctx.strokeStyle = T.grid;
  ctx.lineWidth = 1;
  for (let x = offX; x < canvas.width;  x += GRID) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = offY; y < canvas.height; y += GRID) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
}

// CONNESSIONI
function drawConnections(T) {
  if (window._cfgShowConnections === false) return;
  NODE_DEFS.forEach(nd => {
    if (!isVisible(nd)) return;
    nd.parents.forEach(pid => {
      const parent = NODE_DEFS.find(p => p.id === pid);
      if (!parent || !isVisible(parent)) return;
      const done = nodeState[nd.id].level > 0;
      const zc   = zoneColor(nd);
      const x1 = parent.x + camX, y1 = parent.y + camY;
      const x2 = nd.x     + camX, y2 = nd.y     + camY;
      const mx = (x1 + x2) / 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
      ctx.strokeStyle = done ? zc.a : T.line;
      ctx.lineWidth   = done ? 3 : 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
    });
  });
}

// UTILITY
function hexToRgba(hex, alpha) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function costStr(cost, isRNode, isPNode, isPrestNode) {
  if (isPrestNode && !G.hasPrestiged) return 'You need to prestige at least once';
  if (cost === 0) return 'Free';
  if (isPrestNode || isPNode) return fmt(cost) + ' ✦';
  return isRNode ? fmtLambda(cost) + ' λ' : fmt(cost) + ' ₽';
}

// NODI
function drawNodes(T) {
  NODE_DEFS.forEach(nd => {
    if (!isVisible(nd)) return;

    const st      = nodeState[nd.id];
    const maxed   = st.level >= nd.maxLevel;
    const bought  = st.level > 0;
    const isHover = hoveredNode?.id === nd.id;
    const zc      = zoneColor(nd);
    const sx = nd.x + camX, sy = nd.y + camY;
    const nx = sx - NODE_W / 2, ny = sy - NODE_H / 2;
    const PAD = 11;

    const locked       = isLocked(nd);
    const isPrestigeBtn = !!nd.isPrestigeBtn;
    const isRNode      = (nd.zone === 'research' && nd.id !== 'researchUnlock') || !!nd.costInLambda;
    const isPNode      = nd.zone === 'prestige' && !isPrestigeBtn;
    const isPrestNode  = !!nd.costInPrestige;
    const cost         = isPNode ? nodeCost(nd, st.level) : isRNode ? researchCost(nd, st.level) : nodeCost(nd, st.level);
    const prestigeReady = isPrestigeBtn && G.points >= 10e15;
    const canAfford    = isPrestigeBtn ? prestigeReady : (!maxed && !locked && (isPrestNode ? (G.hasPrestiged && G.prestige >= cost) : isPNode ? G.prestige >= cost : isRNode ? G.research >= cost : G.points >= cost));
    const buyable      = isPrestigeBtn ? prestigeReady : (!maxed && !locked && canAfford);

    const pulse = 0.5 + 0.5 * Math.sin(_now / 210);

    // 1. PULSE VERDE (hover + buyable)
    if (isHover && buyable) {
      const fillAlpha = 0.06 + 0.08 * pulse;
      roundRect(nx, ny, NODE_W, NODE_H, CORNER);
      ctx.fillStyle = `rgba(74,222,128,${fillAlpha.toFixed(3)})`;
      ctx.fill();
      ctx.save();
      ctx.shadowColor = `rgba(74,222,128,${(0.5 + 0.35 * pulse).toFixed(3)})`;
      ctx.shadowBlur  = 22 + 14 * pulse;
      roundRect(nx - 1, ny - 1, NODE_W + 2, NODE_H + 2, CORNER + 1);
      ctx.strokeStyle = `rgba(74,222,128,${(0.55 + 0.35 * pulse).toFixed(3)})`;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    // 2. GLOW zona (buyable, non hover)
    if (buyable && !isHover) {
      ctx.save();
      ctx.shadowColor = zc.a;
      ctx.shadowBlur  = 16;
      roundRect(nx - 2, ny - 2, NODE_W + 4, NODE_H + 4, CORNER + 2);
      ctx.strokeStyle = hexToRgba(zc.a, '0.9');
      ctx.lineWidth   = 3.5;
      ctx.stroke();
      ctx.restore();
    }

    // 3. SFONDO opaco
    roundRect(nx, ny, NODE_W, NODE_H, CORNER);
    ctx.fillStyle = T.light ? '#edf0ff' : '#12121e';
    ctx.fill();
    roundRect(nx, ny, NODE_W, NODE_H, CORNER);
    if (maxed || bought) {
      ctx.fillStyle = T.light ? 'rgba(235,240,255,0.85)' : 'rgba(18,18,30,0.85)';
    } else {
      ctx.fillStyle = T.light ? 'rgba(235,240,255,0.97)' : 'rgba(18,18,30,0.97)';
    }
    ctx.fill();

    // 4. BORDO principale
    roundRect(nx, ny, NODE_W, NODE_H, CORNER);
    if (maxed || bought) {
      ctx.strokeStyle = hexToRgba(zc.a, '0.18');
      ctx.lineWidth   = 1;
    } else if (buyable) {
      ctx.strokeStyle = zc.a;
      ctx.lineWidth   = 3.5;
    } else if (isHover) {
      ctx.strokeStyle = hexToRgba(zc.a, '0.5');
      ctx.lineWidth   = 2;
    } else {
      ctx.strokeStyle = hexToRgba(zc.a, '0.2');
      ctx.lineWidth   = 1;
    }
    ctx.stroke();

    // 4b. BORDO ORO (se il nodo ha livelli oro) 
    const isGold = typeof nd.gold === 'function' ? nd.gold() : false;
    if (isGold) {
      ctx.save();
      ctx.shadowColor = 'rgba(251,191,36,0.6)';
      ctx.shadowBlur  = 18 + 10 * pulse;
      roundRect(nx - 1, ny - 1, NODE_W + 2, NODE_H + 2, CORNER + 1);
      ctx.strokeStyle = `rgba(251,191,36,${(0.6 + 0.3 * pulse).toFixed(3)})`;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
      ctx.restore();
    }
    
    // 4b. BORDO DIAMANTE (se il nodo ha livelli diamante) NON ANCORA IMPLEMENTATO
    const isDiam = typeof nd.diamond === 'function' ? nd.diamond() : false;
    if (isDiam) {
      ctx.save();
      ctx.shadowColor = 'rgba(36, 244, 251, 0.6)';
      ctx.shadowBlur  = 18 + 10 * pulse;
      roundRect(nx - 1, ny - 1, NODE_W + 2, NODE_H + 2, CORNER + 1);
      ctx.strokeStyle = `rgba(251,191,36,${(0.6 + 0.3 * pulse).toFixed(3)})`;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
      ctx.restore();
    }



    // 6. TESTI
    const row1Y = ny + PAD + 12;
    ctx.textAlign = 'left';
    ctx.font      = 'bold 12px Fredoka, sans-serif';
    ctx.fillStyle = hexToRgba(zc.a, '1');
    ctx.fillText(nd.label, nx + PAD, row1Y);

    const labelW = ctx.measureText(nd.label).width;
    if (!locked && !isPrestigeBtn) {
      ctx.font      = '600 11px Fredoka, sans-serif';
      ctx.fillStyle = maxed ? '#4ade80' : hexToRgba(zc.a, '0.7');
      ctx.fillText(`(${st.level}/${nd.maxLevel})`, nx + PAD + labelW + 5, row1Y);
    }

    ctx.textAlign = 'right';
    ctx.font      = '600 12px Fredoka, sans-serif';
    ctx.fillStyle = hexToRgba(zc.a, '1');
    const _ndTitle = typeof nd.title === 'function' ? nd.title() : nd.title;
    ctx.fillText(_ndTitle, nx + NODE_W - PAD, row1Y);

    const sepY = row1Y + 7;
    ctx.beginPath();
    ctx.moveTo(nx + PAD, sepY);
    ctx.lineTo(nx + NODE_W - PAD, sepY);
    ctx.strokeStyle = T.nodeBorder;
    ctx.lineWidth   = 1;
    ctx.stroke();

    ctx.font      = 'italic 500 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    // desc può essere stringa, array di stringhe, o array di {text,color}
    // supporta descPages per navigazione multipagina
    const totalPages = typeof nd.descPages === 'function' ? nd.descPages() : 1;
    const curPage    = Math.min(getDescPage(nd.id), totalPages - 1);
    const rawDesc    = typeof nd.desc === 'function' ? nd.desc(curPage) : nd.desc;
    const descLines  = Array.isArray(rawDesc)
      ? rawDesc
      : String(rawDesc).split('\n').map(t => ({ text: t, color: null }));
    const descAreaTop = sepY + 5;
    const descAreaH   = (ny + NODE_H - 22) - descAreaTop;
    const lineH       = 14;
    let descY = descAreaTop + (descAreaH - descLines.length * lineH) / 2 + lineH;
    descLines.forEach(line => {
      const text  = typeof line === 'string' ? line : line.text;
      const color = typeof line === 'string' ? null  : line.color;
      ctx.fillStyle = color || T.text;
      ctx.fillText(text, sx, descY);
      descY += lineH;
    });
    // bottoni < > se ci sono più pagine
    if (totalPages > 1) {
      const descMidY = sepY + 5 + ((ny + NODE_H - 22) - (sepY + 5)) / 2;
      const btnSz = 13;
      const btnY  = descMidY - btnSz / 2;
      const bLx   = nx + PAD + 2;
      const bRx   = nx + NODE_W - PAD - btnSz - 2;
      ctx.font      = 'bold 11px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = curPage > 0 ? 'rgba(251,191,36,0.9)' : 'rgba(255,255,255,0.15)';
      ctx.fillRect(bLx, btnY, btnSz, btnSz);
      ctx.fillStyle = '#0a0a14';
      ctx.fillText('<', bLx + btnSz / 2, btnY + btnSz - 2);
      ctx.fillStyle = curPage < totalPages - 1 ? 'rgba(251,191,36,0.9)' : 'rgba(255,255,255,0.15)';
      ctx.fillRect(bRx, btnY, btnSz, btnSz);
      ctx.fillStyle = '#0a0a14';
      ctx.fillText('>', bRx + btnSz / 2, btnY + btnSz - 2);
      // pallino pagina
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(251,191,36,0.6)';
      ctx.font = '9px Fredoka, sans-serif';
      const counterY = ny + NODE_H - 22 - 2;
      ctx.fillText((curPage + 1) + '/' + totalPages, sx, counterY);
    }

    const row2Y = ny + NODE_H - 7;
    if (!locked) {
      ctx.textAlign = 'left';
      ctx.font      = '600 11px Fredoka, sans-serif';
      ctx.fillStyle = hexToRgba(zc.a, '1');
      const stat = getStatLabel(nd, st.level);
      ctx.fillText(stat, nx + PAD, row2Y);

      if (!isPrestigeBtn) {
        ctx.textAlign = 'right';
        ctx.font      = '600 11px Fredoka, sans-serif';
        if (maxed || bought) {
          ctx.fillStyle = hexToRgba(zc.a, '1');
          ctx.fillText(maxed ? 'Maxed!' : costStr(cost, isRNode, isPNode, isPrestNode), nx + NODE_W - PAD, row2Y);
        } else {
          const cs = costStr(cost, isRNode, isPNode, isPrestNode);
          ctx.fillStyle = cs === 'Free' ? T.green : (cs === 'You need to prestige at least once' ? 'rgba(248,113,113,0.9)' : canAfford ? T.textMuted : 'rgba(248,113,113,0.9)');
          ctx.fillText(cs, nx + NODE_W - PAD, row2Y);
        }
      } else {
        ctx.textAlign = 'right';
        ctx.font      = '700 11px Fredoka, sans-serif';
        ctx.fillStyle = prestigeReady ? '#fbbf24' : 'rgba(248,113,113,0.7)';
        ctx.fillText(prestigeReady ? 'CLICK TO PRESTIGE' : 'need 10Qd ₽', nx + NODE_W - PAD, row2Y);
      }
    }
  });
}

//  PANNELLI VALUTA ZONA 
function drawCurrencyPanels(T) {
  const _cuiMs = window._settingsCurrencyInterval || 300;
  if (_now - _lastCurrencyUpdate >= _cuiMs) {
    _lastCurrencyUpdate = _now;
    _currencyCache.points   = G.points;
    _currencyCache.pps      = G.pps;
    _currencyCache.research = G.research;
    _currencyCache.pendingR = pendingResearch();
    _currencyCache.prestige = G.prestige;
    _currencyCache.pendingP = pendingPrestige() - G.prestige;
  }

  const panels = [
    {
      anchor: 'start',
      getValue: () => fmt(_currencyCache.points) + ' ₽',
      getRate:  () => '+' + fmt(_currencyCache.pps) + ' ₽/s',
      color:    ZONE_COLORS.base.a,
      always:   true,
    },

    {
      anchor: 'prestigeUnlock',
      getValue: () => fmt(_currencyCache.prestige) + ' ✦',
      getRate:  () => _currencyCache.pendingP > 0.005 ? '+' + fmt(_currencyCache.pendingP) + ' ✦ pending' : '',
      color:    ZONE_COLORS.prestige.a,
      always:   false,
      check:    () => G.hasPrestiged,
    },
  ];

  const PW = 200, PH = 46, PR = 8, PAD = 10;

  panels.forEach(p => {
    if (!p.always && (!p.check || !p.check())) return;
    const anchorDef = NODE_DEFS.find(n => n.id === p.anchor);
    if (!anchorDef || !isVisible(anchorDef)) return;

    const sx = anchorDef.x + camX;
    const sy = anchorDef.y + camY;
    const px = sx - PW / 2;
    const py = sy + NODE_H / 2 + 14;

    // sfondo
    roundRect(px, py, PW, PH, PR);
    ctx.fillStyle = T.light ? 'rgba(235,240,255,0.97)' : 'rgba(14,14,22,0.97)';
    ctx.fill();

    // bordo colorato
    roundRect(px, py, PW, PH, PR);
    ctx.strokeStyle = hexToRgba(p.color, '0.35');
    ctx.lineWidth   = 1.5;
    ctx.stroke();



    // valore principale
    ctx.textAlign = 'center';
    ctx.font      = 'bold 15px Fredoka, sans-serif';
    ctx.fillStyle = p.color;
    ctx.fillText(p.getValue(), sx, py + 22);

    // rate/pending
    const rate = p.getRate();
    if (rate) {
      ctx.font      = '500 11px Fredoka, sans-serif';
      ctx.fillStyle = hexToRgba(p.color, '0.6');
      ctx.fillText(rate, sx, py + 37);
    }
  });
}

  window.addEventListener('resize', resize);
