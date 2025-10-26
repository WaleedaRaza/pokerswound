# 🤖 AI Assistant Execution Guide

**For:** Cursor AI, GitHub Copilot, ChatGPT, Claude  
**Purpose:** How to use the migration framework to execute tasks reliably  
**Read this first before starting any migration task**

---

## 🎯 Your Role

You are executing a **complex, multi-phase migration** of a production poker application. Your job is to:

1. **Understand context** before making changes
2. **Follow instructions precisely** without improvisation
3. **Validate your work** before marking complete
4. **Document everything** for the next AI or human
5. **Ask for help** when instructions are ambiguous

**You are NOT here to:**
- ❌ Suggest improvements (stick to the plan)
- ❌ Refactor code (unless explicitly instructed)
- ❌ Skip validation steps (they catch your mistakes)
- ❌ Make decisions about priorities (follow the task order)

---

## 📚 Document Hierarchy

```
1. AI_ASSISTANT_GUIDE.md (YOU ARE HERE)
   ↓ Read this first - it tells you HOW to work
   
2. ARCHITECTURAL_CONTRACTS.md
   ↓ Read before touching any layer - defines boundaries
   
3. MIGRATION_FRAMEWORK.md
   ↓ Contains all tasks - your instruction manual
   
4. migration-tasks.yaml
   ↓ Update this as you work - your progress tracker
   
5. TECHNICAL_DEBT_AUDIT.md
   ↓ Context about WHY we're migrating
   
6. MIGRATION_COMPLETION_CHECKLIST.md
   ↓ Week-by-week breakdown for humans
```

**Read in this order:**
1. This file (understand how to work)
2. ARCHITECTURAL_CONTRACTS.md (understand system boundaries)
3. MIGRATION_FRAMEWORK.md Task 1.1 (start executing)

---

## 🔄 Standard Workflow

### Step 1: Claim a Task

**Before starting any work:**

```yaml
# 1. Open migration-tasks.yaml
# 2. Find next READY task
# 3. Check dependencies are COMPLETE
# 4. Update task status:

- id: "1.1"
  status: IN_PROGRESS  # Changed from READY
  assignee: "cursor-ai"  # Add your identifier
  started_at: "2025-10-21T14:30:00Z"  # Add timestamp
```

**Prompt to use:**
```
I am starting Task 1.1 from MIGRATION_FRAMEWORK.md.

Before I begin, verify:
1. All dependencies are COMPLETE
2. No other AI is working on this task
3. I have read the CONTEXT section
4. I understand all CONSTRAINTS

Confirm I should proceed.
```

---

### Step 2: Read Task Documentation

**What to read:**

```markdown
# In MIGRATION_FRAMEWORK.md:

## Task 1.1: [Name]

### CONTEXT
- [ ] I understand what currently exists
- [ ] I understand what I'm changing
- [ ] I understand why it matters

### CONSTRAINTS (DO NOT)
- [ ] I have read all DO NOT rules
- [ ] I will NOT touch these files: [list]
- [ ] I will preserve this behavior: [list]

### ARCHITECTURAL_CONTRACTS.md
- [ ] I know which layer(s) I'm modifying
- [ ] I understand that layer's responsibilities
- [ ] I know what that layer MUST NOT do
```

**If anything is unclear:**
```
Task 1.1 CONTEXT says "use existing database connection"
but I don't see where that's defined.

Question: Is it the getDb() function around line 101?

I will NOT proceed until this is clarified.
```

---

### Step 3: Execute Instructions

**Follow the step-by-step guide EXACTLY:**

```markdown
### INSTRUCTIONS

**Step 1: Add feature flag system**

File: `sophisticated-engine-server.js`
Location: After line 84

Insert this code:
[code block]
```

**What "exactly" means:**

✅ **DO:**
- Copy code block character-for-character
- Insert at the exact line specified
- Preserve all whitespace and formatting
- Add inline comments as shown

❌ **DON'T:**
- "Improve" the code
- Change variable names
- Reorder lines
- Skip comments

