async function loadNavbar() {
  try {
    const response = await fetch('./components/navbar/nav.html');
    if (!response.ok) throw new Error('Errore nel caricamento navbar');
    const navbarHTML = await response.text();
    document.getElementById('navbar-placeholder').innerHTML = navbarHTML;

    initLangSelector();
    initMobileMenu();
    initMirage();
    initNavLiveBadge();
    initSettingsPanel();
    initTheme();
    _updateNavHeight();

    const ro = new ResizeObserver(_updateNavHeight);
    const nav = document.querySelector('.navbar');
    if (nav) ro.observe(nav);

    document.dispatchEvent(new Event('navbarLoaded'));

  } catch (error) {
    console.error('Errore navbar:', error);
  }
}

function _updateNavHeight() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  const h = nav.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--nav-h', h + 'px');
}

const languages = [
  { value: 'it', flag: 'https://flagcdn.com/w20/it.png', flag2x: 'https://flagcdn.com/w40/it.png', code: 'IT', label: 'Italiano' },
  { value: 'en', flag: 'https://flagcdn.com/w20/gb.png', flag2x: 'https://flagcdn.com/w40/gb.png', code: 'EN', label: 'English'  },
  { value: 'ro', flag: 'https://flagcdn.com/w20/ro.png', flag2x: 'https://flagcdn.com/w40/ro.png', code: 'RO', label: 'Română'   },
];

function initLangSelector() {
  buildLangMenus();
  setupMobileLangMenu();
  updateSettingsLangUI(currentLang);

  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('nav-settings-wrapper');
    if (wrapper && !wrapper.contains(e.target)) closeSettingsPanel();
  });
}

function buildLangMenus() {
  const row = document.getElementById('settings-lang-row');
  if (row) {
    languages.forEach(lang => {
      const btn = document.createElement('button');
      btn.className = 'settings-lang-btn';
      btn.dataset.value = lang.value;
      btn.innerHTML = `<img src="${lang.flag}" srcset="${lang.flag2x} 2x" alt="${lang.label}" class="flag-img"> <span>${lang.label}</span>`;
      btn.addEventListener('click', () => setLang(lang.value));
      row.appendChild(btn);
    });
  }

  const menuMobile = document.getElementById('lang-menu-mobile');
  if (menuMobile) {
    languages.forEach(lang => {
      const li = document.createElement('li');
      li.className = 'lang-option lang-option-mobile';
      li.dataset.value = lang.value;
      li.role = 'option';
      li.innerHTML = `<img src="${lang.flag}" srcset="${lang.flag2x} 2x" alt="${lang.label}" class="flag-img"> <span>${lang.label}</span>`;
      menuMobile.appendChild(li);
    });
  }
}

function setupMobileLangMenu() {
  const menu = document.getElementById('lang-menu-mobile');
  if (!menu) return;
  menu.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => setLang(opt.dataset.value));
  });
}

function setLang(val) {
  currentLang = val;
  localStorage.setItem('language', val);
  updateSettingsLangUI(val);
  loadTranslations(val);
  if (typeof unlockAchievement === 'function') unlockAchievement('changed_language');
}

function updateSettingsLangUI(lang) {
  document.querySelectorAll('.settings-lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === lang);
  });
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.value === lang);
  });
}

function initSettingsPanel() {
  const btn   = document.getElementById('nav-settings-btn');
  const panel = document.getElementById('settings-panel');
  if (!btn || !panel) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = panel.classList.contains('open');
    open ? closeSettingsPanel() : openSettingsPanel();
  });

  panel.addEventListener('click', (e) => e.stopPropagation());

  document.getElementById('open-achievements-btn')?.addEventListener('click', () => {
    closeSettingsPanel();
    if (typeof openAchievementPopup === 'function') openAchievementPopup();
  });

  document.getElementById('mobile-open-achievements-btn')?.addEventListener('click', () => {
    document.getElementById('hamburger-btn')?.classList.remove('active');
    document.getElementById('mobile-menu')?.classList.remove('active');
    if (typeof openAchievementPopup === 'function') openAchievementPopup();
  });
}

function initTheme() {
  const saved = localStorage.getItem('glaciopia_theme') || 'dark';
  applyTheme(saved, false);

  document.getElementById('theme-btn-dark')?.addEventListener('click', () => applyTheme('dark', true));
  document.getElementById('theme-btn-light')?.addEventListener('click', () => applyTheme('light', true));
}

function applyTheme(theme, save) {
  document.documentElement.setAttribute('data-theme', theme);
  if (save) localStorage.setItem('glaciopia_theme', theme);

  document.getElementById('theme-btn-dark')?.classList.toggle('active', theme === 'dark');
  document.getElementById('theme-btn-light')?.classList.toggle('active', theme === 'light');

  if (save && theme === 'light') {
    if (typeof unlockAchievement === 'function') unlockAchievement('whiteTheme');
  }
}

function openSettingsPanel() {
  const btn   = document.getElementById('nav-settings-btn');
  const panel = document.getElementById('settings-panel');
  btn?.classList.add('open');
  panel?.classList.add('open');
}

function closeSettingsPanel() {
  document.getElementById('nav-settings-btn')?.classList.remove('open');
  document.getElementById('settings-panel')?.classList.remove('open');
}

