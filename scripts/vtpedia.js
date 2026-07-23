let vtubers       = [];
let currentSlide  = 0;
let currentImages = [];

const MAX_FILE_SIZE  = 15 * 1024 * 1024;
let selectedImages   = [null, null, null];

async function loadVTubers() {
    const grid = document.getElementById('vtuber-grid');
    grid.innerHTML = '<div class="page-loading">Caricamento...</div>';
    try {
        const data = await Api.vtubers.get();
        vtubers = data.vtubers || [];
        if (!vtubers.length) throw new Error('empty');
    } catch {
        try {
            const res = await fetch('./assets/data/vtubers.json');
            if (!res.ok) throw new Error();
            vtubers = (await res.json()).vtubers?.filter(v => !v.isCTA) || [];
        } catch {
            vtubers = [];
        }
    }
    renderVTubers();
}

function renderVTubers() {
    const grid = document.getElementById('vtuber-grid');
    grid.innerHTML = '';
    if (!vtubers.length) {
        grid.innerHTML = '<p style="color:rgba(255,255,255,0.7);text-align:center;grid-column:1/-1">Nessun VTuber disponibile al momento.</p>';
        return;
    }
    vtubers.forEach((v, i) => grid.appendChild(buildVTuberCard(v, i)));
    grid.appendChild(buildCTACard(vtubers.length));
}

