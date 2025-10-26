# 📚 PokerGeek.AI - Documentation Index

**Last Updated:** October 26, 2025 (Chat #6 - Mira)

---

## 🎯 **ACTIVE DOCUMENTATION** (Root Directory)

### **For Understanding the System:**

**1. [SYSTEM_ARCHITECTURE_MAP.md](SYSTEM_ARCHITECTURE_MAP.md)** ⭐ **PRIMARY REFERENCE**
- Complete system map for refresh bug analysis
- All routes, endpoints, and API paths
- Database schema and persistence patterns
- Frontend architecture (poker.html structure)
- WebSocket communication flows
- Auth system integration
- Game engine components
- **Comprehensive refresh bug diagnosis**
- Debugging checklists and hypotheses

**2. [README.md](README.md)** - Quick Start Guide
- How to run the server
- Project overview
- Current status
- Tech stack
- Contributor guide

**3. [Schemasnapshot.txt](Schemasnapshot.txt)** - Database Schema Reference
- Complete PostgreSQL schema
- All tables, columns, constraints
- Foreign key relationships

**4. [env.example](env.example)** - Configuration Template
- Environment variables needed
- Supabase connection settings
- Database configuration

---

## 📂 **ARCHIVED DOCUMENTATION** (archive/)

### **Historical Context** (archive/history/)
Major documents from previous development phases:
- `ARCHITECTURE_MIGRATION_GUIDE.md` - Original architecture plans
- `PROJECT_MASTER.md` - Initial project roadmap
- `REFRESH_CRISIS_HANDOFF.md` - Original refresh bug analysis
- `REFRESH_FIX_COMPLETE.md` - Anton's attempted fixes
- `START_HERE_NEXT_CHAT.md` - Previous handoff document
- All ATTEMPT_*_COMPLETE.md files

### **Development History** (archive/docs-history/)

**bugs/** - Bug fixes and resolutions:
- Auth fixes (multiple attempts)
- Schema fixes
- Socket.IO broadcast fixes
- Seat management fixes

**decisions/** - Planning and strategy:
- Week 2 battle plans
- Calibration documents
- Roadmap decisions
- Status updates

**modularization/** - Extraction process:
- Complete modularization victory logs
- Router extraction status
- Games router completion
- Wiring plans

**progress/** - Weekly progress reports:
- Week 1-3 completion summaries
- Day-by-day battle plans
- Session summaries

**old/** - Deprecated technical docs:
- Technical debt audits
- Migration checklists
- Architectural contracts
- Old PROJECT_MASTER versions

### **Completed Work** (archive/completed/)
- Final fix summaries
- Migration completion status
- Database fix summaries
- Auth fix completion
- Poker table fix summaries

---

## 🔍 **QUICK REFERENCE**

### **I Need To...**

**...understand the refresh bug**
→ Read `SYSTEM_ARCHITECTURE_MAP.md` Section: "🐛 REFRESH BUG"

**...understand how routes work**
→ Read `SYSTEM_ARCHITECTURE_MAP.md` Section: "🛣️ ROUTING & URL STRUCTURE"

**...understand database persistence**
→ Read `SYSTEM_ARCHITECTURE_MAP.md` Section: "💾 DATABASE SCHEMA & PERSISTENCE"
→ Reference `Schemasnapshot.txt` for exact schema

**...understand WebSocket communication**
→ Read `SYSTEM_ARCHITECTURE_MAP.md` Section: "🔌 WEBSOCKET COMMUNICATION"

**...understand the game engine**
→ Read `SYSTEM_ARCHITECTURE_MAP.md` Section: "🎮 GAME ENGINE"

**...understand authentication**
→ Read `SYSTEM_ARCHITECTURE_MAP.md` Section: "🔐 AUTHENTICATION SYSTEM"

**...see what features are missing**
→ Read `README.md` Section: "🚨 IMMEDIATE PRIORITIES"

**...understand past decisions**
→ Check `archive/docs-history/decisions/`

**...see what bugs were fixed**
→ Check `archive/docs-history/bugs/`

---

## 📋 **DOCUMENTATION PRINCIPLES**

### **What Stays in Root:**
- **Active reference documents** - Current system state
- **Quick start guides** - How to run/use the system
- **Schema references** - Database structure

### **What Goes to Archive:**
- **Historical documents** - Past work, decisions, completed tasks
- **Bug fix logs** - Issues that have been resolved
- **Planning documents** - Plans that have been executed
- **Status reports** - Snapshots of past progress

### **What Gets Deleted:**
- **Redundant documents** - Multiple copies of same info
- **Outdated plans** - Plans that were superseded
- **Temporary files** - Scratch notes, test documents

---

## 🎯 **FOR NEW CONTRIBUTORS**

**Read in this order:**

1. **README.md** (5 min) - Get oriented
2. **SYSTEM_ARCHITECTURE_MAP.md** (30 min) - Deep understanding
3. **Schemasnapshot.txt** (10 min) - Database structure
4. Start coding with full context

---

## 🔄 **MAINTAINING THIS INDEX**

### **When Adding New Docs:**
- Place active references in root
- Place historical context in archive
- Update this index
- Keep root directory clean (< 10 files)

### **When Archiving:**
- Move to appropriate archive/ subdirectory
- Update references in active docs
- Remove from root directory
- Keep file intact (don't delete unless truly redundant)

---

## 📊 **DOCUMENTATION STATS**

**Root Directory:** 5 core files
- SYSTEM_ARCHITECTURE_MAP.md (comprehensive reference)
- README.md (quick start)
- DOCUMENTATION_INDEX.md (this file)
- Schemasnapshot.txt (schema)
- env.example (config template)

**Archive:** ~100+ historical documents
- Organized by category (history, bugs, decisions, etc.)
- All preserved for context
- Not cluttering active workspace

---

## ⚔️ **SHINZO WO SASAGEYO**

Documentation is organized. Single source of truth established.  
Now we fix the refresh bug and build the chess.com of poker.

