const ACHIEVEMENTS = [
  {
    id: 'first_visit',
    icon: '🌟',
    name: 'Nuovi Orizzonti',
    desc: 'Hai visitato Glaciopia per la prima volta. Benvenuto!',
    hint: 'Visita il sito per la prima volta. Anche se si sblocca da subito...',
    secret: false,
    category: 'esplora',
  },
  {
    id: 'visited_vtpedia',
    icon: '📖',
    name: 'Vtuber-o-mania',
    desc: 'Hai esplorato la VTPedia.',
    hint: 'Vtuber di qui, vtuber di là, VTUBER OVUNQUE!',
    secret: false,
    category: 'esplora',
  },
  {
    id: 'visited_fanart',
    icon: '🎨',
    name: 'Appassionato d\'Arte',
    desc: 'Hai dato un\'occhiata alla galleria delle fanart.',
    hint: 'Che bei disegni di Glacio.',
    secret: false,
    category: 'esplora',
  },
  {
    id: 'visited_socials',
    icon: '📡',
    name: 'Up to date',
    desc: 'Hai controllato dove trovare Glacio online.',
    hint: 'Quali erano i social di Glacio?',
    secret: false,
    category: 'esplora',
  },
  {
    id: 'visited_about',
    icon: '👥',
    name: 'Incontra il nostro team!',
    desc: 'Hai scoperto chi c\'è dietro a Glaciopia.',
    hint: 'Non sai "Chi siamo"?',
    secret: false,
    category: 'esplora',
  },
  {
    id: 'changed_language',
    icon: '🌐',
    name: 'Poliglotta',
    desc: 'Hai cambiato la lingua del sito.',
    hint: 'Im the cool guy, I speak molte lingue :D',
    secret: false,
    category: 'varie',
  },
  {
    id: 'whiteTheme',
    icon: '💥',
    name: 'THINK FAST CHUCKLENUTS!',
    desc: 'Sei stato flashbangato dal sito, haha.',
    hint: '*throwing flashbang*',
    secret: false,
    category: 'varie',
  },
  {
    id: 'opened_achievements',
    icon: '🏅',
    name: 'Curiosone',
    desc: 'Hai aperto il pannello achievement. Complimenti per l\'ovvio.',
    hint: 'Apri il pannello achievement. Anche se non vedrete mai questo indizio :P',
    secret: false,
    category: 'varie',
  },
  {
    id: 'all_pages',
    icon: '🗺️',
    name: 'È l\'ora dell\'avventura!',
    desc: 'Hai visitato tutte le sezioni del sito.',
    hint: 'Hai visto tutto quello che c\'è da vedere?',
    secret: false,
    category: 'esplora',
  },
  {
    id: 'fourofour',
    icon: '🕵️',
    name: 'Not Found',
    desc: 'Hai trovato la pagina che non esiste, la 404.',
    hint: 'Come ci siamo arrivati?',
    secret: true,
    category: 'esplora',
  },
  {
    id: 'mirage',
    icon: '👀',
    name: 'WHAT WAS THAT?!',
    desc: 'È Apparso, come un miraggio, per poi scomparire nel nulla.',
    hint: 'C\'è qualcosa di strano nel logo...',
    secret: true,
    category: 'segreto',
  },
  {
    id: 'coin_flip',
    icon: '🪙',
    name: 'Testa o Croce?',
    desc: 'Hai trovato la moneta nascosta nella pagina 404.',
    hint: 'Ho smarrito la mia moneta in una pagina persa nel tempo... forse quattro lettere bastano?',
    secret: true,
    category: 'segreto',
  },
  {
    id: 'rome',
    icon: '🏛️',
    name: 'Tutte le strade portano a Roma',
    desc: 'Hai riottenuto la prima faccia della moneta.',
    hint: 'Hai già trovato la moneta... ma qual\'era la faccia giusta?',
    secret: true,
    category: 'segreto',
  },
  {
    id: 'eromo',
    icon: '👨',
    name: 'Eromo? Che ci fai qui?',
    desc: 'Trova Eromo lanciando la moneta.',
    hint: 'Chi è questo bellissimo rumeno sulla mia moneta in rame?',
    secret: true,
    category: 'segreto',
  },
  {
    id: 'konami',
    icon: '🎮',
    name: 'Gamer di Vecchia Scuola',
    desc: 'Hai capito dove va messo il leggendario codice.',
    hint: 'Su, su, giù, giù... ricorda qualcosa?',
    secret: true,
    category: 'segreto',
  },
  {
    id: 'all_achievements',
    icon: '🏆',
    name: 'Cacciatore di Trofei',
    desc: 'Hai ottenuto tutti gli achievement! Complimenti, mio prode platinatore!',
    hint: 'Ottieni tutti gli altri achievement.',
    secret: false,
    category: 'varie',
  },
];


