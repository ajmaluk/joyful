import type { AIGenerationResponse, AIStreamChunk, ProjectFile } from '@/types';

// ─── Prompt Analysis ───────────────────────────────────────────────

interface PromptAnalysis {
  intent: 'create' | 'modify';
  template: string;
  features: string[];
  colorScheme: 'light' | 'dark' | 'auto';
  industry: string;
}

function analyzePrompt(prompt: string, existingFiles: ProjectFile[]): PromptAnalysis {
  const lower = prompt.toLowerCase();
  const hasExistingSite = existingFiles.some(f => f.path === 'index.html' && f.content.trim().length > 100);

  const modifyKeywords = ['add', 'change', 'update', 'make', 'convert', 'improve', 'remove', 'fix', 'edit'];
  const intent: 'create' | 'modify' = hasExistingSite && modifyKeywords.some(k => lower.includes(k)) ? 'modify' : 'create';

  let template = 'portfolio';
  if (/restaurant|food|menu|cafe|dining|pizza|sushi/.test(lower)) template = 'restaurant';
  else if (/shop|store|ecommerce|e-commerce|product|buy|sell|cart/.test(lower)) template = 'ecommerce';
  else if (/saas|app|software|startup|landing|launch/.test(lower)) template = 'saas';
  else if (/blog|article|editorial|post|news|magazine/.test(lower)) template = 'blog';
  else if (/dashboard|admin|analytics|metrics|chart/.test(lower)) template = 'dashboard';
  else if (/agency|studio|creative|design/.test(lower)) template = 'agency';
  else if (/event|conference|meetup|summit|wedding/.test(lower)) template = 'event';
  else if (/portfolio|personal|resume|cv|developer|designer/.test(lower)) template = 'portfolio';

  const features: string[] = [];
  if (/pricing|price|plan|tier/.test(lower)) features.push('pricing');
  if (/contact|form|email|message/.test(lower)) features.push('contact');
  if (/testimonial|review|feedback/.test(lower)) features.push('testimonials');
  if (/gallery|image|photo/.test(lower)) features.push('gallery');
  if (/faq|question/.test(lower)) features.push('faq');
  if (/team|member|staff/.test(lower)) features.push('team');
  if (/hero|banner|header/.test(lower)) features.push('hero');
  if (/about/.test(lower)) features.push('about');
  if (/service|feature|offering/.test(lower)) features.push('services');
  if (/dark|night|black/.test(lower)) features.push('dark-mode');
  if (/animation|animate|motion|scroll/.test(lower)) features.push('animations');
  if (/responsive|mobile/.test(lower)) features.push('responsive');
  if (/seo|meta/.test(lower)) features.push('seo');

  let colorScheme: 'light' | 'dark' | 'auto' = 'auto';
  if (/dark|night|black/.test(lower)) colorScheme = 'dark';
  else if (/light|bright|clean|white/.test(lower)) colorScheme = 'light';

  let industry = 'general';
  if (/tech|software|developer|coding/.test(lower)) industry = 'tech';
  else if (/food|restaurant|cafe|chef/.test(lower)) industry = 'food';
  else if (/fashion|clothing|style/.test(lower)) industry = 'fashion';
  else if (/health|medical|doctor|clinic/.test(lower)) industry = 'health';
  else if (/finance|bank|invest|crypto/.test(lower)) industry = 'finance';
  else if (/education|learn|course|school/.test(lower)) industry = 'education';
  else if (/travel|hotel|tourism/.test(lower)) industry = 'travel';
  else if (/fitness|gym|sport|yoga/.test(lower)) industry = 'fitness';

  return { intent, template, features, colorScheme, industry };
}

// ─── Color Palette Generator ───────────────────────────────────────

interface ColorPalette {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textMuted: string;
  border: string;
  gradient: string;
}

const PALETTES: Record<string, ColorPalette> = {
  indigo: {
    primary: '#6366F1', primaryHover: '#818CF8', secondary: '#EC4899', accent: '#F59E0B',
    bg: '#FFFFFF', bgAlt: '#F9FAFB', surface: '#F3F4F6', surfaceHover: '#E5E7EB',
    text: '#111827', textMuted: '#6B7280', border: '#E5E7EB',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
  },
  emerald: {
    primary: '#10B981', primaryHover: '#34D399', secondary: '#3B82F6', accent: '#F59E0B',
    bg: '#FFFFFF', bgAlt: '#F0FDF4', surface: '#ECFDF5', surfaceHover: '#D1FAE5',
    text: '#064E3B', textMuted: '#6B7280', border: '#D1FAE5',
    gradient: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
  },
  sunset: {
    primary: '#F97316', primaryHover: '#FB923C', secondary: '#EF4444', accent: '#8B5CF6',
    bg: '#FFFFFF', bgAlt: '#FFF7ED', surface: '#FFEDD5', surfaceHover: '#FED7AA',
    text: '#7C2D12', textMuted: '#9A3412', border: '#FED7AA',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
  },
  midnight: {
    primary: '#818CF8', primaryHover: '#A5B4FC', secondary: '#F472B6', accent: '#34D399',
    bg: '#0F172A', bgAlt: '#1E293B', surface: '#334155', surfaceHover: '#475569',
    text: '#F8FAFC', textMuted: '#94A3B8', border: '#334155',
    gradient: 'linear-gradient(135deg, #818CF8 0%, #F472B6 100%)',
  },
  rose: {
    primary: '#E11D48', primaryHover: '#FB7185', secondary: '#8B5CF6', accent: '#06B6D4',
    bg: '#FFFFFF', bgAlt: '#FFF1F2', surface: '#FFE4E6', surfaceHover: '#FECDD3',
    text: '#881337', textMuted: '#9F1239', border: '#FECDD3',
    gradient: 'linear-gradient(135deg, #E11D48 0%, #8B5CF6 100%)',
  },
};

