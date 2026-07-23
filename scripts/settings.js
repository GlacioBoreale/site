'use strict';

const REDUCE_MOTION_KEY = 'glaciopia_reduce_motion';

function isReduceMotion() {
  return localStorage.getItem(REDUCE_MOTION_KEY) === '1';
}

function applyReduceMotion(on) {
  document.documentElement.classList.toggle('reduce-motion', on);
}

function st(key, fallback) {
  if (typeof getNestedTranslation === 'function') {
    return getNestedTranslation(key) || fallback;
  }
  return fallback;
}

function buildSettingsPopup() {
  if (document.getElementById('settings-popup')) return;

  const popup = document.createElement('div');
  popup.id = 'settings-popup';
  popup.innerHTML = `
    <div class="settings-popup-overlay" id="settings-popup-overlay"></div>
    <div class="settings-popup-panel">
      <div class="settings-popup-header">
        <h2><i class="fas fa-gear"></i> <span data-i18n="settings.title">Impostazioni</span></h2>
        <button class="settings-popup-close" id="settings-popup-close" aria-label="Chiudi">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <div class="settings-popup-body">
        <div class="set-section">
          <p class="set-section-title" data-i18n="settings.language">Lingua</p>
          <div class="set-lang-grid" id="set-lang-grid"></div>
        </div>

        <div class="set-section">
          <p class="set-section-title" data-i18n="settings.theme">Tema</p>
          <div class="set-theme-row">
            <button class="set-theme-btn" data-theme="dark" id="set-theme-dark">
              <i class="fas fa-moon"></i> <span data-i18n="settings.dark">Scuro</span>
            </button>
            <button class="set-theme-btn" data-theme="light" id="set-theme-light">
              <i class="fas fa-sun"></i> <span data-i18n="settings.light">Chiaro</span>
            </button>
          </div>
        </div>

        <div class="set-section">
          <div class="set-toggle-row">
            <div class="set-toggle-text">
              <p class="set-toggle-label" data-i18n="settings.reduceMotion">Riduci animazioni</p>
              <p class="set-toggle-desc" data-i18n="settings.reduceMotionDesc">Disattiva animazioni e transizioni per un'esperienza più tranquilla.</p>
            </div>
            <button class="set-switch" id="set-reduce-motion" role="switch" aria-checked="false">
              <span class="set-switch-knob"></span>
            </button>
          </div>
        </div>

        <div class="set-section">
          <p class="set-section-title" data-i18n="settings.achievements">Achievement</p>
          <button class="set-ach-btn" id="set-open-achievements">
            <span class="set-ach-btn-left">
              <i class="fas fa-trophy"></i>
              <span data-i18n="settings.yourAchievements">I tuoi achievement</span>
            </span>
            <span class="set-ach-count" id="set-ach-count">0/0</span>
          </button>
        </div>

        <div class="set-section set-section-danger">
          <p class="set-section-title" data-i18n="settings.dataManagement">Gestione dati</p>
          <button class="set-reset-btn" id="set-reset-data">
            <i class="fas fa-trash-can"></i>
            <span data-i18n="settings.resetLocal">Reset dati locali</span>
          </button>
          <p class="set-reset-desc" data-i18n="settings.resetLocalDesc">Cancella preferenze, achievement e dati salvati su questo browser. Non tocca il tuo account.</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('settings-popup-close').addEventListener('click', closeSettingsPopup);
  document.getElementById('settings-popup-overlay').addEventListener('click', closeSettingsPopup);

  buildSettingsLang();
  buildSettingsThemeButtons();
  buildSettingsReduceMotion();
  bindSettingsAchievements();
  bindSettingsReset();
  syncSettingsUI();

  if (typeof applyTranslations === 'function') applyTranslations();
}

function buildSettingsLang() {
  const grid = document.getElementById('set-lang-grid');
  if (!grid || typeof languages === 'undefined') return;
  grid.innerHTML = '';
  languages.forEach(lang => {
    const btn = document.createElement('button');
    btn.className = 'set-lang-btn';
    btn.dataset.value = lang.value;
    btn.innerHTML = `<img src="${lang.flag}" srcset="${lang.flag2x} 2x" alt="${lang.label}" class="flag-img"> <span>${lang.label}</span>`;
    btn.addEventListener('click', () => {
      if (typeof setLang === 'function') setLang(lang.value);
      updateSettingsLangActive(lang.value);
    });
    grid.appendChild(btn);
  });
  updateSettingsLangActive(typeof currentLang !== 'undefined' ? currentLang : 'it');
}

function updateSettingsLangActive(val) {
  document.querySelectorAll('.set-lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.value === val);
  });
}

function buildSettingsThemeButtons() {
  const dark  = document.getElementById('set-theme-dark');
  const light = document.getElementById('set-theme-light');
  dark?.addEventListener('click',  (e) => { if (typeof applyTheme === 'function') applyTheme('dark', true, e);  syncSettingsTheme('dark'); });
  light?.addEventListener('click', (e) => { if (typeof applyTheme === 'function') applyTheme('light', true, e); syncSettingsTheme('light'); });
}

function syncSettingsTheme(theme) {
  document.getElementById('set-theme-dark')?.classList.toggle('active',  theme === 'dark');
  document.getElementById('set-theme-light')?.classList.toggle('active', theme === 'light');
}

function buildSettingsReduceMotion() {
  const sw = document.getElementById('set-reduce-motion');
  if (!sw) return;
  sw.addEventListener('click', () => {
    const next = !isReduceMotion();
    localStorage.setItem(REDUCE_MOTION_KEY, next ? '1' : '0');
    applyReduceMotion(next);
    syncReduceMotionSwitch();
  });
}

function syncReduceMotionSwitch() {
  const sw = document.getElementById('set-reduce-motion');
  if (!sw) return;
  const on = isReduceMotion();
  sw.classList.toggle('on', on);
  sw.setAttribute('aria-checked', on ? 'true' : 'false');
}

function bindSettingsAchievements() {
  document.getElementById('set-open-achievements')?.addEventListener('click', () => {
    closeSettingsPopup();
    if (typeof openAchievementPopup === 'function') openAchievementPopup();
  });
}

function bindSettingsReset() {
  const btn = document.getElementById('set-reset-data');
  if (!btn) return;

  let clicks = 0;
  let resetClickTimer = null;
  const needed = 5;

  const labelSpan = btn.querySelector('span');
  const baseLabel = st('settings.resetLocal', 'Reset dati locali');

  function restoreLabel() {
    clicks = 0;
    btn.classList.remove('arming');
    if (labelSpan) labelSpan.textContent = baseLabel;
  }

  btn.addEventListener('click', () => {
    clicks++;
    clearTimeout(resetClickTimer);

    if (clicks >= needed) {
      restoreLabel();
      doResetLocalData();
      return;
    }

    btn.classList.add('arming');
    const remaining = needed - clicks;
    const tmpl = st('settings.resetClicksLeft', 'Clicca ancora {n} volte');
    if (labelSpan) labelSpan.textContent = tmpl.replace('{n}', remaining);

    resetClickTimer = setTimeout(restoreLabel, 2000);
  });
}

function doResetLocalData() {
  const theme = localStorage.getItem('glaciopia_theme');
  const lang  = localStorage.getItem('language');
  const token = localStorage.getItem('glaciopia_token');
  const user  = localStorage.getItem('glaciopia_user');

  localStorage.clear();

  if (theme) localStorage.setItem('glaciopia_theme', theme);
  if (lang)  localStorage.setItem('language', lang);
  if (token) localStorage.setItem('glaciopia_token', token);
  if (user)  localStorage.setItem('glaciopia_user', user);

  location.reload();
}

function syncSettingsUI() {
  const theme = localStorage.getItem('glaciopia_theme') || 'dark';
  syncSettingsTheme(theme);
  syncReduceMotionSwitch();

  const achCount = document.getElementById('set-ach-count');
  if (achCount && typeof ACHIEVEMENTS !== 'undefined') {
    const unlocked = typeof loadData === 'function' ? Object.keys(loadData()).length : 0;
    achCount.textContent = `${unlocked}/${ACHIEVEMENTS.length}`;
  }
}

function openSettingsPopup() {
  buildSettingsPopup();
  syncSettingsUI();
  const popup = document.getElementById('settings-popup');
  popup.classList.add('open');
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
}

function closeSettingsPopup() {
  const popup = document.getElementById('settings-popup');
  if (popup) popup.classList.remove('open');
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSettingsPopup();
});

(function initReduceMotionEarly() {
  if (isReduceMotion()) applyReduceMotion(true);
})();
