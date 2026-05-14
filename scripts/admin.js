'use strict';

const ADMIN_EMAIL = 'coldesticecube@outlook.com';

const PAGE_SIZE = 25;

let _subs  = [];
let _users = [];
let _saves = [];
let _subStatusFilter = 'all';
let _subTypeFilter   = 'all';
let _subSearch  = '';
let _userSearch = '';
let _saveSearch = '';
let _subPage  = 1;
let _userPage = 1;
let _savePage = 1;
let _subSort  = { key: null, dir: 1 };
let _userSort = { key: null, dir: 1 };
let _saveSort = { key: null, dir: 1 };
let _subSelected = new Set();
let _subFocusIdx = -1;

function _isAdmin() {
  const user = Auth.getUser();
  return Auth.isLoggedIn() && user?.email === ADMIN_EMAIL;
}

function _guard() {
  if (_isAdmin()) {
    document.getElementById('admin-guard').style.display = 'none';
    document.getElementById('admin-app').style.display   = 'block';
    document.getElementById('adm-user-label').textContent = Auth.getUser().email;
    _loadAll();
  } else {
    document.getElementById('admin-guard').style.display = 'flex';
    document.getElementById('admin-app').style.display   = 'none';
  }
}

async function _loadAll() {
  _spinRefresh(true);
  await Promise.allSettled([_loadStats(), _loadTrends(), _loadSubmissions(), _loadUsers(), _loadSaves()]);
  _spinRefresh(false);
}

async function _loadStats() {
  try {
    const d = await Api.admin.getStats();
    document.getElementById('ov-users').textContent   = d.users ?? '—';
    document.getElementById('ov-saves').textContent   = d.saves ?? '—';
    document.getElementById('ov-subs').textContent    = d.submissions ?? '—';
    document.getElementById('ov-pending').textContent = d.by_status?.pending ?? '—';
    const total = d.submissions || 1;
    _renderBarList('ov-by-type', d.by_type || {}, total, {
      vtuber: '#a78bfa', fanart: '#5b9cf6', team: '#f5c542', tag: '#34c48a',
    });
    _renderBarList('ov-by-status', d.by_status || {}, total, {
      pending: '#f5c542', approved: 'rgba(34,197,94,.9)', rejected: 'rgba(239,68,68,.88)',
    });
    const pending = d.by_status?.pending || 0;
    const badge = document.getElementById('nav-badge-submissions');
    if (pending > 0) { badge.textContent = pending; badge.classList.add('visible'); }
    else badge.classList.remove('visible');
    _markLoaded('overview');
  } catch(e) { console.error('stats', e); }
}

function _renderBarList(elId, obj, total, colors) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  if (!Object.keys(obj).length) { el.innerHTML = '<div class="adm-empty" style="padding:.5rem">—</div>'; return; }
  Object.entries(obj).forEach(([k, v]) => {
    const pct   = total ? Math.round((v / total) * 100) : 0;
    const color = colors[k] || '#5b9cf6';
    el.innerHTML += `
      <div class="adm-bar-item">
        <span class="adm-bar-label">${_esc(k)}</span>
        <div class="adm-bar-track"><div class="adm-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="adm-bar-count">${v}</span>
      </div>`;
  });
}

/* ── TRENDS — sparkline Overview ────────────────────── */
async function _loadTrends() {
  try {
    const d = await Api.admin.getTrends(30);
    _renderTrends(d);
  } catch(e) { console.error('trends', e); }
}

function _fillDays(rows, days) {
  const map = {};
  (rows || []).forEach(r => {
    const key = new Date(r.day).toISOString().slice(0, 10);
    map[key] = r.count;
  });
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, count: map[key] || 0 });
  }
  return out;
}

function _sparklineSvg(series, color) {
  const max = Math.max(1, ...series.map(p => p.count));
  const n   = series.length;
  const pts = series.map((p, i) => {
    const x = n > 1 ? (i / (n - 1)) * 100 : 50;
    const y = 28 - (p.count / max) * 26;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  return `
    <svg class="adm-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polygon points="0,30 ${pts} 100,30" fill="${color}" fill-opacity="0.12"></polygon>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"></polyline>
    </svg>`;
}

function _renderTrends(data) {
  const days    = data.days || 30;
  const uSeries = _fillDays(data.users, days);
  const sSeries = _fillDays(data.submissions, days);
  const uTotal  = uSeries.reduce((a, p) => a + p.count, 0);
  const sTotal  = sSeries.reduce((a, p) => a + p.count, 0);
  const uEl = document.getElementById('ov-trend-users');
  const sEl = document.getElementById('ov-trend-subs');
  if (uEl) uEl.innerHTML = `
    <div class="adm-trend-head">
      <span class="adm-trend-total">${uTotal}</span>
      <span class="adm-trend-cap">ultimi ${days} giorni</span>
    </div>
    ${_sparklineSvg(uSeries, '#5b9cf6')}`;
  if (sEl) sEl.innerHTML = `
    <div class="adm-trend-head">
      <span class="adm-trend-total">${sTotal}</span>
      <span class="adm-trend-cap">ultimi ${days} giorni</span>
    </div>
    ${_sparklineSvg(sSeries, '#a78bfa')}`;
}

/* ── TABLE HELPERS — sort + pagination ─────────────── */
function _applySort(arr, sort, accessors) {
  if (!sort.key || !accessors[sort.key]) return arr;
  const acc = accessors[sort.key];
  return [...arr].sort((a, b) => {
    let va = acc(a), vb = acc(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string' || typeof vb === 'string') {
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
    }
    if (va < vb) return -sort.dir;
    if (va > vb) return  sort.dir;
    return 0;
  });
}

function _sortableHead(label, key, sort) {
  const active = sort.key === key;
  const arrow  = active ? (sort.dir === 1 ? '▲' : '▼') : '';
  return `<th class="adm-th-sort${active ? ' active' : ''}" data-sort-key="${key}">`
       + `${label}<span class="adm-th-arrow">${arrow}</span></th>`;
}

function _bindSortHeaders(table, sort, rerender) {
  table.querySelectorAll('th[data-sort-key]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sortKey;
      if (sort.key === key) sort.dir *= -1;
      else { sort.key = key; sort.dir = 1; }
      rerender();
    });
  });
}

function _paginate(arr, page, size) {
  const totalPages = Math.max(1, Math.ceil(arr.length / size));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * size;
  return { slice: arr.slice(start, start + size), page: p, totalPages, total: arr.length };
}

