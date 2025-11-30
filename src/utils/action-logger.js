const DEFAULT_LEVEL = process.env.ENGINE_LOG_DETAIL === 'detail' ? 'detail' : 'summary';

let logDetailLevel = DEFAULT_LEVEL;

function setLogDetail(level) {
  if (!level) return;
  logDetailLevel = level === 'detail' ? 'detail' : 'summary';
}

function obfuscateId(value) {
  if (!value || typeof value !== 'string') return value || '';
  return value.length <= 8 ? value : value.substring(0, 8);
}

function formatMoney(amount) {
  if (amount === null || amount === undefined) return '';
  if (typeof amount !== 'number') return `${amount}`;
  return `$${amount}`;
}

function buildPrefix(summary) {
  const parts = [];
  if (summary.handNumber !== undefined) parts.push(`HAND ${summary.handNumber}`);
  if (summary.roomId) parts.push(`ROOM ${obfuscateId(summary.roomId)}`);
  if (summary.seq !== undefined) parts.push(`SEQ ${summary.seq}`);
  if (summary.phase) parts.push(summary.phase.toUpperCase());
  return parts.length ? `[${parts.join('] [')}]` : '[EVENT]';
}

function buildMessage(summary) {
  const items = [];

  if (summary.playerId) {
    const seat = summary.seatIndex !== undefined ? `Seat ${summary.seatIndex}` : 'Seat ?';
    items.push(`${seat} (${obfuscateId(summary.playerId)})`);
  }

  if (summary.action) {
    const amount = summary.amount !== undefined ? ` ${formatMoney(summary.amount)}` : '';
    items.push(`${summary.action}${amount}`);
  }

  if (summary.street) {
    items.push(`@ ${summary.street}`);
  }

  if (summary.pot !== undefined) {
    items.push(`Pot=${formatMoney(summary.pot)}`);
  }

  if (summary.currentBet !== undefined) {
    items.push(`CurrentBet=${formatMoney(summary.currentBet)}`);
  }

  if (summary.nextActorSeat !== undefined) {
    items.push(`Next=${summary.nextActorSeat === null ? 'None' : `Seat ${summary.nextActorSeat}`}`);
  }

  if (summary.metadata) {
    const metaPairs = Object.entries(summary.metadata)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}=${value}`);
    if (metaPairs.length) {
      items.push(metaPairs.join(' '));
    }
  }

  return items.join(' | ');
}

function logActionSummary(summary = {}) {
  const prefix = buildPrefix(summary);
  const message = buildMessage(summary);
  console.log(`${prefix} ${message}`);
}

function logActionDetail(label, payload) {
  if (logDetailLevel !== 'detail') return;
  console.log(`   ${label}:`, payload);
}

module.exports = {
  setLogDetail,
  logActionSummary,
  logActionDetail,
  obfuscateId
};


