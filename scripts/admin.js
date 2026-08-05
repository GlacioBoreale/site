'use strict';

const ADMIN_EMAIL = 'coldesticecube@outlook.com';
const PAGE_SIZE   = 6;

let submissions  = [];
let users        = [];
let saves        = [];
let repos        = [];
let userSearch   = '';
let saveSearch   = '';

const SECTION_TYPES = ['fanart', 'vtuber', 'team', 'tag'];
const SECTION_META  = {
  fanart: { label: 'Fanart', icon: 'fa-image',  color: '#6c8fff', bg: 'rgba(108,143,255,.12)' },
  vtuber: { label: 'VTuber', icon: 'fa-star',   color: '#c084fc', bg: 'rgba(192,132,252,.12)' },
  team:   { label: 'Team',   icon: 'fa-users',  color: '#4ade80', bg: 'rgba(74,222,128,.12)'  },
  tag:    { label: 'Tag',    icon: 'fa-tag',    color: '#fbbf24', bg: 'rgba(251,191,36,.12)'  },
};

let sectionState = {};
SECTION_TYPES.forEach(t => {
  const saved = lsGet(`adm_section_${t}`) || {};
  sectionState[t] = {
    collapsed: saved.collapsed ?? false,
    view:      saved.view      ?? 'grid',
    filter:    saved.filter    ?? 'all',
    showCount: PAGE_SIZE,
  };
});

function lsGet(k)    { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

function saveSectionState(type) {
  const s = sectionState[type];
  lsSet(`adm_section_${type}`, { collapsed: s.collapsed, view: s.view, filter: s.filter });
}

function getSubmissionImage(s) {
  return s.image_url || s.payload?.avatar_url || null;
}

function isAdmin() {
  const user = Auth.getUser();
  return Auth.isLoggedIn() && user?.email === ADMIN_EMAIL;
}

function checkAccess() {
  if (isAdmin()) {
    document.getElementById('admin-guard').style.display = 'none';
    document.getElementById('admin-app').style.display   = 'block';
    document.getElementById('adm-user-label').textContent = Auth.getUser().email;
    loadAll();
  } else {
    document.getElementById('admin-guard').style.display = 'flex';
    document.getElementById('admin-app').style.display   = 'none';
  }
}

async function loadAll() {
  setRefreshSpinner(true);
  checkApiStatus();
  await Promise.allSettled([loadStats(), loadSubmissions(), loadUsers(), loadSaves(), loadRepos()]);
  setRefreshSpinner(false);
}

async function loadRepos() {
  try {
    const data = await Api.admin.getRepos();
    repos = data.repos || [];
    const auto = document.getElementById('repo-auto-sync');
    if (auto) auto.checked = data.auto_sync !== false;
    setRepoLastSync(data.last_sync);
    renderRepos();
    maybeAutoSync(data);
  } catch (e) {
    const el = document.getElementById('repo-list');
    if (el) el.innerHTML = `<div class="adm-empty">Errore nel caricamento delle repo.</div>`;
  }
}

let autoSyncDone = false;

function maybeAutoSync(data) {
  if (autoSyncDone) return;
  if (data.auto_sync === false) return;
  if (data.last_sync) {
    const days = (Date.now() - new Date(data.last_sync).getTime()) / 86400000;
    if (days < 3) return;
  }
  autoSyncDone = true;
  doRepoSync();
}

function setRepoLastSync(iso) {
  const el = document.getElementById('repo-last-sync');
  if (!el) return;
  if (!iso) { el.textContent = 'Mai sincronizzato'; return; }
  const d = new Date(iso);
  el.textContent = 'Ultima sincronizzazione: ' + d.toLocaleString('it-IT');
}

function renderRepos() {
  const el = document.getElementById('repo-list');
  if (!el) return;

  if (!repos.length) {
    el.innerHTML = `<div class="adm-empty">Nessuna repo. Premi "Sincronizza ora" per caricarle da GitHub.</div>`;
    return;
  }

  el.innerHTML = `
    <table class="adm-table">
      <thead>
        <tr>
          <th>Repo</th>
          <th>Linguaggio</th>
          <th>Stelle</th>
          <th>Aggiornata</th>
          <th>Visibile</th>
        </tr>
      </thead>
      <tbody>
        ${repos.map(r => `
          <tr>
            <td>
              <div class="adm-repo-name">${esc(r.name)}</div>
              ${r.description ? `<div class="adm-repo-desc">${esc(r.description)}</div>` : ''}
            </td>
            <td>${r.language ? esc(r.language) : '—'}</td>
            <td>${r.stars || 0}</td>
            <td>${r.pushed_at ? new Date(r.pushed_at).toLocaleDateString('it-IT') : '—'}</td>
            <td>
              <label class="adm-repo-vis">
                <input type="checkbox" data-repo-id="${r.id}" ${r.visible ? 'checked' : ''}>
                <span></span>
              </label>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  el.querySelectorAll('input[data-repo-id]').forEach(cb => {
    cb.addEventListener('change', async () => {
      const id = cb.dataset.repoId;
      try {
        await Api.admin.updateRepo(id, { visible: cb.checked });
        const r = repos.find(x => String(x.id) === String(id));
        if (r) r.visible = cb.checked;
        showToast(cb.checked ? 'Repo mostrata' : 'Repo nascosta', 'success');
      } catch (e) {
        cb.checked = !cb.checked;
        showToast('Errore nel salvataggio', 'error');
      }
    });
  });
}

const GITHUB_USER = 'GlacioBoreale';

async function fetchGithubRepos() {
  const r = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`, {
    headers: { 'Accept': 'application/vnd.github+json' },
  });
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  const raw = await r.json();

  return raw
    .filter(x => !x.private && !x.fork)
    .map(x => ({
      id:          x.id,
      name:        x.name,
      description: x.description,
      language:    x.language,
      stars:       x.stargazers_count || 0,
      forks:       x.forks_count || 0,
      url:         x.html_url,
      homepage:    x.homepage || null,
      preview:     `https://raw.githubusercontent.com/${x.owner.login}/${x.name}/${x.default_branch}/preview.png`,
      topics:      x.topics || [],
      pushed_at:   x.pushed_at,
    }));
}

