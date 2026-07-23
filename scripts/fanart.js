let fanarts      = [];
let approvedTags = [];
let activeFilter = 'all';
let searchQuery  = '';
let searchCursor = -1;

const MAX_FILE_SIZE = 15 * 1024 * 1024;
let selectedFile = null;
let selectedTags = [];

async function loadFanarts() {
    const grid = document.getElementById('fanart-grid');
    grid.innerHTML = '<div class="page-loading">Caricamento...</div>';
    try {
        const data = await Api.fanarts.get();
        fanarts = data.fanarts || [];
    } catch {
        try {
            const res = await fetch('./assets/data/fanarts.json');
            if (!res.ok) throw new Error();
            fanarts = (await res.json()).fanarts || [];
        } catch {
            fanarts = [];
        }
    }
    renderFanarts();
}

async function loadTags() {
    try {
        const data = await Api.tags.fanart();
        approvedTags = (data.tags || ['untagged']).filter(t => t !== 'untagged');
    } catch {
        approvedTags = [];
    }
    renderTopTags();
    buildFilterDropdown();
}

function getTopTags() {
    const counts = {};
    fanarts.forEach(f => {
        (f.tags || []).forEach(t => {
            if (t !== 'untagged') counts[t] = (counts[t] || 0) + 1;
        });
    });
    return approvedTags.slice().sort((a, b) => (counts[b] || 0) - (counts[a] || 0)).slice(0, 5);
}

function renderTopTags() {
    const container = document.getElementById('fa-top-tags');
    if (!container) return;
    container.innerHTML = getTopTags().map(t => `
        <button type="button" class="fa-top-tag${selectedTags.includes(t) ? ' selected' : ''}" data-tag="${t}">#${t}</button>
    `).join('');
    container.querySelectorAll('.fa-top-tag').forEach(btn => {
        btn.addEventListener('click', () => toggleTag(btn.dataset.tag));
    });
}

function toggleTag(tag) {
    const idx = selectedTags.indexOf(tag);
    if (idx === -1) selectedTags.push(tag);
    else            selectedTags.splice(idx, 1);
    renderTopTags();
    renderSelectedTags();
    const input = document.getElementById('fa-tags-input');
    if (input) input.value = '';
    hideTagDropdown();
}

function renderSelectedTags() {
    const chips = document.getElementById('fa-tag-chips');
    if (!chips) return;
    chips.innerHTML = selectedTags.map(t => `
        <span class="fa-tag-chip fa-tag-chip-known">
            #${t}
            <button type="button" class="fa-chip-remove" data-tag="${t}">×</button>
        </span>
    `).join('');
    chips.querySelectorAll('.fa-chip-remove').forEach(btn => {
        btn.addEventListener('click', () => toggleTag(btn.dataset.tag));
    });
}

function getTagSuggestions(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return approvedTags.filter(t => t.includes(q) && !selectedTags.includes(t)).slice(0, 8);
}

function showTagDropdown(query, input) {
    let box = document.getElementById('fa-tag-dropdown');
    if (!box) {
        box = document.createElement('div');
        box.id = 'fa-tag-dropdown';
        box.className = 'fa-tag-dropdown';
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(box);
    }

    box.innerHTML = '';

    if (!query) {
        const top = getTopTags().filter(t => !selectedTags.includes(t));
        if (!top.length) { box.classList.remove('visible'); return; }
        const header = document.createElement('div');
        header.className = 'fa-tag-dropdown-header';
        header.textContent = 'Tag consigliati';
        box.appendChild(header);
        top.forEach(t => {
            const el = document.createElement('div');
            el.className = 'fa-tag-option';
            el.textContent = t;
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                toggleTag(t);
                hideTagDropdown();
                input.focus();
            });
            box.appendChild(el);
        });
        box.classList.add('visible');
        return;
    }

    getTagSuggestions(query).forEach(t => {
        const el = document.createElement('div');
        el.className = 'fa-tag-option';
        el.textContent = t;
        el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            toggleTag(t);
            input.value = '';
            hideTagDropdown();
            input.focus();
        });
        box.appendChild(el);
    });

    if (!approvedTags.includes(query.toLowerCase())) {
        const propose = document.createElement('div');
        propose.className = 'fa-tag-propose';
        propose.innerHTML = `<i class="fas fa-plus-circle"></i> Tag non trovato? <span class="fa-tag-propose-link">Proponilo</span>`;
        propose.querySelector('.fa-tag-propose-link').addEventListener('mousedown', (e) => {
            e.preventDefault();
            openProposeForm(query);
            hideTagDropdown();
        });
        box.appendChild(propose);
    }

    box.children.length ? box.classList.add('visible') : box.classList.remove('visible');
}