function _renderPagination(container, info, onPage) {
  if (info.totalPages <= 1) return;
  const from = (info.page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(info.page * PAGE_SIZE, info.total);
  const bar  = document.createElement('div');
  bar.className = 'adm-pagination';
  bar.innerHTML = `
    <span class="adm-pg-info">${from}–${to} di ${info.total}</span>
    <div class="adm-pg-btns">
      <button class="adm-pg-btn" data-pg="first" ${info.page === 1 ? 'disabled' : ''} title="Prima"><i class="fas fa-angles-left"></i></button>
      <button class="adm-pg-btn" data-pg="prev"  ${info.page === 1 ? 'disabled' : ''} title="Precedente"><i class="fas fa-angle-left"></i></button>
      <span class="adm-pg-current">${info.page} / ${info.totalPages}</span>
      <button class="adm-pg-btn" data-pg="next" ${info.page === info.totalPages ? 'disabled' : ''} title="Successiva"><i class="fas fa-angle-right"></i></button>
      <button class="adm-pg-btn" data-pg="last" ${info.page === info.totalPages ? 'disabled' : ''} title="Ultima"><i class="fas fa-angles-right"></i></button>
    </div>`;
  bar.querySelectorAll('.adm-pg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.pg;
      const next = a === 'first' ? 1
                 : a === 'prev'  ? info.page - 1
                 : a === 'next'  ? info.page + 1
                 : info.totalPages;
      onPage(next);
    });
  });
  container.appendChild(bar);
}

function _errorBox(message, retryFn) {
  const box = document.createElement('div');
  box.className = 'adm-empty adm-error';
  box.innerHTML = `<i class="fas fa-triangle-exclamation"></i> ${_esc(message)} `
    + `<button class="adm-btn adm-btn-detail adm-retry-btn"><i class="fas fa-rotate-right"></i> Riprova</button>`;
  box.querySelector('.adm-retry-btn').addEventListener('click', retryFn);
  return box;
}

const _LAST_LOAD_IDS = {
  overview: 'ov-last-load', submissions: 'sub-last-load',
  users: 'user-last-load', saves: 'save-last-load',
};
function _markLoaded(section) {
  const el = document.getElementById(_LAST_LOAD_IDS[section]);
  if (el) el.textContent = 'aggiornato ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function _openImgLightbox(url) {
  if (!url) return;
  const overlay = document.createElement('div');
  overlay.className = 'adm-img-lightbox';
  overlay.innerHTML = `
    <div class="adm-img-lightbox-backdrop"></div>
    <button class="adm-img-lightbox-close"><i class="fas fa-times"></i></button>
    <img src="${_esc(url)}" alt="">
  `;
  const close = () => { overlay.remove(); document.body.style.overflow = ''; };
  overlay.querySelector('.adm-img-lightbox-backdrop').addEventListener('click', close);
  overlay.querySelector('.adm-img-lightbox-close').addEventListener('click', close);
  overlay.querySelector('img').addEventListener('click', close);
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
  document.body.appendChild(overlay);
}

async function _loadSubmissions() {
  document.getElementById('sub-list').innerHTML = '<div class="adm-loading"><i class="fas fa-circle-notch fa-spin"></i></div>';
  try {
    const d = await Api.admin.getSubmissions();
    _subs = d.submissions || [];
    _subSelected.clear();
    _renderSubs();
    _markLoaded('submissions');
  } catch(e) {
    const c = document.getElementById('sub-list');
    c.innerHTML = '';
    c.appendChild(_errorBox(e.message, _loadSubmissions));
  }
}

const _subAccessors = {
  title:  s => s.payload?.name || s.payload?.title || s.type,
  type:   s => s.type,
  status: s => s.status,
  user:   s => s.username || '',
  date:   s => s.created_at ? new Date(s.created_at).getTime() : 0,
};

function _renderSubs() {
  let filtered = _subs.filter(s => {
    if (_subStatusFilter !== 'all' && s.status !== _subStatusFilter) return false;
    if (_subTypeFilter   !== 'all' && s.type   !== _subTypeFilter)   return false;
    if (_subSearch) {
      const p = s.payload || {};
      const hay = `${p.name || ''} ${p.title || ''} ${p.artist || ''} ${s.username || ''} ${s.type}`.toLowerCase();
      if (!hay.includes(_subSearch.toLowerCase())) return false;
    }
    return true;
  });
  filtered = _applySort(filtered, _subSort, _subAccessors);

  const container = document.getElementById('sub-list');
  _subFocusIdx = -1;
  if (!filtered.length) { container.innerHTML = '<div class="adm-empty">Nessuna entry trovata.</div>'; _updateBulkBar(); return; }

  const info = _paginate(filtered, _subPage, PAGE_SIZE);
  _subPage = info.page;

  const table = document.createElement('table');
  table.className = 'adm-table';
  table.innerHTML = `
    <thead><tr>
      <th class="adm-check-col"><input type="checkbox" class="adm-check" id="sub-check-all" title="Seleziona pagina" aria-label="Seleziona tutta la pagina"></th>
      <th></th>
      ${_sortableHead('Titolo / Nome', 'title',  _subSort)}
      ${_sortableHead('Tipo',          'type',   _subSort)}
      ${_sortableHead('Stato',         'status', _subSort)}
      ${_sortableHead('Utente',        'user',   _subSort)}
      ${_sortableHead('Data',          'date',   _subSort)}
      <th>Azioni</th>
    </tr></thead>
    <tbody id="sub-tbody"></tbody>
  `;
  container.innerHTML = '';
  container.appendChild(table);
  _bindSortHeaders(table, _subSort, () => { _subPage = 1; _renderSubs(); });

  const checkAll = table.querySelector('#sub-check-all');
  checkAll.addEventListener('change', () => {
    table.querySelectorAll('#sub-tbody tr').forEach(r => {
      const id = r.dataset.id;
      if (checkAll.checked) _subSelected.add(id); else _subSelected.delete(id);
      const cb = r.querySelector('.adm-row-check');
      if (cb) cb.checked = checkAll.checked;
    });
    _updateBulkBar();
  });

  const tbody = table.querySelector('#sub-tbody');
  info.slice.forEach(s => {
    const p     = s.payload || {};
    const title = p.name || p.title || s.type;
    const tr    = document.createElement('tr');
    tr.dataset.id = s.id;

    const thumbHtml = s.image_url
      ? `<img class="adm-row-thumb" src="${s.image_url}" alt="" onerror="this.style.display='none'">`
      : `<div class="adm-row-thumb" style="display:inline-flex;align-items:center;justify-content:center;color:rgba(255,255,255,.15)"><i class="fas fa-image"></i></div>`;

    tr.innerHTML = `
      <td class="adm-check-col" data-label=""><input type="checkbox" class="adm-check adm-row-check" aria-label="Seleziona riga"></td>
      <td data-label="">${thumbHtml}</td>
      <td class="adm-td-main" data-label="Titolo / Nome">${_esc(title)}</td>
      <td data-label="Tipo"><span class="adm-badge adm-badge-type">${_esc(s.type)}</span></td>
      <td data-label="Stato"><span class="adm-badge adm-badge-${s.status}" id="status-badge-${s.id}">${_statusLabel(s.status)}</span></td>
      <td data-label="Utente">${_esc(s.username || '—')}</td>
      <td data-label="Data">${_fmtDate(s.created_at)}</td>
      <td class="adm-td-actions" data-label="Azioni" id="actions-${s.id}">
        <button class="adm-btn adm-btn-detail" title="Dettaglio" aria-label="Dettaglio"><i class="fas fa-eye"></i></button>
        ${s.status !== 'approved' ? `<button class="adm-btn adm-btn-approve" title="Approva" aria-label="Approva"><i class="fas fa-check"></i></button>` : ''}
        ${s.status !== 'rejected' ? `<button class="adm-btn adm-btn-reject"  title="Rifiuta" aria-label="Rifiuta"><i class="fas fa-times"></i></button>` : ''}
        ${s.status !== 'pending'  ? `<button class="adm-btn adm-btn-pending" title="Pending" aria-label="Rimetti in attesa"><i class="fas fa-clock"></i></button>` : ''}
        <button class="adm-btn adm-btn-danger" title="Elimina" aria-label="Elimina"><i class="fas fa-trash"></i></button>
      </td>
    `;

    if (s.image_url) {
      tr.querySelector('.adm-row-thumb')?.addEventListener('click', (e) => { e.stopPropagation(); _openImgLightbox(s.image_url); });
    }
    tr.querySelector('.adm-btn-detail')?.addEventListener('click', () => _openSubDetail(s));
    tr.querySelector('.adm-btn-approve')?.addEventListener('click', () => _updateSub(s, 'approved', tr));
    tr.querySelector('.adm-btn-reject')?.addEventListener('click',  () => _updateSub(s, 'rejected', tr));
    tr.querySelector('.adm-btn-pending')?.addEventListener('click', () => _updateSub(s, 'pending',  tr));
    tr.querySelector('.adm-btn-danger')?.addEventListener('click',  () => _deleteSub(s.id));

    const rowCheck = tr.querySelector('.adm-row-check');
    rowCheck.checked = _subSelected.has(String(s.id));
    rowCheck.addEventListener('change', () => _toggleSubSelect(String(s.id)));

    tbody.appendChild(tr);
  });

  _syncCheckAll();
  _updateBulkBar();
  _renderPagination(container, info, p => { _subPage = p; _renderSubs(); });
}

