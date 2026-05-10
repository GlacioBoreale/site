let fanarts = [];
let approvedTags = [];
let currentFilter = 'all';
let currentSearch = '';
let suggestionIndex = -1;
let tagSuggestionIndex = -1;

const FA_MAX_BYTES = 15 * 1024 * 1024;
let faSelectedFile = null;

async function loadFanartData() {
    try {
        const data = await Api.fanarts.get();
        fanarts = data.fanarts || [];
    } catch {
        try {
            const response = await fetch('./assets/data/fanarts.json');
            if (!response.ok) throw new Error();
            const data = await response.json();
            fanarts = data.fanarts || [];
        } catch {
            fanarts = [];
        }
    }
    renderFanarts();
}

async function loadApprovedTags() {
    try {
        const data = await Api.tags.fanart();
        approvedTags = data.tags || ['untagged'];
    } catch {
        approvedTags = ['untagged'];
    }
    _buildFilterDropdown();
}

function _buildFilterDropdown() {
    const dropdown = document.getElementById('filter-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    ['all', ...approvedTags].forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'filter-option' + (tag === currentFilter ? ' active' : '');
        btn.dataset.filter = tag;
        btn.textContent = tag === 'all' ? 'Tutte' : tag === 'untagged' ? 'Senza tag' : tag;
        btn.addEventListener('click', () => {
            dropdown.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = tag;
            document.getElementById('filter-label').textContent = btn.textContent;
            dropdown.classList.remove('open');
            document.getElementById('filter-toggle-btn').classList.remove('open');
            renderFanarts();
        });
        dropdown.appendChild(btn);
    });
}

function _parseTags(raw) {
    if (!raw || !raw.trim()) return ['untagged'];
    const tags = raw.split(';').map(t => t.trim().toLowerCase()).filter(Boolean);
    return tags.length ? tags : ['untagged'];
}

function _classifyTags(tags) {
    return tags.map(t => ({
        name: t,
        known: t === 'untagged' || approvedTags.includes(t),
    }));
}

function _renderTagChips(raw) {
    const chips = document.getElementById('fa-tag-chips');
    if (!chips) return;
    const tags = _parseTags(raw);
    chips.innerHTML = _classifyTags(tags).map(({ name, known }) => {
        const cls = name === 'untagged'
            ? 'fa-tag-chip fa-tag-chip-untagged'
            : known ? 'fa-tag-chip fa-tag-chip-known' : 'fa-tag-chip fa-tag-chip-new';
        return `<span class="${cls}">${name === 'untagged' ? 'untagged' : name}</span>`;
    }).join('');
}

function _getTagSuggestions(inputValue) {
    const parts = inputValue.split(';');
    const current = parts[parts.length - 1].trim().toLowerCase();
    if (!current) return [];
    const already = parts.slice(0, -1).map(t => t.trim().toLowerCase());
    return approvedTags
        .filter(t => t !== 'untagged' && t.includes(current) && !already.includes(t))
        .slice(0, 8);
}

function _showTagDropdown(suggestions, input) {
    let box = document.getElementById('fa-tag-dropdown');
    if (!box) {
        box = document.createElement('div');
        box.id = 'fa-tag-dropdown';
        box.className = 'fa-tag-dropdown';
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(box);
    }
    tagSuggestionIndex = -1;
    if (!suggestions.length) { box.innerHTML = ''; box.classList.remove('visible'); return; }
    box.innerHTML = suggestions.map((t, i) =>
        `<div class="fa-tag-option" data-tag="${t}" data-index="${i}">${t}</div>`
    ).join('');
    box.querySelectorAll('.fa-tag-option').forEach(el => {
        el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            _applyTagSuggestion(input, el.dataset.tag);
        });
    });
    box.classList.add('visible');
}

function _hideTagDropdown() {
    const box = document.getElementById('fa-tag-dropdown');
    if (box) { box.innerHTML = ''; box.classList.remove('visible'); }
    tagSuggestionIndex = -1;
}

function _applyTagSuggestion(input, tag) {
    const parts = input.value.split(';');
    parts[parts.length - 1] = ' ' + tag;
    input.value = parts.join(';') + '; ';
    input.dispatchEvent(new Event('input'));
    _hideTagDropdown();
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
}

