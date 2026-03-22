import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** Data URL from `app/icon.svg` (circle padlock) — single source for OG / Twitter cards. */
function lockedInIconDataUrl(): string {
  const svg = readFileSync(join(process.cwd(), "app", "icon.svg"), "utf8");
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

export const brandOgImageSize = { width: 1200, height: 630 } as const;
export const brandOgImageAlt = "LockedIn";
export const brandOgContentType = "image/png";

const sans =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export function createLockedInOgImageResponse() {
  const src = lockedInIconDataUrl();
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(168deg, #2a1e18 0%, #140e0c 48%, #221a16 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- @vercel/og / Satori */}
        <img src={src} alt="" width={240} height={240} style={{ display: "block" }} />
        <div
          style={{
            marginTop: 28,
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#faf3eb",
            fontFamily: sans,
          }}
        >
          LockedIn
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 26,
            color: "#a89284",
            fontFamily: sans,
          }}
        >
          Only the locked-in get in.
        </div>
      </div>
    ),
    { ...brandOgImageSize },
  );
}
