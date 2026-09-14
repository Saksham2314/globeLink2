# 3D models

Drop the hero globe model here as:

- `earth.glb`

Reachable at `/models/earth.glb` once dropped (anything under `public/` is
served verbatim from the site root).

Guidelines:

- **Format**: `.glb` (binary glTF, textures embedded in one file — simplest
  to serve). If you only have a `.gltf` + separate texture files, drop the
  whole folder and tell me the entry filename instead.
- **Size**: this loads client-side on the landing page — keep it under a few
  MB if you can. If it's large because of high-poly geometry, Draco
  compression helps a lot, but the decoder must be **self-hosted** (copied
  into `public/`) rather than loaded from Google's CDN — the site's CSP
  (`src/lib/csp.ts`) only allows same-origin scripts, and a CDN-hosted
  decoder would violate it once CSP moves from Report-Only to enforcing.
- Texture resolution: 2K is usually plenty for a hero-sized globe; 4K+ textures
  bloat the file for no visible gain at that size on screen.
