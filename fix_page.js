const fs = require('fs');

let content = fs.readFileSync('app/(marketing)/page.tsx', 'utf8');

// Replace `export function LandingPage({ onStartProject }: LandingPageProps) {`
// with `export default function LandingPage() {`
content = content.replace(/export function LandingPage\(\{ onStartProject \}: LandingPageProps\) \{/, 'export default function LandingPage() {');

// Remove `interface LandingPageProps { ... }`
content = content.replace(/interface LandingPageProps \{[\s\S]*?\}/, '');

// Remove `onStartProject={onStartProject}`
content = content.replace(/onStartProject=\{onStartProject\}/g, '');

// Remove `import \{ routeMeta \} from '@\/lib\/seo';`
content = content.replace(/import \{ routeMeta \} from '@\/lib\/seo';/, '');

// Remove `const meta = routeMeta\['\/'\];`
content = content.replace(/const meta = routeMeta\['\/'\];/, '');

fs.writeFileSync('app/(marketing)/page.tsx', content);
console.log('Fixed page.tsx');
