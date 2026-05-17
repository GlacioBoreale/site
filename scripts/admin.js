'use strict';

const ADMIN_EMAIL = 'coldesticecube@outlook.com';

let _subs  = [];
let _users = [];
let _saves = [];
let _userSearch = '';
let _saveSearch = '';

const SECTION_TYPES = ['fanart', 'vtuber', 'team', 'tag'];
const SECTION_META = {
  fanart: { label: 'Fanart',  icon: 'fa-image',  color: '#6c8fff', bg: 'rgba(108,143,255,.12)' },
  vtuber: { label: 'VTuber', icon: 'fa-star',   color: '#c084fc', bg: 'rgba(192,132,252,.12)' },
  team:   { label: 'Team',   icon: 'fa-users',  color: '#4ade80', bg: 'rgba(74,222,128,.12)'  },
  tag:    { label: 'Tag',    icon: 'fa-tag',    color: '#fbbf24', bg: 'rgba(251,191,36,.12)'  },
};

const PAGE_SIZE = 6;

let _sectionState = {};
SECTION_TYPES.forEach(t => {
  const saved = _lsGet(`adm_section_${t}`) || {};
  _sectionState[t] = {
    collapsed: saved.collapsed ?? false,
    view:      saved.view      ?? 'grid',
    filter:    saved.filter    ?? 'all',
    showCount: PAGE_SIZE,
  };
});

function _lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function _lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function _saveSectionState(type) {
  const s = _sectionState[type];
  _lsSet(`adm_section_${type}`, { collapsed: s.collapsed, view: s.view, filter: s.filter });
}

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
  _checkApiStatus();
  await Promise.allSettled([_loadStats(), _loadSubmissions(), _loadUsers(), _loadSaves()]);
  _spinRefresh(false);
}

async function _checkApiStatus() {
  const dot = document.getElementById('adm-status-dot');
  try {
    await Api.admin.getStats();
    dot.className = 'adm-status-dot ok';
    dot.title = 'API online';
  } catch {
    dot.className = 'adm-status-dot err';
    dot.title = 'API offline o errore';
  }
}

async function _loadStats() {
  try {
    const d = await Api.admin.getStats();
    document.getElementById('ov-users').textContent   = d.users   ?? '—';
    document.getElementById('ov-saves').textContent   = d.saves   ?? '—';
    document.getElementById('ov-subs').textContent    = d.submissions ?? '—';
    document.getElementById('ov-pending').textContent = d.by_status?.pending ?? '—';
    const total = d.submissions || 1;
    _renderBarList('ov-by-type', d.by_type || {}, total, {
      vtuber: '#c084fc', fanart: '#6c8fff', team: '#4ade80', tag: '#fbbf24',
    });
    _renderBarList('ov-by-status', d.by_status || {}, total, {
      pending: '#fbbf24', approved: '#4ade80', rejected: '#f87171',
    });
    const pending = d.by_status?.pending || 0;
    const badge = document.getElementById('nav-badge-submissions');
    if (pending > 0) { badge.textContent = pending; badge.classList.add('visible'); }
    else badge.classList.remove('visible');
  } catch(e) { console.error('stats', e); }
}

function _renderBarList(elId, obj, total, colors) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  if (!Object.keys(obj).length) { el.innerHTML = '<div class="adm-empty" style="padding:.5rem">—</div>'; return; }
  Object.entries(obj).forEach(([k, v]) => {
    const pct   = total ? Math.round((v / total) * 100) : 0;
    const color = colors[k] || '#6c8fff';
    el.innerHTML += `
      <div class="adm-bar-item">
        <span class="adm-bar-label">${_esc(k)}</span>
        <div class="adm-bar-track"><div class="adm-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="adm-bar-count">${v}</span>
      </div>`;
  });
}

function _renderActivityFeed(subs) {
  const feed = document.getElementById('ov-feed');
  if (!feed) return;
  const recent = [...subs].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
  if (!recent.length) { feed.innerHTML = '<div class="adm-feed-empty">Nessuna attività recente.</div>'; return; }
  const colorMap = { fanart:'#6c8fff', vtuber:'#c084fc', team:'#4ade80', tag:'#fbbf24' };
  feed.innerHTML = recent.map(s => {
    const p     = s.payload || {};
    const name  = p.title || p.name || s.type;
    const color = colorMap[s.type] || '#6c8fff';
    return `
      <div class="adm-feed-item">
        <div class="adm-feed-dot" style="background:${color}"></div>
        <div class="adm-feed-body">
          <div class="adm-feed-text">
            <strong>${_esc(s.username || 'Anonimo')}</strong>
            ha inviato una <strong>${_esc(s.type)}</strong>:
            "${_esc(name)}"
            <span class="adm-badge adm-badge-${s.status}" style="margin-left:.3rem">${_statusLabel(s.status)}</span>
          </div>
          <div class="adm-feed-time">${_fmtDate(s.created_at)}</div>
        </div>
      </div>`;
  }).join('');
}

