let currentLang = localStorage.getItem('language') || 'it';
let translations = {};

// Carica le traduzioni
async function loadTranslations(lang) {
  const response = await fetch(`/locales/${lang}.json`);
  translations = await response.json();
  updatePage();
}

// Aggiorna tutti i testi nella pagina
function updatePage() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = getNestedTranslation(key);
    if (translation) {
      element.textContent = translation;
    }
  });
  
  // Aggiorna anche il tag <title>
  const titleElement = document.querySelector('title[data-i18n]');
  if (titleElement) {
    const key = titleElement.getAttribute('data-i18n');
    const translation = getNestedTranslation(key);
    if (translation) document.title = translation;
  }
  
  // Aggiorna l'attributo lang dell'HTML
  document.documentElement.lang = currentLang;
}

// Naviga nelle chiavi nidificate
function getNestedTranslation(key) {
  return key.split('.').reduce((obj, k) => obj?.[k], translations);
}

// Inizializza tutto quando il DOM è pronto
async function init() {
  await loadNavbar();
  await loadTranslations(currentLang);
}

// Aspetta che il DOM sia caricato
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}