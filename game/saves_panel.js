'use strict';

const SAVES_KEY               = 'glaciopia_saves';
const SAVES_META_KEY          = 'glaciopia_saves_meta';
const AUTOSAVE_KEY            = 'glaciopia_autosave';

const AUTOSAVE_INTERVAL_MS    = 3 * 60 * 1000;
const SLOT_ACTION_DELAY_MS    = 30 * 1000;
const DEFAULT_CHANGE_DELAY_MS = 30 * 60 * 1000;
const HOLD_CONFIRM_MS         = 15 * 1000;
const HEALTH_CLEAR_MS         = 10 * 1000;

let _autosaveTimer    = null;
let _slotCooldowns    = {};
let _defaultCooldown  = 0;
let _holdTimer        = null;
let _holdInterval     = null;
let _healthClearTimer = null;
let _holdInited       = false;
let _pendingDefault   = null;

function _fmtSlotTime(sec) {
  if (!sec) return '—';
  sec = Math.floor(sec);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d + 'd ' + String(h).padStart(2, '0') + 'h:' + String(m).padStart(2, '0') + 'm';
}

function _loadSlotsMeta() {
  try { return JSON.parse(localStorage.getItem(SAVES_META_KEY)) || {}; } catch { return {}; }
}

function _saveSlotsMeta(meta) {
  localStorage.setItem(SAVES_META_KEY, JSON.stringify(meta));
}

function _getSlotData(slot) {
  try { return JSON.parse(localStorage.getItem(SAVES_KEY + '_' + slot)); } catch { return null; }
}

function _setSlotData(slot, data) {
  localStorage.setItem(SAVES_KEY + '_' + slot, JSON.stringify(data));
}

function _deleteSlotData(slot) {
  localStorage.removeItem(SAVES_KEY + '_' + slot);
}

function _getAutosaveData() {
  try { return JSON.parse(localStorage.getItem(AUTOSAVE_KEY)); } catch { return null; }
}

function _setAutosaveData(data) {
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
}

function _deleteAutosaveData() {
  localStorage.removeItem(AUTOSAVE_KEY);
}

function _isCoolingDown(key) {
  return (_slotCooldowns[key] || 0) > Date.now();
}

function _setCooldown(key) {
  _slotCooldowns[key] = Date.now() + SLOT_ACTION_DELAY_MS;
}

function _setPendingDefault(slot) {
  _pendingDefault = slot;
  _updateHoldBtn();
  _updateHighlight();
}

function _clearPendingDefault() {
  _pendingDefault = null;
  _updateHoldBtn();
  _updateHighlight();
}

function _updateHoldBtn() {
  const label = document.getElementById('sv-hold-label');
  const btn   = document.getElementById('sv-hold-btn');
  if (!label || !btn) return;
  if (_pendingDefault !== null) {
    label.textContent = 'Tieni premuto per confermare le modifiche';
    btn.disabled = false;
    btn.classList.add('sv-hold-btn--pending');
  } else {
    label.textContent = 'Tieni premuto per confermare le modifiche';
    btn.disabled = true;
    btn.classList.remove('sv-hold-btn--pending');
  }
}

function _updateHighlight() {
  document.querySelectorAll('.sv-slot-row').forEach(row => row.classList.remove('sv-slot-row--pending'));
  if (_pendingDefault === null) return;
  const target = document.querySelector('.sv-slot-row[data-slot="' + _pendingDefault + '"]');
  if (target) target.classList.add('sv-slot-row--pending');
}

function buildSavesPanel() {
  return `
<div class="game-panel" id="panel-saves">
  <div class="panel-header">
    <span class="panel-title">
      <div class="panel-title-icon si-c-saves"><i class="fas fa-floppy-disk"></i></div>
      Salvataggi
    </span>
    <button class="panel-close"><i class="fas fa-times"></i></button>
  </div>
  <div class="panel-body sv-body">
    <div class="sv-slots" id="sv-slots"></div>
    <div class="sv-divider"></div>
    <div class="sv-autosave-row">
      <div class="sv-slot-left">
        <span class="sv-slot-icon--auto"><i class="fas fa-rotate"></i></span>
        <div class="sv-slot-info">
          <span class="sv-slot-name">Autosave</span>
          <span class="sv-slot-time" id="sv-auto-time">—</span>
        </div>
      </div>
      <div class="sv-slot-actions">
        <button class="sv-btn sv-btn-load" id="sv-auto-load" title="Carica" disabled><i class="fas fa-file-import"></i></button>
        <button class="sv-btn sv-btn-del"  id="sv-auto-del"  title="Elimina" disabled><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="sv-divider"></div>
    <button class="sv-hold-btn" id="sv-hold-btn" disabled>
      <div class="sv-hold-fill" id="sv-hold-fill"></div>
      <span class="sv-hold-label" id="sv-hold-label">Tieni premuto per confermare le modifiche</span>
    </button>
    <div class="sv-health" id="sv-health"></div>
  </div>
</div>`;
}