// ── SUBMISSIONS ──────────────────────────────────────────────
async function _loadSubmissions() {
  document.getElementById('sub-sections').innerHTML = '<div class="adm-loading"><i class="fas fa-circle-notch fa-spin"></i></div>';
  try {
    const d = await Api.admin.getSubmissions();
    _subs = d.submissions || [];
    _renderSubSections();
    _renderActivityFeed(_subs);
  } catch(e) {
    document.getElementById('sub-sections').innerHTML = `<div class="adm-empty"><i class="fas fa-triangle-exclamation"></i> ${_esc(e.message)}</div>`;
  }
}

function _renderSubSections() {
  const container = document.getElementById('sub-sections');
  container.innerHTML = '';
  SECTION_TYPES.forEach(type => container.appendChild(_buildSubSection(type)));
}

// helper: aggiorna solo il body di una sezione esistente nel DOM
function _refreshSectionBody(type) {
  const section = document.querySelector(`.adm-sub-section[data-type="${type}"]`);
  if (!section) return;
  _renderSubBody(section, type);
  // aggiorna anche i badge
  const allOfType = _subs.filter(s => s.type === type);
  const pending   = allOfType.filter(s => s.status === 'pending').length;
  const counts    = section.querySelector('.adm-sub-section-counts');
  if (counts) {
    const pendingBadge = pending > 0
      ? `<span class="adm-sub-section-badge adm-badge-pending" style="background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.28);color:#fbbf24">${pending}</span>`
      : '';
    const totalBadge = `<span class="adm-sub-section-badge" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.4);font-size:.64rem;padding:.15rem .45rem;border-radius:10px;font-family:'Fredoka',sans-serif;font-weight:700">${allOfType.length}</span>`;
    counts.innerHTML = pendingBadge + totalBadge;
  }
}

function _buildSubSection(type) {
  const meta  = SECTION_META[type];
  const state = _sectionState[type];
  const allOfType = _subs.filter(s => s.type === type);
  const pending   = allOfType.filter(s => s.status === 'pending').length;

  const section = document.createElement('div');
  section.className = 'adm-sub-section' + (state.collapsed ? ' collapsed' : '');
  section.dataset.type = type;

  const pendingBadge = pending > 0
    ? `<span class="adm-sub-section-badge adm-badge-pending" style="background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.28);color:#fbbf24">${pending}</span>`
    : '';
  const totalBadge = `<span class="adm-sub-section-badge" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.4);font-size:.64rem;padding:.15rem .45rem;border-radius:10px;font-family:'Fredoka',sans-serif;font-weight:700">${allOfType.length}</span>`;

  section.innerHTML = `
    <div class="adm-sub-section-header">
      <div class="adm-sub-section-left">
        <div class="adm-sub-section-icon" style="background:${meta.bg};color:${meta.color}">
          <i class="fas ${meta.icon}"></i>
        </div>
        <span class="adm-sub-section-title">${meta.label}</span>
        <div class="adm-sub-section-counts">${pendingBadge}${totalBadge}</div>
      </div>
      <div class="adm-sub-section-right">
        <div class="adm-sub-filter-tabs">
          <button class="adm-sub-filter-tab ${state.filter==='all'?'active':''}" data-val="all">Tutti</button>
          <button class="adm-sub-filter-tab ${state.filter==='pending'?'active':''}" data-val="pending">In attesa</button>
          <button class="adm-sub-filter-tab ${state.filter==='approved'?'active':''}" data-val="approved">Approvati</button>
          <button class="adm-sub-filter-tab ${state.filter==='rejected'?'active':''}" data-val="rejected">Rifiutati</button>
        </div>
        <div class="adm-sub-view-toggle">
          <button class="adm-sub-view-btn ${state.view==='grid'?'active':''}" data-view="grid" title="Griglia"><i class="fas fa-grip"></i></button>
          <button class="adm-sub-view-btn ${state.view==='list'?'active':''}" data-view="list" title="Lista"><i class="fas fa-list"></i></button>
        </div>
        <button class="adm-sub-collapse-btn" title="Comprimi/Espandi"><i class="fas fa-chevron-down"></i></button>
      </div>
    </div>
    <div class="adm-sub-section-body" id="sub-body-${type}" style="display:${state.collapsed?'none':'block'}"></div>
  `;

  _renderSubBody(section, type);

  const header      = section.querySelector('.adm-sub-section-header');
  const collapseBtn = section.querySelector('.adm-sub-collapse-btn');
  const filterTabs  = section.querySelectorAll('.adm-sub-filter-tab');
  const viewBtns    = section.querySelectorAll('.adm-sub-view-btn');
  const body        = section.querySelector(`#sub-body-${type}`);

  const toggleCollapse = () => {
    state.collapsed = !state.collapsed;
    section.classList.toggle('collapsed', state.collapsed);
    body.style.display = state.collapsed ? 'none' : 'block';
    _saveSectionState(type);
  };

  collapseBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleCollapse(); });
  header.addEventListener('click', (e) => {
    if (e.target.closest('.adm-sub-section-right')) return;
    toggleCollapse();
  });

  filterTabs.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      filterTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.val;
      state.showCount = PAGE_SIZE;
      _saveSectionState(type);
      _renderSubBody(section, type);
    });
  });

  viewBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.view = btn.dataset.view;
      _saveSectionState(type);
      _renderSubBody(section, type);
    });
  });

  return section;
}

