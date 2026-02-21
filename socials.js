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

function staggerReveal(items, delayStep = 100) {
    items.forEach((el, i) => {
        el.classList.add('stagger-item');
        setTimeout(() => el.classList.add('visible'), i * delayStep);
    });
}

function renderTwitch(twitch) {
    const avatar = document.getElementById('twitch-avatar');
    if (avatar && twitch.profileImage) avatar.src = twitch.profileImage;

    const name = document.getElementById('twitch-name');
    if (name) name.textContent = twitch.displayName;

    const followers = document.getElementById('twitch-followers');
    if (followers) followers.textContent = formatNumber(twitch.followers);

    const liveEmbed   = document.getElementById('twitch-live-embed');
    const offlineMedia = document.getElementById('twitch-offline-media');

    if (twitch.isLive) {
        liveEmbed.style.display   = 'block';
        offlineMedia.style.display = 'none';
        const embed = document.getElementById('twitch-embed');
        if (embed) embed.src = `https://player.twitch.tv/?channel=glacioborealevt&parent=${window.location.hostname}&autoplay=false`;
    } else {
        liveEmbed.style.display   = 'none';
        offlineMedia.style.display = 'block';
        const offlineImg = document.getElementById('twitch-offline-img');
        if (offlineImg) {
            offlineImg.src = 'assets/images/twitchOffline.png';
            offlineImg.onerror = () => {
                if (twitch.offlineImage) offlineImg.src = twitch.offlineImage;
                else offlineImg.style.display = 'none';
            };
        }
    }

    const sideInfo = document.getElementById('twitch-side-info');
    if (sideInfo) sideInfo.style.display = twitch.isLive ? 'flex' : 'none';

    if (twitch.isLive && twitch.stream) {
        const titleEl = document.getElementById('live-title');
        if (titleEl) titleEl.textContent = twitch.stream.title || '';

        const gameEl  = document.getElementById('live-game');
        const gameBox = document.getElementById('live-game-box');
        if (gameEl) gameEl.textContent = twitch.stream.game || '';
        if (gameBox && twitch.stream.gameBoxArt) gameBox.src = twitch.stream.gameBoxArt;
        else if (gameBox) gameBox.style.display = 'none';

        const viewersSpan = document.querySelector('#live-viewers span');
        if (viewersSpan) viewersSpan.textContent = formatNumber(twitch.stream.viewers) + ' spettatori';

        if (twitch.stream.startedAt) {
            const diff = Math.floor((Date.now() - new Date(twitch.stream.startedAt)) / 1000);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const uptimeEl = document.getElementById('live-uptime');
            if (uptimeEl) uptimeEl.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
        }
    }

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
    if (videosEl && youtube.recentVideos?.length > 0) {
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

function revealSections() {
    const sections = document.querySelectorAll('.platform-section, .small-platforms');
    staggerReveal([...sections], 120);
}

window.addEventListener('languageChanged', () => {
    const cache = window._socialsData;
    if (cache) renderYouTube(cache.youtube);
});

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('./assets/data/api_cache.json');
        if (!response.ok) throw new Error('api_cache.json non disponibile');
        const data = await response.json();

        window._socialsData = data;
        renderTwitch(data.twitch);
        renderYouTube(data.youtube);
        revealSections();

    } catch (e) {
        console.error('[Socials] Errore caricamento dati:', e);
        revealSections();
    }
});
