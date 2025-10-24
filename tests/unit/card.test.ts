import { Card, Suit, Rank } from '../../src/core/card';

test('Card code mapping and toString', () => {
  const c = new Card(Suit.Hearts, Rank.Ace);
  expect(c.toString()).toBe('HA');
});
