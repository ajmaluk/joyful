const fs = require('fs');

let content = fs.readFileSync('components/joyful/auth/AuthShell.tsx', 'utf8');

// React Router -> Next.js
content = content.replace(/import \{.*?useNavigate.*?\} from 'react-router-dom';/g, "import { useRouter } from 'next/navigation';");
content = content.replace(/const navigate = useNavigate\(\);/g, "const router = useRouter();");
content = content.replace(/navigate\(/g, "router.push(");

// BrandLogo
content = content.replace(/@\/components\/brand\/BrandLogo/g, "@/components/joyful/brand-logo");

// TypingCycle needs to be created or stubbed, let's just leave it and copy it too
// Wait, Joyful has TypingCycle in src/components/ui/TypingCycle.tsx
content = content.replace(/@\/components\/ui\/TypingCycle/g, "@/components/joyful/ui/TypingCycle");

fs.writeFileSync('components/joyful/auth/AuthShell.tsx', content);
console.log('Fixed AuthShell');
