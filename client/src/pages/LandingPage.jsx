import { Link } from 'react-router-dom';
import { MessageCircle, ShieldAlert, ClipboardList, Languages, Activity, Lock, Sparkles, ArrowRight, Phone, Check, Stethoscope } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';
import BrandMark from '../components/BrandMark';
import ChatPreview from '../components/ChatPreview';
import SeverityBadge from '../components/SeverityBadge';
import ThemeToggle from '../components/ThemeToggle';

const STEPS = [
  { title: 'Tell Medora what is going on', text: 'Type, speak or attach a photo, in English, French or Pidgin. You can also just say hello.' },
  { title: 'Get a clear, caring answer', text: 'Medora explains what could be happening and how urgent it is, in plain words.' },
  { title: 'Know your next step', text: 'Rest at home, watch closely, see a doctor, or get help now. Every reply says which.' },
];

const LEVELS = [
  { severity: 'self_care', text: 'You can manage this at home.' },
  { severity: 'monitor', text: 'Keep watch and act if it changes.' },
  { severity: 'see_doctor', text: 'Book a clinician within a day or two.' },
  { severity: 'urgent', text: 'Get care right now.' },
];

const FAQ = [
  { q: 'Is Medora free?', a: 'Yes. Medora is free to use, with no payments or subscriptions.' },
  { q: 'Does Medora diagnose conditions?', a: 'No. Medora gives general health guidance and helps you decide how urgently to seek care. It is not a doctor and does not replace one.' },
  { q: 'What should I do in an emergency?', a: 'Call 119 for medical emergencies in Cameroon, or go to the nearest hospital right away. Do not wait for a chat reply.' },
  { q: 'Which languages does Medora speak?', a: 'English, French and Cameroonian Pidgin. Just write in the one you prefer.' },
  { q: 'Is my health information private?', a: 'Your information is tied to your account, and you can edit or delete it, or your whole account, at any time. The Privacy Policy explains how it is handled.' },
];

const NAV = [
  ['how', 'How it works'],
  ['features', 'Features'],
  ['safety', 'Safety'],
  ['faq', 'FAQ'],
];

