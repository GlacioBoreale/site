let vtubers = [];
let currentSlide = 0;
let currentImages = [];

async function loadVTubersData() {
    try {
        const response = await fetch('./assets/data/vtubers.json');
        if (!response.ok) throw new Error('Errore caricamento dati');
        const data = await response.json();
        vtubers = data.vtubers;
        displayVTubers();
    } catch (error) {
        console.error('Errore nel caricamento dei VTuber:', error);
        const grid = document.getElementById('vtuber-grid');
        grid.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; grid-column: 1/-1;">Nessun VTuber disponibile al momento.</p>';
    }
}

function displayVTubers() {
    const grid = document.getElementById('vtuber-grid');
    grid.innerHTML = '';

    if (vtubers.length === 0) {
        grid.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; grid-column: 1/-1;">Nessun VTuber disponibile.</p>';
        return;
    }

    vtubers.forEach((vtuber, index) => {
        const card = createVTuberCard(vtuber, index);
        grid.appendChild(card);
    });

    if (typeof updateContent === 'function') updateContent();
}

function createVTuberCard(vtuber, index) {
    const card = document.createElement('div');
    card.className = 'vtuber-card stagger-item';

    const firstImage = vtuber.images?.[0] || 'assets/images/vtubers/placeholder.png';
    const shortDesc = getNestedTranslation(vtuber.shortDescKey) || vtuber.shortDescKey;
    const showMoreText = getNestedTranslation('vtpedia.showMore') || 'Mostra di più';

    card.innerHTML = `
        <div class="card-image">
            <img src="${firstImage}" alt="${vtuber.name}" onerror="this.src='assets/images/vtubers/placeholder.png'">
            <div class="added-date">Added: ${vtuber.addedDate}</div>
        </div>
        <div class="card-content">
            <h3 class="vtuber-name">${vtuber.name}</h3>
            <p class="vtuber-desc">${shortDesc}</p>
            <button class="show-more-btn">
                <i class="fas fa-chevron-down"></i>
                <span data-i18n="vtpedia.showMore">${showMoreText}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
        </div>
    `;

    card.addEventListener('click', () => openPopup(vtuber));

    // Aspetta che l'immagine sia caricata, poi fa il fade-in con delay scaglionato
    const img = card.querySelector('img');
    const reveal = () => {
        setTimeout(() => card.classList.add('visible'), index * 80);
    };

    if (img.complete) {
        reveal();
    } else {
        img.addEventListener('load', reveal, { once: true });
        img.addEventListener('error', reveal, { once: true });
    }

    return card;
}

function openPopup(vtuber) {
    const popup = document.getElementById('vtuber-popup');

    currentImages = vtuber.images?.length > 0 ? vtuber.images : ['assets/images/vtubers/placeholder.png'];
    currentSlide = 0;

    initGallery(currentImages);

    const longDesc = getNestedTranslation(vtuber.longDescKey) || vtuber.longDescKey;

    document.getElementById('popup-name').textContent = vtuber.name;
    document.getElementById('popup-full-name').textContent = vtuber.fullName;
    document.getElementById('popup-debut').textContent = vtuber.debut;
    document.getElementById('popup-hashtag').textContent = vtuber.hashtag;
    document.getElementById('popup-channel').textContent = vtuber.channel;
    document.getElementById('popup-channel').href = vtuber.channel;
    document.getElementById('popup-long-desc').innerText = longDesc;

    popup.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function initGallery(images) {
    const slidesContainer = document.getElementById('gallery-slides');
    const indicatorsContainer = document.getElementById('gallery-indicators');

    slidesContainer.innerHTML = '';
    indicatorsContainer.innerHTML = '';

    images.forEach((image, index) => {
        const slide = document.createElement('div');
        slide.className = 'gallery-slide';
        slide.innerHTML = `<img src="${image}" alt="Image ${index + 1}" onerror="this.src='assets/images/vtubers/placeholder.png'">`;
        slidesContainer.appendChild(slide);

        const indicator = document.createElement('div');
        indicator.className = `gallery-indicator ${index === 0 ? 'active' : ''}`;
        indicator.addEventListener('click', () => goToSlide(index));
        indicatorsContainer.appendChild(indicator);
    });

    updateGallery();
}

function goToSlide(index) {
    currentSlide = index;
    updateGallery();
}

function nextSlide() {
    if (currentSlide < currentImages.length - 1) {
        currentSlide++;
        updateGallery();
    }
}

function prevSlide() {
    if (currentSlide > 0) {
        currentSlide--;
        updateGallery();
    }
}

function updateGallery() {
    const slidesContainer = document.getElementById('gallery-slides');
    const counter = document.getElementById('gallery-counter');
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');
    const indicators = document.querySelectorAll('.gallery-indicator');

    slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
    counter.textContent = `${currentSlide + 1} / ${currentImages.length}`;

    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide === currentImages.length - 1;

    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentSlide);
    });
}

function closePopup() {
    const popup = document.getElementById('vtuber-popup');
    popup.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentSlide = 0;
    currentImages = [];
}

function copySponsorCmd() {
    const text = document.getElementById('sponsor-cmd-text').textContent;
    const btn = document.getElementById('sponsor-copy-btn');
    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        btn.querySelector('i').className = 'fas fa-check';
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.querySelector('i').className = 'fas fa-copy';
        }, 2000);
    });
}

window.addEventListener('languageChanged', () => {
    displayVTubers();
});

document.addEventListener('DOMContentLoaded', () => {
    loadVTubersData();

    const popupClose = document.getElementById('popup-close');
    const popupOverlay = document.getElementById('popup-overlay');
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');

    if (popupClose) popupClose.addEventListener('click', closePopup);
    if (popupOverlay) popupOverlay.addEventListener('click', closePopup);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    document.addEventListener('keydown', (e) => {
        const popup = document.getElementById('vtuber-popup');
        if (popup.classList.contains('active')) {
            if (e.key === 'Escape') closePopup();
            if (e.key === 'ArrowLeft') prevSlide();
            if (e.key === 'ArrowRight') nextSlide();
        }
    });

    const submitBtn = document.getElementById('submit-vtuber-btn');
    const submitPopup = document.getElementById('submit-popup');
    const submitClose = document.getElementById('submit-popup-close');
    const submitOverlay = document.getElementById('submit-popup-overlay');

    function openSubmitPopup() {
        submitPopup.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeSubmitPopup() {
        submitPopup.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    if (submitBtn) submitBtn.addEventListener('click', openSubmitPopup);
    if (submitClose) submitClose.addEventListener('click', closeSubmitPopup);
    if (submitOverlay) submitOverlay.addEventListener('click', closeSubmitPopup);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSubmitPopup();
    });
});

function copySponsorCmd() {
    const codeEl = document.getElementById('sponsor-cmd-text');
    const btn = document.getElementById('sponsor-copy-btn');
    if (!codeEl || !btn) return;

    const text = codeEl.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const span = btn.querySelector('span');
        const originalText = span.textContent;
        span.textContent = '✓';
        btn.classList.add('copied');
        setTimeout(() => {
            span.textContent = originalText;
            btn.classList.remove('copied');
        }, 1500);
    }).catch(() => {
        const range = document.createRange();
        range.selectNodeContents(codeEl);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    });
}