/* ── BULK SELECTION ─────────────────────────────────── */
function _toggleSubSelect(id) {
  if (_subSelected.has(id)) _subSelected.delete(id);
  else _subSelected.add(id);
  const cb = document.querySelector(`#sub-tbody tr[data-id="${id}"] .adm-row-check`);
  if (cb) cb.checked = _subSelected.has(id);
  _syncCheckAll();
  _updateBulkBar();
}

function _syncCheckAll() {
  const checkAll = document.getElementById('sub-check-all');
  if (!checkAll) return;
  const rows = document.querySelectorAll('#sub-tbody tr');
  checkAll.checked = rows.length > 0 && [...rows].every(r => _subSelected.has(r.dataset.id));
}

function _updateBulkBar() {
  const bar = document.getElementById('sub-bulk-bar');
  if (!bar) return;
  const n = _subSelected.size;
  const nEl = document.getElementById('sub-bulk-n');
  if (nEl) nEl.textContent = n;
  bar.classList.toggle('visible', n > 0);
}

function _bulkUpdate(status) {
  const ids = [..._subSelected].filter(id => _subs.some(s => String(s.id) === id));
  if (!ids.length) return;
  const verb = status === 'approved' ? 'Approva' : status === 'rejected' ? 'Rifiuta' : 'Rimetti in attesa';
  _confirm(`${verb} ${ids.length} submission`, `Verranno aggiornate ${ids.length} submission. Continuare?`, async () => {
    const results = await Promise.allSettled(ids.map(id => Api.admin.updateSubmission(id, status)));
    let ok = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        ok++;
        const s = _subs.find(x => String(x.id) === ids[i]);
        if (s) s.status = status;
      }
    });
    _subSelected.clear();
    _renderSubs();
    _loadStats();
    const fail = ids.length - ok;
    _toast(`${ok} aggiornate${fail ? `, ${fail} fallite` : ''}`, fail ? 'err' : 'ok');
  });
}

function _bulkDelete() {
  const ids = [..._subSelected].filter(id => _subs.some(s => String(s.id) === id));
  if (!ids.length) return;
  _confirm(`Elimina ${ids.length} submission`, `Azione irreversibile su ${ids.length} submission. Continuare?`, async () => {
    const results = await Promise.allSettled(ids.map(id => Api.admin.deleteSubmission(id)));
    let ok = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') { ok++; _subs = _subs.filter(s => String(s.id) !== ids[i]); }
    });
    _subSelected.clear();
    _renderSubs();
    _loadStats();
    const fail = ids.length - ok;
    _toast(`${ok} eliminate${fail ? `, ${fail} fallite` : ''}`, fail ? 'err' : 'ok');
  });
}

async function _updateSub(s, status, tr) {
  const id = s.id;
  try {
    if (tr) {
      const badge = tr.querySelector(`#status-badge-${id}`);
      if (badge) { badge.className = `adm-badge adm-badge-${status}`; badge.textContent = _statusLabel(status); }
      tr.querySelectorAll('.adm-btn').forEach(b => b.disabled = true);
    }
    await Api.admin.updateSubmission(id, status);
    s.status = status;
    if (tr) {
      const actionsCell = tr.querySelector(`#actions-${id}`);
      if (actionsCell) {
        actionsCell.innerHTML = `
          <button class="adm-btn adm-btn-detail" title="Dettaglio" aria-label="Dettaglio"><i class="fas fa-eye"></i></button>
          ${status !== 'approved' ? `<button class="adm-btn adm-btn-approve" title="Approva" aria-label="Approva"><i class="fas fa-check"></i></button>` : ''}
          ${status !== 'rejected' ? `<button class="adm-btn adm-btn-reject"  title="Rifiuta" aria-label="Rifiuta"><i class="fas fa-times"></i></button>` : ''}
          ${status !== 'pending'  ? `<button class="adm-btn adm-btn-pending" title="Pending" aria-label="Rimetti in attesa"><i class="fas fa-clock"></i></button>` : ''}
          <button class="adm-btn adm-btn-danger" title="Elimina" aria-label="Elimina"><i class="fas fa-trash"></i></button>
        `;
        actionsCell.querySelector('.adm-btn-detail')?.addEventListener('click', () => _openSubDetail(s));
        actionsCell.querySelector('.adm-btn-approve')?.addEventListener('click', () => _updateSub(s, 'approved', tr));
        actionsCell.querySelector('.adm-btn-reject')?.addEventListener('click',  () => _updateSub(s, 'rejected', tr));
        actionsCell.querySelector('.adm-btn-pending')?.addEventListener('click', () => _updateSub(s, 'pending',  tr));
        actionsCell.querySelector('.adm-btn-danger')?.addEventListener('click',  () => _deleteSub(s.id));
      }
    }
    _loadStats();
    _toast(`Stato aggiornato: ${_statusLabel(status)}`, 'ok');
  } catch(e) {
    _toast(e.message, 'err');
    if (tr) tr.querySelectorAll('.adm-btn').forEach(b => b.disabled = false);
  }
}

