import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-[#ff7400] mb-4">404</p>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
        <p className="text-foreground/60 mb-8">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium px-6 py-3 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
          <Link
            to="/browse"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card hover:bg-accent/10 text-foreground font-medium px-6 py-3 transition-colors"
          >
            <Search className="h-4 w-4" />
            Browse Items
          </Link>
        </div>
      </div>
    </div>
  );
}