function hideTagDropdown() {
    const box = document.getElementById('fa-tag-dropdown');
    if (box) { box.innerHTML = ''; box.classList.remove('visible'); }
}

function openProposeForm(prefill) {
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
            <button type="button" class="fa-tag-propose-close"><i class="fas fa-times"></i></button>
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

    form.querySelector('.fa-tag-propose-close').addEventListener('click', () => form.remove());
    form.querySelector('#fa-propose-cancel').addEventListener('click', () => form.remove());

    form.querySelector('#fa-propose-submit').addEventListener('click', async () => {
        const name   = form.querySelector('#fa-propose-name').value.trim().toLowerCase();
        const reason = form.querySelector('#fa-propose-reason').value.trim();
        const fb     = form.querySelector('#fa-propose-fb');

        if (!name)   { fb.textContent = 'Inserisci un nome per il tag.'; fb.className = 'fa-tag-propose-fb error'; return; }
        if (!reason) { fb.textContent = 'Inserisci un motivo.'; fb.className = 'fa-tag-propose-fb error'; return; }
        if (!Auth?.isLoggedIn()) { fb.textContent = 'Devi essere loggato.'; fb.className = 'fa-tag-propose-fb error'; return; }

        const btn = form.querySelector('#fa-propose-submit');
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Invio...';
        try {
            await Api.submit.post('tag', { name, reason }, null);
            fb.textContent = 'Proposta inviata! Verrà esaminata al più presto.';
            fb.className = 'fa-tag-propose-fb success';
            setTimeout(() => form.remove(), 2000);
        } catch (e) {
            fb.textContent = e.message || "Errore durante l'invio.";
            fb.className = 'fa-tag-propose-fb error';
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Invia';
        }
    });

    container.appendChild(form);
    form.querySelector('#fa-propose-name')?.focus();
}

function buildFilterDropdown() {
    const dropdown = document.getElementById('filter-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    ['all', 'untagged', ...approvedTags].forEach(tag => {
        const btn = document.createElement('button');
        btn.className   = 'filter-option' + (tag === activeFilter ? ' active' : '');
        btn.dataset.filter = tag;
        btn.textContent = tag === 'all' ? 'Tutte' : tag === 'untagged' ? 'Senza tag' : tag;
        btn.addEventListener('click', () => {
            dropdown.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = tag;
            document.getElementById('filter-label').textContent = btn.textContent;
            dropdown.classList.remove('open');
            document.getElementById('filter-toggle-btn').classList.remove('open');
            renderFanarts();
        });
        dropdown.appendChild(btn);
    });
}

function getFilteredFanarts() {
    return fanarts.filter(f => {
        const q           = searchQuery.toLowerCase();
        const matchSearch = !q || (f.title || '').toLowerCase().includes(q) || (f.artist || '').toLowerCase().includes(q);
        const tags        = f.tags?.length ? f.tags : ['untagged'];
        const matchFilter = activeFilter === 'all' || tags.includes(activeFilter);
        return matchSearch && matchFilter;
    });
}

