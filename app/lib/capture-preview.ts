/**
 * Preview Capture Utility
 *
 * Attempts to capture preview content as a small JPEG thumbnail using
 * the SVG foreignObject approach (works for same-origin content).
 * Falls back to null when capture is not possible (cross-origin, etc.).
 *
 * Note: For fully styled pixel-perfect screenshots, consider using a
 * library like `html-to-image` or `dom-to-image-more` in the future.
 */

const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 180;
const JPEG_QUALITY = 0.4;

/**
 * Capture preview iframe content as a JPEG data URL thumbnail.
 * Uses SVG foreignObject rendering — only works for same-origin content.
 *
 * @param iframe - The preview iframe element
 * @returns A JPEG data URL string, or null if capture failed
 */
export function capturePreviewThumbnail(
  iframe: HTMLIFrameElement | null,
): Promise<string | null> {
  return new Promise((resolve) => {
    if (!iframe) {
      resolve(null);
      return;
    }

    try {
      // Only works for same-origin iframes
      const doc = iframe.contentDocument || iframe.contentWindow?.document;

      if (!doc) {
        resolve(null);
        return;
      }

      const serializer = new XMLSerializer();
      const html = serializer.serializeToString(doc.documentElement);

      // Render the HTML content via SVG foreignObject
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_HEIGHT}">
        <foreignObject width="100%" height="100%">
          ${html}
        </foreignObject>
      </svg>`;

      const canvas = document.createElement('canvas');
      canvas.width = THUMBNAIL_WIDTH;
      canvas.height = THUMBNAIL_HEIGHT;

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    } catch {
      resolve(null);
    }
  });
}
