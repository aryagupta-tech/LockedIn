/* Crop + white logo on transparent from `Pasted image.png`. Run: `npm run matte-logo` or `node scripts/matte-lockedin-logo.cjs`. */
const fs = require("fs");
const { env } = require("node:process");
const sharpPkg = JSON.parse(fs.readFileSync(require.resolve("sharp/package.json"), "utf8"));
// Avoid sharp/libvips.js reading `config.libvips` when `process.env` is non-standard in some runtimes.
env.npm_package_config_libvips = env.npm_package_config_libvips ?? sharpPkg.config?.libvips ?? ">=8.17.3";

const sharp = require("sharp");
const path = require("path");

const SRC = path.join(__dirname, "..", "Pasted image.png");
const OUT = path.join(__dirname, "..", "public", "brand", "lockedin-logo.png");

const BBOX = { minX: 224, minY: 115, maxX: 654, maxY: 206 };
const PAD = 16;

function process(buf, w, h, ch) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      const r = buf[i];
      const g = buf[i + 1];
      const b = buf[i + 2];
      const lum = (r + g + b) / 3;
      const maxc = Math.max(r, g, b);
      const minc = Math.min(r, g, b);
      const sat = maxc < 1 ? 0 : (maxc - minc) / maxc;

      let a = 0;
      if (lum < 28) a = 0;
      else if (sat > 0.2 && lum < 215) a = 0;
      else if (lum >= 218 && sat < 0.12) a = 255;
      else if (sat > 0.2) a = 0;
      else {
        const t = Math.min(1, Math.max(0, (lum - 28) / (218 - 28)));
        a = Math.round(255 * t * t);
      }

      const o = (y * w + x) * 4;
      out[o] = 255;
      out[o + 1] = 255;
      out[o + 2] = 255;
      out[o + 3] = a;
    }
  }
  return out;
}

async function main() {
  const left = Math.max(0, BBOX.minX - PAD);
  const top = Math.max(0, BBOX.minY - PAD);
  const width = Math.min(799 - left, BBOX.maxX - BBOX.minX + 1 + 2 * PAD);
  const height = Math.min(277 - top, BBOX.maxY - BBOX.minY + 1 + 2 * PAD);

  const { data, info } = await sharp(SRC)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const processed = process(data, w, h, info.channels);

  await sharp(processed, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .trim()
    .toFile(OUT);

  const meta = await sharp(OUT).metadata();
  console.log("Wrote", OUT, `${meta.width}x${meta.height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
