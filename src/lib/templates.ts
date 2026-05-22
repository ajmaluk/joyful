export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  files: Record<string, string>;
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'react-ts',
    name: 'React + TypeScript',
    description: 'Modern React app with TypeScript, hooks, and JSX support',
    files: {
      '/package.json': JSON.stringify({
        name: 'joyful-app',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: {
          react: '^19.2.0',
          'react-dom': '^19.2.0',
        },
      }, null, 2),
      '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Joyful App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`,
      '/src/main.tsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);`,
      '/src/App.tsx': `import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Hello from Joyful!</h1>
      <p>Start editing to build your app.</p>
    </div>
  );
}`,
    },
  },
  {
    id: 'vanilla-ts',
    name: 'Vanilla TypeScript',
    description: 'Simple TypeScript app without frameworks',
    files: {
      '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My App</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <div id="app">
    <h1>Hello!</h1>
    <p>Vanilla TypeScript app powered by Joyful.</p>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>`,
      '/style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; padding: 2rem; background: #fafafa; color: #1a1a1a; }
h1 { color: #6366f1; margin-bottom: 1rem; }`,
      '/src/main.ts': `document.querySelector('h1')?.addEventListener('click', () => {
  alert('Hello from Joyful!');
});

console.log('App started!');`,
    },
  },
  {
    id: 'react-router',
    name: 'React Router App',
    description: 'Multi-page React app with React Router for navigation',
    files: {
      '/package.json': JSON.stringify({
        name: 'joyful-router-app',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: {
          react: '^19.2.0',
          'react-dom': '^19.2.0',
          'react-router': '^7.6.1',
        },
      }, null, 2),
      '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Joyful App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`,
      '/src/main.tsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);`,
      '/src/App.tsx': `import React from 'react';
import { Routes, Route, Link } from 'react-router';
import Home from './pages/Home';
import About from './pages/About';

export default function App() {
  return (
    <div>
      <nav style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '1rem' }}>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
}`,
      '/src/pages/Home.tsx': `import React from 'react';

export default function Home() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Home</h1>
      <p>Welcome to your Joyful app!</p>
    </div>
  );
}`,
      '/src/pages/About.tsx': `import React from 'react';

export default function About() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>About</h1>
      <p>Built with Joyful AI Agent.</p>
    </div>
  );
}`,
    },
  },
];

export function getTemplate(id: string): ProjectTemplate | undefined {
  return TEMPLATES.find(t => t.id === id);
}