export default function LandingPage() {
  usePageMeta({
    description: 'Medora is a free AI health companion for Cameroon. Chat about symptoms and health questions in English, French or Pidgin, and get clear next steps with urgent-risk safety checks.',
  });

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="glass sticky top-0 z-30 border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Medora home">
            <BrandMark size={36} />
            <span className="font-display text-xl font-extrabold text-ink">Medora</span>
          </Link>
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block"><ThemeToggle /></div>
            <Link to="/login" className="btn btn-ghost !min-h-10">Sign in</Link>
            <Link to="/register" className="btn btn-primary !min-h-10 hidden sm:inline-flex">Get started</Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full opacity-40 blur-3xl" style={{ background: 'var(--c-brand)' }} aria-hidden="true" />
          <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ background: 'var(--c-accent)' }} aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-24 lg:pt-20">
            <div className="text-center lg:text-left">
              <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-brand-text shadow-sm lg:mx-0">
                <Sparkles size={14} /> Free · English · Français · Pidgin
              </p>
              <h1 className="font-display text-4xl font-extrabold leading-[1.08] text-ink sm:text-5xl lg:text-6xl">
                Your calm, <span className="text-gradient">intelligent</span> health companion
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-soft lg:mx-0">
                Talk to Medora about symptoms or any health question. Get clear answers, know how urgent things are, and keep your health notes in one place.
              </p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                <Link to="/register" className="btn btn-hero px-7 !min-h-12 text-base">Start chatting free <ArrowRight size={18} /></Link>
                <Link to="/login" className="btn btn-secondary px-7 !min-h-12 text-base">I have an account</Link>
              </div>
              <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-soft lg:justify-start">
                {['Safety checks on every message', 'No payments, ever', 'Delete your data any time'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><Check size={15} className="text-success" /> {t}</li>
                ))}
              </ul>
            </div>
            <div className="animate-float mx-auto w-full max-w-md lg:max-w-none"><ChatPreview /></div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6" aria-labelledby="how-heading">
          <p className="text-center text-sm font-bold uppercase tracking-widest text-brand-text">How it works</p>
          <h2 id="how-heading" className="mx-auto mt-2 max-w-2xl text-center font-display text-3xl font-extrabold text-ink sm:text-4xl">From worried to a clear plan in three steps</h2>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ title, text }, i) => (
              <li key={title} className="card relative">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl font-display text-lg font-extrabold text-white" style={{ background: 'var(--gradient-brand)' }}>{i + 1}</span>
                <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6" aria-labelledby="features-heading">
          <p className="text-center text-sm font-bold uppercase tracking-widest text-brand-text">Features</p>
          <h2 id="features-heading" className="mx-auto mt-2 max-w-2xl text-center font-display text-3xl font-extrabold text-ink sm:text-4xl">Everything you need, nothing you don't</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-6">
            <article className="card md:col-span-4">
              <MessageCircle className="mb-4 text-brand-text" size={26} />
              <h3 className="font-display text-xl font-bold text-ink">A real conversation, not a form</h3>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">Ask follow-ups, say hello, explain things your own way. Medora remembers the thread, uses your health profile, and answers like a knowledgeable friend.</p>
            </article>
            <article className="card md:col-span-2">
              <Languages className="mb-4 text-brand-text" size={26} />
              <h3 className="font-display text-xl font-bold text-ink">Speaks your language</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">English, French and Pidgin, with context for conditions common in Cameroon.</p>
            </article>
            <article className="card md:col-span-3">
              <ShieldAlert className="mb-4 text-brand-text" size={26} />
              <h3 className="font-display text-xl font-bold text-ink">Urgency, made obvious</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">Every health answer comes with a clear level, shown with an icon and words, never colour alone.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {LEVELS.map((l) => <SeverityBadge key={l.severity} severity={l.severity} />)}
              </div>
            </article>
            <article className="card md:col-span-3">
              <ClipboardList className="mb-4 text-brand-text" size={26} />
              <h3 className="font-display text-xl font-bold text-ink">Your health, in one place</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">Save allergies, conditions and medications once. Download a consultation summary to share with your doctor.</p>
            </article>
            <article className="card md:col-span-2">
              <Activity className="mb-4 text-brand-text" size={26} />
              <h3 className="font-display text-lg font-bold text-ink">Track your trends</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">Log weight, blood pressure, temperature and more.</p>
            </article>
            <article className="card md:col-span-2">
              <Stethoscope className="mb-4 text-brand-text" size={26} />
              <h3 className="font-display text-lg font-bold text-ink">Find care</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">Save referral requests when you need to see a clinician.</p>
            </article>
            <article className="card md:col-span-2">
              <Lock className="mb-4 text-brand-text" size={26} />
              <h3 className="font-display text-lg font-bold text-ink">You are in control</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">Edit or delete anything, or your whole account, any time.</p>
            </article>
          </div>
        </section>

        {/* Safety */}
        <section id="safety" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6" aria-labelledby="safety-heading">
          <div className="overflow-hidden rounded-[2rem] border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-danger-ink">Safety first</p>
              <h2 id="safety-heading" className="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">If it's an emergency, Medora says so immediately</h2>
              <p className="mt-4 leading-relaxed text-ink-soft">Warning signs like chest pain or trouble breathing are checked before anything else, and always point you to urgent care. Medora never replaces a doctor, and it will tell you when to see one.</p>
            </div>
            <div className="mt-8 space-y-3 lg:mt-0">
              {[['119', 'Medical emergency / ambulance'], ['117', 'Police'], ['118', 'Fire brigade']].map(([n, label], i) => (
                <a key={n} href={`tel:${n}`} className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${i === 0 ? 'border-danger bg-danger text-white' : 'border-line bg-surface-2 text-ink hover:bg-brand-soft'}`}>
                  <Phone size={18} />
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <span className="font-display text-2xl font-extrabold">{n}</span>
                </a>
              ))}
              <p className="text-xs text-ink-soft">Cameroon emergency numbers. Availability can vary by area.</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-16 sm:px-6" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-center font-display text-3xl font-extrabold text-ink sm:text-4xl">Questions, answered</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="card group !p-0">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-semibold text-ink">
                  {q}
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-text transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] px-6 py-14 text-center text-white sm:px-12" style={{ background: 'var(--gradient-brand)' }}>
            <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '26px 26px' }} aria-hidden="true" />
            <div className="relative">
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Feeling unsure? Ask Medora.</h2>
              <p className="mx-auto mt-3 max-w-md text-white/85">It takes a minute to start, and it's free.</p>
              <Link to="/register" className="btn mt-7 !min-h-12 bg-white px-8 text-base text-[#3342c9] hover:bg-white/90">Create your free account <ArrowRight size={18} /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-sm text-ink-soft sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark size={28} />
            <p>&copy; {new Date().getFullYear()} Medora. General guidance, not medical advice.</p>
          </div>
          <nav aria-label="Legal policies" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <Link to="/legal/privacy" className="hover:text-brand-text">Privacy</Link>
            <Link to="/legal/terms" className="hover:text-brand-text">Terms</Link>
            <Link to="/legal/cookies" className="hover:text-brand-text">Cookies</Link>
          </nav>
          <div className="sm:hidden"><ThemeToggle labelled /></div>
        </div>
      </footer>
    </div>
  );
}
