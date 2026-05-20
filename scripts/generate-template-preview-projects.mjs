import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = path.resolve(new URL('..', import.meta.url).pathname);
const sourcePath = path.join(root, 'src/services/aiService.ts');
const compiledPath = path.join(root, '.tmp/template-preview-generator/aiService.cjs');
const outputRoot = path.join(root, '.tmp/template-previews');

const templates = [
  {
    id: 'portfolio',
    prompt: 'Create a polished developer portfolio with hero, about, projects, and contact sections with scroll animations',
  },
  {
    id: 'saas',
    prompt: 'Build a SaaS landing page with features, pricing tiers, testimonials, newsletter signup, and strong CTA',
  },
  {
    id: 'ecommerce',
    prompt: 'Build an e-commerce storefront with product grid, trust badges, email subscription, and cart functionality',
  },
  {
    id: 'blog',
    prompt: 'Create an editorial blog with article listings, category tags, read times, and newsletter signup',
  },
  {
    id: 'dashboard',
    prompt: 'Build an analytics dashboard with metric cards, trend indicators, feature highlights, and navigation',
  },
  {
    id: 'restaurant',
    prompt: 'Build an elegant restaurant website with menu sections, story, reservation form, and warm premium styling',
  },
  {
    id: 'agency',
    prompt: 'Build a creative agency site with services, portfolio grid, case studies, and project inquiry form',
  },
  {
    id: 'event',
    prompt: 'Create an event page with multi-day schedule, speaker cards, pricing tiers, and registration CTA',
  },
  {
    id: 'photography',
    prompt: 'Build a photography portfolio with masonry gallery, about section, contact form, and lightbox ready',
  },
  {
    id: 'startup',
    prompt: 'Build a startup landing page with problem/solution sections, features, social proof, and waitlist signup',
  },
  {
    id: 'fitness',
    prompt: 'Build a fitness gym website with class schedule, trainer profiles, membership plans, and transformation gallery',
  },
  {
    id: 'realestate',
    prompt: 'Build a real estate website with property listings, search filters, agent profiles, and contact forms',
  },
];

async function compileGenerator() {
  const source = await fs.readFile(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: sourcePath,
  }).outputText;

  await fs.mkdir(path.dirname(compiledPath), { recursive: true });
  await fs.writeFile(compiledPath, compiled);
}

async function writeProject(template, generateWithAI) {
  const projectDir = path.join(outputRoot, template.id);
  const response = await generateWithAI(template.prompt, []);

  await fs.rm(projectDir, { recursive: true, force: true });
  await fs.mkdir(projectDir, { recursive: true });

  await Promise.all(response.files
    .filter((file) => file.action !== 'delete' && file.content !== undefined)
    .map(async (file) => {
      const filePath = path.join(projectDir, file.path);
      let content = file.content ?? '';

      if (file.path === 'index.html') {
        content = content.replace('src="/src/main.jsx"', 'src="./src/main.jsx"');
      }

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);
    }));

  return {
    id: template.id,
    dir: projectDir,
    files: response.files.map((file) => file.path),
    summary: response.summary,
  };
}

await compileGenerator();
await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(outputRoot, { recursive: true });

const { generateWithAI } = require(compiledPath);
const results = [];

for (const template of templates) {
  results.push(await writeProject(template, generateWithAI));
}

await fs.writeFile(path.join(outputRoot, 'manifest.json'), JSON.stringify(results, null, 2));
console.log(`Generated ${results.length} template preview projects in ${outputRoot}`);
