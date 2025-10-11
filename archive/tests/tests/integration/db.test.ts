const { getSupabaseServiceClient } = require('../../src/services/database/supabase');
const { createGame } = require('../../src/services/database/repos/games.repo');
const { startHand } = require('../../src/services/database/repos/hands.repo');
const { appendAction, listActionsByHand } = require('../../src/services/database/repos/actions.repo');

const hasEnv = !!process.env['SUPABASE_URL'] && !!process.env['SUPABASE_SERVICE_ROLE_KEY'];

(hasEnv ? test : test.skip)('e2e repos: game -> hand -> actions seq', async () => {
  const db = getSupabaseServiceClient();

  const game = await createGame(db, { small_blind: 1, big_blind: 2, max_players: 9 });
  expect(game.id).toBeDefined();

  const hand = await startHand(db, {
    game_id: game.id,
    hand_no: 1,
    dealer_btn: 0,
    sb_pos: 0,
    bb_pos: 1,
    current_street: 'PREFLOP',
  });
  expect(hand.id).toBeDefined();

  const a1 = await appendAction(db, { game_id: game.id, hand_id: hand.id, action: 'SMALL_BLIND', street: 'PREFLOP', amount: 1 });
  const a2 = await appendAction(db, { game_id: game.id, hand_id: hand.id, action: 'BIG_BLIND', street: 'PREFLOP', amount: 2 });
  expect(a1.seq).toBeDefined();
  expect(a2.seq).toBeGreaterThan(a1.seq);

  const list = await listActionsByHand(db, hand.id);
  expect(list.length).toBeGreaterThanOrEqual(2);
  const seqs = list.map((r: any) => r.seq);
  const sorted = [...seqs].sort((x, y) => x - y);
  expect(seqs).toEqual(sorted);
}, 20000);
