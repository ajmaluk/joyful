export const marketingFooterLinks = {
  Product: ['Builder', 'Templates', 'Pricing', 'Blog'],
  Resources: ['Docs', 'Guides', 'Examples', 'Support'],
  Company: ['About', 'Security', 'Contact', 'Status'],
  Legal: ['Privacy', 'Terms', 'Cookies', 'Licenses'],
} as const;

export const marketingFooterRoutes: Record<string, string> = {
  Builder: '/builder',
  Templates: '/templates',
  Pricing: '/pricing',
  Blog: '/blog',
  Docs: '/docs',
  Guides: '/guides',
  Examples: '/examples',
  Support: '/support',
  About: '/about',
  Security: '/security',
  Contact: '/contact',
  Status: '/status',
  Privacy: '/privacy',
  Terms: '/terms',
  Cookies: '/cookies',
  Licenses: '/licenses',
};

export const marketingPaths = new Set([
  '/',
  '/docs',
  '/guides',
  '/examples',
  '/support',
  '/about',
  '/security',
  '/contact',
  '/status',
  '/privacy',
  '/terms',
  '/cookies',
  '/licenses',
  '/blog',
  '/pricing',
]);
