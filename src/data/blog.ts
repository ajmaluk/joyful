export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  authorRole: string;
  publishedAt: string;
  readTime: number;
  featured: boolean;
  image?: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: 'welcome-to-joyful',
    slug: 'welcome-to-joyful',
    title: 'Welcome to Joyful — Build Websites by Chatting with AI',
    description: 'Joyful is a local-first AI website builder that lets you create, edit, preview, and export polished pages without leaving your browser. Here is how it works and why we built it.',
    content: `
## A new way to build websites

Most website builders make you choose between speed and control. You either get a drag-and-drop tool that hides the code, or a manual setup that takes hours before you see anything useful.

Joyful takes a different path: **describe what you want, watch it appear, then refine in place.**

Prompt the first draft, inspect the generated files, edit sections directly, and preview the result — all inside one local workspace.

## Why local-first matters

When your website builder runs in your browser, you keep more control:

- **Projects stay on your machine** until you choose to export
- **No hidden cloud costs** or surprise usage limits
- **Full access to the source files** — HTML, CSS, and JavaScript you can read, edit, and own

Local-first does not mean limited. The preview sandbox handles responsive layouts, interactions, and dynamic content. And when you are ready, export is one click away.

## From prompt to polished page

The workflow is intentionally short:

1. **Start with an idea** — Describe the page, pick a template, or drop in a reference image
2. **Watch the draft appear** — Joyful generates a first pass with real structure and content
3. **Refine with prompts or code** — Ask for a stronger hero, better mobile spacing, or a new section
4. **Preview and export** — Check the result at desktop and mobile sizes, then download a clean ZIP

## Who it is for

Joyful is built for founders, marketers, indie builders, and teams who need to move fast without losing control of the output. It fits marketing pages, launch sites, documentation portals, internal tools, and editorial layouts.

## What is next

This is just the beginning. The roadmap includes richer templates, team collaboration, deeper export options, and a growing library of patterns.

Welcome to the builder that treats your files like your files.
    `.trim(),
    category: 'Product',
    tags: ['Welcome', 'Local-first', 'Website Builder'],
    author: 'Joyful Team',
    authorRole: 'Product',
    publishedAt: '2026-01-15',
    readTime: 4,
    featured: true,
  },
  {
    id: 'prompting-best-practices',
    slug: 'prompting-best-practices',
    title: 'Prompting Best Practices for Better Website Drafts',
    description: 'The difference between a good draft and a great one often comes down to how you write the prompt. Here are practical tips for getting stronger results from Joyful.',
    content: `
## Start with the outcome

The most effective prompts describe what the page should do, who it is for, and how it should feel — before mentioning specific colors or fonts.

\`\`\`
Build a landing page for a fintech startup targeting small business owners.
Tone should be confident and trustworthy. Include hero, features, pricing, and FAQ.
\`\`\`

## Name the sections you need

If you know the structure you want, say so up front. Listing sections helps Joyful organize the page layout from the first draft.

Good: "A SaaS landing page with hero, feature grid, testimonials, pricing tiers, FAQ, and footer."

Better: Add context to each section: "The hero should have a headline, supporting text, and two CTA buttons. Pricing should show three tiers with a recommended badge on the middle option."

## One dimension at a time

For revisions, focus on one improvement per request. Stacking too many changes into one prompt makes it harder to evaluate what worked.

- "Make the hero section more impactful" → then "Shorten the headline to 6 words"
- "Improve the mobile spacing" → then "Add more whitespace between pricing cards"
- "Give the page a warmer color scheme" → then "Swap the blue accent for coral"

## Use reference examples

If you have a website or screenshot you admire, describe what you want to borrow from it:

"I like the card layout from Stripe's pricing page and the testimonial style from Notion's site. Combine those with a darker background."

## Keep it conversational

The best prompts read like directions you would give a designer — specific enough to act on, but not so rigid that they block better ideas.

Avoid over-specifying pixel values or exact colors in your first prompt. Those details are easier to tune once the structure is working.
    `.trim(),
    category: 'Guides',
    tags: ['Prompting', 'Tips', 'Best Practices'],
    author: 'Joyful Team',
    authorRole: 'Product',
    publishedAt: '2026-02-01',
    readTime: 5,
    featured: true,
  },
  {
    id: 'local-first-architecture',
    slug: 'local-first-architecture',
    title: 'Why Local-First Architecture Makes Website Building Safer',
    description: 'Most AI website tools run everything in the cloud. Joyful takes a different approach by keeping projects in your browser. Here is why that matters for privacy, speed, and control.',
    content: `
## The cloud reflex

Most modern tools default to cloud-first: your data goes to a server, gets processed, and comes back. For website building, this creates several problems:

- **Your work depends on a server being available**
- **You pay for compute time even during iteration**
- **Your files are stored on someone else's infrastructure**
- **Exporting feels like an escape, not a feature**

## How local-first changes the equation

Joyful runs the AI generation, preview sandbox, and file management inside your browser:

### Privacy by default

Since your project files stay on your machine during iteration, there is no question about who has access to them. You control when and where the output goes.

### No paid runner required

The preview sandbox renders your site locally. There is no cloud VM billing you by the minute while you tweak CSS values or adjust copy.

### Offline resilience

The core workspace does not depend on an active connection. You can prompt, edit, preview, and refine without worrying about network interruptions.

### True ownership

The files Joyful creates are standard HTML, CSS, and JavaScript. Exporting gives you a folder of ordinary website files you can host anywhere.

## What this means for teams

For agencies and internal teams, local-first reduces the security review surface. There is no third-party storage to audit, no cloud processing pipeline to approve, and no dependency on a vendor's uptime for day-to-day work.

## The right tradeoffs

Local-first does mean some features that require server-side processing (like persistent collaboration or cloud storage sync) are intentionally out of scope for now. But for the core workflow — going from idea to a working website — keeping things local is a feature, not a limitation.
    `.trim(),
    category: 'Engineering',
    tags: ['Architecture', 'Local-first', 'Privacy', 'Security'],
    author: 'Joyful Team',
    authorRole: 'Engineering',
    publishedAt: '2026-02-15',
    readTime: 6,
    featured: false,
  },
  {
    id: 'template-strategy',
    slug: 'template-strategy',
    title: 'How to Choose the Right Template for Your Project',
    description: 'Starting from a template can save hours. Here is how to pick the right one and make it your own without fighting the original design.',
    content: `
## Templates are starting points, not cages

The best way to use a template is to treat it as a structural head start — not a final design to defend. The template gives you a working layout, content hierarchy, and responsive foundation. Everything else is yours to change.

## How to choose

### Match the page type first

Pick the template that matches what you are building, not the one with the prettiest hero section:

- Building a product page → **SaaS Landing**
- Showcasing work → **Portfolio**
- Writing articles → **Blog**
- Selling online → **E-Commerce**
- Listing properties → **Real Estate**

The visual style is easier to change than the information architecture.

### Look at the section list

Each template has a preset list of sections. Check if the template includes most of what you need:

- Hero
- Features / Services
- Pricing
- Testimonials
- FAQ
- Contact / CTA

You can always add or remove sections later, but starting with 80% of the right structure saves the most time.

### Consider complexity

Templates are labeled simple, medium, or advanced:

- **Simple**: 4-5 sections, straightforward layout, good for single-page sites
- **Medium**: 5-7 sections with richer interactions, good for most business sites
- **Advanced**: 7+ sections, data-rich layouts, good for dashboards or feature-heavy pages

## Making it yours

Once you open a template in the builder, use chat to reshape it:

- "Change the color palette to warm tones with a coral accent"
- "Replace the testimonials section with a team grid"
- "Make the hero full-screen with a video background placeholder"
- "Add a newsletter signup section between features and pricing"

The AI adapts the existing structure rather than regenerating from scratch, which keeps what works and replaces what does not.
    `.trim(),
    category: 'Guides',
    tags: ['Templates', 'Workflow', 'Tips'],
    author: 'Joyful Team',
    authorRole: 'Product',
    publishedAt: '2026-03-01',
    readTime: 5,
    featured: false,
  },
  {
    id: 'building-for-mobile-first',
    slug: 'building-for-mobile-first',
    title: 'Building Mobile-First Websites with AI Assistance',
    description: 'Responsive design does not have to be an afterthought. Learn how to use Joyful to create websites that look great on every screen size from the first draft.',
    content: `
## Mobile-first is a mindset

A mobile-first approach means designing for the smallest screen first, then enhancing for larger screens. This ensures every visitor gets a good experience regardless of their device.

## How Joyful handles responsiveness

Every template and generated page in Joyful starts with responsive fundamentals:

- **Fluid grids** that adapt to viewport width
- **Responsive typography** using clamp() and relative units
- **Touch-friendly targets** for navigation and CTAs
- **Stacking layouts** that work vertically on mobile

## Prompting for mobile quality

When you ask for mobile improvements, be specific:

- "Make the navigation collapse into a hamburger menu on mobile"
- "Stack the three feature cards vertically on screens under 768px"
- "Increase the touch target size on the CTA buttons"
- "Reduce the hero text size for mobile screens"

## What to check in preview

Before you export, preview the page at these sizes:

1. **Phone (375px)** — Does the nav work? Are CTAs tappable? Is text readable?
2. **Tablet (768px)** — Do multi-column layouts still look intentional?
3. **Desktop (1280px)** — Does the page take advantage of the extra space?

## Common mobile issues to fix

- **Overlapping elements** — Usually caused by fixed heights or absolute positioning
- **Tiny text** — Body text below 14px is hard to read on mobile
- **Closely packed CTAs** — Buttons need at least 44px touch targets
- **Horizontal scroll** — A sign something is wider than the viewport

## Iterate mobile-first

The fastest path to a polished responsive site: start your revisions by looking at the mobile preview first. Fix the mobile layout, then verify it looks good on larger screens. This catches the hardest problems while they are still easy to solve.
    `.trim(),
    category: 'Guides',
    tags: ['Mobile', 'Responsive', 'Design', 'Tips'],
    author: 'Joyful Team',
    authorRole: 'Design',
    publishedAt: '2026-03-15',
    readTime: 5,
    featured: false,
  },
  {
    id: 'export-deployment-guide',
    slug: 'export-deployment-guide',
    title: 'A Complete Guide to Exporting and Deploying Your Joyful Site',
    description: 'Once your site is ready, exporting and deploying it should be straightforward. This guide covers everything from downloading your ZIP to going live.',
    content: `
## When to export

You are ready to export when:

- The core pages look good at desktop and mobile sizes
- The copy is final or close to final
- Navigation works across all pages
- CTAs and links point to the right destinations
- You have reviewed the generated code (optional but recommended)

## How export works

Exporting from Joyful packages your project into a ZIP file containing:

- **index.html** — The main page (or multiple HTML files for multi-page projects)
- **css/** — Stylesheet files
- **js/** — JavaScript files
- **assets/** — Images, fonts, and other static resources

These are standard web files. No proprietary formats, no build step required.

## Deployment options

Once you have the ZIP, you have several hosting choices:

### Static hosting (recommended for most sites)

- **Vercel** — Drag and drop the folder, or connect via CLI
- **Netlify** — Same simple deploy flow
- **Cloudflare Pages** — Fast global CDN, generous free tier
- **GitHub Pages** — Free hosting from your repository
- **AWS S3 + CloudFront** — For production-scale needs

### Traditional hosting

Upload the extracted files to any web host via FTP or your hosting control panel. Since they are static files, almost every hosting provider supports them.

## Before you go live

Run through this checklist:

- [ ] Test all navigation links
- [ ] Verify contact forms work (if using a third-party form service)
- [ ] Check page load speed
- [ ] Confirm meta titles and descriptions are set
- [ ] Add analytics if needed
- [ ] Set up custom domain
- [ ] Enable HTTPS

## Custom domains

Most hosting providers let you connect a custom domain through their dashboard. The process usually involves:

1. Add your domain in the hosting provider's settings
2. Update your DNS records to point to the provider
3. Wait for DNS propagation (minutes to hours)
4. Enable SSL/HTTPS

That is it. Your Joyful-built site is live.
    `.trim(),
    category: 'Guides',
    tags: ['Export', 'Deployment', 'Workflow', 'Hosting'],
    author: 'Joyful Team',
    authorRole: 'Engineering',
    publishedAt: '2026-04-01',
    readTime: 6,
    featured: true,
  },
  {
    id: 'design-system-philosophy',
    slug: 'design-system-philosophy',
    title: 'The Design Philosophy Behind Joyful\'s Visual Language',
    description: 'Every pixel on the Joyful website and generated pages follows a deliberate design system. Here is the thinking behind the colors, typography, and spacing choices.',
    content: `
## Warmth meets precision

Joyful's visual identity lives at the intersection of warm, approachable design and precise, developer-friendly structure. The goal is a tool that feels creative without feeling chaotic, and professional without feeling cold.

## The color system

The palette was chosen to feel energetic but not aggressive:

- **Primary blue (#2f5bff)** — A confident, trustworthy anchor
- **Accent coral (#f23c78)** — Warmth, energy, and calls to action
- **Light indigo (#8fa7ff)** — Softer support tones for backgrounds and borders
- **Gold accent (#f4d66a)** — Highlights, badges, and visual delight
- **Warm light (#f5f2ea)** — The light mode background that reduces eye strain
- **Mid blue (#6387ff)** — Hover states and interactive elements

## Typography

We use **Inter** for UI text and **JetBrains Mono** for code:

- Inter provides excellent readability at every size, with a neutral-but-friendly character
- JetBrains Mono includes coding ligatures and clear punctuation for code editing
- Headings use tighter tracking for a modern, editorial feel
- Body text stays at comfortable leading (1.6-1.7) for extended reading

## Spacing and rhythm

Consistent spacing creates a calm, predictable layout:

- **4px grid** — All spacing values are multiples of 4
- **Section breathing room** — Major sections get 4-8rem of vertical padding
- **Card padding** — Internal card padding follows a 16/20/24px scale
- **Content width** — Max-width of 72rem (1152px) for reading comfort

## Motion and interaction

Animations should feel natural and purposeful:

- Subtle entrance animations (fade + translate) guide attention
- Hover states use gentle scale transforms (1.02-1.05x)
- Page transitions are fast (200-300ms) to avoid feeling sluggish
- Micro-interactions provide feedback without being distracting

## The result

A design system where marketing pages, docs, templates, and the builder itself all feel like they belong to the same product. Consistency across surfaces builds trust — and trust makes people want to build with you.
    `.trim(),
    category: 'Design',
    tags: ['Design', 'Brand', 'Philosophy', 'Visual'],
    author: 'Joyful Team',
    authorRole: 'Design',
    publishedAt: '2026-04-15',
    readTime: 6,
    featured: false,
  },
];

export const blogCategories = ['All', 'Product', 'Guides', 'Engineering', 'Design'] as const;

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

interface ScoredPost extends BlogPost {
  _score: number;
}

export function getRelatedPosts(current: BlogPost, count = 3): BlogPost[] {
  return blogPosts
    .filter((post) => post.slug !== current.slug)
    .map((post): ScoredPost => ({
      ...post,
      _score:
        (post.category === current.category ? 2 : 0) +
        post.tags.filter((tag) => current.tags.includes(tag)).length,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, count);
}
