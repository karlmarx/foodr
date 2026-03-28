# foodr

Rate fast food on its own scale. Because every chain deserves to be judged as itself.

No more meaningless 2.3 stars on Google Maps — a **4 out of 5 Wendy's** actually means something.

## The Concept

Traditional review sites compare fast food to every other restaurant, which is inherently unfair. foodr lets you rate each chain on a 1–5 scale using that chain's own emoji as the rating icon. A great McDonald's visit gets 🍟🍟🍟🍟🍟. A mediocre Taco Bell is 🌮🌮🌮. Chain-relative ratings only.

**Supported chains:** McDonald's, Wendy's, Burger King, Taco Bell, Chick-fil-A, Popeyes, Five Guys, In-N-Out, Chipotle, Subway, KFC, Sonic

## Tech Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Styling | Tailwind CSS v4 |
| Language | TypeScript 6 |
| Backend | None (local state only) |

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
git clone https://github.com/karlmarx/foodr.git
cd foodr
npm install
```

## Running

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    page.tsx          # Home page — grid of chain cards
    layout.tsx        # Root layout with CSS variables
    globals.css       # Global styles and theme tokens
  components/
    ChainCard.tsx     # Card for a single chain with interactive rating
    ChainRatingIcon.tsx  # Renders emoji-based rating icons
    RatingRow.tsx     # Row of clickable rating emojis
  data/
    chains.ts         # Chain definitions (id, name, emoji, color, tagline)
```

## Adding a Chain

In `src/data/chains.ts`, add an entry to the `chains` array:

```ts
{
  id: "chain-id",
  name: "Chain Name",
  emoji: "🍕",
  color: "#HEXCOLOR",
  tagline: "Their slogan",
}
```

The chain card and rating UI are generated automatically.
