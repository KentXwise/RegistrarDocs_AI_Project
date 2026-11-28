import type {
  BenefitItem,
  DocumentExample,
  FaqItem,
  NavItem,
  WorkflowStep,
} from "@/types/landing";

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/#top" },
  { label: "Documents", href: "/#documents" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "FAQs", href: "/#faqs" },
];

export const DOCUMENT_EXAMPLES: DocumentExample[] = [
  {
    id: "tor",
    title: "Transcript of Records",
    description:
      "Official academic record summarizing completed courses, earned credits, and grades across terms.",
    note: "Typically requested for employment, transfer, board exams, or graduate studies.",
    icon: "file-text",
  },
  {
    id: "coe",
    title: "Certificate of Enrollment",
    description:
      "Formal verification confirming a student's current or prior enrollment status for a given term.",
    note: "Commonly used for scholarships, financial assistance, or institutional verification.",
    icon: "file-badge",
  },
  {
    id: "diploma",
    title: "Diploma & Graduation Documents",
    description:
      "Documents confirming degree completion, graduation credentials, and related certifications.",
    note: "Availability and issuance rules depend on Registrar's Office guidelines.",
    icon: "graduation-cap",
  },
  {
    id: "other",
    title: "Other Registrar's Office Documents",
    description:
      "Additional certifications and academic records issued through the Registrar's Office.",
    note: "Specific document types and eligibility criteria will be confirmed by the office.",
    icon: "folder-open",
  },
];

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    number: "01",
    title: "Create an Account",
    description:
      "Register for a requester account to access the portal and manage your document requests.",
    icon: "user-plus",
  },
  {
    number: "02",
    title: "Choose Your Document",
    description:
      "Select the academic document you need and review its listed requirements before applying.",
    icon: "file-search",
  },
  {
    number: "03",
    title: "Submit and Track",
    description:
      "Submit your request online and monitor status updates as it moves through review and preparation.",
    icon: "send",
  },
  {
    number: "04",
    title: "Collect Your Document",
    description:
      "Follow the release and collection instructions once your requested document is ready.",
    icon: "package-check",
  },
];

export const BENEFITS: BenefitItem[] = [
  {
    id: "clear-requirements",
    title: "Clear Requirements",
    description:
      "Designed to present document checklists and preparation reminders upfront so requesters know what to bring or submit.",
    icon: "clipboard-list",
  },
  {
    id: "convenient-submission",
    title: "Convenient Online Submission",
    description:
      "Intended to allow students and alumni to initiate document requests from anywhere without filling out paper slips first.",
    icon: "laptop",
  },
  {
    id: "progress-visibility",
    title: "Request Progress Visibility",
    description:
      "Planned to provide clear status milestones so requesters can check where their request stands at each stage.",
    icon: "activity",
  },
  {
    id: "fewer-trips",
    title: "Fewer Unnecessary Trips",
    description:
      "Aims to help requesters avoid repeated in-person follow-ups by clarifying readiness before visiting the office.",
    icon: "footprints",
  },
  {
    id: "centralized-info",
    title: "Centralized Information",
    description:
      "Brings general document descriptions, workflow guidance, and release reminders together in one accessible portal.",
    icon: "book-open",
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "what-is",
    question: "What is RegistrarDocs AI?",
    answer:
      "RegistrarDocs AI is a web-based Registrar's Office document request and release management portal currently being developed, with Davao del Norte State College (DNSC) as its pilot institution. It is designed to help requesters review requirements, submit requests online, and follow request progress in one place.",
  },
  {
    id: "who-can-use",
    question: "Who can use the portal?",
    answer:
      "The portal is intended for students, graduates, alumni, and other authorized requesters who need academic records, as well as Registrar's Office staff managing document requests. Final eligibility and account verification policies must be confirmed by the Registrar's Office.",
  },
  {
    id: "what-documents",
    question: "What documents can I request?",
    answer:
      "Illustrative examples include Transcript of Records, Certificate of Enrollment, Diploma or Graduation Documents, and other certifications. The official list of available documents, fees, and specific requirements must be confirmed by the Registrar's Office before full deployment.",
  },
  {
    id: "how-to-submit",
    question: "How do I submit a document request?",
    answer:
      "Once the upcoming account and request milestones are completed, requesters will be able to sign in, choose a document, review requirements, and submit a request through the portal. Online request submission is not yet active in this initial milestone.",
  },
  {
    id: "how-to-track",
    question: "How can I track my request?",
    answer:
      "Request tracking will be introduced in upcoming development milestones once user accounts and request submission are implemented. Requesters will then be able to view status updates from submission through document release.",
  },
  {
    id: "visit-office",
    question: "Do I still need to visit the Registrar's Office?",
    answer:
      "In-person visits may still be required for identity verification, submitting original clearances, payment procedures, or claiming physical documents. Official claiming and release procedures must be confirmed by the Registrar's Office.",
  },
  {
    id: "have-questions",
    question: "What should I do if I have questions?",
    answer:
      "For official academic record policies, fees, or urgent document needs, please reach out directly to your institution's Registrar's Office through its official channels. Verified portal support details will be published once confirmed.",
  },
];
