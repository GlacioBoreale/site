'use strict';

function gt(key) {
  const full = 'game.' + key;
  return full.split('.').reduce((obj, k) => obj?.[k], translations) ?? full.split('.').pop();
}

window.addEventListener('languageChanged', () => {
  applyGameTranslations();
});

function applyGameTranslations() {
  // HTML statico in game.html
  const cvTitle = document.querySelector('.convert-title');
  if (cvTitle) cvTitle.textContent = gt('convert.title');

  const cvDesc = document.querySelector('.convert-desc');
  if (cvDesc) cvDesc.innerHTML = gt('convert.desc').replace(
    gt('convert.researchPoints'),
    `<span>${gt('convert.researchPoints')}</span>`
  );

  const cvBtn = document.getElementById('btn-convert');
  if (cvBtn) cvBtn.textContent = gt('convert.btn');

  const modalTitle = document.querySelector('.modal-title');
  if (modalTitle) modalTitle.textContent = gt('reset.title');

  const modalDesc = document.querySelector('.modal-desc');
  if (modalDesc) modalDesc.textContent = gt('reset.desc');

  const resetConfirm = document.getElementById('reset-confirm');
  if (resetConfirm) resetConfirm.textContent = gt('reset.confirm');

  const resetCancel2 = document.getElementById('reset-cancel2');
  if (resetCancel2) resetCancel2.textContent = gt('reset.cancel');

  // Sidebar labels
  const sidebarMap = {
    'settings':    'sidebar.settings',
    'stats':       'sidebar.stats',
    'achievements':'sidebar.achievements',
    'leaderboard': 'sidebar.leaderboard',
    'updatelog':   'sidebar.updatelog',
    'maintenance': 'sidebar.maintenance',
  };
  Object.entries(sidebarMap).forEach(([id, key]) => {
    const btn = document.getElementById('sb-btn-' + id);
    if (btn) {
      const label = btn.querySelector('.sb-label');
      if (label) label.textContent = gt(key);
    }
  });

  // Panel titles
  applyPanelTitle('panel-settings',     'sidebar.settings');
  applyPanelTitle('panel-stats',        'sidebar.stats');
  applyPanelTitle('panel-achievements', 'sidebar.achievements');
  applyPanelTitle('panel-leaderboard',  'sidebar.leaderboard');

  // Settings tabs
  applyStab('general',  'settings.tabGeneral');
  applyStab('graphics', 'settings.tabGraphics');
  applyStab('audio',    'settings.tabAudio');
  applyStab('keybinds', 'settings.tabKeybinds');
  applyStab('misc',     'settings.tabMisc');

  // Settings labels
  applySetLabel('set-statDisplayMode',   'settings.numFormat',     'settings.numFormatHint');
  applySetLabel('set-uiScale',           'settings.uiScale');
  applySetLabel('set-currencyInterval',  'settings.currencyUpdate','settings.currencyUpdateHint');
  applySetLabel('set-buyMaxEnabled',     'settings.buyMax',        'settings.buyMaxHint');
  applySetLabel('set-buyMaxBoards',      'settings.buyMaxBoards');
  applySetLabel('set-buyMaxPointUpgrades','settings.buyMaxPoints');
  applySetLabel('set-useGameCursor',     'settings.gameCursor',    'settings.gameCursorHint');
  applySetLabel('set-lightTheme',        'settings.lightTheme');
  applySetLabel('set-showConnections',   'settings.showConnections');
  applySetLabel('set-showGrid',          'settings.showGrid');
  applySetLabel('set-radioVolume',       'settings.radioVolume');
  applySetLabel('set-radioMuted',        'settings.radioMuted');
  applySetLabel('set-reset-btn',         'settings.resetLabel',    'settings.resetHint');

  // Settings select options
  const numFmt = document.getElementById('set-statDisplayMode');
  if (numFmt) {
    numFmt.options[0].text = gt('settings.numAbbr');
    numFmt.options[1].text = gt('settings.numSci');
  }

  // Settings section headers
  applySetSection('settings.sectionDisplay');
  applySetSection('settings.sectionGameplay');
  applySetSection('settings.sectionTheme');
  applySetSection('settings.sectionNodes');
  applySetSection('settings.sectionRadio');
  applySetSection('settings.sectionCamera');
  applySetSection('settings.sectionPartita');

  // Keybinds labels
  applyKeybindLabel('settings.recenterKey', 'Home');
  applyKeybindLabel('settings.menuKey', 'Tab');

  // Reset danger btn text
  const resetDangerBtn = document.getElementById('set-reset-btn');
  if (resetDangerBtn) resetDangerBtn.innerHTML = `<i class="fas fa-rotate-left"></i> ${gt('settings.resetBtn')}`;

  // Stats tabs
  applyStatTab('currencies', 'stats.tabCurrencies');
  applyStatTab('levels',     'stats.tabLevels');
  applyStatTab('other',      'stats.tabOther');

  // Stats pin count suffix
  window._gt_pinned   = gt('stats.pinned');
  window._gt_session  = gt('stats.sessionTime');
  window._gt_total    = gt('stats.totalTime');
  window._gt_prestiges = gt('stats.prestiges');

  // Leaderboard tabs
  applyLbTab('points',    'lb.tabPoints');
  applyLbTab('prestige',  'lb.tabPrestige');
  applyLbTab('xp_level',  'lb.tabXp');

  // Leveling panel (se esiste)
  applyLevelingTranslations();
}