function pickPalette(analysis: PromptAnalysis): ColorPalette {
  if (analysis.colorScheme === 'dark') return PALETTES.midnight;
  if (analysis.template === 'restaurant') return PALETTES.sunset;
  if (analysis.template === 'ecommerce') return PALETTES.emerald;
  if (analysis.template === 'agency') return PALETTES.rose;
  if (analysis.industry === 'health') return PALETTES.emerald;
  if (analysis.industry === 'finance') return PALETTES.indigo;
  return PALETTES.indigo;
}

// ─── Template Builders ─────────────────────────────────────────────

function htmlDoc(title: string, head: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${head}
</head>
<body>
${body}
  <script src="script.js"></script>
</body>
</html>`;
}

function navHTML(p: ColorPalette, links: string[]): string {
  const items = links.map(l => `      <li><a href="#${l.toLowerCase().replace(/\s+/g, '-')}">${l}</a></li>`).join('\n');
  return `  <nav class="navbar" style="background:${p.bg};border-bottom:1px solid ${p.border}">
    <div class="logo" style="color:${p.primary}">Site</div>
    <button class="menu-toggle" aria-label="Toggle menu">&#9776;</button>
    <ul class="nav-links">
${items}
    </ul>
  </nav>`;
}

function heroHTML(p: ColorPalette, title: string, subtitle: string, cta: string): string {
  return `  <section class="hero" style="background:${p.gradient}">
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <a href="#contact" class="btn btn-primary" style="background:${p.bg};color:${p.primary}">${cta}</a>
  </section>`;
}

function footerHTML(p: ColorPalette): string {
  return `  <footer style="background:${p.bgAlt};border-top:1px solid ${p.border}">
    <p style="color:${p.textMuted}">&copy; ${new Date().getFullYear()} Site. All rights reserved.</p>
  </footer>`;
}

function cssReset(): string {
  return `*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}
a{text-decoration:none}
ul{list-style:none}`;
}

function cssNavbar(p: ColorPalette): string {
  return `.navbar{display:flex;justify-content:space-between;align-items:center;padding:1rem clamp(1rem,5vw,4rem);position:sticky;top:0;z-index:100;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.logo{font-size:1.5rem;font-weight:800;letter-spacing:-.02em}
.nav-links{display:flex;gap:2rem;align-items:center}
.nav-links a{color:${p.textMuted};font-weight:500;font-size:.9rem;transition:color .2s}
.nav-links a:hover{color:${p.primary}}
.menu-toggle{display:none;background:none;border:none;font-size:1.5rem;cursor:pointer;color:${p.text}}
@media(max-width:768px){.menu-toggle{display:block}.nav-links{display:none;position:absolute;top:100%;left:0;right:0;background:${p.bg};flex-direction:column;padding:1rem;gap:1rem;border-bottom:1px solid ${p.border};box-shadow:0 4px 20px rgba(0,0,0,.1)}.nav-links.open{display:flex}}`;
}

function cssHero(p: ColorPalette): string {
  return `.hero{min-height:80vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:4rem clamp(1rem,5vw,4rem);color:#fff}
.hero h1{font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;max-width:800px;margin-bottom:1.5rem}
.hero p{font-size:clamp(1rem,2vw,1.25rem);opacity:.9;max-width:600px;margin-bottom:2.5rem}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.875rem 2rem;border-radius:50px;font-weight:600;font-size:.95rem;transition:transform .2s,box-shadow .2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,0,0,.2)}
.btn-primary{background:${p.bg};color:${p.primary}}`;
}

function cssSections(p: ColorPalette): string {
  return `section{padding:clamp(3rem,8vw,6rem) clamp(1rem,5vw,4rem)}
.section-title{text-align:center;font-size:clamp(1.75rem,4vw,2.75rem);font-weight:800;letter-spacing:-.02em;color:${p.text};margin-bottom:1rem}
.section-subtitle{text-align:center;color:${p.textMuted};max-width:600px;margin:0 auto 3rem;font-size:1.05rem}
.grid{display:grid;gap:1.5rem}
.grid-2{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.grid-3{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.grid-4{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}`;
}

function cssCard(p: ColorPalette): string {
  return `.card{background:${p.bg};border:1px solid ${p.border};border-radius:16px;padding:2rem;transition:transform .3s,box-shadow .3s}
.card:hover{transform:translateY(-4px);box-shadow:0 20px 40px rgba(0,0,0,.08)}
.card h3{font-size:1.15rem;font-weight:700;color:${p.text};margin-bottom:.5rem}
.card p{color:${p.textMuted};font-size:.95rem;line-height:1.6}
.card-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1rem;background:${p.primary}15;color:${p.primary}}`;
}

function cssForm(p: ColorPalette): string {
  return `.contact-form{max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:1rem}
.contact-form input,.contact-form textarea,.contact-form select{padding:.875rem 1rem;border:1px solid ${p.border};border-radius:10px;background:${p.bg};color:${p.text};font-family:inherit;font-size:.95rem;transition:border-color .2s}
.contact-form input:focus,.contact-form textarea:focus{outline:none;border-color:${p.primary};box-shadow:0 0 0 3px ${p.primary}20}
.contact-form button{padding:.875rem;background:${p.primary};color:#fff;border:none;border-radius:10px;font-weight:600;font-size:.95rem;cursor:pointer;transition:background .2s}
.contact-form button:hover{background:${p.primaryHover}}`;
}

function cssFooter(p: ColorPalette): string {
  return `footer{text-align:center;padding:2rem;background:${p.bgAlt};border-top:1px solid ${p.border}}
footer p{font-size:.85rem}`;
}

function cssAnimations(): string {
  return `@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.fade-up{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease}
.fade-up.visible{opacity:1;transform:translateY(0)}`;
}

function jsBase(): string {
  return `// Mobile menu toggle
document.querySelectorAll('.menu-toggle').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const links=btn.nextElementSibling;
    if(links)links.classList.toggle('open');
  });
});

