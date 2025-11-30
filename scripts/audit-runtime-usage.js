#!/usr/bin/env node
/**
 * Runtime Usage Audit
 * Identifies what files are actually used vs unused
 */

const fs = require('fs');
const path = require('path');

const USED_FILES = new Set();
const UNUSED_FILES = new Set();
const CHECKED_FILES = new Set();

// Entry points
const ENTRY_POINTS = [
  'sophisticated-engine-server.js',
  'public/minimal-table.html',
  'routes/game-engine-bridge.js',
  'routes/rooms.js',
  'routes/games.js',
  'routes/auth.js',
  'routes/social.js',
  'routes/pages.js',
  'routes/v2.js',
  'routes/sandbox.js'
];

function resolvePath(filePath, fromDir) {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return path.resolve(fromDir, filePath);
  }
  if (filePath.startsWith('/')) {
    return filePath;
  }
  // Node modules
  return null;
}

function extractRequires(content, filePath) {
  const requires = [];
  const dir = path.dirname(filePath);
  
  // require('...')
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = requireRegex.exec(content)) !== null) {
    const resolved = resolvePath(match[1], dir);
    if (resolved && !resolved.includes('node_modules')) {
      requires.push(resolved);
    }
  }
  
  // import ... from '...'
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  while ((match = importRegex.exec(content)) !== null) {
    const resolved = resolvePath(match[1], dir);
    if (resolved && !resolved.includes('node_modules')) {
      requires.push(resolved);
    }
  }
  
  // <script src="...">
  const scriptRegex = /<script\s+src=['"]([^'"]+)['"]/g;
  while ((match = scriptRegex.exec(content)) !== null) {
    const resolved = resolvePath(match[1], dir);
    if (resolved) {
      requires.push(resolved);
    }
  }
  
  // <link rel="stylesheet" href="...">
  const linkRegex = /<link[^>]+href=['"]([^'"]+)['"]/g;
  while ((match = linkRegex.exec(content)) !== null) {
    const resolved = resolvePath(match[1], dir);
    if (resolved) {
      requires.push(resolved);
    }
  }
  
  return requires;
}

function checkFile(filePath) {
  if (CHECKED_FILES.has(filePath)) return;
  CHECKED_FILES.add(filePath);
  
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    // Try with .js extension
    const jsPath = fullPath + '.js';
    if (fs.existsSync(jsPath)) {
      filePath = filePath + '.js';
    } else {
      return;
    }
  }
  
  USED_FILES.add(filePath);
  
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
    const requires = extractRequires(content, filePath);
    
    requires.forEach(req => {
      checkFile(req);
    });
  } catch (err) {
    // Skip if can't read
  }
}

// Check all entry points
console.log('🔍 Auditing runtime usage...\n');
ENTRY_POINTS.forEach(entry => {
  if (fs.existsSync(path.resolve(process.cwd(), entry))) {
    console.log(`Checking: ${entry}`);
    checkFile(entry);
  }
});

// Find all files in key directories
const DIRS_TO_CHECK = [
  'routes',
  'src/adapters',
  'public/js',
  'public/css',
  'public/pages',
  'services',
  'middleware',
  'config',
  'websocket'
];

const ALL_FILES = new Set();

function getAllFiles(dir, baseDir = '') {
  const fullPath = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) return;
  
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  entries.forEach(entry => {
    const fullEntryPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      getAllFiles(fullEntryPath);
    } else if (entry.isFile() && 
               (entry.name.endsWith('.js') || 
                entry.name.endsWith('.html') || 
                entry.name.endsWith('.css') ||
                entry.name.endsWith('.ts'))) {
      ALL_FILES.add(fullEntryPath);
    }
  });
}

DIRS_TO_CHECK.forEach(dir => getAllFiles(dir));

// Find unused files
ALL_FILES.forEach(file => {
  if (!USED_FILES.has(file)) {
    UNUSED_FILES.add(file);
  }
});

// Output results
console.log('\n✅ USED FILES (' + USED_FILES.size + '):');
Array.from(USED_FILES).sort().forEach(file => {
  console.log(`  ${file}`);
});

console.log('\n❌ POTENTIALLY UNUSED FILES (' + UNUSED_FILES.size + '):');
Array.from(UNUSED_FILES).sort().forEach(file => {
  console.log(`  ${file}`);
});

// Check dist/ usage
console.log('\n📦 DIST/ USAGE:');
const distFiles = [];
function checkDist(dir = 'dist') {
  const fullPath = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) return;
  
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  entries.forEach(entry => {
    const fullEntryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkDist(fullEntryPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const relPath = './' + fullEntryPath.replace(/\\/g, '/');
      const isUsed = Array.from(USED_FILES).some(used => {
        try {
          const content = fs.readFileSync(path.resolve(process.cwd(), used), 'utf8');
          return content.includes(relPath) || content.includes(fullEntryPath.replace(/\\/g, '/'));
        } catch {
          return false;
        }
      });
      distFiles.push({ file: fullEntryPath, used: isUsed });
    }
  });
}
checkDist();

const usedDist = distFiles.filter(f => f.used);
const unusedDist = distFiles.filter(f => !f.used);

console.log(`  Used: ${usedDist.length}/${distFiles.length}`);
usedDist.forEach(f => console.log(`    ✅ ${f.file}`));
console.log(`  Unused: ${unusedDist.length}/${distFiles.length}`);
unusedDist.slice(0, 20).forEach(f => console.log(`    ❌ ${f.file}`));
if (unusedDist.length > 20) {
  console.log(`    ... and ${unusedDist.length - 20} more`);
}

console.log('\n📊 SUMMARY:');
console.log(`  Total files checked: ${ALL_FILES.size}`);
console.log(`  Used files: ${USED_FILES.size}`);
console.log(`  Unused files: ${UNUSED_FILES.size}`);
console.log(`  Dist files: ${distFiles.length} (${usedDist.length} used, ${unusedDist.length} unused)`);

