export const SITE_URL = 'https://joyful.ai'
export const SITE_NAME = 'Joyful'
export const SITE_DESCRIPTION = 'A local-first AI website builder for creating, editing, previewing, and exporting polished SaaS websites without paid cloud sandboxes.'

interface RouteMeta {
  title: string
  description: string
}

export const routeMeta: Record<string, RouteMeta> = {
  '/': { title: 'Joyful - AI SaaS Website Builder', description: 'Create apps and websites by chatting with AI. Joyful is a local-first AI website builder with live preview, code editor, and export-ready HTML, CSS, and JavaScript.' },
  '/builder': { title: 'Builder - Joyful AI Website Builder', description: 'Build and manage your AI-generated website projects. Start from scratch or use a template.' },
  '/dashboard': { title: 'Dashboard - Joyful AI Website Builder', description: 'Manage your projects, view recent work, and start new builds.' },
  '/templates': { title: 'Templates - Joyful AI Website Builder', description: 'Browse our gallery of website templates. Choose a template and customize it with AI.' },
  '/docs': { title: 'Documentation - Joyful AI Website Builder', description: 'Learn how to use Joyful. Documentation covering prompts, templates, editing, preview, export, and more.' },
  '/pricing': { title: 'Pricing - Joyful is Free Forever', description: 'Joyful is 100% free forever. No paywall, no hidden upgrade path.' },
  '/login': { title: 'Log In - Joyful', description: 'Log in to your Joyful account to continue building.' },
  '/signup': { title: 'Create an Account - Joyful', description: 'Create your free Joyful account and start building beautiful websites in minutes.' },
  '/blog': { title: 'Blog - Joyful', description: 'Product updates, tutorials, launch notes, and deeper stories about building with Joyful.' },
  '/guides': { title: 'Guides - Joyful', description: 'Step-by-step guides for prompting, editing, previewing, and exporting with Joyful.' },
  '/examples': { title: 'Examples - Joyful', description: 'Explore website examples built with Joyful.' },
  '/support': { title: 'Support - Joyful', description: 'Get help with Joyful. Find troubleshooting guides and contact support.' },
  '/about': { title: 'About - Joyful', description: 'Learn about Joyful — the local-first AI website builder.' },
  '/security': { title: 'Security - Joyful', description: 'Learn about Joyful security posture and local-first architecture.' },
  '/contact': { title: 'Contact - Joyful', description: 'Get in touch with the Joyful team.' },
  '/status': { title: 'Status - Joyful', description: 'Check the operational status of Joyful services.' },
  '/privacy': { title: 'Privacy Policy - Joyful', description: 'Joyful privacy policy — how we handle browser storage, local previews, and account data.' },
  '/terms': { title: 'Terms of Service - Joyful', description: 'Terms of service covering local usage, generated output, exported files, and accounts.' },
  '/cookies': { title: 'Cookies - Joyful', description: 'Learn about cookies and browser storage used by Joyful.' },
  '/licenses': { title: 'Licenses - Joyful', description: 'Open-source notices, attributions, and dependency acknowledgements.' },
  '/settings': { title: 'Settings - Joyful', description: 'Customize your workspace with theme, editor, and account settings.' },
}