function _deleteSub(id) {
  _confirm('Elimina submission', 'Questa azione è irreversibile. Continuare?', async () => {
    try {
      await Api.admin.deleteSubmission(id);
      _subs = _subs.filter(s => s.id !== id);
      _renderSubs();
      _loadStats();
      _toast('Submission eliminata', 'ok');
    } catch(e) { _toast(e.message, 'err'); }
  });
}

function _openSubDetail(s) {
  const p = s.payload || {};
  document.getElementById('adm-drawer-title').textContent = p.name || p.title || s.type;

  const rows = [];
  if (p.name)         rows.push(['fa-user',        'Nome',     p.name]);
  if (p.fullname)     rows.push(['fa-id-card',     'Completo', p.fullname]);
  if (p.title)        rows.push(['fa-image',       'Titolo',   p.title]);
  if (p.artist)       rows.push(['fa-palette',     'Artista',  p.artist]);
  if (p.tags?.length) rows.push(['fa-tag',         'Tag',      p.tags.join(', ')]);
  if (p.channel)      rows.push(['fa-link',        'Canale',   p.channel,  true]);
  if (p.debut)        rows.push(['fa-calendar',    'Debut',    p.debut]);
  if (p.hashtag)      rows.push(['fa-hashtag',     'Hashtag',  p.hashtag]);
  if (p.sponsor)      rows.push(['fa-bullhorn',    'Sponsor',  p.sponsor]);
  if (p.proof)        rows.push(['fa-link',        'Prova',    p.proof,    true]);
  if (p.contact)      rows.push(['fa-comment',     'Contatto', p.contact]);
  if (p.role)         rows.push(['fa-briefcase',   'Ruolo',    p.role]);
  if (s.username)     rows.push(['fa-user-circle', 'Utente',   s.username]);
  if (s.user_email)   rows.push(['fa-envelope',    'Email',    s.user_email]);
  rows.push(['fa-clock', 'Inviato', _fmtDate(s.created_at)]);
  if (p.admin_note)   rows.push(['fa-note-sticky', 'Nota admin', p.admin_note]);

  const socialRows = p.socials ? Object.entries(p.socials).map(([k,v]) => ['fa-share-nodes', k, v, true]) : [];
  const descHtml = (p.desc || p.experience) ? `
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">${p.experience ? 'Esperienze' : 'Descrizione'}</div>
      <p style="font-size:.84rem;color:rgba(255,255,255,.6);white-space:pre-wrap;line-height:1.6">${_esc(p.desc || p.experience)}</p>
    </div>` : '';

  const imgHtml = s.image_url ? `
    <div style="position:relative;margin-bottom:1.1rem;">
      <img class="adm-drawer-img" src="${_esc(s.image_url)}" alt="" onerror="this.closest('div').style.display='none'" style="margin-bottom:0;">
      <button id="da-remove-img" class="adm-btn adm-btn-danger" style="position:absolute;top:.5rem;right:.5rem;padding:.25rem .55rem;font-size:.72rem;">
        <i class="fas fa-trash"></i> Rimuovi immagine
      </button>
    </div>` : '';

  document.getElementById('adm-drawer-body').innerHTML = `
    ${imgHtml}
    <div class="adm-drawer-name">${_esc(p.name || p.title || s.type)}</div>
    <div class="adm-drawer-meta">
      <span class="adm-badge adm-badge-type">${_esc(s.type)}</span>
      <span class="adm-badge adm-badge-${s.status}" id="drawer-status-badge">${_statusLabel(s.status)}</span>
    </div>
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Informazioni</div>
      ${rows.map(([icon, lbl, val, link]) => `
        <div class="adm-dfield">
          <i class="fas ${icon}"></i>
          <span class="adm-dfield-lbl">${lbl}</span>
          <span class="adm-dfield-val">${link ? `<a href="${_esc(val)}" target="_blank" rel="noopener">${_esc(val)}</a>` : _esc(val)}</span>
        </div>`).join('')}
    </div>
    ${descHtml}
    ${socialRows.length ? `
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Social</div>
      ${socialRows.map(([icon, lbl, val]) => `
        <div class="adm-dfield">
          <i class="fas ${icon}"></i>
          <span class="adm-dfield-lbl">${lbl}</span>
          <span class="adm-dfield-val"><a href="${_esc(val)}" target="_blank" rel="noopener">${_esc(val)}</a></span>
        </div>`).join('')}
    </div>` : ''}
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Nota admin (opzionale)</div>
      <textarea class="adm-drawer-note" id="drawer-note" placeholder="Aggiungi una nota...">${_esc(p.admin_note || '')}</textarea>
    </div>
    <div class="adm-drawer-actions">
      ${s.status !== 'approved' ? `<button class="adm-btn adm-btn-approve" id="da-approve"><i class="fas fa-check"></i> Approva</button>` : ''}
      ${s.status !== 'rejected' ? `<button class="adm-btn adm-btn-reject"  id="da-reject"><i class="fas fa-times"></i> Rifiuta</button>` : ''}
      ${s.status !== 'pending'  ? `<button class="adm-btn adm-btn-pending" id="da-pending"><i class="fas fa-clock"></i> Pending</button>` : ''}
      <button class="adm-btn adm-btn-danger" id="da-delete"><i class="fas fa-trash"></i> Elimina</button>
    </div>
  `;

  if (s.image_url) {
    document.querySelector('.adm-drawer-img')?.addEventListener('click', (e) => {
      if (e.target.closest('#da-remove-img')) return;
      _openImgLightbox(s.image_url);
    });
  }

  document.getElementById('da-remove-img')?.addEventListener('click', () => {
    _confirm('Rimuovi immagine', "L'immagine verrà rimossa dalla submission. Irreversibile.", async () => {
      try {
        await Api.admin.removeImage(s.id);
        s.image_url = null;
        const tr = document.querySelector(`tr[data-id="${s.id}"]`);
        if (tr) {
          const thumb = tr.querySelector('td:first-child');
          if (thumb) thumb.innerHTML = `<div class="adm-row-thumb" style="display:inline-flex;align-items:center;justify-content:center;color:rgba(255,255,255,.15)"><i class="fas fa-image"></i></div>`;
        }
        _toast('Immagine rimossa', 'ok');
        _closeDrawer();
      } catch(e) { _toast(e.message, 'err'); }
    });
  });

  const getNote = () => document.getElementById('drawer-note')?.value || undefined;
  const doUpdate = async (newStatus) => {
    const note = getNote();
    try {
      document.querySelectorAll('#da-approve,#da-reject,#da-pending').forEach(b => b && (b.disabled = true));
      await Api.admin.updateSubmission(s.id, newStatus, note);
      s.status = newStatus;
      const badge = document.getElementById('drawer-status-badge');
      if (badge) { badge.className = `adm-badge adm-badge-${newStatus}`; badge.textContent = _statusLabel(newStatus); }
      const tr = document.querySelector(`tr[data-id="${s.id}"]`);
      if (tr) {
        const rowBadge = tr.querySelector(`#status-badge-${s.id}`);
        if (rowBadge) { rowBadge.className = `adm-badge adm-badge-${newStatus}`; rowBadge.textContent = _statusLabel(newStatus); }
        _updateSub(s, newStatus, tr);
      }
      _loadStats();
      _toast(`Stato: ${_statusLabel(newStatus)}`, 'ok');
      _closeDrawer();
    } catch(e) {
      _toast(e.message, 'err');
      document.querySelectorAll('#da-approve,#da-reject,#da-pending').forEach(b => b && (b.disabled = false));
    }
  };

  document.getElementById('da-approve')?.addEventListener('click', () => doUpdate('approved'));
  document.getElementById('da-reject')?.addEventListener('click',  () => doUpdate('rejected'));
  document.getElementById('da-pending')?.addEventListener('click', () => doUpdate('pending'));
  document.getElementById('da-delete')?.addEventListener('click',  () => { _closeDrawer(); _deleteSub(s.id); });

  _openDrawer();
}

