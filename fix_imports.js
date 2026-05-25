const fs = require('fs');

const files = [
  'app/(marketing)/page.tsx',
  'components/joyful/marketing/AnimatedDemo.tsx',
  'components/joyful/marketing/CountUpStats.tsx',
  'components/joyful/marketing/FeatureShowcase.tsx',
  'components/joyful/marketing/MarketingChrome.tsx',
  'components/joyful/marketing/TestimonialCard.tsx',
  'components/joyful/marketing/marketingRoutes.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // React Router -> Next.js
  content = content.replace(/import \{.*?useNavigate.*?\} from 'react-router-dom';/g, "import { useRouter } from 'next/navigation';");
  content = content.replace(/const navigate = useNavigate\(\);/g, "const router = useRouter();");
  content = content.replace(/navigate\(/g, "router.push(");
  
  // Helmet -> Next.js Metadata (just remove Helmet for now in components, in page.tsx we can remove it)
  content = content.replace(/import \{ Helmet \} from 'react-helmet-async';/g, "");
  content = content.replace(/<Helmet>[\s\S]*?<\/Helmet>/g, "");

  // BrandLogo import path
  content = content.replace(/@\/components\/brand\/BrandLogo/g, "@/components/joyful/brand-logo");

  // Marketing components path
  content = content.replace(/@\/components\/marketing/g, "@/components/joyful/marketing");

  // Remove hook imports that don't exist
  content = content.replace(/import \{ mergeVoiceTranscript, useVoiceInput \} from '@\/hooks\/useVoiceInput';/g, "");
  content = content.replace(/import \{ useClickOutside \} from '@\/hooks\/useClickOutside';/g, "");
  
  fs.writeFileSync(file, content);
}
console.log('Fixed imports');
