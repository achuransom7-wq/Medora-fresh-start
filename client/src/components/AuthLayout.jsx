import { Link } from 'react-router-dom';
import { ShieldCheck, Languages, HeartPulse } from 'lucide-react';
import BrandMark from './BrandMark';
import ChatPreview from './ChatPreview';

const POINTS = [
  { Icon: HeartPulse, text: 'Safety checks run before every reply' },
  { Icon: Languages, text: 'English, French and Pidgin' },
  { Icon: ShieldCheck, text: 'Delete your data any time' },
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex lg:w-[48%]" style={{ background: 'var(--gradient-brand)' }}>
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '26px 26px' }} aria-hidden="true" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <Link to="/" className="relative z-10 flex items-center gap-3 text-white" aria-label="Medora home">
          <BrandMark size={40} className="bg-white/20 !shadow-none" />
          <span className="font-display text-xl font-extrabold">Medora</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-white">Calm, clear guidance whenever you need it.</h2>
          <ul className="mt-6 space-y-3">
            {POINTS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Icon size={18} /></span>
                {text}
              </li>
            ))}
          </ul>
          <ChatPreview className="mt-9 !shadow-2xl" />
        </div>

        <p className="relative z-10 text-sm text-white/75">Not a substitute for professional medical care.</p>
      </div>

      {/* Form panel */}
      <main id="main" className="flex flex-1 items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 lg:hidden" aria-label="Medora home">
            <BrandMark size={36} />
            <span className="font-display text-xl font-extrabold text-ink">Medora</span>
          </Link>
          <h1 className="font-display text-3xl font-extrabold text-ink">{title}</h1>
          <p className="mb-7 mt-1.5 text-sm text-ink-soft">{subtitle}</p>
          {children}
          <nav aria-label="Legal policies" className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
            <Link to="/legal/privacy" className="text-ink-soft underline underline-offset-4 hover:text-brand-text">Privacy</Link>
            <Link to="/legal/terms" className="text-ink-soft underline underline-offset-4 hover:text-brand-text">Terms</Link>
            <Link to="/legal/cookies" className="text-ink-soft underline underline-offset-4 hover:text-brand-text">Cookies</Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
