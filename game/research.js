'use strict';

let _rcBuilt      = false;
let _rcEl         = null;
let _rcCanvas     = null;
let _rcCtx        = null;
let _rcCurrencyEl = null;
let _rcGainEl     = null;

let _rcCamX = 0;
let _rcCamY = 0;

const RC_ANCHOR_X = 0;
const RC_ANCHOR_Y = -400;

let _rcCanDragging = false;
let _rcCanDragSX   = 0;
let _rcCanDragSY   = 0;
let _rcCanCamSX    = 0;
let _rcCanCamSY    = 0;
let _rcCanHasMoved = false;

let _rcSelectedId  = null;
let _rcDetailEl    = null;
let _rcLastCurrUpd = 0;

const RC_NW  = 150;
const RC_NH  = 90;
const RC_CR  = 10;
const RC_PAD = 9;

const RC_NODES = [
  'r_pointGain', 'r_leftSide', 'r_rightSide',
  'r_pointGain2', 'r_materialize', 'r_pointGain3',
  'r_materialize2', 'r_pointGain4', 'r_pointGain1b',
];

const RC_TITLE_COLOR = {
  r_pointGain:    '#f472b6',  
  r_leftSide:     '#fb923c',  
  r_rightSide:    '#4ade80',  
  r_pointGain2:   '#a78bfa',
  r_materialize:  '#fbbf24',
  r_pointGain3:   '#f87171',
  r_materialize2: '#34d399',
  r_pointGain4:   '#60a5fa',
  r_pointGain1b:  '#e879f9',
};

const RC_GAP_X = 170;
const RC_GAP_Y = 130;
const RC_LAYOUT = {
  r_pointGain:    { x:  0,          y: 0            },
  r_leftSide:     { x: -RC_GAP_X,   y: 0            },
  r_rightSide:    { x:  RC_GAP_X,   y: 0            },
  r_pointGain2:   { x:  0,          y: RC_GAP_Y     },
  r_materialize:  { x:  RC_GAP_X,   y: RC_GAP_Y     },
  r_pointGain3:   { x:  0,          y: RC_GAP_Y * 2 },
  r_materialize2: { x:  RC_GAP_X,   y: RC_GAP_Y * 2 },
  r_pointGain4:   { x:  0,          y: RC_GAP_Y * 3 },
  r_pointGain1b:  { x:  -RC_GAP_X,   y: RC_GAP_Y * 3 },
};

/* ── BUILD ──────────────────────────────────────────────────────── */
function buildResearchPanel() {
  if (_rcBuilt) return;
  _rcBuilt = true;

  const el = document.createElement('div');
  el.id = 'research-panel';
  el.innerHTML = `
    <div class="rc-header">
      <div class="rc-currency-row">
        <span class="rc-currency" id="rc-currency">0 λ</span>
        <span class="rc-gain"     id="rc-gain"></span>
      </div>
      <div class="rc-header-row">
        <span class="rc-title">RESEARCH CENTER</span>
        <button class="rc-center-btn" id="rc-center-btn" title="Ricentra">⌖</button>
      </div>
    </div>
    <div class="rc-canvas-wrap">
      <canvas id="rc-canvas"></canvas>
      <div class="rc-canvas-hint">Drag to pan &nbsp;·&nbsp; Click: details &nbsp;·&nbsp; Right click: buy max</div>
    </div>
  `;

  const detail = document.createElement('div');
  detail.id        = 'rc-detail';
  detail.className = 'rc-detail';
  detail.innerHTML = `
    <div class="rc-detail-desc" id="rc-detail-desc"></div>
    <div class="rc-detail-footer">
      <button class="rc-btn rc-btn-buy" id="rc-btn-buy">BUY</button>
      <button class="rc-btn rc-btn-max" id="rc-btn-max">MAX</button>
    </div>
  `;

  el.appendChild(detail);
  const gameMain = document.querySelector('.game-main');
  gameMain.appendChild(el);
  _rcEl         = el;
  _rcCurrencyEl = el.querySelector('#rc-currency');
  _rcGainEl     = el.querySelector('#rc-gain');
  _rcDetailEl   = detail;
  _rcCanvas     = el.querySelector('#rc-canvas');
  _rcCtx        = _rcCanvas.getContext('2d');

  _rcResizeCanvas();
  _rcCenterCamera();
  _rcInitCanvasDrag();

  el.querySelector('#rc-center-btn').addEventListener('click', () => {
    _rcCenterCamera();
  });

  detail.querySelector('#rc-btn-buy').addEventListener('click', () => {
    if (!_rcSelectedId) return;
    _rcBuyOne(NODE_DEFS.find(n => n.id === _rcSelectedId));
  });
  detail.querySelector('#rc-btn-max').addEventListener('click', () => {
    if (!_rcSelectedId) return;
    _rcBuyMax(NODE_DEFS.find(n => n.id === _rcSelectedId));
  });

  document.addEventListener('click', e => {
    if (_rcDetailEl.classList.contains('open') && !el.contains(e.target) && !detail.contains(e.target)) _rcCloseDetail();
  });
}

