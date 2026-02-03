async function loadNavbar() {
  try {
    console.log('Caricamento navbar...');
    const response = await fetch('./components/navbar/nav.html');
    if (!response.ok) throw new Error('Errore nel caricamento navbar');
    const navbarHTML = await response.text();
    document.getElementById('navbar-placeholder').innerHTML = navbarHTML;
    console.log('Navbar caricata!');
    
    initLangSelector();
  } catch (error) {
    console.error('Errore navbar:', error);
  }
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
    console.log('Selettore lingua inizializzato');
  } else {
    console.error('Selettore lingua non trovato!');
  }
}