// Scroll animations
const obs=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}});
},{threshold:.1,rootMargin:'0px 0px -50px 0px'});
document.querySelectorAll('.fade-up').forEach(el=>obs.observe(el));

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();
    const t=document.querySelector(a.getAttribute('href'));
    if(t)t.scrollIntoView({behavior:'smooth',block:'start'});
  });
});`;
}

// ─── Full Template Builders ────────────────────────────────────────

function buildPortfolio(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'about', 'projects', 'contact'];

  const html = htmlDoc('Creative Portfolio',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['About', 'Projects', 'Contact'])}
${heroHTML(p, 'Hello, I\'m a Creator', 'I craft digital experiences that blend beauty with function.', 'View My Work')}
  <section id="about" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">About Me</h2>
    <p class="section-subtitle">Passionate about creating elegant solutions to complex problems.</p>
    <div class="grid grid-3">
      <div class="card"><div class="card-icon">&#9998;</div><h3>Design</h3><p>Creating intuitive interfaces that users love.</p></div>
      <div class="card"><div class="card-icon">&#60;/&#62;</div><h3>Development</h3><p>Building robust, scalable web applications.</p></div>
      <div class="card"><div class="card-icon">&#9889;</div><h3>Performance</h3><p>Optimizing for speed and accessibility.</p></div>
    </div>
  </section>
  <section id="projects" class="fade-up">
    <h2 class="section-title">Featured Work</h2>
    <p class="section-subtitle">A selection of recent projects I'm proud of.</p>
    <div class="grid grid-3">
      <div class="card"><div class="card-icon">&#127912;</div><h3>Brand Identity</h3><p>Complete visual identity for a tech startup.</p></div>
      <div class="card"><div class="card-icon">&#128241;</div><h3>Mobile App</h3><p>Cross-platform app with 50k+ downloads.</p></div>
      <div class="card"><div class="card-icon">&#127760;</div><h3>Web Platform</h3><p>SaaS dashboard serving 10k daily users.</p></div>
    </div>
  </section>
  <section id="contact" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Get In Touch</h2>
    <p class="section-subtitle">Have a project in mind? Let's talk.</p>
    <form class="contact-form">
      <input type="text" placeholder="Your Name" required>
      <input type="email" placeholder="Your Email" required>
      <textarea rows="5" placeholder="Tell me about your project..." required></textarea>
      <button type="submit">Send Message</button>
    </form>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');
  const js = jsBase() + `\n\ndocument.querySelector('.contact-form')?.addEventListener('submit',e=>{\n  e.preventDefault();\n  alert('Thanks! I\\'ll get back to you soon.');\n  e.target.reset();\n});`;

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: js }],
    summary: `Built a ${p.bg === '#0F172A' ? 'dark' : 'light'}-themed portfolio with hero, about, projects, and contact form sections.`,
    nextSteps: ['Add real project images', 'Connect contact form to backend', 'Add testimonials section', 'Customize colors'],
    metadata: { template: 'portfolio', sections, estimatedComplexity: 'simple' },
  };
}

function buildSaaS(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'features', 'pricing', 'testimonials', 'cta'];

  const html = htmlDoc('SaaS Product',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Features', 'Pricing', 'Testimonials'])}
${heroHTML(p, 'Ship Faster, Scale Smarter', 'The all-in-one platform for modern teams.', 'Start Free Trial')}
  <section id="features" class="fade-up">
    <h2 class="section-title">Everything You Need</h2>
    <p class="section-subtitle">Powerful tools designed for modern teams.</p>
    <div class="grid grid-3">
      <div class="card"><div class="card-icon">&#9889;</div><h3>Lightning Fast</h3><p>Sub-second load times with edge caching.</p></div>
      <div class="card"><div class="card-icon">&#128274;</div><h3>Enterprise Security</h3><p>SOC 2 compliant with end-to-end encryption.</p></div>
      <div class="card"><div class="card-icon">&#128640;</div><h3>Auto Scaling</h3><p>Handles traffic spikes automatically.</p></div>
      <div class="card"><div class="card-icon">&#128202;</div><h3>Analytics</h3><p>Real-time performance insights.</p></div>
      <div class="card"><div class="card-icon">&#127912;</div><h3>Team Collab</h3><p>Built-in tools for seamless teamwork.</p></div>
      <div class="card"><div class="card-icon">&#128295;</div><h3>API First</h3><p>RESTful API with comprehensive docs.</p></div>
    </div>
  </section>
  <section id="pricing" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Simple Pricing</h2>
    <p class="section-subtitle">Start free, upgrade when ready.</p>
    <div class="grid grid-3">
      <div class="card" style="text-align:center"><h3>Starter</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$0</div><p>For side projects</p><a href="#" class="btn" style="margin-top:1rem;width:100%;justify-content:center;border:1px solid ${p.border};color:${p.text}">Get Started</a></div>
      <div class="card" style="text-align:center;border-color:${p.primary};position:relative"><span style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:${p.primary};color:#fff;padding:4px 16px;border-radius:20px;font-size:.75rem;font-weight:600">Popular</span><h3>Pro</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$29<span style="font-size:1rem;font-weight:400;color:${p.textMuted}">/mo</span></div><p>For growing teams</p><a href="#" class="btn" style="margin-top:1rem;width:100%;justify-content:center;background:${p.primary};color:#fff">Start Free Trial</a></div>
      <div class="card" style="text-align:center"><h3>Enterprise</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">Custom</div><p>For large orgs</p><a href="#" class="btn" style="margin-top:1rem;width:100%;justify-content:center;border:1px solid ${p.border};color:${p.text}">Contact Sales</a></div>
    </div>
  </section>
  <section id="testimonials" class="fade-up">
    <h2 class="section-title">Loved by Teams</h2>
    <div class="grid grid-3">
      <div class="card"><p style="font-style:italic;margin-bottom:1rem">"This tool transformed our workflow. We ship 3x faster now."</p><p style="font-weight:600;color:${p.text}">Sarah Chen</p><p style="font-size:.85rem">CTO, TechCorp</p></div>
      <div class="card"><p style="font-style:italic;margin-bottom:1rem">"The best developer experience I've encountered in years."</p><p style="font-weight:600;color:${p.text}">Mike Johnson</p><p style="font-size:.85rem">Lead Dev, StartupXYZ</p></div>
      <div class="card"><p style="font-style:italic;margin-bottom:1rem">"Setup took 5 minutes. Scaled to millions effortlessly."</p><p style="font-weight:600;color:${p.text}">Lisa Park</p><p style="font-size:.85rem">VP Eng, ScaleUp</p></div>
    </div>
  </section>
  <section class="fade-up" style="text-align:center;background:${p.gradient};color:#fff;padding:5rem 2rem">
    <h2 style="font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;margin-bottom:1rem">Ready to Get Started?</h2>
    <p style="opacity:.9;max-width:500px;margin:0 auto 2rem">Join thousands of teams already building with us.</p>
    <a href="#" class="btn" style="background:#fff;color:${p.primary}">Start Free Trial</a>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssFooter(p), cssAnimations()].join('\n');

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: jsBase() }],
    summary: 'Created a SaaS landing page with features grid, 3-tier pricing, testimonials, and CTA section.',
    nextSteps: ['Add monthly/annual pricing toggle', 'Add FAQ section', 'Integrate payment provider', 'Add more testimonials'],
    metadata: { template: 'saas', sections, estimatedComplexity: 'medium' },
  };
}

