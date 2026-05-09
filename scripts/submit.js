'use strict';

function _submitSetState(btn, msgEl, state, text) {
  btn.disabled = state === 'loading';
  btn.classList.remove('loading', 'success', 'error');
  if (state) btn.classList.add(state);
  if (msgEl) {
    msgEl.textContent = text || '';
    msgEl.className = 'sf-feedback' + (state === 'success' ? ' success' : state === 'error' ? ' error' : '');
  }
}

function _clearFeedback(msgEl) {
  if (!msgEl) return;
  msgEl.textContent = '';
  msgEl.className = 'sf-feedback';
}

function initAboutSubmit() {
  const openBtn  = document.getElementById('about-open-form-btn');
  const modal    = document.getElementById('about-modal');
  const overlay  = document.getElementById('about-modal-overlay');
  const closeBtn = document.getElementById('about-modal-close');
  const closeBtn2= document.getElementById('about-modal-close-btn');
  const submitBtn= document.getElementById('about-submit-btn');
  const msg      = document.getElementById('about-submit-msg');
  const expArea  = document.getElementById('about-experience');
  const expCount = document.getElementById('about-exp-count');

  if (!openBtn || !modal) return;

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
  overlay?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  expArea?.addEventListener('input', () => {
    if (expCount) expCount.textContent = expArea.value.length;
  });

  submitBtn?.addEventListener('click', async () => {
    _clearFeedback(msg);

    const name       = document.getElementById('about-name')?.value.trim();
    const email      = document.getElementById('about-email')?.value.trim();
    const contact    = document.getElementById('about-contact')?.value.trim();
    const role       = document.getElementById('about-role')?.value.trim();
    const experience = expArea?.value.trim();

    if (!name || !email || !contact || !role || !experience) {
      _submitSetState(submitBtn, msg, 'error', 'Compila tutti i campi obbligatori (*).');
      return;
    }

    if (!Auth || !Auth.isLoggedIn()) {
      _submitSetState(submitBtn, msg, 'error', 'Devi essere loggato per inviare una candidatura.');
      return;
    }

    _submitSetState(submitBtn, msg, 'loading', 'Invio in corso...');
    try {
      await Api.submit.post('team', { name, email, contact, role, experience });
      _submitSetState(submitBtn, msg, 'success', 'Candidatura inviata! Ti risponderemo presto.');
      ['about-name', 'about-email', 'about-contact', 'about-role', 'about-experience'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      if (expCount) expCount.textContent = '0';
    } catch (e) {
      _submitSetState(submitBtn, msg, 'error', e.message || 'Errore durante l\'invio.');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAboutSubmit();
});