function _rcResizeCanvas() {
  const wrap = _rcCanvas.parentElement;
  _rcCanvas.width  = wrap.clientWidth  || 520;
  _rcCanvas.height = wrap.clientHeight || 340;
}

function _rcCenterCamera() {
  /* centra su Point Gain 1 (origine del layout locale) */
  _rcCamX = _rcCanvas.width  / 2;
  _rcCamY = 60; /* piccolo margine in alto */
}

/* drag panel rimosso — posizione gestita da positionResearchPanel() */

/* ── DRAG CANVAS INTERNO ───────────────────────────────────────── */
function _rcInitCanvasDrag() {
  _rcCanvas.addEventListener('mousedown', e => {
    _rcCanDragging = true;
    _rcCanHasMoved = false;
    _rcCanDragSX   = e.clientX;
    _rcCanDragSY   = e.clientY;
    _rcCanCamSX    = _rcCamX;
    _rcCanCamSY    = _rcCamY;
    e.preventDefault();
  });
  _rcCanvas.addEventListener('mousemove', e => {
    if (!_rcCanDragging) return;
    const dx = e.clientX - _rcCanDragSX;
    const dy = e.clientY - _rcCanDragSY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) _rcCanHasMoved = true;
    _rcCamX = _rcCanCamSX + dx;
    _rcCamY = _rcCanCamSY + dy;
  });
  _rcCanvas.addEventListener('mouseup', e => {
    _rcCanDragging = false;
    if (e.button === 2) return;
    if (!_rcCanHasMoved) {
      const r = _rcCanvas.getBoundingClientRect();
      _rcHandleClick(e.clientX - r.left, e.clientY - r.top);
    }
  });
  _rcCanvas.addEventListener('mouseleave', () => { _rcCanDragging = false; });
  let _rcWasRightClick = false;
  _rcCanvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    _rcWasRightClick = true;
    const r  = _rcCanvas.getBoundingClientRect();
    const nd = _rcNodeAt(e.clientX - r.left, e.clientY - r.top);
    if (!nd) return;
    if (!(G.settings?.rcRightClickMax === false)) _rcBuyMax(nd);
  });

  /* touch */
  let _tcStart = null;
  _rcCanvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    _rcCanDragging = true; _rcCanHasMoved = false;
    _rcCanDragSX = t.clientX; _rcCanDragSY = t.clientY;
    _rcCanCamSX  = _rcCamX;  _rcCanCamSY  = _rcCamY;
    _tcStart = { x: t.clientX, y: t.clientY };
  }, { passive: false });
  _rcCanvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!_rcCanDragging) return;
    const t = e.touches[0];
    const dx = t.clientX - _rcCanDragSX, dy = t.clientY - _rcCanDragSY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) _rcCanHasMoved = true;
    _rcCamX = _rcCanCamSX + dx; _rcCamY = _rcCanCamSY + dy;
  }, { passive: false });
  _rcCanvas.addEventListener('touchend', () => {
    _rcCanDragging = false;
    if (!_rcCanHasMoved && _tcStart) {
      const r = _rcCanvas.getBoundingClientRect();
      _rcHandleClick(_tcStart.x - r.left, _tcStart.y - r.top);
    }
    _tcStart = null;
  });
}

