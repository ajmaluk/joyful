/**
 * Unsplash API integration for fetching stock images.
 * Uses the official Unsplash API with configurable access key.
 */

const UNSPLASH_API_BASE = 'https://api.unsplash.com';

interface UnsplashPhoto {
  id: string;
  urls: {
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
  };
  alt_description: string | null;
}

interface UnsplashSearchResult {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
}

/**
 * Searches Unsplash for photos matching the query.
 * Falls back to curated photos if no API key is configured.
 */
export async function searchUnsplash(query: string, count: number = 9): Promise<UnsplashPhoto[]> {
  const accessKey = getUnsplashAccessKey();

  if (!accessKey) {
    // Fallback: return curated/default results using demo integration
    return getDefaultImages(query, count);
  }

  try {
    const response = await fetch(
      `${UNSPLASH_API_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data: UnsplashSearchResult = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Unsplash search failed:', error);
    return getDefaultImages(query, count);
  }
}

/**
 * Fetches curated/trending photos from Unsplash.
 */
export async function getCuratedPhotos(count: number = 9): Promise<UnsplashPhoto[]> {
  const accessKey = getUnsplashAccessKey();

  if (!accessKey) {
    return getDefaultImages('nature', count);
  }

  try {
    const response = await fetch(
      `${UNSPLASH_API_BASE}/photos/curated?per_page=${count}&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data: UnsplashPhoto[] = await response.json();
    return data || [];
  } catch (error) {
    console.error('Unsplash curated failed:', error);
    return getDefaultImages('nature', count);
  }
}

/**
 * Returns the Unsplash access key from environment or localStorage.
 */
function getUnsplashAccessKey(): string | null {
  // Check environment variable first
  if (typeof process !== 'undefined' && process.env && process.env.UNSPLASH_ACCESS_KEY) {
    return process.env.UNSPLASH_ACCESS_KEY;
  }

  // Check global window config
  if (typeof window !== 'undefined' && (window as any).__UNSPLASH_KEY__) {
    return (window as any).__UNSPLASH_KEY__;
  }

  return null;
}

/**
 * Fallback default images when API key is not available.
 * These are directly embedded placeholder image URLs from Unsplash source.
 */
function getDefaultImages(query: string, count: number): UnsplashPhoto[] {
  const defaultCategories = [
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=225&fit=crop',
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&h=225&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=225&fit=crop',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=225&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=225&fit=crop',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=225&fit=crop',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=225&fit=crop',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&h=225&fit=crop',
  ];

  return defaultCategories.slice(0, count).map((url, index) => ({
    id: `default-${index}`,
    urls: {
      regular: url.replace('w=400&h=225', 'w=800&h=450'),
      small: url,
      thumb: url.replace('w=400&h=225', 'w=200&h=113'),
    },
    user: {
      name: 'Unsplash',
      links: {
        html: 'https://unsplash.com',
      },
    },
    links: {
      html: 'https://unsplash.com',
    },
    alt_description: `Stock image ${index + 1}`,
  }));
}