function buildRestaurant(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'menu', 'about', 'reservations'];

  const html = htmlDoc('Restaurant',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Menu', 'About', 'Reservations'])}
${heroHTML(p, 'Taste the Difference', 'Farm-to-table dining in the heart of the city.', 'View Menu')}
  <section id="menu" class="fade-up">
    <h2 class="section-title">Our Menu</h2>
    <p class="section-subtitle">Seasonal ingredients, timeless flavors.</p>
    <div class="grid grid-2">
      <div class="card"><div class="card-icon">&#127837;</div><h3>Starters</h3><p>Fresh garden salad, artisan bread, seasonal soup.</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">From $12</p></div>
      <div class="card"><div class="card-icon">&#127830;</div><h3>Mains</h3><p>Grilled salmon, grass-fed steak, wild mushroom risotto.</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">From $28</p></div>
      <div class="card"><div class="card-icon">&#127856;</div><h3>Desserts</h3><p>Creme brulee, chocolate fondant, fruit tart.</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">From $14</p></div>
      <div class="card"><div class="card-icon">&#127863;</div><h3>Drinks</h3><p>Curated wine list, craft cocktails, local beers.</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">From $8</p></div>
    </div>
  </section>
  <section id="about" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Our Story</h2>
    <p class="section-subtitle">Since 2015, serving the community with passion and dedication.</p>
    <div class="grid grid-3">
      <div class="card" style="text-align:center"><div style="font-size:2rem;font-weight:800;color:${p.primary}">9+</div><p>Years of Service</p></div>
      <div class="card" style="text-align:center"><div style="font-size:2rem;font-weight:800;color:${p.primary}">50k+</div><p>Happy Guests</p></div>
      <div class="card" style="text-align:center"><div style="font-size:2rem;font-weight:800;color:${p.primary}">4.9</div><p>Star Rating</p></div>
    </div>
  </section>
  <section id="reservations" class="fade-up">
    <h2 class="section-title">Reserve a Table</h2>
    <form class="contact-form">
      <input type="text" placeholder="Your Name" required>
      <input type="email" placeholder="Email" required>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem"><input type="date" required><input type="time" required></div>
      <select required><option value="">Party Size</option><option>1-2 guests</option><option>3-4 guests</option><option>5-6 guests</option><option>7+ guests</option></select>
      <button type="submit">Reserve Now</button>
    </form>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');
  const js = jsBase() + `\n\ndocument.querySelector('.contact-form')?.addEventListener('submit',e=>{\n  e.preventDefault();\n  alert('Reservation confirmed!');\n  e.target.reset();\n});`;

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: js }],
    summary: 'Built a restaurant site with menu, story section with stats, and reservation form.',
    nextSteps: ['Add food photography', 'Integrate reservation system', 'Add Google Maps', 'Add wine list'],
    metadata: { template: 'restaurant', sections, estimatedComplexity: 'simple' },
  };
}

