import { Link, Navigate, useLocation } from 'react-router-dom';

const policies = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'Information Medora handles',
        paragraphs: [
          'Account information includes your name, email address, and password hash. Phone number, city, and region are optional profile details.',
          'If you use the health features, Medora stores your messages and replies, conversation titles, uploaded file names and files, optional health-profile details, saved memories, vitals, preferences, and referral requests.',
          'The service and its hosting provider may process operational request data such as IP address, browser details, and request time in server or platform logs. The source code currently includes no analytics or advertising tracker.',
        ],
      },
      {
        heading: 'How information is used and shared',
        paragraphs: [
          'Information is used to create and secure your account, provide the features you request, keep your saved health records, and respond to service errors.',
          'When Anthropic AI is enabled, your current message and relevant conversation history may be sent to Anthropic. The app may also send relevant health-profile details, saved memories, and attached images for a response. Research requests may include the question and relevant conversation context and use Anthropic web search.',
          'When Ollama mode is enabled, prompts, conversation history, and supported attachments are sent to the Ollama endpoint configured by the operator. “Local” only means local if that endpoint is actually operated on the same trusted machine or network.',
          'If you use voice dictation, your browser’s Web Speech implementation may send audio to a speech-recognition provider chosen by your browser or operating-system vendor. Dictation is optional; check that provider’s privacy terms before using it.',
          'The application host can store or process application data according to the deployment configuration. Research results may link to third-party websites; opening a link shares information with that website under its own practices. Referral requests are saved in Medora; this build does not automatically send them to a clinic.',
        ],
      },
      {
        heading: 'Cookies and security',
        paragraphs: [
          'Medora uses an HttpOnly refresh-token cookie to maintain your signed-in session. It is configured as Secure in production, SameSite=Lax, and expires after 30 days. The short-lived access token is held in memory by the app. See the Cookie Policy for details.',
          'Passwords are stored as bcrypt hashes. No internet service can promise perfect security; deployment security, encryption at rest, backups, and access controls depend on the operator and hosting configuration.',
        ],
      },
      {
        heading: 'Retention and account deletion',
        paragraphs: [
          'Account and linked application records are retained until you delete your account. Use Profile → Delete my account to request deletion; the server removes linked database records and attempts to delete uploaded files. Hosting logs and backups may remain according to the host’s retention schedule, which must be configured by the operator.',
          'You can remove individual conversations and saved memories in the app. Do not upload information you do not have permission to share.',
        ],
      },
      {
        heading: 'Your choices and contact',
        paragraphs: [
          'You can leave optional profile and health fields blank and delete your account from Profile. Deleting the account removes linked app records, but cannot control provider-side retention or copies held in hosting backups and logs. The project has not provided a verified privacy contact or legal operator identity; those details must be added before public launch.',
          'Medora is aimed at users in Cameroon, but this draft has not been reviewed for compliance with Cameroon’s current privacy, health, consumer, or cross-border transfer requirements. Obtain local legal advice and verify each provider’s terms and data location before launch.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    sections: [
      {
        heading: 'What Medora provides',
        paragraphs: [
          'Medora provides general health information and organizational tools. It is an AI-supported software service, not a clinician, medical device, emergency service, or substitute for professional medical advice, diagnosis, or treatment.',
          'AI output can be incomplete, inaccurate, or delayed. Do not rely on it alone to make health decisions, change treatment, or delay professional care. For a medical emergency, seek immediate help from a local emergency service or facility.',
        ],
      },
      {
        heading: 'Accounts and health information',
        paragraphs: [
          'Provide an email address you control and keep your credentials private. You are responsible for information you choose to enter or upload and should only share files you are authorized to provide.',
          'You may leave optional profile fields blank and can delete your account from Profile. Read the Privacy Policy to understand storage, AI-provider sharing, and deletion limits.',
        ],
      },
      {
        heading: 'Referrals and availability',
        paragraphs: [
          'The current build has no verified provider directory configured. It cannot confirm a provider’s identity, availability, qualifications, contact details, or suitability. Do not treat a referral option as a confirmed appointment or endorsement.',
        ],
      },
      {
        heading: 'Availability and changes',
        paragraphs: [
          'Features may be changed or unavailable. This project does not promise uninterrupted access or a particular medical outcome. These draft terms need review by the legal operator and qualified counsel in the jurisdictions where Medora is offered.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    sections: [
      {
        heading: 'Essential session cookie',
        paragraphs: [
          'The application sets a medora_refresh cookie to keep your account signed in. It is HttpOnly, uses SameSite=Lax, is marked Secure in production, is limited to the authentication API path, and has a 30-day maximum age. The app does not use this cookie for advertising.',
          'The application source currently has no analytics or advertising cookies and no optional tracking cookies. If optional cookies or trackers are added, the operator must reassess consent requirements and implement consent before they run.',
        ],
      },
      {
        heading: 'Browser controls',
        paragraphs: [
          'Blocking cookies may prevent sign-in from being restored after a page reload. Cookie rules vary by jurisdiction; this draft requires review for the places where the service is offered.',
        ],
      },
    ],
  },
  refunds: {
    title: 'Refund Policy',
    sections: [
      {
        heading: 'No paid services in this build',
        paragraphs: [
          'The current Medora application has no checkout, paid subscription, or payment processor. It does not collect payment through the app, so there are currently no app purchases or app refunds to process.',
          'If you believe you were charged in connection with Medora, do not share card details in chat. The project has not supplied a verified business identity or support contact; that information must be published before any paid offering is introduced.',
          'A paid feature must not launch until the operator publishes a complete, legally reviewed pricing, cancellation, and refund policy for each market where it is offered.',
        ],
      },
    ],
  },
};

export default function LegalPage() {
  const { pathname } = useLocation();
  const slug = pathname.split('/').filter(Boolean).at(-1);
  const policy = policies[slug];

  if (!policy) return <Navigate to="/legal/privacy" replace />;

  return (
    <main className="min-h-screen bg-cloud px-4 py-8 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-10">
        <Link to="/login" className="text-sm font-medium text-teal-deep underline underline-offset-4">
          Back to Medora
        </Link>
        <p className="mt-6 rounded-lg border border-orange-ink/30 bg-orange-soft p-4 text-sm text-orange-ink" role="note">
          Draft for review: the project has not provided a verified legal operator name, business address, or privacy contact. Add those details and obtain qualified local legal review before public launch. This page does not certify legal compliance.
        </p>
        <h1 className="mt-6 font-display text-3xl font-semibold text-ink">{policy.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">Version 1.0 · 11 October 2026</p>
        <div className="mt-8 space-y-7">
          {policy.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-semibold text-ink">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-2 text-sm leading-6 text-ink-soft">{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
        <nav aria-label="Legal policies" className="mt-10 flex flex-wrap gap-x-5 gap-y-3 border-t border-line pt-5 text-sm">
          <Link to="/legal/privacy" className="font-medium text-teal-deep underline underline-offset-4">Privacy</Link>
          <Link to="/legal/terms" className="font-medium text-teal-deep underline underline-offset-4">Terms</Link>
          <Link to="/legal/cookies" className="font-medium text-teal-deep underline underline-offset-4">Cookies</Link>
          <Link to="/legal/refunds" className="font-medium text-teal-deep underline underline-offset-4">Refunds</Link>
        </nav>
      </article>
    </main>
  );
}