async function _loadUsers() {
  document.getElementById('user-list').innerHTML = '<div class="adm-loading"><i class="fas fa-circle-notch fa-spin"></i></div>';
  try {
    const d = await Api.admin.getUsers();
    _users = d.users || [];
    _renderUsers();
    _markLoaded('users');
  } catch(e) {
    const c = document.getElementById('user-list');
    c.innerHTML = '';
    c.appendChild(_errorBox(e.message, _loadUsers));
  }
}

const _userAccessors = {
  username: u => u.username || '',
  email:    u => u.email || '',
  created:  u => u.created_at ? new Date(u.created_at).getTime() : 0,
  points:   u => parseFloat(u.points)   || 0,
  prestige: u => parseFloat(u.prestige) || 0,
  xp:       u => parseFloat(u.xp_level) || 0,
  research: u => parseFloat(u.research) || 0,
  time:     u => parseFloat(u.total_time_sec) || 0,
  optin:    u => u.opt_in ? 1 : 0,
};

function _renderUsers() {
  const q = _userSearch.toLowerCase();
  let filtered = q ? _users.filter(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) : _users;
  filtered = _applySort(filtered, _userSort, _userAccessors);

  const container = document.getElementById('user-list');
  if (!filtered.length) { container.innerHTML = '<div class="adm-empty">Nessun utente trovato.</div>'; return; }

  const info = _paginate(filtered, _userPage, PAGE_SIZE);
  _userPage = info.page;

  const table = document.createElement('table');
  table.className = 'adm-table';
  table.innerHTML = `
    <thead><tr>
      ${_sortableHead('Username',   'username', _userSort)}
      ${_sortableHead('Email',      'email',    _userSort)}
      ${_sortableHead('Registrato', 'created',  _userSort)}
      ${_sortableHead('Punti',      'points',   _userSort)}
      ${_sortableHead('Prestige',   'prestige', _userSort)}
      ${_sortableHead('XP',         'xp',       _userSort)}
      ${_sortableHead('Ricerca',    'research', _userSort)}
      ${_sortableHead('Tempo',      'time',     _userSort)}
      ${_sortableHead('LB',         'optin',    _userSort)}
      <th>Azioni</th>
    </tr></thead>
    <tbody id="user-tbody"></tbody>
  `;
  container.innerHTML = '';
  container.appendChild(table);
  _bindSortHeaders(table, _userSort, () => { _userPage = 1; _renderUsers(); });

  const tbody = table.querySelector('#user-tbody');
  info.slice.forEach(u => {
    const tr = document.createElement('tr');
    const isAdmin = u.email === ADMIN_EMAIL;
    tr.innerHTML = `
      <td class="adm-td-main" data-label="Username">${_esc(u.username)}${isAdmin ? ' <span style="color:#a78bfa;font-size:.72rem">(admin)</span>' : ''}</td>
      <td data-label="Email">${_esc(u.email)}</td>
      <td data-label="Registrato">${_fmtDate(u.created_at)}</td>
      <td class="adm-td-num" data-label="Punti">${_fmt(u.points)}</td>
      <td class="adm-td-num" data-label="Prestige">${_fmt(u.prestige)}</td>
      <td class="adm-td-num" data-label="XP">${u.xp_level ?? '—'}</td>
      <td class="adm-td-num" data-label="Ricerca">${_fmt(u.research)}</td>
      <td data-label="Tempo">${_fmtTime(u.total_time_sec)}</td>
      <td data-label="Leaderboard"><span class="adm-badge ${u.opt_in ? 'adm-badge-optin' : 'adm-badge-optout'}">${u.opt_in ? 'Sì' : 'No'}</span></td>
      <td class="adm-td-actions" data-label="Azioni">
        <button class="adm-btn adm-btn-detail" title="Dettaglio" aria-label="Dettaglio utente"><i class="fas fa-eye"></i></button>
        ${!isAdmin ? `<button class="adm-btn adm-btn-danger" data-action="del-user" title="Elimina" aria-label="Elimina utente"><i class="fas fa-trash"></i></button>` : ''}
      </td>
    `;
    tr.querySelector('.adm-btn-detail')?.addEventListener('click', () => _openUserDetail(u));
    tr.querySelector('[data-action="del-user"]')?.addEventListener('click', () => _deleteUser(u.id, u.username));
    tbody.appendChild(tr);
  });

  _renderPagination(container, info, p => { _userPage = p; _renderUsers(); });
}

