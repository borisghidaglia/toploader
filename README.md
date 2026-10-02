# Toploader Mart

[![Toploader Mart](https://toploader-mart.vercel.app/opengraph-image)](https://toploader-mart.vercel.app)

A Pokémon card shop in the browser, built as a Poké Mart from Pokémon Emerald: the game's own sprites, fonts, music and menu sound, around real cards you can pick up and turn over in 3D.

**[toploader-mart.vercel.app](https://toploader-mart.vercel.app)**

## What's in the shop

- **A buy menu, like the game's.** Cards are listed with a cursor and their prices. Switch between All cards, Vintage and Modern, and sort by price or year. The arrow keys work from anywhere: up and down move the cursor, left and right switch sections, and on a phone-sized screen Escape puts the card back.
- **A 3D holo card.** Pick a card to bring it out. Drag to turn it and watch the foil catch the light, or flick it to spin it all the way round. Vintage holos shine only in the art box, as the real cards do; modern full arts shine all over.
- **A page for every card.** Each card has its own address, like [/cards/base1-58](https://toploader-mart.vercel.app/cards/base1-58), and its own link preview image, drawn at build time.
- **Sound.** The game's menu sound answers every move, and the speaker button turns on Emerald's shop music.

## Where everything comes from

- **Cards and prices:** [TCGdex](https://tcgdex.dev), which supplies the card data, the scans and TCGplayer market prices. A card's shop price is its market price (less 20% for Lightly Played), rounded up to a number a price tag would show. Prices are a snapshot from the last time the data was fetched.
- **Sprites, fonts and menu sound:** Pokémon Emerald, extracted from [pret/pokeemerald](https://github.com/pret/pokeemerald), the decompilation of the game, by the scripts below.
- **Music:** "Shop" from Pokémon Emerald, cut from [ipatix's high-quality soundtrack rip](https://www.youtube.com/watch?v=iLd1OoCQNLs) and looped on its own repeat points.
- **Card back:** drawn for the shop, not the official one.

## Running it

```bash
pnpm install
pnpm dev
```

Then open [localhost:3000](http://localhost:3000).

## Scripts

Everything the shop shows is already in the repo; these rebuild it.

- **`pnpm cards`** fetches the cards listed in `scripts/fetch-cards.mjs` from TCGdex, with today's prices, into `data/cards.json` and `public/cards/`. To stock another card, add a line for it there.
- **`scripts/extract-emerald.py`** builds the sprites and fonts in `public/emerald/`, the fonts for the link previews and the Poké Ball favicon from a copy of pokeemerald:

  ```bash
  git clone --depth 1 https://github.com/pret/pokeemerald.git /tmp/pokeemerald
  python3 -m venv .venv && .venv/bin/pip install pillow fonttools brotli skia-pathops
  .venv/bin/python scripts/extract-emerald.py /tmp/pokeemerald
  ```

- **`scripts/render-emerald-sfx.py`** renders the menu sound by playing it through a model of the game's sound engine: `python3 scripts/render-emerald-sfx.py /tmp/pokeemerald`.
- **`node scripts/make-card-back.mjs`** draws the card back.

## Built with

[Next.js](https://nextjs.org) 16, [React](https://react.dev) 19, [React Three Fiber](https://r3f.docs.pmnd.rs) and [three.js](https://threejs.org) for the 3D card, and [Tailwind CSS](https://tailwindcss.com). Hosted on [Vercel](https://vercel.com).

## Disclaimer

A fan project and a fun experiment, not a real store. Pokémon and its art belong to Nintendo, Creatures and GAME FREAK, and this project isn't affiliated with them.
