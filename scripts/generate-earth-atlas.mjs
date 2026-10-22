// Generates the landing-globe surface texture (R = land, G = country borders,
// B = coastline) and real country centroids from Natural Earth (public domain,
// via the world-atlas package). One-off tool — its deps are deliberately NOT
// project dependencies. Run it from a scratch directory:
//
//   npm i world-atlas@2 topojson-client@3 d3-geo@3 sharp@0.34
//   node generate-earth-atlas.mjs <outDir> 4096   # also writes country-centroids.json
//   node generate-earth-atlas.mjs <outDir> 2048
//
// Outputs live in public/textures/ and src/modules/atlas/country-centroids.json.
import { readFileSync, writeFileSync } from "node:fs";
import { geoEquirectangular, geoPath, geoArea, geoCentroid } from "d3-geo";
import { feature, mesh } from "topojson-client";
import sharp from "sharp";

const OUT = process.argv[2];
const W = Number(process.argv[3] ?? 4096);
const H = W / 2;

const land50 = JSON.parse(readFileSync("node_modules/world-atlas/land-50m.json", "utf8"));
const countries50 = JSON.parse(readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));

const projection = geoEquirectangular()
  .scale(W / (2 * Math.PI))
  .translate([W / 2, H / 2])
  .precision(0.1);
const path = geoPath(projection);

const landGeo = feature(land50, land50.objects.land);
const coast = mesh(land50, land50.objects.land);
const borders = mesh(countries50, countries50.objects.countries, (a, b) => a !== b);

const scale = W / 4096;
const svg = (body) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#000"/>${body}</svg>`,
  );

const channel = async (body) =>
  sharp(svg(body)).greyscale().extractChannel(0).raw().toBuffer({ resolveWithObject: true });

const r = await channel(`<path d="${path(landGeo)}" fill="#fff"/>`);
const g = await channel(
  `<path d="${path(borders)}" fill="none" stroke="#fff" stroke-width="${(1.6 * scale).toFixed(2)}" stroke-linejoin="round"/>`,
);
const b = await channel(
  `<path d="${path(coast)}" fill="none" stroke="#fff" stroke-width="${(2.2 * scale).toFixed(2)}" stroke-linejoin="round"/>`,
);

const rgb = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) {
  rgb[i * 3] = r.data[i];
  rgb[i * 3 + 1] = g.data[i];
  rgb[i * 3 + 2] = b.data[i];
}
const img = sharp(rgb, { raw: { width: W, height: H, channels: 3 } });
await img
  .clone()
  .webp({ quality: 92, smartSubsample: false, effort: 6 })
  .toFile(`${OUT}/earth-atlas-${W}.webp`);
await img
  .clone()
  .png({ compressionLevel: 9, palette: false })
  .toFile(`${OUT}/earth-atlas-${W}.png`);

if (W === 4096) {
  // Country centroids: centroid of each country's LARGEST polygon, so overseas
  // territories (e.g. French Guiana) don't drag the point into the ocean.
  const countries = feature(countries50, countries50.objects.countries).features;
  const out = {};
  for (const f of countries) {
    const name = f.properties?.name;
    if (!name) continue;
    let poly = f.geometry;
    if (poly.type === "MultiPolygon") {
      let best = null;
      let bestArea = -1;
      for (const coords of poly.coordinates) {
        const p = { type: "Polygon", coordinates: coords };
        const a = geoArea(p);
        if (a > bestArea) {
          bestArea = a;
          best = p;
        }
      }
      poly = best;
    }
    const [lng, lat] = geoCentroid(poly);
    out[name] = [Math.round(lat * 100) / 100, Math.round(lng * 100) / 100];
  }
  writeFileSync(`${OUT}/country-centroids.json`, JSON.stringify(out, null, 0));
  console.log("countries:", Object.keys(out).length);
}
console.log("done", W);
