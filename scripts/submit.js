'use strict';

const ABOUT_MAX_BYTES = 2 * 1024 * 1024;
let aboutSelectedFile = null;

const SOCIAL_ICONS = {
  twitch:    'fa-brands fa-twitch',
  youtube:   'fa-brands fa-youtube',
  twitter:   'fa-brands fa-x-twitter',
  x:         'fa-brands fa-x-twitter',
  instagram: 'fa-brands fa-instagram',
  tiktok:    'fa-brands fa-tiktok',
  discord:   'fa-brands fa-discord',
  github:    'fa-brands fa-github',
  bluesky:   'fa-brands fa-bluesky',
};

function _socialIcon(url) {
  const u = url.toLowerCase();
  for (const [k, v] of Object.entries(SOCIAL_ICONS)) {
    if (u.includes(k)) return v;
  }
  return 'fa-solid fa-globe';
}

async function loadTeamMembers() {
  const grid = document.getElementById('team-grid');
  if (!grid) return;

  grid.querySelector('.team-card--placeholder')?.remove();

  try {
    const data = await Api.team.get();
    const members = data.members || [];
    members.forEach((m, i) => {
      grid.appendChild(_buildTeamCard(m, grid.children.length + i));
    });
  } catch(e) {
    console.warn('Team dal DB non disponibile:', e.message);
  }

  const placeholder = document.createElement('div');
  placeholder.className = 'team-card team-card--placeholder stagger-item';
  placeholder.innerHTML = `
    <div class="team-avatar team-avatar--empty"><i class="fas fa-question"></i></div>
    <div class="team-info">
      <h3 class="team-name" data-i18n="about.members.placeholder.name">???</h3>
      <span class="team-role" data-i18n="about.members.placeholder.role">???</span>
      <p class="team-desc" data-i18n="about.members.placeholder.desc">Il prossimo potresti essere tu! Manda una candidatura per far parte del team.</p>
    </div>`;
  grid.appendChild(placeholder);
  setTimeout(() => placeholder.classList.add('visible'), grid.children.length * 100);
}

