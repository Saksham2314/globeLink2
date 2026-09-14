# 3D models

The hero globe model: **`Globe_Digital.fbx`** — loaded by
`src/components/globe/hero-globe.tsx` via `@react-three/drei`'s `useFBX`.

Notes on this specific asset (checked before wiring it up, not guessed):

- **~59K triangles, 12 meshes** — no optimization needed.
- **No embedded or referenced textures.** Its material names ("Holo Grid",
  "Continents", "Edge wear (Cycles)") are Blender procedural-shader labels
  that don't survive FBX export — every material loads as flat grey
  (`#cccccc`). `hero-globe.tsx` retints them to the site's own accent color
  rather than shipping literal placeholder grey.
- Its bounding box is not centered at the model's own origin, and its
  bounding-sphere radius is large (~2200+ units in whatever unit the source
  file used) — the component derives both from the real geometry at runtime
  (`THREE.Box3.setFromObject` + `getBoundingSphere`) rather than assuming a
  scale, since getting that wrong renders nothing (it did, once, with the
  previous model).

## Swapping in a different model later

If you replace `Globe_Digital.fbx` with something else:

- **`.fbx`** → works as-is, same `useFBX` loader. If it has real textures
  this time, drop the `retint()` step in `hero-globe.tsx` (or make it
  conditional on `mat.map` being unset) so a real texture isn't overwritten.
- **`.glb`/`.gltf`** → swap `useFBX` for `@react-three/drei`'s `useGLTF`
  (the component used this earlier; `git log -- src/components/globe/hero-globe.tsx`
  has the previous version) and update `MODEL_URL`'s extension.
- Either way: keep it reasonably light for a hero decoration (a few MB at
  most — it's committed to the repo and downloaded client-side on the
  landing page), and re-check the camera math in `Scene()` still fits the
  new model's actual bounds; don't assume a scale.
