let currentLang = localStorage.getItem('language') || 'it';
let translations = {};

// Carica le traduzioni
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

// Aggiorna tutti i testi nella pagina
function updatePage() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = getNestedTranslation(key);
    if (translation) {
      element.textContent = translation;
    }
  });
  
  // Aggiorna il tag <title>
  const titleElement = document.querySelector('title[data-i18n]');
  if (titleElement) {
    const key = titleElement.getAttribute('data-i18n');
    const translation = getNestedTranslation(key);
    if (translation) document.title = translation;
  }
  
  document.documentElement.lang = currentLang;
}

// Naviga nelle chiavi nidificate
function getNestedTranslation(key) {
  return key.split('.').reduce((obj, k) => obj?.[k], translations);
}

// Inizializza tutto quando il DOM è pronto
async function init() {
  console.log('Inizializzazione...');
  await loadNavbar();
  await loadTranslations(currentLang);
  console.log('Inizializzazione completata');
}

// Aspetta che il DOM sia caricato
window.addEventListener('DOMContentLoaded', init);