function _openUserDetail(u) {
  document.getElementById('adm-drawer-title').textContent = u.username;
  document.getElementById('adm-drawer-body').innerHTML = `
    <div class="adm-drawer-name">${_esc(u.username)}</div>
    <div class="adm-drawer-meta">
      ${u.email === ADMIN_EMAIL ? `<span class="adm-badge adm-badge-type">admin</span>` : ''}
      <span class="adm-badge ${u.opt_in ? 'adm-badge-optin' : 'adm-badge-optout'}">${u.opt_in ? 'LB: Sì' : 'LB: No'}</span>
    </div>
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Account</div>
      <div class="adm-dfield"><i class="fas fa-user"></i><span class="adm-dfield-lbl">Username</span><span class="adm-dfield-val">${_esc(u.username)}</span></div>
      <div class="adm-dfield"><i class="fas fa-envelope"></i><span class="adm-dfield-lbl">Email</span><span class="adm-dfield-val">${_esc(u.email)}</span></div>
      <div class="adm-dfield"><i class="fas fa-calendar"></i><span class="adm-dfield-lbl">Registrato</span><span class="adm-dfield-val">${_fmtDate(u.created_at)}</span></div>
    </div>
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Gioco</div>
      <div class="adm-dfield"><i class="fas fa-star"></i><span class="adm-dfield-lbl">Punti</span><span class="adm-dfield-val">${_fmt(u.points)}</span></div>
      <div class="adm-dfield"><i class="fas fa-yen-sign"></i><span class="adm-dfield-lbl">Prestige</span><span class="adm-dfield-val">${_fmt(u.prestige)}</span></div>
      <div class="adm-dfield"><i class="fas fa-level-up-alt"></i><span class="adm-dfield-lbl">XP Level</span><span class="adm-dfield-val">${u.xp_level ?? '—'}</span></div>
      <div class="adm-dfield"><i class="fas fa-flask"></i><span class="adm-dfield-lbl">Ricerca</span><span class="adm-dfield-val">${_fmt(u.research)}</span></div>
      <div class="adm-dfield"><i class="fas fa-clock"></i><span class="adm-dfield-lbl">Tempo</span><span class="adm-dfield-val">${_fmtTime(u.total_time_sec)}</span></div>
      <div class="adm-dfield"><i class="fas fa-save"></i><span class="adm-dfield-lbl">Ultimo save</span><span class="adm-dfield-val">${_fmtDate(u.last_save)}</span></div>
    </div>
    ${u.email !== ADMIN_EMAIL ? `
    <div class="adm-drawer-actions">
      <button class="adm-btn adm-btn-danger" id="da-del-user" style="width:100%;justify-content:center"><i class="fas fa-trash"></i> Elimina utente</button>
    </div>` : ''}
  `;
  document.getElementById('da-del-user')?.addEventListener('click', () => { _closeDrawer(); _deleteUser(u.id, u.username); });
  _openDrawer();
}

function _deleteUser(id, username) {
  _confirm(`Elimina utente "${username}"`, "Questo eliminerà l'account e tutti i dati associati. Irreversibile.", async () => {
    try {
      await Api.admin.deleteUser(id);
      _users = _users.filter(u => u.id !== id);
      _renderUsers();
      _loadStats();
      _toast('Utente eliminato', 'ok');
    } catch(e) { _toast(e.message, 'err'); }
  });
}

async function _loadSaves() {
  document.getElementById('save-list').innerHTML = '<div class="adm-loading"><i class="fas fa-circle-notch fa-spin"></i></div>';
  try {
    const d = await Api.admin.getSaves();
    _saves = d.saves || [];
    _renderSaves();
    _markLoaded('saves');
  } catch(e) {
    const c = document.getElementById('save-list');
    c.innerHTML = '';
    c.appendChild(_errorBox(e.message, _loadSaves));
  }
}

const _saveAccessors = {
  user:     s => s.username || '',
  points:   s => parseFloat(s.points)   || 0,
  prestige: s => parseFloat(s.prestige) || 0,
  xp:       s => parseFloat(s.xp_level) || 0,
  research: s => parseFloat(s.research) || 0,
  time:     s => parseFloat(s.total_time_sec) || 0,
  optin:    s => s.opt_in ? 1 : 0,
  updated:  s => s.updated_at ? new Date(s.updated_at).getTime() : 0,
};

