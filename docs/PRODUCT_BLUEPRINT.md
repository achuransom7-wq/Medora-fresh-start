# What a health assistant app needs, and where Medora stands

Design principles applied (drawn from public healthcare UX guidance): calm, trustworthy colour; red reserved for
genuine urgency; critical alerts carry an icon and text, not colour alone; low cognitive load; restrained motion;
strong contrast; consistent components; plain language.

Status: **Built**, **Partial**, **Missing**.

## Safety and trust
| Capability | Status | Notes |
|---|---|---|
| Red-flag emergency check before any reply | Built | English keywords only. Add French and Pidgin phrases. |
| Urgency levels with icon + text + colour | Built | Self-care, Monitor, See a doctor, Urgent |
| One-tap emergency help (119 / 117 / 118) | Built | Header button and urgent-message card |
| Model cannot downgrade urgency | Built | Floor from dataset and red-flag check |
| Clear "not a doctor" framing | Built | Landing, chat footer, persona |
| Self-harm response protocol | Partial | Prompt guidance only. Add a dedicated crisis path and local helplines. |
| Clinician review of content | Missing | Have a clinician review the dataset, prompt and red-flag list |

## Conversation intelligence
| Capability | Status | Notes |
|---|---|---|
| Natural conversation, small talk | Built | Needs a connected language model (docs/LLM_SETUP.md) |
| Uses profile, memories and recent history | Built | Latest 20 messages (a bug loaded the oldest before) |
| Follow-up suggestion chips | Built | |
| Markdown answers, copy button | Built | |
| Photo understanding | Partial | Only with a vision-capable model (`LLM_VISION=true`) |
| Streaming replies | Missing | Replies appear when complete. Worth adding for perceived speed. |
| Evaluation set for answer quality | Missing | 50-100 scripted cases, rerun on each prompt or model change |

## Personal health record
| Capability | Status | Notes |
|---|---|---|
| Profile (allergies, conditions, meds, blood type, emergency contact) | Built | Atomic save, validation, unsaved-changes bar |
| Vitals tracking and trends | Built | |
| Consultation summary PDF | Built | |
| Medication and appointment reminders | Missing | Needs notifications (push or SMS) |
| Document upload and explanation | Partial | Upload exists; quality depends on the model |

## Care navigation
| Capability | Status | Notes |
|---|---|---|
| Referral requests | Partial | No verified provider directory is loaded |
| Nearby clinics and pharmacies | Missing | Needs a verified dataset or maps integration |

## Accounts and privacy
| Capability | Status | Notes |
|---|---|---|
| Consent capture, delete account, delete data | Built | |
| Password reset and email verification | **Missing** | Highest priority gap: a locked-out user is stuck. Needs an email provider. |
| Two-factor sign-in | Missing | |
| Legal pages (privacy, terms, cookies) | Partial | Marked as drafts. Get local legal review. |

## Experience and inclusion
| Capability | Status | Notes |
|---|---|---|
| Responsive on phone, tablet, desktop | Built | Verified by automated checks |
| Light and dark mode | Built | |
| Accessibility basics (labels, focus, tap targets, reduced motion) | Built | Run a screen-reader pass before launch |
| Interface translated to French / Pidgin | Missing | Only the assistant's replies follow the language setting |
| Installable app (manifest, icons) | Built | No service worker yet, so no offline mode |
| Low-bandwidth friendliness | Partial | Code-split and compressed. Consider a service worker and image limits. |

## Operations
| Capability | Status | Notes |
|---|---|---|
| Health endpoints, graceful shutdown, retries on cold start | Built | Add an uptime pinger on `/healthz` |
| Automated browser tests | Built | `tests/e2e`, see docs/TESTING.md |
| Unit/API tests, CI pipeline | Missing | |
| Error monitoring and usage analytics | Missing | Add privacy-respecting monitoring |
| Database backups | Missing | Confirm Turso backup/restore for patient data |