async function doRepoSync() {
  const btn = document.getElementById('repo-sync-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sincronizzo...'; }
  try {
    const list = await fetchGithubRepos();
    const r = await Api.admin.syncRepos(list);
    showToast(`Sincronizzate ${r.count} repo`, 'success');
    await loadRepos();
  } catch (e) {
    showToast('Errore: ' + (e.message || 'sincronizzazione fallita'), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-rotate"></i> Sincronizza ora'; }
  }
}

async function checkApiStatus() {
  const dot = document.getElementById('adm-status-dot');
  try {
    await Api.admin.getStats();
    dot.className = 'adm-status-dot ok';
    dot.title     = 'API online';
  } catch {
    dot.className = 'adm-status-dot err';
    dot.title     = 'API offline o errore';
  }
}

async function loadStats() {
  try {
    const d       = await Api.admin.getStats();
    const total   = d.submissions || 1;
    const pending = d.by_status?.pending || 0;

    document.getElementById('ov-users').textContent   = d.users        ?? '—';
    document.getElementById('ov-saves').textContent   = d.saves        ?? '—';
    document.getElementById('ov-subs').textContent    = d.submissions  ?? '—';
    document.getElementById('ov-pending').textContent = pending        || '—';

    renderBarList('ov-by-type',   d.by_type   || {}, total, { vtuber: '#c084fc', fanart: '#6c8fff', team: '#4ade80', tag: '#fbbf24' });
    renderBarList('ov-by-status', d.by_status || {}, total, { pending: '#fbbf24', approved: '#4ade80', rejected: '#f87171' });

    const badge = document.getElementById('nav-badge-submissions');
    if (pending > 0) { badge.textContent = pending; badge.classList.add('visible'); }
    else badge.classList.remove('visible');
  } catch(e) { console.error('loadStats:', e); }
}

function renderBarList(elId, obj, total, colors) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  if (!Object.keys(obj).length) { el.innerHTML = '<div class="adm-empty" style="padding:.5rem">—</div>'; return; }
  Object.entries(obj).forEach(([k, v]) => {
    const pct   = total ? Math.round((v / total) * 100) : 0;
    const color = colors[k] || '#6c8fff';
    el.innerHTML += `
      <div class="adm-bar-item">
        <span class="adm-bar-label">${esc(k)}</span>
        <div class="adm-bar-track"><div class="adm-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="adm-bar-count">${v}</span>
      </div>`;
  });
}

function renderActivityFeed(subs) {
  const feed = document.getElementById('ov-feed');
  if (!feed) return;
  const recent   = [...subs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
  const colorMap = { fanart: '#6c8fff', vtuber: '#c084fc', team: '#4ade80', tag: '#fbbf24' };
  if (!recent.length) { feed.innerHTML = '<div class="adm-feed-empty">Nessuna attività recente.</div>'; return; }
  feed.innerHTML = recent.map(s => {
    const p     = s.payload || {};
    const name  = p.title || p.name || s.type;
    const color = colorMap[s.type] || '#6c8fff';
    return `
      <div class="adm-feed-item">
        <div class="adm-feed-dot" style="background:${color}"></div>
        <div class="adm-feed-body">
          <div class="adm-feed-text">
            <strong>${esc(s.username || 'Anonimo')}</strong>
            ha inviato una <strong>${esc(s.type)}</strong>:
            "${esc(name)}"
            <span class="adm-badge adm-badge-${s.status}" style="margin-left:.3rem">${statusLabel(s.status)}</span>
          </div>
          <div class="adm-feed-time">${fmtDate(s.created_at)}</div>
        </div>
      </div>`;
  }).join('');
}

async function loadSubmissions() {
  document.getElementById('sub-sections').innerHTML = '<div class="adm-loading"><i class="fas fa-circle-notch fa-spin"></i></div>';
  try {
    const d = await Api.admin.getSubmissions();
    submissions = d.submissions || [];
    renderAllSections();
    renderActivityFeed(submissions);
  } catch(e) {
    document.getElementById('sub-sections').innerHTML = `<div class="adm-empty"><i class="fas fa-triangle-exclamation"></i> ${esc(e.message)}</div>`;
  }
}

function renderAllSections() {
  const container = document.getElementById('sub-sections');
  container.innerHTML = '';
  SECTION_TYPES.forEach(type => container.appendChild(buildSection(type)));
}

function refreshSection(type) {
  const section = document.querySelector(`.adm-sub-section[data-type="${type}"]`);
  if (!section) return;
  renderSectionBody(section, type);
  const allOfType = submissions.filter(s => s.type === type);
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

function buildSection(type) {
  const meta      = SECTION_META[type];
  const state     = sectionState[type];
  const allOfType = submissions.filter(s => s.type === type);
  const pending   = allOfType.filter(s => s.status === 'pending').length;

  const section = document.createElement('div');
  section.className  = 'adm-sub-section' + (state.collapsed ? ' collapsed' : '');
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
          <button class="adm-sub-filter-tab ${state.filter==='all'?'active':''}"      data-val="all">Tutti</button>
          <button class="adm-sub-filter-tab ${state.filter==='pending'?'active':''}"  data-val="pending">In attesa</button>
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

  renderSectionBody(section, type);

  const header      = section.querySelector('.adm-sub-section-header');
  const collapseBtn = section.querySelector('.adm-sub-collapse-btn');
  const filterTabs  = section.querySelectorAll('.adm-sub-filter-tab');
  const viewBtns    = section.querySelectorAll('.adm-sub-view-btn');
  const body        = section.querySelector(`#sub-body-${type}`);

  const toggleCollapse = () => {
    state.collapsed = !state.collapsed;
    section.classList.toggle('collapsed', state.collapsed);
    body.style.display = state.collapsed ? 'none' : 'block';
    saveSectionState(type);
  };

  collapseBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleCollapse(); });
  header.addEventListener('click', (e) => { if (e.target.closest('.adm-sub-section-right')) return; toggleCollapse(); });

  filterTabs.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      filterTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter    = btn.dataset.val;
      state.showCount = PAGE_SIZE;
      saveSectionState(type);
      renderSectionBody(section, type);
    });
  });

  viewBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.view = btn.dataset.view;
      saveSectionState(type);
      renderSectionBody(section, type);
    });
  });

  return section;
}

