// Funzione per caricare la navbar
async function loadNavbar() {
  try {
    console.log('Caricamento navbar...');
    const response = await fetch('./components/navbar/nav.html');
    if (!response.ok) throw new Error('Errore nel caricamento navbar');
    const navbarHTML = await response.text();
    document.getElementById('navbar-placeholder').innerHTML = navbarHTML;
    console.log('Navbar caricata!');
    
    initLangSelector();
    initMobileMenu(); // AGGIORNATO
    
  } catch (error) {
    console.error('Errore navbar:', error);
  }
}

function initLangSelector() {
  // Selettore Desktop
  const selectorDesktop = document.getElementById('lang-selector');
  // Selettore Mobile
  const selectorMobile = document.getElementById('lang-selector-mobile');
  
  if (selectorDesktop) {
    selectorDesktop.value = currentLang;
    selectorDesktop.addEventListener('change', (e) => {
      currentLang = e.target.value;
      localStorage.setItem('language', currentLang);
      
      // Sincronizza con mobile
      if (selectorMobile) selectorMobile.value = currentLang;
      
      loadTranslations(currentLang);
    });
  }
  
  if (selectorMobile) {
    selectorMobile.value = currentLang;
    selectorMobile.addEventListener('change', (e) => {
      currentLang = e.target.value;
      localStorage.setItem('language', currentLang);
      
      // Sincronizza con desktop
      if (selectorDesktop) selectorDesktop.value = currentLang;
      
      loadTranslations(currentLang);
    });
  }
  
  console.log('Selettore lingua inizializzato');
}

// Gestisce il menu mobile
function initMobileMenu() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
      hamburgerBtn.classList.toggle('active');
      mobileMenu.classList.toggle('active');
    });
    
    // Chiudi il menu quando si clicca su un link
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburgerBtn.classList.remove('active');
        mobileMenu.classList.remove('active');
      });
    });
    
    console.log('Menu mobile inizializzato');
  }
}