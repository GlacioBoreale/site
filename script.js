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
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = getNestedTranslation(key);
    if (translation) {
      element.textContent = translation;
    }
  });
  
  const titleElement = document.querySelector('title[data-i18n]');
  if (titleElement) {
    const key = titleElement.getAttribute('data-i18n');
    const translation = getNestedTranslation(key);
    if (translation) document.title = translation;
  }
  document.documentElement.lang = currentLang;
  window.dispatchEvent(new Event('languageChanged'));
}

function getNestedTranslation(key) {
  return key.split('.').reduce((obj, k) => obj?.[k], translations);
}

async function init() {
  console.log('Inizializzazione...');
  await loadNavbar();
  await loadFooter();
  await loadTranslations(currentLang);
  console.log('Inizializzazione completata');
}

window.addEventListener('DOMContentLoaded', init);