function renderSectionBody(section, type) {
  const state    = sectionState[type];
  const body     = section.querySelector(`#sub-body-${type}`);
  if (!body) return;

  const filtered = submissions.filter(s => s.type === type && (state.filter === 'all' || s.status === state.filter));
  const visible  = filtered.slice(0, state.showCount);
  const hasMore  = filtered.length > state.showCount;
  const canLess  = state.showCount > PAGE_SIZE;

  body.innerHTML = '';

  if (!filtered.length) {
    body.innerHTML = '<div class="adm-empty">Nessuna entry trovata.</div>';
  } else if (state.view === 'grid') {
    const grid = document.createElement('div');
    grid.className = 'adm-sub-grid';
    visible.forEach(s => grid.appendChild(buildCard(s, type)));
    body.appendChild(grid);
  } else {
    const list = document.createElement('div');
    list.className = 'adm-sub-list-view';
    visible.forEach(s => list.appendChild(buildRow(s, type)));
    body.appendChild(list);
  }

  if (hasMore || canLess) {
    const footer = document.createElement('div');
    footer.className = 'adm-sub-section-footer';
    if (hasMore) {
      const btn = document.createElement('button');
      btn.className = 'adm-show-more-btn';
      btn.innerHTML = `<i class="fas fa-chevron-down"></i> Mostra altri (${filtered.length - state.showCount} rimanenti)`;
      btn.addEventListener('click', () => { state.showCount += PAGE_SIZE; renderSectionBody(section, type); });
      footer.appendChild(btn);
    }
    if (canLess) {
      const btn = document.createElement('button');
      btn.className = 'adm-show-more-btn';
      btn.innerHTML = `<i class="fas fa-chevron-up"></i> Mostra meno`;
      btn.addEventListener('click', () => { state.showCount = PAGE_SIZE; renderSectionBody(section, type); });
      footer.appendChild(btn);
    }
    body.appendChild(footer);
  }
}

function buildCard(s, type) {
  const p      = s.payload || {};
  const title  = p.title || p.name || type;
  const imgUrl = getSubmissionImage(s);
  const card   = document.createElement('div');
  card.className = 'adm-sub-card';

  card.innerHTML = imgUrl
    ? `<img class="adm-sub-card-img" src="${esc(imgUrl)}" alt="" loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <div class="adm-sub-card-img-placeholder" style="display:none"><i class="fas fa-image"></i></div>`
    : `<div class="adm-sub-card-img-placeholder"><i class="fas fa-image"></i></div>`;

  card.innerHTML += `
    <div class="adm-sub-card-body">
      <div class="adm-sub-card-title">${esc(title)}</div>
      <div class="adm-sub-card-meta">
        <span class="adm-sub-card-user"><i class="fas fa-user" style="font-size:.65rem;margin-right:.25rem"></i>${esc(s.username||'—')}</span>
        <span class="adm-badge adm-badge-${s.status}">${statusLabel(s.status)}</span>
      </div>
      <div class="adm-sub-card-actions" id="card-actions-${s.id}"></div>
    </div>`;

  fillActionButtons(card.querySelector(`#card-actions-${s.id}`), s, type);

  if (imgUrl) {
    card.querySelector('.adm-sub-card-img')?.addEventListener('click', (e) => {
      if (e.target.closest('.adm-sub-card-actions')) return;
      openImageLightbox(imgUrl);
    });
  }
  card.addEventListener('click', (e) => {
    if (e.target.closest('.adm-sub-card-actions') || e.target.closest('.adm-sub-card-img')) return;
    openSubmissionDrawer(s);
  });

  return card;
}

function fillActionButtons(el, s, type) {
  el.innerHTML = '';
  if (s.status !== 'approved') {
    const b = document.createElement('button');
    b.className = 'adm-btn adm-btn-approve'; b.innerHTML = '<i class="fas fa-check"></i>'; b.title = 'Approva';
    b.addEventListener('click', (e) => { e.stopPropagation(); updateSubmissionStatus(s, 'approved', type); });
    el.appendChild(b);
  }
  if (s.status !== 'rejected') {
    const b = document.createElement('button');
    b.className = 'adm-btn adm-btn-reject'; b.innerHTML = '<i class="fas fa-times"></i>'; b.title = 'Rifiuta';
    b.addEventListener('click', (e) => { e.stopPropagation(); updateSubmissionStatus(s, 'rejected', type); });
    el.appendChild(b);
  }
  const del = document.createElement('button');
  del.className = 'adm-btn adm-btn-danger'; del.innerHTML = '<i class="fas fa-trash"></i>'; del.title = 'Elimina';
  del.addEventListener('click', (e) => { e.stopPropagation(); deleteSubmission(s.id); });
  el.appendChild(del);
}

function buildRow(s, type) {
  const p      = s.payload || {};
  const title  = p.title || p.name || type;
  const imgUrl = getSubmissionImage(s);
  const row    = document.createElement('div');
  row.className = 'adm-sub-row';

  const thumb = document.createElement('div');
  thumb.className = 'adm-sub-row-thumb';
  if (imgUrl) {
    thumb.innerHTML    = `<img src="${esc(imgUrl)}" alt="" loading="lazy" onerror="this.remove()">`;
    thumb.style.cursor = 'zoom-in';
    thumb.addEventListener('click', (e) => { e.stopPropagation(); openImageLightbox(imgUrl); });
  } else {
    thumb.innerHTML = `<i class="fas fa-image"></i>`;
  }

  row.innerHTML = `
    <div class="adm-sub-row-main">
      <div class="adm-sub-row-title">${esc(title)}</div>
      <div class="adm-sub-row-sub">${esc(s.username||'—')} · ${fmtDate(s.created_at)}</div>
    </div>
    <div class="adm-sub-row-right">
      <span class="adm-badge adm-badge-${s.status}">${statusLabel(s.status)}</span>
      <div class="adm-sub-row-actions" id="row-actions-${s.id}"></div>
    </div>`;

  row.insertBefore(thumb, row.firstChild);
  fillActionButtons(row.querySelector(`#row-actions-${s.id}`), s, type);
  row.addEventListener('click', (e) => {
    if (e.target.closest('.adm-sub-row-actions') || e.target.closest('.adm-sub-row-thumb')) return;
    openSubmissionDrawer(s);
  });

  return row;
}

async function updateSubmissionStatus(s, status, type) {
  try {
    await Api.admin.updateSubmission(s.id, status);
    s.status = status;
    refreshSection(type);
    loadStats();
    showToast(statusLabel(status), 'ok');
  } catch(e) { showToast(e.message, 'err'); }
}

function deleteSubmission(id) {
  showConfirm('Elimina submission', 'Questa azione è irreversibile. Continuare?', async () => {
    try {
      await Api.admin.deleteSubmission(id);
      const deleted = submissions.find(s => s.id === id);
      submissions = submissions.filter(s => s.id !== id);
      if (deleted) refreshSection(deleted.type);
      renderActivityFeed(submissions);
      loadStats();
      showToast('Submission eliminata', 'ok');
    } catch(e) { showToast(e.message, 'err'); }
  });
}