// ---- Inizio vero codice ----------------------------------------------
const STORAGE_KEY = 'glaciopia_achievements';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const migrated = {};
      parsed.forEach(id => { migrated[id] = Date.now(); });
      saveData(migrated);
      return migrated;
    }
    return parsed;
  } catch {
    return {};
  }
}

function saveData(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

function loadUnlocked() {
  return Object.keys(loadData());
}

function unlockAchievement(id) {
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return;

  const data = loadData();
  if (data[id]) return;

  data[id] = Date.now();
  saveData(data);

  queueToast(ach);
  updateAchievementCounter();

  if (id !== 'all_achievements') {
    const others = ACHIEVEMENTS.filter(a => a.id !== 'all_achievements');
    const fresh  = loadData();
    if (others.every(a => !!fresh[a.id])) {
      setTimeout(() => unlockAchievement('all_achievements'), 400);
    }
  }
}

function isUnlocked(id) {
  return !!loadData()[id];
}

function getUnlockDate(id) {
  const ts = loadData()[id];
  if (!ts) return null;
  return new Date(ts);
}

function formatDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

const TOAST_DURATION  = 3500;
const TOAST_HEIGHT    = 78;
const TOAST_GAP       = 10;
const TOAST_CONTAINER = 'ach-toast-container';

function getOrCreateContainer() {
  let c = document.getElementById(TOAST_CONTAINER);
  if (!c) {
    c = document.createElement('div');
    c.id = TOAST_CONTAINER;
    document.body.appendChild(c);
  }
  return c;
}

function queueToast(ach) {
  const container = getOrCreateContainer();
  const existing = container.querySelectorAll('.ach-toast-item');
  existing.forEach((el, i) => {
    const currentBottom = parseInt(el.style.bottom) || 0;
    el.style.bottom = (currentBottom + TOAST_HEIGHT + TOAST_GAP) + 'px';
  });
  const item = document.createElement('div');
  item.className = 'ach-toast-item';
  item.style.bottom = '0px';
  item.innerHTML = `
    <div class="ach-toast-inner">
      <span class="ach-toast-icon">${ach.icon}</span>
      <div class="ach-toast-text">
        <span class="ach-toast-label">Achievement sbloccato!</span>
        <span class="ach-toast-name">${ach.name}</span>
      </div>
    </div>
  `;
  container.appendChild(item);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => item.classList.add('ach-toast-show'));
  });

  setTimeout(() => {
    item.classList.add('ach-toast-hide');
    item.addEventListener('transitionend', () => item.remove(), { once: true });
  }, TOAST_DURATION);
}

function buildAchievementPopup() {
  if (document.getElementById('achievement-popup')) return;

  const popup = document.createElement('div');
  popup.id = 'achievement-popup';
  popup.innerHTML = `
    <div class="ach-popup-overlay" id="ach-popup-overlay"></div>
    <div class="ach-popup-panel">
      <div class="ach-popup-header">
        <div class="ach-popup-header-left">
          <i class="fas fa-trophy"></i>
          <div>
            <h2>Achievement</h2>
            <p class="ach-popup-progress-text" id="ach-progress-text">0 / ${ACHIEVEMENTS.length} sbloccati</p>
          </div>
        </div>
        <button class="ach-popup-close" id="ach-popup-close" aria-label="Chiudi">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <div class="ach-popup-progress-bar-wrap">
        <div class="ach-popup-progress-bar" id="ach-progress-bar"></div>
      </div>

      <div class="ach-popup-filters" id="ach-filters">
        <button class="ach-filter-btn active" data-cat="all">Tutti</button>
        <button class="ach-filter-btn" data-cat="esplora">Esplorazione</button>
        <button class="ach-filter-btn" data-cat="segreto">Segreti</button>
        <button class="ach-filter-btn" data-cat="varie">Varie</button>
      </div>

      <div class="ach-popup-grid" id="ach-popup-grid"></div>
    </div>
  `;

  document.body.appendChild(popup);

  document.getElementById('ach-popup-close').addEventListener('click', closeAchievementPopup);
  document.getElementById('ach-popup-overlay').addEventListener('click', closeAchievementPopup);

  document.querySelectorAll('.ach-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ach-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAchievementGrid(btn.dataset.cat);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAchievementPopup();
  });
}

