import type { AIGenerationResponse, ProjectFile } from '@/types';

// Mock AI generation - returns a complete portfolio website
function getMockPortfolioResponse(): AIGenerationResponse {
  return {
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Portfolio</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="navbar">
    <div class="logo">Portfolio</div>
    <ul class="nav-links">
      <li><a href="#home">Home</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#projects">Projects</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>
  <section id="home" class="hero">
    <h1>Hello, I'm a Developer</h1>
    <p>I build beautiful web experiences</p>
    <a href="#projects" class="cta-button">View My Work</a>
  </section>
  <section id="about" class="about">
    <h2>About Me</h2>
    <p>Passionate about creating elegant solutions to complex problems.</p>
  </section>
  <section id="projects" class="projects">
    <h2>My Projects</h2>
    <div class="project-grid">
      <div class="project-card">
        <h3>Project One</h3>
        <p>A modern web application</p>
      </div>
      <div class="project-card">
        <h3>Project Two</h3>
        <p>An e-commerce platform</p>
      </div>
    </div>
  </section>
  <section id="contact" class="contact">
    <h2>Get In Touch</h2>
    <p>Email: hello@example.com</p>
  </section>
  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        path: 'style.css',
        content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f8f9fa;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 5%;
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: fixed;
  width: 100%;
  top: 0;
  z-index: 100;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: #6366F1;
}

.nav-links {
  display: flex;
  list-style: none;
  gap: 2rem;
}

.nav-links a {
  text-decoration: none;
  color: #555;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: #6366F1;
}

.hero {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.hero h1 {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

.hero p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-button {
  padding: 0.875rem 2rem;
  background: white;
  color: #6366F1;
  text-decoration: none;
  border-radius: 50px;
  font-weight: 600;
  transition: transform 0.3s, box-shadow 0.3s;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.about, .projects, .contact {
  padding: 5rem 10%;
  text-align: center;
}

.about h2, .projects h2, .contact h2 {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  color: #222;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.project-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  transition: transform 0.3s;
}

.project-card:hover {
  transform: translateY(-5px);
}

.project-card h3 {
  color: #6366F1;
  margin-bottom: 0.5rem;
}

.contact {
  background: #222;
  color: white;
}

.contact h2 {
  color: white;
}`,
      },
      {
        path: 'script.js',
        content: `// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Add scroll animation for sections
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.querySelectorAll('.about, .projects, .contact').forEach(section => {
  section.style.opacity = '0';
  section.style.transform = 'translateY(30px)';
  section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(section);
});`,
      },
    ],
    summary: "I've created a modern personal portfolio website with a gradient hero section, fixed navigation, about section, project showcase grid, and contact section. The design uses a purple gradient theme with smooth scroll animations.",
    nextSteps: [
      "Make it more premium",
      "Add a dark mode toggle",
      "Add more project cards with images",
      "Add a contact form",
      "Add a pricing section",
    ],
  };
}

// Mock dark mode edit
function getMockDarkModeEdit(files: ProjectFile[]): AIGenerationResponse {
  const cssFile = files.find(f => f.path === 'style.css');
  
  return {
    files: [
      {
        path: 'style.css',
        content: cssFile ? cssFile.content.replace("background: #f8f9fa;", "background: #0A0A0F;").replace("color: #333;", "color: #F0F0F5;").replace("background: white;", "background: #12121A;").replace("color: #555;", "color: #8A8AA0;").replace("color: #222;", "color: #F0F0F5;").replace("box-shadow: 0 2px 10px rgba(0,0,0,0.1);", "box-shadow: 0 2px 10px rgba(0,0,0,0.3);") + "\n\n/* Dark mode enhancements */\nbody {\n  background: #0A0A0F;\n  color: #F0F0F5;\n}\n\n.navbar {\n  background: rgba(18, 18, 26, 0.95);\n  backdrop-filter: blur(10px);\n  border-bottom: 1px solid #2A2A3A;\n}\n\n.project-card {\n  background: #12121A;\n  border: 1px solid #2A2A3A;\n}\n\n.about h2, .projects h2 {\n  color: #F0F0F5;\n}" : '',
      },
    ],
    summary: "I've converted your portfolio to a sleek dark mode theme with enhanced contrast and subtle glass effects on the navigation.",
    nextSteps: [
      "Add a light/dark toggle switch",
      "Add more premium animations",
      "Add a hero background image",
    ],
  };
}

// Mock pricing section addition
function getMockPricingAdd(files: ProjectFile[]): AIGenerationResponse {
  const hasUsableSite = files.some(file => file.path === 'index.html' && file.content.trim());
  const seedFiles = hasUsableSite
    ? files
    : getMockPortfolioResponse().files.map((file) => ({
        id: `seed_${file.path}`,
        path: file.path,
        content: file.content,
        type: file.path.endsWith('.css') ? 'css' as const : file.path.endsWith('.js') ? 'js' as const : 'html' as const,
      }));
  const indexFile = seedFiles.find(f => f.path === 'index.html');
  const cssFile = seedFiles.find(f => f.path === 'style.css');
  const baseHtml = indexFile?.content || getMockPortfolioResponse().files[0].content;
  const baseCss = cssFile?.content || getMockPortfolioResponse().files[1].content;

  return {
    files: [
      {
        path: 'index.html',
        content: baseHtml.replace(
          '</section>\n  <section id="contact"',
          '</section>\n  <section id="pricing" class="pricing">\n    <h2>Pricing</h2>\n    <div class="pricing-grid">\n      <div class="pricing-card">\n        <h3>Free</h3>\n        <div class="price">$0</div>\n        <ul>\n          <li>5 projects</li>\n          <li>Basic templates</li>\n          <li>Community support</li>\n        </ul>\n        <button>Get Started</button>\n      </div>\n      <div class="pricing-card featured">\n        <h3>Pro</h3>\n        <div class="price">$19<span>/mo</span></div>\n        <ul>\n          <li>Unlimited projects</li>\n          <li>Premium templates</li>\n          <li>Priority support</li>\n          <li>Custom domains</li>\n        </ul>\n        <button>Upgrade Now</button>\n      </div>\n    </div>\n  </section>\n  <section id="contact"'
        ),
      },
      {
        path: 'style.css',
        content: baseCss + `\n\n.pricing {\n  padding: 5rem 10%;\n  text-align: center;\n  background: #0A0A0F;\n}\n\n.pricing h2 {\n  font-size: 2.5rem;\n  margin-bottom: 2rem;\n  color: #F0F0F5;\n}\n\n.pricing-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 2rem;\n  max-width: 800px;\n  margin: 0 auto;\n}\n\n.pricing-card {\n  background: #12121A;\n  border: 1px solid #2A2A3A;\n  border-radius: 16px;\n  padding: 2.5rem 2rem;\n  transition: transform 0.3s, box-shadow 0.3s;\n}\n\n.pricing-card:hover {\n  transform: translateY(-5px);\n  box-shadow: 0 20px 40px rgba(0,0,0,0.3);\n}\n\n.pricing-card.featured {\n  border-color: #6366F1;\n  position: relative;\n}\n\n.pricing-card.featured::before {\n  content: 'Popular';\n  position: absolute;\n  top: -12px;\n  left: 50%;\n  transform: translateX(-50%);\n  background: #6366F1;\n  color: white;\n  padding: 4px 16px;\n  border-radius: 20px;\n  font-size: 0.75rem;\n  font-weight: 600;\n}\n\n.pricing-card h3 {\n  font-size: 1.25rem;\n  color: #F0F0F5;\n  margin-bottom: 0.5rem;\n}\n\n.price {\n  font-size: 3rem;\n  font-weight: 700;\n  color: #6366F1;\n  margin-bottom: 1.5rem;\n}\n\n.price span {\n  font-size: 1rem;\n  color: #8A8AA0;\n  font-weight: 400;\n}\n\n.pricing-card ul {\n  list-style: none;\n  margin-bottom: 2rem;\n}\n\n.pricing-card ul li {\n  padding: 0.5rem 0;\n  color: #8A8AA0;\n}\n\n.pricing-card ul li::before {\n  content: '\\2713 ';\n  color: #4ADE80;\n  margin-right: 0.5rem;\n}\n\n.pricing-card button {\n  width: 100%;\n  padding: 0.875rem;\n  background: #6366F1;\n  color: white;\n  border: none;\n  border-radius: 8px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: background 0.3s;\n}\n\n.pricing-card button:hover {\n  background: #8183F4;\n}`,
      },
    ],
    summary: "I've added a pricing section with two tiers - Free and Pro. The Pro card is highlighted with the accent color and a 'Popular' badge.",
    nextSteps: [
      "Add a contact form section",
      "Add testimonials",
      "Add a FAQ section",
    ],
  };
}

// Main AI generation function
export async function generateWithAI(
  prompt: string,
  _existingFiles: ProjectFile[],
  _conversationHistory: { role: string; content: string }[] = []
): Promise<AIGenerationResponse> {
  // Keep the local mock path snappy so the free builder flow feels immediate.
  await new Promise(resolve => setTimeout(resolve, 350));

  const lowerPrompt = prompt.toLowerCase();

  // Route to appropriate mock response based on prompt
  if (lowerPrompt.includes('dark mode') || lowerPrompt.includes('dark theme') || lowerPrompt.includes('convert to dark')) {
    return getMockDarkModeEdit(_existingFiles);
  }
  if (lowerPrompt.includes('pricing') || lowerPrompt.includes('pricing section') || lowerPrompt.includes('add pricing')) {
    return getMockPricingAdd(_existingFiles);
  }
  if (lowerPrompt.includes('premium') || lowerPrompt.includes('better') || lowerPrompt.includes('improve')) {
    const base = getMockPortfolioResponse();
    base.summary = "I've enhanced your portfolio with premium styling - improved typography, added subtle animations, and refined the color palette for a more polished look.";
    base.nextSteps = ["Add a hero background image", "Add a contact form", "Add more interactive elements"];
    return base;
  }
  if (lowerPrompt.includes('contact form') || lowerPrompt.includes('add contact')) {
    const base = getMockPortfolioResponse();
    base.files[0].content = base.files[0].content.replace(
      '<section id="contact" class="contact">\n    <h2>Get In Touch</h2>\n    <p>Email: hello@example.com</p>\n  </section>',
      `<section id="contact" class="contact">
    <h2>Get In Touch</h2>
    <form class="contact-form">
      <input type="text" placeholder="Your Name" required>
      <input type="email" placeholder="Your Email" required>
      <textarea placeholder="Your Message" rows="4" required></textarea>
      <button type="submit">Send Message</button>
    </form>
  </section>`
    );
    base.files[1].content += `\n\n.contact-form {\n  max-width: 500px;\n  margin: 0 auto;\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n\n.contact-form input,\n.contact-form textarea {\n  padding: 0.875rem 1rem;\n  border: 1px solid #2A2A3A;\n  border-radius: 8px;\n  background: #12121A;\n  color: #F0F0F5;\n  font-family: inherit;\n}\n\n.contact-form input:focus,\n.contact-form textarea:focus {\n  outline: none;\n  border-color: #6366F1;\n}\n\n.contact-form button {\n  padding: 0.875rem;\n  background: #6366F1;\n  color: white;\n  border: none;\n  border-radius: 8px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: background 0.3s;\n}\n\n.contact-form button:hover {\n  background: #8183F4;\n}`;
    base.summary = "I've added a fully styled contact form with name, email, and message fields that match your portfolio's dark theme.";
    base.nextSteps = ["Add form validation with JavaScript", "Add a success message after submission", "Connect to a backend service"];
    return base;
  }

  // Default: generate a portfolio
  return getMockPortfolioResponse();
}
