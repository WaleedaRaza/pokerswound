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
    chipEveryNCols: 8,         // one chip per N card columns (less frequent)
    extraRandomChips: 2,       // fewer extra chips
    logoInWave: 1,             // only 1 logo in initial wave
    backWeight: 3,             // more card backs than fronts (3:1 ratio)
    faceWeight: 1
  },
  // SPORADIC ongoing: single spawns with exponential gaps (no batches)
  ongoing: {
    minActive: 3,               // try to keep at least this many concurrently
    maxActive: 8,               // never exceed this many concurrently
    meanGapSec: 4.0,           // average time between spawns (increased to reduce frequency)
    jitterSec: 1.5,            // +/- randomization on top of exponential
    chipBias: 0.15,            // probability a spawn is a chip (cards are default, so 85% cards)
    logoBias: 0.05,            // probability a spawn is a logo (rare, special) - 5% logos, 15% chips, 80% cards
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
    // ✅ REMOVE FROM DOM after animation completes to prevent accumulation
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
    // If we dipped below the floor, spawn immediately to top-up
    if (!document.hidden && active < FX.ongoing.minActive) { spawnOne(); }
  }, { once:true });
}

function spawnCard({xPct, delaySec, durationSec, backWeight, faceWeight}) {
  const el = document.createElement('div');
  el.className = 'floating-card falling-once';
  el.dataset.isBack = 'true'; // Track if showing back
  
  const img = document.createElement('img');
  img.src = pickCardImg(backWeight, faceWeight);
  img.alt = 'Playing Card';
  el.appendChild(img);

  el.style.left = `${xPct}%`;
  el.style.setProperty('--rotStart', `${Math.floor(rand(0,360))}deg`);
  el.style.setProperty('--rotEnd',   `${Math.floor(rand(720,1440))}deg`);
  el.style.animation = `fallDown ${durationSec}s linear ${delaySec}s 1`;
  
  // ✅ CLICK TO FLIP: Reveal card face/back (can flip multiple times)
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    flipCard(el);
  });
  
  $container().appendChild(el);
  onSpawned(el);
}

function flipCard(el) {
  const img = el.querySelector('img');
  const isBack = el.dataset.isBack === 'true';
  
  // Flip animation
  el.style.transition = 'transform 0.3s ease';
  el.style.transform = 'rotateY(90deg)';
  
  setTimeout(() => {
    // Switch to opposite side (back and forth)
    if (isBack) {
      // Show random face card
      const faceCards = cardImages.face;
      img.src = faceCards[Math.floor(Math.random() * faceCards.length)];
      el.dataset.isBack = 'false';
    } else {
      // Show random back
      img.src = cardImages.back[0];
      el.dataset.isBack = 'true';
    }
    
    el.style.transform = 'rotateY(0deg)';
  }, 150);
}

function spawnChip({xPct, delaySec, durationSec}) {
  const el = document.createElement('div');
  el.className = 'floating-chip falling-once';
  // Randomly start with teal or orange
  const startColor = Math.random() < 0.5 ? 'teal' : 'orange';
  el.dataset.chipColor = startColor;
  
  const img = document.createElement('img');
  img.src = `/public/chip_${startColor}.svg`;
  img.alt = 'Poker Chip';
  img.style.width = '60px';
  img.style.height = '60px';
  el.appendChild(img);
  
  el.style.left = `${xPct}%`;
  el.style.setProperty('--rotStart', `${Math.floor(rand(0,360))}deg`);
  el.style.setProperty('--rotEnd',   `${Math.floor(rand(720,1440))}deg`);
  el.style.animation = `fallDown ${durationSec}s linear ${delaySec}s 1`;
  
  // ✅ CLICK TO FLIP: Switch between teal and orange
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    flipChip(el);
  });
  
  $container().appendChild(el);
  onSpawned(el);
}

function flipChip(el) {
  const img = el.querySelector('img');
  const currentColor = el.dataset.chipColor;
  const newColor = currentColor === 'teal' ? 'orange' : 'teal';
  
  // Flip animation
  el.style.transition = 'transform 0.3s ease';
  el.style.transform = 'rotateY(90deg)';
  
  setTimeout(() => {
    el.dataset.chipColor = newColor;
    img.src = `/public/chip_${newColor}.svg`;
    el.style.transform = 'rotateY(0deg)';
  }, 150);
}

function spawnLogo({xPct, delaySec, durationSec}) {
  const el = document.createElement('div');
  el.className = 'floating-logo falling-once logo-glow';
  el.dataset.caught = 'false';
  
  const img = document.createElement('img');
  img.src = '/public/Logo.svg';
  img.alt = 'PokerGeek Logo';
  img.style.width = '50px';  // Smaller logo
  img.style.height = '50px';
  el.appendChild(img);
  
  el.style.left = `${xPct}%`;
  el.style.setProperty('--rotStart', `${Math.floor(rand(0,360))}deg`);
  el.style.setProperty('--rotEnd',   `${Math.floor(rand(180,360))}deg`); // Less rotation
  el.style.animation = `fallDown ${durationSec}s linear ${delaySec}s 1`;
  
  // ✅ CLICK TO CATCH: Open popup
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    catchLogo(el);
  });
  
  $container().appendChild(el);
  onSpawned(el);
}

