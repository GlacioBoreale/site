let currentLang = localStorage.getItem('language') || 'it';
let translations = {};

async function loadTranslations(lang) {
  try {
    const response = await fetch(`./language/${lang}.json`);
    if (!response.ok) throw new Error('Errore nel caricamento traduzioni');
    translations = await response.json();
    updatePage();
  } catch (error) {
    console.error('Errore traduzioni:', error);
  }
}

function updatePage() {
  document.documentElement.lang = currentLang;
  document.documentElement.setAttribute('translate', 'no');
  let noTranslateMeta = document.querySelector('meta[name="google"]');
  if (!noTranslateMeta) {
    noTranslateMeta = document.createElement('meta');
    noTranslateMeta.name = 'google';
    noTranslateMeta.content = 'notranslate';
    document.head.appendChild(noTranslateMeta);
  }

  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = getNestedTranslation(key);
    if (translation) element.textContent = translation;
  });

  const titleElement = document.querySelector('title[data-i18n]');
  if (titleElement) {
    const key = titleElement.getAttribute('data-i18n');
    const translation = getNestedTranslation(key);
    if (translation) document.title = translation;
  }

  window.dispatchEvent(new Event('languageChanged'));
}

function getNestedTranslation(key) {
  return key.split('.').reduce((obj, k) => obj?.[k], translations);
}

function initKonamiCode() {
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

async function init() {
  await loadNavbar();
  await loadFooter();
  await loadTranslations(currentLang);
  if (typeof initAchievements === 'function') initAchievements();
  initKonamiCode();
}

window.addEventListener('DOMContentLoaded', init);