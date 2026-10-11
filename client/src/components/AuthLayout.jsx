import PulseDivider from './PulseDivider';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex bg-cloud">
      {/* Left visual panel - health-forward first impression */}
      <div className="hidden lg:flex lg:w-1/2 bg-teal-deep relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '28px 28px'
        }} />
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <span className="text-white font-display font-semibold">M</span>
          </div>
          <span className="text-white font-display font-semibold text-xl">Medora</span>
        </div>

        <div className="relative z-10">
          <h2 className="font-display text-4xl leading-tight text-white font-medium mb-4">
            Calm, clear guidance<br />whenever you need it.
          </h2>
          <p className="text-mint/80 text-lg max-w-md">
            Describe your symptoms, get grounded next steps, and connect with a real doctor when it matters.
          </p>
          <div className="mt-8 max-w-xs">
            <PulseDivider color="rgba(255,255,255,0.35)" />
          </div>
        </div>

        <p className="relative z-10 text-mint/50 text-sm">Not a substitute for professional medical care.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <div className="w-8 h-8 rounded-lg bg-teal-deep flex items-center justify-center">
              <span className="text-white font-display font-semibold text-sm">M</span>
            </div>
            <span className="font-display font-semibold text-xl text-teal-deep">Medora</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">{title}</h1>
          <p className="text-ink-soft text-sm mb-7">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
