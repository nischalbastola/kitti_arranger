/**
 * Kitti (Nepali 9 Patti) hand scoring and arrangement.
 *
 * A player holds 9 distinct cards and splits them into three 3-card hands.
 * A split is legal only when score(H1) >= score(H2) >= score(H3).
 *
 * Classic Teen Patti order, high to low:
 *   2-3-5 Trump (house rule, offsuit only) > Trail > Pure Sequence >
 *   Sequence > Color > Pair > High Card.
 *
 * Within a category:
 *   Trail: AAA > KKK > ... > 222
 *   Pure sequence and sequence: A-K-Q, then A-2-3, then K-Q-J, Q-J-10,
 *     down to 4-3-2. A-2-3 is a valid wheel. 2-3-5 is not a sequence.
 *   Color and high card: A > K > Q > J > 10 > ... > 2, then the next card.
 *     Suits never change strength.
 *   Pair: higher pair rank, then the kicker.
 *
 * The absolute score packs the category above every kicker, so a pair always
 * beats any high card. A normal nine returns two legal plays: aggressive
 * maximizes Hand 1 + Hand 2, and defensive maximizes Hand 2.
 */

export const RANKS = [
  "A",
  "K",
  "Q",
  "J",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
] as const

export const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const

export type Rank = (typeof RANKS)[number]
export type Suit = (typeof SUITS)[number]

export type Card = {
  rank: Rank
  suit: Suit
}

export type HouseRules = {
  enable_four_of_a_kind_autowin: boolean
  enable_2_3_5_trump: boolean
  enable_four_pair_reshuffle: boolean
}

export const DEFAULT_RULES: HouseRules = {
  enable_four_of_a_kind_autowin: true,
  enable_2_3_5_trump: false,
  enable_four_pair_reshuffle: false,
}

export type Category =
  | "trump-235"
  | "trail"
  | "pure-sequence"
  | "sequence"
  | "color"
  | "pair"
  | "high-card"

export const CATEGORY_LABEL: Record<Category, string> = {
  "trump-235": "2-3-5 Trump",
  trail: "Trail",
  "pure-sequence": "Pure Sequence",
  sequence: "Sequence",
  color: "Color",
  pair: "Pair",
  "high-card": "High Card",
}

/** 2 = 0 … A = 12. Three kickers fit strictly under 13^3. */
export const RANK_VALUE: Record<Rank, number> = {
  "2": 0,
  "3": 1,
  "4": 2,
  "5": 3,
  "6": 4,
  "7": 5,
  "8": 6,
  "9": 7,
  "10": 8,
  J: 9,
  Q: 10,
  K: 11,
  A: 12,
}

const RANK_BASE = 13
/** Highest high-card code is 12*13^2 + 12*13 + 12 = 2196. */
export const KICKER_SPACE = RANK_BASE ** 3

const CATEGORY_RANK: Record<Category, number> = {
  "high-card": 0,
  pair: 1,
  color: 2,
  sequence: 3,
  "pure-sequence": 4,
  trail: 5,
  "trump-235": 6,
}

export type Hand = [Card, Card, Card]

export type HandEvaluation = {
  cards: Hand
  score: number
  category: Category
  label: string
}

export type ArrangeErrorCode = "invalid-length" | "duplicate-card"

export class KittiError extends Error {
  readonly code: ArrangeErrorCode

  constructor(code: ArrangeErrorCode, message: string) {
    super(message)
    this.name = "KittiError"
    this.code = code
  }
}

export type AutoWinResult = {
  kind: "auto-win"
  rank: Rank
}

export type ReshuffleResult = {
  kind: "reshuffle"
}

export type Play = {
  name: "aggressive" | "defensive"
  hands: [HandEvaluation, HandEvaluation, HandEvaluation]
  scores: [number, number, number]
  labels: [string, string, string]
}

export type SplitResult = {
  kind: "split"
  aggressive: Play
  defensive: Play
}

export type ArrangeResult = AutoWinResult | ReshuffleResult | SplitResult

export function cardKey(card: Card): string {
  return `${card.rank}-${card.suit}`
}

export function standardDeck(): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ rank, suit })
    }
  }
  return cards
}

function isRank(value: string): value is Rank {
  return (RANKS as readonly string[]).includes(value)
}

function isSuit(value: string): value is Suit {
  return (SUITS as readonly string[]).includes(value)
}

function assertNineDistinct(cards: readonly Card[]): void {
  if (cards.length !== 9) {
    throw new KittiError(
      "invalid-length",
      `Kitti needs exactly 9 cards. Received ${cards.length}.`,
    )
  }
  const seen = new Set<string>()
  for (const card of cards) {
    if (!isRank(card.rank) || !isSuit(card.suit)) {
      throw new KittiError(
        "duplicate-card",
        "Every card must be a rank and suit from a standard deck.",
      )
    }
    const key = cardKey(card)
    if (seen.has(key)) {
      throw new KittiError(
        "duplicate-card",
        `${card.rank} of ${card.suit} was dealt more than once.`,
      )
    }
    seen.add(key)
  }
}

