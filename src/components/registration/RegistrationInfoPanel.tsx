import {
  CheckCircle2,
  ClipboardCheck,
  IdCard,
  Mail,
  ShieldCheck,
} from "lucide-react";

const APPROVAL_STEPS = [
  {
    title: "1. Submit Registration",
    description:
      "Complete your details and attach a clear photo of your DNSC Student ID.",
  },
  {
    title: "2. Administrator Verification",
    description:
      "Your registration enters pending approval while an authorized administrator verifies your identity.",
  },
  {
    title: "3. Email Notification",
    description:
      "You will receive an email notice at your DNSC email account once approved or if corrections are needed.",
  },
] as const;

export function RegistrationInfoPanel() {
  return (
    <aside
      aria-label="Registration and account approval information"
      className="space-y-6"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#246B45]/25 bg-[#E6EFE8] px-3 py-1 text-xs font-semibold text-[#174D32]">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Admin Approval Required</span>
        </div>

        <h2 className="mt-4 text-lg font-bold text-[#25352B]">
          How Account Approval Works
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          To protect academic records, every new requester registration is
          reviewed by an authorized administrator before portal access is
          activated.
        </p>

        <ol className="mt-5 space-y-4">
          {APPROVAL_STEPS.map((step) => (
            <li key={step.title} className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-[#25352B]">
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-[#246B45]/20 bg-[#E6EFE8]/55 p-6">
        <h2 className="text-sm font-bold text-[#25352B]">
          Important Account Notes
        </h2>

        <ul className="mt-4 space-y-3.5 text-xs leading-relaxed text-slate-700">
          <li className="flex items-start gap-2.5">
            <IdCard
              className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold text-[#25352B]">
                Student ID Number is your login username:
              </strong>{" "}
              Once approved, you will sign in using your Student ID Number
              (e.g., 2021-00440) and your password.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <Mail
              className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold text-[#25352B]">
                DNSC Email is for notifications:
              </strong>{" "}
              Approval updates, correction requests, and future document status
              notices will be sent via email.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <ClipboardCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold text-[#25352B]">
                Clear Student ID photo:
              </strong>{" "}
              Make sure your name, photo, and Student ID Number are legible
              (JPG, JPEG, or PNG, max 5 MB).
            </span>
          </li>
        </ul>
      </div>
    </aside>
  );
}
