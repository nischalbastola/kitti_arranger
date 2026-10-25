# Kitti

Arrange a Nepali 9 Patti deal. Pick 9 cards from a 52-card deck and Kitti splits them into three Teen Patti hands. A split is legal only when Hand 1 is at least as strong as Hand 2, and Hand 2 is at least as strong as Hand 3.

Classic order, high to low: 2-3-5 Trump (optional) , Trail, Pure Sequence, Sequence, Color, Pair, High Card. Suits never change strength. A-2-3 is a valid wheel. 2-3-5 is not a sequence.

The engine lives in `lib/kitti.ts`. A hand is strong at **Pair or better**. The floor is the worst pair, **2-2-3**, exported as `STRONG_HAND_THRESHOLD` (category packed above the kicker code, value `2198`).

- **Aggressive** — some legal split has both Hand 1 and Hand 2 at or above that floor. Return the one that maximizes Hand 1 + Hand 2. Ties break on Hand 1, then Hand 3.
- **Defensive (Force Kitti)** — otherwise maximize Hand 2. Ties break on Hand 1, then Hand 3.

House rules:

- Four of a kind auto-win, checked before any split.
- Offsuit 2-3-5 as an absolute trump above Trail. A suited 2-3-5 stays a Color.

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