function pack(category: Category, within: number): number {
  return CATEGORY_RANK[category] * KICKER_SPACE + within
}

/** Score of the worst pair, 2-2-3. */
export const STRONG_HAND_THRESHOLD = pack("pair", RANK_VALUE["2"] * RANK_BASE + RANK_VALUE["3"])

function isFlush(cards: readonly Card[]): boolean {
  return cards.every((card) => card.suit === cards[0].suit)
}

function isTwoThreeFive(cards: readonly Card[]): boolean {
  const ranks = new Set(cards.map((card) => card.rank))
  return ranks.size === 3 && ranks.has("2") && ranks.has("3") && ranks.has("5")
}

/**
 * Sequence ladder: A-K-Q = 11, A-2-3 = 10, K-Q-J = 9, …, 4-3-2 = 0.
 * Returns null when the three ranks are not a straight. 2-3-5 is null.
 */
export function sequenceStrength(ranks: readonly Rank[]): number | null {
  if (new Set(ranks).size !== 3) return null
  const values = ranks.map((rank) => RANK_VALUE[rank]).sort((a, b) => a - b)
  const [low, mid, high] = values
  if (low === 0 && mid === 1 && high === 12) return 10
  if (mid === low + 1 && high === mid + 1) {
    if (high === 12) return 11
    return high - 2
  }
  return null
}

function highCardCode(cards: readonly Card[]): number {
  const [a, b, c] = cards
    .map((card) => RANK_VALUE[card.rank])
    .sort((x, y) => y - x)
  return a * RANK_BASE * RANK_BASE + b * RANK_BASE + c
}

function pairCode(cards: readonly Card[]): number | null {
  const counts = new Map<Rank, number>()
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1)
  }
  let pairRank: Rank | null = null
  let kicker: Rank | null = null
  for (const [rank, count] of counts) {
    if (count === 2) pairRank = rank
    if (count === 1) kicker = rank
  }
  if (!pairRank || !kicker) return null
  return RANK_VALUE[pairRank] * RANK_BASE + RANK_VALUE[kicker]
}

function trailCode(cards: readonly Card[]): number | null {
  if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
    return RANK_VALUE[cards[0].rank]
  }
  return null
}

const SUIT_ORDER: Record<Suit, number> = {
  spades: 0,
  hearts: 1,
  diamonds: 2,
  clubs: 3,
}

function displayOrder(cards: readonly Card[], category: Category): Hand {
  const copy = [...cards]
  if (category === "trump-235") {
    const order: Rank[] = ["2", "3", "5"]
    return order.map((rank) => copy.find((card) => card.rank === rank)!) as Hand
  }
  if (category === "trail") {
    copy.sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit])
    return copy as Hand
  }
  if (category === "pair") {
    const counts = new Map<Rank, number>()
    for (const card of copy) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1)
    const pairRank = [...counts.entries()].find(([, count]) => count === 2)![0]
    const paired = copy
      .filter((card) => card.rank === pairRank)
      .sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit])
    const kicker = copy.find((card) => card.rank !== pairRank)!
    return [paired[0], paired[1], kicker]
  }
  if (category === "sequence" || category === "pure-sequence") {
    const strength = sequenceStrength(copy.map((card) => card.rank))
    if (strength === 10) {
      const order: Rank[] = ["A", "2", "3"]
      return order.map((rank) => copy.find((card) => card.rank === rank)!) as Hand
    }
  }
  copy.sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank])
  return copy as Hand
}

export function evaluateHand(cards: readonly Card[], rules: HouseRules): HandEvaluation {
  if (cards.length !== 3) {
    throw new KittiError("invalid-length", "A hand is exactly 3 cards.")
  }

  let category: Category
  let within = 0

  if (rules.enable_2_3_5_trump && isTwoThreeFive(cards) && !isFlush(cards)) {
    category = "trump-235"
    within = 0
  } else {
    const straight = sequenceStrength(cards.map((card) => card.rank))
    const flush = isFlush(cards)
    const trail = trailCode(cards)
    const pair = pairCode(cards)
    if (trail !== null) {
      category = "trail"
      within = trail
    } else if (straight !== null && flush) {
      category = "pure-sequence"
      within = straight
    } else if (straight !== null) {
      category = "sequence"
      within = straight
    } else if (flush) {
      category = "color"
      within = highCardCode(cards)
    } else if (pair !== null) {
      category = "pair"
      within = pair
    } else {
      category = "high-card"
      within = highCardCode(cards)
    }
  }

  return {
    cards: displayOrder(cards, category),
    score: pack(category, within),
    category,
    label: CATEGORY_LABEL[category],
  }
}

