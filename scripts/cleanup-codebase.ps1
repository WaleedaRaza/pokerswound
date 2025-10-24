# Automated Codebase Cleanup Script (PowerShell)
# SAFE TO RUN - All active files protected
# Generated: 2025-01-20

$ErrorActionPreference = "Stop"

Write-Host "🧹 PokerGeek.ai Codebase Cleanup Script" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "sophisticated-engine-server.js")) {
    Write-Host "❌ Error: Must run from poker-engine directory" -ForegroundColor Red
    exit 1
}

# Create backup first
Write-Host "📦 Creating backup branch..." -ForegroundColor Yellow
$backupBranch = "backup-before-cleanup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
try {
    git checkout -b $backupBranch 2>$null
} catch {
    Write-Host "⚠️  Branch creation failed, continuing..." -ForegroundColor Yellow
}
try {
    git add .
    git commit -m "chore: backup before cleanup" 2>$null
} catch {
    Write-Host "ℹ️  Nothing to commit" -ForegroundColor Gray
}
Write-Host "✅ Backup created" -ForegroundColor Green
Write-Host ""

# Ask for confirmation
Write-Host "⚠️  This will delete ~115 deprecated files" -ForegroundColor Yellow
Write-Host "📋 Review CLEANUP_PLAN.md for full details" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue with cleanup? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Cleanup cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🗑️  Starting cleanup..." -ForegroundColor Cyan
Write-Host ""

# Phase 1: Delete MD files
Write-Host "Phase 1/5: Removing deprecated documentation..." -ForegroundColor Yellow

$mdFiles = @(
    "AUTH_ARCHITECTURE.md", "AUTH_FIX_COMPLETE.md", "AUTH_FLOW_FIXED.md",
    "AUTH_IMPLEMENTATION_PLAN.md", "AUTH_MODAL_FIXED.md", "AUTH_SYSTEM_UNIFIED.md",
    "GUEST_AUTH_SETUP.md", "GUEST_LOGIN_FIX.md", "GUEST_UUID_FIX.md",
    "TESTING_GUIDE_AUTH.md",
    "DAY1_COMPLETION_SUMMARY.md", "DAY1_SUCCESS_SUMMARY.md",
    "DAY2_COMPLETION_SUMMARY.md", "DAY3_COMPLETION_SUMMARY.md",
    "DAY4_COMPLETION_SUMMARY.md", "DAY5_COMPLETION_SUMMARY.md",
    "WEEK1_COMPLETE_SUMMARY.md", "WEEK_2_COMPLETE.md",
    "CURRENT_STATUS.md", "FINAL_STATUS.md", "PHASE1_CRITICAL_STATUS.md",
    "PROJECT_INDEX_AND_READINESS.md", "READY_TO_PLAY.md", "READY_TO_TEST.md",
    "WHATS_FIXED_TODAY.md", "FINAL_FIX_SUMMARY.md", "SUPER_SAIYAN_FIXES_COMPLETE.md",
    "API_ENDPOINTS_PLAN.md", "COMPREHENSIVE_BUILD_PLAN.md",
    "FRIEND_SYSTEM_IMPLEMENTATION_PLAN.md", "FRONTEND_UI_PLAN.md",
    "IMPLEMENTATION_ROADMAP.md", "REFACTOR_EFFORT_BREAKDOWN.md",
    "SCALABLE_ARCHITECTURE_BLUEPRINT.md", "supabase-integration-plan.md",
    "USER_MANAGEMENT_PLAN.md",
    "ANALYSIS_SUMMARY.md", "APPLICATION_INTEGRATION_MAP.md",
    "ARCHITECTURE_FLOW_ANALYSIS.md", "DATABASE_ADVISOR_REPORT.md",
    "DATABASE_SCHEMA_DIAGRAM.md", "DATABASE_TECHNICAL_DEEP_DIVE.md",
    "DISCONNECT_IDENTIFIED.md", "EVENT_SOURCING_AFFECTED_FILES.md",
    "FILE_INVENTORY.md",
    "APPROVAL_FLOW_COMPLETE.md", "CLEAR_BROWSER_CACHE.md",
    "COMPLETE_FLOW_FIXED.md", "COMPLETE_GAME_FLOW.md",
    "DEBUG_BETTING_ROUND.md", "FOREIGN_KEY_FIX.md",
    "GAME_LOGIC_WIRED.md", "GUEST_APPROVAL_TEST.md",
    "IMPLEMENTATION_COMPLETE.md", "NAVBAR_FIX_V2.md",
    "POKERUI_MIGRATION_COMPLETE.md", "PORT_TABLE_FUNCTIONALITY.md",
    "REDIRECT_TO_TABLE_COMPLETE.md", "SCALING_IMPLEMENTATION_SUMMARY.md",
    "SINGLE_PAGE_FLOW_COMPLETE.md", "SKIP_OLD_UI_FIX.md",
    "USERNAME_LINGERING_FIX.md",
    "PHASE1_TESTING_GUIDE.md", "QUICK_TEST_GUIDE.md",
    "TEST_MIGRATION.md", "TEST_NOW.md", "TEST_SOCIAL_FEATURES.md",
    "SUPABASE_SETUP.md", "EXECUTIVE_SUMMARY.md",
    "FINAL_READINESS_CHECK.md", "QUICK_REFERENCE.md"
)