function _initTagAutocomplete(input) {
    input.addEventListener('input', () => {
        _renderTagChips(input.value);
        const suggestions = _getTagSuggestions(input.value);
        _showTagDropdown(suggestions, input);
    });
    input.addEventListener('keydown', (e) => {
        const box = document.getElementById('fa-tag-dropdown');
        if (!box?.classList.contains('visible')) return;
        const items = box.querySelectorAll('.fa-tag-option');
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            tagSuggestionIndex = Math.min(tagSuggestionIndex + 1, items.length - 1);
            items.forEach((el, i) => el.classList.toggle('highlighted', i === tagSuggestionIndex));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            tagSuggestionIndex = Math.max(tagSuggestionIndex - 1, -1);
            items.forEach((el, i) => el.classList.toggle('highlighted', i === tagSuggestionIndex));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (tagSuggestionIndex >= 0 && items[tagSuggestionIndex]) {
                e.preventDefault();
                _applyTagSuggestion(input, items[tagSuggestionIndex].dataset.tag);
            }
        } else if (e.key === 'Escape') {
            _hideTagDropdown();
        }
    });
    input.addEventListener('blur', () => setTimeout(_hideTagDropdown, 150));
}

function getFilteredFanarts() {
    return fanarts.filter(f => {
        const title  = (f.title || '').toLowerCase();
        const artist = (f.artist || '').toLowerCase();
        const query  = currentSearch.toLowerCase();
        const matchSearch = !query || title.includes(query) || artist.includes(query);
        const tags = (f.tags && f.tags.length) ? f.tags : ['untagged'];
        const matchFilter = currentFilter === 'all' || tags.includes(currentFilter);
        return matchSearch && matchFilter;
    });
}

function renderFanarts() {
    const grid = document.getElementById('fanart-grid');
    const noResults = document.getElementById('no-results');
    const filtered = getFilteredFanarts();
    grid.innerHTML = '';
    if (filtered.length === 0) { noResults.style.display = 'block'; return; }
    noResults.style.display = 'none';
    filtered.forEach(f => grid.appendChild(createFanartCard(f)));
}

function createFanartCard(f) {
    const card = document.createElement('div');
    card.className = 'fanart-card';
    const title  = f.title || '';
    const byText = getNestedTranslation('fanart.by') || 'di';
    const tags   = (f.tags && f.tags.length) ? f.tags : ['untagged'];
    card.innerHTML = `
        <div class="fanart-card-img-wrapper">
            <img src="${f.image}" alt="${title}" loading="lazy" onerror="this.src=IMG_CDN+'/vtubers/placeholder.png'">
            <div class="fanart-card-overlay"><i class="fas fa-expand"></i></div>
        </div>
        <div class="fanart-card-info">
            <div class="fanart-card-title">${title}</div>
            <div class="fanart-card-artist">${byText} ${f.artist}</div>
            <div class="fanart-card-tags">${tags.map(t =>
                `<span class="tag-badge${t === 'untagged' ? ' tag-untagged' : ''}">${t}</span>`
            ).join('')}</div>
        </div>`;
    card.addEventListener('click', () => openLightbox(f));
    return card;
}

const SOCIAL_META = {
    twitter:   { icon: 'fa-x-twitter',  label: 'X / Twitter' },
    instagram: { icon: 'fa-instagram',   label: 'Instagram' },
    twitch:    { icon: 'fa-twitch',      label: 'Twitch' },
    youtube:   { icon: 'fa-youtube',     label: 'YouTube' },
    tiktok:    { icon: 'fa-tiktok',      label: 'TikTok' },
    bluesky:   { icon: 'fa-cloud',       label: 'Bluesky' },
    discord:   { icon: 'fa-discord',     label: 'Discord' },
    website:   { icon: 'fa-globe',       label: 'Website' },
};

function openLightbox(f) {
    const title  = f.title || '';
    const byText = getNestedTranslation('fanart.by') || 'di';
    const tags   = (f.tags && f.tags.length) ? f.tags : ['untagged'];
    const socials = f.socials || {};
    const popupImg = document.getElementById('fanart-popup-img');
    popupImg.onerror = function() { this.src = IMG_CDN + '/vtubers/placeholder.png'; this.onerror = null; };
    popupImg.src = f.image;
    popupImg.alt = title;
    document.getElementById('fanart-popup-title').textContent = title;
    document.getElementById('fanart-popup-artist').textContent = `${byText} ${f.artist}`;
    document.getElementById('fanart-popup-tags').innerHTML = tags.map(t =>
        `<span class="tag-badge${t === 'untagged' ? ' tag-untagged' : ''}">${t}</span>`
    ).join('');
    const socialsEl = document.getElementById('fanart-popup-socials');
    const entries = Object.entries(socials);
    if (entries.length > 0) {
        socialsEl.innerHTML = entries.map(([p, url]) => {
            const meta = SOCIAL_META[p] || { icon: 'fa-link', label: p };
            return `<a href="${url}" target="_blank" rel="noopener" class="fanart-social-link ${p}" title="${meta.label}"><i class="fab ${meta.icon}"></i></a>`;
        }).join('');
        socialsEl.style.display = 'flex';
    } else {
        socialsEl.innerHTML = '';
        socialsEl.style.display = 'none';
    }
    document.getElementById('fanart-popup').classList.add('active');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('fanart-popup').classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
}

