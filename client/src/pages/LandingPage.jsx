import { Link } from 'react-router-dom';
import { HeartPulse, ShieldAlert, ClipboardList, Languages, MessageCircle, Activity, Lock } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';

const STEPS = [
  { icon: MessageCircle, title: 'Describe how you feel', text: 'Chat in English, French or Pidgin. Add a photo if it helps.' },
  { icon: ShieldAlert, title: 'Get a clear next step', text: 'Every reply is labelled self-care, monitor, see a doctor, or urgent.' },
  { icon: ClipboardList, title: 'Keep your health notes', text: 'Save your profile, vitals and visit summaries to share with a clinician.' },
];

const FEATURES = [
  { icon: HeartPulse, title: 'Symptom guidance', text: 'Plain-language information on possible causes and what to do next. Never a diagnosis.' },
  { icon: ShieldAlert, title: 'Urgent-risk triage', text: 'Warning signs such as chest pain or trouble breathing are always flagged as urgent.' },
  { icon: Languages, title: 'Made for Cameroon', text: 'English, French and Pidgin, with guidance that considers conditions common in the region.' },
  { icon: Activity, title: 'Health trends', text: 'Log weight, blood pressure, temperature and more, and see how they change over time.' },
  { icon: Lock, title: 'You stay in control', text: 'Edit or delete your health details, memories and entire account at any time.' },
];

const FAQ = [
  { q: 'Is Medora free?', a: 'Yes. Medora is a free health assistant. There are no payments or subscriptions.' },
  { q: 'Does Medora diagnose conditions?', a: 'No. Medora gives general health guidance and helps you decide how urgently to seek care. It is not a doctor and does not replace one.' },
  { q: 'What should I do in an emergency?', a: 'Go to the nearest hospital or call local emergency services right away. Do not wait for a chat reply.' },
  { q: 'Which languages does Medora support?', a: 'English, French and Cameroonian Pidgin.' },
  { q: 'Is my health information private?', a: 'Your information is tied to your account and you can delete it at any time. Read the Privacy Policy for details on how it is handled.' },
];

export default function LandingPage() {
  usePageMeta({
    description: 'Medora is a free AI health assistant for Cameroon. Describe your symptoms in English, French or Pidgin, get clear next steps and urgent-risk triage.',
  });

  return (
    <div className="min-h-dvh bg-cloud">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Medora home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-deep font-display font-semibold text-white">M</span>
          <span className="font-display text-xl font-semibold text-teal-deep">Medora</span>
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link to="/login" className="btn btn-secondary">Sign in</Link>
          <Link to="/register" className="btn btn-primary hidden sm:inline-flex">Get started</Link>
        </nav>
      </header>

      <main id="main">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-96 bg-[radial-gradient(60%_60%_at_50%_0%,rgb(22_122_111/0.16),transparent)]" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-10 text-center sm:px-6 sm:pt-16">
            <p className="mx-auto mb-4 inline-flex rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-teal-deep">Free AI health assistant for Cameroon</p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">Calm, clear health guidance whenever you need it</h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
              Describe your symptoms, understand how urgent they are, and keep your health notes in one place. In English, French or Pidgin.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link to="/register" className="btn btn-primary px-6">Start for free</Link>
              <Link to="/login" className="btn btn-secondary px-6">I already have an account</Link>
            </div>
            <p className="mt-5 text-xs text-ink-soft">Medora gives general guidance and is not a substitute for a doctor. In an emergency, go to the nearest hospital.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-center font-display text-2xl font-semibold text-ink sm:text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="card">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-mint text-teal-deep"><Icon size={20} /></span>
                <h3 className="font-semibold text-ink">{index + 1}. {title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-center font-display text-2xl font-semibold text-ink sm:text-3xl">Built to be safe and useful</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="card">
                <Icon size={20} className="mb-3 text-teal-mid" />
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-center font-display text-2xl font-semibold text-ink sm:text-3xl">Frequently asked questions</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="card group !p-0">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-medium text-ink">
                  {q}
                  <span aria-hidden="true" className="text-teal-mid transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-xs text-ink-soft sm:flex-row sm:px-6">
          <p>&copy; {new Date().getFullYear()} Medora. Not a substitute for professional medical care.</p>
          <nav aria-label="Legal policies" className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <Link to="/legal/privacy" className="underline underline-offset-4">Privacy</Link>
            <Link to="/legal/terms" className="underline underline-offset-4">Terms</Link>
            <Link to="/legal/cookies" className="underline underline-offset-4">Cookies</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
