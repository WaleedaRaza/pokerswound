import { GameStateModel } from '../../src/core/models';

test('toAct and action log', () => {
  const g = new GameStateModel({ id: 'g1', street: 'PREFLOP' as any });
  g.setToAct('p1' as any);
  g.logAction({ player: 'p1' as any, type: 'SMALL_BLIND', amount: 1, timestamp: new Date().toISOString() });
  const snap = g.toSnapshot();
  expect(snap.table.toAct).toBe('p1');
  expect(snap.actionHistory.length).toBe(1);
});
