import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useNavigation, useLocation } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect, useState } from 'react';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.ico',
    sizes: '48x48',
  },
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
    sizes: 'any',
  },
  {
    rel: 'icon',
    href: '/favicon-96x96.png',
    type: 'image/png',
    sizes: '96x96',
  },
  {
    rel: 'apple-touch-icon',
    href: '/apple-touch-icon.png',
    sizes: '180x180',
  },
  {
    rel: 'manifest',
    href: '/site.webmanifest',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

function LoadingScreen() {
  const navigation = useNavigation();
  const [initialLoading, setInitialLoading] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);
  const [fadeStyle, setFadeStyle] = useState('opacity-100 scale-100');

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const isLoading = initialLoading || navigation.state === 'loading';

  useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
      setFadeStyle('opacity-100 scale-100');
    } else {
      setFadeStyle('opacity-0 scale-95 pointer-events-none');
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#181816] flex items-center justify-center transition-all duration-300 ease-out ${fadeStyle}`}>
      <div className="flex flex-col items-center justify-center animate-pulse">
        <img
          src="/logo.png"
          alt="Joyful Logo"
          className="w-10 h-10 object-contain"
        />
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);
  const location = useLocation();

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!location.pathname.startsWith('/settings')) {
      sessionStorage.setItem('last_non_settings_path', location.pathname);
    }
  }, [location.pathname]);

  return (
    <>
      <LoadingScreen />
      {children}
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

export default function App() {
  return <Outlet />;
}

