'use strict';

const PLAYLISTS = [
  {
    id: 'progression',
    name: 'Progression',
    color: '#bb3ac4',
    tracks: [
    { title: 'Cerebrawl', artist: 'TRACK 1 // supershigi', src: AUDIO_CDN + '/radio/Progression/Cerebrawl.mp3' },
    ],
  },
  {
    id: 'generic1',
    name: 'Averpyxl\'s Jam',
    color: '#c47a3a',
    tracks: [
      { title: 'you win again', artist: 'vehiculersspamton - untitled tag game', src: AUDIO_CDN + '/radio/Generic1/you_win_again.mp3' },
      { title: 'c u l8tr aligator', artist: 'fearless - untitled tag game', src: AUDIO_CDN + '/radio/Generic1/c_u_l8tr_aligator.mp3' },
      { title: 'Tag U', artist: 'boxed - untitled tag game', src: AUDIO_CDN + '/radio/Generic1/tag_u.mp3' },
      { title: 'On Board', artist: 'Funki', src: AUDIO_CDN + '/radio/Generic1/on_board.mp3' },
      { title: 'Picnic', artist: 'kupi', src: AUDIO_CDN + '/radio/Generic1/picnic.mp3' },
      { title: 'Bloxy Blox V2', artist: 'kupi - untitled tag game', src: AUDIO_CDN + '/radio/Generic1/Bloxy_Blox_V2.mp3' },
      { title: 'telecaster', artist: 'hazerred (ft. palm)', src: AUDIO_CDN + '/radio/Generic1/telecaster.mp3' },
      { title: 'go long', artist: 'hazerred', src: AUDIO_CDN + '/radio/Generic1/go_long.mp3' },
      { title: 'SODA STREED', artist: 'boxed', src: AUDIO_CDN + '/radio/Generic1/soda_street.mp3' },
      { title: 'crashout (Tag Mix)', artist: 'nicopatty - untitled tag game', src: AUDIO_CDN + '/radio/Generic1/crashout_tag_mix.mp3' },
      { title: 'Last Man Standing', artist: 'Deltom - untitled tag game', src: AUDIO_CDN + '/radio/Generic1/last_man_standing.mp3' },
      { title: 'chill out', artist: 'sprites', src: AUDIO_CDN + '/radio/Generic1/old_chill_out.mp3' },
    ],
  },
  {
    id: 'generic2',
    name: 'Generic Music Pack #2',
    color: '#4a7fc4',
    tracks: [],
  },
  {
    id: 'eromonfire',
    name: 'Eromonfire FM',
    color: '#c43a6a',
    tracks: [
      { title: 'Iced Up', artist: 'Eromo', src: AUDIO_CDN + '/radio/Eromonfire/iceup.mp3' },
    ],
  },
  {
    id: 'goofy_pack',
    name: 'Goofy Pack',
    color: '#54c44a',
    tracks: [
      { title: 'Im Goofing It', artist: 'Eromo', src: AUDIO_CDN + '/radio/goofy_pack/goofy_song.mp3' },
    ],
  },
  {
    id: 'ncs',
    name: 'NCS',
    color: '#c4c44a',
    tracks: [
      { title: 'Hope', artist: 'Tobu', src: AUDIO_CDN + '/radio/NCS/hope.mp3' },
      { title: 'Infectious', artist: 'Tobu', src: AUDIO_CDN + '/radio/NCS/infectious.mp3' },
      { title: 'Retro Respawn', artist: 'Octave', src: AUDIO_CDN + '/radio/NCS/retro_respawn.mp3' },
    ],
  },
];