/* ── HIT TEST ──────────────────────────────────────────────────── */
function _rcNodeAt(cx, cy) {
  for (const id of RC_NODES) {
    const pos = RC_LAYOUT[id];
    if (!pos) continue;
    const nd = NODE_DEFS.find(n => n.id === id);
    if (!nd || !_rcIsVisible(nd)) continue;
    const sx = pos.x + _rcCamX, sy = pos.y + _rcCamY;
    if (cx >= sx - RC_NW/2 && cx <= sx + RC_NW/2 && cy >= sy - RC_NH/2 && cy <= sy + RC_NH/2) {
      return nd;
    }
  }
  return null;
}

/* ── CLICK ─────────────────────────────────────────────────────── */
function _rcHandleClick(cx, cy) {
  const nd = _rcNodeAt(cx, cy);
  if (!nd) { _rcCloseDetail(); return; }
  if (_rcSelectedId === nd.id && _rcDetailEl.classList.contains('open')) { _rcCloseDetail(); return; }
  _rcSelectedId = nd.id;
  _rcUpdateDetail();
  _rcPositionDetail(nd);
  _rcDetailEl.classList.add('open');
}

/* ── DETAIL ────────────────────────────────────────────────────── */
function _rcCloseDetail() {
  _rcDetailEl.classList.remove('open');
  _rcSelectedId = null;
}

function _rcPositionDetail(nd) {
  if (!nd || !_rcEl) return;
  const canvasRect = _rcCanvas.getBoundingClientRect();
  const panelRect  = _rcEl.getBoundingClientRect();
  const detailH    = _rcDetailEl.offsetHeight || 140;

  const pos      = RC_LAYOUT[nd.id] || { x: nd.x, y: nd.y };
  const nodePanX = (canvasRect.left - panelRect.left) + (pos.x + _rcCamX);
  const nodePanY = (canvasRect.top  - panelRect.top)  + (pos.y + _rcCamY);

  _rcDetailEl.style.left = (nodePanX + RC_NW / 2 + 10) + 'px';
  _rcDetailEl.style.top  = (nodePanY - detailH / 2) + 'px';
}

function _rcNodeDescText(nd) {
  const raw = nd.desc;
  if (!raw) return '';
  const arr = typeof raw === 'function' ? raw(0) : raw;
  if (typeof arr === 'string') return arr;
  if (Array.isArray(arr)) return arr.map(d => typeof d === 'string' ? d : d.text).join(' ');
  return '';
}

function _rcUpdateDetail() {
  if (!_rcSelectedId) return;
  const nd    = NODE_DEFS.find(n => n.id === _rcSelectedId);
  if (!nd) return;
  const st    = nodeState[nd.id];
  const lvl   = st.level;
  const maxed = lvl >= nd.maxLevel;
  const canAf = !maxed && G.research >= researchCost(nd, lvl);

  document.getElementById('rc-detail-desc').textContent = _rcNodeDescText(nd);

  const buy = document.getElementById('rc-btn-buy');
  const max = document.getElementById('rc-btn-max');
  buy.disabled = maxed || !canAf;
  max.disabled = maxed || !canAf;
}

/* ── BUY ───────────────────────────────────────────────────────── */
function _rcIsVisible(nd) {
  /* un nodo RC è visibile solo se tutti i parent RC sono stati acquistati */
  const rcParents = nd.parents.filter(pid => RC_NODES.includes(pid));
  if (rcParents.length === 0) return true;
  return rcParents.every(pid => (nodeState[pid]?.level ?? 0) >= 1);
}

function _rcIsAvailable(nd) {
  if (!_rcIsVisible(nd)) return false;
  if (isLocked(nd)) return false;
  if (nd.parents.length === 0) return true;
  return nd.parents.every(pid => (nodeState[pid]?.level ?? 0) >= 1);
}

function _rcBuyOne(nd) {
  if (!nd) return;
  const st = nodeState[nd.id];
  if (!_rcIsAvailable(nd) || st.level >= nd.maxLevel) return;
  const cost = researchCost(nd, st.level);
  if (G.research < cost) return;
  G.research -= cost; st.level++; nd.onBuy(st.level);
  saveGame();
  if (_rcSelectedId === nd.id) _rcUpdateDetail();
}

