let fanarts = [];
let approvedTags = [];
let currentFilter = 'all';
let currentSearch = '';
let suggestionIndex = -1;

const FA_MAX_BYTES = 15 * 1024 * 1024;
let faSelectedFile = null;
let faSelectedTags = [];

async function loadFanartData() {
    const grid = document.getElementById('fanart-grid');
    grid.innerHTML = '<div class="page-loading">Caricamento...</div>';
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
        approvedTags = (data.tags || ['untagged']).filter(t => t !== 'untagged');
    } catch {
        approvedTags = [];
    }
    _renderTopTags();
    _buildFilterDropdown();
}

// ── TOP 5 TAG CLICCABILI ─────────────────────────────────────

function _getTopTags() {
    const counts = {};
    fanarts.forEach(f => {
        (f.tags || []).forEach(t => {
            if (t !== 'untagged') counts[t] = (counts[t] || 0) + 1;
        });
    });
    return approvedTags
        .slice()
        .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
        .slice(0, 5);
}

function _renderTopTags() {
    const container = document.getElementById('fa-top-tags');
    if (!container) return;
    const top = _getTopTags();
    container.innerHTML = top.map(t => `
        <button type="button" class="fa-top-tag${faSelectedTags.includes(t) ? ' selected' : ''}" data-tag="${t}">#${t}</button>
    `).join('');
    container.querySelectorAll('.fa-top-tag').forEach(btn => {
        btn.addEventListener('click', () => _toggleTag(btn.dataset.tag));
    });
}

function _toggleTag(tag) {
    const idx = faSelectedTags.indexOf(tag);
    if (idx === -1) {
        faSelectedTags.push(tag);
    } else {
        faSelectedTags.splice(idx, 1);
    }
    _renderTopTags();
    _renderSelectedChips();
    const input = document.getElementById('fa-tags-input');
    if (input) input.value = '';
    _hideTagDropdown();
}

function _renderSelectedChips() {
    const chips = document.getElementById('fa-tag-chips');
    if (!chips) return;
    chips.innerHTML = faSelectedTags.map(t => `
        <span class="fa-tag-chip fa-tag-chip-known">
            #${t}
            <button type="button" class="fa-chip-remove" data-tag="${t}">×</button>
        </span>
    `).join('');
    chips.querySelectorAll('.fa-chip-remove').forEach(btn => {
        btn.addEventListener('click', () => _toggleTag(btn.dataset.tag));
    });
}

// ── TAG SEARCH DROPDOWN ──────────────────────────────────────

function _getTagSuggestions(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return approvedTags
        .filter(t => t.includes(q) && !faSelectedTags.includes(t))
        .slice(0, 8);
}

function _showTagDropdown(query, input) {
    let box = document.getElementById('fa-tag-dropdown');
    if (!box) {
        box = document.createElement('div');
        box.id = 'fa-tag-dropdown';
        box.className = 'fa-tag-dropdown';
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(box);
    }

    const suggestions = _getTagSuggestions(query);
    box.innerHTML = '';

    if (suggestions.length) {
        suggestions.forEach(t => {
            const el = document.createElement('div');
            el.className = 'fa-tag-option';
            el.textContent = t;
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                _toggleTag(t);
                input.value = '';
                _hideTagDropdown();
                input.focus();
            });
            box.appendChild(el);
        });
    }

    if (query && !approvedTags.includes(query.toLowerCase())) {
        const propose = document.createElement('div');
        propose.className = 'fa-tag-propose';
        propose.innerHTML = `<i class="fas fa-plus-circle"></i> Tag non trovato? <span class="fa-tag-propose-link">Proponilo</span>`;
        propose.querySelector('.fa-tag-propose-link').addEventListener('mousedown', (e) => {
            e.preventDefault();
            _openTagProposeForm(query);
            _hideTagDropdown();
        });
        box.appendChild(propose);
    }

    if (box.children.length) {
        box.classList.add('visible');
    } else {
        box.classList.remove('visible');
    }
}

function _hideTagDropdown() {
    const box = document.getElementById('fa-tag-dropdown');
    if (box) { box.innerHTML = ''; box.classList.remove('visible'); }
}

// ── FORM PROPOSTA TAG ────────────────────────────────────────

