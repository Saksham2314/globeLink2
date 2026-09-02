# Landing-page images

Drop the three featured-section photos here, named exactly:

- `featured-1.jpg`
- `featured-2.jpg`
- `featured-3.jpg`

They render in the "Places to start looking" section of `src/app/page.tsx`
(the `DESTINATIONS` array). Each tile links to `/explore?q=<place>`, so edit the
`place` / `country` labels there to match your photos.

Guidelines:

- **Aspect ratio** ~4:3 (they're cropped to `object-cover`, so anything close is fine).
- **Size**: ~1600px wide, compressed to **under ~300 KB** each — they're committed
  to the repo and bundled into every deploy.
- **Format**: `.jpg` as named above. To use `.png` / `.webp` instead, change the
  three `image:` paths in `src/app/page.tsx`.
- Anything in `public/` is served at the site root, so `public/landing/featured-1.jpg`
  is reachable at `/landing/featured-1.jpg`.
