const fs = require('fs');
const path = require('path');

const files = [
  './app/(marketing)/page.tsx',
  './app/(marketing)/[slug]/page.tsx',
  './app/(marketing)/blog/[slug]/page.tsx',
  './app/(marketing)/blog/page.tsx',
  './app/(marketing)/docs/page.tsx',
  './app/(marketing)/pricing/page.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove the import from MarketingChrome if it was combined
    content = content.replace(/import { MarketingFooter, PromptBox } from '@\/components\/joyful\/marketing\/MarketingChrome';/g, "import { PromptBox } from '@/components/joyful/marketing/MarketingChrome';");
    content = content.replace(/import { MarketingFooter } from '@\/components\/joyful\/marketing\/MarketingChrome';\n/g, "");
    
    // Remove the component render
    content = content.replace(/<MarketingFooter \/>/g, "");
    
    fs.writeFileSync(file, content);
    console.log(`Removed MarketingFooter from ${file}`);
  }
});