function _renderSubBody(section, type) {
  const state    = _sectionState[type];
  const body     = section.querySelector(`#sub-body-${type}`);
  if (!body) return;

  const filtered = _subs.filter(s => s.type === type && (state.filter === 'all' || s.status === state.filter));
  const visible  = filtered.slice(0, state.showCount);
  const hasMore  = filtered.length > state.showCount;
  const canLess  = state.showCount > PAGE_SIZE;

  body.innerHTML = '';

  if (!filtered.length) {
    body.innerHTML = '<div class="adm-empty">Nessuna entry trovata.</div>';
  } else if (state.view === 'grid') {
    const grid = document.createElement('div');
    grid.className = 'adm-sub-grid';
    visible.forEach(s => grid.appendChild(_buildSubCard(s, type)));
    body.appendChild(grid);
  } else {
    const list = document.createElement('div');
    list.className = 'adm-sub-list-view';
    visible.forEach(s => list.appendChild(_buildSubRow(s, type)));
    body.appendChild(list);
  }

  if (hasMore || canLess) {
    const footer = document.createElement('div');
    footer.className = 'adm-sub-section-footer';
    if (hasMore) {
      const btn = document.createElement('button');
      btn.className = 'adm-show-more-btn';
      btn.innerHTML = `<i class="fas fa-chevron-down"></i> Mostra altri (${filtered.length - state.showCount} rimanenti)`;
      btn.addEventListener('click', () => { state.showCount += PAGE_SIZE; _renderSubBody(section, type); });
      footer.appendChild(btn);
    }
    if (canLess) {
      const btn = document.createElement('button');
      btn.className = 'adm-show-more-btn';
      btn.innerHTML = `<i class="fas fa-chevron-up"></i> Mostra meno`;
      btn.addEventListener('click', () => { state.showCount = PAGE_SIZE; _renderSubBody(section, type); });
      footer.appendChild(btn);
    }
    body.appendChild(footer);
  }
}

function _buildSubCard(s, type) {
  const p     = s.payload || {};
  const title = p.title || p.name || type;
  const card  = document.createElement('div');
  card.className = 'adm-sub-card';

  if (s.image_url) {
    card.innerHTML = `
      <img class="adm-sub-card-img" src="${_esc(s.image_url)}" alt="" loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="adm-sub-card-img-placeholder" style="display:none"><i class="fas fa-image"></i></div>`;
  } else {
    card.innerHTML = `<div class="adm-sub-card-img-placeholder"><i class="fas fa-image"></i></div>`;
  }

  card.innerHTML += `
    <div class="adm-sub-card-body">
      <div class="adm-sub-card-title">${_esc(title)}</div>
      <div class="adm-sub-card-meta">
        <span class="adm-sub-card-user"><i class="fas fa-user" style="font-size:.65rem;margin-right:.25rem"></i>${_esc(s.username||'—')}</span>
        <span class="adm-badge adm-badge-${s.status}">${_statusLabel(s.status)}</span>
      </div>
      <div class="adm-sub-card-actions" id="card-actions-${s.id}"></div>
    </div>`;

  _fillCardActions(card.querySelector(`#card-actions-${s.id}`), s, type);

  if (s.image_url) {
    card.querySelector('.adm-sub-card-img')?.addEventListener('click', (e) => {
      if (e.target.closest('.adm-sub-card-actions')) return;
      _openImgLightbox(s.image_url);
    });
  }
  card.addEventListener('click', (e) => {
    if (e.target.closest('.adm-sub-card-actions') || e.target.closest('.adm-sub-card-img')) return;
    _openSubDetail(s);
  });

  return card;
}