function combinationsOf<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = []
  const current: T[] = []
  const walk = (start: number) => {
    if (current.length === k) {
      out.push(current.slice())
      return
    }
    const remaining = k - current.length
    for (let index = start; index <= items.length - remaining; index += 1) {
      current.push(items[index])
      walk(index + 1)
      current.pop()
    }
  }
  walk(0)
  return out
}

/**
 * Every ordered assignment of 9 cards into H1, H2, H3.
 * C(9,3) * C(6,3) * C(3,3) = 1680.
 * Cards inside a hand are not permuted; each trio is chosen once.
 */
export function generateOrderedSplits(cards: readonly Card[]): Hand[][] {
  if (cards.length !== 9) {
    throw new KittiError(
      "invalid-length",
      `Generating splits needs exactly 9 cards. Received ${cards.length}.`,
    )
  }
  const indexes = [0, 1, 2, 3, 4, 5, 6, 7, 8]
  const splits: Hand[][] = []
  for (const h1 of combinationsOf(indexes, 3)) {
    const rest = indexes.filter((index) => !h1.includes(index))
    for (const h2 of combinationsOf(rest, 3)) {
      const h3 = rest.filter((index) => !h2.includes(index))
      const take = (group: number[]): Hand => [
        cards[group[0]],
        cards[group[1]],
        cards[group[2]],
      ]
      splits.push([take(h1), take(h2), take(h3)])
    }
  }
  return splits
}

export function legalSplits(
  cards: readonly Card[],
  rules: HouseRules,
): Array<[HandEvaluation, HandEvaluation, HandEvaluation]> {
  const legal: Array<[HandEvaluation, HandEvaluation, HandEvaluation]> = []
  for (const [a, b, c] of generateOrderedSplits(cards)) {
    const h1 = evaluateHand(a, rules)
    const h2 = evaluateHand(b, rules)
    const h3 = evaluateHand(c, rules)
    if (h1.score >= h2.score && h2.score >= h3.score) {
      legal.push([h1, h2, h3])
    }
  }
  return legal
}

function preferAggressive(
  candidate: [HandEvaluation, HandEvaluation, HandEvaluation],
  best: [HandEvaluation, HandEvaluation, HandEvaluation],
): boolean {
  const sumCandidate = candidate[0].score + candidate[1].score
  const sumBest = best[0].score + best[1].score
  if (sumCandidate !== sumBest) return sumCandidate > sumBest
  if (candidate[0].score !== best[0].score) return candidate[0].score > best[0].score
  return candidate[2].score > best[2].score
}

function preferDefensive(
  candidate: [HandEvaluation, HandEvaluation, HandEvaluation],
  best: [HandEvaluation, HandEvaluation, HandEvaluation],
): boolean {
  if (candidate[1].score !== best[1].score) return candidate[1].score > best[1].score
  if (candidate[0].score !== best[0].score) return candidate[0].score > best[0].score
  return candidate[2].score > best[2].score
}

/** Highest rank that appears at least four times, or null. */
export function fourOfAKindRank(cards: readonly Card[]): Rank | null {
  const counts = new Map<Rank, number>()
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1)
  }
  let best: Rank | null = null
  for (const [rank, count] of counts) {
    if (count >= 4 && (best === null || RANK_VALUE[rank] > RANK_VALUE[best])) {
      best = rank
    }
  }
  return best
}

/** Exactly four pair-ranks and one singleton. Four of a kind is not this shape. */
export function isFourPairReshuffle(cards: readonly Card[]): boolean {
  const counts = new Map<Rank, number>()
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1)
  }
  const values = [...counts.values()].sort((a, b) => a - b)
  return values.length === 5 && values[0] === 1 && values.slice(1).every((count) => count === 2)
}

function toPlay(
  name: "aggressive" | "defensive",
  hands: [HandEvaluation, HandEvaluation, HandEvaluation],
): Play {
  return {
    name,
    hands,
    scores: [hands[0].score, hands[1].score, hands[2].score],
    labels: [hands[0].label, hands[1].label, hands[2].label],
  }
}

export function arrange(cards: readonly Card[], rules: HouseRules): ArrangeResult {
  assertNineDistinct(cards)

  if (rules.enable_four_of_a_kind_autowin) {
    const rank = fourOfAKindRank(cards)
    if (rank) return { kind: "auto-win", rank }
  }

  if (rules.enable_four_pair_reshuffle && isFourPairReshuffle(cards)) {
    return { kind: "reshuffle" }
  }

  const legal = legalSplits(cards, rules)
  if (legal.length === 0) {
    throw new KittiError(
      "invalid-length",
      "No legal split exists for these cards.",
    )
  }

  let aggressiveBest = legal[0]
  let defensiveBest = legal[0]
  for (const candidate of legal.slice(1)) {
    if (preferAggressive(candidate, aggressiveBest)) aggressiveBest = candidate
    if (preferDefensive(candidate, defensiveBest)) defensiveBest = candidate
  }

  return {
    kind: "split",
    aggressive: toPlay("aggressive", aggressiveBest),
    defensive: toPlay("defensive", defensiveBest),
  }
}