function renderFanarts() {
    const grid      = document.getElementById('fanart-grid');
    const noResults = document.getElementById('no-results');
    const filtered  = getFilteredFanarts();
    grid.innerHTML  = '';
    if (!filtered.length) { noResults.style.display = 'block'; return; }
    noResults.style.display = 'none';
    filtered.forEach(f => grid.appendChild(buildFanartCard(f)));
}

function buildFanartCard(f) {
    const card   = document.createElement('div');
    card.className = 'fanart-card';
    const byText = getNestedTranslation('fanart.by') || 'di';
    const tags   = f.tags?.length ? f.tags : ['untagged'];
    card.innerHTML = `
        <div class="fanart-card-img-wrapper">
            <img src="${f.image}" alt="${f.title || ''}" loading="lazy" onerror="this.src=IMG_CDN+'/vtubers/placeholder.png'">
            <div class="fanart-card-overlay"><i class="fas fa-expand"></i></div>
        </div>
        <div class="fanart-card-info">
            <div class="fanart-card-title">${f.title || ''}</div>
            <div class="fanart-card-artist">${byText} ${f.artist}</div>
            <div class="fanart-card-tags">${tags.map(t =>
                `<span class="tag-badge${t === 'untagged' ? ' tag-untagged' : ''}">${t}</span>`
            ).join('')}</div>
        </div>`;
    card.addEventListener('click', () => openLightbox(f));
    return card;
}

const SOCIAL_ICONS = {
    twitter:   { icon: 'fa-brands fa-x-twitter',  label: 'X / Twitter' },
    x:         { icon: 'fa-brands fa-x-twitter',  label: 'X / Twitter' },
    instagram: { icon: 'fa-brands fa-instagram',   label: 'Instagram' },
    twitch:    { icon: 'fa-brands fa-twitch',      label: 'Twitch' },
    youtube:   { icon: 'fa-brands fa-youtube',     label: 'YouTube' },
    tiktok:    { icon: 'fa-brands fa-tiktok',      label: 'TikTok' },
    bluesky:   { icon: 'fa-brands fa-bluesky',     label: 'Bluesky' },
    discord:   { icon: 'fa-brands fa-discord',     label: 'Discord' },
    linktree:  { icon: 'fa-solid fa-tree',         label: 'Linktree' },
    website:   { icon: 'fa-solid fa-globe',        label: 'Website' },
};

function getSocialMeta(url) {
    const u = url.toLowerCase();
    if (u.includes('twitter.com') || u.includes('x.com')) return SOCIAL_ICONS.x;
    if (u.includes('instagram'))  return SOCIAL_ICONS.instagram;
    if (u.includes('twitch'))     return SOCIAL_ICONS.twitch;
    if (u.includes('youtube') || u.includes('youtu.be')) return SOCIAL_ICONS.youtube;
    if (u.includes('tiktok'))     return SOCIAL_ICONS.tiktok;
    if (u.includes('bsky') || u.includes('bluesky')) return SOCIAL_ICONS.bluesky;
    if (u.includes('discord'))    return SOCIAL_ICONS.discord;
    if (u.includes('linktr.ee') || u.includes('linktree')) return SOCIAL_ICONS.linktree;
    return SOCIAL_ICONS.website;
}