function _fillCardActions(el, s, type) {
  el.innerHTML = '';
  if (s.status !== 'approved') {
    const b = document.createElement('button');
    b.className = 'adm-btn adm-btn-approve'; b.innerHTML = '<i class="fas fa-check"></i>'; b.title = 'Approva';
    b.addEventListener('click', (e) => { e.stopPropagation(); _updateSubInline(s, 'approved', type); });
    el.appendChild(b);
  }
  if (s.status !== 'rejected') {
    const b = document.createElement('button');
    b.className = 'adm-btn adm-btn-reject'; b.innerHTML = '<i class="fas fa-times"></i>'; b.title = 'Rifiuta';
    b.addEventListener('click', (e) => { e.stopPropagation(); _updateSubInline(s, 'rejected', type); });
    el.appendChild(b);
  }
  const del = document.createElement('button');
  del.className = 'adm-btn adm-btn-danger'; del.innerHTML = '<i class="fas fa-trash"></i>'; del.title = 'Elimina';
  del.addEventListener('click', (e) => { e.stopPropagation(); _deleteSub(s.id); });
  el.appendChild(del);
}

function _buildSubRow(s, type) {
  const p     = s.payload || {};
  const title = p.title || p.name || type;
  const row   = document.createElement('div');
  row.className = 'adm-sub-row';

  const thumb = document.createElement('div');
  thumb.className = 'adm-sub-row-thumb';
  if (s.image_url) {
    thumb.innerHTML = `<img src="${_esc(s.image_url)}" alt="" loading="lazy" onerror="this.remove()">`;
    thumb.style.cursor = 'zoom-in';
    thumb.addEventListener('click', (e) => { e.stopPropagation(); _openImgLightbox(s.image_url); });
  } else {
    thumb.innerHTML = `<i class="fas fa-image"></i>`;
  }

  row.innerHTML = `
    <div class="adm-sub-row-main">
      <div class="adm-sub-row-title">${_esc(title)}</div>
      <div class="adm-sub-row-sub">${_esc(s.username||'—')} · ${_fmtDate(s.created_at)}</div>
    </div>
    <div class="adm-sub-row-right">
      <span class="adm-badge adm-badge-${s.status}">${_statusLabel(s.status)}</span>
      <div class="adm-sub-row-actions" id="row-actions-${s.id}"></div>
    </div>`;

  row.insertBefore(thumb, row.firstChild);
  _fillCardActions(row.querySelector(`#row-actions-${s.id}`), s, type);
  row.addEventListener('click', (e) => {
    if (e.target.closest('.adm-sub-row-actions') || e.target.closest('.adm-sub-row-thumb')) return;
    _openSubDetail(s);
  });

  return row;
}

async function _updateSubInline(s, status, type) {
  try {
    await Api.admin.updateSubmission(s.id, status);
    s.status = status;
    _refreshSectionBody(type);
    _loadStats();
    _toast(_statusLabel(status), 'ok');
  } catch(e) { _toast(e.message, 'err'); }
}

function _deleteSub(id) {
  _confirm('Elimina submission', 'Questa azione è irreversibile. Continuare?', async () => {
    try {
      await Api.admin.deleteSubmission(id);
      const deleted = _subs.find(s => s.id === id);
      _subs = _subs.filter(s => s.id !== id);
      // aggiorna solo la sezione del tipo eliminato
      if (deleted) _refreshSectionBody(deleted.type);
      _renderActivityFeed(_subs);
      _loadStats();
      _toast('Submission eliminata', 'ok');
    } catch(e) { _toast(e.message, 'err'); }
  });
}