function openSubmitModal() {
    document.getElementById('submit-modal').classList.add('active');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
}

function closeSubmitModal() {
    document.getElementById('submit-modal').classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    _faFeedbackClear();
    _hideTagDropdown();
    document.getElementById('fa-tag-chips').innerHTML = '';
}

function _faFeedbackSet(msg, type) {
    const el = document.getElementById('fa-feedback');
    if (!el) return;
    el.textContent = msg;
    el.className = 'sf-feedback ' + type;
}

function _faFeedbackClear() {
    const el = document.getElementById('fa-feedback');
    if (!el) return;
    el.textContent = '';
    el.className = 'sf-feedback';
}

function _faSetFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { _faFeedbackSet('Formato non supportato. Usa JPG, PNG, GIF o WEBP.', 'error'); return; }
    if (file.size > FA_MAX_BYTES) { _faFeedbackSet(`Il file supera il limite di 15 MB (${(file.size/1024/1024).toFixed(1)} MB).`, 'error'); return; }
    faSelectedFile = file;
    _faFeedbackClear();
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('fa-preview-img').src = e.target.result;
        document.getElementById('fa-filename').textContent = file.name;
        document.getElementById('fa-preview').style.display = 'flex';
        document.getElementById('fa-dropzone-inner').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function _faResetFile() {
    faSelectedFile = null;
    document.getElementById('fa-image-file').value = '';
    document.getElementById('fa-preview').style.display = 'none';
    document.getElementById('fa-dropzone-inner').style.display = 'flex';
    document.getElementById('fa-preview-img').src = '';
}

function initFanartDropzone() {
    const zone = document.getElementById('fa-dropzone');
    const input = document.getElementById('fa-image-file');
    const pickBtn = document.getElementById('fa-pick-btn');
    const removeBtn = document.getElementById('fa-remove-btn');
    if (!zone) return;
    pickBtn.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { if (input.files[0]) _faSetFile(input.files[0]); });
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); _faResetFile(); });
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault(); zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) _faSetFile(file);
    });
}

function initFanartForm() {
    initFanartDropzone();
    const tagsInput = document.getElementById('fa-tags-input');
    if (tagsInput) _initTagAutocomplete(tagsInput);

    document.getElementById('fa-tag-suggest-btn')?.addEventListener('click', async () => {
        const raw = tagsInput?.value || '';
        const tags = _parseTags(raw);
        const newTags = tags.filter(t => t !== 'untagged' && !approvedTags.includes(t));
        if (!newTags.length) { _faFeedbackSet('Nessun tag nuovo da proporre — tutti quelli inseriti sono già approvati.', 'error'); return; }
        if (!Auth || !Auth.isLoggedIn()) { _faFeedbackSet('Devi essere loggato per proporre nuovi tag.', 'error'); return; }
        const btn = document.getElementById('fa-tag-suggest-btn');
        btn.disabled = true;
        try {
            await Promise.all(newTags.map(name => Api.submit.post('tag', { name }, null).catch(() => {})));
            _faFeedbackSet(`${newTags.length} tag proposto/i in revisione: ${newTags.join(', ')}`, 'success');
        } catch(e) {
            _faFeedbackSet(e.message || 'Errore durante la proposta.', 'error');
        } finally {
            btn.disabled = false;
        }
    });

    const btn = document.getElementById('fa-submit-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        _faFeedbackClear();
        const title   = document.getElementById('fa-title')?.value.trim();
        const artist  = document.getElementById('fa-artist')?.value.trim();
        const tagsRaw = document.getElementById('fa-tags-input')?.value.trim();
        const social  = document.getElementById('fa-socials')?.value.trim();
        if (!title || !artist) { _faFeedbackSet('Titolo e nome artista sono obbligatori (*).', 'error'); return; }
        if (!faSelectedFile)   { _faFeedbackSet('Seleziona un\'immagine da caricare.', 'error'); return; }
        if (!Auth || !Auth.isLoggedIn()) { _faFeedbackSet('Devi essere loggato per inviare una fanart.', 'error'); return; }
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Caricamento immagine...';
        try {
            const imageUrl = await Api.upload.file(faSelectedFile, 'fanart');
            btn.querySelector('span').textContent = 'Invio in corso...';
            await Api.submit.post('fanart', { title, artist, image: imageUrl, tags_raw: tagsRaw || '', socials: social ? { website: social } : {} }, imageUrl);
            _faFeedbackSet('Fanart inviata! La esamineremo il prima possibile.', 'success');
            ['fa-title','fa-artist','fa-tags-input','fa-socials'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            document.getElementById('fa-tag-chips').innerHTML = '';
            _faResetFile();
        } catch (err) {
            _faFeedbackSet(err.message || 'Errore durante l\'invio. Riprova.', 'error');
        } finally {
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Invia fanart';
        }
    });
}

