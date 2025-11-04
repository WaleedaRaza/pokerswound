// ============================================
// 🎯 SEAT POSITIONING TOOL v3.0 - MULTI-SELECT
// ============================================
// USAGE:
// 1. Open your game in browser (http://localhost:3000/minimal-table.html?room=YOUR_ROOM)
// 2. Open Developer Console (F12 or Cmd+Option+I)
// 3. Copy this ENTIRE file and paste into console
// 4. Press Enter
// 5. Click any seat tile to select it
// 6. Ctrl/Cmd+Click to add more seats to selection
// 7. Use keyboard controls to adjust ALL selected seats
// 8. Press C to copy final positions
// ============================================

(function() {
  console.clear();
  console.log(`%c
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║       🎯 SEAT POSITIONING TOOL v3.0 - MULTI-SELECT 🎯       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`, 'color: #00d4aa; font-size: 16px; font-weight: bold; font-family: monospace;');

  console.log(`%c
📖 CONTROLS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖱️  MULTI-SELECT:
   Click any seat            → Select it (orange glow)
   Ctrl/Cmd + Click          → Add to selection (multi-select)
   Shift + Click             → Select range from last clicked
   ESC                       → Deselect all

📍 POSITION (applies to ALL selected):
   ← → ↑ ↓                   → Move by 5px
   Shift + ← → ↑ ↓           → Move by 1px (fine tune)
   Alt + ← → ↑ ↓             → Move by 20px (fast)

📏 SIZE (applies to ALL selected - LOCKED SQUARE):
   + or =                    → Increase by 10px (width = height)
   -                         → Decrease by 10px (width = height)
   Shift + +                 → Increase by 5px (fine)
   Shift + -                 → Decrease by 5px (fine)

💾 ACTIONS:
   C                         → Copy positions to console
   R                         → Reset selected seats to original
   A                         → Reset ALL seats to original

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`, 'color: #e9eef7; font-size: 12px;');

  console.log(`%c✅ Tool ready! Click seats to select (Ctrl/Cmd+Click for multi-select).`, 'color: #00d4aa; font-size: 14px; font-weight: bold;');
  console.log('');

  // ============================================
  // STATE
  // ============================================
  const selectedSeats = new Set(); // Multi-select support
  let lastSelectedIndex = null; // For shift-click range selection
  const originalPositions = new Map();
  
  // Store original positions
  document.querySelectorAll('.seat').forEach(seat => {
    const index = seat.dataset.seatIndex;
    if (index !== undefined) {
      originalPositions.set(index, {
        x: parseInt(seat.style.left) || 0,
        y: parseInt(seat.style.top) || 0,
        width: parseInt(getComputedStyle(seat).width) || 180,
        height: parseInt(getComputedStyle(seat).height) || 180
      });
    }
  });
  
  // ============================================
  // STYLING
  // ============================================
  const style = document.createElement('style');
  style.id = 'positioning-tool-styles';
  style.textContent = `
    .seat.positioning-selected {
      outline: 5px solid #ff5100 !important;
      outline-offset: 8px;
      box-shadow: 0 0 0 3px rgba(255, 81, 0, 0.3), 
                  0 0 60px rgba(255, 81, 0, 0.8) !important;
      z-index: 9999 !important;
      animation: positioningPulse 2s ease-in-out infinite;
    }
    
    @keyframes positioningPulse {
      0%, 100% {
        outline-color: #ff5100;
      }
      50% {
        outline-color: #00d4aa;
      }
    }
    
    .seat.positioning-selected::after {
      content: '✦ SEAT ' attr(data-seat-index) ' ✦';
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #ff5100, #ff6a1f);
      color: white;
      padding: 8px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 2px;
      box-shadow: 0 4px 12px rgba(255, 81, 0, 0.5);
      white-space: nowrap;
      z-index: 10000;
      animation: labelFloat 2s ease-in-out infinite;
    }
    
    @keyframes labelFloat {
      0%, 100% {
        transform: translateX(-50%) translateY(0);
      }
      50% {
        transform: translateX(-50%) translateY(-5px);
      }
    }
    
    .seat.positioning-selected::before {
      content: 'x: ' attr(data-pos-x) '  y: ' attr(data-pos-y) '\\A' 'w: ' attr(data-pos-width) '  h: ' attr(data-pos-height);
      position: absolute;
      bottom: -60px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.95);
      color: #00d4aa;
      padding: 10px 15px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      white-space: pre;
      text-align: center;
      border: 2px solid #00d4aa;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
      z-index: 10000;
    }
    
    #multiSelectBadge {
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ff5100, #ff6a1f);
      color: white;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 900;
      box-shadow: 0 4px 20px rgba(255, 81, 0, 0.6);
      z-index: 99999;
      animation: badgePulse 2s ease-in-out infinite;
    }
    
    @keyframes badgePulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }
  `;
  document.head.appendChild(style);
  
  // ============================================
  // MULTI-SELECT BADGE
  // ============================================
  let badge = document.getElementById('multiSelectBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'multiSelectBadge';
    badge.style.display = 'none';
    document.body.appendChild(badge);
  }
  
  function updateBadge() {
    if (selectedSeats.size > 0) {
      badge.textContent = `${selectedSeats.size} SEAT${selectedSeats.size > 1 ? 'S' : ''} SELECTED`;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }
  
  // ============================================
  // UPDATE POSITION DISPLAY
  // ============================================
  function updatePositionDisplay(seat) {
    const x = parseInt(seat.style.left) || 0;
    const y = parseInt(seat.style.top) || 0;
    const width = parseInt(getComputedStyle(seat).width);
    const height = parseInt(getComputedStyle(seat).height);
    
    seat.setAttribute('data-pos-x', x);
    seat.setAttribute('data-pos-y', y);
    seat.setAttribute('data-pos-width', width);
    seat.setAttribute('data-pos-height', height);
  }
  
  // ============================================
  // SELECTION HELPERS
  // ============================================
  function selectSeat(seat) {
    const index = seat.dataset.seatIndex;
    selectedSeats.add(seat);
    seat.classList.add('positioning-selected');
    updatePositionDisplay(seat);
    lastSelectedIndex = parseInt(index);
  }
  
  function deselectSeat(seat) {
    selectedSeats.delete(seat);
    seat.classList.remove('positioning-selected');
    seat.removeAttribute('data-pos-x');
    seat.removeAttribute('data-pos-y');
    seat.removeAttribute('data-pos-width');
    seat.removeAttribute('data-pos-height');
  }
  
  function deselectAll() {
    selectedSeats.forEach(seat => deselectSeat(seat));
    selectedSeats.clear();
    updateBadge();
  }
  
  // ============================================
  // CLICK HANDLER
  // ============================================
  document.addEventListener('click', (e) => {
    const seat = e.target.closest('.seat');
    
    if (seat && seat.dataset.seatIndex !== undefined) {
      e.stopPropagation();
      const index = parseInt(seat.dataset.seatIndex);
      
      // MULTI-SELECT: Ctrl/Cmd+Click
      if (e.ctrlKey || e.metaKey) {
        if (selectedSeats.has(seat)) {
          deselectSeat(seat);
          console.log(`%c➖ Removed Seat ${index} from selection`, 'color: #ff5100; font-size: 14px');
        } else {
          selectSeat(seat);
          console.log(`%c➕ Added Seat ${index} to selection`, 'color: #00d4aa; font-size: 14px');
        }
      }
      // RANGE SELECT: Shift+Click
      else if (e.shiftKey && lastSelectedIndex !== null) {
        const allSeats = Array.from(document.querySelectorAll('.seat')).filter(s => s.dataset.seatIndex !== undefined);
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        
        allSeats.forEach(s => {
          const idx = parseInt(s.dataset.seatIndex);
          if (idx >= start && idx <= end) {
            selectSeat(s);
          }
        });
        console.log(`%c📐 Selected range: Seat ${start} to Seat ${end}`, 'color: #00d4aa; font-size: 14px');
      }
      // SINGLE SELECT: Regular click
      else {
        deselectAll();
        selectSeat(seat);
        console.log(`%c🎯 SEAT ${index} SELECTED`, 'color: #ff5100; font-size: 16px; font-weight: bold;');
        const current = {
          x: parseInt(seat.style.left) || 0,
          y: parseInt(seat.style.top) || 0,
          width: parseInt(getComputedStyle(seat).width),
          height: parseInt(getComputedStyle(seat).height)
        };
        console.log('%cCurrent:', 'font-weight: bold', current);
        console.log('%cOriginal:', 'font-weight: bold', originalPositions.get(index.toString()));
      }
      
      updateBadge();
      console.log('');
    }
  });
  
  // Click outside to deselect all
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.seat') && selectedSeats.size > 0) {
      deselectAll();
      console.log('%c✓ Deselected all', 'color: #9aa3b2');
      console.log('');
    }
  });
  
  // ============================================
  // KEYBOARD HANDLER (APPLIES TO ALL SELECTED)
  // ============================================
  document.addEventListener('keydown', (e) => {
    if (selectedSeats.size === 0) return;
    
    let step = 5;
    let sizeStep = 10;
    
    if (e.shiftKey) {
      step = 1;
      sizeStep = 5;
    }
    if (e.altKey) {
      step = 20;
    }
    
    let changed = false;
    let action = '';
    
    switch(e.key) {
      // POSITION (apply to all selected)
      case 'ArrowLeft':
        selectedSeats.forEach(seat => {
          const currentX = parseInt(seat.style.left) || 0;
          seat.style.left = `${currentX - step}px`;
          updatePositionDisplay(seat);
        });
        changed = true;
        action = `← ${step}px`;
        e.preventDefault();
        break;
        
      case 'ArrowRight':
        selectedSeats.forEach(seat => {
          const currentX = parseInt(seat.style.left) || 0;
          seat.style.left = `${currentX + step}px`;
          updatePositionDisplay(seat);
        });
        changed = true;
        action = `→ ${step}px`;
        e.preventDefault();
        break;
        
      case 'ArrowUp':
        selectedSeats.forEach(seat => {
          const currentY = parseInt(seat.style.top) || 0;
          seat.style.top = `${currentY - step}px`;
          updatePositionDisplay(seat);
        });
        changed = true;
        action = `↑ ${step}px`;
        e.preventDefault();
        break;
        
      case 'ArrowDown':
        selectedSeats.forEach(seat => {
          const currentY = parseInt(seat.style.top) || 0;
          seat.style.top = `${currentY + step}px`;
          updatePositionDisplay(seat);
        });
        changed = true;
        action = `↓ ${step}px`;
        e.preventDefault();
        break;
      
      // SIZE (apply to all selected - keeps square)
      case '+':
      case '=':
        selectedSeats.forEach(seat => {
          let currentWidth = parseInt(getComputedStyle(seat).width);
          currentWidth += sizeStep;
          seat.style.width = `${currentWidth}px`;
          seat.style.height = `${currentWidth}px`; // Keep square
          updatePositionDisplay(seat);
        });
        changed = true;
        action = `Size +${sizeStep}px (square locked)`;
        e.preventDefault();
        break;
        
      case '-':
      case '_':
        selectedSeats.forEach(seat => {
          let currentWidth = parseInt(getComputedStyle(seat).width);
          currentWidth = Math.max(100, currentWidth - sizeStep);
          seat.style.width = `${currentWidth}px`;
          seat.style.height = `${currentWidth}px`; // Keep square
          updatePositionDisplay(seat);
        });
        changed = true;
        action = `Size -${sizeStep}px (square locked)`;
        e.preventDefault();
        break;
      
      // COPY OUTPUT
      case 'c':
      case 'C':
        outputPositions();
        e.preventDefault();
        break;
      
      // RESET SELECTED
      case 'r':
      case 'R':
        selectedSeats.forEach(seat => {
          const index = seat.dataset.seatIndex;
          const orig = originalPositions.get(index);
          if (orig) {
            seat.style.left = `${orig.x}px`;
            seat.style.top = `${orig.y}px`;
            seat.style.width = `${orig.width}px`;
            seat.style.height = `${orig.height}px`;
            updatePositionDisplay(seat);
          }
        });
        console.log(`%c↺ RESET ${selectedSeats.size} seat(s) to original`, 'color: #ff5100; font-size: 14px');
        e.preventDefault();
        break;
      
      // RESET ALL
      case 'a':
      case 'A':
        if (e.ctrlKey || e.metaKey) {
          // Ctrl/Cmd+A = Select All
          document.querySelectorAll('.seat').forEach(seat => {
            if (seat.dataset.seatIndex !== undefined) {
              selectSeat(seat);
            }
          });
          updateBadge();
          console.log('%c✨ Selected ALL seats', 'color: #00d4aa; font-size: 14px');
        } else {
          // Just 'A' = Reset All
          if (confirm('Reset ALL seats to original positions?')) {
            document.querySelectorAll('.seat').forEach(seat => {
              const idx = seat.dataset.seatIndex;
              const orig = originalPositions.get(idx);
              if (orig) {
                seat.style.left = `${orig.x}px`;
                seat.style.top = `${orig.y}px`;
                seat.style.width = `${orig.width}px`;
                seat.style.height = `${orig.height}px`;
              }
            });
            selectedSeats.forEach(seat => updatePositionDisplay(seat));
            console.log('%c↺ RESET ALL seats to original', 'color: #ff5100; font-size: 14px');
          }
        }
        e.preventDefault();
        break;
      
      // DESELECT
      case 'Escape':
        deselectAll();
        console.log('%c✓ Deselected all', 'color: #9aa3b2');
        console.log('');
        e.preventDefault();
        break;
    }
    
    if (changed) {
      const seatIndices = Array.from(selectedSeats).map(s => s.dataset.seatIndex).join(', ');
      console.log(`%c${action}`, 'color: #00d4aa', `→ Applied to ${selectedSeats.size} seat(s): [${seatIndices}]`);
    }
  });
  
  // ============================================
  // OUTPUT FUNCTION
  // ============================================
  function outputPositions() {
    console.clear();
    console.log(`%c
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║            📋 FINAL SEAT POSITIONS - COPY BELOW           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `, 'color: #ff5100; font-size: 16px; font-weight: bold; font-family: monospace;');
    
    const positions = [];
    document.querySelectorAll('.seat').forEach(seat => {
      const index = seat.dataset.seatIndex;
      if (index !== undefined) {
        positions.push({
          index: parseInt(index),
          x: parseInt(seat.style.left) || 0,
          y: parseInt(seat.style.top) || 0,
          width: parseInt(getComputedStyle(seat).width),
          height: parseInt(getComputedStyle(seat).height)
        });
      }
    });
    
    positions.sort((a, b) => a.index - b.index);
    
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00d4aa');
    console.log('%c🔧 PASTE THIS INTO calculateSeatPositions()', 'color: #00d4aa; font-size: 14px; font-weight: bold');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00d4aa');
    console.log('');
    console.log('function calculateSeatPositions() {');
    console.log('  return [');
    positions.forEach(p => {
      console.log(`    { index: ${p.index}, x: ${p.x}, y: ${p.y}, width: ${p.width}, height: ${p.height} },`);
    });
    console.log('  ];');
    console.log('}');
    console.log('');
    
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #9aa3b2');
    console.log('%c📊 SUMMARY', 'color: #9aa3b2; font-size: 14px; font-weight: bold');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #9aa3b2');
    console.log('');
    console.log('Total Seats:', positions.length);
    console.log('Average Width:', Math.round(positions.reduce((sum, p) => sum + p.width, 0) / positions.length), 'px');
    console.log('Average Height:', Math.round(positions.reduce((sum, p) => sum + p.height, 0) / positions.length), 'px');
    console.log('');
    console.log('%c✅ Copy the output above and send to AI for integration!', 'color: #00d4aa; font-size: 14px; font-weight: bold');
    console.log('');
  }
  
  console.log('%c💡 TIP: Ctrl/Cmd+Click to select multiple seats, then move/resize them all together!', 'color: #ffd700; font-size: 12px; font-style: italic');
  console.log('');
  
})();