function initSavesPanel() {
  _renderSlots();
  _refreshAutosaveRow();
  if (!_holdInited) {
    _initHoldBtn();
    _holdInited = true;
  }
  _updateHoldBtn();
  _updateHighlight();
  if (!_autosaveTimer) _startAutosaveLoop();
}

function _renderSlots() {
  const meta      = _loadSlotsMeta();
  const container = document.getElementById('sv-slots');
  if (!container) return;

  container.innerHTML = '';

  for (let i = 1; i <= 3; i++) {
    const data      = _getSlotData(i);
    const isDefault = (meta.defaultSlot || 1) === i;
    const isEmpty   = !data;
    const timeSec   = data?.totalTimeSec || null;
    const isPending = _pendingDefault === i;

    const row = document.createElement('div');
    row.className = 'sv-slot-row' + (isPending ? ' sv-slot-row--pending' : '');
    row.dataset.slot = i;

    row.innerHTML =
      '<button class="sv-default-btn' + (isDefault ? ' sv-default-btn--active' : '') + '" data-slot="' + i + '" title="' + (isDefault ? 'Salvataggio predefinito' : 'Imposta come predefinito') + '">' +
        '<i class="' + (isDefault ? 'fas' : 'far') + ' fa-star"></i>' +
      '</button>' +
      '<div class="sv-slot-left">' +
        '<div class="sv-slot-info">' +
          '<span class="sv-slot-name">Save #' + i + (isEmpty ? ' <span class="sv-slot-empty">— vuoto</span>' : '') + '</span>' +
          '<span class="sv-slot-time">' + (timeSec !== null ? _fmtSlotTime(timeSec) : '') + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="sv-slot-actions">' +
        '<button class="sv-btn sv-btn-save" data-slot="' + i + '" title="Salva"><i class="fas fa-floppy-disk"></i></button>' +
        '<button class="sv-btn sv-btn-load" data-slot="' + i + '" title="Carica"' + (isEmpty ? ' disabled' : '') + '><i class="fas fa-file-import"></i></button>' +
        '<button class="sv-btn sv-btn-del"  data-slot="' + i + '" title="Elimina"' + (isEmpty ? ' disabled' : '') + '><i class="fas fa-trash"></i></button>' +
      '</div>';

    container.appendChild(row);
  }

  _attachSlotListeners();
}

function _refreshAutosaveRow() {
  const data    = _getAutosaveData();
  const timeEl  = document.getElementById('sv-auto-time');
  const loadBtn = document.getElementById('sv-auto-load');
  const delBtn  = document.getElementById('sv-auto-del');
  if (timeEl)  timeEl.textContent = data?.totalTimeSec ? _fmtSlotTime(data.totalTimeSec) : '—';
  if (loadBtn) loadBtn.disabled = !data;
  if (delBtn)  delBtn.disabled  = !data;
}

