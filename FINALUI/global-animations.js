// ===== GLOBAL ANIMATION SYSTEM =====
// Shared across all pages - ongoing animations only
// Landing page can call initFallingFX() for full wave + ongoing
// Other pages call initOngoingOnly() for just ongoing

// ===== KNOBS =====
const FX = {
  wave: {
    verticalDuration: [5, 7],  // short, punchy
    staggerSec: 1.0,           // start window for all wave items
    cardOverlap: 0.70,         // ↓ = more columns = denser
    chipEveryNCols: 6,         // one chip per N card columns
    extraRandomChips: 4,
    backWeight: 2,
    faceWeight: 1
  },
  // SPORADIC ongoing: single spawns with exponential gaps (no batches)
  ongoing: {
    minActive: 10,              // try to keep at least this many concurrently
    maxActive: 20,              // never exceed this many concurrently
    meanGapSec: 2.8,           // average time between spawns
    jitterSec: 1.2,            // +/- randomization on top of exponential
    chipBias: 0.25,            // probability a spawn is a chip
    duration: [7, 12],         // fall duration for ongoing items
    startDelaySec: 1.0         // begin shortly after wave starts
  },
  cardSize: { width: 50, height: 70 }
};

// ===== Assets =====
const cardImages = {
  back: Array(8).fill('cards/back.png'),
  face: [
    'cards/spades_A.png','cards/hearts_K.png','cards/diamonds_Q.png',
    'cards/clubs_J.png','cards/spades_10.png','cards/hearts_9.png',
    'cards/diamonds_8.png','cards/clubs_7.png'
  ]
};

const pickCardImg = (bw, fw) => {
  const total = bw + fw;
  const pool = (Math.random()*total < bw) ? cardImages.back : cardImages.face;
  return pool[Math.floor(Math.random()*pool.length)];
};

// ===== Utils =====
const $container = () => document.getElementById('floating-cards');
const rand = (a,b) => a + Math.random()*(b-a);
const expSample = (mean) => -Math.log(1-Math.random()) * mean;

let active = 0;
function onSpawned(el){
  active++;
  el.addEventListener('animationend', () => {
    active = Math.max(0, active-1);
    // If we dipped below the floor, spawn immediately to top-up
    if (!document.hidden && active < FX.ongoing.minActive) { spawnOne(); }
  }, { once:true });
}

function spawnCard({xPct, delaySec, durationSec, backWeight, faceWeight}) {
  const el = document.createElement('div');
  el.className = 'floating-card falling-once';
  const img = document.createElement('img');
  img.src = pickCardImg(backWeight, faceWeight);
  img.alt = 'Playing Card';
  el.appendChild(img);

  el.style.left = `${xPct}%`;
  el.style.setProperty('--rotStart', `${Math.floor(rand(0,360))}deg`);
  el.style.setProperty('--rotEnd',   `${Math.floor(rand(720,1440))}deg`);
  el.style.animation = `fallDown ${durationSec}s linear ${delaySec}s 1`;
  $container().appendChild(el);
  onSpawned(el);
}

function spawnChip({xPct, delaySec, durationSec}) {
  const el = document.createElement('div');
  el.className = 'floating-chip falling-once';
  el.textContent = '$';
  el.style.left = `${xPct}%`;
  el.style.setProperty('--rotStart', `${Math.floor(rand(0,360))}deg`);
  el.style.setProperty('--rotEnd',   `${Math.floor(rand(720,1440))}deg`);
  el.style.animation = `fallDown ${durationSec}s linear ${delaySec}s 1`;
  $container().appendChild(el);
  onSpawned(el);
}

