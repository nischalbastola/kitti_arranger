import type { Card, Rank, Suit } from "@/lib/kitti"

const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
}

const RANK_NAME: Record<Rank, string> = {
  A: "ace",
  K: "king",
  Q: "queen",
  J: "jack",
  "10": "10",
  "9": "9",
  "8": "8",
  "7": "7",
  "6": "6",
  "5": "5",
  "4": "4",
  "3": "3",
  "2": "2",
}

export function cardLabel(card: Card): string {
  return `${RANK_NAME[card.rank]} of ${card.suit}`
}

function ink(suit: Suit): string {
  return suit === "hearts" || suit === "diamonds" ? "text-[#d3122a]" : "text-[#1a1614]"
}

export function PlayingCard({
  card,
  selected = false,
  disabled = false,
  onToggle,
  size = "grid",
}: {
  card: Card
  selected?: boolean
  disabled?: boolean
  onToggle?: (card: Card) => void
  size?: "grid" | "show"
}) {
  const symbol = SUIT_SYMBOL[card.suit]
  const color = ink(card.suit)
  const show = size === "show"
  const face = (
    <span
      className={`relative flex aspect-[5/7] w-full flex-col items-center justify-center rounded-xl border-[3px] border-[#241c18] bg-[#fffaf3] shadow-[3px_3px_0_#241c18] ${color} ${
        show ? "text-sm sm:text-base" : "text-[11px] sm:text-xs"
      }`}
    >
      <span className="absolute top-0.5 left-1 flex flex-col items-center leading-none font-semibold sm:top-1 sm:left-1.5">
        <span>{card.rank}</span>
        <span aria-hidden="true" className={show ? "text-xs" : "text-[0.85em]"}>
          {symbol}
        </span>
      </span>
      <span aria-hidden="true" className={show ? "text-3xl sm:text-4xl" : "text-lg sm:text-xl"}>
        {symbol}
      </span>
      <span className="absolute right-1 bottom-0.5 flex rotate-180 flex-col items-center leading-none font-semibold sm:right-1.5 sm:bottom-1">
        <span>{card.rank}</span>
        <span aria-hidden="true" className={show ? "text-xs" : "text-[0.85em]"}>
          {symbol}
        </span>
      </span>
    </span>
  )

  if (!onToggle) {
    return (
      <div className="min-w-0" role="img" aria-label={cardLabel(card)}>
        {face}
      </div>
    )
  }

  return (
    <button
      type="button"
      data-card={`${card.rank}-${card.suit}`}
      aria-pressed={selected}
      aria-label={`${selected ? "Deselect" : "Select"} ${cardLabel(card)}`}
      disabled={disabled}
      onClick={() => onToggle(card)}
      className={`min-w-0 rounded-2xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241c18] ${
        selected
          ? "-translate-y-1 bg-[#ff9f1c] p-1 shadow-[4px_4px_0_#241c18]"
          : "p-0.5 hover:-translate-y-0.5"
      } ${disabled ? "cursor-not-allowed opacity-40 saturate-50" : "cursor-pointer"}`}
    >
      {face}
    </button>
  )
}
