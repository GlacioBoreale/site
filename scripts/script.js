(function() {
  const saved = localStorage.getItem('glaciopia_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

const IMG_CDN = 'https://glaciopia-images.s3.eu-north-1.amazonaws.com';
const AUDIO_CDN = 'https://glaciopia-images.s3.eu-north-1.amazonaws.com';

let currentLang  = localStorage.getItem('language') || 'it';
let translations = {};

async function loadTranslations(lang) {
  try {
    const res = await fetch(`./language/${lang}.json`);
    if (!res.ok) throw new Error();
    translations = await res.json();
    applyTranslations();
  } catch (e) {
    console.error('Errore caricamento traduzioni:', e);
  }
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.documentElement.setAttribute('translate', 'no');

  let noTranslate = document.querySelector('meta[name="google"]');
  if (!noTranslate) {
    noTranslate = document.createElement('meta');
    noTranslate.name    = 'google';
    noTranslate.content = 'notranslate';
    document.head.appendChild(noTranslate);
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = getNestedTranslation(el.getAttribute('data-i18n'));
    if (val) el.textContent = val;
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const val = getNestedTranslation(el.getAttribute('data-i18n-html'));
    if (val) el.innerHTML = val;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const val = getNestedTranslation(el.getAttribute('data-i18n-placeholder'));
    if (val) el.placeholder = val;
  });

  const titleEl = document.querySelector('title[data-i18n]');
  if (titleEl) {
    const val = getNestedTranslation(titleEl.getAttribute('data-i18n'));
    if (val) document.title = val;
  }

  window.dispatchEvent(new Event('languageChanged'));
}

function getNestedTranslation(key) {
  return key.split('.').reduce((obj, k) => obj?.[k], translations);
}

function initKonami() {
  const sequence = [
    'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
    'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
    'b','a'
  ];
  let pos = 0;
  document.addEventListener('keydown', (e) => {
    if (e.key === sequence[pos]) {
      pos++;
      if (pos === sequence.length) {
        pos = 0;
        if (typeof unlockAchievement === 'function') unlockAchievement('konami');
      }
    } else {
      pos = e.key === sequence[0] ? 1 : 0;
    }
  });
}

async function startApp() {
  await loadNavbar();
  if (typeof loadFooter === 'function') await loadFooter();
  await loadTranslations(currentLang);
  if (typeof initAchievements === 'function') initAchievements();
  initKonami();
}

window.addEventListener('DOMContentLoaded', startApp);
