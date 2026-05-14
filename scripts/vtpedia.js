let vtubers = [];
let currentSlide = 0;
let currentImages = [];

const SF_MAX_BYTES = 15 * 1024 * 1024;
let sfSelectedFiles = [null, null, null];

async function loadVTubersData() {
    try {
        const data = await Api.vtubers.get();
        vtubers = data.vtubers || [];
        if (!vtubers.length) throw new Error('empty');
    } catch {
        try {
            const response = await fetch('./assets/data/vtubers.json');
            if (!response.ok) throw new Error();
            const data = await response.json();
            vtubers = (data.vtubers || []).filter(v => !v.isCTA);
        } catch {
            vtubers = [];
        }
    }
    displayVTubers();
}

function displayVTubers() {
    const grid = document.getElementById('vtuber-grid');
    grid.innerHTML = '';
    if (!vtubers.length) {
        grid.innerHTML = '<p style="color:rgba(255,255,255,0.7);text-align:center;grid-column:1/-1">Nessun VTuber disponibile al momento.</p>';
        return;
    }
    vtubers.forEach((v, i) => grid.appendChild(createVTuberCard(v, i)));
    grid.appendChild(createCTACard(vtubers.length));
}

function createCTACard(index) {
    const card = document.createElement('div');
    card.className = 'vtuber-card stagger-item vtuber-card-cta';
    card.innerHTML = `
        <div class="card-cta-body">
            <div class="card-cta-icon"><i class="fas fa-question"></i></div>
            <h3 class="card-cta-title" data-i18n="vtpedia.ctaTitle">Potresti esserci tu!</h3>
            <p class="card-cta-desc" data-i18n="vtpedia.ctaDesc">Sei un VTuber? Fai richiesta per entrare nella VTPedia!</p>
            <div class="card-cta-btn"><i class="fas fa-plus"></i> <span data-i18n="vtpedia.submit">Invia un VTuber</span></div>
        </div>`;
    card.addEventListener('click', () => document.getElementById('submit-vtuber-btn')?.click());
    setTimeout(() => card.classList.add('visible'), index * 80);
    return card;
}

function createVTuberCard(vtuber, index) {
    const card = document.createElement('div');
    card.className = 'vtuber-card stagger-item';
    const firstImage = vtuber.images?.[0] || IMG_CDN + '/vtubers/placeholder.png';
    const shortDesc  = vtuber.shortDesc || vtuber.desc
        || (vtuber.shortDescKey && !vtuber.shortDescKey.includes('.') ? vtuber.shortDescKey : getNestedTranslation(vtuber.shortDescKey) || '');
    card.innerHTML = `
        <div class="card-image">
            <img src="${firstImage}" alt="${vtuber.name}" onerror="this.src=IMG_CDN+'/vtubers/placeholder.png'">
            <div class="added-date">Added: ${vtuber.addedDate || ''}</div>
        </div>
        <div class="card-content">
            <h3 class="vtuber-name">${vtuber.name}</h3>
            <p class="vtuber-desc">${shortDesc}</p>
            <button class="show-more-btn">
                <i class="fas fa-chevron-down"></i>
                <span>${getNestedTranslation('vtpedia.showMore') || 'Mostra di più'}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
        </div>`;
    card.addEventListener('click', () => openPopup(vtuber));
    const img = card.querySelector('img');
    const reveal = () => setTimeout(() => card.classList.add('visible'), index * 80);
    if (img.complete) reveal();
    else { img.addEventListener('load', reveal, { once: true }); img.addEventListener('error', reveal, { once: true }); }
    return card;
}

function openPopup(vtuber) {
    currentImages = vtuber.images?.length > 0 ? vtuber.images : [IMG_CDN + '/vtubers/placeholder.png'];
    currentSlide = 0;
    initGallery(currentImages);
    const longDesc = vtuber.longDesc || vtuber.shortDesc || vtuber.desc
        || (vtuber.longDescKey ? getNestedTranslation(vtuber.longDescKey) : '') || '';
    document.getElementById('popup-name').textContent = vtuber.name;
    document.getElementById('popup-full-name').textContent = vtuber.fullName || vtuber.name;
    document.getElementById('popup-debut').textContent = vtuber.debut || '—';
    document.getElementById('popup-hashtag').textContent = vtuber.hashtag || '—';
    document.getElementById('popup-channel').textContent = vtuber.channel || '';
    document.getElementById('popup-channel').href = vtuber.channel || '#';
    document.getElementById('popup-long-desc').innerText = longDesc;
    document.getElementById('vtuber-popup').classList.add('active');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
}

