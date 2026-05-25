const fs = require('fs');

function replaceAll(file, map) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  for (const [from, to] of Object.entries(map)) {
    content = content.replaceAll(from, to);
  }
  fs.writeFileSync(file, content);
}

replaceAll('app/(marketing)/blog/[slug]/page.tsx', {
  '@/data/blog': '@/data/joyful/blog',
  '@/types': '@/lib/types',
  'export default function ': "import { useParams } from 'next/navigation';\nexport default function ",
  'useParams()': 'useParams() as any'
});

replaceAll('app/(marketing)/blog/page.tsx', {
  '@/data/blog': '@/data/joyful/blog',
  '@/types': '@/lib/types'
});

replaceAll('app/(marketing)/[slug]/page.tsx', {
  '@/pages/site/sitePageContent': './sitePageContent',
  '@/types': '@/lib/types'
});

replaceAll('app/(marketing)/docs/page.tsx', {
  '@/hooks/useThemeSetting': '@/hooks/joyful/useThemeSetting'
});

replaceAll('components/joyful/ui/TypingCycle.tsx', {
  '@/hooks/useTypingCycle': '@/hooks/joyful/useTypingCycle'
});

replaceAll('app/(app)/settings/page.tsx', {
  '@/types': '@/lib/types',
  '@/services/': '@/lib/services/',
  'export default function': "import { usePathname } from 'next/navigation';\nexport default function"
});

console.log('Fixed deps');