function applyPanelTitle(panelId, key) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const titleEl = panel.querySelector('.panel-title');
  if (titleEl) {
    const icon = titleEl.querySelector('.panel-title-icon');
    titleEl.childNodes.forEach(n => { if (n.nodeType === 3) n.textContent = ' ' + gt(key); });
    if (!icon) titleEl.textContent = gt(key);
  }
}

function applyStab(tab, key) {
  const el = document.querySelector(`#panel-settings .stab[data-tab="${tab}"]`);
  if (el) el.textContent = gt(key);
}

function applySetLabel(checkboxId, labelKey, sublabelKey) {
  const checkbox = document.getElementById(checkboxId);
  if (!checkbox) return;
  const row = checkbox.closest('.set-row') || checkbox.closest('.set-slider-wrap')?.closest('.set-row');
  if (!row) return;
  const label = row.querySelector('.set-label');
  const sublabel = row.querySelector('.set-sublabel');
  if (label) {
    // preserva span interni (es. valore numerico)
    const span = label.querySelector('span');
    if (span) {
      label.childNodes.forEach(n => { if (n.nodeType === 3) n.textContent = gt(labelKey) + ' '; });
    } else {
      label.firstChild && label.firstChild.nodeType === 3
        ? label.firstChild.textContent = gt(labelKey)
        : label.textContent = gt(labelKey);
    }
  }
  if (sublabel && sublabelKey) sublabel.textContent = gt(sublabelKey);
}

function applySetSection(key) {
  const el = document.querySelector(`#panel-settings .set-section[data-sec-key="${key}"]`);
  if (el) el.textContent = gt(key);
}

function applyKeybindLabel(key, keybind) {
  document.querySelectorAll('#panel-settings .set-keybind').forEach(el => {
    if (el.textContent === keybind) {
      const row = el.closest('.set-row');
      if (row) {
        const label = row.querySelector('.set-label');
        if (label) label.textContent = gt(key);
      }
    }
  });
}

function applyStatTab(tab, key) {
  const el = document.querySelector(`.stats-tab[data-stab="${tab}"]`);
  if (el) el.textContent = gt(key);
}

function applyLbTab(tab, key) {
  const el = document.querySelector(`.lb-tab[data-lbtab="${tab}"]`);
  if (el) el.textContent = gt(key);
}

function applyLevelingTranslations() {
  const lp = document.getElementById('leveling-panel');
  if (!lp) return;

  const header = lp.querySelector('#lp-header');
  if (header) header.textContent = gt('leveling.title');

  const btn = document.getElementById('lp-btn');
  if (btn) btn.textContent = gt('leveling.btn');

  const desc = document.getElementById('lp-desc');
  if (desc) {
    const lines = gt('leveling.desc').split('\n');
    desc.innerHTML = lines.map((l, i) => {
      if (i === 1) return l
        .replace(/(Esperienza|Experience|Experien\u021b\u0103)/i, s => `<span style="color:#4ade80">${s}</span>`)
        .replace(/(Livelli|Levels|Niveluri)/i, s => `<span style="color:#4ade80">${s}</span>`);
      return l;
    }).join('<br>') + `<br><span style="color:rgba(255,255,255,0.3);font-size:.67rem">${gt('leveling.descReset')}</span>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyGameTranslations();
});