// ── DRAWER ──────────────────────────────────────────────────
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

  const descHtml = (p.desc || p.experience) ? `
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">${p.experience ? 'Esperienze' : 'Descrizione'}</div>
      <p style="font-size:.83rem;color:rgba(255,255,255,.55);white-space:pre-wrap;line-height:1.6">${_esc(p.desc || p.experience)}</p>
    </div>` : '';

  const imgHtml = s.image_url ? `
    <div style="position:relative;margin-bottom:1rem;">
      <img class="adm-drawer-img" src="${_esc(s.image_url)}" alt="" onerror="this.closest('div').style.display='none'" style="margin-bottom:0;">
      <button id="da-remove-img" class="adm-btn adm-btn-danger" style="position:absolute;top:.5rem;right:.5rem;font-size:.7rem;">
        <i class="fas fa-trash"></i> Rimuovi
      </button>
    </div>` : '';

  const socialRows = p.socials ? Object.entries(p.socials).map(([k,v]) => `
    <div class="adm-dfield"><i class="fas fa-share-nodes"></i><span class="adm-dfield-lbl">${k}</span>
    <span class="adm-dfield-val"><a href="${_esc(v)}" target="_blank" rel="noopener">${_esc(v)}</a></span></div>`) : [];

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
        <div class="adm-dfield"><i class="fas ${icon}"></i>
        <span class="adm-dfield-lbl">${lbl}</span>
        <span class="adm-dfield-val">${link ? `<a href="${_esc(val)}" target="_blank" rel="noopener">${_esc(val)}</a>` : _esc(val)}</span></div>`).join('')}
    </div>
    ${descHtml}
    ${socialRows.length ? `<div class="adm-dfield-block"><div class="adm-dfield-block-title">Social</div>${socialRows.join('')}</div>` : ''}
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Nota admin (opzionale)</div>
      <textarea class="adm-drawer-note" id="drawer-note" placeholder="Aggiungi una nota...">${_esc(p.admin_note || '')}</textarea>
    </div>
    <div class="adm-drawer-actions">
      ${s.status !== 'approved' ? `<button class="adm-btn adm-btn-approve" id="da-approve">✓ Approva</button>` : ''}
      ${s.status !== 'rejected' ? `<button class="adm-btn adm-btn-reject"  id="da-reject">✕ Rifiuta</button>` : ''}
      ${s.status !== 'pending'  ? `<button class="adm-btn adm-btn-pending" id="da-pending">⏱ Pending</button>` : ''}
      <button class="adm-btn adm-btn-danger" id="da-delete">🗑 Elimina</button>
    </div>`;

  if (s.image_url) {
    document.querySelector('.adm-drawer-img')?.addEventListener('click', (e) => {
      if (e.target.closest('#da-remove-img')) return;
      _openImgLightbox(s.image_url);
    });
    document.getElementById('da-remove-img')?.addEventListener('click', () => {
      _confirm('Rimuovi immagine', "L'immagine verrà rimossa dalla submission.", async () => {
        try {
          await Api.admin.removeImage(s.id);
          s.image_url = null;
          _refreshSectionBody(s.type);
          _toast('Immagine rimossa', 'ok');
          _closeDrawer();
        } catch(e) { _toast(e.message, 'err'); }
      });
    });
  }

  const getNote = () => document.getElementById('drawer-note')?.value || undefined;
  const doUpdate = async (newStatus) => {
    try {
      await Api.admin.updateSubmission(s.id, newStatus, getNote());
      s.status = newStatus;
      const badge = document.getElementById('drawer-status-badge');
      if (badge) { badge.className = `adm-badge adm-badge-${newStatus}`; badge.textContent = _statusLabel(newStatus); }
      _refreshSectionBody(s.type);
      _loadStats();
      _toast(`Stato: ${_statusLabel(newStatus)}`, 'ok');
      _closeDrawer();
    } catch(e) { _toast(e.message, 'err'); }
  };

  document.getElementById('da-approve')?.addEventListener('click', () => doUpdate('approved'));
  document.getElementById('da-reject')?.addEventListener('click',  () => doUpdate('rejected'));
  document.getElementById('da-pending')?.addEventListener('click', () => doUpdate('pending'));
  document.getElementById('da-delete')?.addEventListener('click',  () => { _closeDrawer(); _deleteSub(s.id); });

  _openDrawer();
}

function _openImgLightbox(url) {
  if (!url) return;
  const overlay = document.createElement('div');
  overlay.className = 'adm-img-lightbox';
  overlay.innerHTML = `
    <div class="adm-img-lightbox-backdrop"></div>
    <button class="adm-img-lightbox-close"><i class="fas fa-times"></i></button>
    <img src="${_esc(url)}" alt="">`;
  const close = () => { overlay.remove(); document.body.style.overflow = ''; };
  overlay.querySelector('.adm-img-lightbox-backdrop').addEventListener('click', close);
  overlay.querySelector('.adm-img-lightbox-close').addEventListener('click', close);
  overlay.querySelector('img').addEventListener('click', close);
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
  document.body.appendChild(overlay);
}

// ── USERS ────────────────────────────────────────────────────
async function _loadUsers() {
  document.getElementById('user-list').innerHTML = '<div class="adm-loading"><i class="fas fa-circle-notch fa-spin"></i></div>';
  try {
    const d = await Api.admin.getUsers();
    _users = d.users || [];
    _renderUsers();
  } catch(e) {
    document.getElementById('user-list').innerHTML = `<div class="adm-empty"><i class="fas fa-triangle-exclamation"></i> ${_esc(e.message)}</div>`;
  }
}