**Prompt after each step:**
```
Step 1 complete.

Changes made:
- File: sophisticated-engine-server.js
- Lines added: 85-120
- Code inserted matches template: YES

Proceeding to Step 2.
```

---

### Step 4: Validate Your Work

**Run ALL validation tests:**

```markdown
### VALIDATION

# Test 1: Server starts with OLD implementation
node sophisticated-engine-server.js

Expected output:
"📦 Using in-memory Map storage"

Actual output:
[paste output here]

Status: PASS / FAIL
```

**For EVERY test:**
1. Run the command
2. Compare actual output to expected
3. Mark PASS or FAIL
4. If FAIL, check CONSTRAINTS for what you broke

**Prompt for validation:**
```
Running validation for Task 1.1:

Test 1: PASS - Server starts successfully
Test 2: PASS - Feature flags accessible
Test 3: FAIL - StorageAdapter not defined

Error: ReferenceError: StorageAdapter is not defined
  at sophisticated-engine-server.js:95

This indicates I made a mistake in Step 2.
I will execute ROLLBACK procedure now.
```

---

### Step 5: Update Task Tracker

**In migration-tasks.yaml:**

```yaml
- id: "1.1"
  status: TESTING  # Changed from IN_PROGRESS
  files_modified:
    - "sophisticated-engine-server.js"
  actual_minutes: 35
  completed_at: "2025-10-21T15:05:00Z"
  validation_passed: true  # All tests passed
  rollback_tested: false  # Not tested yet
  notes:
    - "All validation tests passed"
    - "Server starts with both flag values"
```

---

### Step 6: Test Rollback

**CRITICAL: Verify you can undo your changes:**

```bash
# Save current state
cp sophisticated-engine-server.js sophisticated-engine-server.js.backup

# Follow ROLLBACK instructions from task
git diff sophisticated-engine-server.js
git checkout sophisticated-engine-server.js

# Verify server still works
node sophisticated-engine-server.js
# Expected: Runs without errors (old behavior)

# Restore your changes
mv sophisticated-engine-server.js.backup sophisticated-engine-server.js
```

**Update task tracker:**
```yaml
- id: "1.1"
  status: COMPLETE  # Changed from TESTING
  rollback_tested: true
  notes:
    - "Rollback successful via git checkout"
```

---

### Step 7: Update Dependencies

**Unlock blocked tasks:**

```yaml
- id: "1.2"
  status: READY  # Changed from BLOCKED
  dependencies: ["1.1"]  # Dependency now satisfied
```

---

### Step 8: Commit & Document

**Commit message format:**
```
[MIGRATION] Task 1.1: Initialize Repository Infrastructure

Phase: 1 (Database Persistence)
Level: L3 (Multi-File)
Status: COMPLETE

Files modified:
- sophisticated-engine-server.js (lines 85-180)

Changes:
- Added MIGRATION_FLAGS system
- Added StorageAdapter abstraction
- Initialized gamesRepository conditionally

Validation:
- All 3 tests passed
- Rollback tested and successful

Rollback: git revert <commit-hash>
See: MIGRATION_FRAMEWORK.md Task 1.1

Co-authored-by: cursor-ai
```

---

## 🚨 Error Handling Protocol

### When Validation Fails

**DON'T panic and start fixing randomly. Follow protocol:**

```
Task 1.1 validation FAILED.

Test 2: Server crashes on startup
Error: TypeError: Cannot read property 'get' of undefined

Analysis:
1. Which CONSTRAINT did I violate?
   → Checked CONSTRAINTS section
   → Did NOT violate any DO NOT rules

2. Which INSTRUCTION did I miss?
   → Reviewed Step 2
   → Forgot to export StorageAdapter

3. What layer is affected?
   → Read ARCHITECTURAL_CONTRACTS.md
   → This is Application layer issue

Fix:
- Add module.exports.StorageAdapter = StorageAdapter;
- Re-run validation

Should I proceed with fix or rollback?
```

**Decision tree:**
```
Is fix < 5 minutes? → YES → Fix and re-validate
                    ↓ NO
                    Execute ROLLBACK
                    Mark task FAILED
                    Ask human for review
```

