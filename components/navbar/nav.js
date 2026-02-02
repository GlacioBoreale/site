// Funzione per caricare la navbar
async function loadNavbar() {
  const response = await fetch('/components/navbar/nav.html');
  const navbarHTML = await response.text();
  document.getElementById('navbar-placeholder').innerHTML = navbarHTML;
  
  // Inizializza il selettore lingua dopo aver caricato la navbar
  initLangSelector();
}

function initLangSelector() {
  const selector = document.getElementById('lang-selector');
  if (selector) {
    selector.value = currentLang;
    selector.addEventListener('change', (e) => {
      currentLang = e.target.value;
      localStorage.setItem('language', currentLang);
      loadTranslations(currentLang);
    });
  }
}