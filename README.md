# Kitti

Arrange a Nepali 9 Patti deal. Pick 9 cards from a 52-card deck and Kitti splits them into three Teen Patti hands. A split is legal only when Hand 1 is at least as strong as Hand 2, and Hand 2 is at least as strong as Hand 3.

Classic order, high to low: 2-3-5 Trump (optional) , Trail, Pure Sequence, Sequence, Color, Pair, High Card. Suits never change strength. A-2-3 is a valid wheel. 2-3-5 is not a sequence.

The engine lives in `lib/kitti.ts`. A normal nine returns both plays.

- **Aggressive — best hands to win two in a row.** Maximize Hand 1 + Hand 2. Ties break on Hand 1, then Hand 3.
- **Defensive — built to win the middle.** Maximize Hand 2. Ties break on Hand 1, then Hand 3.

House rules:

- Four of a kind auto-win is on by default. Four of the same rank in the nine cards wins the deal before any split. The switch can turn it off.
- Four pairs reshuffle is off by default. Turn it on and four pairs plus one single card means reshuffle. Four of a kind is not four pairs. If both rules match, the instant win takes the deal when that switch is on.
- Offsuit 2-3-5 as an absolute trump above Trail. A suited 2-3-5 stays a Color. This switch defaults off. Both plays use the scores it changes.

## Run locally

```bash
npm install
npm run dev
```

The dev server prints its URL. Production build:

```bash
npm run build
npm start
```

## Tests

```bash
npm test
```

Vitest covers category order, the 1680 ordered splits, aggressive and defensive deals, four-of-a-kind auto-win, and the 2-3-5 trump.
