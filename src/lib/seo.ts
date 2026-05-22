/**
 * SEO constants and utility helpers for Joyful.
 * Centralizes all canonical URLs, meta descriptions, OG data, and JSON-LD structured data.
 */

export const SITE_URL = 'https://joyful.ai';
export const SITE_NAME = 'Joyful';
export const SITE_DESCRIPTION = 'A local-first AI website builder for creating, editing, previewing, and exporting polished SaaS websites without paid cloud sandboxes.';
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
export const TWITTER_HANDLE = '@joyful_ai';
export const LOCALE = 'en_US';

interface RouteMeta {
  title: string;
  description: string;
  canonical: string;
}

export const routeMeta: Record<string, RouteMeta> = {
  '/': {
    title: 'Joyful - AI SaaS Website Builder',
    description: 'Create apps and websites by chatting with AI. Joyful is a local-first AI website builder with live preview, code editor, and export-ready HTML, CSS, and JavaScript.',
    canonical: `${SITE_URL}/`,
  },
  '/builder': {
    title: 'Builder - Joyful AI Website Builder',
    description: 'Build and manage your AI-generated website projects. Start from scratch or use a template with Joyful\'s local-first workspace.',
    canonical: `${SITE_URL}/builder`,
  },
  '/templates': {
    title: 'Templates - Joyful AI Website Builder',
    description: 'Browse our gallery of website templates. Choose a template and customize it with AI to create your perfect site in minutes.',
    canonical: `${SITE_URL}/templates`,
  },
  '/docs': {
    title: 'Documentation - Joyful AI Website Builder',
    description: 'Learn how to use Joyful. Documentation covering prompts, templates, editing, preview, export, workspace, and integrations.',
    canonical: `${SITE_URL}/docs`,
  },
  '/pricing': {
    title: 'Pricing - Joyful is Free Forever',
    description: 'Joyful is 100% free forever. No paywall, no hidden upgrade path. Build and export unlimited websites with our local-first AI builder.',
    canonical: `${SITE_URL}/pricing`,
  },
  '/login': {
    title: 'Log In - Joyful AI Website Builder',
    description: 'Log in to your Joyful account to continue building your AI-generated websites, templates, and exports.',
    canonical: `${SITE_URL}/login`,
  },
  '/signup': {
    title: 'Create an Account - Joyful AI Website Builder',
    description: 'Create your free Joyful account and start building beautiful websites in minutes with AI-powered assistance.',
    canonical: `${SITE_URL}/signup`,
  },
  '/blog': {
    title: 'Blog - Joyful AI Website Builder',
    description: 'Product updates, tutorials, launch notes, and deeper stories about building with Joyful.',
    canonical: `${SITE_URL}/blog`,
  },
  '/guides': {
    title: 'Guides - Joyful AI Website Builder',
    description: 'Step-by-step guides for prompting, editing, previewing, and exporting with Joyful\'s local-first AI website builder.',
    canonical: `${SITE_URL}/guides`,
  },
  '/examples': {
    title: 'Examples - Joyful AI Website Builder',
    description: 'Explore website examples built with Joyful. Get inspired by SaaS, portfolio, editorial, and business page patterns.',
    canonical: `${SITE_URL}/examples`,
  },
  '/support': {
    title: 'Support - Joyful AI Website Builder',
    description: 'Get help with Joyful. Find troubleshooting guides, contact support, and browse frequently asked questions.',
    canonical: `${SITE_URL}/support`,
  },
  '/about': {
    title: 'About - Joyful AI Website Builder',
    description: 'Learn about Joyful — the local-first AI website builder. Our mission is to make website creation faster, calmer, and more controllable.',
    canonical: `${SITE_URL}/about`,
  },
  '/security': {
    title: 'Security - Joyful AI Website Builder',
    description: 'Learn about Joyful\'s security posture, local-first architecture, preview sandbox boundaries, and best practices.',
    canonical: `${SITE_URL}/security`,
  },
  '/contact': {
    title: 'Contact - Joyful AI Website Builder',
    description: 'Get in touch with the Joyful team. Choose the right path for support, partnerships, feedback, or product questions.',
    canonical: `${SITE_URL}/contact`,
  },
  '/status': {
    title: 'Status - Joyful AI Website Builder',
    description: 'Check the operational status of Joyful services. View current health, incident history, and maintenance schedules.',
    canonical: `${SITE_URL}/status`,
  },
  '/privacy': {
    title: 'Privacy Policy - Joyful AI Website Builder',
    description: 'Joyful\'s privacy policy explains how we handle browser storage, local previews, settings, and account data.',
    canonical: `${SITE_URL}/privacy`,
  },
  '/terms': {
    title: 'Terms of Service - Joyful AI Website Builder',
    description: 'Joyful\'s terms of service covering local usage, generated output, exported files, accounts, and acceptable behavior.',
    canonical: `${SITE_URL}/terms`,
  },
  '/cookies': {
    title: 'Cookies - Joyful AI Website Builder',
    description: 'Learn about cookies and browser storage used by Joyful, how preferences work, and your control options.',
    canonical: `${SITE_URL}/cookies`,
  },
  '/licenses': {
    title: 'Licenses - Joyful AI Website Builder',
    description: 'Open-source notices, attributions, and dependency acknowledgements for Joyful.',
    canonical: `${SITE_URL}/licenses`,
  },
  '/settings': {
    title: 'Settings - Joyful AI Website Builder',
    description: 'Customize your Joyful workspace with theme, editor, AI runtime, and account settings.',
    canonical: `${SITE_URL}/settings`,
  },
};

/**
 * Generates the Organization + WebSite JSON-LD structured data block.
 */
export function getJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/brand-logo-180.png`,
        description: SITE_DESCRIPTION,
        sameAs: [
          'https://github.com/joyful',
          'https://twitter.com/joyful_ai',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#webapplication`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ],
  };
}
