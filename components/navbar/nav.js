async function loadNavbar() {
  try {
    console.log('Caricamento navbar...');
    const response = await fetch('./components/navbar/nav.html');
    if (!response.ok) throw new Error('Errore nel caricamento navbar');
    const navbarHTML = await response.text();
    document.getElementById('navbar-placeholder').innerHTML = navbarHTML;
    console.log('Navbar caricata!');
    
    initLangSelector();
    initMobileMenu();
    initMirage();
    initNavLiveBadge();
    
  } catch (error) {
    console.error('Errore navbar:', error);
  }
}

// ── UNICA FONTE DI VERITÀ ─────────────────────────
// Per aggiungere una lingua: aggiungi un oggetto qui.
const languages = [
  { value: 'it', flag: 'https://flagcdn.com/w20/it.png', flag2x: 'https://flagcdn.com/w40/it.png', code: 'IT', label: 'Italiano' },
  { value: 'en', flag: 'https://flagcdn.com/w20/gb.png', flag2x: 'https://flagcdn.com/w40/gb.png', code: 'EN', label: 'English'  },
  { value: 'ro', flag: 'https://flagcdn.com/w20/ro.png', flag2x: 'https://flagcdn.com/w40/ro.png', code: 'RO', label: 'Română'   },
];

function initLangSelector() {
  buildMenus();
  setupDesktopDropdown();
  setupMobileMenu();
  updateDropdownUI(currentLang);

  // chiudi desktop cliccando fuori
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('lang-dropdown-desktop');
    if (dd && !dd.contains(e.target)) closeDesktop();
  });
}

function buildMenus() {
  const menuDesktop = document.getElementById('lang-menu-desktop');
  const menuMobile  = document.getElementById('lang-menu-mobile');

  languages.forEach(lang => {
    if (menuDesktop) {
      const li = document.createElement('li');
      li.className = 'lang-option';
      li.dataset.value = lang.value;
      li.role = 'option';
      li.innerHTML = `<img src="${lang.flag}" srcset="${lang.flag2x} 2x" alt="${lang.label}" class="flag-img"> <span>${lang.code}</span>`;
      menuDesktop.appendChild(li);
    }
    if (menuMobile) {
      const li = document.createElement('li');
      li.className = 'lang-option lang-option-mobile';
      li.dataset.value = lang.value;
      li.role = 'option';
      li.innerHTML = `<img src="${lang.flag}" srcset="${lang.flag2x} 2x" alt="${lang.label}" class="flag-img"> <span>${lang.label}</span>`;
      menuMobile.appendChild(li);
    }
  });
}

function setupDesktopDropdown() {
  const btn  = document.getElementById('lang-btn-desktop');
  const menu = document.getElementById('lang-menu-desktop');
  if (!btn || !menu) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.contains('open') ? closeDesktop() : openDesktop();
  });

  menu.addEventListener('click', (e) => e.stopPropagation());

  menu.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => setLang(opt.dataset.value, true));
  });
}

function setupMobileMenu() {
  const menu = document.getElementById('lang-menu-mobile');
  if (!menu) return;
  menu.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => setLang(opt.dataset.value, false));
  });
}

function setLang(val, closeMenu) {
  currentLang = val;
  localStorage.setItem('language', val);
  updateDropdownUI(val);
  if (closeMenu) closeDesktop();
  loadTranslations(val);
}

function openDesktop() {
  document.getElementById('lang-btn-desktop')?.classList.add('open');
  document.getElementById('lang-menu-desktop')?.classList.add('open');
}

function closeDesktop() {
  document.getElementById('lang-btn-desktop')?.classList.remove('open');
  document.getElementById('lang-menu-desktop')?.classList.remove('open');
}

function updateDropdownUI(lang) {
  const meta = languages.find(l => l.value === lang);
  if (!meta) return;

  const flagD = document.getElementById('lang-flag-desktop');
  const codeD = document.getElementById('lang-code-desktop');
  if (flagD) flagD.innerHTML = `<img src="${meta.flag}" srcset="${meta.flag2x} 2x" alt="${meta.label}" class="flag-img">`;
  if (codeD) codeD.textContent = meta.code;

  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.value === lang);
  });
}

function initMirage() {
  const logo = document.querySelector('.logo-link');
  if (!logo) return;

  // Crea l'overlay miraggio nel body se non esiste
  if (!document.getElementById('mirage-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'mirage-overlay';
    overlay.innerHTML = `<img src="assets/images/mirage.png" alt="mirage" id="mirage-img">`;
    document.body.appendChild(overlay);
  }

  let clickCount = 0;
  let clickTimer = null;

  logo.addEventListener('click', (e) => {
    e.preventDefault();
    clickCount++;

    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 800);

    if (clickCount >= 5) {
      clickCount = 0;
      clearTimeout(clickTimer);
      showMirage();
    }
  });
}

function showMirage() {
  const overlay = document.getElementById('mirage-overlay');
  if (!overlay || overlay.classList.contains('active')) return;

  overlay.classList.add('active');

  // Dissolvi dopo 2.8s
  setTimeout(() => {
    overlay.classList.add('dissolve');
    setTimeout(() => {
      overlay.classList.remove('active', 'dissolve');
    }, 1400);
  }, 2800);
}

async function initNavLiveBadge() {
  const btn  = document.getElementById('nav-live-btn');
  const text = document.getElementById('nav-live-text');
  if (!btn || !text) return;

  // Determina il path base (funziona sia in root che in sottocartelle)
  const depth = (window.location.pathname.match(/\//g) || []).length - 1;
  const base  = depth > 0 ? '../'.repeat(depth) : './';

  try {
    const res = await fetch(`${base}assets/data/api_cache.json`);
    if (!res.ok) return;
    const data = await res.json();
    const isLive = data?.twitch?.isLive;

    if (isLive) {
      btn.href = 'https://twitch.tv/glacioborealevt';
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.classList.add('is-live');
      text.textContent = 'Glacio è in LIVE!';
    } else {
      btn.href = `${base}socials.html`;
      btn.target = '';
      text.textContent = 'Glacio è Offline';
    }
  } catch(e) {
    // la navbar funziona lo stesso senza cache
  }
}

function initMobileMenu() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
      const opening = !mobileMenu.classList.contains('active');
      hamburgerBtn.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      // chiudi il dropdown lingua quando si chiude il menu
      if (!opening) closeDropdown('mobile');
    });
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburgerBtn.classList.remove('active');
        mobileMenu.classList.remove('active');
      });
    });
  }
}