function renderAchievementGrid(filterCat = 'all') {
  const grid = document.getElementById('ach-popup-grid');
  if (!grid) return;

  const data = loadData();
  const list = filterCat === 'all'
    ? [...ACHIEVEMENTS]
    : ACHIEVEMENTS.filter(a => a.category === filterCat);

  list.sort((a, b) => {
    const ta = data[a.id] || 0;
    const tb = data[b.id] || 0;
    if ((ta > 0) !== (tb > 0)) return ta > 0 ? -1 : 1;
    if (ta && tb) return tb - ta;
    return 0;
  });

  grid.innerHTML = '';

  list.forEach(ach => {
    const done = !!data[ach.id];
    const date = done ? formatDate(new Date(data[ach.id])) : null;
    const card = document.createElement('div');
    card.className = `ach-card ${done ? 'ach-card--unlocked' : 'ach-card--locked'}`;

    if (ach.secret && !done) {
      card.innerHTML = `
        <div class="ach-card-icon ach-card-icon--secret">?</div>
        <div class="ach-card-body">
          <p class="ach-card-name">???</p>
          <p class="ach-card-desc">${ach.hint}</p>
        </div>
        <div class="ach-card-badge ach-card-badge--locked"><i class="fas fa-lock"></i></div>
      `;
    } else {
      card.innerHTML = `
        <div class="ach-card-icon">${ach.icon}</div>
        <div class="ach-card-body">
          <p class="ach-card-name">${ach.name}</p>
          <p class="ach-card-desc">${done ? ach.desc : ach.hint}</p>
          ${done ? `<p class="ach-card-date"><i class="fas fa-calendar-check"></i> ${date}</p>` : ''}
        </div>
        <div class="ach-card-badge ${done ? 'ach-card-badge--unlocked' : 'ach-card-badge--locked'}">
          ${done ? '<i class="fas fa-check"></i>' : '<i class="fas fa-lock"></i>'}
        </div>
      `;
    }
    grid.appendChild(card);
  });
}

function updateAchievementPopupProgress() {
  const data = loadData();
  const count = Object.keys(data).length;
  const total = ACHIEVEMENTS.length;
  const pct = total ? (count / total) * 100 : 0;

  const txt = document.getElementById('ach-progress-text');
  const bar = document.getElementById('ach-progress-bar');
  if (txt) txt.textContent = `${count} / ${total} sbloccati`;
  if (bar) bar.style.width = `${pct}%`;
}

function openAchievementPopup() {
  buildAchievementPopup();
  updateAchievementPopupProgress();
  renderAchievementGrid('all');

  const popup = document.getElementById('achievement-popup');
  popup.classList.add('active');
  document.body.style.overflow = 'hidden';

  document.querySelectorAll('.ach-filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.ach-filter-btn[data-cat="all"]')?.classList.add('active');

  unlockAchievement('opened_achievements');
}

function closeAchievementPopup() {
  const popup = document.getElementById('achievement-popup');
  if (popup) popup.classList.remove('active');
  document.body.style.overflow = '';
}

function updateAchievementCounter() {
  const count = Object.keys(loadData()).length;
  const total = ACHIEVEMENTS.length;
  const text  = `${count}/${total}`;
  const el1 = document.getElementById('ach-nav-count');
  const el2 = document.getElementById('mobile-ach-count');
  if (el1) el1.textContent = text;
  if (el2) el2.textContent = text;
}

function initAchievements() {
  unlockAchievement('first_visit');
  updateAchievementCounter();

  const path = window.location.pathname;
  if (path.includes('vtpedia'))  unlockAchievement('visited_vtpedia');
  if (path.includes('fanart'))   unlockAchievement('visited_fanart');
  if (path.includes('socials'))  unlockAchievement('visited_socials');
  if (path.includes('about'))    unlockAchievement('visited_about');
  if (path.includes('404'))      unlockAchievement('fourofour');

  const explorePages = ['visited_vtpedia', 'visited_fanart', 'visited_socials', 'visited_about', 'fourofour'];
  if (explorePages.every(p => isUnlocked(p))) unlockAchievement('all_pages');

  document.getElementById('open-achievements-btn')?.addEventListener('click', () => {
    closeSettingsPanel();
    openAchievementPopup();
  });
}