function buildEditForm(s) {
  const p    = s.payload || {};
  const type = s.type;

  const inp = (id, label, val, placeholder = '') => `
    <div style="margin-bottom:.7rem;">
      <label style="display:block;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--dim);margin-bottom:.3rem;">${label}</label>
      <input id="${id}" type="text" value="${esc(val||'')}" placeholder="${esc(placeholder)}"
        style="width:100%;padding:.45rem .7rem;background:var(--raised);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:'Fredoka',sans-serif;font-size:.85rem;outline:none;">
    </div>`;

  const ta = (id, label, val, rows = 3) => `
    <div style="margin-bottom:.7rem;">
      <label style="display:block;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--dim);margin-bottom:.3rem;">${label}</label>
      <textarea id="${id}" rows="${rows}"
        style="width:100%;padding:.45rem .7rem;background:var(--raised);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:'Fredoka',sans-serif;font-size:.85rem;outline:none;resize:vertical;">${esc(val||'')}</textarea>
    </div>`;

  const createdVal = s.created_at ? new Date(s.created_at).toISOString().slice(0, 16) : '';
  const dateField  = (id, label, val) => `
    <div style="margin-bottom:.7rem;">
      <label style="display:block;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--dim);margin-bottom:.3rem;">${label}</label>
      <input id="${id}" type="datetime-local" value="${esc(val||'')}"
        style="width:100%;padding:.45rem .7rem;background:var(--raised);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:'Fredoka',sans-serif;font-size:.85rem;outline:none;">
    </div>`;

  const fields = {
    fanart: () => `
      ${inp('ed-title',   'Titolo',  p.title,   'Es. Glacio nel bosco')}
      ${inp('ed-artist',  'Artista', p.artist,  'Es. ArtistaNome')}
      ${inp('ed-tags',    'Tag (separati da ;)', (p.tags||[]).join('; '), 'Es. digitale; chibi')}
      ${inp('ed-socials', 'Social link', typeof p.socials === 'string' ? p.socials : (p.socials ? Object.values(p.socials)[0] : ''), 'https://...')}`,
    vtuber: () => `
      ${inp('ed-name',     'Nome',          p.name,     'Es. Glacio Boreale')}
      ${inp('ed-fullname', 'Nome completo', p.fullname, 'Es. Glacio Boreale VT')}
      ${inp('ed-channel',  'Canale',        p.channel,  'https://twitch.tv/...')}
      ${inp('ed-hashtag',  'Hashtag',       p.hashtag,  '#GlacioBoreale')}
      ${inp('ed-debut',    'Debut',         p.debut,    'Es. 01/01/2023')}
      ${ta('ed-desc',      'Descrizione',   p.desc, 3)}
      ${dateField('ed-created', 'Aggiunto il', createdVal)}`,
    team: () => `
      ${inp('ed-name',    'Display Name', p.name,   'Es. GlacioBoreale')}
      ${inp('ed-role',    'Ruolo',        p.role,   'Es. Moderatore')}
      ${ta('ed-desc',     'Descrizione pubblica', p.desc, 3)}
      ${inp('ed-socials', 'Social pubblici', typeof p.socials === 'string' ? p.socials : '', 'https://twitter.com/...')}
      ${ta('ed-experience', 'Esperienze (privato)', p.experience, 3)}`,
    tag: () => `${inp('ed-name', 'Nome tag', p.name, 'Es. digitale')}`,
  };

  return `
    <div class="adm-dfield-block" id="edit-block">
      <div class="adm-dfield-block-title" style="cursor:pointer;user-select:none;" id="edit-toggle">
        <i class="fas fa-pen" style="margin-right:.4rem"></i> Modifica
        <i class="fas fa-chevron-down" id="edit-chevron" style="margin-left:auto;transition:transform .2s;"></i>
      </div>
      <div id="edit-fields" style="display:none;margin-top:.8rem;">
        ${(fields[type] || fields.tag)()}
        <div id="edit-feedback" style="font-size:.8rem;margin-bottom:.5rem;"></div>
        <button id="da-save-edit" class="adm-btn adm-btn-detail" style="width:100%;justify-content:center;">
          <i class="fas fa-floppy-disk"></i> Salva modifiche
        </button>
      </div>
    </div>`;
}

function bindEditForm(s) {
  const toggle  = document.getElementById('edit-toggle');
  const fields  = document.getElementById('edit-fields');
  const chevron = document.getElementById('edit-chevron');
  const saveBtn = document.getElementById('da-save-edit');
  const fb      = document.getElementById('edit-feedback');

  toggle?.addEventListener('click', () => {
    const open = fields.style.display === 'none';
    fields.style.display    = open ? 'block' : 'none';
    chevron.style.transform = open ? 'rotate(180deg)' : '';
  });

  saveBtn?.addEventListener('click', async () => {
    saveBtn.disabled  = true;
    saveBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Salvataggio...';
    fb.textContent    = '';

    const newPayload = {};
    const type       = s.type;

    if (type === 'fanart') {
      newPayload.title   = document.getElementById('ed-title')?.value.trim();
      newPayload.artist  = document.getElementById('ed-artist')?.value.trim();
      const rawTags      = document.getElementById('ed-tags')?.value.trim();
      newPayload.tags    = rawTags ? rawTags.split(';').map(t => t.trim().toLowerCase()).filter(Boolean) : ['untagged'];
      const socialVal    = document.getElementById('ed-socials')?.value.trim();
      newPayload.socials = socialVal ? { link: socialVal } : {};
    }
    if (type === 'vtuber') {
      newPayload.name     = document.getElementById('ed-name')?.value.trim();
      newPayload.fullname = document.getElementById('ed-fullname')?.value.trim();
      newPayload.channel  = document.getElementById('ed-channel')?.value.trim();
      newPayload.hashtag  = document.getElementById('ed-hashtag')?.value.trim();
      newPayload.debut    = document.getElementById('ed-debut')?.value.trim();
      newPayload.desc     = document.getElementById('ed-desc')?.value.trim();
    }
    if (type === 'team') {
      newPayload.name       = document.getElementById('ed-name')?.value.trim();
      newPayload.role       = document.getElementById('ed-role')?.value.trim();
      newPayload.desc       = document.getElementById('ed-desc')?.value.trim();
      newPayload.socials    = document.getElementById('ed-socials')?.value.trim();
      newPayload.experience = document.getElementById('ed-experience')?.value.trim();
    }
    if (type === 'tag') {
      newPayload.name = document.getElementById('ed-name')?.value.trim().toLowerCase();
    }

    const newCreatedAt = type === 'vtuber' ? document.getElementById('ed-created')?.value || undefined : undefined;

    try {
      await Api.admin.editSubmission(s.id, newPayload, newCreatedAt);
      Object.assign(s.payload, newPayload);
      if (newCreatedAt) s.created_at = new Date(newCreatedAt).toISOString();
      refreshSection(type);
      fb.style.color = 'var(--green)';
      fb.textContent = 'Salvato!';
    } catch(e) {
      fb.style.color = 'var(--red)';
      fb.textContent = e.message || 'Errore durante il salvataggio.';
    }

    saveBtn.disabled  = false;
    saveBtn.innerHTML = '<i class="fas fa-floppy-disk"></i> Salva modifiche';
  });
}