function buildEcommerce(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'products', 'features', 'cta'];

  const html = htmlDoc('Shop',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Products', 'Features'])}
${heroHTML(p, 'Curated Collections', 'Premium products crafted for modern living.', 'Shop Now')}
  <section id="products" class="fade-up">
    <h2 class="section-title">Featured Products</h2>
    <div class="grid grid-4">
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#128091;</div><div style="padding:1.25rem"><h3>Leather Bag</h3><p style="font-size:.85rem">Handcrafted premium leather</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">$189</p></div></div>
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#8986;</div><div style="padding:1.25rem"><h3>Classic Watch</h3><p style="font-size:.85rem">Swiss movement, minimalist</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">$349</p></div></div>
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#128085;</div><div style="padding:1.25rem"><h3>Wool Jacket</h3><p style="font-size:.85rem">Sustainable merino blend</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">$275</p></div></div>
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:1;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:3rem">&#128092;</div><div style="padding:1.25rem"><h3>Sneakers</h3><p style="font-size:.85rem">Limited edition colorway</p><p style="margin-top:.5rem;font-weight:700;color:${p.primary}">$145</p></div></div>
    </div>
  </section>
  <section class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Why Shop With Us</h2>
    <div class="grid grid-3">
      <div class="card"><div class="card-icon">&#128666;</div><h3>Free Shipping</h3><p>On all orders over $75.</p></div>
      <div class="card"><div class="card-icon">&#128260;</div><h3>Easy Returns</h3><p>30-day hassle-free returns.</p></div>
      <div class="card"><div class="card-icon">&#128274;</div><h3>Secure Checkout</h3><p>256-bit SSL encryption.</p></div>
    </div>
  </section>
  <section class="fade-up" style="text-align:center;background:${p.gradient};color:#fff;padding:5rem 2rem">
    <h2 style="font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;margin-bottom:1rem">New Arrivals Weekly</h2>
    <p style="opacity:.9;margin-bottom:2rem">Subscribe for early access and 10% off your first order.</p>
    <form style="display:flex;gap:.5rem;max-width:400px;margin:0 auto">
      <input type="email" placeholder="Your email" required style="flex:1;border-radius:50px;padding:.75rem 1.25rem;border:1px solid ${p.border};background:${p.bg};color:${p.text}">
      <button type="submit" class="btn" style="border-radius:50px;background:#fff;color:${p.primary};padding:.75rem 1.5rem">Subscribe</button>
    </form>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssFooter(p), cssAnimations()].join('\n');

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: jsBase() }],
    summary: 'Created an e-commerce storefront with product grid, trust badges, and email subscription CTA.',
    nextSteps: ['Add product detail pages', 'Integrate Stripe', 'Add shopping cart', 'Add search/filtering'],
    metadata: { template: 'ecommerce', sections, estimatedComplexity: 'medium' },
  };
}

function buildBlog(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'articles', 'newsletter'];

  const html = htmlDoc('Blog',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Articles', 'Newsletter'])}
${heroHTML(p, 'Insights & Ideas', 'Thoughtful perspectives on design, technology, and creativity.', 'Read Latest')}
  <section id="articles" class="fade-up">
    <h2 class="section-title">Latest Articles</h2>
    <div class="grid grid-3">
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:16/9;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:2.5rem">&#128221;</div><div style="padding:1.5rem"><p style="font-size:.8rem;color:${p.primary};font-weight:600;text-transform:uppercase;letter-spacing:.05em">Design</p><h3 style="margin-top:.5rem">The Future of Web Design</h3><p style="margin-top:.5rem">Emerging trends shaping the web.</p><p style="margin-top:1rem;font-size:.85rem;color:${p.textMuted}">5 min read</p></div></div>
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:16/9;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:2.5rem">&#128187;</div><div style="padding:1.5rem"><p style="font-size:.8rem;color:${p.primary};font-weight:600;text-transform:uppercase;letter-spacing:.05em">Engineering</p><h3 style="margin-top:.5rem">Scalable APIs with Edge Functions</h3><p style="margin-top:.5rem">A practical serverless guide.</p><p style="margin-top:1rem;font-size:.85rem;color:${p.textMuted}">8 min read</p></div></div>
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:16/9;background:${p.surface};display:flex;align-items:center;justify-content:center;font-size:2.5rem">&#127912;</div><div style="padding:1.5rem"><p style="font-size:.8rem;color:${p.primary};font-weight:600;text-transform:uppercase;letter-spacing:.05em">Creative</p><h3 style="margin-top:.5rem">Color Theory for Interfaces</h3><p style="margin-top:.5rem">Palettes that convert and delight.</p><p style="margin-top:1rem;font-size:.85rem;color:${p.textMuted}">6 min read</p></div></div>
    </div>
  </section>
  <section id="newsletter" class="fade-up" style="text-align:center;background:${p.bgAlt}">
    <h2 class="section-title">Stay Updated</h2>
    <p class="section-subtitle">Latest articles in your inbox. No spam, ever.</p>
    <form style="display:flex;gap:.5rem;max-width:400px;margin:0 auto">
      <input type="email" placeholder="Your email" required style="flex:1;border-radius:50px;padding:.75rem 1.25rem;border:1px solid ${p.border};background:${p.bg};color:${p.text}">
      <button type="submit" class="btn" style="border-radius:50px;background:${p.primary};color:#fff;padding:.75rem 1.5rem">Subscribe</button>
    </form>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssFooter(p), cssAnimations()].join('\n');

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: jsBase() }],
    summary: 'Built a blog with article cards featuring category tags and read times, plus newsletter subscription.',
    nextSteps: ['Add article pages', 'Add category filtering', 'Add search', 'Add author profiles'],
    metadata: { template: 'blog', sections, estimatedComplexity: 'simple' },
  };
}

