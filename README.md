# Travelly Cinematic Gift 🎁✈️

A cinematic photo journey you can share as a gift. The map flies between your travel photos in chronological order, zooms in with a dramatic triple-zoom beat, and reveals each photo with a beautiful animated card.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How to Customize

### 1. Add your photos

Drop your images into `public/photos/` — supports **HEIC, JPG, PNG, WebP**.

### 2. Run the photo processor

```bash
npm run photos
```

This will:
- Convert HEIC files to JPG (browsers can't display HEIC natively)
- Read GPS coordinates and dates from EXIF data
- Generate `src/lib/photos.ts` with all entries auto-populated

### 3. Edit the journey

Open `src/lib/photos.ts` and update:

- **GIFT_TITLE** — the title shown on the intro card
- **GIFT_SUBTITLE** — subtitle (e.g. "Summer 2024")
- **PHOTOS** array — one entry per stop:

```ts
{
  id: "1",
  src: "/photos/your-image.jpg",  // path in public/
  city: "Paris",
  country: "France",
  lat: 48.8566,                    // GPS latitude
  lng: 2.3522,                     // GPS longitude
  date: "2024-06-15",             // for chronological ordering
  caption: "The Eiffel Tower",    // optional
}
```

Photos are displayed in chronological order by `date`.

## The Experience

1. **Title card** — handwritten-style intro with your title, fades in over the map
2. **Click "Start the journey"** — the cinematic begins
3. **For each photo**: map flies to the location → triple-zoom approach → photo reveals with city/country/date
4. **Click "Next stop"** to advance (or wait)
5. **End card** — summary with country count and replay button

## Deploy to GitHub Pages / Vercel

### Vercel (easiest)
1. Push to GitHub
2. Import in [vercel.com](https://vercel.com)
3. Share the URL

### GitHub Pages
Run `npm run build` then deploy the `out/` folder, or use a GitHub Action.

## Tech

- Next.js 15 + React 19
- MapLibre GL (free OpenFreeMap tiles, no API key)
- Framer Motion for animations
- Tailwind CSS
- Caveat handwriting font

No auth, no database, no API keys needed. Fully self-contained.