---

### When Instructions Are Ambiguous

**Example ambiguity:**
```
Task says: "Update the endpoint around line 1200"
Problem: There are 3 endpoints between lines 1150-1250
```

**Correct response:**
```
Task 1.2 INSTRUCTIONS are ambiguous.

Instruction: "Update the endpoint around line 1200"
Ambiguity: Three endpoints exist in range (1180, 1210, 1240)

I will NOT guess. Please clarify:
- Is it GET /api/games/:id (line 1210)?
- Or GET /api/games/:id/state (line 1240)?

Waiting for clarification before proceeding.
```

**NEVER:**
- ❌ Guess which endpoint
- ❌ Update all three "to be safe"
- ❌ Pick randomly

---

### When You Break Something

**Symptoms of breakage:**
- Server won't start
- Tests fail that previously passed
- Frontend stops working
- Database queries failing

**Immediate action:**
```
STOP. DO NOT CONTINUE.

1. Execute ROLLBACK immediately
   git checkout sophisticated-engine-server.js

2. Verify rollback worked
   node sophisticated-engine-server.js
   [Server should start successfully]

3. Document what broke
   Task: 1.2
   Step: 2
   Error: [full error message]
   Suspected cause: [your analysis]

4. Update task tracker
   status: FAILED
   notes: "Rolled back due to [error]"

5. Notify human
   "Task 1.2 failed. System rolled back safely.
    No data loss. Ready for review."
```

---

## 🎯 Quality Checklist

**Before marking task COMPLETE:**

- [ ] All INSTRUCTIONS executed exactly as written
- [ ] Zero CONSTRAINTS violated
- [ ] All validation tests PASS
- [ ] Rollback tested and works
- [ ] Task tracker updated in migration-tasks.yaml
- [ ] Inline comments added to modified code
- [ ] Git commit created with proper format
- [ ] Next task dependencies updated
- [ ] No new linter errors introduced
- [ ] Server starts without errors
- [ ] Frontend still works (if applicable)

**If ANY checkbox is unchecked:**
→ Task is NOT complete
→ Continue working or mark FAILED

---

## 📊 Daily Progress Report

**At end of work session, generate report:**

```markdown
# Migration Progress Report
Date: 2025-10-21
AI: cursor-ai
Session duration: 4 hours

## Completed Tasks
- Task 1.1: Initialize Repository Infrastructure ✅
  - Time: 35 minutes (estimated: 30)
  - Validation: 3/3 tests passed
  - Rollback: Tested successfully
  
- Task 1.2: Migrate GET /api/games/:id ✅
  - Time: 25 minutes (estimated: 20)
  - Validation: 3/3 tests passed
  - Rollback: Tested successfully

## In Progress
- Task 1.3: Migrate POST /api/games 🔄
  - Status: Step 2 of 4
  - Blockers: None
  - ETA: 15 minutes

## Issues Encountered
1. Task 1.2 Step 1: Ambiguous line number
   - Resolution: Clarified with human
   - Time lost: 10 minutes

## Feature Flag Status
- USE_DB_REPOSITORY: true (enabled for testing)
- USE_INPUT_VALIDATION: false
- USE_AUTH_MIDDLEWARE: false

## Testing Status
- Unit tests: 47/47 passing ✅
- Integration tests: 12/12 passing ✅
- E2E tests: 4/5 passing (1 flaky)

## Metrics
- Tasks completed: 2/42 (5%)
- Phase 1 progress: 2/7 (29%)
- Estimated time remaining: 9.5 weeks

## Recommendations
1. Task 1.3 ready to complete tomorrow
2. E2E test "game_flow_test.js" needs investigation
3. Consider pair programming for Task 1.4 (complex)

## Next Session Plan
1. Complete Task 1.3
2. Begin Task 1.4
3. Fix flaky E2E test
```

---

## 🤝 Human Collaboration

### When to Ask Human

**ASK when:**
- Instructions are ambiguous
- Validation fails and root cause unclear
- Need to make architectural decision
- Test results unexpected
- Want to skip a constraint
- Task blocked by external dependency

