import {
  ArrowUp,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  FileCode2,
  Globe2,
  LayoutDashboard,
  Menu,
  Link2,
  Moon,
  Paperclip,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserCircle2,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { MarketingFooter } from '@/components/marketing/MarketingChrome';

type DocTab = 'Introduction' | 'Features' | 'Integrations' | 'Tips & Tricks' | 'Changelog';

type DocSection = {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
};

type DocCard = {
  icon: typeof Sparkles;
  title: string;
  body: string;
};

type DocArticle = {
  id: string;
  label: string;
  icon: typeof BookOpen;
  eyebrow: string;
  title: string;
  summary: string;
  heroBadge: string;
  stats: Array<{ value: string; label: string }>;
  cards: DocCard[];
  sections: DocSection[];
  related: string[];
};

type DocGroup = {
  title: string;
  items: DocArticle[];
};

type AssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const docTabs: DocTab[] = ['Introduction', 'Features', 'Integrations', 'Tips & Tricks', 'Changelog'];

const docsByTab: Record<DocTab, DocGroup[]> = {
  Introduction: [
    {
      title: 'Getting started',
      items: [
        {
          id: 'welcome',
          label: 'Welcome to Joyful',
          icon: BookOpen,
          eyebrow: 'Getting started',
          title: 'Welcome to Joyful',
          summary:
            'Joyful is a local-first AI website builder for planning, generating, editing, previewing, and exporting polished web pages. It combines fast prompting with real code control, so teams can move quickly without losing the ability to refine the final output.',
          heroBadge: 'Start here',
          stats: [
            { value: 'Local-first', label: 'workspace flow' },
            { value: 'HTML/CSS/JS', label: 'editable output' },
            { value: '1 calm loop', label: 'prompt to export' },
          ],
          cards: [
            {
              icon: Sparkles,
              title: 'Why use Joyful',
              body: 'Move from an idea to a polished first draft in minutes, then refine it with direct control over sections, copy, and code.',
            },
            {
              icon: Building2,
              title: 'Who it is for',
              body: 'Founders, marketers, indie builders, agencies, and internal teams who need speed without surrendering structure.',
            },
            {
              icon: FileCode2,
              title: 'What you can build',
              body: 'Marketing sites, launch pages, docs portals, lightweight product sites, editorial layouts, and internal demos.',
            },
            {
              icon: ShieldCheck,
              title: 'Why it feels safer',
              body: 'Projects can stay local while you iterate, preview, and export, which keeps the core website-building loop closer to you.',
            },
          ],
          sections: [
            {
              id: 'why-use-joyful',
              title: 'Why use Joyful',
              body:
                'Joyful is designed for people who want the momentum of AI-assisted building without the frustration of a black-box site generator. You can prompt the first structure, inspect the files, improve sections directly, and export something real.',
              bullets: [
                'Generate a usable first pass from natural language',
                'Keep direct access to the HTML, CSS, and JavaScript',
                'Preview responsive layouts before you export',
              ],
            },
            {
              id: 'who-joyful-is-for',
              title: 'Who Joyful is for',
              body:
                'It fits solo builders and small teams especially well because it shortens the start of the process while keeping enough control for hand-tuned refinement later.',
              bullets: [
                'Founders who need a launch page quickly',
                'Marketers who want campaign pages without waiting on a full front-end cycle',
                'Design-minded builders who still want to tune the output manually',
              ],
            },
            {
              id: 'what-you-can-build',
              title: 'What you can build with Joyful',
              body:
                'The strongest use cases are content-forward websites where layout, hierarchy, copy, and polish matter. Joyful gives you a fast route to those outcomes without trapping you in a proprietary format.',
              bullets: [
                'SaaS and startup homepages',
                'Documentation and support portals',
                'Brand launches, waitlists, and product announcements',
              ],
            },
            {
              id: 'security-privacy-and-compliance',
              title: 'Security, privacy, and compliance',
              body:
                'Because Joyful centers a local-first workflow, teams can prototype with more visibility into what exists, what is stored, and what gets exported. That helps reduce ambiguity early in the build process.',
            },
            {
              id: 'how-joyful-fits',
              title: 'How Joyful fits into your workflow',
              body:
                'Use Joyful when you want to accelerate a website project from blank page to polished draft. After that, keep iterating inside Joyful or export the static files into your normal deployment or review flow.',
            },
          ],
          related: ['Create an account', 'Prompting best practices', 'Quick start', 'Free forever'],
        },
        {
          id: 'create-account',
          label: 'Create an account',
          icon: UserCircle2,
          eyebrow: 'Getting started',
          title: 'Create an account',
          summary:
            'Accounts make it easier to keep your workspace settings, access protected areas, and prepare Joyful for collaboration-oriented flows. Joyful is still fully free to use, so account creation is about convenience and continuity rather than unlocking a paid tier.',
          heroBadge: 'Accounts',
          stats: [
            { value: 'Fast', label: 'setup experience' },
            { value: 'Optional', label: 'for local use' },
            { value: 'Free', label: 'no paid unlock' },
          ],
          cards: [
            { icon: UserCircle2, title: 'Simple onboarding', body: 'Sign up only when you need access to account-level surfaces or collaborative paths.' },
            { icon: ShieldCheck, title: 'Clear boundary', body: 'Account concerns stay separate from the local document-building loop, which keeps the product easier to reason about.' },
            { icon: Briefcase, title: 'Workspace context', body: 'Accounts help prepare for richer project management and shared operational settings later on.' },
            { icon: Zap, title: 'Start quickly', body: 'Even with auth available, the product direction keeps the initial path low-friction and easy to understand.' },
          ],
          sections: [
            {
              id: 'when-to-create-an-account',
              title: 'When to create an account',
              body: 'Create an account when you want persistent identity, access to member-facing areas, or a clearer route into collaboration and organizational features.',
            },
            {
              id: 'what-you-need',
              title: 'What you need',
              body: 'A basic email/password flow is enough for most onboarding. Keep the experience short and remove anything that slows down the first project moment.',
            },
            {
              id: 'best-practices',
              title: 'Best practices',
              body: 'Show the value of the account before asking for too much information. Users should understand what changes after sign-up and what stays local-first.',
            },
          ],
          related: ['Welcome to Joyful', 'Free forever', 'Quick start'],
        },
        {
          id: 'plans-credits',
          label: 'Free forever',
          icon: CreditCard,
          eyebrow: 'Getting started',
          title: 'Joyful is fully free',
          summary:
            'Joyful is fully free. No confusing paid tiers, no hidden upgrade wall, and no unclear pricing mechanics interrupt the local-first website workflow.',
          heroBadge: 'Free forever',
          stats: [
            { value: '$0', label: 'price to use Joyful' },
            { value: 'Free', label: 'core builder access' },
            { value: 'Simple', label: 'no billing confusion' },
          ],
          cards: [
            { icon: CreditCard, title: 'No paid tier messaging', body: 'Joyful is free to use, so this page keeps the promise direct instead of turning into a pricing comparison.' },
            { icon: Sparkles, title: 'Free by default', body: 'People can focus on building pages, learning the workflow, and exporting results without thinking about subscriptions.' },
            { icon: ShieldCheck, title: 'No surprise paywall', body: 'The core builder experience is not waiting behind an upgrade prompt.' },
            { icon: Building2, title: 'Simple expectations', body: 'Explain the free model in plain language so teams know what they can rely on from the start.' },
          ],
          sections: [
            { id: 'what-is-free', title: 'What is free', body: 'Joyful is meant to feel open and approachable. The core experience of generating, editing, previewing, and exporting website projects is fully free.' },
            { id: 'how-to-explain-it', title: 'How to explain it', body: 'Keep the wording direct. Say that Joyful is free, local-first, and focused on practical website building. Avoid plan tables or billing-heavy language when it is not needed.' },
            { id: 'recommended-approach', title: 'Recommended approach', body: 'Reinforce trust with simple messaging: no confusing pricing path, no hidden upgrade story, and no need to decode whether the builder is actually usable for free.' },
          ],
          related: ['Create an account', 'Welcome to Joyful'],
        },
      ],
    },
    {
      title: 'Joyful workspace',
      items: [
        {
          id: 'workspace',
          label: 'Workspace',
          icon: Briefcase,
          eyebrow: 'Workspace',
          title: 'Understand the Joyful workspace',
          summary:
            'The workspace is where prompts, files, previews, and project structure come together. It is intentionally designed to keep creation, inspection, and refinement inside one focused environment.',
          heroBadge: 'Workspace',
          stats: [
            { value: '1 place', label: 'for prompt + code' },
            { value: 'Live', label: 'preview loop' },
            { value: 'Editable', label: 'source files' },
          ],
          cards: [
            { icon: Workflow, title: 'One working surface', body: 'Prompt, inspect, and tune without bouncing between multiple disjoint tools.' },
            { icon: FileCode2, title: 'Real files', body: 'The workspace keeps the actual site files close at hand so refinement stays grounded.' },
            { icon: Globe2, title: 'Preview behavior', body: 'Responsive checks and quick review are part of the normal workflow, not a separate final step.' },
            { icon: Sparkles, title: 'AI where useful', body: 'The AI layer accelerates the build, but the workspace still belongs to the builder.' },
          ],
          sections: [
            { id: 'workspace-overview', title: 'Workspace overview', body: 'The ideal workspace keeps intent, structure, and output visible at the same time.' },
            { id: 'editing-model', title: 'Editing model', body: 'Use prompts when they are faster than manual changes, then drop directly into files when precision matters more.' },
            { id: 'preview-model', title: 'Preview model', body: 'Preview early and often so layout and responsiveness can evolve with the rest of the page instead of becoming cleanup work.' },
          ],
          related: ['Admin settings', 'People', 'Quick start'],
        },
      ],
    },
  ],
  Features: [
    {
      title: 'Core features',
      items: [
        {
          id: 'prompting-best-practices',
          label: 'Prompting best practices',
          icon: Bot,
          eyebrow: 'Features',
          title: 'Prompting best practices',
          summary:
            'Better prompting does not mean longer prompting. Joyful works best when prompts are specific about outcome, tone, structure, and audience, while staying simple enough to iterate on quickly.',
          heroBadge: 'Prompting',
          stats: [
            { value: 'Specific', label: 'beats longer' },
            { value: 'Iterative', label: 'refinement style' },
            { value: 'Visual', label: 'feedback loop' },
          ],
          cards: [
            { icon: Bot, title: 'Describe the outcome', body: 'Start with what the page should do, who it is for, and how it should feel.' },
            { icon: Sparkles, title: 'Name the sections', body: 'If you know you want pricing, FAQ, testimonials, or integrations, say so up front.' },
            { icon: FileCode2, title: 'Refine with intent', body: 'Once the draft exists, ask for a specific improvement instead of a broad rewrite.' },
            { icon: LayoutDashboard, title: 'Use examples carefully', body: 'Reference layouts can help, but define what to borrow and what to avoid.' },
          ],
          sections: [
            { id: 'strong-first-prompts', title: 'Strong first prompts', body: 'Good first prompts balance product context, audience, page goal, visual tone, and a short list of must-have sections.' },
            { id: 'revision-prompts', title: 'Revision prompts', body: 'For improvements, be concrete. Ask for clearer hierarchy, better mobile spacing, shorter copy, or a stronger call to action.' },
            { id: 'what-to-avoid', title: 'What to avoid', body: 'Avoid stacking too many unrelated directions into one prompt. It is usually better to refine one dimension at a time.' },
          ],
          related: ['Quick start', 'Welcome to Joyful'],
        },
        {
          id: 'quick-start',
          label: 'Quick start',
          icon: ChevronRight,
          eyebrow: 'Features',
          title: 'Quick start',
          summary:
            'The fastest path through Joyful is simple: start a project, describe the page, review the draft, tune the design, and export once it feels ready. The best experience keeps those steps short and visible.',
          heroBadge: 'Fast path',
          stats: [
            { value: '5 steps', label: 'to first export' },
            { value: 'Short', label: 'feedback cycles' },
            { value: 'Practical', label: 'workflow emphasis' },
          ],
          cards: [
            { icon: Sparkles, title: 'Create a project', body: 'Start from a blank idea or a template, whichever gets you moving faster.' },
            { icon: Bot, title: 'Generate the draft', body: 'Use a clear prompt with the page type, audience, and must-have sections.' },
            { icon: FileCode2, title: 'Open the files', body: 'Inspect the generated structure so you know what you are refining.' },
            { icon: Globe2, title: 'Preview and ship', body: 'Check the responsive behavior, then export once the page is ready.' },
          ],
          sections: [
            { id: 'create-a-project', title: 'Create a project', body: 'Choose the shortest path to momentum. If a template is close, start there. If not, generate from a prompt.' },
            { id: 'review-the-draft', title: 'Review the draft', body: 'A quick first review helps you decide whether to change content, structure, or tone first.' },
            { id: 'refine-before-export', title: 'Refine before export', body: 'Use the preview and editor together to close the gap between a good draft and a shippable page.' },
          ],
          related: ['Prompting best practices', 'Workspace'],
        },
      ],
    },
  ],
  Integrations: [
    {
      title: 'Connected workflows',
      items: [
        {
          id: 'integrations-overview',
          label: 'Integrations overview',
          icon: Link2,
          eyebrow: 'Integrations',
          title: 'Integrations overview',
          summary:
            'Integrations matter most when they reduce friction around content, design references, and deployment. Joyful frames integrations as workflow helpers, not just a logo wall.',
          heroBadge: 'Connected tools',
          stats: [
            { value: 'Reference', label: 'inputs supported' },
            { value: 'Export', label: 'deployment friendly' },
            { value: 'Flexible', label: 'handoff options' },
          ],
          cards: [
            { icon: Link2, title: 'Bring in context', body: 'References, examples, and supporting materials help Joyful produce more relevant drafts.' },
            { icon: Globe2, title: 'Prepare for deployment', body: 'Static exports should fit cleanly into normal hosting and handoff flows.' },
            { icon: Workflow, title: 'Reduce switching', body: 'The best integrations support the build without making the product feel fragmented.' },
            { icon: Building2, title: 'Team compatibility', body: 'Connected workflows should feel usable for solo builders and structured teams alike.' },
          ],
          sections: [
            { id: 'integration-principles', title: 'Integration principles', body: 'Every integration should either improve the draft quality, reduce a manual step, or simplify the handoff.' },
            { id: 'reference-materials', title: 'Reference materials', body: 'Imported context is most useful when it sharpens the brief rather than overwhelming it.' },
            { id: 'deployment-fit', title: 'Deployment fit', body: 'Static website exports are easiest to adopt when they stay portable and predictable.' },
          ],
          related: ['Workspace', 'Quick start'],
        },
      ],
    },
  ],
  'Tips & Tricks': [
    {
      title: 'Practical improvements',
      items: [
        {
          id: 'making-pages-better',
          label: 'Make pages sharper',
          icon: Zap,
          eyebrow: 'Tips & tricks',
          title: 'Make pages sharper',
          summary:
            'The fastest way to improve a Joyful page is to focus on one dimension at a time: hierarchy, spacing, copy, contrast, or mobile behavior. Small focused requests usually produce better results than giant rewrite prompts.',
          heroBadge: 'Refinement',
          stats: [
            { value: '1 dimension', label: 'per revision' },
            { value: 'Better', label: 'mobile by default' },
            { value: 'Sharper', label: 'section hierarchy' },
          ],
          cards: [
            { icon: Sparkles, title: 'Fix the hierarchy first', body: 'If a page feels weak, clarify the hero, section order, and calls to action before polishing details.' },
            { icon: Bot, title: 'Prompt for one change', body: 'Ask for a stronger CTA, cleaner pricing cards, or a simpler mobile nav rather than everything at once.' },
            { icon: Globe2, title: 'Check mobile early', body: 'Many layout issues are easier to solve while the structure is still evolving.' },
            { icon: FileCode2, title: 'Use manual edits when needed', body: 'Some improvements are simply faster in code once the direction is clear.' },
          ],
          sections: [
            { id: 'improve-hierarchy', title: 'Improve hierarchy', body: 'Make sure the page answers what it is, who it is for, and what to do next before anything else.' },
            { id: 'trim-copy', title: 'Trim copy', body: 'Most early drafts benefit from shorter sentences, fewer repeated claims, and clearer subheads.' },
            { id: 'strengthen-mobile', title: 'Strengthen mobile', body: 'Touch targets, spacing, and vertical rhythm are often the highest-value improvements after structure.' },
          ],
          related: ['Prompting best practices', 'Quick start'],
        },
      ],
    },
  ],
  Changelog: [
    {
      title: 'Recent updates',
      items: [
        {
          id: 'latest-updates',
          label: 'Latest updates',
          icon: Workflow,
          eyebrow: 'Changelog',
          title: 'Latest updates',
          summary:
            'Use the changelog to explain meaningful product improvements with short context, not just version noise. The best changelog helps users understand what got better and why they might care.',
          heroBadge: 'Recent changes',
          stats: [
            { value: 'Clear', label: 'update framing' },
            { value: 'Short', label: 'release notes' },
            { value: 'Useful', label: 'user impact' },
          ],
          cards: [
            { icon: Sparkles, title: 'Cleaner docs UI', body: 'The documentation area now behaves more like a real product knowledge surface than a placeholder page.' },
            { icon: Copy, title: 'Working copy button', body: 'Readers can copy a direct article link from the header without dead UI.' },
            { icon: BookOpen, title: 'Richer article states', body: 'Tabs and sidebar navigation now drive real content instead of a single static page.' },
            { icon: ShieldCheck, title: 'Better structure', body: 'The page is easier to scan across desktop and smaller screens with clearer content grouping.' },
          ],
          sections: [
            { id: 'this-release', title: 'This release', body: 'Improved the docs experience with richer navigation, better visual hierarchy, and article-level content depth.' },
            { id: 'why-it-matters', title: 'Why it matters', body: 'The docs now look and behave more like a polished product surface, which makes them more credible and more useful.' },
            { id: 'what-is-next', title: 'What is next', body: 'The same pattern can expand into real per-page routes or connected search later without throwing away the upgraded UI.' },
          ],
          related: ['Welcome to Joyful', 'Integrations overview'],
        },
      ],
    },
  ],
};

const assistantPrompts: Record<string, string[]> = {
  welcome: [
    'What can I build with Joyful?',
    'How does the local-first workflow help?',
    'What should I read next?',
  ],
  'create-account': [
    'Do I need an account to use Joyful?',
    'What changes after signing in?',
    'Can I still work locally first?',
  ],
  'plans-credits': [
    'Is Joyful really free?',
    'What is included at $0?',
    'Is there any hidden paywall?',
  ],
  workspace: [
    'How should I use the workspace?',
    'When should I edit files manually?',
    'How do previews fit into the flow?',
  ],
  'prompting-best-practices': [
    'What makes a strong first prompt?',
    'How should I ask for revisions?',
    'What mistakes should I avoid?',
  ],
  'quick-start': [
    'What is the fastest way to start?',
    'When should I use a template?',
    'How do I know a page is ready to export?',
  ],
  'integrations-overview': [
    'How do integrations help the workflow?',
    'What kind of references are useful?',
    'How should I think about deployment?',
  ],
  'making-pages-better': [
    'How do I improve hierarchy first?',
    'What should I fix for mobile?',
    'When is manual editing faster?',
  ],
  'latest-updates': [
    'What changed in the docs?',
    'Why does this update matter?',
    'What can improve next?',
  ],
};

const assistantReplies: Record<string, string> = {
  welcome:
    'Joyful is best for moving from idea to polished website quickly. Start with a prompt, refine the structure, preview the result, and export real HTML, CSS, and JavaScript when it feels ready.',
  'create-account':
    'You do not need an account to understand the product direction. Accounts mainly help with identity, saved settings, and collaboration-oriented flows while Joyful stays fully free to use.',
  'plans-credits':
    'Joyful is fully free. The docs now frame that clearly: no paid-tier language, no confusing billing path, and no hidden upgrade story around the core builder experience.',
  workspace:
    'Use the workspace as your main loop: prompt when speed matters, inspect the generated files when precision matters, and preview often so layout decisions stay visible.',
  'prompting-best-practices':
    'The best prompts are specific about audience, page goal, tone, and sections. After generation, use smaller follow-up prompts to improve one thing at a time.',
  'quick-start':
    'The shortest path is usually: create a project, prompt the draft, inspect the structure, improve the page, then export once the layout and mobile behavior feel solid.',
  'integrations-overview':
    'Think of integrations as context and handoff helpers. The best ones either improve draft quality, reduce manual setup, or make export/deployment easier.',
  'making-pages-better':
    'Improve hierarchy before polish. Then trim copy, strengthen spacing, and check mobile early. Most pages get noticeably better from a few focused revisions.',
  'latest-updates':
    'This docs surface now has richer navigation, clearer free-product messaging, and a proper assistant rail so the knowledge experience feels more like a real product.',
};

/** Build a flat searchable index of all articles across all tabs. */
function buildSearchIndex() {
  const index: Array<{ tab: DocTab; article: DocArticle; searchText: string }> = [];
  for (const tab of docTabs) {
    for (const group of docsByTab[tab]) {
      for (const article of group.items) {
        const sectionText = article.sections.map((s) => `${s.title} ${s.body}`).join(' ');
        const searchText = `${article.label} ${article.title} ${article.summary} ${sectionText}`.toLowerCase();
        index.push({ tab, article, searchText });
      }
    }
  }
  return index;
}

const searchIndex = buildSearchIndex();
const flatDocs = searchIndex.map(({ tab, article }) => ({ tab, article }));

function findDocByLabel(label: string) {
  return flatDocs.find(({ article }) => article.label === label || article.title === label);
}

function DocsHeroVisual({ badge }: { badge: string }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#121316] shadow-[0_25px_120px_rgba(0,0,0,0.42)]">
      <div className="relative aspect-[16/9] overflow-hidden rounded-[1.75rem] border border-white/6 bg-[#0d0e12]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.72),transparent_26%),radial-gradient(circle_at_25%_45%,rgba(110,131,255,0.95),transparent_34%),radial-gradient(circle_at_80%_42%,rgba(238,118,214,0.88),transparent_30%),radial-gradient(circle_at_55%_90%,rgba(255,108,61,0.92),transparent_28%),linear-gradient(180deg,#cad8ff_0%,#7191ff_24%,#d172e4_58%,#f14986_80%,#ff7637_100%)]" />
        <div className="absolute left-0 top-0 h-full w-[17%] border-r border-black/10 bg-[#f3f0e8]/95">
          <div className="px-3 py-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ff7a45]" />
              <div className="h-3 w-3 rounded-full bg-[#e34ca0]" />
              <div className="h-3 w-3 rounded-full bg-[#6286ff]" />
            </div>
            <div className="mb-3 h-8 rounded-lg bg-white/80" />
            <div className="space-y-2">
              {Array.from({ length: 9 }).map((_, index) => (
                <div
                  key={index}
                  className={`h-4 rounded-full ${index === 1 ? 'bg-[#d9d3c7]' : 'bg-[#e9e3d8]'}`}
                  style={{ width: `${78 - index * 5}%` }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="absolute left-1/2 top-[48%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-[1.4rem] border border-black/10 bg-[#f4f0e7]/96 p-4 shadow-[0_18px_60px_rgba(30,20,35,0.18)]">
          <div className="inline-flex rounded-full bg-[#6286ff]/15 px-3 py-1 text-xs font-semibold text-[#516ef0]">
            {badge}
          </div>
          <div className="mt-4 h-3.5 w-40 rounded-full bg-[#ded7ca]" />
          <div className="mt-4 flex items-center justify-between">
            <div className="h-3 w-28 rounded-full bg-[#d8d0c2]" />
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded-full bg-[#cbc2b5]" />
              <div className="h-7 w-7 rounded-full bg-[#89857f]" />
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/8 bg-[#1c1a1f] p-4">
        <div className="flex items-center gap-3 rounded-[1.45rem] border border-white/14 bg-[#211f24] px-5 py-4 text-sm text-white/45">
          <span className="truncate">Ask a question about this article...</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-white/35">⌘I</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#294577] text-white">↑</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DocTab>('Introduction');
  const initialDocIdRef = useRef<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string>('welcome');
  const [copied, setCopied] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const mainRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Scroll tracking state
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const activeGroups = docsByTab[activeTab];
  const activeDoc = useMemo(() => {
    const allItems = activeGroups.flatMap((group) => group.items);
    return allItems.find((item) => item.id === activeDocId) ?? allItems[0];
  }, [activeDocId, activeGroups]);

  // Search results
  const searchResults = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    const query = searchQuery.toLowerCase().trim();
    return searchIndex
      .filter((entry) => entry.searchText.includes(query))
      .slice(0, 8)
      .map((entry) => ({
        tab: entry.tab,
        id: entry.article.id,
        label: entry.article.label,
        eyebrow: entry.article.eyebrow,
        summary: entry.article.summary.slice(0, 100),
      }));
  }, [searchQuery]);

  // Keyboard shortcut for search (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
        setAssistantOpen(false);
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get('tab') as DocTab | null;
    const pageFromUrl = params.get('page');

    if (initialDocIdRef.current) return;

    if (tabFromUrl && docTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
      const firstInTab = docsByTab[tabFromUrl].flatMap((group) => group.items)[0];
      setActiveDocId(pageFromUrl ?? firstInTab.id);
      initialDocIdRef.current = pageFromUrl ?? firstInTab.id;
      return;
    }

    initialDocIdRef.current = 'welcome';
  }, []);

  useEffect(() => {
    const allItems = activeGroups.flatMap((group) => group.items);
    if (!allItems.some((item) => item.id === activeDocId)) {
      setActiveDocId(allItems[0].id);
    }
  }, [activeDocId, activeGroups]);

  useEffect(() => {
    if (!activeDoc) return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    params.set('page', activeDoc.id);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', nextUrl);
  }, [activeDoc, activeTab]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // Scroll tracking with IntersectionObserver
  useEffect(() => {
    const sectionElements = activeDoc.sections
      .map((s) => sectionRefs.current[s.id])
      .filter(Boolean) as HTMLElement[];

    if (sectionElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0.1 },
    );

    for (const el of sectionElements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [activeDoc.sections]);

  // Reset section tracking when article changes
  useEffect(() => {
    setActiveSectionId(activeDoc.sections[0]?.id ?? null);
  }, [activeDoc.sections]);

  const handleCopy = useCallback(async () => {
    if (!activeDoc) return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    params.set('page', activeDoc.id);
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
    }
  }, [activeDoc, activeTab]);

  const handleTabChange = (tab: DocTab) => {
    setActiveTab(tab);
    setActiveDocId(docsByTab[tab].flatMap((group) => group.items)[0].id);
    setMobileSidebarOpen(false);
  };

  const scrollToSection = (sectionId: string) => {
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openAssistant = () => {
    setAssistantOpen(true);
  };

  const handleSearchSelect = (tab: DocTab, articleId: string) => {
    setActiveTab(tab);
    setActiveDocId(articleId);
    setSearchQuery('');
    setSearchOpen(false);
  };

  const handleRelatedSelect = (label: string) => {
    const match = findDocByLabel(label);
    if (!match) return;
    setActiveTab(match.tab);
    setActiveDocId(match.article.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendAssistantMessage = useCallback(() => {
    const trimmed = assistantInput.trim();
    if (!trimmed) return;

    const reply = assistantReplies[activeDoc.id] ?? assistantReplies.welcome;
    setAssistantMessages((prev) => [
      ...prev,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: reply },
    ]);
    setAssistantInput('');
  }, [assistantInput, activeDoc.id]);

  const handleSuggestedQuestion = useCallback(
    (question: string) => {
      const reply = assistantReplies[activeDoc.id] ?? assistantReplies.welcome;
      setAssistantMessages((prev) => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: reply },
      ]);
    },
    [activeDoc.id],
  );

  const handleClearAssistant = useCallback(() => {
    setAssistantMessages([]);
  }, []);

  const promptSuggestions = assistantPrompts[activeDoc.id] ?? assistantPrompts.welcome;
  const currentDocIndex = flatDocs.findIndex(({ article }) => article.id === activeDoc.id);
  const previousDoc = currentDocIndex > 0 ? flatDocs[currentDocIndex - 1] : null;
  const nextDoc = currentDocIndex >= 0 && currentDocIndex < flatDocs.length - 1 ? flatDocs[currentDocIndex + 1] : null;
  const articleNav = (
    <div className="rounded-[1.5rem] border border-white/8 bg-[#0d0f14] p-5 xl:border-0 xl:bg-transparent xl:p-0">
      <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/35 xl:hidden">{activeTab}</div>
      {activeGroups.map((group) => (
        <div key={group.title} className="mb-10 last:mb-0">
          <h2 className="mb-4 text-base font-semibold text-white/90 xl:mb-5 xl:text-[1.05rem]">{group.title}</h2>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeDoc.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveDocId(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-[0.95rem] transition-all duration-200 xl:text-[1.02rem] ${
                    isActive
                      ? 'bg-[#101a2b] text-[#59a4ff] shadow-[inset_0_0_0_1px_rgba(89,164,255,0.12)]'
                      : 'text-white/50 hover:bg-white/[0.03] hover:text-white/85'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-none" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#090a0d] text-white">
      <div className="mx-auto min-h-screen max-w-[2048px] rounded-b-[2rem] border-x border-b border-white/8 bg-[#090a0d] shadow-[0_30px_120px_rgba(0,0,0,0.32)]">
        {/* Header */}
        <header className="border-b border-white/8 px-5 py-4 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#0e1015] text-white/75 transition-colors hover:bg-white/[0.05] hover:text-white xl:hidden"
                aria-label="Open docs navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <button onClick={() => navigate('/')} className="flex items-center gap-3 transition-opacity hover:opacity-90">
                <BrandLogo className="h-11 w-11" />
                <span className="text-[2.35rem] font-bold leading-none tracking-[-0.05em] text-white sm:text-[3rem]">Joyful</span>
              </button>
              <button
                type="button"
                onClick={openAssistant}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#0e1015] text-white/82 transition-colors hover:bg-white/[0.05] xl:hidden"
                aria-label="Open AI assistant"
              >
                <Sparkles className="h-5 w-5" />
              </button>
            </div>

            {/* Search bar */}
            <div className="relative flex flex-1 flex-col gap-3 lg:max-w-[760px] lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setSearchOpen(false), 200)}
                  placeholder="Search docs, setup, prompts, exports..."
                  className="h-14 w-full rounded-2xl border border-white/10 bg-[#0e1015] pl-12 pr-20 text-base text-white outline-none transition-colors placeholder:text-white/40 focus:border-[#3a96ff]/40 focus:bg-[#0e1015] sm:text-lg"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/35 sm:block">⌘K</span>

                {/* Search results dropdown */}
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0e1015] shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.tab}-${result.id}`}
                        type="button"
                        onMouseDown={() => handleSearchSelect(result.tab, result.id)}
                        className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.06]"
                      >
                        <Search className="mt-0.5 h-4 w-4 flex-none text-white/30" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white">{result.label}</div>
                          <div className="mt-0.5 text-xs text-white/40">{result.eyebrow} &middot; {result.tab}</div>
                          <div className="mt-1 truncate text-xs text-white/30">{result.summary}...</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results */}
                {searchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0e1015] px-5 py-6 text-center shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
                    <p className="text-sm text-white/40">No results for &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={openAssistant}
                className="hidden h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#0e1015] px-5 text-base font-medium text-white/82 transition-colors hover:bg-white/[0.05] xl:inline-flex"
              >
                <Sparkles className="h-4 w-4" />
                Ask AI
              </button>
            </div>

            <div className="flex items-center gap-5 text-sm text-white/68 sm:gap-6 sm:text-base">
              <button onClick={() => navigate('/support')} className="transition-colors hover:text-white">Support</button>
              <button onClick={() => navigate('/blog')} className="transition-colors hover:text-white">Blog</button>
              <button aria-label="Toggle theme" className="transition-colors hover:text-white">
                <Moon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-white/8 px-5 sm:px-8">
          <nav className="scrollbar-none flex gap-6 overflow-x-auto sm:gap-8">
            {docTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={`border-b-2 pb-4 pt-5 text-[0.98rem] font-medium whitespace-nowrap transition-colors sm:text-[1.05rem] ${
                  activeTab === tab
                    ? 'border-[#3a96ff] text-white'
                    : 'border-transparent text-white/52 hover:text-white/80'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 xl:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close docs navigation"
            />
            <aside className="absolute left-0 top-0 flex h-full w-[min(22rem,88vw)] flex-col border-r border-white/10 bg-[#090a0d] shadow-[24px_0_80px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <div className="flex items-center gap-3 text-base font-semibold text-white">
                  <BookOpen className="h-4 w-4 text-[#4f9fff]" />
                  Docs
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
                  aria-label="Close docs navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-5">{articleNav}</div>
            </aside>
          </div>
        )}

        {/* Main grid */}
        <div className="grid gap-8 px-5 py-8 lg:px-8 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_280px] xl:gap-8 2xl:gap-10 xl:py-10">
          {/* Left sidebar - article nav */}
          <aside className="hidden xl:block">
            <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">{articleNav}</div>
          </aside>

          {/* Main content */}
          <main ref={mainRef} className="min-w-0">
            <div className="rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,#0e1015_0%,#0a0c10_100%)] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.28)] sm:p-8">
              <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-white/38">
                <button type="button" onClick={() => navigate('/docs')} className="transition-colors hover:text-white">Docs</button>
                <ChevronRight className="h-3.5 w-3.5" />
                <button type="button" onClick={() => handleTabChange(activeTab)} className="transition-colors hover:text-white">{activeTab}</button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-white/65">{activeDoc.label}</span>
              </div>

              <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#348fff]/20 bg-[#13233d] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#72b2ff]">
                    {activeDoc.heroBadge}
                  </div>
                  <p className="mt-4 text-base font-semibold text-[#4f9fff]">{activeDoc.eyebrow}</p>
                  <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] text-white sm:text-5xl">
                    {activeDoc.title}
                  </h1>
                  <p className="mt-5 max-w-4xl text-lg leading-[1.8] text-white/60 sm:text-[1.15rem]">
                    {activeDoc.summary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex shrink-0 items-center gap-2 self-start whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-medium leading-none transition-all sm:px-5 sm:text-base ${
                    copied
                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-white/10 bg-[#0d0f14] text-white/76 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied link' : 'Copy page link'}
                </button>
              </div>

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                {activeDoc.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="group relative overflow-hidden rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5 transition-all duration-300 hover:border-white/16 hover:bg-white/[0.05]"
                  >
                    <div className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-[#6387ff]/10 transition-transform group-hover:scale-150" />
                    <div className="relative text-2xl font-bold tracking-[-0.03em] text-white transition-colors group-hover:text-[#72b2ff] sm:text-3xl">{stat.value}</div>
                    <div className="mt-4 text-sm font-medium text-white/48">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Hero visual */}
              <div className="mt-8">
                <DocsHeroVisual badge={activeDoc.heroBadge} />
              </div>

              {/* Feature cards */}
              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                {activeDoc.cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <section
                      key={card.title}
                      className="group rounded-[1.5rem] border border-white/8 bg-[#0d0f14] p-6 transition-all duration-300 hover:border-white/16 hover:shadow-[0_8px_40px_rgba(58,150,255,0.08)]"
                    >
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#13233d] text-[#5ca8ff] transition-all duration-300 group-hover:bg-[#1a3055] group-hover:text-[#72b2ff]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{card.title}</h2>
                      <p className="mt-3 text-[1.02rem] leading-8 text-white/56">{card.body}</p>
                    </section>
                  );
                })}
              </div>
            </div>

            {/* Sections */}
            <div className="mt-10 space-y-6">
              {activeDoc.sections.map((section, idx) => (
                <section
                  key={section.id}
                  id={section.id}
                  ref={(node) => {
                    sectionRefs.current[section.id] = node;
                  }}
                  className="relative rounded-[1.5rem] border border-white/8 bg-[#0d0f14] p-6 transition-all duration-300 hover:border-white/14 sm:p-8"
                >
                  <div className="absolute -left-3 top-8 hidden h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#0d0f14] text-xs font-bold text-white/40 sm:flex">
                    {idx + 1}
                  </div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{section.title}</h2>
                  <p className="mt-4 text-[1.05rem] leading-8 text-white/58">{section.body}</p>
                  {section.bullets && (
                    <ul className="mt-6 space-y-3">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-[1rem] leading-7 text-white/54">
                          <span className="mt-2.5 h-2 w-2 flex-none rounded-full bg-[#5aa5ff]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            {/* Related pages */}
            <section className="mt-8 rounded-[1.5rem] border border-white/8 bg-[#0d0f14] p-6 sm:p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#72b2ff]">Keep reading</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Related pages</h2>
                </div>
                <button
                  type="button"
                  onClick={openAssistant}
                  className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white/62 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  Ask about this page
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {activeDoc.related.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleRelatedSelect(item)}
                    className="group flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-4 text-left text-white/68 transition-all duration-200 hover:border-white/16 hover:bg-white/[0.05] hover:text-white"
                  >
                    <span>{item}</span>
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-6 grid gap-3 md:grid-cols-2">
              {previousDoc && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(previousDoc.tab);
                    setActiveDocId(previousDoc.article.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group rounded-[1.5rem] border border-white/8 bg-[#0d0f14] p-5 text-left transition-all hover:border-white/16 hover:bg-white/[0.04]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/32">Previous</p>
                  <div className="mt-3 flex items-center gap-3 text-white/72 group-hover:text-white">
                    <ChevronRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
                    <span className="font-medium">{previousDoc.article.label}</span>
                  </div>
                </button>
              )}
              {nextDoc && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(nextDoc.tab);
                    setActiveDocId(nextDoc.article.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group rounded-[1.5rem] border border-white/8 bg-[#0d0f14] p-5 text-left transition-all hover:border-white/16 hover:bg-white/[0.04] md:text-right"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/32">Next</p>
                  <div className="mt-3 flex items-center gap-3 text-white/72 group-hover:text-white md:justify-end">
                    <span className="font-medium">{nextDoc.article.label}</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              )}
            </section>

            <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-[#3a96ff]/20 bg-[linear-gradient(135deg,rgba(19,35,61,0.92),rgba(13,15,20,0.98))] p-6 sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#72b2ff]">Ready to build</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Turn this guidance into a real page.</h2>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-white/58">
                    Open the builder, start from a prompt, and keep the docs nearby while you shape the first draft.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/builder')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#0d0f14] transition-transform hover:scale-[1.02]"
                >
                  Open builder
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          </main>

          {/* Right sidebar - On this page (2xl only) */}
          <aside className="hidden 2xl:block">
            <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#0d0f14] p-5">
              <div className="mb-6 flex items-center gap-3 text-white/72">
                <BookOpen className="h-4 w-4" />
                <span className="text-base font-medium xl:text-[1.05rem]">On this page</span>
              </div>
              <div className="space-y-3">
                {activeDoc.sections.map((section) => {
                  const isActive = section.id === activeSectionId;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className={`block border-l-2 py-1 pl-3 text-left text-[0.95rem] leading-6 transition-all duration-200 xl:text-[1rem] ${
                        isActive
                          ? 'border-[#3a96ff] text-[#4f9fff]'
                          : 'border-transparent text-white/45 hover:text-white/75'
                      }`}
                    >
                      {section.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Assistant panel */}
          <aside
            id="docs-assistant-panel"
            className={`fixed inset-0 z-50 ${assistantOpen ? 'block' : 'hidden'}`}
            aria-hidden={!assistantOpen}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/58 backdrop-blur-sm"
              onClick={() => setAssistantOpen(false)}
              aria-label="Close AI assistant"
            />
            <div className="absolute bottom-0 left-0 right-0 flex max-h-[86vh] min-h-[560px] flex-col rounded-t-[1.5rem] border border-white/8 bg-[#090b10] shadow-[0_-20px_80px_rgba(0,0,0,0.38)] sm:left-6 sm:right-6 sm:bottom-6 sm:rounded-[1.5rem] xl:left-auto xl:right-6 xl:top-6 xl:bottom-6 xl:w-[410px] xl:max-h-none xl:min-h-0 xl:shadow-[0_24px_100px_rgba(0,0,0,0.45)] 2xl:w-[430px]">
              {/* Assistant header */}
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-[#4f9fff]" />
                  <span className="text-xl font-semibold tracking-[-0.03em] text-white">Assistant</span>
                </div>
                <div className="flex items-center gap-3 text-white/45">
                  <button type="button" className="transition-colors hover:text-white" aria-label="Open in new">
                    <ChevronRight className="h-4 w-4 -rotate-45" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAssistant}
                    className="transition-colors hover:text-white"
                    aria-label="Clear thread"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssistantOpen(false)}
                    className="transition-colors hover:text-white"
                    aria-label="Close assistant"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* On this page - mobile/tablet */}
              <div className="border-b border-white/8 px-5 py-4 xl:hidden">
                <div className="mb-4 flex items-center gap-3 text-white/72">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-base font-medium">On this page</span>
                </div>
                <div className="space-y-2">
                  {activeDoc.sections.map((section) => {
                    const isActive = section.id === activeSectionId;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => scrollToSection(section.id)}
                        className={`block border-l-2 py-1 pl-3 text-left text-sm leading-6 transition-all duration-200 ${
                          isActive
                            ? 'border-[#3a96ff] text-[#4f9fff]'
                            : 'border-transparent text-white/45 hover:text-white/75'
                        }`}
                      >
                        {section.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                {/* Default context message */}
                <div className="flex justify-end">
                  <div className="max-w-[78%] rounded-[1.35rem] bg-white/[0.06] px-4 py-3 text-sm font-medium tracking-[-0.01em] text-white/90">
                    {activeDoc.label}
                  </div>
                </div>

                <div>
                  <div className="max-w-[92%] text-sm leading-7 text-white/62">
                    {assistantReplies[activeDoc.id] ?? assistantReplies.welcome}
                  </div>
                  <div className="mt-4 flex items-center gap-3 text-white/35">
                    <button type="button" className="transition-colors hover:text-white" aria-label="Helpful">
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="transition-colors hover:text-white" aria-label="Not helpful">
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={handleCopy} className="transition-colors hover:text-white" aria-label="Copy">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* User messages */}
                {assistantMessages.map((msg, i) => (
                  <div key={i}>
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[78%] rounded-[1.35rem] bg-white/[0.06] px-4 py-3 text-sm font-medium tracking-[-0.01em] text-white/90">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="max-w-[92%] text-sm leading-7 text-white/62">{msg.content}</div>
                        <div className="mt-4 flex items-center gap-3 text-white/35">
                          <button type="button" className="transition-colors hover:text-white" aria-label="Helpful">
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" className="transition-colors hover:text-white" aria-label="Not helpful">
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={handleCopy} className="transition-colors hover:text-white" aria-label="Copy">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Suggested questions */}
                {assistantMessages.length === 0 && (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/28">
                      Suggested questions
                    </p>
                    <div className="space-y-2">
                      {promptSuggestions.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => handleSuggestedQuestion(prompt)}
                          className="block w-full rounded-xl border border-white/6 bg-white/[0.02] px-4 py-2.5 text-left text-xs leading-5 text-white/55 transition-all duration-200 hover:border-white/14 hover:bg-white/[0.05] hover:text-white/80"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className="border-t border-white/8 p-4">
                <div className="rounded-[1.4rem] border border-[#2e8eff]/20 bg-[#090b10] p-3 shadow-[0_0_0_1px_rgba(46,142,255,0.08)] transition-all duration-200 focus-within:border-[#2e8eff]/40">
                  <textarea
                    value={assistantInput}
                    onChange={(event) => setAssistantInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSendAssistantMessage();
                      }
                    }}
                    placeholder="Ask a question..."
                    rows={2}
                    className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                  />
                  <div className="mt-2 flex items-center justify-between text-white/35">
                    <button type="button" className="transition-colors hover:text-white" aria-label="Attach file">
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSendAssistantMessage}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3272ff] text-white transition-transform hover:scale-105"
                      aria-label="Send message"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <div className="dark">
        <MarketingFooter />
      </div>
    </div>
  );
}