const Radio = (() => {
  let currentPlaylist = 0;
  let currentTrack   = 0;
  let isPlaying      = false;
  let isLooping      = false;
  let showPlaylist   = false;
  let showTrackList  = false;
  let hasEverPlayed  = false;
  let rafId          = null;

  const audio = new Audio();
  audio.volume = 0.8;
  audio.muted   = false;

  audio.addEventListener('ended', () => {
    if (isLooping) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      nextTrack();
    }
  });

  function currentTracks() { return PLAYLISTS[currentPlaylist].tracks; }

  function loadAndPlay(resumeTime) {
    const tracks = currentTracks();
    if (!tracks.length) { audio.src = ''; isPlaying = false; updateUI(); return; }
    if (currentTrack >= tracks.length) currentTrack = 0;
    const newSrc = tracks[currentTrack].src;
    if (audio.src !== new URL(newSrc, location.href).href) {
      audio.src = newSrc;
      audio.load();
    }
    if (resumeTime) audio.currentTime = resumeTime;
    if (!hasEverPlayed) { updateUI(); return; }
    audio.play().catch(() => {});
    isPlaying = true;
    startProgress();
    updateUI();
  }

  function play() {
    if (isPlaying) return;
    hasEverPlayed = true;
    const tracks = currentTracks();
    if (!tracks.length) return;
    if (currentTrack >= tracks.length) currentTrack = 0;
    const newSrc = tracks[currentTrack].src;
    if (audio.src !== new URL(newSrc, location.href).href) {
      audio.src = newSrc;
      audio.load();
    }
    audio.play().catch(() => {});
    isPlaying = true;
    startProgress();
    updateUI();
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    stopProgress();
    updateUI();
  }

  function nextTrack() {
    const tracks = currentTracks();
    if (!tracks.length) return;
    currentTrack = (currentTrack + 1) % tracks.length;
    loadAndPlay();
  }

  function prevTrack() {
    const tracks = currentTracks();
    if (!tracks.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; tickProgress(); return; }
    currentTrack = (currentTrack - 1 + tracks.length) % tracks.length;
    loadAndPlay();
  }

  function nextPlaylist() {
    currentPlaylist = (currentPlaylist + 1) % PLAYLISTS.length;
    currentTrack = 0;
    loadAndPlay();
  }

  function prevPlaylist() {
    currentPlaylist = (currentPlaylist - 1 + PLAYLISTS.length) % PLAYLISTS.length;
    currentTrack = 0;
    loadAndPlay();
  }

  function selectTrack(idx) {
    currentTrack = idx;
    showTrackList = false;
    loadAndPlay();
  }

  function selectPlaylist(idx) {
    currentPlaylist = idx;
    currentTrack   = 0;
    showPlaylist   = false;
    loadAndPlay();
  }

  function toggleLoop() {
    isLooping = !isLooping;
    updateUI();
  }

  function fmtTime(s) {
    if (!isFinite(s)) return '0:00';
    const m  = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return m + ':' + ss;
  }

  function tickProgress() {
    const bar = document.getElementById('radio-progress-fill');
    const cur = document.getElementById('radio-time-cur');
    const dur = document.getElementById('radio-time-dur');
    if (!bar) return;
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    bar.style.width = pct + '%';
    if (cur) cur.textContent = fmtTime(audio.currentTime);
    if (dur) dur.textContent = fmtTime(audio.duration);
  }

  function startProgress() {
    stopProgress();
    function loop() { tickProgress(); rafId = requestAnimationFrame(loop); }
    rafId = requestAnimationFrame(loop);
  }

  function stopProgress() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function buildTrackListHTML() {
    const tracks = currentTracks();
    if (!tracks.length) return '<div class="radio-tl-empty">Nessuna traccia</div>';
    return tracks.map((t, i) =>
      '<div class="radio-tl-item' + (i === currentTrack ? ' active' : '') + '" data-tidx="' + i + '">' +
        '<span class="radio-tl-num">' + (i + 1) + '</span>' +
        '<span class="radio-tl-title">' + t.title + '</span>' +
      '</div>'
    ).join('');
  }

  function updateUI() {
    const pl     = PLAYLISTS[currentPlaylist];
    const tracks = currentTracks();
    const track  = tracks[currentTrack];

    const playBtn = document.getElementById('radio-playpause');
    if (playBtn) playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';

    const loopBtn = document.getElementById('radio-loop');
    if (loopBtn) loopBtn.classList.toggle('active', isLooping);

    const loopLabel = document.getElementById('radio-loop-label');
    if (loopLabel) loopLabel.style.display = isLooping ? '' : 'none';

    const artImg  = document.getElementById('radio-art-img');
    const artDisc = document.getElementById('radio-art-disc');
    if (artImg) {
      const slug = pl.id.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      const src  = IMG_CDN + '/radio/' + slug + '.png';
      if (artImg.dataset.src !== src) {
        artImg.dataset.src = src;
        // fade out entrambi prima del cambio
        artImg.style.opacity  = '0';
        if (artDisc) artDisc.style.opacity = '0';
        artImg.onerror = () => {
          // nessuna immagine: mostra SVG
          artImg.style.opacity  = '0';
          if (artDisc) artDisc.style.opacity = '0.75';
        };
        artImg.onload = () => {
          // immagine ok: fade in img, fade out SVG
          artImg.style.opacity  = '1';
          if (artDisc) artDisc.style.opacity = '0';
        };
        artImg.src = src;
      }
    }

    const art = document.getElementById('radio-art');
    if (art) art.style.background = pl.color;

    const plName = document.getElementById('radio-pl-name');
    if (plName) {
      const total = tracks.length;
      const idx   = total ? currentTrack + 1 : 0;
      plName.textContent = pl.name + ' (' + idx + '/' + (total || '\u2014') + ')';
    }

    const title = document.getElementById('radio-track-title');
    if (title) title.textContent = track ? track.title : '\u2014';

    const artist = document.getElementById('radio-track-artist');
    if (artist) artist.textContent = track ? (track.artist || pl.name) : pl.name;

    const plPanel = document.getElementById('radio-playlist-panel');
    if (plPanel) plPanel.classList.toggle('open', showPlaylist);

    const tlPanel = document.getElementById('radio-tracklist-panel');
    if (tlPanel) {
      tlPanel.classList.toggle('open', showTrackList);
      if (showTrackList) tlPanel.innerHTML = buildTrackListHTML();
    }

    document.querySelectorAll('.radio-pl-item').forEach((el, i) => el.classList.toggle('active', i === currentPlaylist));

    const widget = document.getElementById('radio-widget');
    if (widget) widget.style.setProperty('--rc', pl.color);

    tickProgress();
  }

  function build() {
    if (document.getElementById('radio-widget')) return;

    const w = document.createElement('div');
    w.id = 'radio-widget';
    w.innerHTML =
      '<div class="radio-body">' +
        '<div id="radio-art" class="radio-art">' +
          '<img id="radio-art-img" class="radio-art-img" src="" alt="">' +
          '<div id="radio-art-disc" class="radio-art-disc">' +
            '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" width="70" height="70" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">' +
              '<circle cx="30" cy="30" r="28" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>' +
              '<circle cx="30" cy="30" r="20" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>' +
              '<circle cx="30" cy="30" r="12" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>' +
              '<circle cx="30" cy="30" r="4" fill="rgba(255,255,255,0.5)"/>' +
            '</svg>' +
          '</div>' +
        '</div>' +
        '<div class="radio-info">' +
          '<div id="radio-pl-name" class="radio-pl-name"></div>' +
          '<div id="radio-track-title" class="radio-track-title"></div>' +
          '<div id="radio-track-artist" class="radio-track-artist"></div>' +
        '</div>' +
      '</div>' +
      '<div class="radio-progress-section">' +
        '<div class="radio-progress-track" id="radio-progress-track">' +
          '<div class="radio-progress-fill" id="radio-progress-fill"></div>' +
        '</div>' +
        '<div class="radio-times">' +
          '<span id="radio-time-cur">0:00</span>' +
          '<span id="radio-loop-label" class="radio-loop-label" style="display:none">LOOPING</span>' +
          '<span id="radio-time-dur">0:00</span>' +
        '</div>' +
      '</div>' +
      '<div class="radio-controls-bar">' +
        '<button class="radio-ctrl-btn" id="radio-playlist-toggle" title="Playlists"><i class="fas fa-list"></i></button>' +
        '<button class="radio-ctrl-btn" id="radio-prev-pl" title="Playlist precedente"><i class="fas fa-chevron-left"></i></button>' +
        '<button class="radio-ctrl-btn" id="radio-prev" title="Brano precedente"><i class="fas fa-backward-step"></i></button>' +
        '<button class="radio-ctrl-btn radio-ctrl-play" id="radio-playpause"><i class="fas fa-play"></i></button>' +
        '<button class="radio-ctrl-btn" id="radio-next" title="Brano successivo"><i class="fas fa-forward-step"></i></button>' +
        '<button class="radio-ctrl-btn" id="radio-next-pl" title="Playlist successiva"><i class="fas fa-chevron-right"></i></button>' +
        '<button class="radio-ctrl-btn radio-ctrl-loop" id="radio-loop" title="Loop"><i class="fas fa-repeat"></i></button>' +
        '<div class="radio-vol-wrap" id="radio-vol-wrap">' +
          '<div class="radio-vol-popup" id="radio-vol-popup">' +
            '<input type="range" id="radio-vol-slider" class="radio-vol-slider" min="0" max="100" step="1" value="5">' +
            '<span id="radio-vol-pct" class="radio-vol-pct">5%</span>' +
          '</div>' +
          '<button class="radio-ctrl-btn" id="radio-vol-toggle" title="Volume"><i class="fas fa-volume-low"></i></button>' +
        '</div>' +
        '<button class="radio-ctrl-btn" id="radio-tracklist-toggle" title="Scegli brano"><i class="fas fa-music"></i></button>' +
        '<div id="radio-playlist-panel" class="radio-playlist-panel">' +
          PLAYLISTS.map((pl, i) =>
            '<div class="radio-pl-item" data-idx="' + i + '">' +
              '<span class="radio-pl-dot" style="background:' + pl.color + '"></span>' +
              pl.name +
              (!pl.tracks.length ? ' <span class="radio-pl-wip">wip</span>' : '') +
            '</div>'
          ).join('') +
        '</div>' +
        '<div id="radio-tracklist-panel" class="radio-tracklist-panel"></div>' +
      '</div>';

    document.body.appendChild(w);

    document.getElementById('radio-playlist-toggle').onclick = () => { showPlaylist = !showPlaylist; showTrackList = false; updateUI(); };
    document.getElementById('radio-tracklist-toggle').onclick = () => { showTrackList = !showTrackList; showPlaylist = false; updateUI(); };
    document.getElementById('radio-playpause').onclick = () => isPlaying ? pause() : play();
    document.getElementById('radio-prev').onclick      = () => prevTrack();
    document.getElementById('radio-next').onclick      = () => nextTrack();
    document.getElementById('radio-prev-pl').onclick   = () => prevPlaylist();
    document.getElementById('radio-next-pl').onclick   = () => nextPlaylist();
    document.getElementById('radio-loop').onclick      = () => toggleLoop();

    document.getElementById('radio-progress-track').onclick = (e) => {
      if (!audio.duration) return;
      const rect = document.getElementById('radio-progress-track').getBoundingClientRect();
      audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
      tickProgress();
    };

    const volBtn    = document.getElementById('radio-vol-toggle');
    const volSlider = document.getElementById('radio-vol-slider');
    const volPct    = document.getElementById('radio-vol-pct');
    if (typeof CFG !== 'undefined') {
      audio.volume = CFG.radioVolume / 100;
      audio.muted  = !!CFG.radioMuted;
    }
    volSlider.value = audio.volume * 100;
    if (volPct) volPct.textContent = Math.round(audio.volume * 100) + '%';
    volBtn.innerHTML = audio.muted ? '<i class="fas fa-volume-xmark"></i>' : audio.volume < 0.5 ? '<i class="fas fa-volume-low"></i>' : '<i class="fas fa-volume-high"></i>';
    volSlider.oninput = () => {
      audio.volume = volSlider.value / 100;
      audio.muted  = false;
      volPct.textContent = volSlider.value + '%';
      volBtn.innerHTML = audio.volume === 0 ? '<i class="fas fa-volume-xmark"></i>' : audio.volume < 0.5 ? '<i class="fas fa-volume-low"></i>' : '<i class="fas fa-volume-high"></i>';
      if (typeof CFG !== 'undefined') { CFG.radioVolume = +volSlider.value; CFG.radioMuted = false; if (typeof saveSettings === 'function') saveSettings(); }
      const setSlider = document.getElementById('set-radioVolume');
      const setVal    = document.getElementById('set-radioVol-val');
      if (setSlider) setSlider.value = volSlider.value;
      if (setVal)    setVal.textContent = volSlider.value;
    };
    volBtn.onclick = () => {
      audio.muted = !audio.muted;
      volBtn.innerHTML = audio.muted ? '<i class="fas fa-volume-xmark"></i>' : audio.volume < 0.5 ? '<i class="fas fa-volume-low"></i>' : '<i class="fas fa-volume-high"></i>';
      if (typeof CFG !== 'undefined') { CFG.radioMuted = audio.muted; if (typeof saveSettings === 'function') saveSettings(); }
      const mutedCb = document.getElementById('set-radioMuted');
      if (mutedCb) mutedCb.classList.toggle('checked', audio.muted);
    };

    const volWrap  = document.getElementById('radio-vol-wrap');
    const volPopup = document.getElementById('radio-vol-popup');
    let volHideTimer = null;
    const isOverVolArea = (e) => volWrap.contains(e.target) || volPopup.contains(e.target);
    const showVol = () => { if (volHideTimer) { clearTimeout(volHideTimer); volHideTimer = null; } volPopup.classList.add('visible'); };
    const hideVol = () => { volHideTimer = setTimeout(() => volPopup.classList.remove('visible'), 150); };
    document.addEventListener('pointermove', (e) => { if (isOverVolArea(e)) showVol(); else hideVol(); });

    document.querySelectorAll('.radio-pl-item').forEach(el => {
      el.onclick = () => selectPlaylist(+el.dataset.idx);
    });

    document.getElementById('radio-tracklist-panel').addEventListener('click', (e) => {
      const item = e.target.closest('.radio-tl-item');
      if (item) selectTrack(+item.dataset.tidx);
    });

    document.addEventListener('click', (e) => {
      if (!w.contains(e.target)) {
        if (showPlaylist)  { showPlaylist  = false; updateUI(); }
        if (showTrackList) { showTrackList = false; updateUI(); }
      }
    });

    w.classList.add('hidden');
    syncRadioVisibility();
    loadAndPlay();
  }

  function unlockPrestigeTrack() {
    const pl = PLAYLISTS[0];
    const already = pl.tracks.some(t => t.src === AUDIO_CDN + '/radio/Progression/A_Tale_of_Eternity.mp3');
    if (already) return;
    pl.tracks.push({ title: 'A Tale of Eternity', artist: 'TRACK 7 // Nighthawk22', src: AUDIO_CDN + '/radio/Progression/A_Tale_of_Eternity.mp3' });
    const plPanel = document.getElementById('radio-playlist-panel');
    if (plPanel) {
      const items = plPanel.querySelectorAll('.radio-pl-item');
      if (items[0]) items[0].querySelector('.radio-pl-wip')?.remove();
    }
    updateUI();
  }

  function setVolume(v) {
    audio.volume = Math.max(0, Math.min(1, v));
    const volSlider = document.getElementById('radio-vol-slider');
    const volPct    = document.getElementById('radio-vol-pct');
    const volBtn    = document.getElementById('radio-vol-toggle');
    if (volSlider) volSlider.value = v * 100;
    if (volPct)    volPct.textContent = Math.round(v * 100) + '%';
    if (volBtn)    volBtn.innerHTML = v === 0 ? '<i class="fas fa-volume-xmark"></i>' : v < 0.5 ? '<i class="fas fa-volume-low"></i>' : '<i class="fas fa-volume-high"></i>';
  }
  function setMuted(m) {
    audio.muted = !!m;
    const volBtn = document.getElementById('radio-vol-toggle');
    if (volBtn) volBtn.innerHTML = audio.muted ? '<i class="fas fa-volume-xmark"></i>' : audio.volume < 0.5 ? '<i class="fas fa-volume-low"></i>' : '<i class="fas fa-volume-high"></i>';
  }

  return { build, play, pause, unlockPrestigeTrack, setVolume, setMuted };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('game-canvas')) Radio.build();
});

function syncRadioVisibility() {
  const w = document.getElementById('radio-widget');
  if (!G.boomboxUnlocked) {
    if (w) w.style.display = 'none';
    const btn = document.getElementById('radio-toggle-btn');
    if (btn) btn.classList.remove('visible');
  } else {
    if (w) w.style.display = '';
    buildToggleBtn();
    const btn = document.getElementById('radio-toggle-btn');
    if (btn) btn.classList.add('visible');
  }
}

function buildToggleBtn() {
  if (document.getElementById('radio-toggle-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'radio-toggle-btn';
  btn.title = 'Radio';
  btn.innerHTML = '<i class="fas fa-chevron-right"></i>';
  btn.addEventListener('click', () => {
    const w = document.getElementById('radio-widget');
    const radioVisible = w && w.classList.contains('visible-radio');
    const next = !radioVisible;
    btn.innerHTML = next ? '<i class="fas fa-chevron-left"></i>' : '<i class="fas fa-chevron-right"></i>';
    if (w) {
      w.classList.toggle('hidden', !next);
      w.classList.toggle('visible-radio', next);
    }
    btn.style.left = next ? '360px' : '0';
  });
  document.body.appendChild(btn);
}