function openLightbox(f) {
    const tags    = f.tags?.length ? f.tags : ['untagged'];
    const socials = f.socials || {};
    const byText  = getNestedTranslation('fanart.by') || 'di';

    const img = document.getElementById('fanart-popup-img');
    img.onerror = function() { this.src = IMG_CDN + '/vtubers/placeholder.png'; this.onerror = null; };
    img.src = f.image;
    img.alt = f.title || '';

    document.getElementById('fanart-popup-title').textContent  = f.title || '';
    document.getElementById('fanart-popup-artist').textContent = `${byText} ${f.artist}`;
    document.getElementById('fanart-popup-tags').innerHTML = tags.map(t =>
        `<span class="tag-badge${t === 'untagged' ? ' tag-untagged' : ''}">${t}</span>`
    ).join('');

    const socialsEl = document.getElementById('fanart-popup-socials');
    const entries   = Object.entries(socials);
    if (entries.length) {
        socialsEl.innerHTML = entries.map(([p, url]) => {
            const meta = SOCIAL_ICONS[p] || getSocialMeta(url);
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

function openSubmitModal() {
    selectedTags = [];
    renderTopTags();
    renderSelectedTags();
    document.getElementById('submit-modal').classList.add('active');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
}

function closeSubmitModal() {
    document.getElementById('submit-modal').classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    clearFeedback();
    hideTagDropdown();
    selectedTags = [];
    renderSelectedTags();
}

function setFeedback(msg, type) {
    const el = document.getElementById('fa-feedback');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'sf-feedback ' + type;
}

function clearFeedback() {
    const el = document.getElementById('fa-feedback');
    if (!el) return;
    el.textContent = '';
    el.className   = 'sf-feedback';
}

function setSelectedFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFeedback('Formato non supportato. Usa JPG, PNG, GIF o WEBP.', 'error'); return; }
    if (file.size > MAX_FILE_SIZE)       { setFeedback(`Il file supera il limite di 15 MB (${(file.size/1024/1024).toFixed(1)} MB).`, 'error'); return; }
    selectedFile = file;
    clearFeedback();
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('fa-preview-img').src       = e.target.result;
        document.getElementById('fa-filename').textContent  = file.name;
        document.getElementById('fa-preview').style.display = 'flex';
        document.getElementById('fa-dropzone-inner').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function resetFile() {
    selectedFile = null;
    document.getElementById('fa-image-file').value              = '';
    document.getElementById('fa-preview').style.display         = 'none';
    document.getElementById('fa-dropzone-inner').style.display  = 'flex';
    document.getElementById('fa-preview-img').src               = '';
}

function initDropzone() {
    const zone      = document.getElementById('fa-dropzone');
    const input     = document.getElementById('fa-image-file');
    const pickBtn   = document.getElementById('fa-pick-btn');
    const removeBtn = document.getElementById('fa-remove-btn');
    if (!zone) return;
    pickBtn.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { if (input.files[0]) setSelectedFile(input.files[0]); });
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); resetFile(); });
    zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault(); zone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]);
    });
}

function initSubmitForm() {
    initDropzone();

    const tagsInput = document.getElementById('fa-tags-input');
    if (tagsInput) {
        tagsInput.addEventListener('focus', () => showTagDropdown(tagsInput.value.trim().toLowerCase(), tagsInput));
        tagsInput.addEventListener('input', () => showTagDropdown(tagsInput.value.trim().toLowerCase(), tagsInput));
        tagsInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTagDropdown(); });
        tagsInput.addEventListener('blur', () => setTimeout(hideTagDropdown, 150));
    }

    const btn = document.getElementById('fa-submit-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        clearFeedback();
        const title  = document.getElementById('fa-title')?.value.trim();
        const artist = document.getElementById('fa-artist')?.value.trim();
        const social = document.getElementById('fa-socials')?.value.trim();
        if (!title || !artist)    { setFeedback('Titolo e nome artista sono obbligatori (*).', 'error'); return; }
        if (!selectedFile)        { setFeedback("Seleziona un'immagine da caricare.", 'error'); return; }
        if (!Auth?.isLoggedIn())  { setFeedback('Devi essere loggato per inviare una fanart.', 'error'); return; }

        btn.disabled = true;
        btn.querySelector('span').textContent = 'Caricamento immagine...';
        try {
            const imageUrl = await Api.upload.file(selectedFile, 'fanart');
            btn.querySelector('span').textContent = 'Invio in corso...';
            await Api.submit.post('fanart', {
                title, artist, image: imageUrl,
                tags: selectedTags.length ? selectedTags : ['untagged'],
                socials: social ? { website: social } : {}
            }, imageUrl);
            setFeedback('Fanart inviata! La esamineremo il prima possibile.', 'success');
            ['fa-title','fa-artist','fa-socials'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            selectedTags = [];
            renderTopTags();
            renderSelectedTags();
            resetFile();
        } catch (e) {
            setFeedback(e.message || "Errore durante l'invio. Riprova.", 'error');
        } finally {
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Invia fanart';
        }
    });
}