function _rcBuyMax(nd) {
  if (!nd) return;
  const st = nodeState[nd.id];
  if (!_rcIsAvailable(nd)) return;
  let bought = false;
  while (st.level < nd.maxLevel) {
    const cost = researchCost(nd, st.level);
    if (G.research < cost) break;
    G.research -= cost; st.level++; nd.onBuy(st.level); bought = true;
  }
  if (bought) { saveGame(); if (_rcSelectedId === nd.id) _rcUpdateDetail(); }
}

/* ── RENDER ────────────────────────────────────────────────────── */
function _rcRR(x, y, w, h, r) {
  const ctx = _rcCtx;
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

function _rcDrawNodes() {
  const ctx   = _rcCtx;
  const cw    = _rcCanvas.width;
  const ch    = _rcCanvas.height;
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  const now   = performance.now();
  const pulse = 0.5 + 0.5 * Math.sin(now / 210);

  /* sfondo */
  ctx.fillStyle = light ? '#c5eaf8' : '#0d1620';
  ctx.fillRect(0, 0, cw, ch);

  /* griglia */
  const G60 = 60;
  const ox = ((_rcCamX % G60) + G60) % G60;
  const oy = ((_rcCamY % G60) + G60) % G60;
  ctx.strokeStyle = light ? 'rgba(10,10,30,0.06)' : 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let x = ox; x < cw; x += G60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,ch); ctx.stroke(); }
  for (let y = oy; y < ch; y += G60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cw,y); ctx.stroke(); }

  /* niente connessioni */

  /* nodi */
  RC_NODES.forEach(id => {
    const nd  = NODE_DEFS.find(n => n.id === id);
    const pos = RC_LAYOUT[id];
    if (!nd || !pos || !_rcIsVisible(nd)) return;
    const st    = nodeState[id];
    const lvl   = st.level;
    const maxed = lvl >= nd.maxLevel;
    const avail = _rcIsAvailable(nd);
    const cost  = !maxed ? researchCost(nd, lvl) : 0;
    const canAf = !maxed && avail && G.research >= cost;
    const buy   = !maxed && avail && canAf;
    const sel   = _rcSelectedId === id;

    const sx = pos.x + _rcCamX, sy = pos.y + _rcCamY;
    const nx = sx - RC_NW/2,   ny = sy - RC_NH/2;
    const CY = '#38bdf8';

    /* glow selected */
    if (sel) {
      ctx.save();
      ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 18;
      _rcRR(nx-2,ny-2,RC_NW+4,RC_NH+4,RC_CR+2);
      ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }
    /* glow buyable */
    if (buy && !sel) {
      ctx.save();
      ctx.shadowColor = CY; ctx.shadowBlur = 14 + 8*pulse;
      _rcRR(nx-2,ny-2,RC_NW+4,RC_NH+4,RC_CR+2);
      ctx.strokeStyle = `rgba(56,189,248,${(0.7+0.25*pulse).toFixed(2)})`; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }

    /* opacity — solo sul bordo/sfondo, non sul testo */
    const nodeAlpha = !avail ? 0.25 : (!canAf && !maxed ? 0.48 : 1);

    /* sfondo nodo */
    ctx.globalAlpha = nodeAlpha;
    _rcRR(nx,ny,RC_NW,RC_NH,RC_CR);
    ctx.fillStyle = light ? '#edf0ff' : '#12121e'; ctx.fill();
    _rcRR(nx,ny,RC_NW,RC_NH,RC_CR);
    ctx.fillStyle = light ? 'rgba(235,240,255,0.97)' : 'rgba(18,18,30,0.97)'; ctx.fill();

    /* bordo */
    _rcRR(nx,ny,RC_NW,RC_NH,RC_CR);
    if (buy)        { ctx.strokeStyle = CY; ctx.lineWidth = 2.5; }
    else if (maxed) { ctx.strokeStyle = 'rgba(56,189,248,0.45)'; ctx.lineWidth = 1.5; }
    else            { ctx.strokeStyle = 'rgba(56,189,248,0.18)'; ctx.lineWidth = 1; }
    ctx.stroke();
    ctx.globalAlpha = 1; /* testo sempre pieno */

    /* ── TESTO ── */
    const titleColor = RC_TITLE_COLOR[id] || CY;

    /* TITOLO — centrato in alto, colore unico per nodo */
    ctx.textAlign = 'center';
    ctx.font      = 'bold 11px "Fredoka One", sans-serif';
    ctx.fillStyle = titleColor;
    ctx.fillText(nd.title, sx, ny + RC_PAD + 10);

    /* separatore */
    const sepY = ny + RC_PAD + 16;
    ctx.beginPath(); ctx.moveTo(nx+RC_PAD, sepY); ctx.lineTo(nx+RC_NW-RC_PAD, sepY);
    ctx.strokeStyle = light ? 'rgba(10,10,20,0.10)' : 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1; ctx.stroke();

    /* LIVELLI — sempre bianco puro */
    ctx.textAlign = 'center';
    ctx.font      = 'bold 18px "Fredoka One", sans-serif';
    ctx.fillStyle = light ? '#1a1a2e' : '#ffffff';
    ctx.fillText(lvl + '/' + nd.maxLevel, sx, sy + 6);

    /* COSTO — sempre azzurro */
    const row2Y = ny + RC_NH - RC_PAD;
    ctx.textAlign = 'center';
    ctx.font      = '600 10px Fredoka, sans-serif';
    ctx.fillStyle = CY;
    if (maxed)       ctx.fillText('Maxed!', sx, row2Y);
    else if (!avail) ctx.fillText('locked', sx, row2Y);
    else             ctx.fillText(fmtLambda(cost) + ' λ', sx, row2Y);

  });
}

