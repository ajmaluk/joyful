const fs = require('fs');
const path = require('path');

const map = {
  '/Users/uk/Development/joyful/src/pages/LoginPage.tsx': 'app/(auth)/login/page.tsx',
  '/Users/uk/Development/joyful/src/pages/SignupPage.tsx': 'app/(auth)/signup/page.tsx',
  '/Users/uk/Development/joyful/src/pages/SettingsPage.tsx': 'app/(app)/settings/page.tsx',
  '/Users/uk/Development/joyful/src/pages/PricingPage.tsx': 'app/(marketing)/pricing/page.tsx',
  '/Users/uk/Development/joyful/src/pages/DocsPage.tsx': 'app/(marketing)/docs/page.tsx',
  '/Users/uk/Development/joyful/src/pages/BlogListPage.tsx': 'app/(marketing)/blog/page.tsx',
  '/Users/uk/Development/joyful/src/pages/BlogPostPage.tsx': 'app/(marketing)/blog/[slug]/page.tsx',
  '/Users/uk/Development/joyful/src/pages/SitePage.tsx': 'app/(marketing)/[slug]/page.tsx',
  '/Users/uk/Development/joyful/src/pages/NotFoundPage.tsx': 'app/not-found.tsx'
};

for (const [src, dest] of Object.entries(map)) {
  if (!fs.existsSync(src)) {
    console.log(`Not found: ${src}`);
    continue;
  }
  let content = fs.readFileSync(src, 'utf8');

  // React Router -> Next.js
  content = content.replace(/import \{.*?useNavigate.*?\} from 'react-router-dom';/g, "import { useRouter } from 'next/navigation';");
  content = content.replace(/const navigate = useNavigate\(\);/g, "const router = useRouter();");
  content = content.replace(/navigate\(/g, "router.push(");
  content = content.replace(/import \{.*?useParams.*?\} from 'react-router-dom';/g, "import { useParams } from 'next/navigation';");
  content = content.replace(/import \{.*?Link.*?\} from 'react-router-dom';/g, "import Link from 'next/link';");
  
  // Helmet
  content = content.replace(/import \{ Helmet \} from 'react-helmet-async';/g, "");
  content = content.replace(/<Helmet>[\s\S]*?<\/Helmet>/g, "");

  // BrandLogo
  content = content.replace(/@\/components\/brand\/BrandLogo/g, "@/components/joyful/brand-logo");

  // AuthContext
  content = content.replace(/@\/lib\/auth/g, "@/lib/auth-context");

  // Marketing components
  content = content.replace(/@\/components\/marketing/g, "@/components/joyful/marketing");

  // Layouts might be used in pages. Next.js handles layouts. If they have <TopBar> or <MarketingChrome> at root, we should remove them because they are in layout.tsx.
  // We'll leave them for now and fix compile errors.

  // Rename export function X to export default function X
  content = content.replace(/export function (\w+)/, "export default function $1");

  // Next.js components can't take arbitrary props in pages
  // But let's let TS complain first.

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
  console.log(`Migrated ${src} to ${dest}`);
}