function getSearchSuggestions(query) {
    if (!query) return [];
    const q    = query.toLowerCase();
    const seen = new Set();
    const out  = [];
    fanarts.forEach(f => {
        if ((f.title || '').toLowerCase().includes(q)  && !seen.has('t:' + f.title))  { seen.add('t:' + f.title);  out.push({ text: f.title,  icon: 'fa-image' }); }
        if ((f.artist || '').toLowerCase().includes(q) && !seen.has('a:' + f.artist)) { seen.add('a:' + f.artist); out.push({ text: f.artist, icon: 'fa-user' }); }
    });
    return out.slice(0, 6);
}

function highlightMatch(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx) + `<span class="suggestion-match">${text.slice(idx, idx + query.length)}</span>` + text.slice(idx + query.length);
}

function showSearchSuggestions(suggestions) {
    const box = document.getElementById('search-suggestions');
    searchCursor = -1;
    if (!suggestions.length) { box.innerHTML = ''; box.classList.remove('visible'); return; }
    box.innerHTML = suggestions.map((s, i) =>
        `<div class="suggestion-item" data-index="${i}" data-text="${s.text}">
            <i class="fas ${s.icon}"></i>
            <span>${highlightMatch(s.text, searchQuery)}</span>
        </div>`
    ).join('');
    box.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const input = document.getElementById('fanart-search');
            input.value = el.dataset.text;
            searchQuery = el.dataset.text;
            box.classList.remove('visible');
            renderFanarts();
        });
    });
    box.classList.add('visible');
}

function hideSearchSuggestions() {
    document.getElementById('search-suggestions').classList.remove('visible');
    searchCursor = -1;
}

function initFilterDropdown() {
    const btn      = document.getElementById('filter-toggle-btn');
    const dropdown = document.getElementById('filter-dropdown');
    btn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); btn.classList.toggle('open'); });
    document.addEventListener('click', () => { dropdown.classList.remove('open'); btn.classList.remove('open'); });
    dropdown.addEventListener('click', (e) => e.stopPropagation());
}

function initSearchBar() {
    const input = document.getElementById('fanart-search');
    const box   = document.getElementById('search-suggestions');
    input.addEventListener('keydown', (e) => {
        const items = box.querySelectorAll('.suggestion-item');
        if (!items.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); searchCursor = Math.min(searchCursor + 1, items.length - 1); items.forEach((el, i) => el.classList.toggle('highlighted', i === searchCursor)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); searchCursor = Math.max(searchCursor - 1, -1); items.forEach((el, i) => el.classList.toggle('highlighted', i === searchCursor)); }
        else if (e.key === 'Enter' && searchCursor >= 0 && items[searchCursor]) { input.value = items[searchCursor].dataset.text; searchQuery = input.value; hideSearchSuggestions(); renderFanarts(); }
        else if (e.key === 'Escape') hideSearchSuggestions();
    });
}

window.addEventListener('languageChanged', () => {
    renderFanarts();
    const input = document.getElementById('fanart-search');
    if (input) input.placeholder = getNestedTranslation('fanart.searchPlaceholder') || '';
});

document.addEventListener('DOMContentLoaded', () => {
    loadFanarts();
    loadTags();
    initFilterDropdown();
    initSearchBar();
    initSubmitForm();

    const searchInput = document.getElementById('fanart-search');
    searchInput.addEventListener('input', () => { searchQuery = searchInput.value; renderFanarts(); showSearchSuggestions(getSearchSuggestions(searchQuery)); });
    searchInput.addEventListener('focus', () => { if (searchQuery) showSearchSuggestions(getSearchSuggestions(searchQuery)); });
    searchInput.addEventListener('blur', () => setTimeout(hideSearchSuggestions, 150));

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
