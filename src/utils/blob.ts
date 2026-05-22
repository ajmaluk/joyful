const blobUrlCache = new Map<string, string>();

export function htmlToBlobUrl(html: string): string {
  const cached = blobUrlCache.get(html);
  if (cached) return cached;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  if (blobUrlCache.size > 10) {
    const first = blobUrlCache.entries().next().value;
    if (first) {
      URL.revokeObjectURL(first[1]);
      blobUrlCache.delete(first[0]);
    }
  }
  blobUrlCache.set(html, url);
  return url;
}

export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
  for (const [key, val] of blobUrlCache) {
    if (val === url) {
      blobUrlCache.delete(key);
      break;
    }
  }
}

export function inlineScriptsToSrc(html: string): { html: string; cleanup: () => void } {
  const urls: string[] = [];

  const NON_EXECUTABLE_SCRIPT_TYPES = new Set([
    'application/ld+json',
    'importmap',
    'speculationrules',
  ]);

  const modified = html.replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
    (match: string, rawAttrs: string, code: string) => {
      const attrs = rawAttrs || '';
      if (/\bsrc\s*=/.test(attrs)) {
        return match;
      }

      const typeMatch = attrs.match(/\btype\s*=\s*['"]?([^'"\s>]+)/i);
      const scriptType = (typeMatch?.[1] || 'text/javascript').toLowerCase();
      if (NON_EXECUTABLE_SCRIPT_TYPES.has(scriptType)) {
        return match;
      }

      const blob = new Blob([code], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      urls.push(url);
      return `<script${attrs} src="${url}"></script>`;
    },
  );
  return {
    html: modified,
    cleanup: () => {
      for (const url of urls) URL.revokeObjectURL(url);
    },
  };
}
