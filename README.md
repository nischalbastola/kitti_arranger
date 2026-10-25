# Kitti

Arrange a Nepali 9 Patti deal. Pick 9 cards from a 52-card deck and Kitti splits them into three Teen Patti hands. A split is legal only when Hand 1 is at least as strong as Hand 2, and Hand 2 is at least as strong as Hand 3.

Classic order, high to low: 2-3-5 Trump (optional) , Trail, Pure Sequence, Sequence, Color, Pair, High Card. Suits never change strength. A-2-3 is a valid wheel. 2-3-5 is not a sequence.

The engine lives in `lib/kitti.ts`. Defense is the normal plan. A lock hand is a trail, or a 2-3-5 trump when that house rule is on. Pure sequence, sequence, color, pair, and high card are not locks.

- **Aggressive** — some legal split has both Hand 1 and Hand 2 as locks. Return the one that maximizes Hand 1 + Hand 2. Ties break on Hand 1, then Hand 3.
- **Defensive (Force Kitti)** — otherwise maximize Hand 2, the kitti hand. Ties break on Hand 1, then Hand 3.

House rules:

- Four of a kind auto-win is on by default. Four of the same rank in the nine cards wins the deal before any split. The switch can turn it off.
- Offsuit 2-3-5 as an absolute trump above Trail. A suited 2-3-5 stays a Color. This switch defaults off.

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