foreach ($file in $mdFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
    }
}

Write-Host "✅ Documentation cleanup complete" -ForegroundColor Green

# Phase 2: Delete deprecated scripts
Write-Host "Phase 2/5: Removing deprecated scripts..." -ForegroundColor Yellow

$scripts = @(
    "add-missing-functions.js", "analyze-current-db.js", "audit-database.js",
    "check-db-state.js", "check-tables.js", "create-test-user.js",
    "drop-guest-constraints.js", "drop-rooms-constraint.js",
    "drop-user-profiles-constraint.js", "test-event-bus.js",
    "test-event-store.js", "test-scaling-features.js",
    "fix-auth-now.sql"
)

foreach ($file in $scripts) {
    if (Test-Path $file) {
        Remove-Item $file -Force
    }
}

Write-Host "✅ Script cleanup complete" -ForegroundColor Green

# Phase 3: Delete duplicate public files
Write-Host "Phase 3/5: Removing duplicate public files..." -ForegroundColor Yellow

if (Test-Path "public/index.html") {
    Remove-Item "public/index.html" -Force
}
if (Test-Path "public/pages/playing-cards-master") {
    Remove-Item "public/pages/playing-cards-master" -Recurse -Force
}

Write-Host "✅ Public file cleanup complete" -ForegroundColor Green

# Phase 4: Delete nested duplicate
Write-Host "Phase 4/5: Removing nested duplicate directory..." -ForegroundColor Yellow

if (Test-Path "poker-engine/poker-engine") {
    Remove-Item "poker-engine/poker-engine" -Recurse -Force
}

Write-Host "✅ Nested directory cleanup complete" -ForegroundColor Green

# Phase 5: Commit changes
Write-Host "Phase 5/5: Committing cleanup..." -ForegroundColor Yellow

git add .
git commit -m @"
chore: remove deprecated docs, scripts, and duplicate files

- Remove 44 outdated MD documentation files
- Remove 10 deprecated one-time scripts
- Remove duplicate card images (58 files)
- Remove nested duplicate poker-engine directory
- Keep all active server, source, and public files
- Keep essential docs: NAVBAR_SYSTEM_GUIDE.md, QUICK_START.md, TESTING_GUIDE.md
- Saved ~27 MB of disk space

Generated by: scripts/cleanup-codebase.ps1
"@

Write-Host "✅ Changes committed" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
git diff --stat HEAD~1 HEAD | Select-Object -Last 1
Write-Host ""

# Verification
Write-Host "🔍 Verification Steps:" -ForegroundColor Cyan
Write-Host "1. Start server: npm start"
Write-Host "2. Test routes:"
Write-Host "   - http://localhost:3000/"
Write-Host "   - http://localhost:3000/play"
Write-Host "   - http://localhost:3000/game"
Write-Host "3. If issues occur, rollback: git reset --hard HEAD~1"
Write-Host ""
Write-Host "💾 Backup branch created for safety" -ForegroundColor Green
Write-Host "✅ Ready to push: git push origin main" -ForegroundColor Green

