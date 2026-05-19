import type { LucideIcon } from 'lucide-react';
import {
  BadgeHelp,
  BookOpen,
  BookText,
  FileCheck2,
  FileLock2,
  Files,
  Headphones,
  LifeBuoy,
  Lock,
  Newspaper,
  Radar,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

type SitePageSection = {
  title: string;
  body: string;
};

type SitePageFeature = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export type SitePageContent = {
  badge: string;
  title: string;
  description: string;
  heroNote: string;
  icon: LucideIcon;
  stats: Array<{ value: string; label: string }>;
  highlights: SitePageFeature[];
  sections: SitePageSection[];
  resources: string[];
};

export const sitePageContent: Record<string, SitePageContent> = {
  docs: {
    badge: 'Documentation',
    title: 'Documentation that looks like part of the product.',
    description: 'Learn the workflow, understand the builder, and move from prompt to export without leaving the same visual language as the homepage.',
    heroNote: 'Clear setup, practical guides, and export-ready knowledge.',
    icon: BookOpen,
    stats: [
      { value: '4', label: 'core workflow steps' },
      { value: '0', label: 'paid setup blockers' },
      { value: '1', label: 'shared product language' },
    ],
    highlights: [
      { icon: Sparkles, title: 'Quick start', body: 'Go from blank idea to first editable project in a short, guided flow.' },
      { icon: BookText, title: 'Practical guides', body: 'Learn prompts, templates, editing, preview, and export with concrete examples.' },
      { icon: Files, title: 'Code-aware docs', body: 'Each explanation stays grounded in the actual HTML, CSS, and JavaScript workflow.' },
    ],
    sections: [
      { title: 'Start with a prompt', body: 'Describe the site, choose a template, or point Joyful at a reference. The builder turns that into a project you can immediately edit.' },
      { title: 'Refine in place', body: 'Adjust layout, copy, visual tone, and interactions while seeing the result in the same local workspace.' },
      { title: 'Export confidently', body: 'Ship plain static files with a workflow built around visibility rather than black-box automation.' },
    ],
    resources: ['Getting Started', 'Prompting Guide', 'Template Tips', 'Export Notes'],
  },
  privacy: {
    badge: 'Privacy Policy',
    title: 'Privacy that is plain about local-first building.',
    description: 'Understand how Joyful treats browser storage, local previews, settings, and account actions without wading through a generic legal wall.',
    heroNote: 'Privacy language for a local-first product.',
    icon: FileLock2,
    stats: [
      { value: 'Local', label: 'project storage default' },
      { value: 'Clear', label: 'data handling summary' },
      { value: 'Simple', label: 'user expectations' },
    ],
    highlights: [
      { icon: Lock, title: 'Stored locally', body: 'Projects live in browser storage by default, which keeps most iteration close to the user.' },
      { icon: ShieldCheck, title: 'Transparent handling', body: 'State plainly what is stored, when it changes, and what actions require authentication.' },
      { icon: FileCheck2, title: 'Readable policy', body: 'Important answers stay scannable instead of disappearing into legal density.' },
    ],
    sections: [
      { title: 'What Joyful stores', body: 'Project content, settings, and local workspace state are designed around browser storage first, keeping the everyday build loop close to the user.' },
      { title: 'What changes with accounts', body: 'Signed-in features may add account-level records such as identity, preferences, and access history. Local project work and account usage are explained separately.' },
      { title: 'How users stay in control', body: 'Users can review exported files, clear browser storage, and choose when to use account features. The policy keeps those controls visible.' },
    ],
    resources: ['Local Storage', 'Account Data', 'Retention', 'Contact Privacy Team'],
  },
  terms: {
    badge: 'Terms of Service',
    title: 'Terms that keep builders oriented.',
    description: 'Set expectations around local usage, generated output, exported files, accounts, and acceptable behavior in language that still feels like Joyful.',
    heroNote: 'Product expectations, responsibilities, and usage boundaries.',
    icon: ScrollText,
    stats: [
      { value: 'Plain', label: 'language direction' },
      { value: 'Shared', label: 'product consistency' },
      { value: 'Focused', label: 'user obligations' },
    ],
    highlights: [
      { icon: FileCheck2, title: 'Usage clarity', body: 'Spell out what the builder does, what it does not promise, and where user responsibility begins.' },
      { icon: ShieldCheck, title: 'Export ownership', body: 'Make it clear that users review and ship the static files they generate.' },
      { icon: BadgeHelp, title: 'Support expectations', body: 'Define what help channels exist and where service guarantees end.' },
    ],
    sections: [
      { title: 'Using the builder', body: 'Joyful helps generate and edit websites locally, but final content, deployment, and compliance decisions still belong to the user.' },
      { title: 'Generated output', body: 'Exports are editable static files. Users review, test, and approve those files before publishing them anywhere public.' },
      { title: 'Reasonable use', body: 'The terms set clear boundaries for misuse while staying understandable to normal builders, teams, and agencies.' },
    ],
    resources: ['Acceptable Use', 'Exported Files', 'Accounts', 'Termination'],
  },
  blog: {
    badge: 'Blog',
    title: 'Editorial pages should feel like the same brand system.',
    description: 'Use the homepage visual language for product updates, tutorials, launch notes, and deeper stories instead of dropping into a generic article shell.',
    heroNote: 'Stories, launches, and walkthroughs inside the same design world.',
    icon: Newspaper,
    stats: [
      { value: 'Brand', label: 'consistent presentation' },
      { value: 'Fast', label: 'content publishing feel' },
      { value: 'Rich', label: 'article storytelling' },
    ],
    highlights: [
      { icon: BookText, title: 'Launch notes', body: 'Announce new templates, exports, or workflow improvements without leaving the marketing system.' },
      { icon: Sparkles, title: 'Tutorial content', body: 'Pair product education with stronger visual hierarchy and better callouts.' },
      { icon: Files, title: 'Evergreen posts', body: 'Create libraries of examples, design tips, and build breakdowns with reusable structure.' },
    ],
    sections: [
      { title: 'Publish updates with presence', body: 'A blog should feel intentional enough for launches, case studies, and in-depth workflow posts.' },
      { title: 'Keep product context nearby', body: 'Editorial pages can still carry CTAs, examples, and navigation back into templates or the builder.' },
      { title: 'Make reading feel premium', body: 'Spacing, contrast, cards, and section rhythm matter just as much on content pages as on the homepage.' },
    ],
    resources: ['Release Notes', 'Tutorials', 'Case Studies', 'Writing Style'],
  },
  guides: {
    badge: 'Guides',
    title: 'Guides for people who want to move faster without guessing.',
    description: 'Bring together practical playbooks for prompting, editing, previewing, and exporting inside the same polished marketing UI.',
    heroNote: 'Step-by-step patterns for real Joyful workflows.',
    icon: BookText,
    stats: [
      { value: 'Step', label: 'by step paths' },
      { value: 'Real', label: 'workflow examples' },
      { value: 'Shared', label: 'site styling' },
    ],
    highlights: [
      { icon: Sparkles, title: 'Prompting guide', body: 'Learn how to ask for stronger first drafts and faster refinements.' },
      { icon: Files, title: 'Editing guide', body: 'See how to tune sections, code, and responsive layouts after generation.' },
      { icon: ShieldCheck, title: 'Launch guide', body: 'Walk through testing, cleanup, and export checks before publishing.' },
    ],
    sections: [
      { title: 'Start with a pattern', body: 'Good guides reduce ambiguity by showing the shape of a strong workflow before details begin.' },
      { title: 'Stay practical', body: 'The most useful help content is rooted in real tasks like improving a hero or exporting a landing page.' },
      { title: 'Connect back to the product', body: 'Guides should always make it easy to jump back into the builder, templates, or docs.' },
    ],
    resources: ['Prompting', 'Editing', 'Responsive QA', 'Export Checklist'],
  },
  examples: {
    badge: 'Examples',
    title: 'Examples should inspire the same way the homepage does.',
    description: 'Show concrete page ideas, content patterns, and output possibilities in a layout that still feels like the product brand.',
    heroNote: 'Reference builds, inspiration, and reusable patterns.',
    icon: Sparkles,
    stats: [
      { value: '6+', label: 'starter directions' },
      { value: 'Wide', label: 'industry spread' },
      { value: 'Real', label: 'page patterns' },
    ],
    highlights: [
      { icon: Files, title: 'Page references', body: 'Show SaaS, portfolio, editorial, and business patterns with a more polished frame.' },
      { icon: BookOpen, title: 'Prompt ideas', body: 'Pair each example with a useful way to ask for it inside Joyful.' },
      { icon: ShieldCheck, title: 'Buildable output', body: 'Keep the examples close to what the actual builder can create and export.' },
    ],
    sections: [
      { title: 'Show what good looks like', body: 'Examples reduce friction by helping users recognize strong directions quickly.' },
      { title: 'Make exploration easy', body: 'Cards, sections, and CTAs can guide people from inspiration into templates or new projects.' },
      { title: 'Keep examples actionable', body: 'The strongest galleries suggest how to reproduce the design, not just admire it.' },
    ],
    resources: ['SaaS', 'Portfolio', 'Editorial', 'Product Marketing'],
  },
  support: {
    badge: 'Support',
    title: 'Support pages can still feel calm and premium.',
    description: 'Offer help channels, troubleshooting paths, and self-serve answers without dropping into a generic utilities layout.',
    heroNote: 'Help when you are stuck, without losing the product feel.',
    icon: LifeBuoy,
    stats: [
      { value: 'Self-serve', label: 'first line of help' },
      { value: 'Fast', label: 'problem routing' },
      { value: 'Human', label: 'tone and guidance' },
    ],
    highlights: [
      { icon: Headphones, title: 'Contact routes', body: 'Make it obvious where to go for billing, bugs, account access, or product questions.' },
      { icon: BadgeHelp, title: 'Troubleshooting', body: 'Resolve common issues with clear, short paths before a user gets frustrated.' },
      { icon: BookOpen, title: 'Linked docs', body: 'Support works best when it connects directly to the guides and docs users already need.' },
    ],
    sections: [
      { title: 'Help by issue type', body: 'Routing users by problem is often faster than routing them by team structure.' },
      { title: 'Lower the time to answer', body: 'A few strong support sections can eliminate the need for a long, cluttered FAQ wall.' },
      { title: 'Preserve trust', body: 'Support pages should feel reliable, current, and visibly part of the same product ecosystem.' },
    ],
    resources: ['Troubleshooting', 'Contact Support', 'FAQ', 'Known Issues'],
  },
  about: {
    badge: 'About',
    title: 'The about page should carry the same confidence as the homepage.',
    description: 'Tell the product story, explain the local-first angle, and introduce the team or philosophy in the same visual system.',
    heroNote: 'Why Joyful exists and what it is trying to make easier.',
    icon: BookOpen,
    stats: [
      { value: 'Local-first', label: 'product stance' },
      { value: 'Simple', label: 'workflow promise' },
      { value: 'Honest', label: 'product story' },
    ],
    highlights: [
      { icon: Sparkles, title: 'Product vision', body: 'Explain why prompting, editing, previewing, and exporting belong in one calmer tool.' },
      { icon: Files, title: 'How it works', body: 'Describe the blend of AI assistance and hands-on code control without overselling it.' },
      { icon: ShieldCheck, title: 'What makes it different', body: 'Highlight the local-first workflow and practical shipping focus.' },
    ],
    sections: [
      { title: 'Built for makers who still want control', body: 'Joyful is strongest when it speeds up the start without hiding the actual files underneath.' },
      { title: 'Made for practical shipping', body: 'The product is designed around real deployment needs, not just AI demos or one-click magic.' },
      { title: 'Calm by design', body: 'A quieter, more intentional workspace can make building feel more approachable and more reliable.' },
    ],
    resources: ['Story', 'Philosophy', 'What Is Local-First', 'Careers'],
  },
  security: {
    badge: 'Security',
    title: 'Security deserves the same clarity as every other page.',
    description: 'Present the local-first architecture, preview boundaries, and account considerations in a layout that feels trustworthy and modern.',
    heroNote: 'Security posture, architecture choices, and user expectations.',
    icon: ShieldCheck,
    stats: [
      { value: 'Local', label: 'default project flow' },
      { value: 'Visible', label: 'preview boundary' },
      { value: 'Explicit', label: 'account separation' },
    ],
    highlights: [
      { icon: Lock, title: 'Local-first workflow', body: 'A security page can emphasize that most creation work begins and stays in the browser context.' },
      { icon: ShieldCheck, title: 'Sandboxed preview', body: 'Explain how local previews are isolated and what that means for testing site output.' },
      { icon: Radar, title: 'Operational clarity', body: 'Set expectations around updates, issue reporting, and future security improvements.' },
    ],
    sections: [
      { title: 'What local-first changes', body: 'Keeping core project iteration in-browser can reduce some categories of exposure while still requiring careful account and export practices.' },
      { title: 'What users should review', body: 'Security pages should remind users to evaluate generated code, dependencies, and deployment environments before publishing.' },
      { title: 'How to report concerns', body: 'A clean reporting path is part of the product experience, not a side note.' },
    ],
    resources: ['Architecture', 'Preview Sandbox', 'Reporting', 'Best Practices'],
  },
  contact: {
    badge: 'Contact',
    title: 'Contact pages should feel warm and deliberate.',
    description: 'Keep the same visual rhythm while helping visitors choose the right path for support, partnerships, feedback, or product questions.',
    heroNote: 'Reach the right team without a dead-end form feeling.',
    icon: Headphones,
    stats: [
      { value: '4', label: 'main contact paths' },
      { value: 'Clear', label: 'routing expectations' },
      { value: 'On-brand', label: 'presentation' },
    ],
    highlights: [
      { icon: Headphones, title: 'Support requests', body: 'Direct product questions and troubleshooting to the right place.' },
      { icon: Sparkles, title: 'Partnership and feedback', body: 'Create room for collaboration requests, ideas, and launch conversations.' },
      { icon: BookOpen, title: 'Docs before forms', body: 'Link users to fast answers before asking them to wait for a reply.' },
    ],
    sections: [
      { title: 'Start with the fastest answer', body: 'Many visitors need a route, not just a generic mailbox. Good contact pages reduce that uncertainty.' },
      { title: 'Keep communication specific', body: 'Split help, feedback, partnerships, and security reports so messages land in the right place.' },
      { title: 'Make the page feel alive', body: 'The best contact experiences still feel part of a living product, not a leftover footer destination.' },
    ],
    resources: ['Support', 'Sales', 'Feedback', 'Security Reports'],
  },
  status: {
    badge: 'Status',
    title: 'Status pages can be useful and still look intentional.',
    description: 'Show product reliability, incident communication, and current service notes with the same homepage-inspired UI language.',
    heroNote: 'Operational health, updates, and issue communication.',
    icon: Radar,
    stats: [
      { value: 'Live', label: 'service communication' },
      { value: 'Clear', label: 'incident updates' },
      { value: 'Consistent', label: 'brand surface' },
    ],
    highlights: [
      { icon: Radar, title: 'Availability summary', body: 'Show what parts of the experience are healthy, degraded, or under maintenance.' },
      { icon: ShieldCheck, title: 'Transparent incidents', body: 'Users should be able to see when something breaks and what is being done about it.' },
      { icon: BookOpen, title: 'Operational notes', body: 'Status can connect out to support and docs when action is required.' },
    ],
    sections: [
      { title: 'Communicate quickly', body: 'Status pages are most valuable when they trade corporate wording for direct operational clarity.' },
      { title: 'Show scope clearly', body: 'If an issue affects export, accounts, or templates differently, users should be able to tell at a glance.' },
      { title: 'Close the loop', body: 'Once incidents are resolved, status updates should explain what changed and what users can do next.' },
    ],
    resources: ['Current Status', 'Incident History', 'Maintenance', 'Subscriptions'],
  },
  cookies: {
    badge: 'Cookies',
    title: 'Cookies and storage, explained without the fog.',
    description: 'Learn which browser behaviors support core product flows, how preferences work, and where cookie choices connect to privacy.',
    heroNote: 'Storage, consent, and browser-level behavior.',
    icon: FileCheck2,
    stats: [
      { value: 'Simple', label: 'storage explanation' },
      { value: 'Browser', label: 'behavior focus' },
      { value: 'Readable', label: 'legal surface' },
    ],
    highlights: [
      { icon: FileCheck2, title: 'What is essential', body: 'Clarify which storage or cookies support core product behavior and why they matter.' },
      { icon: Lock, title: 'What users can control', body: 'Explain preferences, browser controls, and any tradeoffs users should expect.' },
      { icon: ShieldCheck, title: 'Stay consistent', body: 'Keep the language aligned with the broader privacy and security story.' },
    ],
    sections: [
      { title: 'Name the behaviors plainly', body: 'Users can see what is used for authentication, settings, product continuity, and local workspace behavior.' },
      { title: 'Respect context', body: 'A local-first builder may rely more on browser storage concepts than a conventional SaaS cookie page.' },
      { title: 'Keep it connected', body: 'Cookie details link naturally to privacy, security, and support so visitors can understand the full data story.' },
    ],
    resources: ['Essential Storage', 'Preferences', 'Browser Controls', 'Privacy Links'],
  },
  licenses: {
    badge: 'Licenses',
    title: 'License information that stays organized.',
    description: 'Review open-source notices, attributions, and dependency acknowledgements in a page that feels intentionally part of the product.',
    heroNote: 'Open-source acknowledgements and dependency transparency.',
    icon: Files,
    stats: [
      { value: 'Open', label: 'source acknowledgements' },
      { value: 'Clear', label: 'attribution structure' },
      { value: 'Consistent', label: 'site experience' },
    ],
    highlights: [
      { icon: Files, title: 'Dependency notices', body: 'Collect licensing details for frameworks, UI kits, and supporting libraries in one place.' },
      { icon: BookOpen, title: 'Readable attribution', body: 'Make compliance easier to scan with better visual grouping and page rhythm.' },
      { icon: ShieldCheck, title: 'Product transparency', body: 'A good licenses page can reinforce trust instead of feeling like an afterthought.' },
    ],
    sections: [
      { title: 'Acknowledge building blocks', body: 'Joyful depends on many excellent open-source tools, and that attribution is visible, respectful, and easy to scan.' },
      { title: 'Keep details organized', body: 'Long legal lists become much more usable when broken into clear sections and cards.' },
      { title: 'Support compliance', body: 'The page makes it straightforward to discover the key notices users or teams may need.' },
    ],
    resources: ['Open Source', 'Third-Party Notices', 'Attributions', 'Dependency Summary'],
  },
};
