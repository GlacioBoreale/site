let fanarts = [];
let currentFilter = 'all';
let currentSearch = '';
let suggestionIndex = -1;

const EMAIL_ADDRESS = 'Glacioborealebusiness@outlook.com';
const EMAIL_SUBJECT = 'Fanart - Submission';

function getEmailBody() {
    const t = (key) => getNestedTranslation(key) || '';
    return `Hi Glacio!

I would like to submit my fanart.

Title: [Your title here]
Artist name / username: [Your name here]
Tags: [e.g. digital, traditional, meme, other]

[Please attach your image to this email. Max 2.5 MB]

---
Sent via glacioboreale.github.io/site/fanart.html`;
}

async function loadFanartData() {
    try {
        const response = await fetch('./assets/data/fanarts.json');
        if (!response.ok) throw new Error('No fanart data');
        const data = await response.json();
        fanarts = data.fanarts || [];
    } catch {
        fanarts = [];
    }
    renderFanarts();
}

function getFilteredFanarts() {
    return fanarts.filter(f => {
        const title = (getNestedTranslation(f.titleKey) || f.titleKey || '').toLowerCase();
        const artist = (f.artist || '').toLowerCase();
        const query = currentSearch.toLowerCase();
        const matchSearch = !query || title.includes(query) || artist.includes(query);
        const matchFilter = currentFilter === 'all' || (f.tags && f.tags.includes(currentFilter));
        return matchSearch && matchFilter;
    });
}

function renderFanarts() {
    const grid = document.getElementById('fanart-grid');
    const noResults = document.getElementById('no-results');
    const filtered = getFilteredFanarts();

    grid.innerHTML = '';

    if (filtered.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    noResults.style.display = 'none';

    filtered.forEach(f => {
        const card = createFanartCard(f);
        grid.appendChild(card);
    });
}

function createFanartCard(f) {
    const card = document.createElement('div');
    card.className = 'fanart-card';

    const title = getNestedTranslation(f.titleKey) || f.titleKey || '';
    const byText = getNestedTranslation('fanart.by') || 'di';
    const tags = f.tags || [];

    card.innerHTML = `
        <div class="fanart-card-img-wrapper">
            <img src="${f.image}" alt="${title}" loading="lazy" onerror="this.src='assets/images/vtubers/placeholder.png'">
            <div class="fanart-card-overlay"><i class="fas fa-expand"></i></div>
        </div>
        <div class="fanart-card-info">
            <div class="fanart-card-title">${title}</div>
            <div class="fanart-card-artist">${byText} ${f.artist}</div>
            <div class="fanart-card-tags">
                ${tags.map(t => `<span class="tag-badge">${t}</span>`).join('')}
            </div>
        </div>
    `;

    card.addEventListener('click', () => openLightbox(f));
    return card;
}

function openLightbox(f) {
    const title = getNestedTranslation(f.titleKey) || f.titleKey || '';
    const byText = getNestedTranslation('fanart.by') || 'di';
    const tags = f.tags || [];

    const popupImg = document.getElementById('fanart-popup-img');
    popupImg.onerror = function() { this.src = 'assets/images/vtubers/placeholder.png'; this.onerror = null; };
    popupImg.src = f.image;
    popupImg.alt = title;
    document.getElementById('fanart-popup-title').textContent = title;
    document.getElementById('fanart-popup-artist').textContent = `${byText} ${f.artist}`;

    const tagsEl = document.getElementById('fanart-popup-tags');
    tagsEl.innerHTML = tags.map(t => `<span class="tag-badge">${t}</span>`).join('');

    document.getElementById('fanart-popup').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('fanart-popup').classList.remove('active');
    document.body.style.overflow = '';
}

function openSubmitModal() {
    updateEmailLink();
    document.getElementById('submit-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSubmitModal() {
    document.getElementById('submit-modal').classList.remove('active');
    document.body.style.overflow = '';
}

function updateEmailLink() {
    const body = encodeURIComponent(getEmailBody());
    const subject = encodeURIComponent(EMAIL_SUBJECT);
    const link = document.getElementById('submit-email-link');
    if (link) {
        link.href = `mailto:${EMAIL_ADDRESS}?subject=${subject}&body=${body}`;
    }
}

function buildSuggestions(query) {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase();
    const results = [];
    const seen = new Set();

    fanarts.forEach(f => {
        const title = getNestedTranslation(f.titleKey) || f.titleKey || '';
        const artist = f.artist || '';

        if (title.toLowerCase().includes(q) && !seen.has('t:' + title)) {
            seen.add('t:' + title);
            results.push({ type: 'title', text: title, icon: 'fa-image' });
        }
        if (artist.toLowerCase().includes(q) && !seen.has('a:' + artist)) {
            seen.add('a:' + artist);
            results.push({ type: 'artist', text: artist, icon: 'fa-user' });
        }
    });

    return results.slice(0, 6);
}

function highlightMatch(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        text.slice(0, idx) +
        `<span class="suggestion-match">${text.slice(idx, idx + query.length)}</span>` +
        text.slice(idx + query.length)
    );
}

function showSuggestions(suggestions) {
    const box = document.getElementById('search-suggestions');
    suggestionIndex = -1;

    if (!suggestions.length) {
        box.innerHTML = '';
        box.classList.remove('visible');
        return;
    }

    box.innerHTML = suggestions.map((s, i) =>
        `<div class="suggestion-item" data-index="${i}" data-text="${s.text}">
            <i class="fas ${s.icon}"></i>
            <span>${highlightMatch(s.text, currentSearch)}</span>
        </div>`
    ).join('');

    box.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const input = document.getElementById('fanart-search');
            input.value = el.dataset.text;
            currentSearch = el.dataset.text;
            box.classList.remove('visible');
            renderFanarts();
        });
    });

    box.classList.add('visible');
}

