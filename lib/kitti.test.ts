import { describe, expect, it } from "vitest"
import {
  type Card,
  type HouseRules,
  type Rank,
  type Suit,
  DEFAULT_RULES,
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
  enable_four_pair_reshuffle: false,
}

const TRUMP: HouseRules = {
  enable_four_of_a_kind_autowin: false,
  enable_2_3_5_trump: true,
  enable_four_pair_reshuffle: false,
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

  it("scores 2-2-3 as the worst pair", () => {
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

function expectLegalPlay(play: {
  scores: [number, number, number]
  hands: { score: number }[]
}) {
  expect(play.scores[0]).toBeGreaterThanOrEqual(play.scores[1])
  expect(play.scores[1]).toBeGreaterThanOrEqual(play.scores[2])
  expect(play.hands.map((entry) => entry.score)).toEqual([...play.scores])
}

describe("arrange", () => {
  it("returns both plays for a normal nine", () => {
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
    const result = arrange(deal, OFF)
    expect(result.kind).toBe("split")
    if (result.kind !== "split") return
    expect(result.aggressive.name).toBe("aggressive")
    expect(result.defensive.name).toBe("defensive")
    for (const play of [result.aggressive, result.defensive]) {
      expectLegalPlay(play)
      expect(play.labels).toEqual(["Trail", "Trail", "Trail"])
      expect(ranksOf(play.hands[0].cards)).toEqual(["A", "A", "A"])
      expect(ranksOf(play.hands[1].cards)).toEqual(["K", "K", "K"])
      expect(ranksOf(play.hands[2].cards)).toEqual(["Q", "Q", "Q"])
    }
  })

  it("picks different cards when winning two in a row fights winning the middle", () => {
    const deal = [
      card("A", "hearts"),
      card("A", "diamonds"),
      card("A", "clubs"),
      card("2", "hearts"),
      card("2", "diamonds"),
      card("K", "hearts"),
      card("Q", "diamonds"),
      card("9", "clubs"),
      card("7", "spades"),
    ]
    const result = arrange(deal, OFF)
    expect(result.kind).toBe("split")
    if (result.kind !== "split") return
    const legal = legalSplits(deal, OFF)
    const bestSum = Math.max(...legal.map((split) => split[0].score + split[1].score))
    const bestMiddle = Math.max(...legal.map((split) => split[1].score))
    expect(result.aggressive.scores[0] + result.aggressive.scores[1]).toBe(bestSum)
    expect(result.defensive.scores[1]).toBe(bestMiddle)
    expect(result.defensive.scores[1]).toBeGreaterThan(result.aggressive.scores[1])
    expect(result.aggressive.labels).toEqual(["Trail", "Pair", "High Card"])
    expect(ranksOf(result.aggressive.hands[0].cards)).toEqual(["A", "A", "A"])
    expect(result.defensive.labels).toEqual(["Color", "Color", "High Card"])
    expect(ranksOf(result.defensive.hands[1].cards)).toEqual(["A", "Q", "2"])
    expectLegalPlay(result.aggressive)
    expectLegalPlay(result.defensive)
  })

  it("auto-wins four of a kind only when that toggle is on", () => {
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
    expect(DEFAULT_RULES.enable_four_of_a_kind_autowin).toBe(true)
    expect(DEFAULT_RULES.enable_2_3_5_trump).toBe(false)
    expect(DEFAULT_RULES.enable_four_pair_reshuffle).toBe(false)
    expect(arrange(deal, DEFAULT_RULES)).toEqual({ kind: "auto-win", rank: "A" })
    expect(
      arrange(deal, {
        enable_four_of_a_kind_autowin: true,
        enable_2_3_5_trump: false,
        enable_four_pair_reshuffle: true,
      }),
    ).toEqual({ kind: "auto-win", rank: "A" })
    const split = arrange(deal, {
      ...OFF,
      enable_four_pair_reshuffle: true,
    })
    expect(split.kind).toBe("split")
    if (split.kind !== "split") return
    expectLegalPlay(split.aggressive)
    expectLegalPlay(split.defensive)
    expect(split.aggressive.labels[0]).toBe("Trail")
  })

  it("reshuffles four pairs and one singleton only when that toggle is on", () => {
    const deal = [
      card("A", "hearts"),
      card("A", "diamonds"),
      card("K", "hearts"),
      card("K", "diamonds"),
      card("Q", "hearts"),
      card("Q", "diamonds"),
      card("J", "clubs"),
      card("J", "spades"),
      card("9", "hearts"),
    ]
    expect(
      arrange(deal, {
        enable_four_of_a_kind_autowin: true,
        enable_2_3_5_trump: false,
        enable_four_pair_reshuffle: true,
      }),
    ).toEqual({ kind: "reshuffle" })
    const arranged = arrange(deal, {
      enable_four_of_a_kind_autowin: true,
      enable_2_3_5_trump: true,
      enable_four_pair_reshuffle: false,
    })
    expect(arranged.kind).toBe("split")
    if (arranged.kind !== "split") return
    expectLegalPlay(arranged.aggressive)
    expectLegalPlay(arranged.defensive)
  })

  it("changes hand scores when offsuit 2-3-5 is a trump", () => {
    const offsuit = [
      card("2", "hearts"),
      card("3", "diamonds"),
      card("5", "clubs"),
    ]
    const aces = [card("A", "hearts"), card("A", "diamonds"), card("A", "clubs")]
    const asTrump = evaluateHand(offsuit, TRUMP)
    const asHighCard = evaluateHand(offsuit, OFF)
    const trail = evaluateHand(aces, TRUMP)
    expect(asTrump.category).toBe("trump-235")
    expect(asTrump.score).toBeGreaterThan(trail.score)
    expect(asHighCard.category).toBe("high-card")
    expect(asTrump.score).toBeGreaterThan(asHighCard.score)

    const deal = [
      ...offsuit,
      ...aces,
      card("9", "spades"),
      card("8", "diamonds"),
      card("6", "clubs"),
    ]
    const withTrump = arrange(deal, TRUMP)
    const withoutTrump = arrange(deal, OFF)
    expect(withTrump.kind).toBe("split")
    expect(withoutTrump.kind).toBe("split")
    if (withTrump.kind !== "split" || withoutTrump.kind !== "split") return
    expect(withTrump.aggressive.labels[0]).toBe("2-3-5 Trump")
    expect(withTrump.aggressive.labels[1]).toBe("Trail")
    expect(withTrump.aggressive.scores[0]).toBeGreaterThan(withoutTrump.aggressive.scores[0])
    expect(withoutTrump.aggressive.labels).not.toContain("2-3-5 Trump")
    expect(withoutTrump.defensive.labels).not.toContain("2-3-5 Trump")

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
    expect(suitedResult.aggressive.labels[0]).toBe("Trail")
    expect(suitedResult.aggressive.labels).not.toContain("2-3-5 Trump")
    expect(suitedResult.defensive.labels).not.toContain("2-3-5 Trump")
  })

  it("keeps both plays in legal order", () => {
    const deals = [
      standardDeck().slice(0, 9),
      standardDeck().slice(10, 19),
      [
        card("2", "hearts"),
        card("4", "hearts"),
        card("5", "hearts"),
        card("7", "diamonds"),
        card("8", "diamonds"),
        card("10", "clubs"),
        card("J", "clubs"),
        card("K", "spades"),
        card("A", "spades"),
      ],
    ]
    for (const deal of deals) {
      const result = arrange(deal, TRUMP)
      expect(result.kind).toBe("split")
      if (result.kind !== "split") continue
      const legal = legalSplits(deal, TRUMP)
      const bestSum = Math.max(...legal.map((split) => split[0].score + split[1].score))
      const bestMiddle = Math.max(...legal.map((split) => split[1].score))
      expect(result.aggressive.scores[0] + result.aggressive.scores[1]).toBe(bestSum)
      expect(result.defensive.scores[1]).toBe(bestMiddle)
      expectLegalPlay(result.aggressive)
      expectLegalPlay(result.defensive)
    }
    const weak = arrange(deals[2], OFF)
    expect(weak.kind).toBe("split")
    if (weak.kind === "split") {
      expect(weak.defensive.labels[0]).toBe("Color")
      expect(weak.defensive.scores[1]).toBeLessThan(STRONG_HAND_THRESHOLD)
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