function buildSuggestions(query) {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase();
    const results = [];
    const seen = new Set();
    fanarts.forEach(f => {
        const title = f.title || '';
        const artist = f.artist || '';
        if (title.toLowerCase().includes(q) && !seen.has('t:' + title)) { seen.add('t:' + title); results.push({ text: title, icon: 'fa-image' }); }
        if (artist.toLowerCase().includes(q) && !seen.has('a:' + artist)) { seen.add('a:' + artist); results.push({ text: artist, icon: 'fa-user' }); }
    });
    return results.slice(0, 6);
}

function highlightMatch(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx) + `<span class="suggestion-match">${text.slice(idx, idx + query.length)}</span>` + text.slice(idx + query.length);
}

function showSuggestions(suggestions) {
    const box = document.getElementById('search-suggestions');
    suggestionIndex = -1;
    if (!suggestions.length) { box.innerHTML = ''; box.classList.remove('visible'); return; }
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
    document.getElementById('search-suggestions').classList.remove('visible');
    suggestionIndex = -1;
}

function initFilterDropdown() {
    const btn = document.getElementById('filter-toggle-btn');
    const dropdown = document.getElementById('filter-dropdown');
    btn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); btn.classList.toggle('open'); });
    document.addEventListener('click', () => { dropdown.classList.remove('open'); btn.classList.remove('open'); });
    dropdown.addEventListener('click', (e) => e.stopPropagation());
}

function initSearchKeyboard() {
    const input = document.getElementById('fanart-search');
    const box = document.getElementById('search-suggestions');
    input.addEventListener('keydown', (e) => {
        const items = box.querySelectorAll('.suggestion-item');
        if (!items.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1); items.forEach((el, i) => el.classList.toggle('highlighted', i === suggestionIndex)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); suggestionIndex = Math.max(suggestionIndex - 1, -1); items.forEach((el, i) => el.classList.toggle('highlighted', i === suggestionIndex)); }
        else if (e.key === 'Enter' && suggestionIndex >= 0 && items[suggestionIndex]) { input.value = items[suggestionIndex].dataset.text; currentSearch = input.value; hideSuggestions(); renderFanarts(); }
        else if (e.key === 'Escape') hideSuggestions();
    });
}

window.addEventListener('languageChanged', () => {
    renderFanarts();
    const input = document.getElementById('fanart-search');
    if (input) input.placeholder = getNestedTranslation('fanart.searchPlaceholder') || '';
});

document.addEventListener('DOMContentLoaded', () => {
    loadFanartData();
    loadApprovedTags();
    initFilterDropdown();
    initSearchKeyboard();
    initFanartForm();

    const searchInput = document.getElementById('fanart-search');
    searchInput.addEventListener('input', () => { currentSearch = searchInput.value; renderFanarts(); showSuggestions(buildSuggestions(currentSearch)); });
    searchInput.addEventListener('focus', () => { if (currentSearch) showSuggestions(buildSuggestions(currentSearch)); });
    searchInput.addEventListener('blur', () => setTimeout(hideSuggestions, 150));

    document.getElementById('submit-fanart-btn').addEventListener('click', openSubmitModal);
    document.getElementById('submit-modal-overlay').addEventListener('click', closeSubmitModal);
    document.getElementById('submit-modal-close').addEventListener('click', closeSubmitModal);
    document.getElementById('submit-close-btn').addEventListener('click', closeSubmitModal);
    document.getElementById('fanart-popup-close').addEventListener('click', closeLightbox);
    document.getElementById('fanart-popup-overlay').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeLightbox(); closeSubmitModal(); } });
});
