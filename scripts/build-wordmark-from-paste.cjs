/**
 * Builds public/brand/lockedin-wordmark.png from LockedIn/Pasted image.png (mask-ready).
 */
const { env } = require("node:process");
const fs = require("fs");
const path = require("path");
const sharpPkg = JSON.parse(fs.readFileSync(require.resolve("sharp/package.json"), "utf8"));
env.npm_package_config_libvips = env.npm_package_config_libvips ?? sharpPkg.config?.libvips ?? ">=8.17.3";
const sharp = require("sharp");

const SRC = path.join(__dirname, "..", "LockedIn", "Pasted image.png");
const OUT_DIR = path.join(__dirname, "..", "public", "brand");
const OUT = path.join(OUT_DIR, "lockedin-wordmark.png");

function matte(buf, w, h, ch) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      const r = buf[i], g = buf[i + 1], b = buf[i + 2];
      const lum = (r + g + b) / 3;
      const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
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
  if (!fs.existsSync(SRC)) {
    console.error("Missing:", SRC);
    process.exit(1);
  }
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const processed = matte(data, w, h, info.channels);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await sharp(processed, { raw: { width: w, height: h, channels: 4 } }).png().trim().toFile(OUT);
  const m = await sharp(OUT).metadata();
  console.log(JSON.stringify({ width: m.width, height: m.height, aspect: m.width / m.height }));
}
main().catch((e) => { console.error(e); process.exit(1); });