function initGallery(images) {
    const slides     = document.getElementById('gallery-slides');
    const indicators = document.getElementById('gallery-indicators');
    slides.innerHTML     = '';
    indicators.innerHTML = '';
    images.forEach((image, index) => {
        const slide = document.createElement('div');
        slide.className = 'gallery-slide';
        slide.innerHTML = `<img src="${image}" alt="Image ${index + 1}" onerror="this.src=IMG_CDN+'/vtubers/placeholder.png'">`;
        slides.appendChild(slide);
        const dot = document.createElement('div');
        dot.className = `gallery-indicator ${index === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => goToSlide(index));
        indicators.appendChild(dot);
    });
    updateGallery();
}

function goToSlide(index) { currentSlide = index; updateGallery(); }
function nextSlide() { if (currentSlide < currentImages.length - 1) { currentSlide++; updateGallery(); } }
function prevSlide() { if (currentSlide > 0) { currentSlide--; updateGallery(); } }

function updateGallery() {
    document.getElementById('gallery-slides').style.transform = `translateX(-${currentSlide * 100}%)`;
    document.getElementById('gallery-counter').textContent = `${currentSlide + 1} / ${currentImages.length}`;
    document.getElementById('gallery-prev').disabled = currentSlide === 0;
    document.getElementById('gallery-next').disabled = currentSlide === currentImages.length - 1;
    document.querySelectorAll('.gallery-indicator').forEach((el, i) => el.classList.toggle('active', i === currentSlide));
}

function closePopup() {
    document.getElementById('vtuber-popup').classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
    currentSlide  = 0;
    currentImages = [];
}

function copySponsorCmd() {
    const codeEl = document.getElementById('sponsor-cmd-text');
    const btn    = document.getElementById('sponsor-copy-btn');
    if (!codeEl || !btn) return;
    navigator.clipboard.writeText(codeEl.textContent).then(() => {
        const span = btn.querySelector('span');
        const orig = span.textContent;
        span.textContent = '✓';
        btn.classList.add('copied');
        setTimeout(() => { span.textContent = orig; btn.classList.remove('copied'); }, 1500);
    });
}

// ── 3 SLOT IMMAGINE ───────────────────────────────────────────

function _sfSetFile(file, slot) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { _sfSetFeedback('Formato non supportato. Usa JPG, PNG, GIF o WEBP.', 'error'); return; }
    if (file.size > SF_MAX_BYTES) { _sfSetFeedback('Il file supera il limite di 15 MB.', 'error'); return; }
    sfSelectedFiles[slot] = file;
    _sfClearFeedback();
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById(`sf-preview-${slot}`);
        const img     = document.getElementById(`sf-preview-img-${slot}`);
        const inner   = document.getElementById(`sf-dropzone-inner-${slot}`);
        const fname   = document.getElementById(`sf-filename-${slot}`);
        if (img)     img.src = e.target.result;
        if (fname)   fname.textContent = file.name;
        if (preview) preview.style.display = 'flex';
        if (inner)   inner.style.display   = 'none';
    };
    reader.readAsDataURL(file);
}

function _sfResetFile(slot) {
    sfSelectedFiles[slot] = null;
    const input   = document.getElementById(`sf-image-file-${slot}`);
    const preview = document.getElementById(`sf-preview-${slot}`);
    const inner   = document.getElementById(`sf-dropzone-inner-${slot}`);
    const img     = document.getElementById(`sf-preview-img-${slot}`);
    if (input)   input.value = '';
    if (img)     img.src = '';
    if (preview) preview.style.display = 'none';
    if (inner)   inner.style.display   = 'flex';
}

function initSubmitDropzones() {
    [0, 1, 2].forEach(slot => {
        const zone      = document.getElementById(`sf-dropzone-${slot}`);
        const input     = document.getElementById(`sf-image-file-${slot}`);
        const pickBtn   = document.getElementById(`sf-pick-btn-${slot}`);
        const removeBtn = document.getElementById(`sf-remove-btn-${slot}`);
        if (!zone) return;

        // rimuove pointer-events inline che potrebbero bloccare il drag
        zone.style.pointerEvents = 'all';

        pickBtn?.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
        input?.addEventListener('change', () => { if (input.files[0]) _sfSetFile(input.files[0], slot); });
        removeBtn?.addEventListener('click', (e) => { e.stopPropagation(); _sfResetFile(slot); });

        zone.addEventListener('dragenter', (e) => { e.preventDefault(); e.stopPropagation(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragover',  (e) => { e.preventDefault(); e.stopPropagation(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', (e) => { e.stopPropagation(); zone.classList.remove('drag-over'); });
        zone.addEventListener('drop',      (e) => {
            e.preventDefault(); e.stopPropagation();
            zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) _sfSetFile(file, slot);
        });
    });
}

function _sfSetFeedback(msg, type) {
    const el = document.getElementById('sf-feedback');
    if (!el) return;
    el.textContent = msg;
    el.className = 'sf-feedback ' + type;
}

function _sfClearFeedback() {
    const el = document.getElementById('sf-feedback');
    if (!el) return;
    el.textContent = '';
    el.className = 'sf-feedback';
}

function initSubmitForm() {
    initSubmitDropzones();
    const descEl  = document.getElementById('sf-desc');
    const countEl = document.getElementById('sf-desc-count');
    if (descEl && countEl) descEl.addEventListener('input', () => { countEl.textContent = descEl.value.length; });

    const submitBtn = document.getElementById('sf-submit-btn');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', async () => {
        _sfClearFeedback();
        const name     = document.getElementById('sf-name')?.value.trim();
        const fullname = document.getElementById('sf-fullname')?.value.trim();
        const channel  = document.getElementById('sf-channel')?.value.trim();
        const hashtag  = document.getElementById('sf-hashtag')?.value.trim();
        const debut    = document.getElementById('sf-debut')?.value.trim();
        const desc     = document.getElementById('sf-desc')?.value.trim();
        const sponsor  = document.getElementById('sf-sponsor')?.value;
        const proof    = document.getElementById('sf-proof')?.value.trim();

        if (!name || !channel || !desc || !sponsor || !proof) { _sfSetFeedback('Compila tutti i campi obbligatori (*).', 'error'); return; }
        if (!sfSelectedFiles[0]) { _sfSetFeedback("L'immagine principale (slot 1) è obbligatoria.", 'error'); return; }
        if (!Auth || !Auth.isLoggedIn()) { _sfSetFeedback('Devi essere loggato per inviare una richiesta.', 'error'); return; }

        submitBtn.disabled = true;
        submitBtn.querySelector('span').textContent = 'Caricamento immagini...';
        try {
            const imageUrls = [];
            for (let i = 0; i < 3; i++) {
                if (sfSelectedFiles[i]) {
                    const url = await Api.upload.file(sfSelectedFiles[i], 'vtubers');
                    imageUrls.push(url);
                }
            }
            submitBtn.querySelector('span').textContent = 'Invio in corso...';
            const payload = { name, fullname, channel, hashtag, debut, desc, images: imageUrls, sponsor, proof };
            await Api.submit.post('vtuber', payload, imageUrls[0]);
            _sfSetFeedback('Richiesta inviata! La esamineremo il prima possibile.', 'success');
            ['sf-name','sf-fullname','sf-channel','sf-hashtag','sf-debut','sf-desc','sf-sponsor','sf-proof'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
            if (countEl) countEl.textContent = '0';
            [0, 1, 2].forEach(i => _sfResetFile(i));
        } catch (err) {
            _sfSetFeedback(err.message || "Errore durante l'invio. Riprova.", 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = 'Invia richiesta';
        }
    });
}

window.addEventListener('languageChanged', () => {
    displayVTubers();
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const t = getNestedTranslation(el.getAttribute('data-i18n'));
        if (t) el.textContent = t;
    });
});

document.addEventListener('DOMContentLoaded', () => {
    loadVTubersData();
    initSubmitForm();

    document.getElementById('popup-close')?.addEventListener('click', closePopup);
    document.getElementById('popup-overlay')?.addEventListener('click', closePopup);
    document.getElementById('gallery-prev')?.addEventListener('click', prevSlide);
    document.getElementById('gallery-next')?.addEventListener('click', nextSlide);

    document.addEventListener('keydown', (e) => {
        const popup = document.getElementById('vtuber-popup');
        if (popup?.classList.contains('active')) {
            if (e.key === 'Escape')      closePopup();
            if (e.key === 'ArrowLeft')   prevSlide();
            if (e.key === 'ArrowRight')  nextSlide();
        }
    });

    const submitBtn     = document.getElementById('submit-vtuber-btn');
    const submitPopup   = document.getElementById('submit-popup');
    const submitClose   = document.getElementById('submit-popup-close');
    const submitOverlay = document.getElementById('submit-popup-overlay');
    const submitContent = submitPopup?.querySelector('.popup-content--form');
    const sfCloseBtn    = document.getElementById('sf-close-btn');

    function openSubmitPopup() {
        submitPopup.classList.add('active');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
    }
    function closeSubmitPopup() {
        submitPopup.classList.remove('active');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = 'auto';
        _sfClearFeedback();
    }

    submitBtn?.addEventListener('click', openSubmitPopup);
    submitClose?.addEventListener('click', closeSubmitPopup);
    sfCloseBtn?.addEventListener('click', closeSubmitPopup);
    submitOverlay?.addEventListener('click', closeSubmitPopup);
    submitContent?.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSubmitPopup(); });
});
