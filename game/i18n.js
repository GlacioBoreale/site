'use strict';

function gt(key) {
  const val = ('game.' + key).split('.').reduce((obj, k) => obj?.[k], translations);
  return (val && typeof val === 'string') ? val : '';
}

function applyGameTranslations() {
  const s = (id) => document.getElementById(id);
  const q = (sel) => document.querySelector(sel);

  // Panel titles
  [
    ['panel-settings',     'sidebar.settings'],
    ['panel-stats',        'sidebar.stats'],
    ['panel-achievements', 'sidebar.achievements'],
    ['panel-leaderboard',  'sidebar.leaderboard'],
  ].forEach(([id, key]) => {
    const panel = s(id);
    if (!panel) return;
    const titleEl = panel.querySelector('.panel-title');
    if (!titleEl) return;
    const text = gt(key);
    if (!text) return;
    const icon = titleEl.querySelector('.panel-title-icon');
    titleEl.childNodes.forEach(n => { if (n.nodeType === Node.TEXT_NODE) n.remove(); });
    titleEl.appendChild(document.createTextNode(' ' + text));
  });

  // Sidebar buttons
  [
    ['settings',     'sidebar.settings'],
    ['stats',        'sidebar.stats'],
    ['achievements', 'sidebar.achievements'],
    ['leaderboard',  'sidebar.leaderboard'],
    ['updatelog',    'sidebar.updatelog'],
    ['maintenance',  'sidebar.maintenance'],
  ].forEach(([id, key]) => {
    const label = q('#sb-btn-' + id + ' .sb-label');
    const text = gt(key);
    if (label && text) label.textContent = text;
  });

  // Settings tabs
  [
    ['general',  'settings.tabGeneral'],
    ['graphics', 'settings.tabGraphics'],
    ['audio',    'settings.tabAudio'],
    ['keybinds', 'settings.tabKeybinds'],
    ['misc',     'settings.tabMisc'],
  ].forEach(([tab, key]) => {
    const el = q(`#panel-settings .stab[data-tab="${tab}"]`);
    const text = gt(key);
    if (el && text) el.textContent = text;
  });

  // Settings sections
  [
    ['sectionDisplay',  'settings.sectionDisplay'],
    ['sectionGameplay', 'settings.sectionGameplay'],
    ['sectionTheme',    'settings.sectionTheme'],
    ['sectionNodes',    'settings.sectionNodes'],
    ['sectionRadio',    'settings.sectionRadio'],
    ['sectionCamera',   'settings.sectionCamera'],
    ['sectionPartita',  'settings.sectionPartita'],
  ].forEach(([i18nKey, translationKey]) => {
    const el = q(`#panel-settings .set-section[data-i18n="settings.${i18nKey}"]`);
    const text = gt(translationKey);
    if (el && text) el.textContent = text;
  });

  // Settings labels — [elementId, labelKey, sublabelKey?]
  // Per le label con span (valore numerico), aggiorna solo il primo text node
  [
    ['set-statDisplayMode',    'settings.numFormat',        'settings.numFormatHint'],
    ['set-uiScale',            'settings.uiScale',          null],
    ['set-currencyInterval',   'settings.currencyUpdate',   'settings.currencyUpdateHint'],
    ['set-buyMaxEnabled',      'settings.buyMax',           'settings.buyMaxHint'],
    ['set-buyMaxBoards',       'settings.buyMaxBoards',     null],
    ['set-buyMaxPointUpgrades','settings.buyMaxPoints',     null],
    ['set-useGameCursor',      'settings.gameCursor',       'settings.gameCursorHint'],
    ['set-lightTheme',         'settings.lightTheme',       null],
    ['set-showConnections',    'settings.showConnections',  null],
    ['set-showGrid',           'settings.showGrid',         null],
    ['set-radioVolume',        'settings.radioVolume',      null],
    ['set-radioMuted',         'settings.radioMuted',       null],
    ['set-reset-btn',          'settings.resetLabel',       'settings.resetHint'],
  ].forEach(([elId, labelKey, sublabelKey]) => {
    const el = s(elId);
    if (!el) return;
    const row = el.closest('.set-row');
    if (!row) return;

    const label = row.querySelector('.set-label');
    const text = gt(labelKey);
    if (label && text) {
      const firstText = [...label.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
      if (firstText) firstText.textContent = text + ' ';
      else label.insertBefore(document.createTextNode(text + ' '), label.firstChild);
    }

    if (sublabelKey) {
      const sublabel = row.querySelector('.set-sublabel');
      const subtext = gt(sublabelKey);
      if (sublabel && subtext) sublabel.textContent = subtext;
    }
  });

  // Select options
  const numFmt = s('set-statDisplayMode');
  if (numFmt) {
    const abbr = gt('settings.numAbbr');
    const sci  = gt('settings.numSci');
    if (abbr) numFmt.options[0].text = abbr;
    if (sci)  numFmt.options[1].text = sci;
  }

  // Reset button text
  const resetBtn = s('set-reset-btn');
  if (resetBtn) {
    const text = gt('settings.resetBtn');
    if (text) resetBtn.innerHTML = `<i class="fas fa-rotate-left"></i> ${text}`;
  }

  // Keybind labels
  [
    ['settings.recenterKey', 'Home'],
    ['settings.menuKey',     'Tab'],
  ].forEach(([key, keybind]) => {
    const text = gt(key);
    if (!text) return;
    document.querySelectorAll('#panel-settings .set-keybind').forEach(el => {
      if (el.textContent.trim() !== keybind) return;
      const label = el.closest('.set-row')?.querySelector('.set-label');
      if (label) label.textContent = text;
    });
  });

  // Stats tabs
  [
    ['currencies', 'stats.tabCurrencies'],
    ['levels',     'stats.tabLevels'],
    ['other',      'stats.tabOther'],
  ].forEach(([tab, key]) => {
    const el = q(`.stats-tab[data-stab="${tab}"]`);
    const text = gt(key);
    if (el && text) el.textContent = text;
  });

  // Leaderboard tabs
  [
    ['points',   'lb.tabPoints'],
    ['prestige', 'lb.tabPrestige'],
    ['xp_level', 'lb.tabXp'],
  ].forEach(([tab, key]) => {
    const el = q(`.lb-tab[data-lbtab="${tab}"]`);
    const text = gt(key);
    if (el && text) el.textContent = text;
  });

  // Stats globals
  window._gt_pinned    = gt('stats.pinned');
  window._gt_session   = gt('stats.sessionTime');
  window._gt_total     = gt('stats.totalTime');
  window._gt_prestiges = gt('stats.prestiges');

  // Convert panel
  const cvTitle = q('.convert-title');
  const cvBtn   = s('btn-convert');
  if (cvTitle) { const t = gt('convert.title'); if (t) cvTitle.textContent = t; }
  if (cvBtn)   { const t = gt('convert.btn');   if (t) cvBtn.textContent = t; }

  const cvDesc = q('.convert-desc');
  if (cvDesc) {
    const desc = gt('convert.desc');
    const rp   = gt('convert.researchPoints');
    if (desc && rp) cvDesc.innerHTML = desc.replace(rp, `<span>${rp}</span>`);
  }

  // Reset modal
  const modalTitle   = q('.modal-title');
  const modalDesc    = q('.modal-desc');
  const resetConfirm = s('reset-confirm');
  const resetCancel2 = s('reset-cancel2');
  if (modalTitle)   { const t = gt('reset.title');   if (t) modalTitle.textContent = t; }
  if (modalDesc)    { const t = gt('reset.desc');    if (t) modalDesc.textContent = t; }
  if (resetConfirm) { const t = gt('reset.confirm'); if (t) resetConfirm.textContent = t; }
  if (resetCancel2) { const t = gt('reset.cancel');  if (t) resetCancel2.textContent = t; }

  // Leveling panel
  applyLevelingTranslations();
}

function applyLevelingTranslations() {
  const lp = document.getElementById('leveling-panel');
  if (!lp) return;

  const header = lp.querySelector('#lp-header');
  const btn    = document.getElementById('lp-btn');
  const desc   = document.getElementById('lp-desc');

  if (header) { const t = gt('leveling.title'); if (t) header.textContent = t; }
  if (btn)    { const t = gt('leveling.btn');   if (t) btn.textContent = t; }

  if (desc) {
    const text = gt('leveling.desc');
    const sub  = gt('leveling.descReset');
    if (!text) return;
    const lines = text.split('\n');
    desc.innerHTML = lines.map((l, i) => {
      if (i === 1) return l
        .replace(/(Esperienza|Experience|Experiență)/i, s => `<span style="color:#4ade80">${s}</span>`)
        .replace(/(Livelli|Levels|Niveluri)/i,          s => `<span style="color:#4ade80">${s}</span>`);
      return l;
    }).join('<br>') + (sub ? `<br><span style="color:rgba(255,255,255,0.3);font-size:.67rem">${sub}</span>` : '');
  }
}

window.addEventListener('languageChanged', applyGameTranslations);
