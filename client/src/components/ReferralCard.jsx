import { MapPin, Phone } from 'lucide-react';
import { severityStyle } from './SeverityBadge';

export default function ReferralCard({ suggestion, onBook, bookingId }) {
  if (!suggestion) return null;
  const s = severityStyle('see_doctor');

  return (
    <div className={`rounded-2xl border ${s.bg} border-orange-alert/20 p-4 animate-fade-in-up`}>
      <p className="text-sm font-medium text-ink mb-3">
        {suggestion.doctors?.length
          ? `Nearby ${suggestion.specialty.toLowerCase()} options you could reach out to:`
          : 'No verified provider listings are currently available in Medora. For urgent symptoms, seek care at a nearby emergency facility.'}
      </p>
      {suggestion.doctors?.length > 0 && <div className="space-y-2.5">
        {suggestion.doctors.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl p-3 border border-line flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-ink text-sm">{doc.full_name}</p>
              <p className="text-xs text-ink-soft mt-0.5">{doc.specialty} · {doc.clinic_name}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-soft">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {doc.city}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {doc.phone && (
                <a
                  href={`tel:${doc.phone}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline"
                >
                  <Phone size={12} /> Call
                </a>
              )}
              <button
                onClick={() => onBook(doc)}
                disabled={bookingId === doc.id}
                className="text-xs font-medium bg-teal-deep text-white px-2.5 py-1 rounded-full hover:bg-teal-mid transition-colors disabled:opacity-50"
              >
                {bookingId === doc.id ? 'Requesting…' : 'Request referral'}
              </button>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