function openSubmissionDrawer(s) {
  const p      = s.payload || {};
  const imgUrl = getSubmissionImage(s);
  document.getElementById('adm-drawer-title').textContent = p.name || p.title || s.type;

  const rows = [];
  if (p.name)         rows.push(['fa-user',        'Nome',       p.name]);
  if (p.fullname)     rows.push(['fa-id-card',     'Completo',   p.fullname]);
  if (p.title)        rows.push(['fa-image',       'Titolo',     p.title]);
  if (p.artist)       rows.push(['fa-palette',     'Artista',    p.artist]);
  if (p.tags?.length) rows.push(['fa-tag',         'Tag',        p.tags.join(', ')]);
  if (p.channel)      rows.push(['fa-link',        'Canale',     p.channel,  true]);
  if (p.debut)        rows.push(['fa-calendar',    'Debut',      p.debut]);
  if (p.hashtag)      rows.push(['fa-hashtag',     'Hashtag',    p.hashtag]);
  if (p.sponsor)      rows.push(['fa-bullhorn',    'Sponsor',    p.sponsor]);
  if (p.proof)        rows.push(['fa-link',        'Prova',      p.proof,    true]);
  if (p.contact)      rows.push(['fa-comment',     'Contatto',   p.contact]);
  if (p.role)         rows.push(['fa-briefcase',   'Ruolo',      p.role]);
  if (s.username)     rows.push(['fa-user-circle', 'Utente',     s.username]);
  if (s.user_email)   rows.push(['fa-envelope',    'Email',      s.user_email]);
  rows.push(['fa-clock', 'Inviato', fmtDate(s.created_at)]);
  if (p.admin_note)   rows.push(['fa-note-sticky', 'Nota admin', p.admin_note]);

  const descHtml = (p.desc || p.experience) ? `
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">${p.experience ? 'Esperienze' : 'Descrizione'}</div>
      <p style="font-size:.83rem;color:rgba(255,255,255,.55);white-space:pre-wrap;line-height:1.6">${esc(p.desc || p.experience)}</p>
    </div>` : '';

  const imgHtml = imgUrl ? `
    <div style="position:relative;margin-bottom:1rem;">
      <img class="adm-drawer-img" src="${esc(imgUrl)}" alt="" onerror="this.closest('div').style.display='none'" style="margin-bottom:0;">
      ${s.image_url ? `<button id="da-remove-img" class="adm-btn adm-btn-danger" style="position:absolute;top:.5rem;right:.5rem;font-size:.7rem;">
        <i class="fas fa-trash"></i> Rimuovi
      </button>` : ''}
    </div>` : '';

  const socialRows = p.socials && typeof p.socials === 'object'
    ? Object.entries(p.socials).map(([k, v]) => `
        <div class="adm-dfield"><i class="fas fa-share-nodes"></i>
        <span class="adm-dfield-lbl">${k}</span>
        <span class="adm-dfield-val"><a href="${esc(v)}" target="_blank" rel="noopener">${esc(v)}</a></span></div>`)
    : [];

  document.getElementById('adm-drawer-body').innerHTML = `
    ${imgHtml}
    <div class="adm-drawer-name">${esc(p.name || p.title || s.type)}</div>
    <div class="adm-drawer-meta">
      <span class="adm-badge adm-badge-type">${esc(s.type)}</span>
      <span class="adm-badge adm-badge-${s.status}" id="drawer-status-badge">${statusLabel(s.status)}</span>
    </div>
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Informazioni</div>
      ${rows.map(([icon, lbl, val, link]) => `
        <div class="adm-dfield"><i class="fas ${icon}"></i>
        <span class="adm-dfield-lbl">${lbl}</span>
        <span class="adm-dfield-val">${link ? `<a href="${esc(val)}" target="_blank" rel="noopener">${esc(val)}</a>` : esc(val)}</span></div>`).join('')}
    </div>
    ${descHtml}
    ${socialRows.length ? `<div class="adm-dfield-block"><div class="adm-dfield-block-title">Social</div>${socialRows.join('')}</div>` : ''}
    ${buildEditForm(s)}
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Nota admin (opzionale)</div>
      <textarea class="adm-drawer-note" id="drawer-note" placeholder="Aggiungi una nota...">${esc(p.admin_note || '')}</textarea>
    </div>
    <div class="adm-drawer-actions">
      ${s.status !== 'approved' ? `<button class="adm-btn adm-btn-approve" id="da-approve">✓ Approva</button>` : ''}
      ${s.status !== 'rejected' ? `<button class="adm-btn adm-btn-reject"  id="da-reject">✕ Rifiuta</button>` : ''}
      ${s.status !== 'pending'  ? `<button class="adm-btn adm-btn-pending" id="da-pending">⏱ Pending</button>` : ''}
      <button class="adm-btn adm-btn-danger" id="da-delete">🗑 Elimina</button>
    </div>`;

  bindEditForm(s);

  if (imgUrl) {
    document.querySelector('.adm-drawer-img')?.addEventListener('click', (e) => {
      if (e.target.closest('#da-remove-img')) return;
      openImageLightbox(imgUrl);
    });
  }
  if (s.image_url) {
    document.getElementById('da-remove-img')?.addEventListener('click', () => {
      showConfirm('Rimuovi immagine', "L'immagine verrà rimossa dalla submission.", async () => {
        try {
          await Api.admin.removeImage(s.id);
          s.image_url = null;
          refreshSection(s.type);
          showToast('Immagine rimossa', 'ok');
          closeDrawer();
        } catch(e) { showToast(e.message, 'err'); }
      });
    });
  }

  const getNote    = () => document.getElementById('drawer-note')?.value || undefined;
  const doUpdate   = async (newStatus) => {
    try {
      await Api.admin.updateSubmission(s.id, newStatus, getNote());
      s.status = newStatus;
      const badge = document.getElementById('drawer-status-badge');
      if (badge) { badge.className = `adm-badge adm-badge-${newStatus}`; badge.textContent = statusLabel(newStatus); }
      refreshSection(s.type);
      loadStats();
      showToast(`Stato: ${statusLabel(newStatus)}`, 'ok');
      closeDrawer();
    } catch(e) { showToast(e.message, 'err'); }
  };

  document.getElementById('da-approve')?.addEventListener('click', () => doUpdate('approved'));
  document.getElementById('da-reject')?.addEventListener('click',  () => doUpdate('rejected'));
  document.getElementById('da-pending')?.addEventListener('click', () => doUpdate('pending'));
  document.getElementById('da-delete')?.addEventListener('click',  () => { closeDrawer(); deleteSubmission(s.id); });

  openDrawer();
}

