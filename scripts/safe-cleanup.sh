#!/bin/bash
# Safe Cleanup Script - Archives unused files without breaking runtime
# Run this script to organize the codebase before new architecture

set -e  # Exit on error

echo "🧹 Starting safe cleanup..."
echo ""

# Create archive directories
echo "📁 Creating archive directories..."
mkdir -p archive/legacy-frontend/tables
mkdir -p archive/legacy-frontend/js
mkdir -p archive/legacy-frontend/css
mkdir -p archive/one-off-scripts
mkdir -p archive/one-off-sql
mkdir -p archive/misc
mkdir -p archive/unused-adapters

# Phase 1: Archive legacy HTML tables (SAFE - not used by minimal-table.html)
echo ""
echo "Phase 1: Archiving legacy HTML tables..."
if [ -f "public/poker-table-zoom-lock.html" ]; then
  mv public/poker-table-zoom-lock.html archive/legacy-frontend/tables/ 2>/dev/null || true
fi
if [ -f "public/poker-table-v2.html" ]; then
  mv public/poker-table-v2.html archive/legacy-frontend/tables/ 2>/dev/null || true
fi
if [ -f "public/poker-table-v3.html" ]; then
  mv public/poker-table-v3.html archive/legacy-frontend/tables/ 2>/dev/null || true
fi
if [ -f "public/poker-table-grid.html" ]; then
  mv public/poker-table-grid.html archive/legacy-frontend/tables/ 2>/dev/null || true
fi
if [ -f "public/poker-table-production.html" ]; then
  mv public/poker-table-production.html archive/legacy-frontend/tables/ 2>/dev/null || true
fi
if [ -f "public/poker-table-final.html" ]; then
  mv public/poker-table-final.html archive/legacy-frontend/tables/ 2>/dev/null || true
fi
if [ -f "public/poker-table-v2-demo.html" ]; then
  mv public/poker-table-v2-demo.html archive/legacy-frontend/tables/ 2>/dev/null || true
fi
if [ -f "public/poker-table-v3-demo.html" ]; then
  mv public/poker-table-v3-demo.html archive/legacy-frontend/tables/ 2>/dev/null || true
fi
if [ -f "public/poker-table-zoom-lock.html.backup" ]; then
  mv public/poker-table-zoom-lock.html.backup archive/legacy-frontend/tables/ 2>/dev/null || true
fi
echo "✅ Legacy tables archived"

# Phase 2: Archive legacy JS (SAFE - not loaded by minimal-table.html)
echo ""
echo "Phase 2: Archiving legacy JS..."
[ -f "public/js/TableRenderer.js" ] && mv public/js/TableRenderer.js archive/legacy-frontend/js/ 2>/dev/null || true
[ -f "public/js/game-state-client.js" ] && mv public/js/game-state-client.js archive/legacy-frontend/js/ 2>/dev/null || true
[ -f "public/js/game-state-manager.js" ] && mv public/js/game-state-manager.js archive/legacy-frontend/js/ 2>/dev/null || true
[ -f "public/js/poker-table-v2.js" ] && mv public/js/poker-table-v2.js archive/legacy-frontend/js/ 2>/dev/null || true
[ -f "public/js/poker-table-production.js" ] && mv public/js/poker-table-production.js archive/legacy-frontend/js/ 2>/dev/null || true
[ -f "public/js/poker-table-grid.js" ] && mv public/js/poker-table-grid.js archive/legacy-frontend/js/ 2>/dev/null || true
[ -f "public/js/action-timer-manager.js" ] && mv public/js/action-timer-manager.js archive/legacy-frontend/js/ 2>/dev/null || true
[ -f "public/js/player-status-manager.js" ] && mv public/js/player-status-manager.js archive/legacy-frontend/js/ 2>/dev/null || true
[ -f "public/js/seat-positioning-tool.js" ] && mv public/js/seat-positioning-tool.js archive/legacy-frontend/js/ 2>/dev/null || true
[ -f "public/js/username-helper.js" ] && mv public/js/username-helper.js archive/legacy-frontend/js/ 2>/dev/null || true
[ -f "public/js/username-modal.js" ] && mv public/js/username-modal.js archive/legacy-frontend/js/ 2>/dev/null || true
[ -f "public/js/error-handler.js" ] && mv public/js/error-handler.js archive/legacy-frontend/js/ 2>/dev/null || true

