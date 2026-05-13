'use strict';

const ABOUT_MAX_BYTES = 2 * 1024 * 1024;
let aboutSelectedFile = null;

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
  const content   = modal?.querySelector('.submit-modal-content');
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

  // click sul modal (area fuori dal content) chiude — stesso pattern vtpedia
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
      });

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
});