function hideSuggestions() {
    const box = document.getElementById('search-suggestions');
    box.classList.remove('visible');
    suggestionIndex = -1;
}

function initFilterDropdown() {
    const btn = document.getElementById('filter-toggle-btn');
    const dropdown = document.getElementById('filter-dropdown');
    const label = document.getElementById('filter-label');

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        dropdown.classList.toggle('open', !isOpen);
        btn.classList.toggle('open', !isOpen);
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('open');
        btn.classList.remove('open');
    });

    dropdown.addEventListener('click', (e) => e.stopPropagation());

    dropdown.querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', () => {
            dropdown.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            currentFilter = opt.dataset.filter;
            label.textContent = opt.textContent;
            dropdown.classList.remove('open');
            btn.classList.remove('open');
            renderFanarts();
        });
    });
}

function initSearchKeyboard() {
    const input = document.getElementById('fanart-search');
    const box = document.getElementById('search-suggestions');

    input.addEventListener('keydown', (e) => {
        const items = box.querySelectorAll('.suggestion-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1);
            items.forEach((el, i) => el.classList.toggle('highlighted', i === suggestionIndex));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            suggestionIndex = Math.max(suggestionIndex - 1, -1);
            items.forEach((el, i) => el.classList.toggle('highlighted', i === suggestionIndex));
        } else if (e.key === 'Enter') {
            if (suggestionIndex >= 0 && items[suggestionIndex]) {
                input.value = items[suggestionIndex].dataset.text;
                currentSearch = input.value;
                hideSuggestions();
                renderFanarts();
            }
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });
}

window.addEventListener('languageChanged', () => {
    renderFanarts();
    updateEmailLink();

    const activeOpt = document.querySelector('.filter-option.active');
    const label = document.getElementById('filter-label');
    if (activeOpt && label) {
        label.textContent = activeOpt.textContent;
    }

    const input = document.getElementById('fanart-search');
    if (input) {
        input.placeholder = getNestedTranslation('fanart.searchPlaceholder') || '';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadFanartData();
    initFilterDropdown();
    initSearchKeyboard();

    const searchInput = document.getElementById('fanart-search');
    searchInput.addEventListener('input', () => {
        currentSearch = searchInput.value;
        renderFanarts();
        const sugg = buildSuggestions(currentSearch);
        showSuggestions(sugg);
    });

    searchInput.addEventListener('focus', () => {
        if (currentSearch) showSuggestions(buildSuggestions(currentSearch));
    });

    searchInput.addEventListener('blur', () => {
        setTimeout(hideSuggestions, 150);
    });

    document.getElementById('submit-fanart-btn').addEventListener('click', openSubmitModal);
    document.getElementById('submit-modal-overlay').addEventListener('click', closeSubmitModal);
    document.getElementById('submit-modal-close').addEventListener('click', closeSubmitModal);
    document.getElementById('submit-close-btn').addEventListener('click', closeSubmitModal);

    document.getElementById('fanart-popup-close').addEventListener('click', closeLightbox);
    document.getElementById('fanart-popup-overlay').addEventListener('click', closeLightbox);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLightbox();
            closeSubmitModal();
        }
    });
});