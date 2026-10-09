'use strict';

function gameLoop(ts) {
  if (G.lastTick === 0) G.lastTick = ts;
  const dt = Math.min((ts - G.lastTick) / 1000, 0.5);
  G.lastTick = ts;
  _now = ts;

  if (G.selfBoost || G.growsUnlocked) recalcPps();

  if (G.passiveLambda) {
    G.research += pendingResearch() * 0.01 * dt;
  }
  if (G.delayedGratUnlocked && nodeState['delayedGratification']?.level > 0) {
    G.delayedGratTime += dt;
    recalcPps();
  }

  const earned   = G.pps * dt;
  G.points      += earned;
  G.totalEarned += earned;

  if (G.automationUnlocked && (nodeState['a_startAuto']?.level || 0) > 0) {
    G.bits += bitsPerSec() * dt;
    runAutomation(dt);
  }

  updateHUD();

  const T = getTheme();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lerpBg(dt);
  drawBackground();
  ctx.save();
  ctx.scale(zoom, zoom);
  drawGrid(T);
  drawConnections(T);
  drawNodes(T);
  drawCurrencyPanels(T);
  ctx.restore();
  tickLevelingPanel(dt);
  tickResearchPanel();
  tickStats(dt);

  requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', async () => {
  resize();
  centerCamera();
  loadGame();

  // carica il cloud UNA VOLTA all'apertura, prima di avviare il gioco
  const isLogged = typeof Auth !== 'undefined' && Auth.isLoggedIn();
  if (isLogged && typeof syncCloudSave === 'function') {
    try { await syncCloudSave(false); } catch (e) { /* ignora, gioca col locale */ }
  }

  requestAnimationFrame(gameLoop);
  setTimeout(() => { gameReady = true; }, 300);
});

window.addEventListener('resize', () => {
  resize();
});