function buildCTACard(index) {
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

function buildVTuberCard(vtuber, index) {
    const card      = document.createElement('div');
    card.className  = 'vtuber-card stagger-item';
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
    card.addEventListener('click', () => openVTuberCard(vtuber));
    const img    = card.querySelector('img');
    const reveal = () => setTimeout(() => card.classList.add('visible'), index * 80);
    if (img.complete) reveal();
    else { img.addEventListener('load', reveal, { once: true }); img.addEventListener('error', reveal, { once: true }); }
    return card;
}

function openVTuberCard(vtuber) {
    currentImages = vtuber.images?.length ? vtuber.images : [IMG_CDN + '/vtubers/placeholder.png'];
    currentSlide  = 0;
    initGallery(currentImages);
    const desc = vtuber.longDesc || vtuber.shortDesc || vtuber.desc
        || (vtuber.longDescKey ? getNestedTranslation(vtuber.longDescKey) : '') || '';
    document.getElementById('popup-name').textContent      = vtuber.name;
    document.getElementById('popup-full-name').textContent = vtuber.fullName || vtuber.name;
    document.getElementById('popup-debut').textContent     = vtuber.debut || '—';
    document.getElementById('popup-hashtag').textContent   = vtuber.hashtag || '—';
    document.getElementById('popup-channel').textContent   = vtuber.channel || '';
    document.getElementById('popup-channel').href          = vtuber.channel || '#';
    document.getElementById('popup-long-desc').innerText   = desc;
    document.getElementById('vtuber-popup').classList.add('active');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
}

function closeVTuberCard() {
    document.getElementById('vtuber-popup').classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
    currentSlide  = 0;
    currentImages = [];
}

function initGallery(images) {
    const slides     = document.getElementById('gallery-slides');
    const indicators = document.getElementById('gallery-indicators');
    slides.innerHTML = indicators.innerHTML = '';
    images.forEach((src, i) => {
        const slide = document.createElement('div');
        slide.className = 'gallery-slide';
        slide.innerHTML = `<img src="${src}" alt="Immagine ${i + 1}" onerror="this.src=IMG_CDN+'/vtubers/placeholder.png'">`;
        slides.appendChild(slide);
        const dot = document.createElement('div');
        dot.className = `gallery-indicator ${i === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => goToSlide(i));
        indicators.appendChild(dot);
    });
    refreshGallery();
}

function goToSlide(index) { currentSlide = index; refreshGallery(); }
function nextSlide() { if (currentSlide < currentImages.length - 1) { currentSlide++; refreshGallery(); } }
function prevSlide() { if (currentSlide > 0) { currentSlide--; refreshGallery(); } }

function refreshGallery() {
    document.getElementById('gallery-slides').style.transform = `translateX(-${currentSlide * 100}%)`;
    document.getElementById('gallery-counter').textContent    = `${currentSlide + 1} / ${currentImages.length}`;
    document.getElementById('gallery-prev').disabled = currentSlide === 0;
    document.getElementById('gallery-next').disabled = currentSlide === currentImages.length - 1;
    document.querySelectorAll('.gallery-indicator').forEach((el, i) => el.classList.toggle('active', i === currentSlide));
}

function setVTuberFile(file, slot) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFeedback('Formato non supportato. Usa JPG, PNG, GIF o WEBP.', 'error'); return; }
    if (file.size > MAX_FILE_SIZE)       { setFeedback('Il file supera il limite di 15 MB.', 'error'); return; }
    selectedImages[slot] = file;
    clearFeedback();
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById(`sf-preview-${slot}`);
        const img     = document.getElementById(`sf-preview-img-${slot}`);
        const inner   = document.getElementById(`sf-dropzone-inner-${slot}`);
        const fname   = document.getElementById(`sf-filename-${slot}`);
        if (img)     img.src                = e.target.result;
        if (fname)   fname.textContent      = file.name;
        if (preview) preview.style.display  = 'flex';
        if (inner)   inner.style.display    = 'none';
    };
    reader.readAsDataURL(file);
}

function resetVTuberFile(slot) {
    selectedImages[slot] = null;
    const input   = document.getElementById(`sf-image-file-${slot}`);
    const preview = document.getElementById(`sf-preview-${slot}`);
    const inner   = document.getElementById(`sf-dropzone-inner-${slot}`);
    const img     = document.getElementById(`sf-preview-img-${slot}`);
    if (input)   input.value           = '';
    if (img)     img.src               = '';
    if (preview) preview.style.display = 'none';
    if (inner)   inner.style.display   = 'flex';
}

function setFeedback(msg, type) {
    const el = document.getElementById('sf-feedback');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'sf-feedback ' + type;
}

function clearFeedback() {
    const el = document.getElementById('sf-feedback');
    if (!el) return;
    el.textContent = '';
    el.className   = 'sf-feedback';
}

function initImageDropzones() {
    [0, 1, 2].forEach(slot => {
        const zone      = document.getElementById(`sf-dropzone-${slot}`);
        const input     = document.getElementById(`sf-image-file-${slot}`);
        const pickBtn   = document.getElementById(`sf-pick-btn-${slot}`);
        const removeBtn = document.getElementById(`sf-remove-btn-${slot}`);
        if (!zone) return;
        zone.style.pointerEvents = 'all';
        pickBtn?.addEventListener('click',  (e) => { e.stopPropagation(); input.click(); });
        input?.addEventListener('change',   () => { if (input.files[0]) setVTuberFile(input.files[0], slot); });
        removeBtn?.addEventListener('click',(e) => { e.stopPropagation(); resetVTuberFile(slot); });
        zone.addEventListener('dragenter', (e) => { e.preventDefault(); e.stopPropagation(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragover',  (e) => { e.preventDefault(); e.stopPropagation(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', (e) => { e.stopPropagation(); zone.classList.remove('drag-over'); });
        zone.addEventListener('drop',      (e) => {
            e.preventDefault(); e.stopPropagation();
            zone.classList.remove('drag-over');
            if (e.dataTransfer.files[0]) setVTuberFile(e.dataTransfer.files[0], slot);
        });
    });
}

function initSubmitForm() {
    initImageDropzones();

    const descEl  = document.getElementById('sf-desc');
    const countEl = document.getElementById('sf-desc-count');
    if (descEl && countEl) descEl.addEventListener('input', () => { countEl.textContent = descEl.value.length; });

    const btn = document.getElementById('sf-submit-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        clearFeedback();
        const name     = document.getElementById('sf-name')?.value.trim();
        const fullname = document.getElementById('sf-fullname')?.value.trim();
        const channel  = document.getElementById('sf-channel')?.value.trim();
        const hashtag  = document.getElementById('sf-hashtag')?.value.trim();
        const debut    = document.getElementById('sf-debut')?.value.trim();
        const desc     = document.getElementById('sf-desc')?.value.trim();

        if (!name || !channel || !desc) { setFeedback('Compila tutti i campi obbligatori (*).', 'error'); return; }
        if (!selectedImages[0]) { setFeedback("L'immagine principale (slot 1) è obbligatoria.", 'error'); return; }
        if (!Auth?.isLoggedIn()) { setFeedback('Devi essere loggato per inviare una richiesta.', 'error'); return; }

        btn.disabled = true;
        btn.querySelector('span').textContent = 'Caricamento immagini...';
        try {
            const urls = [];
            for (let i = 0; i < 3; i++) {
                if (selectedImages[i]) urls.push(await Api.upload.file(selectedImages[i], 'vtubers'));
            }
            btn.querySelector('span').textContent = 'Invio in corso...';
            await Api.submit.post('vtuber', { name, fullname, channel, hashtag, debut, desc, images: urls }, urls[0]);
            setFeedback('Richiesta inviata! La esamineremo il prima possibile.', 'success');
            ['sf-name','sf-fullname','sf-channel','sf-hashtag','sf-debut','sf-desc'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
            if (countEl) countEl.textContent = '0';
            [0, 1, 2].forEach(i => resetVTuberFile(i));
        } catch (e) {
            setFeedback(e.message || "Errore durante l'invio. Riprova.", 'error');
        } finally {
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Invia richiesta';
        }
    });
}

window.addEventListener('languageChanged', () => {
    renderVTubers();
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const val = getNestedTranslation(el.getAttribute('data-i18n'));
        if (val) el.textContent = val;
    });
});

document.addEventListener('DOMContentLoaded', () => {
    loadVTubers();
    initSubmitForm();

    document.getElementById('popup-close')?.addEventListener('click', closeVTuberCard);
    document.getElementById('popup-overlay')?.addEventListener('click', closeVTuberCard);
    document.getElementById('gallery-prev')?.addEventListener('click', prevSlide);
    document.getElementById('gallery-next')?.addEventListener('click', nextSlide);

    document.addEventListener('keydown', (e) => {
        const popup = document.getElementById('vtuber-popup');
        if (!popup?.classList.contains('active')) return;
        if (e.key === 'Escape')      closeVTuberCard();
        if (e.key === 'ArrowLeft')   prevSlide();
        if (e.key === 'ArrowRight')  nextSlide();
    });

    const submitBtn     = document.getElementById('submit-vtuber-btn');
    const submitPopup   = document.getElementById('submit-popup');
    const submitContent = submitPopup?.querySelector('.popup-content--form');

    function openSubmitPopup() {
        submitPopup.classList.add('active');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
    }
    function closeSubmitPopup() {
        submitPopup.classList.remove('active');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = 'auto';
        clearFeedback();
    }

    submitBtn?.addEventListener('click', openSubmitPopup);
    document.getElementById('submit-popup-close')?.addEventListener('click', closeSubmitPopup);
    document.getElementById('sf-close-btn')?.addEventListener('click', closeSubmitPopup);
    document.getElementById('submit-popup-overlay')?.addEventListener('click', closeSubmitPopup);
    submitContent?.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSubmitPopup(); });
});
