/**
 * SEAT POSITIONING TOOL
 * Use this in browser console to adjust seat positions visually
 * 
 * HOW TO USE:
 * 1. Open browser console (F12)
 * 2. Paste this entire file and press Enter
 * 3. Click any seat to select it
 * 4. Use arrow keys to move (Hold Shift for faster)
 * 5. Press 'S' to see CSS output
 * 6. Press 'C' to copy CSS to clipboard
 * 7. Press 'R' to reset to current values
 */

(function() {
  console.log('🎯 SEAT POSITIONING TOOL ACTIVATED!');
  console.log('');
  console.log('CONTROLS:');
  console.log('  - Click any seat to select it');
  console.log('  - Arrow Keys: Move 1% (Hold Shift for 5%)');
  console.log('  - +/- Keys: Change size');
  console.log('  - S: Show current CSS');
  console.log('  - C: Copy CSS to clipboard');
  console.log('  - R: Reset positions');
  console.log('  - ESC: Deselect seat');
  console.log('');
  
  let selectedSeat = null;
  let seatPositions = {};
  let seatSizes = {};
  
  // Get all seats
  const seats = document.querySelectorAll('.seat');
  
  // Initialize positions from current CSS
  seats.forEach(seat => {
    const index = seat.dataset.seat;
    const style = window.getComputedStyle(seat);
    const parent = seat.parentElement;
    const parentRect = parent.getBoundingClientRect();
    
    // Get current position
    const rect = seat.getBoundingClientRect();
    const left = ((rect.left + rect.width / 2 - parentRect.left) / parentRect.width * 100).toFixed(1);
    const top = ((rect.top + rect.height / 2 - parentRect.top) / parentRect.height * 100).toFixed(1);
    
    seatPositions[index] = { left: parseFloat(left), top: parseFloat(top) };
    
    // Get current size
    const content = seat.querySelector('.seat-content');
    if (content) {
      seatSizes[index] = window.getComputedStyle(content).width;
    }
    
    // Make clickable
    seat.style.cursor = 'pointer';
    seat.style.transition = 'all 0.2s ease';
    
    seat.addEventListener('click', (e) => {
      e.stopPropagation();
      selectSeat(seat);
    });
  });
  
  function selectSeat(seat) {
    // Deselect previous
    if (selectedSeat) {
      selectedSeat.style.outline = '';
    }
    
    selectedSeat = seat;
    seat.style.outline = '3px solid #ff5100';
    seat.style.outlineOffset = '4px';
    
    const index = seat.dataset.seat;
    console.log(`✅ Selected Seat ${index}`);
    console.log(`   Position: left: ${seatPositions[index].left}%, top: ${seatPositions[index].top}%`);
    console.log(`   Size: ${seatSizes[index]}`);
  }
  
  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!selectedSeat) {
      if (e.key.toLowerCase() === 's') {
        showCSS();
      } else if (e.key.toLowerCase() === 'c') {
        copyCSS();
      } else if (e.key.toLowerCase() === 'r') {
        resetPositions();
      }
      return;
    }
    
    const index = selectedSeat.dataset.seat;
    const shift = e.shiftKey ? 5 : 1; // Hold Shift for bigger movements
    
    let moved = false;
    
    switch(e.key) {
      case 'ArrowLeft':
        seatPositions[index].left -= shift;
        moved = true;
        break;
      case 'ArrowRight':
        seatPositions[index].left += shift;
        moved = true;
        break;
      case 'ArrowUp':
        seatPositions[index].top -= shift;
        moved = true;
        break;
      case 'ArrowDown':
        seatPositions[index].top += shift;
        moved = true;
        break;
      case '+':
      case '=':
        // Increase size
        const content = selectedSeat.querySelector('.seat-content');
        if (content) {
          const currentWidth = parseInt(window.getComputedStyle(content).width);
          content.style.width = (currentWidth * 1.1) + 'px';
          seatSizes[index] = content.style.width;
          console.log(`📏 Seat ${index} size: ${seatSizes[index]}`);
        }
        break;
      case '-':
      case '_':
        // Decrease size
        const contentDec = selectedSeat.querySelector('.seat-content');
        if (contentDec) {
          const currentWidth = parseInt(window.getComputedStyle(contentDec).width);
          contentDec.style.width = (currentWidth * 0.9) + 'px';
          seatSizes[index] = contentDec.style.width;
          console.log(`📏 Seat ${index} size: ${seatSizes[index]}`);
        }
        break;
      case 's':
      case 'S':
        showCSS();
        break;
      case 'c':
      case 'C':
        copyCSS();
        break;
      case 'Escape':
        selectedSeat.style.outline = '';
        selectedSeat = null;
        console.log('❌ Deselected');
        break;
    }
    
    if (moved) {
      e.preventDefault();
      updateSeatPosition(selectedSeat, index);
      console.log(`📍 Seat ${index}: left: ${seatPositions[index].left}%, top: ${seatPositions[index].top}%`);
    }
  });
  
  function updateSeatPosition(seat, index) {
    seat.style.left = seatPositions[index].left + '%';
    seat.style.top = seatPositions[index].top + '%';
  }
  
  function showCSS() {
    console.log('');
    console.log('========================================');
    console.log('CURRENT SEAT POSITIONS (CSS):');
    console.log('========================================');
    console.log('');
    
    for (let i = 0; i < 10; i++) {
      if (seatPositions[i]) {
        console.log(`.seat[data-seat="${i}"] { left: ${seatPositions[i].left}%; top: ${seatPositions[i].top}%; }`);
      }
    }
    
    console.log('');
    console.log('SEAT SIZES:');
    for (let i = 0; i < 10; i++) {
      if (seatSizes[i]) {
        console.log(`Seat ${i}: ${seatSizes[i]}`);
      }
    }
    
    console.log('');
    console.log('========================================');
    console.log('Press C to copy this CSS');
    console.log('========================================');
  }
  
  function copyCSS() {
    let css = '/* SEAT POSITIONING */\n';
    for (let i = 0; i < 10; i++) {
      if (seatPositions[i]) {
        css += `.seat[data-seat="${i}"] { left: ${seatPositions[i].left}%; top: ${seatPositions[i].top}%; }\n`;
      }
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(css).then(() => {
      console.log('✅ CSS copied to clipboard!');
      console.log('Paste it into poker-table-grid.css around line 95');
    }).catch(err => {
      console.error('Failed to copy:', err);
      console.log('Here\'s the CSS:');
      console.log(css);
    });
  }
  
  function resetPositions() {
    seats.forEach(seat => {
      seat.style.left = '';
      seat.style.top = '';
      const content = seat.querySelector('.seat-content');
      if (content) {
        content.style.width = '';
      }
    });
    
    // Re-initialize
    seats.forEach(seat => {
      const index = seat.dataset.seat;
      const style = window.getComputedStyle(seat);
      const parent = seat.parentElement;
      const parentRect = parent.getBoundingClientRect();
      
      const rect = seat.getBoundingClientRect();
      const left = ((rect.left + rect.width / 2 - parentRect.left) / parentRect.width * 100).toFixed(1);
      const top = ((rect.top + rect.height / 2 - parentRect.top) / parentRect.height * 100).toFixed(1);
      
      seatPositions[index] = { left: parseFloat(left), top: parseFloat(top) };
    });
    
    console.log('🔄 Reset to current CSS values');
  }
  
  // Deselect on click outside
  document.addEventListener('click', () => {
    if (selectedSeat) {
      selectedSeat.style.outline = '';
      selectedSeat = null;
    }
  });
  
  console.log('✅ Tool ready! Click any seat to start positioning.');
})();

