import { isAllowedPostImageType } from "./validation";

const MAX_LONG_EDGE_PX = 2560;

function stripExtension(name: string): string {
  return name.replace(/\.[^./\\]+$/, "") || "image";
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

async function encodeUnderBudget(
  canvas: HTMLCanvasElement,
  maxBytes: number,
): Promise<{ blob: Blob; type: string } | null> {
  for (let quality = 0.92; quality >= 0.5; quality -= 0.04) {
    const webp = await toBlob(canvas, "image/webp", quality);
    if (webp && webp.size <= maxBytes) {
      return { blob: webp, type: "image/webp" };
    }
  }
  for (let quality = 0.92; quality >= 0.5; quality -= 0.04) {
    const jpeg = await toBlob(canvas, "image/jpeg", quality);
    if (jpeg && jpeg.size <= maxBytes) {
      return { blob: jpeg, type: "image/jpeg" };
    }
  }
  return null;
}

/**
 * Shrinks and re-encodes raster images so the result fits under `maxBytes`.
 * GIFs become a single static frame (WebP/JPEG). HEIC and other types are not supported.
 */
export async function compressImageToMaxSize(file: File, maxBytes: number): Promise<File> {
  if (!isAllowedPostImageType(file.type)) {
    throw new Error("Use JPEG, PNG, WebP, or GIF images only.");
  }
  if (file.size <= maxBytes) {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Could not read this image. Try another file.");
  }

  try {
    let w = bitmap.width;
    let h = bitmap.height;
    if (!w || !h) {
      throw new Error("Could not read this image. Try another file.");
    }

    const longEdge = Math.max(w, h);
    if (longEdge > MAX_LONG_EDGE_PX) {
      const scale = MAX_LONG_EDGE_PX / longEdge;
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not process this image in your browser.");
    }

    let cw = w;
    let ch = h;

    for (let round = 0; round < 10; round++) {
      canvas.width = cw;
      canvas.height = ch;
      ctx.drawImage(bitmap, 0, 0, cw, ch);

      const encoded = await encodeUnderBudget(canvas, maxBytes);
      if (encoded) {
        const ext = encoded.type === "image/webp" ? "webp" : "jpg";
        const base = stripExtension(file.name);
        return new File([encoded.blob], `${base}.${ext}`, { type: encoded.type, lastModified: Date.now() });
      }

      if (cw <= 720 && ch <= 720) {
        break;
      }
      cw = Math.max(480, Math.round(cw * 0.88));
      ch = Math.max(480, Math.round(ch * 0.88));
    }

    throw new Error("Could not prepare this image. Try a different photo.");
  } finally {
    bitmap.close();
  }
}