function _attachSlotListeners() {
  document.querySelectorAll('.sv-default-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = +btn.dataset.slot;
      const meta = _loadSlotsMeta();
      if ((meta.defaultSlot || 1) === slot) return;
      if (_defaultCooldown > Date.now()) {
        _showHealth('Attendi prima di cambiare il predefinito.', false);
        return;
      }
      if (_pendingDefault === slot) { _clearPendingDefault(); return; }
      _setPendingDefault(slot);
    });
  });

  document.querySelectorAll('.sv-btn-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = +btn.dataset.slot;
      const key  = 'save_' + slot;
      if (_isCoolingDown(key)) { _showHealth('Attendi 30s prima di salvare di nuovo.', false); return; }
      const save = buildSaveObj();
      save._savedAt = Date.now();
      _setSlotData(slot, save);
      _setCooldown(key);
      _renderSlots();
      _showHealth('Slot ' + slot + ' salvato.', true);
    });
  });

  document.querySelectorAll('.sv-btn-load').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = +btn.dataset.slot;
      const key  = 'load_' + slot;
      if (_isCoolingDown(key)) { _showHealth('Attendi 30s prima di caricare di nuovo.', false); return; }
      const data = _getSlotData(slot);
      if (!data) return;
      applysave(data);
      saveGame();
      _setCooldown(key);
      _showHealth('Slot ' + slot + ' caricato.', true);
    });
  });

  document.querySelectorAll('.sv-btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = +btn.dataset.slot;
      if (!_getSlotData(slot)) return;
      _deleteSlotData(slot);
      const meta = _loadSlotsMeta();
      if ((meta.defaultSlot || 1) === slot) { meta.defaultSlot = 1; _saveSlotsMeta(meta); }
      if (_pendingDefault === slot) _clearPendingDefault();
      _renderSlots();
      _showHealth('Slot ' + slot + ' eliminato.', true);
    });
  });

  document.getElementById('sv-auto-load')?.addEventListener('click', () => {
    const key = 'load_auto';
    if (_isCoolingDown(key)) { _showHealth('Attendi 30s prima di caricare di nuovo.', false); return; }
    const data = _getAutosaveData();
    if (!data) return;
    applysave(data);
    saveGame();
    _setCooldown(key);
    _showHealth('Autosave caricato.', true);
  });

  document.getElementById('sv-auto-del')?.addEventListener('click', () => {
    if (!_getAutosaveData()) return;
    _deleteAutosaveData();
    _refreshAutosaveRow();
    _showHealth('Autosave eliminato.', true);
  });
}

function _initHoldBtn() {
  const btn  = document.getElementById('sv-hold-btn');
  const fill = document.getElementById('sv-hold-fill');
  if (!btn || !fill) return;

  function _resetHold() {
    clearTimeout(_holdTimer);
    clearInterval(_holdInterval);
    _holdTimer    = null;
    _holdInterval = null;
    fill.style.transition = 'width 0.25s ease';
    fill.style.width      = '0%';
    btn.classList.remove('sv-hold-btn--active');
  }

  function _startHold() {
    if (btn.disabled || _holdTimer) return;
    btn.classList.add('sv-hold-btn--active');
    fill.style.transition = 'none';
    const start = Date.now();

    _holdInterval = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / HOLD_CONFIRM_MS) * 100);
      fill.style.width = pct + '%';
    }, 30);

    _holdTimer = setTimeout(() => {
      clearInterval(_holdInterval);
      _holdInterval = null;
      fill.style.width = '100%';
      btn.classList.remove('sv-hold-btn--active');
      _applyPendingDefault();
      setTimeout(() => {
        fill.style.transition = 'width 0.4s ease';
        fill.style.width      = '0%';
      }, 400);
      _holdTimer = null;
    }, HOLD_CONFIRM_MS);
  }

  btn.addEventListener('mousedown',   _startHold);
  btn.addEventListener('touchstart',  _startHold, { passive: true });
  btn.addEventListener('mouseup',     _resetHold);
  btn.addEventListener('mouseleave',  _resetHold);
  btn.addEventListener('touchend',    _resetHold);
  btn.addEventListener('touchcancel', _resetHold);
}

function _applyPendingDefault() {
  if (_pendingDefault === null) return;
  const slot = _pendingDefault;
  const meta = _loadSlotsMeta();
  meta.defaultSlot = slot;
  _saveSlotsMeta(meta);
  _defaultCooldown = Date.now() + DEFAULT_CHANGE_DELAY_MS;
  _clearPendingDefault();
  _renderSlots();
  _showHealth('Slot ' + slot + ' impostato come predefinito.', true);
}

function _showHealth(msg, ok) {
  const el = document.getElementById('sv-health');
  if (!el) return;
  el.textContent = (ok ? '✓ ' : '✗ ') + msg;
  el.className   = 'sv-health ' + (ok ? 'sv-health--ok' : 'sv-health--error');
  if (_healthClearTimer) clearTimeout(_healthClearTimer);
  _healthClearTimer = setTimeout(() => {
    if (el) { el.textContent = ''; el.className = 'sv-health'; }
  }, HEALTH_CLEAR_MS);
}

function _doAutosave() {
  const save = buildSaveObj();
  save._savedAt = Date.now();
  _setAutosaveData(save);
  _refreshAutosaveRow();
}

function _startAutosaveLoop() {
  _doAutosave();
  _autosaveTimer = setInterval(_doAutosave, AUTOSAVE_INTERVAL_MS);
}
