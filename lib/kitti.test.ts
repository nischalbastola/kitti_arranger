import { describe, expect, it } from "vitest"
import {
  type Card,
  type HouseRules,
  type Rank,
  type Suit,
  KittiError,
  STRONG_HAND_THRESHOLD,
  arrange,
  evaluateHand,
  generateOrderedSplits,
  legalSplits,
  standardDeck,
} from "./kitti"

const OFF: HouseRules = {
  enable_four_of_a_kind_autowin: false,
  enable_2_3_5_trump: false,
}

const TRUMP: HouseRules = {
  enable_four_of_a_kind_autowin: false,
  enable_2_3_5_trump: true,
}

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit }
}

function hand(spec: string, rules: HouseRules = OFF) {
  const cards = spec.split(/\s+/).map((token) => {
    const suitChar = token.at(-1)
    const rank = token.slice(0, -1) as Rank
    const suit = (
      { h: "hearts", d: "diamonds", c: "clubs", s: "spades" } as const
    )[suitChar as "h" | "d" | "c" | "s"]
    return card(rank, suit)
  })
  return evaluateHand(cards, rules)
}

function ranksOf(cards: Card[]): Rank[] {
  return cards.map((entry) => entry.rank)
}

describe("category ordering", () => {
  it("ranks trail above pure sequence above sequence above color above pair above high card", () => {
    const trail = hand("2h 2d 2c")
    const pure = hand("Ah Kh Qh")
    const sequence = hand("As Kd Qc")
    const color = hand("Ah Kh 9h")
    const pair = hand("Ah Ad Kc")
    const high = hand("As Kd 9c")

    expect(trail.category).toBe("trail")
    expect(pure.category).toBe("pure-sequence")
    expect(sequence.category).toBe("sequence")
    expect(color.category).toBe("color")
    expect(pair.category).toBe("pair")
    expect(high.category).toBe("high-card")

    const scores = [trail, pure, sequence, color, pair, high].map((entry) => entry.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
    for (let index = 0; index < scores.length - 1; index += 1) {
      expect(scores[index]).toBeGreaterThan(scores[index + 1])
    }
  })

  it("orders pure sequences A-K-Q, then A-2-3, then K-Q-J", () => {
    const akq = hand("Ah Kh Qh")
    const a23 = hand("Ad 2d 3d")
    const kqj = hand("Kc Qc Jc")
    const kqjMixed = hand("Ks Qd Jc")

    expect(akq.score).toBeGreaterThan(a23.score)
    expect(a23.score).toBeGreaterThan(kqj.score)
    expect(a23.score).toBeGreaterThan(kqjMixed.score)
    expect(kqj.category).toBe("pure-sequence")
    expect(kqjMixed.category).toBe("sequence")
  })

  it("ranks AAA above KKK and a pair of aces with a 2 above kings with an ace", () => {
    expect(hand("Ah Ad Ac").score).toBeGreaterThan(hand("Kh Kd Kc").score)
    const aces = hand("Ah Ad 2c")
    const kings = hand("Kh Kd As")
    expect(aces.category).toBe("pair")
    expect(kings.category).toBe("pair")
    expect(aces.score).toBeGreaterThan(kings.score)
  })

  it("treats 2-2-3 as the strong-hand floor", () => {
    const worstPair = hand("2h 2s 3c")
    expect(worstPair.category).toBe("pair")
    expect(worstPair.score).toBe(STRONG_HAND_THRESHOLD)
    expect(hand("2h 2s 4c").score).toBeGreaterThan(STRONG_HAND_THRESHOLD)
    expect(hand("As Kd 9c").score).toBeLessThan(STRONG_HAND_THRESHOLD)
  })

  it("does not treat 2-3-5 as a sequence", () => {
    expect(hand("2h 3d 5c").category).toBe("high-card")
    expect(hand("2h 3h 5h").category).toBe("color")
  })
})

describe("ordered splits", () => {
  it("generates 1680 ordered splits before the legality filter", () => {
    const deal = standardDeck().slice(0, 9)
    const splits = generateOrderedSplits(deal)
    expect(splits).toHaveLength(1680)

    const keys = splits.map((groups) =>
      groups
        .map((group) =>
          group
            .map((entry) => `${entry.rank}${entry.suit}`)
            .sort()
            .join("."),
        )
        .join("|"),
    )
    expect(new Set(keys).size).toBe(1680)

    const legal = legalSplits(deal, OFF)
    expect(legal.length).toBeGreaterThan(0)
    expect(legal.length).toBeLessThan(1680)
    for (const [h1, h2, h3] of legal) {
      expect(h1.score).toBeGreaterThanOrEqual(h2.score)
      expect(h2.score).toBeGreaterThanOrEqual(h3.score)
    }
  })
})

describe("arrange", () => {
  const rules = OFF

  it("plays three trails aggressively with AAA, KKK, QQQ", () => {
    const deal = [
      card("A", "hearts"),
      card("A", "diamonds"),
      card("A", "clubs"),
      card("K", "hearts"),
      card("K", "diamonds"),
      card("K", "clubs"),
      card("Q", "hearts"),
      card("Q", "diamonds"),
      card("Q", "clubs"),
    ]
    const result = arrange(deal, rules)
    expect(result.kind).toBe("split")
    if (result.kind !== "split") return
    expect(result.strategy).toBe("aggressive")
    expect(result.labels).toEqual(["Trail", "Trail", "Trail"])
    expect(ranksOf(result.hands[0].cards)).toEqual(["A", "A", "A"])
    expect(ranksOf(result.hands[1].cards)).toEqual(["K", "K", "K"])
    expect(ranksOf(result.hands[2].cards)).toEqual(["Q", "Q", "Q"])
    expect(result.scores[0]).toBeGreaterThanOrEqual(result.scores[1])
    expect(result.scores[1]).toBeGreaterThanOrEqual(result.scores[2])
  })

  it("forces Kitti on a weak nine and keeps the strongest legal middle", () => {
    const deal = [
      card("2", "hearts"),
      card("4", "hearts"),
      card("5", "hearts"),
      card("7", "diamonds"),
      card("8", "diamonds"),
      card("10", "clubs"),
      card("J", "clubs"),
      card("K", "spades"),
      card("A", "spades"),
    ]
    const result = arrange(deal, rules)
    expect(result.kind).toBe("split")
    if (result.kind !== "split") return
    expect(result.strategy).toBe("defensive")
    expect(result.labels[0]).toBe("Color")
    expect(ranksOf(result.hands[0].cards)).toEqual(["5", "4", "2"])
    expect(result.labels[1]).toBe("High Card")
    expect(ranksOf(result.hands[1].cards)).toEqual(["A", "K", "J"])
    expect(result.labels[2]).toBe("High Card")
    expect(ranksOf(result.hands[2].cards)).toEqual(["10", "8", "7"])

    const bestMiddle = Math.max(...legalSplits(deal, rules).map((split) => split[1].score))
    expect(result.scores[1]).toBe(bestMiddle)
    expect(result.scores[0]).toBeGreaterThanOrEqual(result.scores[1])
    expect(result.scores[1]).toBeGreaterThanOrEqual(result.scores[2])
    expect(result.scores[1]).toBeLessThan(STRONG_HAND_THRESHOLD)
  })

  it("auto-wins four aces only when the house rule is on", () => {
    const deal = [
      card("A", "hearts"),
      card("A", "diamonds"),
      card("A", "clubs"),
      card("A", "spades"),
      card("K", "hearts"),
      card("Q", "diamonds"),
      card("J", "clubs"),
      card("9", "spades"),
      card("7", "hearts"),
    ]
    expect(arrange(deal, { ...OFF, enable_four_of_a_kind_autowin: true })).toEqual({
      kind: "auto-win",
      rank: "A",
    })
    const split = arrange(deal, OFF)
    expect(split.kind).toBe("split")
    if (split.kind !== "split") return
    expect(split.scores[0]).toBeGreaterThanOrEqual(split.scores[1])
    expect(split.scores[1]).toBeGreaterThanOrEqual(split.scores[2])
    expect(split.labels[0]).toBe("Trail")
  })

  it("lets offsuit 2-3-5 trump a trail and leaves suited 2-3-5 as color", () => {
    const offsuit = [
      card("2", "hearts"),
      card("3", "diamonds"),
      card("5", "clubs"),
      card("A", "hearts"),
      card("A", "diamonds"),
      card("A", "clubs"),
      card("9", "spades"),
      card("8", "diamonds"),
      card("6", "clubs"),
    ]
    const trump = evaluateHand(offsuit.slice(0, 3), TRUMP)
    const aces = evaluateHand(offsuit.slice(3, 6), TRUMP)
    expect(trump.category).toBe("trump-235")
    expect(trump.label).toBe("2-3-5 Trump")
    expect(trump.score).toBeGreaterThan(aces.score)

    const arranged = arrange(offsuit, TRUMP)
    expect(arranged.kind).toBe("split")
    if (arranged.kind !== "split") return
    expect(arranged.labels[0]).toBe("2-3-5 Trump")
    expect(arranged.labels[1]).toBe("Trail")
    expect(ranksOf(arranged.hands[1].cards)).toEqual(["A", "A", "A"])

    const suited = [
      card("2", "hearts"),
      card("3", "hearts"),
      card("5", "hearts"),
      card("A", "diamonds"),
      card("A", "clubs"),
      card("A", "spades"),
      card("K", "diamonds"),
      card("9", "clubs"),
      card("7", "spades"),
    ]
    expect(evaluateHand(suited.slice(0, 3), TRUMP).category).toBe("color")
    const suitedResult = arrange(suited, TRUMP)
    expect(suitedResult.kind).toBe("split")
    if (suitedResult.kind !== "split") return
    expect(suitedResult.labels).toEqual(["Trail", "Color", "High Card"])
    expect(ranksOf(suitedResult.hands[0].cards)).toEqual(["A", "A", "A"])
    expect(suitedResult.labels).not.toContain("2-3-5 Trump")
  })

  it("never returns an illegal hand order", () => {
    const deals = [
      standardDeck().slice(0, 9),
      standardDeck().slice(10, 19),
      [
        card("A", "hearts"),
        card("K", "diamonds"),
        card("Q", "clubs"),
        card("J", "spades"),
        card("9", "hearts"),
        card("7", "diamonds"),
        card("5", "clubs"),
        card("4", "spades"),
        card("2", "hearts"),
      ],
    ]
    for (const deal of deals) {
      const result = arrange(deal, TRUMP)
      expect(result.kind).toBe("split")
      if (result.kind !== "split") continue
      expect(result.scores[0]).toBeGreaterThanOrEqual(result.scores[1])
      expect(result.scores[1]).toBeGreaterThanOrEqual(result.scores[2])
      expect(result.hands.map((entry) => entry.score)).toEqual([...result.scores])
    }
  })

  it("rejects the wrong number of cards and duplicates", () => {
    expect(() => arrange(standardDeck().slice(0, 8), OFF)).toThrow(KittiError)
    expect(() => arrange(standardDeck().slice(0, 8), OFF)).toThrow(/exactly 9/)
    const duplicated = standardDeck().slice(0, 8)
    duplicated.push(duplicated[0])
    expect(() => arrange(duplicated, OFF)).toThrow(KittiError)
    try {
      arrange(duplicated, OFF)
    } catch (error) {
      expect(error).toBeInstanceOf(KittiError)
      expect((error as KittiError).code).toBe("duplicate-card")
    }
  })
})