function openImageLightbox(url) {
  if (!url) return;
  const overlay = document.createElement('div');
  overlay.className = 'adm-img-lightbox';
  overlay.innerHTML = `
    <div class="adm-img-lightbox-backdrop"></div>
    <button class="adm-img-lightbox-close"><i class="fas fa-times"></i></button>
    <img src="${esc(url)}" alt="">`;
  const close = () => { overlay.remove(); document.body.style.overflow = ''; };
  overlay.querySelector('.adm-img-lightbox-backdrop').addEventListener('click', close);
  overlay.querySelector('.adm-img-lightbox-close').addEventListener('click', close);
  overlay.querySelector('img').addEventListener('click', close);
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
  document.body.appendChild(overlay);
}

async function loadUsers() {
  document.getElementById('user-list').innerHTML = '<div class="adm-loading"><i class="fas fa-circle-notch fa-spin"></i></div>';
  try {
    const d = await Api.admin.getUsers();
    users = d.users || [];
    renderUsers();
  } catch(e) {
    document.getElementById('user-list').innerHTML = `<div class="adm-empty"><i class="fas fa-triangle-exclamation"></i> ${esc(e.message)}</div>`;
  }
}

function renderUsers() {
  const q        = userSearch.toLowerCase();
  const filtered = q ? users.filter(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) : users;
  if (!filtered.length) { document.getElementById('user-list').innerHTML = '<div class="adm-empty">Nessun utente trovato.</div>'; return; }

  const wrap  = document.createElement('div');
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
    const tr      = document.createElement('tr');
    const isOwner = u.email === ADMIN_EMAIL;
    tr.innerHTML  = `
      <td class="adm-td-main">${esc(u.username)}${isOwner ? '&nbsp;<span style="color:#c084fc;font-size:.7rem">(admin)</span>' : ''}</td>
      <td>${esc(u.email)}</td>
      <td>${fmtDate(u.created_at)}</td>
      <td class="adm-td-num">${fmt(u.points)}</td>
      <td class="adm-td-num">${fmt(u.prestige)}</td>
      <td class="adm-td-num">${u.xp_level ?? '—'}</td>
      <td><span class="adm-badge ${u.opt_in ? 'adm-badge-optin' : 'adm-badge-optout'}">${u.opt_in ? 'Sì' : 'No'}</span></td>
      <td class="adm-td-actions">
        <button class="adm-btn adm-btn-detail"><i class="fas fa-eye"></i></button>
        ${!isOwner ? `<button class="adm-btn adm-btn-danger" data-action="del"><i class="fas fa-trash"></i></button>` : ''}
      </td>`;
    tr.querySelector('.adm-btn-detail')?.addEventListener('click', () => openUserDrawer(u));
    tr.querySelector('[data-action="del"]')?.addEventListener('click', () => deleteUser(u.id, u.username));
    tbody.appendChild(tr);
  });
}

function openUserDrawer(u) {
  document.getElementById('adm-drawer-title').textContent = u.username;
  document.getElementById('adm-drawer-body').innerHTML = `
    <div class="adm-drawer-name">${esc(u.username)}</div>
    <div class="adm-drawer-meta">
      ${u.email === ADMIN_EMAIL ? `<span class="adm-badge adm-badge-type">admin</span>` : ''}
      <span class="adm-badge ${u.opt_in ? 'adm-badge-optin' : 'adm-badge-optout'}">${u.opt_in ? 'LB: Sì' : 'LB: No'}</span>
    </div>
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Account</div>
      <div class="adm-dfield"><i class="fas fa-user"></i><span class="adm-dfield-lbl">Username</span><span class="adm-dfield-val">${esc(u.username)}</span></div>
      <div class="adm-dfield"><i class="fas fa-envelope"></i><span class="adm-dfield-lbl">Email</span><span class="adm-dfield-val">${esc(u.email)}</span></div>
      <div class="adm-dfield"><i class="fas fa-calendar"></i><span class="adm-dfield-lbl">Registrato</span><span class="adm-dfield-val">${fmtDate(u.created_at)}</span></div>
      <div class="adm-dfield"><i class="fas fa-envelope-circle-check"></i><span class="adm-dfield-lbl">Verificato</span><span class="adm-dfield-val">${u.verified === false ? '<span style="color:#f87171">No</span>' : '<span style="color:#4ade80">S\u00ec</span>'}</span></div>
    </div>
    ${u.verified === false ? `<div class="adm-dfield-block">
      <button id="da-verify-user" class="adm-btn adm-btn-detail" style="width:100%;justify-content:center"><i class="fas fa-circle-check"></i> Verifica manualmente</button>
    </div>` : ''}
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Gioco</div>
      <div class="adm-dfield"><i class="fas fa-star"></i><span class="adm-dfield-lbl">Punti</span><span class="adm-dfield-val">${fmt(u.points)}</span></div>
      <div class="adm-dfield"><i class="fas fa-yen-sign"></i><span class="adm-dfield-lbl">Prestige</span><span class="adm-dfield-val">${fmt(u.prestige)}</span></div>
      <div class="adm-dfield"><i class="fas fa-level-up-alt"></i><span class="adm-dfield-lbl">XP</span><span class="adm-dfield-val">${u.xp_level ?? '—'}</span></div>
      <div class="adm-dfield"><i class="fas fa-flask"></i><span class="adm-dfield-lbl">Ricerca</span><span class="adm-dfield-val">${fmt(u.research)}</span></div>
      <div class="adm-dfield"><i class="fas fa-clock"></i><span class="adm-dfield-lbl">Tempo</span><span class="adm-dfield-val">${fmtTime(u.total_time_sec)}</span></div>
      <div class="adm-dfield"><i class="fas fa-save"></i><span class="adm-dfield-lbl">Ultimo save</span><span class="adm-dfield-val">${fmtDate(u.last_save)}</span></div>
    </div>
    <div class="adm-dfield-block" id="user-edit-block">
      <div class="adm-dfield-block-title" style="cursor:pointer;user-select:none;" id="user-edit-toggle">
        <i class="fas fa-pen" style="margin-right:.4rem"></i> Modifica account
        <i class="fas fa-chevron-down" id="user-edit-chevron" style="margin-left:auto;transition:transform .2s;"></i>
      </div>
      <div id="user-edit-fields" style="display:none;margin-top:.8rem;">
        <div style="margin-bottom:.7rem;">
          <label style="display:block;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--dim);margin-bottom:.3rem;">Username</label>
          <input id="ue-username" type="text" value="${esc(u.username)}" maxlength="18"
            style="width:100%;padding:.45rem .7rem;background:var(--raised);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:'Fredoka',sans-serif;font-size:.85rem;outline:none;">
        </div>
        <div style="margin-bottom:.7rem;">
          <label style="display:block;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--dim);margin-bottom:.3rem;">Email</label>
          <input id="ue-email" type="email" value="${esc(u.email)}"
            style="width:100%;padding:.45rem .7rem;background:var(--raised);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:'Fredoka',sans-serif;font-size:.85rem;outline:none;">
        </div>
        <div id="user-edit-feedback" style="font-size:.8rem;margin-bottom:.5rem;"></div>
        <button id="da-save-user" class="adm-btn adm-btn-detail" style="width:100%;justify-content:center;">
          <i class="fas fa-floppy-disk"></i> Salva modifiche
        </button>
      </div>
    </div>
    ${u.email !== ADMIN_EMAIL ? `<div class="adm-drawer-actions">
      <button class="adm-btn adm-btn-danger" id="da-del-user" style="width:100%;justify-content:center"><i class="fas fa-trash"></i> Elimina utente</button>
    </div>` : ''}`;
  document.getElementById('da-del-user')?.addEventListener('click', () => { closeDrawer(); deleteUser(u.id, u.username); });

  document.getElementById('da-verify-user')?.addEventListener('click', async () => {
    const btn = document.getElementById('da-verify-user');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Verifico...';
    try {
      const r = await Api.admin.updateUser(u.id, { verified: true });
      Object.assign(u, r.user);
      renderUsers();
      showToast('Utente verificato', 'ok');
      openUserDrawer(u);
    } catch(e) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-circle-check"></i> Verifica manualmente';
      showToast(e.message, 'err');
    }
  });

  const ueToggle  = document.getElementById('user-edit-toggle');
  const ueFields  = document.getElementById('user-edit-fields');
  const ueChevron = document.getElementById('user-edit-chevron');
  ueToggle?.addEventListener('click', () => {
    const open = ueFields.style.display === 'none';
    ueFields.style.display    = open ? 'block' : 'none';
    ueChevron.style.transform = open ? 'rotate(180deg)' : '';
  });

  document.getElementById('da-save-user')?.addEventListener('click', async () => {
    const btn = document.getElementById('da-save-user');
    const fb  = document.getElementById('user-edit-feedback');
    const newUsername = document.getElementById('ue-username')?.value.trim();
    const newEmail    = document.getElementById('ue-email')?.value.trim();
    fb.textContent = '';

    const data = {};
    if (newUsername && newUsername !== u.username) data.username = newUsername;
    if (newEmail && newEmail !== u.email)          data.email    = newEmail;
    if (!Object.keys(data).length) {
      fb.style.color = 'var(--dim)';
      fb.textContent = 'Nessuna modifica da salvare.';
      return;
    }

    btn.disabled  = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Salvataggio...';
    try {
      const r = await Api.admin.updateUser(u.id, data);
      Object.assign(u, r.user);
      renderUsers();
      fb.style.color = 'var(--green)';
      fb.textContent = 'Salvato!';
      document.getElementById('adm-drawer-title').textContent = u.username;
      showToast('Utente aggiornato', 'ok');
    } catch(e) {
      fb.style.color = 'var(--red)';
      fb.textContent = e.message || 'Errore durante il salvataggio.';
    }
    btn.disabled  = false;
    btn.innerHTML = '<i class="fas fa-floppy-disk"></i> Salva modifiche';
  });

  openDrawer();
}