function _renderSaves() {
  const q = _saveSearch.toLowerCase();
  let filtered = q ? _saves.filter(s => s.username?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)) : _saves;
  filtered = _applySort(filtered, _saveSort, _saveAccessors);

  const container = document.getElementById('save-list');
  if (!filtered.length) { container.innerHTML = '<div class="adm-empty">Nessun salvataggio trovato.</div>'; return; }

  const info = _paginate(filtered, _savePage, PAGE_SIZE);
  _savePage = info.page;

  const table = document.createElement('table');
  table.className = 'adm-table';
  table.innerHTML = `
    <thead><tr>
      ${_sortableHead('Utente',      'user',     _saveSort)}
      ${_sortableHead('Punti',       'points',   _saveSort)}
      ${_sortableHead('Prestige',    'prestige', _saveSort)}
      ${_sortableHead('XP',          'xp',       _saveSort)}
      ${_sortableHead('Ricerca',     'research', _saveSort)}
      ${_sortableHead('Tempo',       'time',     _saveSort)}
      ${_sortableHead('LB',          'optin',    _saveSort)}
      ${_sortableHead('Ultimo save', 'updated',  _saveSort)}
      <th>Azioni</th>
    </tr></thead>
    <tbody id="save-tbody"></tbody>
  `;
  container.innerHTML = '';
  container.appendChild(table);
  _bindSortHeaders(table, _saveSort, () => { _savePage = 1; _renderSaves(); });

  const tbody = table.querySelector('#save-tbody');
  info.slice.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="adm-td-main" data-label="Utente">${_esc(s.username)}<br><span style="font-size:.72rem;color:rgba(255,255,255,.3)">${_esc(s.email)}</span></td>
      <td class="adm-td-num" data-label="Punti">${_fmt(s.points)}</td>
      <td class="adm-td-num" data-label="Prestige">${_fmt(s.prestige)}</td>
      <td class="adm-td-num" data-label="XP">${s.xp_level ?? '—'}</td>
      <td class="adm-td-num" data-label="Ricerca">${_fmt(s.research)}</td>
      <td data-label="Tempo">${_fmtTime(s.total_time_sec)}</td>
      <td data-label="Leaderboard"><span class="adm-badge ${s.opt_in ? 'adm-badge-optin' : 'adm-badge-optout'}">${s.opt_in ? 'Sì' : 'No'}</span></td>
      <td data-label="Ultimo save">${_fmtDate(s.updated_at)}</td>
      <td class="adm-td-actions" data-label="Azioni">
        <button class="adm-btn adm-btn-detail" title="Dettaglio" aria-label="Dettaglio salvataggio"><i class="fas fa-eye"></i></button>
        ${s.email !== ADMIN_EMAIL ? `<button class="adm-btn adm-btn-danger" data-action="del-save" title="Elimina" aria-label="Elimina salvataggio"><i class="fas fa-trash"></i></button>` : ''}
      </td>
    `;
    tr.querySelector('.adm-btn-detail')?.addEventListener('click', () => _openSaveDetail(s));
    tr.querySelector('[data-action="del-save"]')?.addEventListener('click', () => _deleteSave(s.user_id, s.username));
    tbody.appendChild(tr);
  });

  _renderPagination(container, info, p => { _savePage = p; _renderSaves(); });
}

function _openSaveDetail(s) {
  document.getElementById('adm-drawer-title').textContent = `Save di ${s.username}`;
  const sd = s.save_data || {};
  document.getElementById('adm-drawer-body').innerHTML = `
    <div class="adm-drawer-name">${_esc(s.username)}</div>
    <div class="adm-drawer-meta"><span class="adm-badge ${s.opt_in ? 'adm-badge-optin' : 'adm-badge-optout'}">${s.opt_in ? 'LB: Sì' : 'LB: No'}</span></div>
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Statistiche</div>
      <div class="adm-dfield"><i class="fas fa-star"></i><span class="adm-dfield-lbl">Punti</span><span class="adm-dfield-val">${_fmt(s.points)}</span></div>
      <div class="adm-dfield"><i class="fas fa-yen-sign"></i><span class="adm-dfield-lbl">Prestige</span><span class="adm-dfield-val">${_fmt(s.prestige)}</span></div>
      <div class="adm-dfield"><i class="fas fa-level-up-alt"></i><span class="adm-dfield-lbl">XP Level</span><span class="adm-dfield-val">${s.xp_level ?? '—'}</span></div>
      <div class="adm-dfield"><i class="fas fa-flask"></i><span class="adm-dfield-lbl">Ricerca</span><span class="adm-dfield-val">${_fmt(s.research)}</span></div>
      <div class="adm-dfield"><i class="fas fa-clock"></i><span class="adm-dfield-lbl">Tempo</span><span class="adm-dfield-val">${_fmtTime(s.total_time_sec)}</span></div>
      <div class="adm-dfield"><i class="fas fa-save"></i><span class="adm-dfield-lbl">Salvato</span><span class="adm-dfield-val">${_fmtDate(s.updated_at)}</span></div>
    </div>
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Raw save_data</div>
      <pre style="font-size:.72rem;color:rgba(255,255,255,.45);overflow-x:auto;white-space:pre-wrap;line-height:1.5">${_esc(JSON.stringify(sd, null, 2).slice(0, 2000))}${JSON.stringify(sd).length > 2000 ? '\n… (troncato)' : ''}</pre>
    </div>
    ${s.email !== ADMIN_EMAIL ? `
    <div class="adm-drawer-actions">
      <button class="adm-btn adm-btn-danger" id="da-del-save" style="width:100%;justify-content:center"><i class="fas fa-trash"></i> Elimina salvataggio</button>
    </div>` : ''}
  `;
  document.getElementById('da-del-save')?.addEventListener('click', () => { _closeDrawer(); _deleteSave(s.user_id, s.username); });
  _openDrawer();
}

function _deleteSave(userId, username) {
  _confirm(`Elimina save di "${username}"`, "Il salvataggio verrà eliminato. L'utente potrà ricominciare da zero.", async () => {
    try {
      await Api.admin.deleteSave(userId);
      _saves = _saves.filter(s => s.user_id !== userId);
      _renderSaves();
      _loadStats();
      _toast('Salvataggio eliminato', 'ok');
    } catch(e) { _toast(e.message, 'err'); }
  });
}

/* ── FOCUS TRAP (stackable) ─────────────────────────── */
const _FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
let _trapStack = [];

function _trapFocus(container) {
  const prev = _trapStack[_trapStack.length - 1];
  if (prev) document.removeEventListener('keydown', prev.handler);
  const focusables = () => [...container.querySelectorAll(_FOCUSABLE)]
    .filter(el => !el.disabled && el.offsetParent !== null);
  const handler = (e) => {
    if (e.key !== 'Tab') return;
    const els = focusables();
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  _trapStack.push({ handler, prevFocus: document.activeElement });
  document.addEventListener('keydown', handler);
  const f = focusables()[0];
  if (f) f.focus();
}

function _releaseFocus() {
  const top = _trapStack.pop();
  if (!top) return;
  document.removeEventListener('keydown', top.handler);
  const restored = _trapStack[_trapStack.length - 1];
  if (restored) document.addEventListener('keydown', restored.handler);
  if (top.prevFocus?.focus) top.prevFocus.focus();
}

function _openDrawer() {
  document.getElementById('adm-drawer-overlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
  _trapFocus(document.getElementById('adm-drawer'));
}
function _closeDrawer() {
  if (document.getElementById('adm-drawer-overlay').style.display === 'none') return;
  document.getElementById('adm-drawer-overlay').style.display = 'none';
  document.body.style.overflow = '';
  _releaseFocus();
}

let _confirmCb = null;
function _confirm(title, msg, cb) {
  document.getElementById('adm-confirm-title').textContent = title;
  document.getElementById('adm-confirm-msg').textContent   = msg;
  _confirmCb = cb;
  document.getElementById('adm-confirm-overlay').style.display = 'flex';
  _trapFocus(document.querySelector('.adm-confirm-box'));
}
function _closeConfirm() {
  if (document.getElementById('adm-confirm-overlay').style.display === 'none') return;
  document.getElementById('adm-confirm-overlay').style.display = 'none';
  _confirmCb = null;
  _releaseFocus();
}

let _toastTimer = null;
function _toast(msg, type = '') {
  const el = document.getElementById('adm-toast');
  el.textContent = msg;
  el.className = 'adm-toast show' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _statusLabel(s) {
  return s === 'pending' ? 'In attesa' : s === 'approved' ? 'Approvata' : 'Rifiutata';
}
function _fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('it-IT', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function _fmt(n) {
  if (n == null) return '—';
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  if (num >= 1e9) return (num/1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num/1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num/1e3).toFixed(1) + 'K';
  return Math.floor(num).toString();
}
function _fmtTime(sec) {
  if (!sec) return '—';
  const s = Math.floor(parseFloat(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function _spinRefresh(on) {
  document.getElementById('adm-refresh-btn')?.classList.toggle('spinning', on);
}

/* ── NAVIGATION + URL HASH ─────────────────────────── */
const _SECTIONS = ['overview', 'submissions', 'users', 'saves'];

function _goToSection(section, opts = {}) {
  if (!_SECTIONS.includes(section)) section = 'overview';
  document.querySelectorAll('.adm-nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.section === section));
  document.querySelectorAll('.adm-section').forEach(s =>
    s.classList.toggle('active', s.id === 'section-' + section));
  if (section === 'submissions' && opts.status) {
    _subStatusFilter = opts.status;
    _subPage = 1;
    document.querySelectorAll('#sub-status-tabs .adm-tab').forEach(x =>
      x.classList.toggle('active', x.dataset.val === opts.status));
    _renderSubs();
  }
  _syncHash();
}

function _syncHash() {
  const active = document.querySelector('.adm-nav-btn.active')?.dataset.section || 'overview';
  let hash = active;
  if (active === 'submissions' && _subStatusFilter !== 'all') hash += '/' + _subStatusFilter;
  history.replaceState(null, '', '#' + hash);
}

function _applyHash() {
  const raw = (location.hash || '').replace(/^#/, '');
  if (!raw) return;
  const [section, sub] = raw.split('/');
  const validStatus = ['pending', 'approved', 'rejected', 'all'];
  _goToSection(section, sub && validStatus.includes(sub) ? { status: sub } : {});
}

/* ── KEYBOARD NAV (submissions) ─────────────────────── */
function _setSubFocus(idx) {
  const rows = document.querySelectorAll('#sub-tbody tr');
  rows.forEach((r, i) => r.classList.toggle('adm-row-focus', i === idx));
  _subFocusIdx = idx;
  if (rows[idx]) rows[idx].scrollIntoView({ block: 'nearest' });
}

function _moveSubFocus(delta) {
  const rows = document.querySelectorAll('#sub-tbody tr');
  if (!rows.length) return;
  const idx = Math.max(0, Math.min(rows.length - 1, _subFocusIdx + delta));
  _setSubFocus(idx);
}

function _subRowAction(action) {
  const tr = document.querySelectorAll('#sub-tbody tr')[_subFocusIdx];
  if (!tr) return;
  const s = _subs.find(x => String(x.id) === String(tr.dataset.id));
  if (!s) return;
  if (action === 'detail') _openSubDetail(s);
  else if (action === 'select') _toggleSubSelect(String(s.id));
  else _updateSub(s, action, tr);
}

function _handleSubKeys(e) {
  if (!document.getElementById('section-submissions')?.classList.contains('active')) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (document.getElementById('adm-drawer-overlay')?.style.display === 'block') return;
  if (document.getElementById('adm-confirm-overlay')?.style.display === 'flex') return;
  switch (e.key) {
    case 'j': e.preventDefault(); _moveSubFocus(1);  break;
    case 'k': e.preventDefault(); _moveSubFocus(-1); break;
    case 'a': _subRowAction('approved'); break;
    case 'r': _subRowAction('rejected'); break;
    case 'p': _subRowAction('pending');  break;
    case 'x': e.preventDefault(); _subRowAction('select'); break;
    case 'Enter': _subRowAction('detail'); break;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const tryInit = () => {
    if (typeof Auth === 'undefined' || typeof Api === 'undefined') { setTimeout(tryInit, 50); return; }
    _guard();
    document.addEventListener('authChange', _guard);
    document.getElementById('adm-refresh-btn')?.addEventListener('click', _loadAll);

    document.querySelectorAll('.adm-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => _goToSection(btn.dataset.section));
    });

    document.querySelectorAll('.adm-stat-card[data-goto]').forEach(card => {
      const go = () => _goToSection(card.dataset.goto, card.dataset.gotoStatus ? { status: card.dataset.gotoStatus } : {});
      card.addEventListener('click', go);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    });

    document.querySelectorAll('#sub-status-tabs .adm-tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#sub-status-tabs .adm-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        _subStatusFilter = t.dataset.val;
        _subPage = 1;
        _subSelected.clear();
        _renderSubs();
        _syncHash();
      });
    });

    document.querySelectorAll('#sub-type-tabs .adm-tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#sub-type-tabs .adm-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        _subTypeFilter = t.dataset.val;
        _subPage = 1;
        _subSelected.clear();
        _renderSubs();
      });
    });

    document.getElementById('sub-bulk-approve')?.addEventListener('click', () => _bulkUpdate('approved'));
    document.getElementById('sub-bulk-reject')?.addEventListener('click',  () => _bulkUpdate('rejected'));
    document.getElementById('sub-bulk-delete')?.addEventListener('click',  _bulkDelete);
    document.getElementById('sub-bulk-clear')?.addEventListener('click',   () => { _subSelected.clear(); _renderSubs(); });

    const _sectionLoaders = {
      'ov-refresh': () => { _loadStats(); _loadTrends(); },
      'sub-refresh': _loadSubmissions,
      'user-refresh': _loadUsers, 'save-refresh': _loadSaves,
    };
    Object.entries(_sectionLoaders).forEach(([btnId, loader]) => {
      document.getElementById(btnId)?.addEventListener('click', loader);
    });

    document.addEventListener('keydown', _handleSubKeys);

    let _subSearchTimer, _uSearchTimer, _sSearchTimer;
    document.getElementById('sub-search')?.addEventListener('input', e => {
      clearTimeout(_subSearchTimer);
      _subSearchTimer = setTimeout(() => { _subSearch = e.target.value; _subPage = 1; _subSelected.clear(); _renderSubs(); }, 200);
    });
    document.getElementById('user-search')?.addEventListener('input', e => {
      clearTimeout(_uSearchTimer);
      _uSearchTimer = setTimeout(() => { _userSearch = e.target.value; _userPage = 1; _renderUsers(); }, 200);
    });
    document.getElementById('save-search')?.addEventListener('input', e => {
      clearTimeout(_sSearchTimer);
      _sSearchTimer = setTimeout(() => { _saveSearch = e.target.value; _savePage = 1; _renderSaves(); }, 200);
    });

    document.getElementById('adm-drawer-backdrop')?.addEventListener('click', _closeDrawer);
    document.getElementById('adm-drawer-close')?.addEventListener('click', _closeDrawer);
    document.getElementById('adm-confirm-cancel')?.addEventListener('click', _closeConfirm);
    // FIX: salva il callback prima di chiamare _closeConfirm, altrimenti viene azzerato
    document.getElementById('adm-confirm-ok')?.addEventListener('click', () => {
      const cb = _confirmCb;
      _closeConfirm();
      cb?.();
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (document.getElementById('adm-confirm-overlay').style.display !== 'none') _closeConfirm();
      else _closeDrawer();
    });

    _applyHash();
    window.addEventListener('hashchange', _applyHash);
  };
  tryInit();
});
