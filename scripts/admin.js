'use strict';

const ADMIN_EMAIL = 'coldesticecube@outlook.com';

let _subs  = [];
let _users = [];
let _saves = [];
let _subStatusFilter = 'all';
let _subTypeFilter   = 'all';
let _userSearch = '';
let _saveSearch = '';

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
  await Promise.allSettled([
    _loadStats(),
    _loadSubmissions(),
    _loadUsers(),
    _loadSaves(),
  ]);
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
  } catch(e) { console.error('stats', e); }
}

function _renderBarList(elId, obj, total, colors) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  if (!Object.keys(obj).length) { el.innerHTML = '<div class="adm-empty" style="padding:.5rem">—</div>'; return; }
  Object.entries(obj).forEach(([k, v]) => {
    const pct = total ? Math.round((v / total) * 100) : 0;
    const color = colors[k] || '#5b9cf6';
    el.innerHTML += `
      <div class="adm-bar-item">
        <span class="adm-bar-label">${_esc(k)}</span>
        <div class="adm-bar-track"><div class="adm-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="adm-bar-count">${v}</span>
      </div>`;
  });
}

async function _loadSubmissions() {
  document.getElementById('sub-list').innerHTML = '<div class="adm-loading"><i class="fas fa-circle-notch fa-spin"></i></div>';
  try {
    const d = await Api.admin.getSubmissions();
    _subs = d.submissions || [];
    _renderSubs();
  } catch(e) {
    document.getElementById('sub-list').innerHTML = `<div class="adm-empty"><i class="fas fa-triangle-exclamation"></i> ${_esc(e.message)}</div>`;
  }
}

function _renderSubs() {
  const filtered = _subs.filter(s => {
    const statusOk = _subStatusFilter === 'all' || s.status === _subStatusFilter;
    const typeOk   = _subTypeFilter   === 'all' || s.type   === _subTypeFilter;
    return statusOk && typeOk;
  });

  if (!filtered.length) {
    document.getElementById('sub-list').innerHTML = '<div class="adm-empty">Nessuna entry trovata.</div>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'adm-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th></th>
        <th>Titolo / Nome</th>
        <th>Tipo</th>
        <th>Stato</th>
        <th>Utente</th>
        <th>Data</th>
        <th>Azioni</th>
      </tr>
    </thead>
    <tbody id="sub-tbody"></tbody>
  `;
  document.getElementById('sub-list').innerHTML = '';
  document.getElementById('sub-list').appendChild(table);

  const tbody = document.getElementById('sub-tbody');
  filtered.forEach(s => {
    const p     = s.payload || {};
    const title = p.name || p.title || s.type;
    const tr    = document.createElement('tr');
    tr.dataset.id = s.id;

    const imgHtml = s.image_url
      ? `<img class="adm-row-thumb" src="${s.image_url}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">`
        + `<div class="adm-row-thumb" style="display:none;align-items:center;justify-content:center;color:rgba(255,255,255,.15)"><i class="fas fa-image"></i></div>`
      : `<div class="adm-row-thumb" style="display:inline-flex;align-items:center;justify-content:center;color:rgba(255,255,255,.15)"><i class="fas fa-image"></i></div>`;

    tr.innerHTML = `
      <td>${imgHtml}</td>
      <td class="adm-td-main">${_esc(title)}</td>
      <td><span class="adm-badge adm-badge-type">${_esc(s.type)}</span></td>
      <td><span class="adm-badge adm-badge-${s.status}" id="status-badge-${s.id}">${_statusLabel(s.status)}</span></td>
      <td>${_esc(s.username || '—')}</td>
      <td>${_fmtDate(s.created_at)}</td>
      <td class="adm-td-actions" id="actions-${s.id}">
        <button class="adm-btn adm-btn-detail"><i class="fas fa-eye"></i></button>
        ${s.status !== 'approved' ? `<button class="adm-btn adm-btn-approve" title="Approva"><i class="fas fa-check"></i></button>` : ''}
        ${s.status !== 'rejected' ? `<button class="adm-btn adm-btn-reject"  title="Rifiuta"><i class="fas fa-times"></i></button>` : ''}
        ${s.status !== 'pending'  ? `<button class="adm-btn adm-btn-pending" title="Pending"><i class="fas fa-clock"></i></button>` : ''}
        <button class="adm-btn adm-btn-danger" title="Elimina"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tr.querySelector('.adm-btn-detail')?.addEventListener('click', () => _openSubDetail(s));
    tr.querySelector('.adm-btn-approve')?.addEventListener('click', () => _updateSub(s, 'approved', tr));
    tr.querySelector('.adm-btn-reject')?.addEventListener('click',  () => _updateSub(s, 'rejected', tr));
    tr.querySelector('.adm-btn-pending')?.addEventListener('click', () => _updateSub(s, 'pending',  tr));
    tr.querySelector('.adm-btn-danger')?.addEventListener('click',  () => _deleteSub(s.id));
    tbody.appendChild(tr);
  });
}

