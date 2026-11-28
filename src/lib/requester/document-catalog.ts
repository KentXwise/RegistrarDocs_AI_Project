export type DocumentTypeCode = string;

export interface DocumentCatalogItem {
  code: DocumentTypeCode;
  name: string;
  shortLabel: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  preparationReminders: string[];
  requiredRequesterInfo: string[];
  instructions: string[];
  requiresAdditionalNotes: boolean;
  additionalNotesLabel: string;
  additionalNotesPlaceholder: string;
}

/**
 * Controlled document catalog aligned with the proposal-scoped document types
 * already introduced in RegistrarDocs AI. Official fees, processing timelines,
 * and specific institutional clearances are intentionally NOT fabricated and
 * remain subject to confirmation by the DNSC Registrar's Office.
 */
export const DOCUMENT_CATALOG: readonly DocumentCatalogItem[] = [
  {
    code: "tor",
    name: "Transcript of Records",
    shortLabel: "TOR",
    category: "Academic Record",
    shortDescription:
      "Official academic record summarizing completed courses, earned credits, and grades across terms.",
    fullDescription:
      "The Transcript of Records (TOR) is an official institutional record of your completed coursework, academic units, and grades. It is typically requested for employment, transfer, board examinations, or graduate studies.",
    preparationReminders: [
      "Ensure your verified DNSC Student ID Number and account details are accurate.",
      "Specify the intended purpose of your request clearly for Registrar review.",
      "Official fees, clearance requirements, and processing schedules must be confirmed with the DNSC Registrar's Office.",
    ],
    requiredRequesterInfo: [
      "Verified Full Name and Student ID Number (reused from your approved account)",
      "Purpose of request (e.g., Employment, Board Exam, Transfer, Further Studies)",
      "Number of copies requested",
    ],
    instructions: [
      "Review these preparation reminders before submitting your request.",
      "Submit the form to receive a unique Request Reference Number.",
      "Registrar Staff will review your request and notify you of next steps or collection instructions.",
      "Bring valid identification when claiming your document for staff identity verification.",
    ],
    requiresAdditionalNotes: false,
    additionalNotesLabel: "Additional Details (Optional)",
    additionalNotesPlaceholder:
      "Optional: add relevant academic term, degree program, or remarks for Registrar Staff.",
  },
  {
    code: "coe",
    name: "Certificate of Enrollment",
    shortLabel: "COE",
    category: "Enrollment Certification",
    shortDescription:
      "Formal verification confirming a student's current or prior enrollment status for a given term.",
    fullDescription:
      "The Certificate of Enrollment (COE) formally verifies your enrollment status for a specific academic term. It is commonly requested for scholarships, financial assistance, or institutional verification.",
    preparationReminders: [
      "Indicate the relevant academic year or semester in the notes if applicable.",
      "State the exact purpose of the certification clearly.",
      "Final eligibility, applicable fees, and release schedules must be confirmed by the DNSC Registrar's Office.",
    ],
    requiredRequesterInfo: [
      "Verified Full Name and Student ID Number (reused from your approved account)",
      "Purpose of request (e.g., Scholarship, Financial Assistance, Verification)",
      "Number of copies requested",
    ],
    instructions: [
      "Review the reminders and enter your request purpose.",
      "Submit your request to receive a Request Reference Number.",
      "Wait for Registrar Staff verification and release updates before visiting the office.",
      "Present valid identification upon claiming.",
    ],
    requiresAdditionalNotes: false,
    additionalNotesLabel: "Academic Term / Additional Details (Optional)",
    additionalNotesPlaceholder:
      "Optional: specify the academic year/semester or recipient agency.",
  },
  {
    code: "diploma",
    name: "Diploma & Graduation Documents",
    shortLabel: "Diploma / Graduation",
    category: "Graduation Credential",
    shortDescription:
      "Documents confirming degree completion, graduation credentials, and related certifications.",
    fullDescription:
      "Covers requests related to degree completion credentials, graduation certifications, or duplicate/certified copies subject to DNSC Registrar's Office policies.",
    preparationReminders: [
      "Specify which graduation document or certification you are requesting in the details field.",
      "Availability, clearance prerequisites, and issuance rules depend on official DNSC Registrar's Office guidelines.",
      "Official processing timelines and fees must be confirmed by the Registrar's Office.",
    ],
    requiredRequesterInfo: [
      "Verified Full Name and Student ID Number (reused from your approved account)",
      "Purpose of request",
      "Number of copies requested",
    ],
    instructions: [
      "Review the document reminders and provide clear details about the graduation document needed.",
      "Submit the request to receive a unique Request Reference Number.",
      "Registrar Staff will review eligibility and notify you if additional documents or clearances are required.",
      "Present valid identification during in-person release verification.",
    ],
    requiresAdditionalNotes: false,
    additionalNotesLabel: "Document Details / Year Graduated (Optional)",
    additionalNotesPlaceholder:
      "Optional: specify the exact graduation document, degree program, or year graduated.",
  },
  {
    code: "other",
    name: "Other Registrar's Office Documents",
    shortLabel: "Other Certification",
    category: "General Registrar Record",
    shortDescription:
      "Additional certifications and academic records issued through the Registrar's Office.",
    fullDescription:
      "Use this option for other Registrar's Office certifications or academic records not listed separately above. Please describe the specific document you are requesting so Registrar Staff can review availability and requirements.",
    preparationReminders: [
      "Clearly name the specific certification or academic record in the details field.",
      "Availability, required clearances, and applicable fees will be confirmed by the DNSC Registrar's Office.",
      "Incomplete descriptions may require clarification before processing can begin.",
    ],
    requiredRequesterInfo: [
      "Verified Full Name and Student ID Number (reused from your approved account)",
      "Specific document name and details",
      "Purpose of request and number of copies",
    ],
    instructions: [
      "Clearly specify the exact document you are requesting.",
      "Review your summary and submit to receive a Request Reference Number.",
      "Registrar Staff will verify whether the requested document is available and provide further instructions.",
      "Present valid identification when claiming your document.",
    ],
    requiresAdditionalNotes: true,
    additionalNotesLabel: "Specific Document Name & Details",
    additionalNotesPlaceholder:
      "Specify the exact Registrar document or certification you are requesting.",
  },
];

export function getDocumentCatalogItem(
  code: string
): DocumentCatalogItem | undefined {
  return DOCUMENT_CATALOG.find((item) => item.code === code);
}