// ===== Initial wave (landing page only) =====
function initialWaveCover() {
  const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const step = Math.max(8, Math.floor(FX.cardSize.width * FX.wave.cardOverlap));
  const cols = Math.max(12, Math.ceil(vw / step));

  for (let c = 0; c < cols; c++) {
    const xPx = c * step + rand(-6, 6);
    const xPct = Math.min(98, Math.max(2, (xPx / vw) * 100));
    const delay = Math.random() * FX.wave.staggerSec;
    const dur = rand(FX.wave.verticalDuration[0], FX.wave.verticalDuration[1]);

    spawnCard({
      xPct, delaySec: delay, durationSec: dur,
      backWeight: FX.wave.backWeight, faceWeight: FX.wave.faceWeight
    });

    if (c % FX.wave.chipEveryNCols === 0) {
      spawnChip({ xPct: Math.min(98, xPct + rand(-2, 2)), delaySec: delay*0.7, durationSec: dur });
    }
  }
  for (let i = 0; i < FX.wave.extraRandomChips; i++) {
    const xPct = Math.random() * 100;
    const delay = Math.random() * (FX.wave.staggerSec * 0.9);
    const dur = rand(FX.wave.verticalDuration[0], FX.wave.verticalDuration[1]);
    spawnChip({ xPct, delaySec: delay, durationSec: dur });
  }
  return FX.wave.staggerSec + FX.wave.verticalDuration[1];
}

// ===== Sporadic ongoing (all pages) =====
let spawnTimer = null;

function spawnOne(){
  if (active >= FX.ongoing.maxActive) return; // ceiling guard
  const isChip = Math.random() < FX.ongoing.chipBias;
  const dur = rand(FX.ongoing.duration[0], FX.ongoing.duration[1]);
  const xPct = Math.random() * 100;
  if (isChip) {
    spawnChip({ xPct, delaySec: 0, durationSec: dur });
  } else {
    spawnCard({
      xPct, delaySec: 0, durationSec: dur,
      backWeight: FX.wave.backWeight, faceWeight: FX.wave.faceWeight
    });
  }
}

function scheduleNextSpawn(){
  // If we're below the floor, spawn immediately and schedule again soon.
  if (active < FX.ongoing.minActive) {
    spawnOne();
    spawnTimer = setTimeout(scheduleNextSpawn, 250);
    return;
  }
  // If we're at/over the ceiling, back off a bit and re-check.
  if (active >= FX.ongoing.maxActive) {
    spawnTimer = setTimeout(scheduleNextSpawn, 750);
    return;
  }
  // Poisson gap + jitter (sporadic feel)
  const gap = Math.max(
    0.25,
    expSample(FX.ongoing.meanGapSec) + (Math.random()*2*FX.ongoing.jitterSec - FX.ongoing.jitterSec)
  );
  spawnTimer = setTimeout(() => {
    if (!document.hidden) spawnOne();
    scheduleNextSpawn();
  }, gap * 1000);
}

function startOngoing(){
  if (spawnTimer) return;
  // Top up to the floor quickly at start
  while (active < FX.ongoing.minActive) spawnOne();
  scheduleNextSpawn();
}

function stopOngoing(){
  if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null; }
}

// ===== Public API =====

// For landing page: wave + ongoing
function initFallingFX() {
  initialWaveCover();
  setTimeout(startOngoing, FX.ongoing.startDelaySec * 1000);
}

// For other pages: ongoing only
function initOngoingOnly() {
  startOngoing();
}

// ===== Suit cycling (all pages) =====
function initSuitCycling() {
  const suits=['♠','♥','♣','♦']; 
  let i=0;
  setInterval(()=>{
    document.querySelectorAll('.suit-symbol').forEach(el=> el.textContent = suits[i]);
    i=(i+1)%suits.length;
  },1000);
}

// ===== Visibility handling =====
function initVisibilityHandling() {
  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden) stopOngoing();
    else startOngoing();
  });
}

// ===== Console helpers =====
window.pokerFX = {
  startOngoing, 
  stopOngoing,
  initFallingFX,
  initOngoingOnly,
  setRange: (min,max)=>{ FX.ongoing.minActive=min; FX.ongoing.maxActive=max; },
  setGap: (mean,jitter)=>{ FX.ongoing.meanGapSec=mean; FX.ongoing.jitterSec=jitter; },
  active: ()=> active
};

// Make functions globally available
window.initFallingFX = initFallingFX;
window.initOngoingOnly = initOngoingOnly;

// ===== Auto-initialize common features =====
// These run on all pages
document.addEventListener('DOMContentLoaded', () => {
  initSuitCycling();
  initVisibilityHandling();
});