function _openTagProposeForm(prefill) {
    const existing = document.getElementById('fa-tag-propose-form');
    if (existing) { existing.remove(); return; }

    const container = document.getElementById('fa-tag-propose-container');
    if (!container) return;

    const form = document.createElement('div');
    form.id = 'fa-tag-propose-form';
    form.className = 'fa-tag-propose-form';
    form.innerHTML = `
        <div class="fa-tag-propose-header">
            <span>Proponi un nuovo tag</span>
            <button type="button" class="fa-tag-propose-close" id="fa-tag-propose-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="sf-group" style="margin-bottom:.6rem;">
            <label class="sf-label" style="font-size:.72rem;">Nome del tag</label>
            <input class="sf-input" id="fa-propose-name" type="text" value="${prefill || ''}" placeholder="Es. chibi" maxlength="40">
        </div>
        <div class="sf-group" style="margin-bottom:.8rem;">
            <label class="sf-label" style="font-size:.72rem;">Motivo</label>
            <input class="sf-input" id="fa-propose-reason" type="text" placeholder="Perché dovrebbe essere aggiunto?" maxlength="200">
        </div>
        <div class="fa-tag-propose-fb" id="fa-propose-fb"></div>
        <div style="display:flex;gap:.5rem;">
            <button type="button" class="sf-submit-btn" id="fa-propose-submit" style="flex:1;padding:.45rem;font-size:.82rem;justify-content:center;">
                <i class="fas fa-paper-plane"></i> <span>Invia</span>
            </button>
            <button type="button" class="popup-form-close-btn" id="fa-propose-cancel" style="padding:.45rem .9rem;font-size:.82rem;">Chiudi</button>
        </div>`;

    form.querySelector('#fa-tag-propose-close').addEventListener('click', () => form.remove());
    form.querySelector('#fa-propose-cancel').addEventListener('click', () => form.remove());

    form.querySelector('#fa-propose-submit').addEventListener('click', async () => {
        const name   = form.querySelector('#fa-propose-name').value.trim().toLowerCase();
        const reason = form.querySelector('#fa-propose-reason').value.trim();
        const fb     = form.querySelector('#fa-propose-fb');

        if (!name) { fb.textContent = 'Inserisci un nome per il tag.'; fb.className = 'fa-tag-propose-fb error'; return; }
        if (!reason) { fb.textContent = 'Inserisci un motivo.'; fb.className = 'fa-tag-propose-fb error'; return; }
        if (!Auth || !Auth.isLoggedIn()) { fb.textContent = 'Devi essere loggato.'; fb.className = 'fa-tag-propose-fb error'; return; }

        const btn = form.querySelector('#fa-propose-submit');
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Invio...';
        try {
            await Api.submit.post('tag', { name, reason }, null);
            fb.textContent = 'Proposta inviata! Verrà esaminata al più presto.';
            fb.className = 'fa-tag-propose-fb success';
            setTimeout(() => form.remove(), 2000);
        } catch(e) {
            fb.textContent = e.message || 'Errore durante l\'invio.';
            fb.className = 'fa-tag-propose-fb error';
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Invia';
        }
    });

    container.appendChild(form);
    form.querySelector('#fa-propose-name')?.focus();
}

// ── FILTER DROPDOWN ──────────────────────────────────────────

