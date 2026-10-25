"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { PlayingCard, cardLabel } from "@/components/playing-card"
import {
  type ArrangeResult,
  type Card,
  type HouseRules,
  type Play,
  type Rank,
  type Suit,
  DEFAULT_RULES,
  KittiError,
  RANKS,
  SUITS,
  arrange,
  cardKey,
} from "@/lib/kitti"

const SUIT_LABEL: Record<Suit, string> = {
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
  spades: "Spades",
}

const RANK_WORD: Record<Rank, string> = {
  A: "aces",
  K: "kings",
  Q: "queens",
  J: "jacks",
  "10": "tens",
  "9": "nines",
  "8": "eights",
  "7": "sevens",
  "6": "sixes",
  "5": "fives",
  "4": "fours",
  "3": "threes",
  "2": "twos",
}

const DECK: Card[] = SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })))

function rulesKey(rules: HouseRules): string {
  return `${rules.enable_four_of_a_kind_autowin ? 1 : 0}${rules.enable_2_3_5_trump ? 1 : 0}${rules.enable_four_pair_reshuffle ? 1 : 0}`
}

export function KittiTable() {
  const [selected, setSelected] = useState<Card[]>([])
  const [rules, setRules] = useState<HouseRules>(DEFAULT_RULES)
  const [result, setResult] = useState<ArrangeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [baseline, setBaseline] = useState<string | null>(null)

  const selectedKeys = useMemo(() => new Set(selected.map(cardKey)), [selected])
  const full = selected.length === 9
  const signature = `${selected.map(cardKey).join("|")}::${rulesKey(rules)}`
  const stale = result !== null && baseline !== null && baseline !== signature

  function toggle(card: Card) {
    const key = cardKey(card)
    setSelected((current) => {
      if (current.some((entry) => cardKey(entry) === key)) {
        return current.filter((entry) => cardKey(entry) !== key)
      }
      if (current.length >= 9) return current
      return [...current, card]
    })
  }

  function clearSelection() {
    setSelected([])
    setResult(null)
    setError(null)
    setBaseline(null)
  }

  function calculate() {
    setError(null)
    try {
      const next = arrange(selected, rules)
      setResult(next)
      setBaseline(`${selected.map(cardKey).join("|")}::${rulesKey(rules)}`)
    } catch (caught) {
      setResult(null)
      setBaseline(null)
      setError(
        caught instanceof KittiError
          ? caught.message
          : "Those cards could not be arranged.",
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="rules-heading"
        className="rounded-2xl border border-[rgb(228_193_90/0.35)] bg-[rgb(6_32_26/0.45)] p-4 sm:p-5"
      >
        <div className="flex flex-col gap-1">
          <h2 id="rules-heading" className="font-display text-2xl text-[#f6f1e4]">
            House rules
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#d9ccb0]">
            Switches stay put when you change them. A result already on the table is marked
            stale until you calculate again.
          </p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <RuleSwitch
            id="rule-quads"
            label="Four of a kind"
            description="Four of the same rank in the nine cards wins the deal automatically."
            checked={rules.enable_four_of_a_kind_autowin}
            onCheckedChange={(checked) =>
              setRules((current) => ({ ...current, enable_four_of_a_kind_autowin: checked }))
            }
          />
          <RuleSwitch
            id="rule-reshuffle"
            label="Four pairs reshuffle"
            description="Four pairs and one single card means reshuffle the deal instead of arranging it."
            checked={rules.enable_four_pair_reshuffle}
            onCheckedChange={(checked) =>
              setRules((current) => ({ ...current, enable_four_pair_reshuffle: checked }))
            }
          />
          <RuleSwitch
            id="rule-trump"
            label="2-3-5 trump"
            description="The 2, 3, and 5 must be three different suits. That hand ranks above every trail. Two cards sharing a suit are not a trump, and all three of one suit stay a normal color. It is not a sequence."
            checked={rules.enable_2_3_5_trump}
            onCheckedChange={(checked) =>
              setRules((current) => ({ ...current, enable_2_3_5_trump: checked }))
            }
          />
        </div>
      </section>

      <section aria-labelledby="deck-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="deck-heading" className="font-display text-2xl text-[#f6f1e4]">
              The deck
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[#d9ccb0]">
              Hearts and diamonds are red. Clubs and spades are black. Pick nine distinct cards.
              At nine, the rest of the deck locks until you deselect one.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p
              data-testid="counter"
              aria-live="polite"
              className="font-display text-3xl leading-none text-[#f6f1e4] tabular-nums"
            >
              <span className={full ? "text-[#e4c15a]" : undefined}>{selected.length}</span>
              <span className="text-[#d9ccb0]"> / 9</span>
            </p>
            <Button type="button" variant="outline" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {SUITS.map((suit) => (
            <div key={suit}>
              <h3 className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#e4c15a] uppercase">
                {SUIT_LABEL[suit]}
              </h3>
              <div className="grid grid-cols-4 gap-1.5 min-[420px]:grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-13">
                {DECK.filter((card) => card.suit === suit).map((card) => {
                  const isSelected = selectedKeys.has(cardKey(card))
                  return (
                    <PlayingCard
                      key={cardKey(card)}
                      card={card}
                      selected={isSelected}
                      disabled={full && !isSelected}
                      onToggle={toggle}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            size="lg"
            className="h-11 px-5 text-base"
            disabled={!full}
            onClick={calculate}
          >
            Calculate Best Hands
          </Button>
          <p className="text-sm text-[#d9ccb0]">
            {full
              ? "Nine cards in. Calculate when the house rules look right."
              : `${9 - selected.length} more ${selected.length === 8 ? "card" : "cards"} to open the arranger.`}
          </p>
        </div>
      </section>

      <section aria-labelledby="result-heading" aria-live="polite" className="flex flex-col gap-3">
        <h2 id="result-heading" className="font-display text-2xl text-[#f6f1e4]">
          The plays
        </h2>
        {error ? (
          <div
            role="alert"
            data-testid="error"
            className="rounded-2xl border border-[#e07a6a] bg-[rgb(80_24_18/0.55)] px-4 py-4 text-[#ffd2cb]"
          >
            {error}
          </div>
        ) : null}
        {result ? (
          <div className="flex flex-col gap-3" data-testid="result">
            {stale ? (
              <p
                data-testid="stale"
                className="rounded-xl border border-[#e4c15a] bg-[rgb(228_193_90/0.14)] px-4 py-3 text-sm leading-6 text-[#f6e7b8]"
              >
                This result is out of date. The cards or house rules changed after the last
                calculation. Calculate again to refresh it.
              </p>
            ) : null}
            {result.kind === "auto-win" ? (
              <AutoWin result={result} selected={selected} />
            ) : result.kind === "reshuffle" ? (
              <Reshuffle />
            ) : (
              <BothPlays result={result} />
            )}
          </div>
        ) : error ? null : (
          <div
            data-testid="empty"
            className="rounded-2xl border border-dashed border-[rgb(228_193_90/0.4)] bg-[rgb(6_32_26/0.35)] px-4 py-8 sm:px-8"
          >
            <p className="font-display text-xl text-[#f6f1e4]">No split yet.</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#d9ccb0]">
              Choose nine cards, set the house rules, and calculate. Both plays land here, each
              with Hand 1 at least as strong as Hand 2, and Hand 2 at least as strong as Hand 3.
            </p>
            <div className="mt-5 grid max-w-md grid-cols-3 gap-2" aria-hidden="true">
              {["Hand 1", "Hand 2", "Hand 3"].map((label) => (
                <div
                  key={label}
                  className="flex aspect-[5/7] items-end rounded-[0.45rem] border border-dashed border-[rgb(228_193_90/0.35)] bg-[rgb(247_241_227/0.04)] p-2 text-[10px] tracking-wide text-[#d9ccb0] uppercase"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function RuleSwitch({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const helpId = `${id}-help`
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-[rgb(255_255_255/0.03)] px-3 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="font-medium text-[#f6f1e4]">
          {label}
        </label>
        <p id={helpId} className="mt-1 text-sm leading-6 text-[#d9ccb0]">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={helpId}
        className="mt-1 shrink-0"
      />
    </div>
  )
}

function BothPlays({
  result,
}: {
  result: Extract<ArrangeResult, { kind: "split" }>
}) {
  return (
    <div className="flex flex-col gap-4">
      <PlayView
        play={result.aggressive}
        title="Aggressive — best hands to win two in a row"
      />
      <PlayView play={result.defensive} title="Defensive — built to win the middle" />
    </div>
  )
}

function PlayView({ play, title }: { play: Play; title: string }) {
  return (
    <div className="rounded-2xl border border-[rgb(228_193_90/0.35)] bg-[rgb(6_32_26/0.5)] p-4 sm:p-5">
      <h3
        data-testid="strategy"
        data-strategy={play.name}
        className="font-display text-2xl text-[#e4c15a] sm:text-3xl"
      >
        {title}
      </h3>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {play.hands.map((hand, index) => (
          <article
            key={hand.label + index}
            data-testid={`hand-${play.name}-${index + 1}`}
            className="min-w-0 rounded-xl bg-[rgb(255_255_255/0.04)] p-3"
          >
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h4 className="font-display text-xl text-[#f6f1e4]">Hand {index + 1}</h4>
              <p data-testid="category" className="text-sm font-semibold text-[#e4c15a]">
                {hand.label}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {hand.cards.map((card) => (
                <PlayingCard key={cardKey(card)} card={card} size="show" />
              ))}
            </div>
            <p className="sr-only">
              {hand.cards.map((card) => cardLabel(card)).join(", ")}. {hand.label}.
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}

function Reshuffle() {
  return (
    <div
      data-testid="reshuffle"
      className="rounded-2xl border border-[#e4c15a] bg-[rgb(228_193_90/0.12)] p-4 sm:p-6"
    >
      <p className="text-xs font-semibold tracking-[0.18em] text-[#e4c15a] uppercase">
        Reshuffle
      </p>
      <p className="font-display mt-1 text-3xl text-[#f6f1e4]">Four pairs</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#f6f1e4]">
        These nine cards are four pairs and one single card. Reshuffle the deal. The two plays
        stay off the table.
      </p>
    </div>
  )
}

function AutoWin({
  result,
  selected,
}: {
  result: Extract<ArrangeResult, { kind: "auto-win" }>
  selected: Card[]
}) {
  const quads = selected.filter((card) => card.rank === result.rank)
  return (
    <div
      data-testid="auto-win"
      className="rounded-2xl border border-[#e4c15a] bg-[rgb(228_193_90/0.12)] p-4 sm:p-6"
    >
      <p className="text-xs font-semibold tracking-[0.18em] text-[#e4c15a] uppercase">
        Auto-win
      </p>
      <p className="font-display mt-1 text-3xl text-[#f6f1e4] capitalize">{RANK_WORD[result.rank]}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#f6f1e4]">
        Four {RANK_WORD[result.rank]} are in the nine cards. This house rule ends the round
        before anyone arranges a split.
      </p>
      <div className="mt-4 grid max-w-md grid-cols-4 gap-2">
        {quads.map((card) => (
          <PlayingCard key={cardKey(card)} card={card} size="show" />
        ))}
      </div>
    </div>
  )
}