async function _updateSub(s, status, tr) {
  const id = s.id;
  try {
    // feedback immediato sulla riga
    if (tr) {
      const badge = tr.querySelector(`#status-badge-${id}`);
      if (badge) { badge.className = `adm-badge adm-badge-${status}`; badge.textContent = _statusLabel(status); }
      tr.querySelectorAll('.adm-btn').forEach(b => b.disabled = true);
    }

    await Api.admin.updateSubmission(id, status);
    s.status = status;

    // ricarica la riga aggiornando i bottoni
    if (tr) {
      const actionsCell = tr.querySelector(`#actions-${id}`);
      if (actionsCell) {
        actionsCell.innerHTML = `
          <button class="adm-btn adm-btn-detail"><i class="fas fa-eye"></i></button>
          ${status !== 'approved' ? `<button class="adm-btn adm-btn-approve" title="Approva"><i class="fas fa-check"></i></button>` : ''}
          ${status !== 'rejected' ? `<button class="adm-btn adm-btn-reject"  title="Rifiuta"><i class="fas fa-times"></i></button>` : ''}
          ${status !== 'pending'  ? `<button class="adm-btn adm-btn-pending" title="Pending"><i class="fas fa-clock"></i></button>` : ''}
          <button class="adm-btn adm-btn-danger" title="Elimina"><i class="fas fa-trash"></i></button>
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
  if (p.name)       rows.push(['fa-user',       'Nome',     p.name]);
  if (p.fullname)   rows.push(['fa-id-card',    'Completo', p.fullname]);
  if (p.title)      rows.push(['fa-image',      'Titolo',   p.title]);
  if (p.artist)     rows.push(['fa-palette',    'Artista',  p.artist]);
  if (p.tags?.length) rows.push(['fa-tag',      'Tag',      p.tags.join(', ')]);
  if (p.channel)    rows.push(['fa-link',       'Canale',   p.channel,  true]);
  if (p.debut)      rows.push(['fa-calendar',   'Debut',    p.debut]);
  if (p.hashtag)    rows.push(['fa-hashtag',    'Hashtag',  p.hashtag]);
  if (p.sponsor)    rows.push(['fa-bullhorn',   'Sponsor',  p.sponsor]);
  if (p.proof)      rows.push(['fa-link',       'Prova',    p.proof,    true]);
  if (p.contact)    rows.push(['fa-comment',    'Contatto', p.contact]);
  if (p.role)       rows.push(['fa-briefcase',  'Ruolo',    p.role]);
  if (s.username)   rows.push(['fa-user-circle','Utente',   s.username]);
  if (s.user_email) rows.push(['fa-envelope',   'Email',    s.user_email]);
  rows.push(['fa-clock', 'Inviato', _fmtDate(s.created_at)]);
  if (p.admin_note) rows.push(['fa-note-sticky','Nota admin', p.admin_note]);

  const socialRows = p.socials ? Object.entries(p.socials).map(([k,v]) => ['fa-share-nodes', k, v, true]) : [];

  const descHtml = (p.desc || p.experience) ? `
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">${p.experience ? 'Esperienze' : 'Descrizione'}</div>
      <p style="font-size:.84rem;color:rgba(255,255,255,.6);white-space:pre-wrap;line-height:1.6">${_esc(p.desc || p.experience)}</p>
    </div>` : '';

  document.getElementById('adm-drawer-body').innerHTML = `
    ${s.image_url ? `<img class="adm-drawer-img" src="${s.image_url}" alt="" onerror="this.style.display='none'">` : ''}
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
      ${s.status !== 'approved' ? `<button class="adm-btn adm-btn-approve" id="da-approve">✓ Approva</button>` : ''}
      ${s.status !== 'rejected' ? `<button class="adm-btn adm-btn-reject"  id="da-reject">✕ Rifiuta</button>` : ''}
      ${s.status !== 'pending'  ? `<button class="adm-btn adm-btn-pending" id="da-pending">⏱ Pending</button>` : ''}
      <button class="adm-btn adm-btn-danger" id="da-delete">🗑 Elimina</button>
    </div>
  `;

  const getNote = () => document.getElementById('drawer-note')?.value || undefined;

  const doUpdate = async (newStatus) => {
    const note = getNote();
    try {
      document.querySelectorAll('#da-approve,#da-reject,#da-pending').forEach(b => b && (b.disabled = true));
      await Api.admin.updateSubmission(s.id, newStatus, note);
      s.status = newStatus;
      // aggiorna badge nel drawer
      const badge = document.getElementById('drawer-status-badge');
      if (badge) { badge.className = `adm-badge adm-badge-${newStatus}`; badge.textContent = _statusLabel(newStatus); }
      // aggiorna riga nella tabella
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
  } catch(e) {
    document.getElementById('user-list').innerHTML = `<div class="adm-empty"><i class="fas fa-triangle-exclamation"></i> ${_esc(e.message)}</div>`;
  }
}

function _renderUsers() {
  const q = _userSearch.toLowerCase();
  const filtered = q ? _users.filter(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) : _users;
  if (!filtered.length) { document.getElementById('user-list').innerHTML = '<div class="adm-empty">Nessun utente trovato.</div>'; return; }

  const table = document.createElement('table');
  table.className = 'adm-table';
  table.innerHTML = `
    <thead><tr>
      <th>Username</th><th>Email</th><th>Registrato</th>
      <th>Punti</th><th>Prestige</th><th>XP</th><th>Ricerca</th><th>Tempo</th><th>LB</th><th>Azioni</th>
    </tr></thead>
    <tbody id="user-tbody"></tbody>
  `;
  document.getElementById('user-list').innerHTML = '';
  document.getElementById('user-list').appendChild(table);

  const tbody = document.getElementById('user-tbody');
  filtered.forEach(u => {
    const tr = document.createElement('tr');
    const isAdmin = u.email === ADMIN_EMAIL;
    tr.innerHTML = `
      <td class="adm-td-main">${_esc(u.username)}${isAdmin ? ' <span style="color:#a78bfa;font-size:.72rem">(admin)</span>' : ''}</td>
      <td>${_esc(u.email)}</td>
      <td>${_fmtDate(u.created_at)}</td>
      <td class="adm-td-num">${_fmt(u.points)}</td>
      <td class="adm-td-num">${_fmt(u.prestige)}</td>
      <td class="adm-td-num">${u.xp_level ?? '—'}</td>
      <td class="adm-td-num">${_fmt(u.research)}</td>
      <td>${_fmtTime(u.total_time_sec)}</td>
      <td><span class="adm-badge ${u.opt_in ? 'adm-badge-optin' : 'adm-badge-optout'}">${u.opt_in ? 'Sì' : 'No'}</span></td>
      <td class="adm-td-actions">
        <button class="adm-btn adm-btn-detail"><i class="fas fa-eye"></i></button>
        ${!isAdmin ? `<button class="adm-btn adm-btn-danger" data-action="del-user"><i class="fas fa-trash"></i></button>` : ''}
      </td>
    `;
    tr.querySelector('.adm-btn-detail')?.addEventListener('click', () => _openUserDetail(u));
    tr.querySelector('[data-action="del-user"]')?.addEventListener('click', () => _deleteUser(u.id, u.username));
    tbody.appendChild(tr);
  });
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
  _confirm(`Elimina utente "${username}"`, 'Questo eliminerà l\'account e tutti i dati associati. Irreversibile.', async () => {
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
  } catch(e) {
    document.getElementById('save-list').innerHTML = `<div class="adm-empty"><i class="fas fa-triangle-exclamation"></i> ${_esc(e.message)}</div>`;
  }
}

function _renderSaves() {
  const q = _saveSearch.toLowerCase();
  const filtered = q ? _saves.filter(s => s.username?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)) : _saves;
  if (!filtered.length) { document.getElementById('save-list').innerHTML = '<div class="adm-empty">Nessun salvataggio trovato.</div>'; return; }

  const table = document.createElement('table');
  table.className = 'adm-table';
  table.innerHTML = `
    <thead><tr>
      <th>Utente</th><th>Punti</th><th>Prestige</th><th>XP</th><th>Ricerca</th><th>Tempo</th><th>LB</th><th>Ultimo save</th><th>Azioni</th>
    </tr></thead>
    <tbody id="save-tbody"></tbody>
  `;
  document.getElementById('save-list').innerHTML = '';
  document.getElementById('save-list').appendChild(table);

  const tbody = document.getElementById('save-tbody');
  filtered.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="adm-td-main">${_esc(s.username)}<br><span style="font-size:.72rem;color:rgba(255,255,255,.3)">${_esc(s.email)}</span></td>
      <td class="adm-td-num">${_fmt(s.points)}</td>
      <td class="adm-td-num">${_fmt(s.prestige)}</td>
      <td class="adm-td-num">${s.xp_level ?? '—'}</td>
      <td class="adm-td-num">${_fmt(s.research)}</td>
      <td>${_fmtTime(s.total_time_sec)}</td>
      <td><span class="adm-badge ${s.opt_in ? 'adm-badge-optin' : 'adm-badge-optout'}">${s.opt_in ? 'Sì' : 'No'}</span></td>
      <td>${_fmtDate(s.updated_at)}</td>
      <td class="adm-td-actions">
        <button class="adm-btn adm-btn-detail"><i class="fas fa-eye"></i></button>
        ${s.email !== ADMIN_EMAIL ? `<button class="adm-btn adm-btn-danger" data-action="del-save"><i class="fas fa-trash"></i></button>` : ''}
      </td>
    `;
    tr.querySelector('.adm-btn-detail')?.addEventListener('click', () => _openSaveDetail(s));
    tr.querySelector('[data-action="del-save"]')?.addEventListener('click', () => _deleteSave(s.user_id, s.username));
    tbody.appendChild(tr);
  });
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
  _confirm(`Elimina save di "${username}"`, 'Il salvataggio verrà eliminato. L\'utente potrà ricominciare da zero.', async () => {
    try {
      await Api.admin.deleteSave(userId);
      _saves = _saves.filter(s => s.user_id !== userId);
      _renderSaves();
      _loadStats();
      _toast('Salvataggio eliminato', 'ok');
    } catch(e) { _toast(e.message, 'err'); }
  });
}

function _openDrawer() {
  document.getElementById('adm-drawer-overlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
}
function _closeDrawer() {
  document.getElementById('adm-drawer-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

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

document.addEventListener('DOMContentLoaded', () => {
  const tryInit = () => {
    if (typeof Auth === 'undefined' || typeof Api === 'undefined') { setTimeout(tryInit, 50); return; }
    _guard();
    document.addEventListener('authChange', _guard);
    document.getElementById('adm-refresh-btn')?.addEventListener('click', _loadAll);

    document.querySelectorAll('.adm-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.adm-nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.adm-section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('section-' + btn.dataset.section)?.classList.add('active');
      });
    });

    document.querySelectorAll('#sub-status-tabs .adm-tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#sub-status-tabs .adm-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        _subStatusFilter = t.dataset.val;
        _renderSubs();
      });
    });

    document.querySelectorAll('#sub-type-tabs .adm-tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#sub-type-tabs .adm-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        _subTypeFilter = t.dataset.val;
        _renderSubs();
      });
    });

    let _uSearchTimer, _sSearchTimer;
    document.getElementById('user-search')?.addEventListener('input', e => {
      clearTimeout(_uSearchTimer);
      _uSearchTimer = setTimeout(() => { _userSearch = e.target.value; _renderUsers(); }, 200);
    });
    document.getElementById('save-search')?.addEventListener('input', e => {
      clearTimeout(_sSearchTimer);
      _sSearchTimer = setTimeout(() => { _saveSearch = e.target.value; _renderSaves(); }, 200);
    });

    document.getElementById('adm-drawer-backdrop')?.addEventListener('click', _closeDrawer);
    document.getElementById('adm-drawer-close')?.addEventListener('click', _closeDrawer);
    document.getElementById('adm-confirm-cancel')?.addEventListener('click', _closeConfirm);
    document.getElementById('adm-confirm-ok')?.addEventListener('click', () => { _closeConfirm(); _confirmCb?.(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { _closeDrawer(); _closeConfirm(); } });
  };
  tryInit();
});
