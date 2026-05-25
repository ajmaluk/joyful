const fs = require('fs');

function replaceAll(file, map) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  for (const [from, to] of Object.entries(map)) {
    content = content.replaceAll(from, to);
  }
  fs.writeFileSync(file, content);
}

replaceAll('lib/services/joyfulProvider.ts', {
  'import.meta.env.VITE_': 'process.env.NEXT_PUBLIC_',
  'import.meta.env.DEV': 'process.env.NODE_ENV === "development"'
});

replaceAll('hooks/joyful/useThemeSetting.ts', {
  '@/types': '@/lib/types',
  '@/services/': '@/lib/services/'
});

replaceAll('lib/services/skills.ts', {
  '@/types': '@/lib/types',
  '@/services/': '@/lib/services/',
  'import.meta.glob(': '({} as any) // mock import.meta.glob('
});

replaceAll('lib/services/storage.ts', {
  '@/types': '@/lib/types',
  '@/services/': '@/lib/services/'
});

replaceAll('app/(app)/settings/page.tsx', {
  'const { state } = usePathname() || {};': 'const state: any = {};',
  'state?.section': 'state?.section || ""'
});

console.log('Fixed env and remaining deps');