function deleteUser(id, username) {
  showConfirm(`Elimina "${username}"`, "Eliminerà l'account e tutti i dati associati. Irreversibile.", async () => {
    try {
      await Api.admin.deleteUser(id);
      users = users.filter(u => u.id !== id);
      renderUsers();
      loadStats();
      showToast('Utente eliminato', 'ok');
    } catch(e) { showToast(e.message, 'err'); }
  });
}

async function loadSaves() {
  document.getElementById('save-list').innerHTML = '<div class="adm-loading"><i class="fas fa-circle-notch fa-spin"></i></div>';
  try {
    const d = await Api.admin.getSaves();
    saves = d.saves || [];
    renderSaves();
  } catch(e) {
    document.getElementById('save-list').innerHTML = `<div class="adm-empty"><i class="fas fa-triangle-exclamation"></i> ${esc(e.message)}</div>`;
  }
}

function renderSaves() {
  const q        = saveSearch.toLowerCase();
  const filtered = q ? saves.filter(s => s.username?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)) : saves;
  if (!filtered.length) { document.getElementById('save-list').innerHTML = '<div class="adm-empty">Nessun salvataggio trovato.</div>'; return; }

  const wrap  = document.createElement('div');
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
      <td class="adm-td-main">${esc(s.username)}<br><span style="font-size:.7rem;color:var(--dim)">${esc(s.email)}</span></td>
      <td class="adm-td-num">${fmt(s.points)}</td>
      <td class="adm-td-num">${fmt(s.prestige)}</td>
      <td class="adm-td-num">${s.xp_level ?? '—'}</td>
      <td>${fmtTime(s.total_time_sec)}</td>
      <td><span class="adm-badge ${s.opt_in ? 'adm-badge-optin' : 'adm-badge-optout'}">${s.opt_in ? 'Sì' : 'No'}</span></td>
      <td>${fmtDate(s.updated_at)}</td>
      <td class="adm-td-actions">
        <button class="adm-btn adm-btn-detail"><i class="fas fa-eye"></i></button>
        ${s.email !== ADMIN_EMAIL ? `<button class="adm-btn adm-btn-danger" data-action="del"><i class="fas fa-trash"></i></button>` : ''}
      </td>`;
    tr.querySelector('.adm-btn-detail')?.addEventListener('click', () => openSaveDrawer(s));
    tr.querySelector('[data-action="del"]')?.addEventListener('click', () => deleteSave(s.user_id, s.username));
    tbody.appendChild(tr);
  });
}

function openSaveDrawer(s) {
  document.getElementById('adm-drawer-title').textContent = `Save di ${s.username}`;
  const sd = s.save_data || {};
  document.getElementById('adm-drawer-body').innerHTML = `
    <div class="adm-drawer-name">${esc(s.username)}</div>
    <div class="adm-drawer-meta"><span class="adm-badge ${s.opt_in ? 'adm-badge-optin' : 'adm-badge-optout'}">${s.opt_in ? 'LB: Sì' : 'LB: No'}</span></div>
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Statistiche</div>
      <div class="adm-dfield"><i class="fas fa-star"></i><span class="adm-dfield-lbl">Punti</span><span class="adm-dfield-val">${fmt(s.points)}</span></div>
      <div class="adm-dfield"><i class="fas fa-yen-sign"></i><span class="adm-dfield-lbl">Prestige</span><span class="adm-dfield-val">${fmt(s.prestige)}</span></div>
      <div class="adm-dfield"><i class="fas fa-level-up-alt"></i><span class="adm-dfield-lbl">XP</span><span class="adm-dfield-val">${s.xp_level ?? '—'}</span></div>
      <div class="adm-dfield"><i class="fas fa-flask"></i><span class="adm-dfield-lbl">Ricerca</span><span class="adm-dfield-val">${fmt(s.research)}</span></div>
      <div class="adm-dfield"><i class="fas fa-clock"></i><span class="adm-dfield-lbl">Tempo</span><span class="adm-dfield-val">${fmtTime(s.total_time_sec)}</span></div>
      <div class="adm-dfield"><i class="fas fa-save"></i><span class="adm-dfield-lbl">Salvato</span><span class="adm-dfield-val">${fmtDate(s.updated_at)}</span></div>
    </div>
    <div class="adm-dfield-block">
      <div class="adm-dfield-block-title">Raw save_data</div>
      <pre style="font-size:.7rem;color:rgba(255,255,255,.4);overflow-x:auto;white-space:pre-wrap;line-height:1.5">${esc(JSON.stringify(sd, null, 2).slice(0, 2000))}${JSON.stringify(sd).length > 2000 ? '\n…(troncato)' : ''}</pre>
    </div>
    ${s.email !== ADMIN_EMAIL ? `<div class="adm-drawer-actions">
      <button class="adm-btn adm-btn-danger" id="da-del-save" style="width:100%;justify-content:center"><i class="fas fa-trash"></i> Elimina salvataggio</button>
    </div>` : ''}`;
  document.getElementById('da-del-save')?.addEventListener('click', () => { closeDrawer(); deleteSave(s.user_id, s.username); });
  openDrawer();
}

function deleteSave(userId, username) {
  showConfirm(`Elimina save di "${username}"`, "Il salvataggio verrà eliminato permanentemente.", async () => {
    try {
      await Api.admin.deleteSave(userId);
      saves = saves.filter(s => s.user_id !== userId);
      renderSaves();
      loadStats();
      showToast('Salvataggio eliminato', 'ok');
    } catch(e) { showToast(e.message, 'err'); }
  });
}

function globalSearch(q) {
  if (!q) return;
  q = q.toLowerCase();
  const matchSub  = submissions.find(s => (s.payload?.name || s.payload?.title || '').toLowerCase().includes(q) || s.username?.toLowerCase().includes(q));
  const matchUser = users.find(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  if (matchSub) {
    navTo('submissions');
    setTimeout(() => openSubmissionDrawer(matchSub), 100);
  } else if (matchUser) {
    navTo('users');
    setTimeout(() => { userSearch = q; renderUsers(); openUserDrawer(matchUser); }, 100);
  } else {
    showToast('Nessun risultato trovato', 'info');
  }
}

function openDrawer()  { document.getElementById('adm-drawer-overlay').style.display = 'block'; document.body.style.overflow = 'hidden'; }
function closeDrawer() { document.getElementById('adm-drawer-overlay').style.display = 'none';  document.body.style.overflow = ''; }

let confirmCallback = null;
function showConfirm(title, msg, cb) {
  document.getElementById('adm-confirm-title').textContent = title;
  document.getElementById('adm-confirm-msg').textContent   = msg;
  confirmCallback = cb;
  document.getElementById('adm-confirm-overlay').style.display = 'flex';
}
function closeConfirm() {
  document.getElementById('adm-confirm-overlay').style.display = 'none';
  confirmCallback = null;
}

let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('adm-toast');
  el.textContent = msg;
  el.className   = 'adm-toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function navTo(section) {
  document.querySelectorAll('.adm-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === section));
  document.querySelectorAll('.adm-section').forEach(s => s.classList.toggle('active', s.id === `section-${section}`));
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function statusLabel(s) {
  return s === 'pending' ? 'In attesa' : s === 'approved' ? 'Approvata' : 'Rifiutata';
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmt(n) {
  if (n == null) return '—';
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return Math.floor(num).toString();
}
function fmtTime(sec) {
  if (!sec) return '—';
  const s = Math.floor(parseFloat(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function setRefreshSpinner(on) {
  document.getElementById('adm-refresh-btn')?.classList.toggle('spinning', on);
}

document.addEventListener('DOMContentLoaded', () => {
  const tryInit = () => {
    if (typeof Auth === 'undefined' || typeof Api === 'undefined') { setTimeout(tryInit, 50); return; }
    checkAccess();
    document.addEventListener('authChange', checkAccess);

    document.getElementById('adm-refresh-btn')?.addEventListener('click', loadAll);

    document.querySelectorAll('.adm-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => navTo(btn.dataset.section));
    });
    document.querySelectorAll('.adm-stat-card[data-goto]').forEach(card => {
      card.addEventListener('click', () => navTo(card.dataset.goto));
    });

    let userSearchTimer, saveSearchTimer;
    document.getElementById('user-search')?.addEventListener('input', e => {
      clearTimeout(userSearchTimer);
      userSearchTimer = setTimeout(() => { userSearch = e.target.value; renderUsers(); }, 200);
    });
    document.getElementById('save-search')?.addEventListener('input', e => {
      clearTimeout(saveSearchTimer);
      saveSearchTimer = setTimeout(() => { saveSearch = e.target.value; renderSaves(); }, 200);
    });
    document.getElementById('adm-global-search')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') globalSearch(e.target.value.trim());
    });

    document.getElementById('repo-sync-btn')?.addEventListener('click', doRepoSync);
    document.getElementById('repo-auto-sync')?.addEventListener('change', async (e) => {
      try {
        await Api.admin.setReposAutoSync(e.target.checked);
        showToast(e.target.checked ? 'Sync automatica attiva' : 'Sync automatica disattivata', 'success');
      } catch {
        e.target.checked = !e.target.checked;
        showToast('Errore nel salvataggio', 'error');
      }
    });

    document.getElementById('adm-drawer-backdrop')?.addEventListener('click', closeDrawer);
    document.getElementById('adm-drawer-close')?.addEventListener('click', closeDrawer);
    document.getElementById('adm-confirm-cancel')?.addEventListener('click', closeConfirm);
    document.getElementById('adm-confirm-ok')?.addEventListener('click', () => {
      const cb = confirmCallback; closeConfirm(); cb?.();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeDrawer(); closeConfirm(); }
    });
  };
  tryInit();
});
