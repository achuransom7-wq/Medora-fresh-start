import { Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta';

export default function NotFoundPage() {
  usePageMeta({ title: 'Page not found', noindex: true });
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="font-display text-6xl font-semibold text-brand-text">404</p>
      <h1 className="mt-3 font-display text-2xl font-semibold text-ink">We can't find that page</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">The link may be broken or the page may have moved.</p>
      <Link to="/" className="btn btn-primary mt-6">Go to Medora</Link>
    </main>
  );
}