function _buildTeamCard(m, index) {
  const card = document.createElement('div');
  card.className = 'team-card stagger-item';

  let socialLinks = [];
  if (m.socials) {
    if (typeof m.socials === 'string') {
      socialLinks = m.socials.split(',').map(s => s.trim()).filter(Boolean);
    } else if (typeof m.socials === 'object') {
      socialLinks = Object.values(m.socials).filter(Boolean);
    }
  }

  const linksHtml = socialLinks.map(url =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer" class="team-link">
      <i class="${_socialIcon(url)}"></i>
    </a>`
  ).join('');

  card.innerHTML = `
    <div class="team-avatar">
      <img src="${m.avatar || ''}" alt="${m.name}"
        onerror="this.closest('.team-avatar').innerHTML='<i class=\\"fas fa-user\\"></i>'">
    </div>
    <div class="team-info">
      <h3 class="team-name">${m.name}</h3>
      <span class="team-role">${m.role}</span>
      <p class="team-desc">${m.desc}</p>
      ${linksHtml ? `<div class="team-links">${linksHtml}</div>` : ''}
    </div>`;

  const img = card.querySelector('img');
  const reveal = () => setTimeout(() => card.classList.add('visible'), index * 100);
  if (!img || img.complete) reveal();
  else {
    img.addEventListener('load',  reveal, { once: true });
    img.addEventListener('error', reveal, { once: true });
  }

  return card;
}

function _submitSetState(btn, msgEl, state, text) {
  btn.disabled = state === 'loading';
  const span = btn.querySelector('span');
  if (span && state === 'loading') span.textContent = text || 'Caricamento...';
  if (msgEl) {
    msgEl.textContent = state !== 'loading' ? (text || '') : '';
    msgEl.className = 'sf-feedback' + (state === 'success' ? ' success' : state === 'error' ? ' error' : '');
  }
}

function _clearFeedback(msgEl) {
  if (!msgEl) return;
  msgEl.textContent = '';
  msgEl.className = 'sf-feedback';
}

function initAboutSubmit() {
  const openBtn   = document.getElementById('about-open-form-btn');
  const modal     = document.getElementById('about-modal');
  const content   = modal?.querySelector('.popup-content');
  const closeBtn  = document.getElementById('about-modal-close');
  const closeBtn2 = document.getElementById('about-modal-close-btn');
  const submitBtn = document.getElementById('about-submit-btn');
  const msg       = document.getElementById('about-submit-msg');

  if (!openBtn || !modal) return;

  const descEl  = document.getElementById('about-desc');
  const descCnt = document.getElementById('about-desc-count');
  const expEl   = document.getElementById('about-experience');
  const expCnt  = document.getElementById('about-exp-count');
  if (descEl && descCnt) descEl.addEventListener('input', () => { descCnt.textContent = descEl.value.length; });
  if (expEl  && expCnt)  expEl.addEventListener('input',  () => { expCnt.textContent  = expEl.value.length; });

  const zone      = document.getElementById('about-dropzone');
  const input     = document.getElementById('about-image-file');
  const pickBtn   = document.getElementById('about-pick-btn');
  const removeBtn = document.getElementById('about-remove-btn');

  if (zone) {
    pickBtn?.addEventListener('click', () => input.click());
    input?.addEventListener('change', () => { if (input.files[0]) _aboutSetFile(input.files[0], msg); });
    removeBtn?.addEventListener('click', (e) => { e.stopPropagation(); _aboutResetFile(); });
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) _aboutSetFile(e.dataTransfer.files[0], msg);
    });
  }

  function openModal() {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    _clearFeedback(msg);
  }

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  closeBtn2?.addEventListener('click', closeModal);
  modal.addEventListener('click', closeModal);
  content?.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  submitBtn?.addEventListener('click', async () => {
    _clearFeedback(msg);

    const displayName = document.getElementById('about-display-name')?.value.trim();
    const role        = document.getElementById('about-role')?.value.trim();
    const desc        = document.getElementById('about-desc')?.value.trim();
    const socials     = document.getElementById('about-socials')?.value.trim();
    const experience  = document.getElementById('about-experience')?.value.trim();
    const contact     = document.getElementById('about-contact')?.value.trim();

    if (!displayName || !role || !desc || !experience || !contact) {
      _submitSetState(submitBtn, msg, 'error', 'Compila tutti i campi obbligatori (*).');
      return;
    }
    if (!aboutSelectedFile) {
      _submitSetState(submitBtn, msg, 'error', "L'immagine profilo è obbligatoria.");
      return;
    }
    if (!Auth || !Auth.isLoggedIn()) {
      _submitSetState(submitBtn, msg, 'error', 'Devi essere loggato per inviare una candidatura.');
      return;
    }

    _submitSetState(submitBtn, msg, 'loading', 'Caricamento immagine...');
    try {
      const avatarUrl = await Api.upload.file(aboutSelectedFile, 'team');

      const span = submitBtn.querySelector('span');
      if (span) span.textContent = 'Invio in corso...';

      await Api.submit.post('team', {
        name:       displayName,
        role,
        desc,
        socials,
        experience,
        contact,
        avatar_url: avatarUrl,
      }, avatarUrl);

      _submitSetState(submitBtn, msg, 'success', 'Candidatura inviata! Ti risponderemo presto.');
      const span2 = submitBtn.querySelector('span');
      if (span2) span2.textContent = 'Invia candidatura';

      ['about-display-name','about-role','about-desc','about-socials','about-experience','about-contact'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      if (descCnt) descCnt.textContent = '0';
      if (expCnt)  expCnt.textContent  = '0';
      _aboutResetFile();
    } catch (e) {
      _submitSetState(submitBtn, msg, 'error', e.message || "Errore durante l'invio.");
      const span = submitBtn.querySelector('span');
      if (span) span.textContent = 'Invia candidatura';
    }
  });
}

function _aboutSetFile(file, msgEl) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    if (msgEl) { msgEl.textContent = 'Usa JPG, PNG o WEBP.'; msgEl.className = 'sf-feedback error'; }
    return;
  }
  if (file.size > ABOUT_MAX_BYTES) {
    if (msgEl) { msgEl.textContent = `L'immagine supera i 2 MB (${(file.size/1024/1024).toFixed(1)} MB).`; msgEl.className = 'sf-feedback error'; }
    return;
  }
  aboutSelectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img   = document.getElementById('about-preview-img');
    const fname = document.getElementById('about-filename');
    const prev  = document.getElementById('about-preview');
    const inner = document.getElementById('about-dropzone-inner');
    if (img)   img.src = e.target.result;
    if (fname) fname.textContent = file.name;
    if (prev)  prev.style.display  = 'flex';
    if (inner) inner.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function _aboutResetFile() {
  aboutSelectedFile = null;
  const input = document.getElementById('about-image-file');
  const img   = document.getElementById('about-preview-img');
  const prev  = document.getElementById('about-preview');
  const inner = document.getElementById('about-dropzone-inner');
  if (input) input.value = '';
  if (img)   img.src = '';
  if (prev)  prev.style.display  = 'none';
  if (inner) inner.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  initAboutSubmit();
  loadTeamMembers();
});