function buildDashboard(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'stats', 'features'];

  const html = htmlDoc('Dashboard',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Stats', 'Features'])}
${heroHTML(p, 'Command Center', 'Real-time analytics and insights for your business.', 'View Dashboard')}
  <section id="stats" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Key Metrics</h2>
    <div class="grid grid-4">
      <div class="card" style="text-align:center"><p style="font-size:.85rem;color:${p.textMuted};text-transform:uppercase;letter-spacing:.05em">Revenue</p><p style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:.5rem 0">$48.2k</p><p style="color:#10B981;font-size:.85rem;font-weight:600">&#9650; 12.5%</p></div>
      <div class="card" style="text-align:center"><p style="font-size:.85rem;color:${p.textMuted};text-transform:uppercase;letter-spacing:.05em">Users</p><p style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:.5rem 0">12.4k</p><p style="color:#10B981;font-size:.85rem;font-weight:600">&#9650; 8.3%</p></div>
      <div class="card" style="text-align:center"><p style="font-size:.85rem;color:${p.textMuted};text-transform:uppercase;letter-spacing:.05em">Conversion</p><p style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:.5rem 0">3.2%</p><p style="color:#10B981;font-size:.85rem;font-weight:600">&#9650; 2.1%</p></div>
      <div class="card" style="text-align:center"><p style="font-size:.85rem;color:${p.textMuted};text-transform:uppercase;letter-spacing:.05em">Avg Session</p><p style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:.5rem 0">4m 32s</p><p style="color:#EF4444;font-size:.85rem;font-weight:600">&#9660; 1.2%</p></div>
    </div>
  </section>
  <section id="features" class="fade-up">
    <h2 class="section-title">Platform Features</h2>
    <div class="grid grid-3">
      <div class="card"><div class="card-icon">&#128202;</div><h3>Real-time Charts</h3><p>Interactive live visualizations.</p></div>
      <div class="card"><div class="card-icon">&#128276;</div><h3>Smart Alerts</h3><p>Threshold-based notifications.</p></div>
      <div class="card"><div class="card-icon">&#128203;</div><h3>Custom Reports</h3><p>Build and export tailored reports.</p></div>
    </div>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssFooter(p), cssAnimations()].join('\n');

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: jsBase() }],
    summary: 'Created a dashboard landing page with metric cards showing trends and feature highlights.',
    nextSteps: ['Add interactive charts with Chart.js', 'Add data tables', 'Add date filters', 'Connect to real API'],
    metadata: { template: 'dashboard', sections, estimatedComplexity: 'medium' },
  };
}

function buildAgency(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'services', 'work', 'contact'];

  const html = htmlDoc('Creative Agency',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Services', 'Work', 'Contact'])}
${heroHTML(p, 'We Create What Others Imagine', 'Award-winning digital agency crafting brands and experiences.', 'See Our Work')}
  <section id="services" class="fade-up">
    <h2 class="section-title">What We Do</h2>
    <div class="grid grid-3">
      <div class="card"><div class="card-icon">&#127912;</div><h3>Brand Identity</h3><p>Logos, guidelines, and visual systems.</p></div>
      <div class="card"><div class="card-icon">&#128187;</div><h3>Web Development</h3><p>Custom websites built for performance.</p></div>
      <div class="card"><div class="card-icon">&#128241;</div><h3>Product Design</h3><p>User-centered design for digital products.</p></div>
    </div>
  </section>
  <section id="work" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Selected Work</h2>
    <div class="grid grid-2">
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:4/3;background:${p.gradient};display:flex;align-items:center;justify-content:center;font-size:3rem;color:#fff">&#9733;</div><div style="padding:1.5rem"><h3>Nexus Brand Redesign</h3><p>Complete rebrand for a Fortune 500 company.</p></div></div>
      <div class="card" style="padding:0;overflow:hidden"><div style="aspect-ratio:4/3;background:linear-gradient(135deg,#10B981,#3B82F6);display:flex;align-items:center;justify-content:center;font-size:3rem;color:#fff">&#9670;</div><div style="padding:1.5rem"><h3>FinFlow App</h3><p>Mobile banking app serving 2M+ users.</p></div></div>
    </div>
  </section>
  <section id="contact" class="fade-up">
    <h2 class="section-title">Start a Project</h2>
    <p class="section-subtitle">Let's build something great together.</p>
    <form class="contact-form">
      <input type="text" placeholder="Your Name" required>
      <input type="email" placeholder="Email" required>
      <select required><option value="">Project Type</option><option>Brand Identity</option><option>Web Development</option><option>Product Design</option></select>
      <textarea rows="4" placeholder="Tell us about your project..." required></textarea>
      <button type="submit">Send Inquiry</button>
    </form>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssForm(p), cssFooter(p), cssAnimations()].join('\n');

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: jsBase() }],
    summary: 'Built a creative agency site with services, portfolio showcase with gradient cards, and project inquiry form.',
    nextSteps: ['Add case study pages', 'Add team section', 'Add client logos', 'Add process timeline'],
    metadata: { template: 'agency', sections, estimatedComplexity: 'medium' },
  };
}

function buildEvent(analysis: PromptAnalysis): AIGenerationResponse {
  const p = pickPalette(analysis);
  const sections = ['hero', 'schedule', 'speakers', 'register'];

  const html = htmlDoc('Event',
    `<link rel="stylesheet" href="style.css">`,
    `${navHTML(p, ['Schedule', 'Speakers', 'Register'])}
${heroHTML(p, 'Tech Summit 2026', 'The premier conference for developers and designers.', 'Register Now')}
  <section id="schedule" class="fade-up">
    <h2 class="section-title">Schedule</h2>
    <div class="grid grid-2">
      <div class="card"><h3 style="color:${p.primary}">Day 1 — June 15</h3><div style="margin-top:1rem;display:flex;flex-direction:column;gap:.75rem"><p><strong>9:00 AM</strong> — Registration</p><p><strong>10:00 AM</strong> — Opening Keynote</p><p><strong>11:30 AM</strong> — Workshop: Modern CSS</p><p><strong>2:00 PM</strong> — Panel: Future of Web</p><p><strong>4:00 PM</strong> — Networking</p></div></div>
      <div class="card"><h3 style="color:${p.primary}">Day 2 — June 16</h3><div style="margin-top:1rem;display:flex;flex-direction:column;gap:.75rem"><p><strong>9:00 AM</strong> — Morning Sessions</p><p><strong>10:30 AM</strong> — Workshop: AI Tools</p><p><strong>1:00 PM</strong> — Lightning Talks</p><p><strong>3:00 PM</strong> — Closing Keynote</p><p><strong>4:30 PM</strong> — After Party</p></div></div>
    </div>
  </section>
  <section id="speakers" class="fade-up" style="background:${p.bgAlt}">
    <h2 class="section-title">Speakers</h2>
    <div class="grid grid-4">
      <div class="card" style="text-align:center"><div style="width:80px;height:80px;border-radius:50%;background:${p.gradient};margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem">AK</div><h3>Alex Kim</h3><p style="font-size:.85rem">VP of Design, Stripe</p></div>
      <div class="card" style="text-align:center"><div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#10B981,#3B82F6);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem">SP</div><h3>Sara Patel</h3><p style="font-size:.85rem">CTO, Vercel</p></div>
      <div class="card" style="text-align:center"><div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#F97316,#EF4444);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem">MC</div><h3>Marcus Chen</h3><p style="font-size:.85rem">Staff Eng, Google</p></div>
      <div class="card" style="text-align:center"><div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#EC4899);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem">LW</div><h3>Lisa Wang</h3><p style="font-size:.85rem">Founder, DesignLab</p></div>
    </div>
  </section>
  <section class="fade-up" style="text-align:center;background:${p.gradient};color:#fff;padding:5rem 2rem">
    <h2 style="font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;margin-bottom:1rem">Secure Your Spot</h2>
    <p style="opacity:.9;margin-bottom:.5rem">Early bird pricing until May 1st.</p>
    <p style="font-size:2rem;font-weight:800;margin-bottom:2rem">$199</p>
    <a href="#" class="btn" style="background:#fff;color:${p.primary}">Register Now</a>
  </section>
${footerHTML(p)}`
  );

  const css = [cssReset(), cssNavbar(p), cssHero(p), cssSections(p), cssCard(p), cssFooter(p), cssAnimations()].join('\n');

  return {
    files: [{ path: 'index.html', content: html }, { path: 'style.css', content: css }, { path: 'script.js', content: jsBase() }],
    summary: 'Created an event page with 2-day schedule, speaker cards, and registration CTA.',
    nextSteps: ['Add ticket tiers', 'Add countdown timer', 'Add venue map', 'Add sponsor logos'],
    metadata: { template: 'event', sections, estimatedComplexity: 'simple' },
  };
}

