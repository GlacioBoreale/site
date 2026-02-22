let fanarts = [];
let activeTag = 'all';
let searchQuery = '';

const SOCIAL_ICONS = {
    twitch:     { icon: 'fa-brands fa-twitch',     label: 'Twitch' },
    twitter:    { icon: 'fa-brands fa-x-twitter',  label: 'Twitter / X' },
    instagram:  { icon: 'fa-brands fa-instagram',  label: 'Instagram' },
    youtube:    { icon: 'fa-brands fa-youtube',    label: 'YouTube' },
    deviantart: { icon: 'fa-brands fa-deviantart', label: 'DeviantArt' },
    artstation: { icon: 'fa-brands fa-artstation', label: 'ArtStation' },
    pixiv:      { icon: 'fa-solid fa-p',           label: 'Pixiv' },
    bluesky:    { icon: 'fa-brands fa-bluesky',    label: 'Bluesky' },
    tiktok:     { icon: 'fa-brands fa-tiktok',     label: 'TikTok' },
    website:    { icon: 'fa-solid fa-globe',       label: 'Sito web' },
};

async function loadFanarts() {
    try {
        const response = await fetch('./assets/data/fanarts.json');
        if (!response.ok) throw new Error('Errore caricamento fanart');
        const data = await response.json();
        fanarts = data.fanarts;
        buildTagFilters();
        renderFanarts();
    } catch (error) {
        console.error('Errore fanart:', error);
        document.getElementById('fanart-grid').innerHTML =
            '<p style="color:rgba(255,255,255,0.5);text-align:center;padding:4rem;">Nessuna fanart disponibile al momento.</p>';
    }
}

function buildTagFilters() {
    const allTags = new Set();
    fanarts.forEach(f => (f.tags || []).forEach(t => allTags.add(t)));

    const container = document.getElementById('tags-filter');
    allTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.dataset.tag = tag;
        btn.textContent = tag;
        btn.addEventListener('click', () => selectTag(tag, btn));
        container.appendChild(btn);
    });
}

function selectTag(tag, btn) {
    activeTag = tag;
    document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderFanarts();
}

function getFilteredFanarts() {
    return fanarts.filter(f => {
        const matchTag = activeTag === 'all' || (f.tags || []).includes(activeTag);
        const q = searchQuery.toLowerCase().trim();
        const matchSearch = !q
            || f.title.toLowerCase().includes(q)
            || f.artist.toLowerCase().includes(q)
            || (f.tags || []).some(t => t.toLowerCase().includes(q));
        return matchTag && matchSearch;
    });
}

function renderFanarts() {
    const grid = document.getElementById('fanart-grid');
    const noResults = document.getElementById('no-results');
    const countEl = document.getElementById('results-count');

    const filtered = getFilteredFanarts();
    grid.innerHTML = '';

    if (filtered.length === 0) {
        noResults.style.display = 'block';
        countEl.textContent = '';
        return;
    }

    noResults.style.display = 'none';
    countEl.textContent = `${filtered.length} fanart`;

    filtered.forEach((fanart, i) => {
        const card = createCard(fanart, i);
        grid.appendChild(card);
    });
}

function createCard(fanart, index) {
    const card = document.createElement('div');
    card.className = 'fanart-card';

    const tagsHTML = (fanart.tags || []).slice(0, 3)
        .map(t => `<span class="card-tag">${t}</span>`).join('');

    card.innerHTML = `
        <img src="${fanart.image}" alt="${fanart.title}" loading="lazy"
             onerror="this.src='assets/images/vtubers/placeholder.png'">
        <div class="card-overlay">
            <div class="card-title">${fanart.title}</div>
            <div class="card-artist"><i class="fas fa-palette"></i>${fanart.artist}</div>
            <div class="card-tags">${tagsHTML}</div>
        </div>
    `;

    card.addEventListener('click', () => openPopup(fanart));
    return card;
}

function openPopup(fanart) {
    document.getElementById('popup-img').src = fanart.image;
    document.getElementById('popup-img').alt = fanart.title;
    document.getElementById('popup-title').textContent = fanart.title;
    document.getElementById('popup-artist-name').textContent = fanart.artist;
    document.getElementById('popup-desc').textContent = fanart.description || '';
    document.getElementById('popup-date').textContent = fanart.date || '';

    const tagsContainer = document.getElementById('popup-tags');
    tagsContainer.innerHTML = (fanart.tags || [])
        .map(t => `<span class="popup-tag" data-tag="${t}">${t}</span>`)
        .join('');

    tagsContainer.querySelectorAll('.popup-tag').forEach(el => {
        el.addEventListener('click', () => {
            closePopup();
            const existing = document.querySelector(`.tag-btn[data-tag="${el.dataset.tag}"]`);
            if (existing) {
                selectTag(el.dataset.tag, existing);
            } else {
                activeTag = el.dataset.tag;
                renderFanarts();
            }
        });
    });

    const socialsContainer = document.getElementById('popup-socials');
    const links = fanart.socials || {};
    const keys = Object.keys(links).filter(k => links[k]);

    socialsContainer.innerHTML = '';
    if (keys.length > 0) {
        const titleEl = document.createElement('div');
        titleEl.className = 'popup-socials-title';
        titleEl.textContent = 'Contatta l\'artista';
        socialsContainer.appendChild(titleEl);

        keys.forEach(platform => {
            const meta = SOCIAL_ICONS[platform] || { icon: 'fa-solid fa-link', label: platform };
            const a = document.createElement('a');
            a.href = links[platform];
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = `social-link-item ${platform}`;
            a.innerHTML = `<i class="${meta.icon}"></i> ${meta.label}`;
            socialsContainer.appendChild(a);
        });
    }

    document.getElementById('fanart-popup').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePopup() {
    document.getElementById('fanart-popup').classList.remove('active');
    document.body.style.overflow = '';
}

window.addEventListener('languageChanged', renderFanarts);

document.addEventListener('DOMContentLoaded', () => {
    loadFanarts();

    document.getElementById('search-input').addEventListener('input', e => {
        searchQuery = e.target.value;
        renderFanarts();
    });

    const allBtn = document.querySelector('.tag-btn[data-tag="all"]');
    if (allBtn) allBtn.addEventListener('click', () => selectTag('all', allBtn));

    document.getElementById('popup-close').addEventListener('click', closePopup);
    document.getElementById('popup-overlay').addEventListener('click', closePopup);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.getElementById('fanart-popup').classList.contains('active')) {
            closePopup();
        }
    });
});
