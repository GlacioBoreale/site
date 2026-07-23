'use strict';

const LANG_COLORS = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python:     '#3572A5',
    HTML:       '#e34c26',
    CSS:        '#563d7c',
    Java:       '#b07219',
    'C++':      '#f34b7d',
    C:          '#555555',
    'C#':       '#178600',
    Go:         '#00ADD8',
    Rust:       '#dea584',
    Ruby:       '#701516',
    PHP:        '#4F5D95',
    Shell:      '#89e051',
    Vue:        '#41b883',
    Swift:      '#F05138',
    Kotlin:     '#A97BFF',
    Dart:       '#00B4AB',
    Lua:        '#000080',
};

function langColor(lang) {
    return LANG_COLORS[lang] || '#888';
}

function tr(key, fallback) {
    if (typeof getNestedTranslation === 'function') {
        return getNestedTranslation(key) || fallback;
    }
    return fallback;
}

function relativeDate(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days <= 0)   return tr('projects.today', 'oggi');
    if (days === 1)  return tr('projects.yesterday', 'ieri');
    if (days < 30)   return `${days} ${tr('projects.daysAgo', 'giorni fa')}`;
    if (days < 365) {
        const m = Math.floor(days / 30);
        return `${m} ${tr('projects.monthsAgo', 'mesi fa')}`;
    }
    const y = Math.floor(days / 365);
    return `${y} ${tr('projects.yearsAgo', 'anni fa')}`;
}

function buildRepoCard(repo) {
    const card = document.createElement('a');
    card.className = 'repo-card';
    card.href      = repo.url;
    card.target    = '_blank';
    card.rel       = 'noopener noreferrer';

    const updatedLabel = tr('projects.updated', 'Aggiornato');

    const meta = [];
    if (repo.language) {
        meta.push(`<span class="repo-meta-item">
            <span class="repo-lang-dot" style="background:${langColor(repo.language)}"></span>${repo.language}
        </span>`);
    }
    if (repo.stars > 0) {
        meta.push(`<span class="repo-meta-item"><i class="fas fa-star"></i> ${repo.stars}</span>`);
    }
    if (repo.forks > 0) {
        meta.push(`<span class="repo-meta-item"><i class="fas fa-code-branch"></i> ${repo.forks}</span>`);
    }
    if (repo.pushed_at) {
        meta.push(`<span class="repo-meta-item"><i class="fas fa-clock"></i> ${updatedLabel} ${relativeDate(repo.pushed_at)}</span>`);
    }

    const topics = (repo.topics || []).slice(0, 5)
        .map(t => `<span class="repo-topic">${t}</span>`).join('');

    const links = [`
        <span class="repo-link-btn repo-link-repo">
            <i class="fab fa-github"></i> Repo
        </span>`];
    if (repo.homepage) {
        links.unshift(`
            <a class="repo-link-btn repo-link-live" href="${repo.homepage}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">
                <i class="fas fa-arrow-up-right-from-square"></i> Live
            </a>`);
    }

    card.innerHTML = `
        ${repo.preview ? `<div class="repo-card-cover">
            <img src="${repo.preview}" alt="${repo.name}" loading="lazy" onerror="this.closest('.repo-card-cover').remove()">
        </div>` : ''}
        <div class="repo-card-left">
            <div class="repo-card-header">
                <i class="fas fa-folder repo-card-icon"></i>
                <span class="repo-card-name">${repo.name}</span>
            </div>
            ${repo.description ? `<p class="repo-card-desc">${repo.description}</p>` : ''}
            <div class="repo-card-meta">${meta.join('')}</div>
            ${topics ? `<div class="repo-topics">${topics}</div>` : ''}
        </div>
        <div class="repo-card-right">${links.join('')}</div>
    `;

    return card;
}

function renderRepos(repos) {
    const list = document.getElementById('projects-list');
    if (!list) return;
    list.innerHTML = '';

    if (!repos.length) {
        list.innerHTML = `<div class="projects-empty">${tr('projects.empty', 'Nessun progetto da mostrare al momento.')}</div>`;
        return;
    }

    repos.forEach((repo, i) => {
        const card = buildRepoCard(repo);
        list.appendChild(card);
        setTimeout(() => card.classList.add('visible'), i * 80);
    });
}

function setUpdatedLabel(iso) {
    const el = document.getElementById('projects-updated');
    if (!el || !iso) return;
    const label = tr('projects.lastSync', 'Ultima sincronizzazione');
    el.textContent = `${label}: ${relativeDate(iso)}`;
}

async function loadRepos() {
    const list = document.getElementById('projects-list');
    if (list) {
        list.innerHTML = `<div class="projects-loading"><i class="fas fa-circle-notch fa-spin"></i><p>Caricamento progetti...</p></div>`;
    }
    try {
        const data = await Api.repos.get();
        window._reposData = data;
        renderRepos(data.repos || []);
        setUpdatedLabel(data.updated_at);
    } catch (e) {
        console.error('[Projects] Errore caricamento repo:', e);
        renderRepos([]);
    }
}

window.addEventListener('languageChanged', () => {
    const cache = window._reposData;
    if (cache) {
        renderRepos(cache.repos || []);
        setUpdatedLabel(cache.updated_at);
    }
});

document.addEventListener('DOMContentLoaded', loadRepos);