# Archive components directory if it exists
if [ -d "public/js/components" ]; then
  mv public/js/components archive/legacy-frontend/js/ 2>/dev/null || true
fi
echo "✅ Legacy JS archived"

# Phase 3: Archive legacy CSS (SAFE - not used by active pages)
echo ""
echo "Phase 3: Archiving legacy CSS..."
[ -f "public/css/poker-table-grid.css" ] && mv public/css/poker-table-grid.css archive/legacy-frontend/css/ 2>/dev/null || true
[ -f "public/css/poker-table-production.css" ] && mv public/css/poker-table-production.css archive/legacy-frontend/css/ 2>/dev/null || true
[ -f "public/css/poker-table-v2.css" ] && mv public/css/poker-table-v2.css archive/legacy-frontend/css/ 2>/dev/null || true
[ -f "public/css/poker-table-v3.css" ] && mv public/css/poker-table-v3.css archive/legacy-frontend/css/ 2>/dev/null || true
[ -f "public/css/style.css" ] && mv public/css/style.css archive/legacy-frontend/css/ 2>/dev/null || true
echo "✅ Legacy CSS archived"

# Phase 4: Archive unused adapters (CONFIRMED UNUSED)
echo ""
echo "Phase 4: Archiving unused adapters..."
[ -f "src/adapters/timer-logic.js" ] && mv src/adapters/timer-logic.js archive/unused-adapters/ 2>/dev/null || true
[ -f "src/adapters/post-hand-logic.js" ] && mv src/adapters/post-hand-logic.js archive/unused-adapters/ 2>/dev/null || true
[ -f "src/adapters/misdeal-detector.js" ] && mv src/adapters/misdeal-detector.js archive/unused-adapters/ 2>/dev/null || true
[ -f "src/adapters/game-state-translator.js" ] && mv src/adapters/game-state-translator.js archive/unused-adapters/ 2>/dev/null || true
[ -f "src/adapters/game-state-schema.js" ] && mv src/adapters/game-state-schema.js archive/unused-adapters/ 2>/dev/null || true
[ -f "src/adapters/socket-event-builder.js" ] && mv src/adapters/socket-event-builder.js archive/unused-adapters/ 2>/dev/null || true
echo "✅ Unused adapters archived"

# Phase 5: Archive redundant service (REDUNDANT - functionality moved to routes)
echo ""
echo "Phase 5: Archiving redundant service..."
[ -f "services/game-state-hydrator.js" ] && mv services/game-state-hydrator.js archive/unused-adapters/ 2>/dev/null || true
echo "✅ Redundant service archived"

# Phase 6: Archive one-off scripts (SAFE)
echo ""
echo "Phase 6: Archiving one-off scripts..."
[ -f "fix-domain-events.js" ] && mv fix-domain-events.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "check-schema.js" ] && mv check-schema.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "POSITIONING_TOOL.js" ] && mv POSITIONING_TOOL.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "run-all-migrations.js" ] && mv run-all-migrations.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "run-events-migration.js" ] && mv run-events-migration.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "run-migration-11.js" ] && mv run-migration-11.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "run-migration.js" ] && mv run-migration.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "run-migrations.js" ] && mv run-migrations.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "run-single-migration.js" ] && mv run-single-migration.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "verify-migration.js" ] && mv verify-migration.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "test-day1-persistence.js" ] && mv test-day1-persistence.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "test-day2-3-combined.js" ] && mv test-day2-3-combined.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "test-day2-rate-limiting.js" ] && mv test-day2-rate-limiting.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "test-day4-auth.js" ] && mv test-day4-auth.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "test-persistence.js" ] && mv test-persistence.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "test-week1-final.js" ] && mv test-week1-final.js archive/one-off-scripts/ 2>/dev/null || true
[ -f "test-week2-day1-urls.js" ] && mv test-week2-day1-urls.js archive/one-off-scripts/ 2>/dev/null || true
echo "✅ One-off scripts archived"

