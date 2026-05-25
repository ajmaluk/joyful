const fs = require('fs');

let content = fs.readFileSync('app/(marketing)/page.tsx', 'utf8');

// Remove `<PromptBox onSubmit={onStartProject} />` instances
content = content.replace(/<PromptBox onSubmit=\{onStartProject\} \/>/g, '<PromptBox />');

// Fix `function CTASection({ onStartProject }: { ... })` to `function CTASection()`
content = content.replace(/function CTASection\(\{ onStartProject \}: \{ onStartProject: \(prompt: string, mode\?: ChatMode, attachments\?: ChatAttachment\[\]\) => void \}\) \{/g, 'function CTASection() {');
content = content.replace(/<CTASection onStartProject=\{onStartProject\} \/>/g, '<CTASection />');

// Fix `@/types` to `@/lib/types`
content = content.replace(/from '@\/types'/g, "from '@/lib/types'");

fs.writeFileSync('app/(marketing)/page.tsx', content);
console.log('Fixed page.tsx again');
