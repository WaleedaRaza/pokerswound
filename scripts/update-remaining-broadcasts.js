#!/usr/bin/env node
/**
 * Quick script to show remaining broadcasts that need sequence numbers
 */

const fs = require('fs');
const path = require('path');

const files = [
  'routes/rooms.js',
  'routes/games.js',
  'sophisticated-engine-server.js',
  'websocket/socket-handlers.js'
];

console.log('🔍 Finding broadcasts without sequence numbers...\n');

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${file}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let found = false;
  
  lines.forEach((line, index) => {
    // Look for emit calls without 'seq:' in nearby lines
    if (line.includes('.emit(') && !line.includes('seq:')) {
      // Check if this looks like an old-style emit
      if (!line.includes('type:') && !line.includes('version:')) {
        if (!found) {
          console.log(`\n📁 ${file}:`);
          found = true;
        }
        console.log(`  Line ${index + 1}: ${line.trim()}`);
      }
    }
  });
  
  if (!found) {
    console.log(`✅ ${file} - All broadcasts updated`);
  }
});

console.log('\n📝 Remaining updates needed for:');
console.log('  - player_rejected');
console.log('  - room_closed');
console.log('  - player_left');
console.log('  - player_kicked');
console.log('  - player_set_away');
console.log('  - capacity_changed');
console.log('  - player_rebuy');
console.log('\nPlus any in websocket handlers!');
