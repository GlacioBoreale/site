async function loadSocialsData() {
    try {
        const response = await fetch('./assets/data/api_cache.json');
        if (!response.ok) throw new Error('Errore caricamento dati');
        const data = await response.json();
        renderTwitch(data.twitch);
        renderYouTube(data.youtube);
    } catch (error) {
        console.error('Errore nel caricamento dei dati social:', error);
    }
}

function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(currentLang || 'it', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function renderTwitch(twitch) {
    // Avatar e nome
    const avatar = document.getElementById('twitch-avatar');
    if (avatar && twitch.profileImage) avatar.src = twitch.profileImage;

    const name = document.getElementById('twitch-name');
    if (name) name.textContent = twitch.displayName;

    const followers = document.getElementById('twitch-followers');
    if (followers) followers.textContent = formatNumber(twitch.followers);

    // Pallino stato nell'header
    const statusDot = document.getElementById('twitch-status-dot');
    const statusLabel = document.getElementById('twitch-status-label');
    if (twitch.isLive) {
        statusDot?.classList.add('is-live');
        statusLabel.textContent = getNestedTranslation('socials.liveNow') || 'LIVE';
        statusLabel.classList.add('is-live');
    } else {
        statusDot?.classList.add('is-offline');
        statusLabel.textContent = getNestedTranslation('socials.offline') || 'OFFLINE';
    }

    // Media: mostra player o immagine offline
    const liveEmbed = document.getElementById('twitch-live-embed');
    const offlineMedia = document.getElementById('twitch-offline-media');

    // Controllo freschezza dati
    if (window._socialsCache?.updatedAt) {
        const ageMin = (Date.now() - new Date(window._socialsCache.updatedAt)) / 60000;
        if (ageMin > 90) {
            const dot = document.getElementById('twitch-status-dot');
            if (dot) dot.title = 'Dati potrebbero non essere aggiornati (cache > 90 min)';
        }
    }

    if (twitch.isLive) {
        liveEmbed.style.display = 'block';
        offlineMedia.style.display = 'none';
        const embed = document.getElementById('twitch-embed');
        if (embed) embed.src = `https://player.twitch.tv/?channel=glacioborealevt&parent=${window.location.hostname}&autoplay=false`;
    } else {
        liveEmbed.style.display = 'none';
        offlineMedia.style.display = 'block';
        const offlineImg = document.getElementById('twitch-offline-img');
        if (offlineImg) {
            // Usa sempre l'immagine locale, l'API come fallback
            offlineImg.src = 'assets/images/twitchOffline.png';
            offlineImg.onerror = () => {
                if (twitch.offlineImage) offlineImg.src = twitch.offlineImage;
                else offlineImg.style.display = 'none';
            };
        }
    }

    // Pannello destra: titolo + categoria (solo se live, altrimenti nascondi)
    const sideInfo = document.getElementById('twitch-side-info');
    if (sideInfo) sideInfo.style.display = twitch.isLive ? 'flex' : 'none';

    if (twitch.isLive) {
        // Titolo
        const titleEl = document.getElementById('live-title');
        if (titleEl) titleEl.textContent = twitch.stream.title || '';

        // Categoria
        const gameEl = document.getElementById('live-game');
        const gameBox = document.getElementById('live-game-box');
        if (gameEl) gameEl.textContent = twitch.stream.game || '';
        if (gameBox && twitch.stream.gameBoxArt) gameBox.src = twitch.stream.gameBoxArt;
        else if (gameBox) gameBox.style.display = 'none';

        // Spettatori
        const viewersSpan = document.querySelector('#live-viewers span');
        if (viewersSpan) viewersSpan.textContent = formatNumber(twitch.stream.viewers) + ' spettatori';

        // Uptime
        if (twitch.stream.startedAt) {
            const diff = Math.floor((Date.now() - new Date(twitch.stream.startedAt)) / 1000);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const uptimeEl = document.getElementById('live-uptime');
            if (uptimeEl) uptimeEl.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
        }
    }

    // Clip in basso — sempre visibili (top 3)
    const clipsGrid = document.getElementById('twitch-clips-grid');
    if (clipsGrid) {
        const clips = twitch.topClips || [];
        if (clips.length === 0) {
            clipsGrid.innerHTML = '<p style="color:rgba(255,255,255,0.3);font-size:0.85rem;">Nessuna clip disponibile</p>';
        } else {
            clipsGrid.innerHTML = clips.map(clip => `
                <a href="${clip.url}" target="_blank" class="clip-card-mini">
                    <img src="${clip.thumbnail}" alt="${clip.title}" class="clip-thumb-mini" onerror="this.style.display='none'">
                    <div class="clip-info-mini">
                        <div class="clip-title-mini">${clip.title}</div>
                        <div class="clip-stats-mini">
                            <span><i class="fas fa-eye"></i> ${formatNumber(clip.views)}</span>
                            <span><i class="fas fa-clock"></i> ${formatDuration(clip.duration)}</span>
                        </div>
                    </div>
                </a>
            `).join('');
        }
    }
}

function renderYouTube(youtube) {
    const avatar = document.getElementById('yt-avatar');
    if (avatar && youtube.thumbnail) avatar.src = youtube.thumbnail;

    const name = document.getElementById('yt-name');
    if (name) name.textContent = youtube.displayName;

    const subs = document.getElementById('yt-subscribers');
    if (subs) subs.textContent = formatNumber(youtube.subscribers);

    const videosEl = document.getElementById('yt-videos');
    if (videosEl && youtube.recentVideos && youtube.recentVideos.length > 0) {
        videosEl.innerHTML = youtube.recentVideos.map(v => `
            <a href="${v.url}" target="_blank" class="yt-video-card">
                <img src="${v.thumbnail}" alt="${v.title}" class="yt-thumb" onerror="this.style.display='none'">
                <div class="yt-video-info">
                    <div class="yt-video-title">${v.title}</div>
                    <div class="yt-video-meta">
                        ${v.viewCount ? `<span class="yt-views"><i class="fas fa-eye"></i> ${formatNumber(v.viewCount)}</span>` : ''}
                        <span class="yt-video-date">${formatDate(v.publishedAt)}</span>
                    </div>
                </div>
            </a>
        `).join('');
    }
}

window.addEventListener('languageChanged', () => {
    // Ricarica le date nel formato della nuova lingua
    const cache = window._socialsCache;
    if (cache) renderYouTube(cache.youtube);
});

document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('./assets/data/api_cache.json').catch(() => null);
    if (response && response.ok) {
        const data = await response.json();
        window._socialsCache = data;
        renderTwitch(data.twitch);
        renderYouTube(data.youtube);
    }
});
