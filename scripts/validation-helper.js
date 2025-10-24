
/**
 * Validation Helper - Sprint Utilities
 */

class SprintValidator {
  constructor() {
    this.logPath = 'C:\Users\Waleed\Downloads\pokeher\pokeher\poker-engine\validation-logs/mismatches.json';
    this.progressPath = 'C:\Users\Waleed\Downloads\pokeher\pokeher\poker-engine\validation-logs/sprint-progress.json';
  }

  logMismatch(checkpoint, mismatch) {
    const log = JSON.parse(fs.readFileSync(this.logPath, 'utf8'));
    log.migrations.push({
      checkpoint,
      mismatch,
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(this.logPath, JSON.stringify(log, null, 2));
    console.error('❌ MISMATCH:', checkpoint, mismatch);
  }

  passCheckpoint(checkpoint) {
    const progress = JSON.parse(fs.readFileSync(this.progressPath, 'utf8'));
    progress.checkpointsPassed.push({
      name: checkpoint,
      timestamp: new Date().toISOString()
    });
    progress.currentHour++;
    fs.writeFileSync(this.progressPath, JSON.stringify(progress, null, 2));
    console.log('✅ CHECKPOINT PASSED:', checkpoint);
  }

  failCheckpoint(checkpoint, reason) {
    const progress = JSON.parse(fs.readFileSync(this.progressPath, 'utf8'));
    progress.checkpointsFailed.push({
      name: checkpoint,
      reason,
      timestamp: new Date().toISOString()
    });
    progress.canProceed = false;
    fs.writeFileSync(this.progressPath, JSON.stringify(progress, null, 2));
    console.error('❌ CHECKPOINT FAILED:', checkpoint, reason);
    process.exit(1);
  }

  compareStates(state1, state2, fields) {
    const diffs = [];
    for (const field of fields) {
      const val1 = this.getNestedValue(state1, field);
      const val2 = this.getNestedValue(state2, field);
      
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        diffs.push({ field, monolith: val1, typescript: val2 });
      }
    }
    return diffs;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }
}

module.exports = new SprintValidator();
