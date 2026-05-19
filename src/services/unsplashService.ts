const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || '';
const BASE = 'https://api.unsplash.com';

export interface UnsplashImage {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  author: string;
  authorUrl: string;
  color: string;
  width: number;
  height: number;
}

interface UnsplashPhoto {
  id: string;
  urls: {
    regular: string;
    small: string;
  };
  alt_description?: string | null;
  description?: string | null;
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  color: string;
  width: number;
  height: number;
}

function mapResult(photo: UnsplashPhoto): UnsplashImage {
  return {
    id: photo.id,
    url: photo.urls.regular,
    thumb: photo.urls.small,
    alt: photo.alt_description || photo.description || 'Unsplash photo',
    author: photo.user.name,
    authorUrl: photo.user.links.html,
    color: photo.color,
    width: photo.width,
    height: photo.height,
  };
}

export async function searchImages(
  query: string,
  count = 6,
  orientation: 'landscape' | 'portrait' | 'squarish' = 'landscape'
): Promise<UnsplashImage[]> {
  if (!UNSPLASH_KEY) return [];
  try {
    const params = new URLSearchParams({
      query,
      per_page: String(count),
      orientation,
    });
    const res = await fetch(`${BASE}/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
    });
    if (!res.ok) return [];
    const data = await res.json() as { results?: UnsplashPhoto[] };
    return (data.results || []).map(mapResult);
  } catch {
    return [];
  }
}

export async function getRandomImages(
  query: string,
  count = 1
): Promise<UnsplashImage[]> {
  if (!UNSPLASH_KEY) return [];
  try {
    const params = new URLSearchParams({
      query,
      count: String(count),
      orientation: 'landscape',
    });
    const res = await fetch(`${BASE}/photos/random?${params}`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
    });
    if (!res.ok) return [];
    const data = await res.json() as UnsplashPhoto | UnsplashPhoto[];
    const arr = Array.isArray(data) ? data : [data];
    return arr.map(mapResult);
  } catch {
    return [];
  }
}

// Topic-to-query mapping for generated websites
const TOPIC_QUERIES: Record<string, string> = {
  portfolio: 'creative workspace minimal',
  saas: 'technology dashboard abstract',
  restaurant: 'food photography elegant',
  ecommerce: 'product showcase modern',
  blog: 'writing desk creative',
  dashboard: 'data visualization modern',
  agency: 'team collaboration office',
  event: 'conference stage modern',
  hero: 'abstract gradient modern',
  team: 'professional headshot diverse',
  testimonials: 'quote background texture',
  about: 'office workspace modern',
  contact: 'map location pin',
  gallery: 'photography collection',
  nature: 'nature landscape beautiful',
  technology: 'technology abstract code',
  food: 'food photography delicious',
  travel: 'travel landscape adventure',
  fitness: 'fitness workout modern',
  fashion: 'fashion style modern',
};

export function getQueryForTopic(topic: string): string {
  return TOPIC_QUERIES[topic.toLowerCase()] || topic;
}

// Generate placeholder images for generated websites
export function getPlaceholderImages(
  topics: string[],
  width = 800,
  height = 600
): { topic: string; url: string }[] {
  return topics.map(topic => ({
    topic,
    url: `https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=${width}&h=${height}&fit=crop&q=80`,
  }));
}
