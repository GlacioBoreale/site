'use strict';

// ══════════════════════════════════════════════════════════════
//  SUBMIT — gestione form per about, vtpedia, fanart
// ══════════════════════════════════════════════════════════════

function _submitSetState(btn, msgEl, state, text) {
  btn.disabled  = state === 'loading';
  btn.classList.remove('loading', 'success', 'error');
  if (state) btn.classList.add(state);
  if (msgEl) { msgEl.textContent = text || ''; msgEl.className = 'submit-msg' + (state ? ' ' + state : ''); }
}

// ── ABOUT — candidatura team ───────────────────────────────────
function initAboutSubmit() {
  const btn   = document.getElementById('about-submit-btn');
  const msg   = document.getElementById('about-submit-msg');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const name  = document.getElementById('about-name')?.value.trim();
    const role  = document.getElementById('about-role')?.value.trim();
    const desc  = document.getElementById('about-desc')?.value.trim();
    const email = document.getElementById('about-email')?.value.trim();

    if (!name || !role || !desc || !email) {
      _submitSetState(btn, msg, 'error', 'Compila tutti i campi.');
      return;
    }

    _submitSetState(btn, msg, 'loading', 'Invio in corso...');
    try {
      await Api.submit.post('team', { name, role, desc, email });
      _submitSetState(btn, msg, 'success', 'Candidatura inviata! Ti risponderemo presto.');
      ['about-name','about-role','about-desc','about-email'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    } catch (e) {
      _submitSetState(btn, msg, 'error', e.message || 'Errore durante l\'invio.');
    }
  });
}

// ── VTPEDIA — invio richiesta VTuber ──────────────────────────
function initVtpediaSubmit() {
  const btn = document.getElementById('vt-submit-btn');
  const msg = document.getElementById('vt-submit-msg');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const name    = document.getElementById('vt-name')?.value.trim();
    const channel = document.getElementById('vt-channel')?.value.trim();
    const hashtag = document.getElementById('vt-hashtag')?.value.trim();
    const debut   = document.getElementById('vt-debut')?.value.trim();
    const desc    = document.getElementById('vt-desc')?.value.trim();
    const sponsor = document.getElementById('vt-sponsor')?.value.trim();

    if (!name || !channel || !desc || !sponsor) {
      _submitSetState(btn, msg, 'error', 'Compila i campi obbligatori (*).');
      return;
    }

    _submitSetState(btn, msg, 'loading', 'Invio in corso...');
    try {
      await Api.submit.post('vtuber', { name, channel, hashtag, debut, desc, sponsor });
      _submitSetState(btn, msg, 'success', 'Richiesta inviata! La esamineremo presto.');
      ['vt-name','vt-channel','vt-hashtag','vt-debut','vt-desc','vt-sponsor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    } catch (e) {
      _submitSetState(btn, msg, 'error', e.message || 'Errore durante l\'invio.');
    }
  });
}

// ── FANART — invio fanart con upload immagine ─────────────────
function initFanartSubmit() {
  const btn      = document.getElementById('fanart-submit-btn-send');
  const msg      = document.getElementById('fanart-submit-msg');
  const fileInput= document.getElementById('fanart-file');
  const preview  = document.getElementById('fanart-preview');
  if (!btn) return;

  const uploadArea = document.getElementById('fanart-upload-area');

  if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) { const dt = new DataTransfer(); dt.items.add(file); fileInput.files = dt.files; fileInput.dispatchEvent(new Event('change')); }
    });
  }

  if (fileInput && preview) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) { preview.style.display = 'none'; return; }
      const url = URL.createObjectURL(file);
      preview.src = url;
      preview.style.display = 'block';
    });
  }

  btn.addEventListener('click', async () => {
    const title   = document.getElementById('fanart-title')?.value.trim();
    const artist  = document.getElementById('fanart-artist')?.value.trim();
    const socials = document.getElementById('fanart-socials')?.value.trim();
    const tags    = document.getElementById('fanart-tags')?.value.trim();
    const file    = fileInput?.files[0];

    if (!title || !artist || !file) {
      _submitSetState(btn, msg, 'error', 'Titolo, artista e immagine sono obbligatori.');
      return;
    }

    const maxMb = 2.5;
    if (file.size > maxMb * 1024 * 1024) {
      _submitSetState(btn, msg, 'error', `L'immagine supera i ${maxMb}MB.`);
      return;
    }

    const allowed = ['image/jpeg','image/png','image/gif','image/webp'];
    if (!allowed.includes(file.type)) {
      _submitSetState(btn, msg, 'error', 'Formato non supportato. Usa JPG, PNG, GIF o WEBP.');
      return;
    }

    _submitSetState(btn, msg, 'loading', 'Upload immagine...');
    try {
      const imageUrl = await Api.upload.file(file, 'fanart');
      _submitSetState(btn, msg, 'loading', 'Invio dati...');
      await Api.submit.post('fanart', { title, artist, socials, tags }, imageUrl);
      _submitSetState(btn, msg, 'success', 'Fanart inviata! Grazie mille ❤️');
      ['fanart-title','fanart-artist','fanart-socials','fanart-tags'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      if (fileInput) fileInput.value = '';
      if (preview)   { preview.src = ''; preview.style.display = 'none'; }
    } catch (e) {
      _submitSetState(btn, msg, 'error', e.message || 'Errore durante l\'invio.');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAboutSubmit();
  initVtpediaSubmit();
  initFanartSubmit();
});
