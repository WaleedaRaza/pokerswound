import { TableModel } from '../../src/core/models';

const UID = (n: number) => `u${n}` as any;

test('seating and rotation', () => {
  const t = new TableModel();
  t.initSeats(3);
  t.seatPlayer(UID(1), 0 as any);
  t.seatPlayer(UID(2), 1 as any);
  expect(t.seats[0]).toBe('u1');
  expect(t.seats[1]).toBe('u2');
  t.rotateDealer();
  expect(t.dealerButton as any).toBe(1);
  t.removePlayer('u1' as any);
  expect(t.seats[0]).toBeNull();
});