function _buildFilterDropdown() {
    const dropdown = document.getElementById('filter-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    ['all', 'untagged', ...approvedTags].forEach(tag => {
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

// ── RENDER ───────────────────────────────────────────────────

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

// ── LIGHTBOX ─────────────────────────────────────────────────

const SOCIAL_META = {
    twitter:   { icon: 'fa-brands fa-x-twitter',  label: 'X / Twitter' },
    x:         { icon: 'fa-brands fa-x-twitter',  label: 'X / Twitter' },
    instagram: { icon: 'fa-brands fa-instagram',   label: 'Instagram' },
    twitch:    { icon: 'fa-brands fa-twitch',      label: 'Twitch' },
    youtube:   { icon: 'fa-brands fa-youtube',     label: 'YouTube' },
    tiktok:    { icon: 'fa-brands fa-tiktok',      label: 'TikTok' },
    bluesky:   { icon: 'fa-brands fa-bluesky',     label: 'Bluesky' },
    discord:   { icon: 'fa-brands fa-discord',     label: 'Discord' },
    website:   { icon: 'fa-solid fa-globe',        label: 'Website' },
};

function openLightbox(f) {
    const title   = f.title || '';
    const byText  = getNestedTranslation('fanart.by') || 'di';
    const tags    = (f.tags && f.tags.length) ? f.tags : ['untagged'];
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
            const meta = SOCIAL_META[p] || { icon: 'fa-solid fa-link', label: p };
            return `<a href="${url}" target="_blank" rel="noopener" class="fanart-social-link ${p}" title="${meta.label}"><i class="${meta.icon}"></i></a>`;
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

// ── SUBMIT FORM ──────────────────────────────────────────────

function openSubmitModal() {
    faSelectedTags = [];
    _renderTopTags();
    _renderSelectedChips();
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
    faSelectedTags = [];
    _renderSelectedChips();
    const chips = document.getElementById('fa-tag-chips');
    if (chips) chips.innerHTML = '';
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
    const zone      = document.getElementById('fa-dropzone');
    const input     = document.getElementById('fa-image-file');
    const pickBtn   = document.getElementById('fa-pick-btn');
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
    if (tagsInput) {
        tagsInput.addEventListener('input', () => {
            const q = tagsInput.value.trim().toLowerCase();
            if (q) {
                _showTagDropdown(q, tagsInput);
            } else {
                _hideTagDropdown();
            }
        });
        tagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') _hideTagDropdown();
        });
        tagsInput.addEventListener('blur', () => setTimeout(_hideTagDropdown, 150));
    }

    const btn = document.getElementById('fa-submit-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        _faFeedbackClear();
        const title  = document.getElementById('fa-title')?.value.trim();
        const artist = document.getElementById('fa-artist')?.value.trim();
        const social = document.getElementById('fa-socials')?.value.trim();
        if (!title || !artist) { _faFeedbackSet('Titolo e nome artista sono obbligatori (*).', 'error'); return; }
        if (!faSelectedFile)   { _faFeedbackSet("Seleziona un'immagine da caricare.", 'error'); return; }
        if (!Auth || !Auth.isLoggedIn()) { _faFeedbackSet('Devi essere loggato per inviare una fanart.', 'error'); return; }
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Caricamento immagine...';
        try {
            const imageUrl = await Api.upload.file(faSelectedFile, 'fanart');
            btn.querySelector('span').textContent = 'Invio in corso...';
            const tags = faSelectedTags.length ? faSelectedTags : ['untagged'];
            await Api.submit.post('fanart', {
                title, artist, image: imageUrl,
                tags,
                socials: social ? { website: social } : {}
            }, imageUrl);
            _faFeedbackSet('Fanart inviata! La esamineremo il prima possibile.', 'success');
            ['fa-title','fa-artist','fa-socials'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            faSelectedTags = [];
            _renderTopTags();
            _renderSelectedChips();
            _faResetFile();
        } catch (err) {
            _faFeedbackSet(err.message || "Errore durante l'invio. Riprova.", 'error');
        } finally {
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Invia fanart';
        }
    });
}

// ── SEARCH BAR ───────────────────────────────────────────────

function buildSuggestions(query) {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase();
    const results = [];
    const seen = new Set();
    fanarts.forEach(f => {
        const title  = f.title  || '';
        const artist = f.artist || '';
        if (title.toLowerCase().includes(q)  && !seen.has('t:' + title))  { seen.add('t:' + title);  results.push({ text: title,  icon: 'fa-image' }); }
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
    const btn      = document.getElementById('filter-toggle-btn');
    const dropdown = document.getElementById('filter-dropdown');
    btn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); btn.classList.toggle('open'); });
    document.addEventListener('click', () => { dropdown.classList.remove('open'); btn.classList.remove('open'); });
    dropdown.addEventListener('click', (e) => e.stopPropagation());
}

function initSearchKeyboard() {
    const input = document.getElementById('fanart-search');
    const box   = document.getElementById('search-suggestions');
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

    const submitModal   = document.getElementById('submit-modal');
    const submitContent = submitModal?.querySelector('.popup-content--form');
    submitModal?.addEventListener('click', closeSubmitModal);
    submitContent?.addEventListener('click', (e) => e.stopPropagation());

    document.getElementById('submit-modal-close').addEventListener('click', closeSubmitModal);
    document.getElementById('submit-close-btn').addEventListener('click', closeSubmitModal);
    document.getElementById('fanart-popup-close').addEventListener('click', closeLightbox);
    document.getElementById('fanart-popup-overlay').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeLightbox(); closeSubmitModal(); } });
});
