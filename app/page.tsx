import type { Metadata } from "next"
import { KittiTable } from "@/components/kitti-table"

export const metadata: Metadata = {
  title: "Kitti — Nepali 9 Patti hand arranger",
  description:
    "Arrange nine cards into three Teen Patti hands. Kitti shows an aggressive play to win two in a row and a defensive play built to win the middle.",
  keywords: [
    "Kitti",
    "9 Patti",
    "Teen Patti",
    "Nepali card game",
    "hand arranger",
    "trail",
    "pure sequence",
  ],
  openGraph: {
    title: "Kitti — Nepali 9 Patti hand arranger",
    description:
      "Pick nine cards. Kitti splits them into three legal Teen Patti hands, strongest to weakest.",
    type: "website",
    locale: "en_US",
    siteName: "Kitti",
  },
  twitter: {
    card: "summary",
    title: "Kitti — Nepali 9 Patti hand arranger",
    description:
      "Pick nine cards. Kitti splits them into three legal Teen Patti hands, strongest to weakest.",
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Kitti",
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  description:
    "Arrange a 9-card Kitti deal into three Teen Patti hands under classic ranking and optional house rules.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
}

const ladder = [
  {
    name: "2-3-5 Trump",
    detail:
      "Only with the house rule on, and only when 2, 3, and 5 are not all one suit. It sits above every trail. A suited 2-3-5 stays a color.",
  },
  {
    name: "Trail",
    detail: "Three of a kind. AAA beats KKK, all the way down to 222.",
  },
  {
    name: "Pure sequence",
    detail:
      "Straight flush. A-K-Q is highest, then the A-2-3 wheel, then K-Q-J, Q-J-10, down to 4-3-2.",
  },
  {
    name: "Sequence",
    detail: "The same straight order as a pure sequence, with mixed suits. 2-3-5 is not a sequence.",
  },
  {
    name: "Color",
    detail:
      "Flush. Compare the highest rank, then the next. Ace is high and 2 is low. Suits do not change strength.",
  },
  {
    name: "Pair",
    detail:
      "Higher pair rank wins, then the kicker. A pair of aces with a 2 beats a pair of kings with an ace.",
  },
  {
    name: "High card",
    detail: "Same rank comparison as color, when nothing else is made.",
  },
]

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 overflow-x-clip px-4 py-6 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#e4c15a] uppercase">
          Nepali 9 Patti
        </p>
        <h1 className="font-display mt-2 text-5xl text-[#f6f1e4] sm:text-6xl">Kitti</h1>
        <p className="mt-4 text-lg leading-8 text-[#f6f1e4]">
          Nine cards from a 52-card deck. Three hands of three. A split is legal only when Hand 1
          is at least as strong as Hand 2, and Hand 2 is at least as strong as Hand 3.
        </p>
        <p className="mt-3 text-sm leading-6 text-[#d9ccb0]">
          Every normal nine shows two plays. Aggressive — best hands to win two in a row.
          Defensive — built to win the middle.
        </p>
      </header>

      <KittiTable />

      <section aria-labelledby="ladder-heading" className="pb-6">
        <h2 id="ladder-heading" className="font-display text-2xl text-[#f6f1e4]">
          How Teen Patti ranks a hand
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d9ccb0]">
          Classic order, high to low. The numeric score keeps the category above every kicker, so
          a pair always beats a high card and a trail always beats a pure sequence.
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {ladder.map((step, index) => (
            <li
              key={step.name}
              className="rounded-xl border border-[rgb(228_193_90/0.25)] bg-[rgb(6_32_26/0.4)] p-4"
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-[#e4c15a] uppercase">
                {index + 1}
              </p>
              <h3 className="font-display mt-1 text-xl text-[#f6f1e4]">{step.name}</h3>
              <p className="mt-1 text-sm leading-6 text-[#d9ccb0]">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
