'use strict';

(function() {
  const WORD    = 'GLACIOPIA';
  const CDN     = 'https://glaciopia-logo3d.s3.eu-north-1.amazonaws.com';
  const HIT_MAX = 6;

  let progress   = 0;
  let resetTimer = null;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ac         = null;
  const buffers  = {};

  function getAC() {
    if (!ac) ac = new AudioCtx();
    return ac;
  }

  async function loadBuffer(url) {
    if (buffers[url]) return buffers[url];
    try {
      const res  = await fetch(url);
      const data = await res.arrayBuffer();
      const buf  = await getAC().decodeAudioData(data);
      buffers[url] = buf;
      return buf;
    } catch(e) {}
  }

  function playBuffer(url, volume = 0.7) {
    const buf = buffers[url];
    if (!buf) return;
    try {
      const ctx    = getAC();
      const source = ctx.createBufferSource();
      const gain   = ctx.createGain();
      source.buffer = buf;
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    } catch(e) {}
  }

  function playTick(index) {
    const n = Math.min(index + 1, HIT_MAX);
    playBuffer(`${CDN}/hit${n}.mp3`);
  }

  function playComplete() {
    playBuffer(`${CDN}/comboComplete.mp3`, 0.85);
  }

  function preload() {
    getAC();
    for (let i = 1; i <= HIT_MAX; i++) loadBuffer(`${CDN}/hit${i}.mp3`);
    loadBuffer(`${CDN}/comboComplete.mp3`);
  }

  function init() {
    const container = document.getElementById('glaciopia-3d');
    if (!container) return;

    const letters = container.querySelectorAll('.gl-letter');

    preload();

    document.addEventListener('keydown', (e) => {
      if (ac?.state === 'suspended') ac.resume();

      if (!e.getModifierState('CapsLock')) return;
      const key = e.key.toUpperCase();
      if (key.length !== 1) return;

      const expected = WORD[progress];

      if (key !== expected) {
        if (progress > 0) {
          progress = 0;
          letters.forEach(l => l.classList.remove('lit', 'complete'));
          clearTimeout(resetTimer);
        }
        return;
      }

      const letter  = letters[progress];
      const isLast  = progress === WORD.length - 1;
      progress++;

      if (isLast) {
        letter.classList.remove('lit', 'complete');
        void letter.offsetWidth;
        letter.classList.add('complete');

        letters.forEach((l, i) => {
          if (i < WORD.length - 1) {
            l.classList.remove('lit');
            void l.offsetWidth;
            l.classList.add('complete');
          }
        });

        playComplete();

        setTimeout(() => {
          if (typeof unlockAchievement === 'function') {
            unlockAchievement('glaciopia_combo');
          }
        }, 1000);

        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          progress = 0;
          letters.forEach(l => l.classList.remove('lit', 'complete'));
        }, 4000);
      } else {
        letter.classList.remove('lit', 'complete');
        void letter.offsetWidth;
        letter.classList.add('lit');

        playTick(progress - 1);

        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          progress = 0;
          letters.forEach(l => l.classList.remove('lit', 'complete'));
        }, 5000);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