// ─── Modification Engine ───────────────────────────────────────────

function modifyExistingFiles(prompt: string, existingFiles: ProjectFile[], analysis: PromptAnalysis): AIGenerationResponse | null {
  const lower = prompt.toLowerCase();
  const htmlFile = existingFiles.find(f => f.path === 'index.html');
  const cssFile = existingFiles.find(f => f.path === 'style.css');
  const jsFile = existingFiles.find(f => f.path === 'script.js');

  if (!htmlFile) return null;

  let html = htmlFile.content;
  let css = cssFile?.content || '';
  let js = jsFile?.content || jsBase();
  const modifiedFiles: AIGenerationResponse['files'] = [];
  let summary = '';
  const nextSteps: string[] = [];

  if (/dark|night|black/.test(lower) && /convert|make|change|switch|toggle/.test(lower)) {
    css = css
      .replace(/background:\s*#ffffff/gi, 'background: #0F172A')
      .replace(/background:\s*#fff\b/gi, 'background: #0F172A')
      .replace(/background:\s*#f8f9fa/gi, 'background: #1E293B')
      .replace(/background:\s*#f9fafb/gi, 'background: #1E293B')
      .replace(/background:\s*white/gi, 'background: #0F172A')
      .replace(/color:\s*#333/gi, 'color: #F8FAFC')
      .replace(/color:\s*#555/gi, 'color: #94A3B8')
      .replace(/color:\s*#222/gi, 'color: #F8FAFC')
      .replace(/color:\s*#111827/gi, 'color: #F8FAFC');
    summary = 'Converted to dark mode with deep navy backgrounds and light text.';
    nextSteps.push('Add dark/light toggle', 'Adjust image brightness', 'Custom dark accent colors');
  } else if (/pricing|price|plan/.test(lower) && /add|create|include/.test(lower)) {
    const p = pickPalette(analysis);
    const pricingHTML = `\n  <section id="pricing" class="fade-up" style="background:${p.bgAlt}">\n    <h2 class="section-title">Pricing</h2>\n    <div class="grid grid-3">\n      <div class="card" style="text-align:center"><h3>Free</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$0</div><a href="#" class="btn" style="width:100%;justify-content:center;border:1px solid ${p.border};color:${p.text}">Get Started</a></div>\n      <div class="card" style="text-align:center;border-color:${p.primary}"><h3>Pro</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">$19<span style="font-size:1rem;color:${p.textMuted}">/mo</span></div><a href="#" class="btn" style="width:100%;justify-content:center;background:${p.primary};color:#fff">Subscribe</a></div>\n      <div class="card" style="text-align:center"><h3>Enterprise</h3><div style="font-size:2.5rem;font-weight:800;color:${p.primary};margin:1rem 0">Custom</div><a href="#" class="btn" style="width:100%;justify-content:center;border:1px solid ${p.border};color:${p.text}">Contact</a></div>\n    </div>\n  </section>\n`;
    html = html.replace('</body>', `${pricingHTML}</body>`);
    summary = 'Added a 3-tier pricing section.';
    nextSteps.push('Add feature comparison', 'Add annual/monthly toggle');
  } else if (/contact|form/.test(lower) && /add|create|include/.test(lower)) {
    const p = pickPalette(analysis);
    const contactHTML = `\n  <section id="contact" class="fade-up" style="background:${p.bgAlt}">\n    <h2 class="section-title">Get In Touch</h2>\n    <form class="contact-form">\n      <input type="text" placeholder="Your Name" required>\n      <input type="email" placeholder="Your Email" required>\n      <textarea rows="5" placeholder="Your Message" required></textarea>\n      <button type="submit">Send Message</button>\n    </form>\n  </section>\n`;
    html = html.replace('</body>', `${contactHTML}</body>`);
    css += `\n${cssForm(p)}`;
    js += `\n\ndocument.querySelector('.contact-form')?.addEventListener('submit',e=>{\n  e.preventDefault();\n  alert('Message sent!');\n  e.target.reset();\n});`;
    summary = 'Added a contact form section.';
    nextSteps.push('Connect to backend', 'Add validation');
  } else if (/testimonial|review/.test(lower) && /add|create|include/.test(lower)) {
    const testHTML = `\n  <section id="testimonials" class="fade-up">\n    <h2 class="section-title">What People Say</h2>\n    <div class="grid grid-3">\n      <div class="card"><p style="font-style:italic">"Absolutely incredible experience."</p><p style="margin-top:1rem;font-weight:600">— Alex K.</p></div>\n      <div class="card"><p style="font-style:italic">"Transformed our business."</p><p style="margin-top:1rem;font-weight:600">— Sarah M.</p></div>\n      <div class="card"><p style="font-style:italic">"Best decision we made this year."</p><p style="margin-top:1rem;font-weight:600">— James L.</p></div>\n    </div>\n  </section>\n`;
    html = html.replace('</body>', `${testHTML}</body>`);
    summary = 'Added a testimonials section with 3 customer quotes.';
    nextSteps.push('Add real photos', 'Add star ratings');
  } else if (/animation|animate|motion|scroll/.test(lower)) {
    css += `\n${cssAnimations()}`;
    html = html.replace(/<section(?!.*class="fade-up")/g, '<section class="fade-up"');
    js += `\n\nconst obs=new IntersectionObserver((entries)=>{\n  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}});\n},{threshold:.1});\ndocument.querySelectorAll('.fade-up').forEach(el=>obs.observe(el));`;
    summary = 'Added scroll-triggered fade-up animations to all sections.';
    nextSteps.push('Add staggered delays', 'Add parallax effects');
  } else if (/responsive|mobile|better|improve|premium/.test(lower)) {
    css += `\n\n@media(max-width:768px){.hero h1{font-size:2.5rem}.grid-2,.grid-3,.grid-4{grid-template-columns:1fr}.navbar{padding:1rem}}`;
    if (!css.includes('.fade-up')) css += `\n${cssAnimations()}`;
    summary = 'Enhanced responsive design with mobile-optimized breakpoints.';
    nextSteps.push('Test on devices', 'Add touch gestures');
  } else {
    const sectionName = lower.match(/add\s+(?:a\s+)?(\w+)/)?.[1] || 'section';
    const sectionHTML = `\n  <section class="fade-up" style="padding:5rem 2rem;text-align:center">\n    <h2 class="section-title">${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}</h2>\n    <p class="section-subtitle">This section was added based on your request.</p>\n    <div class="grid grid-3">\n      <div class="card"><div class="card-icon">&#128221;</div><h3>Feature One</h3><p>Description of the first feature.</p></div>\n      <div class="card"><div class="card-icon">&#128221;</div><h3>Feature Two</h3><p>Description of the second feature.</p></div>\n      <div class="card"><div class="card-icon">&#128221;</div><h3>Feature Three</h3><p>Description of the third feature.</p></div>\n    </div>\n  </section>\n`;
    html = html.replace('</body>', `${sectionHTML}</body>`);
    summary = `Added a new ${sectionName} section.`;
    nextSteps.push('Customize content', 'Add real data');
  }

  modifiedFiles.push({ path: 'index.html', content: html, action: 'modify' });
  modifiedFiles.push({ path: 'style.css', content: css, action: 'modify' });
  if (jsFile) modifiedFiles.push({ path: 'script.js', content: js, action: 'modify' });

  return {
    files: modifiedFiles,
    summary,
    nextSteps,
    metadata: { template: analysis.template, sections: ['modified'], estimatedComplexity: 'simple' },
  };
}

// ─── Template Router ───────────────────────────────────────────────

const TEMPLATE_BUILDERS: Record<string, (analysis: PromptAnalysis) => AIGenerationResponse> = {
  portfolio: buildPortfolio,
  saas: buildSaaS,
  restaurant: buildRestaurant,
  ecommerce: buildEcommerce,
  blog: buildBlog,
  dashboard: buildDashboard,
  agency: buildAgency,
  event: buildEvent,
};

// ─── Main Generation Function ──────────────────────────────────────

export async function generateWithAI(
  prompt: string,
  existingFiles: ProjectFile[],
  _conversationHistory: { role: string; content: string }[] = []
): Promise<AIGenerationResponse> {
  await new Promise(resolve => setTimeout(resolve, 400));

  const analysis = analyzePrompt(prompt, existingFiles);

  if (analysis.intent === 'modify') {
    const modified = modifyExistingFiles(prompt, existingFiles, analysis);
    if (modified) return modified;
  }

  const builder = TEMPLATE_BUILDERS[analysis.template] || buildPortfolio;
  return builder(analysis);
}

// ─── Streaming Support ─────────────────────────────────────────────

export async function* generateWithAIStream(
  prompt: string,
  existingFiles: ProjectFile[],
  _conversationHistory: { role: string; content: string }[] = []
): AsyncGenerator<AIStreamChunk> {
  const analysis = analyzePrompt(prompt, existingFiles);

  let response: AIGenerationResponse;
  if (analysis.intent === 'modify') {
    const modified = modifyExistingFiles(prompt, existingFiles, analysis);
    response = modified || (TEMPLATE_BUILDERS[analysis.template] || buildPortfolio)(analysis);
  } else {
    response = (TEMPLATE_BUILDERS[analysis.template] || buildPortfolio)(analysis);
  }

  for (const file of response.files) {
    yield { type: 'file_start', data: { path: file.path } };

    const chunkSize = 200;
    for (let i = 0; i < file.content.length; i += chunkSize) {
      const chunk = file.content.slice(i, i + chunkSize);
      yield { type: 'file_content', data: { path: file.path, content: chunk } };
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    yield { type: 'file_end', data: { path: file.path } };
  }

  yield { type: 'summary', data: { summary: response.summary } };

  if (response.metadata) {
    yield { type: 'metadata', data: { metadata: response.metadata } };
  }
}