/* ── CURRENCY ──────────────────────────────────────────────────── */
function _rcUpdateCurrency() {
  if (_rcCurrencyEl) _rcCurrencyEl.textContent = fmtLambda(G.research) + ' λ';
  if (_rcGainEl) {
    const ps = G.passiveLambda ? pendingResearch() * 0.01 : 0;
    _rcGainEl.textContent = ps > 0 ? '+' + fmtLambda(ps) + ' λ/s' : '';
  }
}

/* ── POSITION PANEL ────────────────────────────────────────────── */
function positionResearchPanel() {
  if (!_rcEl) return;
  const pw  = _rcEl.offsetWidth  || 520;
  const ph  = _rcEl.offsetHeight || 400;
  const GAP = 20;
  const sx  = RC_ANCHOR_X + camX;
  const sy  = RC_ANCHOR_Y + camY;
  const left = sx - pw / 2;
  const top  = sy - NODE_H / 2 - ph - GAP;
  _rcEl.style.left = left + 'px';
  _rcEl.style.top  = top  + 'px';

  /* posiziona convert-panel a destra del research panel */
  const cp = document.getElementById('convert-panel');
  if (cp && G.researchUnlocked) {
    const cpW = cp.offsetWidth || 220;
    cp.style.left      = (left + pw + 12) + 'px';
    cp.style.top       = top + 'px';
    cp.style.bottom    = 'auto';
    cp.style.transform = 'none';
  }
}

/* ── TICK ──────────────────────────────────────────────────────── */
function tickResearchPanel() {
  if (!G.researchUnlocked) {
    if (_rcEl) _rcEl.classList.remove('rc-visible');
    return;
  }
  if (!_rcBuilt) buildResearchPanel();
  _rcEl.classList.add('rc-visible');
  const _now = performance.now();
  if (_now - _rcLastCurrUpd >= 300) { _rcUpdateCurrency(); _rcLastCurrUpd = _now; }
  if (_rcSelectedId) {
    _rcUpdateDetail();
    const _selNd = NODE_DEFS.find(n => n.id === _rcSelectedId);
    if (_selNd) {
      _rcPositionDetail(_selNd);
      /* chiudi il popup se il nodo è fuori dal canvas visibile */
      const pos = RC_LAYOUT[_selNd.id];
      if (pos) {
        const sx = pos.x + _rcCamX;
        const sy = pos.y + _rcCamY;
        const cw = _rcCanvas.width;
        const ch = _rcCanvas.height;
        if (sx < -RC_NW/2 || sx > cw + RC_NW/2 || sy < -RC_NH/2 || sy > ch + RC_NH/2) {
          _rcCloseDetail();
        }
      }
    }
  }
  positionResearchPanel();
  if (_rcCtx) _rcDrawNodes();
}