function _renderUsers() {
  const q = _userSearch.toLowerCase();
  const filtered = q ? _users.filter(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) : _users;
  if (!filtered.length) { document.getElementById('user-list').innerHTML = '<div class="adm-empty">Nessun utente trovato.</div>'; return; }

  const wrap = document.createElement('div');
  const table = document.createElement('table');
  table.className = 'adm-table';
  table.innerHTML = `<thead><tr>
    <th>Username</th><th>Email</th><th>Registrato</th>
    <th>Punti</th><th>Prestige</th><th>XP</th><th>LB</th><th>Azioni</th>
  </tr></thead><tbody id="user-tbody"></tbody>`;
  wrap.appendChild(table);
  document.getElementById('user-list').innerHTML = '';
  document.getElementById('user-list').appendChild(wrap);

  const tbody = document.getElementById('user-tbody');
  filtered.forEach(u => {
    const tr = document.createElement('tr');
    const isAdmin = u.email === ADMIN_EMAIL;
    tr.innerHTML = `
      <td class="adm-td-main">${_esc(u.username)}${isAdmin?'&nbsp;<span style="color:#c084fc;font-size:.7rem">(admin)</span>':''}</td>
      <td>${_esc(u.email)}</td>
      <td>${_fmtDate(u.created_at)}</td>
      <td class="adm-td-num">${_fmt(u.points)}</td>
      <td class="adm-td-num">${_fmt(u.prestige)}</td>
      <td class="adm-td-num">${u.xp_level??'—'}</td>
      <td><span class="adm-badge ${u.opt_in?'adm-badge-optin':'adm-badge-optout'}">${u.opt_in?'Sì':'No'}</span></td>
      <td class="adm-td-actions">
        <button class="adm-btn adm-btn-detail"><i class="fas fa-eye"></i></button>
        ${!isAdmin?`<button class="adm-btn adm-btn-danger" data-action="del"><i class="fas fa-trash"></i></button>`:''}
      </td>`;
    tr.querySelector('.adm-btn-detail')?.addEventListener('click', () => _openUserDetail(u));
    tr.querySelector('[data-action="del"]')?.addEventListener('click', () => _deleteUser(u.id, u.username));
    tbody.appendChild(tr);
  });
}

function _openUserDetail(u) {
  document.getElementById('adm-drawer-title').textContent = u.username;
  document.getElementById('adm-drawer-body').innerHTML = `
    <div class="adm-drawer-name">${_esc(u.username)}</div>
    <div class="adm-drawer-meta">
      ${u.email===ADMIN_EMAIL?`<span class="adm-badge adm-badge-type">admin</span>`:''}
      <span class="adm-badge ${u.opt_in?'adm-badge-optin':'adm-badge-optout'}">${u.opt_in?'LB: Sì':'LB: No'}</span>
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
      <div class="adm-dfield"><i class="fas fa-level-up-alt"></i><span class="adm-dfield-lbl">XP</span><span class="adm-dfield-val">${u.xp_level??'—'}</span></div>
      <div class="adm-dfield"><i class="fas fa-flask"></i><span class="adm-dfield-lbl">Ricerca</span><span class="adm-dfield-val">${_fmt(u.research)}</span></div>
      <div class="adm-dfield"><i class="fas fa-clock"></i><span class="adm-dfield-lbl">Tempo</span><span class="adm-dfield-val">${_fmtTime(u.total_time_sec)}</span></div>
      <div class="adm-dfield"><i class="fas fa-save"></i><span class="adm-dfield-lbl">Ultimo save</span><span class="adm-dfield-val">${_fmtDate(u.last_save)}</span></div>
    </div>
    ${u.email!==ADMIN_EMAIL?`<div class="adm-drawer-actions">
      <button class="adm-btn adm-btn-danger" id="da-del-user" style="width:100%;justify-content:center"><i class="fas fa-trash"></i> Elimina utente</button>
    </div>`:''}`;
  document.getElementById('da-del-user')?.addEventListener('click', () => { _closeDrawer(); _deleteUser(u.id, u.username); });
  _openDrawer();
}

function _deleteUser(id, username) {
  _confirm(`Elimina "${username}"`, "Eliminerà l'account e tutti i dati associati. Irreversibile.", async () => {
    try {
      await Api.admin.deleteUser(id);
      _users = _users.filter(u => u.id !== id);
      _renderUsers();
      _loadStats();
      _toast('Utente eliminato', 'ok');
    } catch(e) { _toast(e.message, 'err'); }
  });
}

// ── SAVES ────────────────────────────────────────────────────
async function _loadSaves() {
  document.getElementById('save-list').innerHTML = '<div class="adm-loading"><i class="fas fa-circle-notch fa-spin"></i></div>';
  try {
    const d = await Api.admin.getSaves();
    _saves = d.saves || [];
    _renderSaves();
  } catch(e) {
    document.getElementById('save-list').innerHTML = `<div class="adm-empty"><i class="fas fa-triangle-exclamation"></i> ${_esc(e.message)}</div>`;
  }
}

