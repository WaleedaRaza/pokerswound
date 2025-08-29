import { PlayerModel } from '../../src/core/models';

test('Player chip ops and all-in', () => {
  const p = new PlayerModel({ uuid: 'u1' as any, name: 'P1', stack: 100 as any });
  p.collectBet(30 as any);
  expect(p.stack as any).toBe(70);
  expect(p.betThisStreet as any).toBe(30);
  p.allIn();
  expect(p.stack as any).toBe(0);
  expect(p.isAllIn).toBe(true);
});
