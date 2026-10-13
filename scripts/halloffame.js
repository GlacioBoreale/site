'use strict';

(() => {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function badgeIcon(badge) {
    const b = (badge || '').toLowerCase();
    if (b.includes('bug'))   return 'fa-bug';
    if (b.includes('beta'))  return 'fa-flask';
    if (b.includes('test'))  return 'fa-vial';
    if (b.includes('art') || b.includes('design')) return 'fa-palette';
    if (b.includes('support') || b.includes('dona')) return 'fa-heart';
    if (b.includes('dev') || b.includes('code')) return 'fa-code';
    return 'fa-star';
  }

  function render(entries) {
    const grid    = document.getElementById('hof-grid');
    const loading = document.getElementById('hof-loading');
    const empty   = document.getElementById('hof-empty');
    if (loading) loading.remove();

    if (!entries.length) {
      grid.style.display = 'none';
      if (empty) empty.style.display = 'flex';
      return;
    }

    grid.innerHTML = entries.map((e, i) => `
      <div class="hof-card stagger-item" style="animation-delay:${i * 60}ms">
        <div class="hof-card-medal"><i class="fas ${badgeIcon(e.badge)}"></i></div>
        <div class="hof-card-name">${esc(e.name)}</div>
        ${e.badge ? `<span class="hof-card-badge">${esc(e.badge)}</span>` : ''}
        ${e.note ? `<p class="hof-card-note">${esc(e.note)}</p>` : ''}
      </div>
    `).join('');

    requestAnimationFrame(() => {
      grid.querySelectorAll('.hof-card').forEach(c => c.classList.add('visible'));
    });
    if (typeof applyTranslations === 'function') applyTranslations();
  }

  async function load() {
    try {
      const data = await Api.hallOfFame.get();
      render(data.hall_of_fame || []);
    } catch (e) {
      const loading = document.getElementById('hof-loading');
      if (loading) loading.textContent = 'Errore nel caricamento.';
      console.warn('Hall of Fame load failed:', e.message);
    }
  }

  document.addEventListener('DOMContentLoaded', load);
})();