function _renderSaves() {
  const q = _saveSearch.toLowerCase();
  const filtered = q ? _saves.filter(s => s.username?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)) : _saves;
  if (!filtered.length) { document.getElementById('save-list').innerHTML = '<div class="adm-empty">Nessun salvataggio trovato.</div>'; return; }

  const wrap = document.createElement('div');
  const table = document.createElement('table');
  table.className = 'adm-table';
  table.innerHTML = `<thead><tr>
    <th>Utente</th><th>Punti</th><th>Prestige</th><th>XP</th><th>Tempo</th><th>LB</th><th>Salvato</th><th>Azioni</th>
  </tr></thead><tbody id="save-tbody"></tbody>`;
  wrap.appendChild(table);
  document.getElementById('save-list').innerHTML = '';
  document.getElementById('save-list').appendChild(wrap);

  const tbody = document.getElementById('save-tbody');
  filtered.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="adm-td-main">${_esc(s.username)}<br><span style="font-size:.7rem;color:var(--dim)">${_esc(s.email)}</span></td>
      <td class="adm-td-num">${_fmt(s.points)}</td>
      <td class="adm-td-num">${_fmt(s.prestige)}</td>
      <td class="adm-td-num">${s.xp_level??'—'}</td>
      <td>${_fmtTime(s.total_time_sec)}</td>
      <td><span class="adm-badge ${s.opt_in?'adm-badge-optin':'adm-badge-optout'}">${s.opt_in?'Sì':'No'}</span></td>
      <td>${_fmtDate(s.updated_at)}</td>
      <td class="adm-td-actions">
        <button class="adm-btn adm-btn-detail"><i class="fas fa-eye"></i></button>
        ${s.email!==ADMIN_EMAIL?`<button class="adm-btn adm-btn-danger" data-action="del"><i class="fas fa-trash"></i></button>`:''}
      </td>`;
    tr.querySelector('.adm-btn-detail')?.addEventListener('click', () => _openSaveDetail(s));
    tr.querySelector('[data-action="del"]')?.addEventListener('click', () => _deleteSave(s.user_id, s.username));
    tbody.appendChild(tr);
  });
}

function _openSaveDetail(s) {
  document.getElementById('adm-drawer-title').textContent = `Save di ${s.username}`;
  const sd = s.save_data || {};
  document.getElementById('adm-drawer-body').innerHTML = `
    <div class="adm-drawer-name">${_esc(s.username)}</div>
    <div class="adm-drawer-meta"><span class="adm-badge ${s.opt_in?'adm-badge-optin':'adm-badge-optout'}">${s.opt_in?'LB: Sì':'LB: No'}</span></div>
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Statistiche</div>
      <div class="adm-dfield"><i class="fas fa-star"></i><span class="adm-dfield-lbl">Punti</span><span class="adm-dfield-val">${_fmt(s.points)}</span></div>
      <div class="adm-dfield"><i class="fas fa-yen-sign"></i><span class="adm-dfield-lbl">Prestige</span><span class="adm-dfield-val">${_fmt(s.prestige)}</span></div>
      <div class="adm-dfield"><i class="fas fa-level-up-alt"></i><span class="adm-dfield-lbl">XP</span><span class="adm-dfield-val">${s.xp_level??'—'}</span></div>
      <div class="adm-dfield"><i class="fas fa-flask"></i><span class="adm-dfield-lbl">Ricerca</span><span class="adm-dfield-val">${_fmt(s.research)}</span></div>
      <div class="adm-dfield"><i class="fas fa-clock"></i><span class="adm-dfield-lbl">Tempo</span><span class="adm-dfield-val">${_fmtTime(s.total_time_sec)}</span></div>
      <div class="adm-dfield"><i class="fas fa-save"></i><span class="adm-dfield-lbl">Salvato</span><span class="adm-dfield-val">${_fmtDate(s.updated_at)}</span></div>
    </div>
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Raw save_data</div>
      <pre style="font-size:.7rem;color:rgba(255,255,255,.4);overflow-x:auto;white-space:pre-wrap;line-height:1.5">${_esc(JSON.stringify(sd,null,2).slice(0,2000))}${JSON.stringify(sd).length>2000?'\n…(troncato)':''}</pre>
    </div>
    ${s.email!==ADMIN_EMAIL?`<div class="adm-drawer-actions">
      <button class="adm-btn adm-btn-danger" id="da-del-save" style="width:100%;justify-content:center"><i class="fas fa-trash"></i> Elimina salvataggio</button>
    </div>`:''}`;
  document.getElementById('da-del-save')?.addEventListener('click', () => { _closeDrawer(); _deleteSave(s.user_id, s.username); });
  _openDrawer();
}

function _deleteSave(userId, username) {
  _confirm(`Elimina save di "${username}"`, "Il salvataggio verrà eliminato permanentemente.", async () => {
    try {
      await Api.admin.deleteSave(userId);
      _saves = _saves.filter(s => s.user_id !== userId);
      _renderSaves();
      _loadStats();
      _toast('Salvataggio eliminato', 'ok');
    } catch(e) { _toast(e.message, 'err'); }
  });
}

// ── RICERCA GLOBALE ──────────────────────────────────────────
function _globalSearch(q) {
  if (!q) return;
  q = q.toLowerCase();
  const matchSub  = _subs.find(s  => (s.payload?.name||s.payload?.title||'').toLowerCase().includes(q) || s.username?.toLowerCase().includes(q));
  const matchUser = _users.find(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  if (matchSub) {
    _navTo('submissions');
    setTimeout(() => _openSubDetail(matchSub), 100);
  } else if (matchUser) {
    _navTo('users');
    setTimeout(() => { _userSearch = q; _renderUsers(); _openUserDetail(matchUser); }, 100);
  } else {
    _toast('Nessun risultato trovato', 'info');
  }
}

// ── HELPERS ──────────────────────────────────────────────────
function _openDrawer()  { document.getElementById('adm-drawer-overlay').style.display='block'; document.body.style.overflow='hidden'; }
function _closeDrawer() { document.getElementById('adm-drawer-overlay').style.display='none';  document.body.style.overflow=''; }

let _confirmCb = null;
function _confirm(title, msg, cb) {
  document.getElementById('adm-confirm-title').textContent = title;
  document.getElementById('adm-confirm-msg').textContent   = msg;
  _confirmCb = cb;
  document.getElementById('adm-confirm-overlay').style.display = 'flex';
}
function _closeConfirm() {
  document.getElementById('adm-confirm-overlay').style.display = 'none';
  _confirmCb = null;
}

let _toastTimer = null;
function _toast(msg, type = '') {
  const el = document.getElementById('adm-toast');
  el.textContent = msg;
  el.className = 'adm-toast show' + (type ? ' '+type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function _navTo(section) {
  document.querySelectorAll('.adm-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === section));
  document.querySelectorAll('.adm-section').forEach(s => s.classList.toggle('active', s.id === `section-${section}`));
}

function _esc(s) {
  return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _statusLabel(s) {
  return s==='pending'?'In attesa':s==='approved'?'Approvata':'Rifiutata';
}
function _fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('it-IT',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function _fmt(n) {
  if (n==null) return '—';
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  if (num>=1e9) return (num/1e9).toFixed(1)+'B';
  if (num>=1e6) return (num/1e6).toFixed(1)+'M';
  if (num>=1e3) return (num/1e3).toFixed(1)+'K';
  return Math.floor(num).toString();
}
function _fmtTime(sec) {
  if (!sec) return '—';
  const s = Math.floor(parseFloat(sec));
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
  return h>0?`${h}h ${m}m`:`${m}m`;
}
function _spinRefresh(on) {
  document.getElementById('adm-refresh-btn')?.classList.toggle('spinning', on);
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const tryInit = () => {
    if (typeof Auth === 'undefined' || typeof Api === 'undefined') { setTimeout(tryInit, 50); return; }
    _guard();
    document.addEventListener('authChange', _guard);

    document.getElementById('adm-refresh-btn')?.addEventListener('click', _loadAll);

    document.querySelectorAll('.adm-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => _navTo(btn.dataset.section));
    });

    document.querySelectorAll('.adm-stat-card[data-goto]').forEach(card => {
      card.addEventListener('click', () => _navTo(card.dataset.goto));
    });

    let _uTimer, _sTimer;
    document.getElementById('user-search')?.addEventListener('input', e => {
      clearTimeout(_uTimer);
      _uTimer = setTimeout(() => { _userSearch = e.target.value; _renderUsers(); }, 200);
    });
    document.getElementById('save-search')?.addEventListener('input', e => {
      clearTimeout(_sTimer);
      _sTimer = setTimeout(() => { _saveSearch = e.target.value; _renderSaves(); }, 200);
    });
    document.getElementById('adm-global-search')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') _globalSearch(e.target.value.trim());
    });

    document.getElementById('adm-drawer-backdrop')?.addEventListener('click', _closeDrawer);
    document.getElementById('adm-drawer-close')?.addEventListener('click', _closeDrawer);
    document.getElementById('adm-confirm-cancel')?.addEventListener('click', _closeConfirm);
    document.getElementById('adm-confirm-ok')?.addEventListener('click', () => {
      const cb = _confirmCb; _closeConfirm(); cb?.();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { _closeDrawer(); _closeConfirm(); }
    });
  };
  tryInit();
});