function catchLogo(el) {
  if (el.dataset.caught === 'true') return; // Already caught
  
  el.dataset.caught = 'true';
  
  // Pause animation
  el.style.animationPlayState = 'paused';
  
  // Glow effect
  el.classList.add('logo-caught');
  
  // Open popup
  openLogoPopup();
  
  // Remove after popup closes
  setTimeout(() => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }, 500);
}

// PokerGeek quotes (inspired by Minecraft opening messages)
const POKERGEEK_QUOTES = [
  "If a tree falls in the forest and no one hears it, does it make a sound?",
  "The only constant in life is change. He who knows, knows he knows nothing.",
  "Less is more.",
  "To know yourself is the beginning of all wisdom.",
  "The map is not the territory.",
  "We see things not as they are, but as we are.",
  "No man ever steps in the same river twice.",
  "The eyes are useless when the mind is blind.",
  "You reap what you sow. If everyone plays optimally, does anyone win?",
  "If luck is fair, is it still luck?",
  "When you fold, do your cards miss you?",
  "Fold your ego, not your hand.",
  "Maybe the real rake was the friends we made along the way.",
  "The house always wins, but the mind always wonders.",
  "We all start as 2-7 offsuit.",
  "Some days are like slow-playing aces, some days are like bluffing a 2-7.",
  "Your probability of reading this is 100%.",
  "We simulated this moment 1,000,000,000,000 times.",
  "Go all-in on you.",
  "Everything you've ever done has led you here.",
  "If a chip drops in the lobby and no one's online, does it make a sound?"
];

function openLogoPopup() {
  // Random quote selection
  const randomQuote = POKERGEEK_QUOTES[Math.floor(Math.random() * POKERGEEK_QUOTES.length)];
  
  // Create popup overlay (Minecraft-inspired style)
  const overlay = document.createElement('div');
  overlay.className = 'logo-popup-overlay';
  overlay.innerHTML = `
    <div class="logo-popup">
      <div class="logo-popup-header">
        <img src="/public/Logo.svg" alt="PokerGeek" class="logo-popup-icon" />
      </div>
      <div class="logo-popup-content">
        <p class="logo-popup-quote">${randomQuote}</p>
      </div>
      <button class="logo-popup-close" onclick="this.closest('.logo-popup-overlay').remove()">Accept.</button>
    </div>
  `;
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  document.body.appendChild(overlay);
  
  // Animate in
  setTimeout(() => {
    overlay.classList.add('show');
  }, 10);
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
  // Add 1 logo in the initial wave (rare and special)
  for (let i = 0; i < FX.wave.logoInWave; i++) {
    const xPct = Math.random() * 100;
    const delay = Math.random() * FX.wave.staggerSec;
    const dur = rand(FX.wave.verticalDuration[0], FX.wave.verticalDuration[1]);
    spawnLogo({ xPct, delaySec: delay, durationSec: dur });
  }
  return FX.wave.staggerSec + FX.wave.verticalDuration[1];
}

// ===== Sporadic ongoing (all pages) =====
let spawnTimer = null;

function spawnOne(){
  if (active >= FX.ongoing.maxActive) return; // ceiling guard
  const randVal = Math.random();
  const dur = rand(FX.ongoing.duration[0], FX.ongoing.duration[1]);
  const xPct = Math.random() * 100;
  
  // Determine spawn type: logo (rare), chip, or card
  if (randVal < FX.ongoing.logoBias) {
    spawnLogo({ xPct, delaySec: 0, durationSec: dur });
  } else if (randVal < FX.ongoing.logoBias + FX.ongoing.chipBias) {
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

// ===== Cleanup on page unload =====
window.addEventListener('beforeunload', () => {
  stopOngoing();
  const container = $container();
  if (container) {
    container.innerHTML = ''; // Clear all cards
    active = 0;
  }
});

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

// ===== Suit cycling for hero title =====
function initSuitCycling() {
  const suits = ['♠', '♥', '♣', '♦'];
  let heroIndex = 0;
  let legacyIndex = 0;
  
  // Update hero spinning suit (the dot in "PokerGeek.ai")
  const heroSuitEls = document.querySelectorAll('.spinning-suit');
  if (heroSuitEls.length > 0) {
    setInterval(() => {
      heroSuitEls.forEach(el => {
        el.textContent = suits[heroIndex];
      });
      heroIndex = (heroIndex + 1) % suits.length;
    }, 500); // Change every 500ms for smooth spin
  }
  
  // Legacy: Update any remaining .suit-symbol elements
  setInterval(() => {
    document.querySelectorAll('.suit-symbol').forEach(el => {
      el.textContent = suits[legacyIndex];
    });
    legacyIndex = (legacyIndex + 1) % suits.length;
  }, 1000);
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
