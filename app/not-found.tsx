
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <>
      
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md">
        <div className="mb-8 text-8xl font-bold text-muted-foreground/20">404</div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">Page Not Found</h1>
        <p className="mb-8 text-lg text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Go Home
          </Link>
          <Link
            href="/builder"
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