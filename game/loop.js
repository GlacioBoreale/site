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
  if (G.delayedGratUnlocked) {
    G.delayedGratTime += dt;
    recalcPps();
  }

  const earned   = G.pps * dt;
  G.points      += earned;
  G.totalEarned += earned;

  updateHUD();

  const T = getTheme();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lerpBg(dt);
  drawBackground();
  drawGrid(T);
  drawConnections(T);
  drawNodes(T);
  drawCurrencyPanels(T);
  tickLevelingPanel();
  tickResearchPanel();
  tickStats(dt);

  requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', () => {
  resize();
  loadGame();
  requestAnimationFrame(gameLoop);
  setTimeout(() => { gameReady = true; }, 300);
  setTimeout(() => { if (typeof syncCloudSave === 'function') syncCloudSave(); }, 1000);
});
