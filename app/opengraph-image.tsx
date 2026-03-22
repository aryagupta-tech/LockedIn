import {
  brandOgContentType,
  brandOgImageAlt,
  brandOgImageSize,
  createLockedInOgImageResponse,
} from "@/lib/brand-og-image";

export const alt = brandOgImageAlt;
export const size = brandOgImageSize;
export const contentType = brandOgContentType;

export default function OpenGraphImage() {
  return createLockedInOgImageResponse();
}
