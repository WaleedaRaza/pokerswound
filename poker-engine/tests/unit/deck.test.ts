import { Deck, Card } from '../../src/core/card';

test('Deck restore and draw', () => {
  const d = new Deck(() => 0.5);
  expect(d.size()).toBe(52);
  const one = d.drawOne();
  expect(one).toBeInstanceOf(Card);
  expect(d.size()).toBe(51);
  d.restore();
  expect(d.size()).toBe(52);
});

