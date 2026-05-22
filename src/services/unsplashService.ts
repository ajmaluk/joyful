const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || '';
const BASE = 'https://api.unsplash.com';
const MIN_INTERVAL = 1000;
let lastUnsplashCall = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastUnsplashCall;
  if (elapsed < MIN_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL - elapsed));
  }
  lastUnsplashCall = Date.now();
}

function unsplashFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
  });
}

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
    await rateLimit();
    const params = new URLSearchParams({
      query,
      per_page: String(count),
      orientation,
    });
    const res = await unsplashFetch(`${BASE}/search/photos?${params}`);
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
    await rateLimit();
    const params = new URLSearchParams({
      query,
      count: String(count),
      orientation: 'landscape',
    });
    const res = await unsplashFetch(`${BASE}/photos/random?${params}`);
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
  netflix: 'cinematic movie theater',
  streaming: 'cinematic movie poster',
  movie: 'cinema film still',
  movies: 'cinema film still',
  tv: 'home theater streaming',
  entertainment: 'cinematic entertainment',
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

export function inferImageQueries(prompt: string, limit = 6): string[] {
  const lower = prompt.toLowerCase();
  const queries: string[] = [];

  if (/netflix|streaming|movie|movies|cinema|tv show|series|ott|watchlist/.test(lower)) {
    queries.push(
      'cinematic movie theater',
      'film projector cinema',
      'home theater streaming',
      'dramatic landscape cinema',
      'neon city night cinema',
      'movie popcorn theater',
    );
  }
  if (/restaurant|food|cafe|menu/.test(lower)) queries.push('restaurant food photography', 'chef plating food');
  if (/travel|hotel|booking/.test(lower)) queries.push('travel landscape resort', 'city hotel interior');
  if (/fitness|gym|workout/.test(lower)) queries.push('fitness workout training', 'gym interior');
  if (/fashion|shop|ecommerce|store|product/.test(lower)) queries.push('fashion product photography', 'modern product showcase');
  if (/portfolio|photography|gallery/.test(lower)) queries.push('editorial photography gallery', 'creative studio portrait');

  if (queries.length === 0 && /image|photo|visual|hero|gallery|card/.test(lower)) {
    queries.push(getQueryForTopic(lower.match(/(?:for|about)\s+([a-z0-9 -]{3,30})/)?.[1] || 'modern website hero'));
  }

  return Array.from(new Set(queries)).slice(0, limit);
}
