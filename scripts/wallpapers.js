'use strict';

/*
  Sistema sfondi (wallpaper) collezionabili.

  Ogni sfondo ha:
    id        identificatore univoco
    name      nome mostrato (chiave i18n: wallpapers.<id>)
    url       immagine (vuoto = sfondo "nessuno")
    opacity   opacità di default
    unlock    come si sblocca: { type, ... }

  Tipi di unlock (Fase 1 — solo locali):
    { type: 'default' }                  sempre disponibile
    { type: 'achievement', id: 'xyz' }   sbloccato se l'achievement è ottenuto

  Tipi futuri (Fase 2 — server-side, non ancora attivi):
    { type: 'game', ... }                progresso di gioco
    { type: 'gift' }                     donato da admin all'account
    { type: 'crane' }                    vinto dalla crane machine
*/

const WALLPAPERS = [
  {
    id: 'none',
    url: '',
    opacity: 1,
    unlock: { type: 'default' },
  },
  {
    id: 'mirage',
    url: 'https://glaciopia-images.s3.eu-north-1.amazonaws.com/wallpapers/mirage.png',
    opacity: 0.12,
    unlock: { type: 'default' },
  },
  {
    id: 'combo',
    url: 'https://glaciopia-images.s3.eu-north-1.amazonaws.com/wallpapers/combo.png',
    opacity: 0.15,
    unlock: { type: 'achievement', id: 'glaciopia_combo' },
  },
  {
    id: 'coin',
    url: 'https://glaciopia-images.s3.eu-north-1.amazonaws.com/wallpapers/coin.png',
    opacity: 0.15,
    unlock: { type: 'achievement', id: 'coin_flip' },
  },
  {
    id: 'konami',
    url: 'https://glaciopia-images.s3.eu-north-1.amazonaws.com/wallpapers/konami.png',
    opacity: 0.15,
    unlock: { type: 'achievement', id: 'konami' },
  },
];

const WALLPAPER_SELECTED_KEY = 'glaciopia_wallpaper';

function getSelectedWallpaperId() {
  return localStorage.getItem(WALLPAPER_SELECTED_KEY) || 'none';
}

function isWallpaperUnlocked(wp) {
  const u = wp.unlock || { type: 'default' };
  switch (u.type) {
    case 'default':
      return true;
    case 'achievement':
      return typeof isUnlocked === 'function' ? isUnlocked(u.id) : false;
    // Fase 2 — sorgenti server-side, per ora bloccate
    case 'game':
    case 'gift':
    case 'crane':
      return false;
    default:
      return false;
  }
}

function getWallpaperById(id) {
  return WALLPAPERS.find(w => w.id === id) || WALLPAPERS[0];
}

function applyWallpaper(id) {
  const wp = getWallpaperById(id);
  const unlocked = isWallpaperUnlocked(wp);
  const target = unlocked ? wp : getWallpaperById('none');

  if (target.url) {
    document.body.style.setProperty('--wallpaper', `url('${target.url}')`);
    document.body.style.setProperty('--wallpaper-opacity', String(target.opacity));
  } else {
    document.body.style.setProperty('--wallpaper', 'none');
    document.body.style.setProperty('--wallpaper-opacity', '1');
  }
}

function selectWallpaper(id) {
  const wp = getWallpaperById(id);
  if (!isWallpaperUnlocked(wp)) return false;
  localStorage.setItem(WALLPAPER_SELECTED_KEY, id);
  applyWallpaper(id);
  return true;
}

function initWallpaper() {
  applyWallpaper(getSelectedWallpaperId());
}

document.addEventListener('DOMContentLoaded', initWallpaper);
