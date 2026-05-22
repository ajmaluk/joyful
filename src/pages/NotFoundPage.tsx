import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | Joyful AI Website Builder</title>
        <meta name="description" content="The page you're looking for doesn't exist or has been moved. Return to Joyful's homepage or open the builder." />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://joyful.ai/" />
      </Helmet>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md">
        <div className="mb-8 text-8xl font-bold text-muted-foreground/20">404</div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">Page Not Found</h1>
        <p className="mb-8 text-lg text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Go Home
          </Link>
          <Link
            to="/builder"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Open Builder
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}

export default NotFoundPage;