function initMirage() {
  const logo = document.querySelector('.logo-link');
  if (!logo) return;

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
  if (typeof unlockAchievement === 'function') unlockAchievement('mirage');

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

  const depth = (window.location.pathname.match(/\//g) || []).length - 1;
  const base  = depth > 0 ? '../'.repeat(depth) : './';

  try {
    const res = await fetch(`${base}assets/data/api_cache.json`);
    if (!res.ok) return;
    const data = await res.json();
    const isLive = data?.twitch?.isLive;

    const t = window._translations || {};
    const ach = t.ach || {};
    if (isLive) {
      btn.href = 'https://twitch.tv/glacioborealevt';
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.classList.add('is-live');
      text.textContent = ach.liveOnline || 'Glacio è in LIVE!';
    } else {
      btn.href = `${base}socials.html`;
      btn.target = '';
      text.textContent = ach.liveOffline || 'Glacio è Offline';
    }
  } catch(e) {
  }
}

function initMobileMenu() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu   = document.getElementById('mobile-menu');
  if (!hamburgerBtn || !mobileMenu) return;

  hamburgerBtn.addEventListener('click', () => {
    hamburgerBtn.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    closeSettingsPanel();
  });

  mobileMenu.querySelectorAll('.mm-page-btn').forEach(link => {
    link.addEventListener('click', () => {
      hamburgerBtn.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });

  _initMobileLangDropdown();
  _initMobileTheme();
  _initMobileAuth();

  document.getElementById('mobile-open-achievements-btn')?.addEventListener('click', () => {
    hamburgerBtn.classList.remove('active');
    mobileMenu.classList.remove('active');
    if (typeof openAchievementPopup === 'function') openAchievementPopup();
  });

  document.addEventListener('click', e => {
    const wrap = document.getElementById('mm-lang-wrap');
    if (wrap && !wrap.contains(e.target)) wrap.classList.remove('open');
  });
}

function _initMobileLangDropdown() {
  const trigger  = document.getElementById('mm-lang-trigger');
  const wrap     = document.getElementById('mm-lang-wrap');
  const dropdown = document.getElementById('mm-lang-dropdown');
  if (!trigger || !dropdown) return;

  languages.forEach(lang => {
    const opt = document.createElement('div');
    opt.className = 'mm-lang-option';
    opt.dataset.value = lang.value;
    opt.innerHTML = `<img src="${lang.flag}" srcset="${lang.flag2x} 2x" alt="${lang.label}" class="flag-img"> <span>${lang.label}</span>`;
    opt.addEventListener('click', () => {
      setLang(lang.value);
      _updateMobileLangTrigger(lang.value);
      wrap.classList.remove('open');
    });
    dropdown.appendChild(opt);
  });

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    wrap.classList.toggle('open');
  });

  _updateMobileLangTrigger(currentLang);
}

function _updateMobileLangTrigger(val) {
  const lang = languages.find(l => l.value === val);
  if (!lang) return;
  const flag  = document.getElementById('mm-lang-flag');
  const label = document.getElementById('mm-lang-label');
  if (flag)  { flag.src = lang.flag; flag.srcset = lang.flag2x + ' 2x'; flag.alt = lang.label; }
  if (label) label.textContent = lang.code;
  document.querySelectorAll('.mm-lang-option').forEach(o => o.classList.toggle('active', o.dataset.value === val));
}

function _initMobileTheme() {
  const saved = localStorage.getItem('glaciopia_theme') || 'dark';
  _syncMobileTheme(saved);
  document.getElementById('mm-theme-dark')?.addEventListener('click',  () => { applyTheme('dark',  true); _syncMobileTheme('dark');  });
  document.getElementById('mm-theme-light')?.addEventListener('click', () => { applyTheme('light', true); _syncMobileTheme('light'); });
}

function _syncMobileTheme(theme) {
  document.getElementById('mm-theme-dark')?.classList.toggle('active',  theme === 'dark');
  document.getElementById('mm-theme-light')?.classList.toggle('active', theme === 'light');
}

function _initMobileAuth() {
  const btn    = document.getElementById('mm-auth-btn');
  const avatar = document.getElementById('mm-auth-avatar');
  const label  = document.getElementById('mm-auth-label');
  if (!btn) return;
  btn.addEventListener('click', () => {
    document.getElementById('hamburger-btn')?.classList.remove('active');
    document.getElementById('mobile-menu')?.classList.remove('active');
    if (typeof Auth !== 'undefined') {
      if (Auth.isLoggedIn()) Auth.buildProfileModal?.() || Auth.openAuthModal?.();
      else Auth.openAuthModal();
    }
  });
  document.addEventListener('navbarLoaded', () => _syncMobileAuthBtn());
  document.addEventListener('authChange',   () => _syncMobileAuthBtn());
}

function _syncMobileAuthBtn() {
  const btn    = document.getElementById('mm-auth-btn');
  const avatar = document.getElementById('mm-auth-avatar');
  const label  = document.getElementById('mm-auth-label');
  if (!btn) return;
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    const user = Auth.getUser();
    if (avatar) avatar.textContent = user?.username?.charAt(0).toUpperCase() || '';
    if (label)  label.textContent  = user?.username || 'Profilo';
    btn.classList.add('logged-in');
  } else {
    if (avatar) avatar.textContent = '';
    if (label)  label.textContent  = 'Login';
    btn.classList.remove('logged-in');
  }
}