**DON'T ask when:**
- You can figure it out from docs
- Simple typo in your code
- Test failed due to your mistake
- Just need to retry

**How to ask:**
```
Task 1.2 requires human review.

Context:
- Task: Migrate GET /api/games/:id
- Step: 2 (Update endpoint)
- Issue: Unclear which validation to use

Question:
Should I use:
A) Existing validation (none)
B) Add new validation now
C) Skip validation until Task 2.1

Impact of options:
A) Maintains current behavior (Task 1.2 scope)
B) Out of scope (validation is Phase 2)
C) Creates technical debt

My recommendation: Option A
Reason: Follows task scope, validation comes later

Awaiting human decision.
```

---

## 🎓 Learning From Mistakes

**After a FAILED task:**

```markdown
# Post-Mortem: Task 1.3 Failure

## What Happened
- Task: Migrate POST /api/games
- Failed at: Validation Step 2
- Error: Database connection timeout

## Root Cause
- Did not check database health before starting
- Supabase was auto-paused
- CONSTRAINT said "check DB available" - I skipped it

## What I Learned
1. CONSTRAINTS exist for a reason - don't skip
2. Always verify external dependencies first
3. Database issues need different handling than code bugs

## Prevention for Future
- [ ] Add to pre-flight checklist: Check DB health
- [ ] Update INSTRUCTIONS to be more explicit
- [ ] Add database health check to validation
```

---

## 🚀 Advanced Techniques

### Parallel Task Execution

**Some tasks can run in parallel:**

```yaml
# These can be done simultaneously:
- Task 2.1: Add Zod schemas (backend)
- Task 3.5: Update frontend auth (frontend)

# No dependencies between them
```

**Coordination:**
```
I notice Task 2.1 and Task 3.5 can run in parallel.

Task 2.1: Backend validation (no frontend impact)
Task 3.5: Frontend auth (no validation impact)

Can another AI take Task 3.5 while I do 2.1?
This would save 1 hour.
```

### Batch Validation

**Instead of test after each change:**

```
Tasks 1.1, 1.2, 1.3 all modify same file.

Plan:
1. Complete all three tasks
2. Run full validation suite once
3. Commit all three together

Risk: Harder to isolate failures
Benefit: Faster execution

Recommendation: Only do this for related tasks
```

---

## 📖 Quick Reference

### File Locations
```
Main server: sophisticated-engine-server.js
TypeScript source: src/
Compiled output: dist/
Task tracker: migration-tasks.yaml
Framework: MIGRATION_FRAMEWORK.md
Contracts: ARCHITECTURAL_CONTRACTS.md
```

### Common Commands
```bash
# Start server
node sophisticated-engine-server.js

# With feature flag
USE_DB_REPOSITORY=true node sophisticated-engine-server.js

# Run tests
npm test

# TypeScript compilation
npm run build

# Check linting
npm run lint

# Database health
curl http://localhost:3000/health/db
```

### Status Values
```yaml
READY        # Can start now
BLOCKED      # Waiting for dependency
IN_PROGRESS  # Currently working
TESTING      # Validation in progress
COMPLETE     # All done, verified
FAILED       # Attempted but failed
```

---

## ✅ Final Checklist Before Starting

**Have you:**
- [ ] Read this entire guide
- [ ] Read ARCHITECTURAL_CONTRACTS.md
- [ ] Reviewed MIGRATION_FRAMEWORK.md overview
- [ ] Located migration-tasks.yaml
- [ ] Understood your role (executor, not designer)
- [ ] Know when to ask for help
- [ ] Ready to follow instructions precisely

**If all checked:**
→ Proceed to MIGRATION_FRAMEWORK.md Task 1.1
→ Good luck! 🚀

**If any unchecked:**
→ Go back and read that section
→ Don't start until you understand

---

**Remember:** You're part of a bigger system. Follow the process, document everything, and don't improvise. The framework exists because we learned from past mistakes. Trust it.

**Document Version:** 1.0  
**Last Updated:** October 21, 2025  
**Maintained By:** AI + Human Engineering Team