# Phase 7: Archive one-off SQL (SAFE)
echo ""
echo "Phase 7: Archiving one-off SQL..."
[ -f "fix-avatar-overwrite.sql" ] && mv fix-avatar-overwrite.sql archive/one-off-sql/ 2>/dev/null || true
[ -f "HOTFIX_DROP_USERNAME_LIMIT.sql" ] && mv HOTFIX_DROP_USERNAME_LIMIT.sql archive/one-off-sql/ 2>/dev/null || true
[ -f "HOTFIX_TRIGGER_ROOM_LIMIT.sql" ] && mv HOTFIX_TRIGGER_ROOM_LIMIT.sql archive/one-off-sql/ 2>/dev/null || true
[ -f "WIPE_LEGACY_DATA.sql" ] && mv WIPE_LEGACY_DATA.sql archive/one-off-sql/ 2>/dev/null || true
[ -f "diagnostic-check.sql" ] && mv diagnostic-check.sql archive/one-off-sql/ 2>/dev/null || true
echo "✅ One-off SQL archived"

# Phase 8: Archive misc files (SAFE)
echo ""
echo "Phase 8: Archiving misc files..."
[ -f "chat.txt" ] && mv chat.txt archive/misc/ 2>/dev/null || true
[ -f "chat2.txt" ] && mv chat2.txt archive/misc/ 2>/dev/null || true
[ -f "chatcontext.txt" ] && mv chatcontext.txt archive/misc/ 2>/dev/null || true
[ -f "context.txt" ] && mv context.txt archive/misc/ 2>/dev/null || true
[ -f "logs.txt" ] && mv logs.txt archive/misc/ 2>/dev/null || true
[ -f "output.txt" ] && mv output.txt archive/misc/ 2>/dev/null || true
[ -f "pokerlogic.txt" ] && mv pokerlogic.txt archive/misc/ 2>/dev/null || true
[ -f "quotes.txt" ] && mv quotes.txt archive/misc/ 2>/dev/null || true
[ -f "project-tree.txt" ] && mv project-tree.txt archive/misc/ 2>/dev/null || true
[ -f "Schemasnapshot.txt" ] && mv Schemasnapshot.txt archive/misc/ 2>/dev/null || true
[ -f "endpoint-audit.txt" ] && mv endpoint-audit.txt archive/misc/ 2>/dev/null || true
[ -f "CONTRIBUTION_TEST.txt" ] && mv CONTRIBUTION_TEST.txt archive/misc/ 2>/dev/null || true
[ -f "test.env" ] && mv test.env archive/misc/ 2>/dev/null || true
[ -f "sophisticated-engine-server.backup.js" ] && mv sophisticated-engine-server.backup.js archive/misc/ 2>/dev/null || true
[ -f "public/Untitled-4.txt" ] && mv public/Untitled-4.txt archive/misc/ 2>/dev/null || true
[ -f "public/pages/**🎯 BRILLIANT APPROACH!** Manual positi.md" ] && mv "public/pages/**🎯 BRILLIANT APPROACH!** Manual positi.md" archive/misc/ 2>/dev/null || true
[ -f "public/pages/n terms of design, i want it to be like .md" ] && mv "public/pages/n terms of design, i want it to be like .md" archive/misc/ 2>/dev/null || true
echo "✅ Misc files archived"

# Phase 9: Archive old project folder (SAFE - historical reference)
echo ""
echo "Phase 9: Archiving old project folder..."
if [ -d "pokeher" ]; then
  mv pokeher archive/old-project/ 2>/dev/null || true
  echo "✅ Old project folder archived"
else
  echo "⚠️  pokeher/ not found (may already be archived)"
fi

# Summary
echo ""
echo "✅ CLEANUP COMPLETE!"
echo ""
echo "📊 Summary:"
echo "  - Legacy frontend files → archive/legacy-frontend/"
echo "  - Unused adapters → archive/unused-adapters/"
echo "  - One-off scripts → archive/one-off-scripts/"
echo "  - One-off SQL → archive/one-off-sql/"
echo "  - Misc files → archive/misc/"
echo "  - Old project → archive/old-project/"
echo ""
echo "⚠️  IMPORTANT: Test the runtime to ensure nothing broke!"
echo "   Run: npm start"
echo "   Then test: Create room, join, play a hand"

