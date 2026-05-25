export type BlogPost = {
  id: string
  slug: string
  title: string
  description: string
  image?: string
  author: string
  authorRole?: string
  category: string
  featured?: boolean
  publishedAt: string
  readTime: number
  tags: string[]
  content: string
}

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    slug: 'welcome',
    title: 'Welcome to the Joyful Blog',
    description: 'An introduction to Joyful and what we build.',
    image: undefined,
    author: 'Joyful Team',
    authorRole: 'Product',
    category: 'Product',
    featured: true,
    publishedAt: new Date().toISOString(),
    readTime: 3,
    tags: ['intro', 'product'],
    content: 'Welcome to Joyful.\n\nThis is a sample post used for local development.',
  },
  {
    id: '2',
    slug: 'getting-started',
    title: 'Getting started with Joyful',
    description: 'How to get started building with Joyful.',
    image: undefined,
    author: 'Joyful Team',
    authorRole: 'Engineering',
    category: 'Guides',
    featured: false,
    publishedAt: new Date().toISOString(),
    readTime: 5,
    tags: ['guide'],
    content: 'This guide will help you get started.\n\n- Step 1\n- Step 2',
  },
]

export const blogCategories = ['All', 'Product', 'Guides', 'Tutorials']

export function getBlogPostBySlug(slug?: string) {
  if (!slug) return undefined
  return blogPosts.find((p) => p.slug === slug)
}

export function getRelatedPosts(post: BlogPost, limit = 3) {
  return blogPosts.filter((p) => p.id !== post.id && p.category === post.category).slice(0, limit)
}

export default blogPosts
