'use strict';

let isDragging = false;
let dragStart  = { x: 0, y: 0 };
let camStart   = { x: 0, y: 0 };
let touchStart = null;

// ─── MOUSE ────────────────────────────────────────────────────────────────────
canvas.addEventListener('mousedown', e => {
  isDragging = true;
  hasDragged = false;
  dragStart  = { x: e.clientX, y: e.clientY };
  camStart   = { x: camX,      y: camY };
});

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  if (isDragging) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true;
    camX = camStart.x + dx / zoom;
    camY = camStart.y + dy / zoom;
  }
  const w = worldPos(mousePos.x, mousePos.y);
  hoveredNode = nodeAt(w.x, w.y);
  updateTooltip();
});

canvas.addEventListener('mouseup', e => {
  isDragging = false;
  if (!hasDragged) {
    const rect = canvas.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;
    const w  = worldPos(lx, ly);
    const nd = nodeAt(w.x, w.y);
    if (nd) {
      if (e.button === 2) handleNodeRightClick(nd);
      else handleNodeClick(nd, lx, ly);
    }
  }
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mouseleave', () => {
  isDragging  = false;
  hoveredNode = null;
  hideTooltip();
});

// ─── TOUCH ────────────────────────────────────────────────────────────────────
let _pinchStartDist = 0;
let _pinchStartZoom = 1;

function _pinchDist(e) {
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (e.touches.length === 1) {
    const t = e.touches[0];
    isDragging = true;
    hasDragged = false;
    dragStart  = { x: t.clientX, y: t.clientY };
    camStart   = { x: camX,      y: camY };
    touchStart = { x: t.clientX, y: t.clientY };
  } else if (e.touches.length === 2) {
    isDragging = false;
    _pinchStartDist = _pinchDist(e);
    _pinchStartZoom = zoom;
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1 && isDragging) {
    const t  = e.touches[0];
    const dx = t.clientX - dragStart.x;
    const dy = t.clientY - dragStart.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged = true;
    camX = camStart.x + dx / zoom;
    camY = camStart.y + dy / zoom;
  } else if (e.touches.length === 2 && _pinchStartDist > 0) {
    const newDist = _pinchDist(e);
    zoom = Math.min(2, Math.max(0.3, _pinchStartZoom * (newDist / _pinchStartDist)));
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  if (!hasDragged && touchStart) {
    const rect = canvas.getBoundingClientRect();
    const lx = touchStart.x - rect.left;
    const ly = touchStart.y - rect.top;
    const w  = worldPos(lx, ly);
    const nd = nodeAt(w.x, w.y);
    if (nd) handleNodeClick(nd, lx, ly);
  }
  isDragging = false;
  touchStart = null;
});

function handleNodeRightClick(nd) {
  // buy max con tasto destro è esclusivo del Research Center (gestito da research.js)
}

//  CLICK NODO
function checkDescPageClick(nd, lx, ly) {
  const totalPages = typeof nd.descPages === 'function' ? nd.descPages() : 1;
  if (totalPages <= 1) return false;
  const wx = lx / zoom, wy = ly / zoom;
  const nx    = nd.x + camX - NODE_W / 2;
  const ny    = nd.y + camY - NODE_H / 2;
  const PAD   = 11;
  const btnSz = 13;
  const sepY  = (ny + 11 + 12) + 7;
  const descMidY = sepY + 5 + ((ny + NODE_H - 22) - (sepY + 5)) / 2;
  const btnY  = descMidY - btnSz / 2;
  const bLx   = nx + PAD + 2;
  const bRx   = nx + NODE_W - PAD - btnSz - 2;
  const cur   = getDescPage(nd.id);
  if (wx >= bLx && wx <= bLx + btnSz && wy >= btnY && wy <= btnY + btnSz) {
    if (cur > 0) setDescPage(nd.id, cur - 1);
    return true;
  }
  if (wx >= bRx && wx <= bRx + btnSz && wy >= btnY && wy <= btnY + btnSz) {
    if (cur < totalPages - 1) setDescPage(nd.id, cur + 1);
    return true;
  }
  return false;
}

function handleNodeClick(nd, lx, ly) {
  if (!gameReady) return;
  if (lx !== undefined && checkDescPageClick(nd, lx, ly)) return;

  // bottone di conversione prestigio
  if (nd.isPrestigeBtn) {
    if (G.points < 10e15) return;
    doPrestige();
    return;
  }

  const st = nodeState[nd.id];
  if (!isVisible(nd) || isLocked(nd) || st.level >= nd.maxLevel) return;
  const isRNode = (nd.zone === 'research' && nd.id !== 'researchUnlock') || !!nd.costInLambda;
  const isPNode = nd.zone === 'prestige' && !nd.isPrestigeBtn;
  const isPrestNode = !!nd.costInPrestige;

  if (isPrestNode && !G.hasPrestiged) return;

  const isPointUpgrade = !isRNode && !isPNode && !isPrestNode && nd.zone === 'base';
  const buyMax = G.fastAndFurious && isPointUpgrade && (typeof CFG === 'undefined' || CFG.buyMaxPointUpgrades !== false);

  if (buyMax) {
    let bought = false;
    while (st.level < nd.maxLevel) {
      const cost = nodeCost(nd, st.level);
      if (G.points < cost) break;
      G.points -= cost;
      st.level++;
      nd.onBuy(st.level);
      bought = true;
    }
    if (bought) saveGame();
    return;
  }

  if (isPrestNode) {
    const cost = nodeCost(nd, st.level);
    if (G.prestige < cost) return;
    G.prestige -= cost;
  } else if (isPNode) {
    const cost = nodeCost(nd, st.level);
    if (G.prestige < cost) return;
    G.prestige -= cost;
  } else if (isRNode) {
    const cost = researchCost(nd, st.level);
    if (G.research < cost) return;
    G.research -= cost;
  } else {
    const cost = nodeCost(nd, st.level);
    if (G.points < cost) return;
    G.points -= cost;
  }
  st.level++;
  nd.onBuy(st.level);
  saveGame();
}
