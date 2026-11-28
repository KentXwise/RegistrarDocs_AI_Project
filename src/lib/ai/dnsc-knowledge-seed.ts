import type { KnowledgeSourceType } from "@/lib/db/admin-catalog";

export interface DnscKnowledgeSeedEntry {
  seedKey: string;
  title: string;
  category: string;
  sourceType: KnowledgeSourceType;
  sourceUrl: string;
  contentSummary: string;
  isEnabled: boolean;
  isVerified: boolean;
  lastVerifiedAt: string;
  documentTypeCode?: string | null;
  checklistVerified: boolean;
}

const REVIEW_DATE = "2026-11-27";

/**
 * Official DNSC Registrar knowledge entries strictly grounded on:
 * - https://dnsc.edu.ph/college-registrar/
 * - https://dnsc.edu.ph/downloads/
 * - https://dnsc.edu.ph/e-services/
 *
 * No fees, deadlines, or unverified document-specific checklists are fabricated.
 */
export const OFFICIAL_DNSC_KNOWLEDGE_SEED: readonly DnscKnowledgeSeedEntry[] = [
  {
    seedKey: "dnsc_entry_a_request_procedure",
    title: "General Request for Credentials Procedure",
    category: "Request procedures",
    sourceType: "registrar_procedure",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    contentSummary:
      "Official DNSC Request for Credentials general procedure:\n1. Access the official Request for Credentials form (or submit your request through RegistrarDocs AI).\n2. Complete all required fields accurately.\n3. Review your submitted information before submitting.\n4. Wait for the Registrar's response and further instructions.\n5. Follow the applicable requirements for the specific credential requested.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  {
    seedKey: "dnsc_entry_b_general_requirements",
    title: "General Requirements Mentioned by the DNSC Registrar",
    category: "Document requirements",
    sourceType: "document_requirements",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    contentSummary:
      "General instructions posted by the DNSC College Registrar state that requesters may be required to comply with (depending on the requested document and applicable checklist):\n- Original documents not previously submitted during enrollment, including SF 10 / OTR for DNSC where applicable.\n- Specific requirements according to the applicable document checklist.\n- Accomplished/approved student clearance for applicable transactions, including transfer, employment, graduation credentials, and specific legal purposes.\n- Request payment slip and official receipt.\n- Documentary stamps: one (1) documentary stamp per document, according to the posted instruction.\nIMPORTANT: Requirements depend on the specific document type and individual student record; not every requirement applies to every document or transaction.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  {
    seedKey: "dnsc_entry_c_incomplete_requirements",
    title: "Incomplete Requirements & Release Schedule Policy",
    category: "Request procedures",
    sourceType: "registrar_procedure",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    contentSummary:
      "Per the official DNSC Registrar guidelines: Incomplete requirements mean a release or claim schedule cannot be provided yet. Requesters must complete any missing requirements or corrections before a release schedule is issued.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  {
    seedKey: "dnsc_entry_d_payment_instructions",
    title: "Payment Information (Online & Over-the-Counter)",
    category: "Payment",
    sourceType: "registrar_procedure",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    contentSummary:
      "The official DNSC College Registrar page describes both online and over-the-counter payment processes, including LandBank Link.BizPortal instructions and payment confirmation procedures. Specific document fees, payment amounts, and deadlines are NOT listed in this summary and must be confirmed directly through the DNSC Registrar's Office or your official request payment slip.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  {
    seedKey: "dnsc_entry_e_collection_claiming",
    title: "Collection, Claim Stub & Online Appointment",
    category: "Collection and release",
    sourceType: "registrar_procedure",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    contentSummary:
      "When claiming your prepared documents at the DNSC Registrar's Office:\n- Present your request slip / student copy or claim stub.\n- Bring valid identification for staff identity verification.\n- The official DNSC Registrar page notes that an online appointment may be required and provides the appointment link; follow the currently posted Registrar instructions and the collection instructions sent with your Ready for Release update.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  {
    seedKey: "dnsc_entry_f_authorized_representative",
    title: "Claiming or Requesting Through an Authorized Representative (Local & Abroad)",
    category: "Authorized representatives",
    sourceType: "registrar_procedure",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    contentSummary:
      "Per the official DNSC Registrar instructions, if an authorized representative will request and/or claim documents on a student's behalf, applicable requirements include:\n- An appropriate authorization letter duly notarized, notarized Special Power of Attorney (SPA), affidavit of undertaking, or applicable consularized SPA arrangement for students residing abroad.\n- A clear copy of the student's valid ID.\n- A clear copy of the authorized representative's valid ID.\nFor specific situations or overseas arrangements, confirm the exact required legal document directly with the DNSC Registrar's Office.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  {
    seedKey: "dnsc_entry_g_courier_options",
    title: "Courier Delivery Options (JRS Express & DHL Express)",
    category: "Courier",
    sourceType: "registrar_procedure",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    contentSummary:
      "The official DNSC College Registrar page mentions courier arrangements, including JRS Express for local courier arrangements and DHL Express (such as for international/overseas delivery), subject to the posted official procedure. Courier fees, shipping schedules, and delivery guarantees are not fixed here and must be confirmed with the Registrar's Office and the courier provider.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  {
    seedKey: "dnsc_entry_h_contact_info",
    title: "Official DNSC College Registrar Contact Information",
    category: "Office contact information",
    sourceType: "official_webpage",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    contentSummary:
      "Official DNSC College Registrar contact details:\n- Official Registrar Email: registrar@dnsc.edu.ph\n- Official Registrar Mobile / Phone: 0963-128-0320\n- Official Registrar Webpage: https://dnsc.edu.ph/college-registrar/\nAdmin may update this entry whenever DNSC publishes updated contact details.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  {
    seedKey: "dnsc_downloads_registrar_forms",
    title: "Official DNSC Downloadable Registrar Forms",
    category: "Request procedures",
    sourceType: "official_webpage",
    sourceUrl: "https://dnsc.edu.ph/downloads/",
    contentSummary:
      "Official Registrar Forms listed on DNSC Downloads (https://dnsc.edu.ph/downloads/):\n- Add / Drop / Authorized Change of Schedule / Substitution of Subject\n- Application for Credit of Subject\n- Application for Cross Enrolment / Summer Permit\n- Application for Drop with Permission\n- Application for Shift of Course and Major\n- Application for Withdrawal from the Program / Cancellation of Enrolment\n- INC Completion Form\n- Request for Credentials\n- Request for Credentials – HD/CAV/OTR/DIP with SPA\n- Self-Certification – College\n- Self-Certification – Graduate Studies",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  {
    seedKey: "dnsc_e_services_portal",
    title: "DNSC E-Services Online Systems",
    category: "Frequently asked questions",
    sourceType: "official_webpage",
    sourceUrl: "https://dnsc.edu.ph/e-services/",
    contentSummary:
      "DNSC E-Services (https://dnsc.edu.ph/e-services/) provides official links to DNSC online services and student portals. Always verify links through official dnsc.edu.ph pages.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  {
    seedKey: "dnsc_status_explanations",
    title: "RegistrarDocs AI Request Status Explanations",
    category: "Status explanations",
    sourceType: "institutional_faq",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    contentSummary:
      "Request statuses in RegistrarDocs AI:\n- Submitted / Pending: Your request has been logged and is awaiting initial verification by Registrar Staff.\n- Under Processing: Registrar Staff verified your request and are preparing your document.\n- Needs Correction: Additional details or corrections are needed before processing can continue; check My Requests for Staff instructions.\n- Ready for Release: Your document has been prepared and verified for release. Follow the posted collection instructions and bring valid ID to claim it.\n- Released: Collector identity was verified and the document has been officially handed over.\n- Rejected: The request was not approved; see Staff remarks in My Requests.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  // Document Catalog Entries (with honest unverified-checklist flags per Part 3!)
  {
    seedKey: "dnsc_doc_tor",
    title: "Document Type: Transcript of Records (TOR / OTR)",
    category: "Document types",
    sourceType: "document_requirements",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    documentTypeCode: "tor",
    contentSummary:
      "Transcript of Records (TOR / OTR) is an official academic record summarizing completed courses, credits, and grades across terms. Mapped to DNSC Request for Credentials (and Request for Credentials – HD/CAV/OTR/DIP with SPA when using a representative).\nGeneral requirements that may apply: student clearance (where applicable), request payment slip/official receipt, documentary stamp (1 per document), and original unsubmitted admission documents such as SF 10/OTR where applicable.\nChecklist Status: Specific requirements not yet verified from the official DNSC checklist. Please confirm with the Registrar.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: false,
  },
  {
    seedKey: "dnsc_doc_coe",
    title: "Document Type: Certificate of Enrollment (COE)",
    category: "Document types",
    sourceType: "document_requirements",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    documentTypeCode: "coe",
    contentSummary:
      "Certificate of Enrollment (COE) formally verifies a student's current or prior enrollment status for a specific academic term (unlike a TOR, which lists full courses and grades across terms). General requirements that may apply: request payment slip/official receipt and documentary stamp (1 per document) where applicable.\nChecklist Status: Specific requirements not yet verified from the official DNSC checklist. Please confirm with the Registrar.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: false,
  },
  {
    seedKey: "dnsc_doc_diploma",
    title: "Document Type: Diploma & Graduation Documents",
    category: "Document types",
    sourceType: "document_requirements",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    documentTypeCode: "diploma",
    contentSummary:
      "Diploma & Graduation Documents confirm degree completion and graduation credentials. Mapped to DNSC Request for Credentials (and Request for Credentials – HD/CAV/OTR/DIP with SPA when claiming via representative). General requirements that may apply: accomplished/approved student clearance for graduation credentials, payment slip/official receipt, and documentary stamp (1 per document).\nChecklist Status: Specific requirements not yet verified from the official DNSC checklist. Please confirm with the Registrar.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: false,
  },
  {
    seedKey: "dnsc_doc_cav_hd",
    title: "Document Type: CAV & Transfer Credentials / Honorable Dismissal",
    category: "Document types",
    sourceType: "document_requirements",
    sourceUrl: "https://dnsc.edu.ph/downloads/",
    documentTypeCode: "other",
    contentSummary:
      "Certification, Authentication, and Verification (CAV) and Transfer Credentials / Honorable Dismissal (HD) are referenced in DNSC's downloadable form 'Request for Credentials – HD/CAV/OTR/DIP with SPA'. In RegistrarDocs AI, these can be requested under 'Other Registrar's Office Documents' (or added as dedicated types by Admin).\nGeneral requirements that may apply: approved student clearance (especially for transfer/legal purposes), payment slip/official receipt, and documentary stamps.\nChecklist Status: Specific requirements not yet verified from the official DNSC checklist. Please confirm with the Registrar.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: false,
  },
  // RegistrarDocs AI System Guide (grounded strictly on implemented application routes & features)
  {
    seedKey: "sys_guide_registration_login",
    title: "System Guide: Account Registration, Login & Forgot Password",
    category: "Frequently asked questions",
    sourceType: "institutional_faq",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    contentSummary:
      "How to access RegistrarDocs AI:\n- Account Registration: Go to /register, enter your full name, DNSC email, Student ID, password, and upload a clear photo of your Student ID. New accounts start as Pending Approval until reviewed by an Administrator.\n- Logging In: Go to /login and sign in using either your email address or Student ID and your password.\n- Forgot Password: Click 'Forgot Password?' on /login (or go to /forgot-password), enter your registered email, open the reset link sent to your inbox, and set a new password.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  {
    seedKey: "sys_guide_submit_request",
    title: "System Guide: How to Submit a Document Request",
    category: "Request procedures",
    sourceType: "institutional_faq",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    contentSummary:
      "How to submit a document request in RegistrarDocs AI:\n1. Open 'Request a Document' from the left sidebar (/dashboard/requester/request).\n2. Browse or search the available document types and select the document you need.\n3. Review the listed requirements and preparation reminders.\n4. Click to open the request form, enter your Purpose, Number of Copies, and any Additional Details, then review and submit.\n5. After submission, you immediately receive a unique Request Reference Number (format RD-YYYY-NNNNNN) and your request appears in 'My Requests'.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
  {
    seedKey: "sys_guide_track_and_correction",
    title: "System Guide: Tracking Requests, Corrections & Notifications",
    category: "Status explanations",
    sourceType: "institutional_faq",
    sourceUrl: "https://dnsc.edu.ph/college-registrar/",
    contentSummary:
      "How to track your request and respond to corrections in RegistrarDocs AI:\n- Tracking: Open 'My Requests' (/dashboard/requester/requests) to search by reference number, filter by status, and click 'View Details' for your timeline and collection instructions.\n- Notifications: Check the notification bell icon in the top bar or visit /dashboard/requester/notifications for live status updates.\n- Needs Correction: If Registrar Staff returns your request as 'Needs Correction', open 'View Details' in My Requests, read the Staff instructions, click 'Edit & Resubmit Request', and submit your updated details while keeping your original reference number.\n- Technical Problems: Check 'FAQs & Help' or contact the DNSC Registrar's Office at registrar@dnsc.edu.ph or 0963-128-0320.",
    isEnabled: true,
    isVerified: true,
    lastVerifiedAt: REVIEW_DATE,
    checklistVerified: true,
  },
];

/**
 * 36 Multilingual AI Test Questions (10 English, 10 Filipino, 10 Bisaya, 6 Mixed)
 */
export const AI_TEST_QUESTIONS: readonly {
  id: number;
  language: "English" | "Filipino" | "Bisaya" | "Mixed";
  question: string;
  expectedBehavior: string;
}[] = [
  // 10 English
  { id: 1, language: "English", question: "Hello, can you help me?", expectedBehavior: "Responds naturally and briefly in selected language." },
  { id: 2, language: "English", question: "What can you do?", expectedBehavior: "Explains informational capabilities and limitations clearly." },
  { id: 3, language: "English", question: "How do I submit a document request?", expectedBehavior: "Provides step-by-step RegistrarDocs AI submission steps." },
  { id: 4, language: "English", question: "How do I track my request?", expectedBehavior: "Explains My Requests page, reference number, and notification bell." },
  { id: 5, language: "English", question: "What does Ready for Release mean?", expectedBehavior: "Explains Ready for Release status and claiming reminders." },
  { id: 6, language: "English", question: "What are the requirements for a TOR?", expectedBehavior: "Lists general requirements + notes TOR specific checklist is unverified." },
  { id: 7, language: "English", question: "Can someone claim my document for me?", expectedBehavior: "Explains authorized representative requirements (notarized authorization/SPA + valid IDs)." },
  { id: 8, language: "English", question: "What should I bring when collecting my document?", expectedBehavior: "Explains claim stub/request slip, valid ID, and appointment if required." },
  { id: 9, language: "English", question: "I don't understand the instructions. Can you explain?", expectedBehavior: "Re-explains simply in short steps." },
  { id: 10, language: "English", question: "Where can I contact the Registrar?", expectedBehavior: "Provides registrar@dnsc.edu.ph, 0963-128-0320, and dnsc.edu.ph/college-registrar/." },
  // 10 Filipino
  { id: 11, language: "Filipino", question: "Kumusta, maaari mo ba akong tulungan?", expectedBehavior: "Natural greeting/help response in selected language." },
  { id: 12, language: "Filipino", question: "Ano ang kaya mong gawin?", expectedBehavior: "Explains capabilities & non-decision boundaries." },
  { id: 13, language: "Filipino", question: "Paano ako mag-request ng dokumento?", expectedBehavior: "Step-by-step guide for submitting a request." },
  { id: 14, language: "Filipino", question: "Paano ko malalaman ang status ng request ko?", expectedBehavior: "Explains My Requests and notifications." },
  { id: 15, language: "Filipino", question: "Ano ang ibig sabihin ng Ready for Release?", expectedBehavior: "Explains Ready for Release status." },
  { id: 16, language: "Filipino", question: "Ano ang requirements para sa TOR?", expectedBehavior: "Explains general requirements + unverified TOR checklist notice." },
  { id: 17, language: "Filipino", question: "Maaari bang ibang tao ang kumuha ng dokumento ko?", expectedBehavior: "Explains authorized representative rules." },
  { id: 18, language: "Filipino", question: "Ano ang kailangan kong dalhin kapag kukunin ko ang dokumento?", expectedBehavior: "Explains claim stub, valid ID, and collection instructions." },
  { id: 19, language: "Filipino", question: "Hindi ko maintindihan ang instructions. Maaari mo bang ipaliwanag?", expectedBehavior: "Simplifies explanation clearly." },
  { id: 20, language: "Filipino", question: "Saan ako maaaring makipag-ugnayan sa Registrar?", expectedBehavior: "Provides official DNSC Registrar contact info." },
  // 10 Bisaya (Cebuano)
  { id: 21, language: "Bisaya", question: "Maayong adlaw, pwede ko mangutana?", expectedBehavior: "Natural greeting/help response in selected language." },
  { id: 22, language: "Bisaya", question: "Unsa imong mahimo para nako?", expectedBehavior: "Explains capabilities & limitations naturally." },
  { id: 23, language: "Bisaya", question: "Unsaon nako pag-submit sa akong document request?", expectedBehavior: "Step-by-step request submission guide." },
  { id: 24, language: "Bisaya", question: "Asa nako makita ang status sa akong request?", expectedBehavior: "Explains My Requests and notification bell." },
  { id: 25, language: "Bisaya", question: "Unsa pasabot sa Ready for Release?", expectedBehavior: "Explains Ready for Release clearly." },
  { id: 26, language: "Bisaya", question: "Unsa akong requirements para mag-request og TOR?", expectedBehavior: "Explains general requirements + unverified TOR checklist notice." },
  { id: 27, language: "Bisaya", question: "Pwede ba lain nga tawo ang mo-claim sa akong document?", expectedBehavior: "Explains authorized representative requirements." },
  { id: 28, language: "Bisaya", question: "Unsa akong dad-on kung mo-claim na ko?", expectedBehavior: "Explains claim stub, valid ID, and appointment if required." },
  { id: 29, language: "Bisaya", question: "Wala ko kasabot sa instructions, pwede nimo ipasabot?", expectedBehavior: "Simplifies explanation in short steps." },
  { id: 30, language: "Bisaya", question: "Asa ko makontak ang Registrar?", expectedBehavior: "Provides official DNSC Registrar contact details." },
  // 6 Mixed-Language (Cebuano-English / Taglish)
  { id: 31, language: "Mixed", question: "Unsa akong requirements for TOR?", expectedBehavior: "Understands mixed query and replies strictly in selected language." },
  { id: 32, language: "Mixed", question: "Asa nako makita ang status sa request?", expectedBehavior: "Explains My Requests in selected language." },
  { id: 33, language: "Mixed", question: "How do I claim my document? Unsa akong dad-on?", expectedBehavior: "Explains claiming requirements in selected language." },
  { id: 34, language: "Mixed", question: "Pwede ba online ang request and payment?", expectedBehavior: "Explains online request & LandBank Link.BizPortal without inventing fees." },
  { id: 35, language: "Mixed", question: "Di ko kasabot sa status, unsay meaning ani?", expectedBehavior: "Simplifies status labels in selected language." },
  { id: 36, language: "Mixed", question: "Can you tell me the exact fee even if it is not on the DNSC website?", expectedBehavior: "Refuses to invent fees; directs user to Registrar." },
];

/**
 * 18 Clearly Labeled SYNTHETIC / TEST Feedback Records for Admin Feedback Analyzer testing.
 * Strictly stored with `is_synthetic = true` and never mixed with real DNSC user feedback.
 */
export const SYNTHETIC_FEEDBACK_DATASET: readonly {
  category: string;
  rating: number;
  comment: string;
}[] = [
  { category: "Request Submission", rating: 5, comment: "[TEST / SYNTHETIC] It was easier to submit my document request online." },
  { category: "Requirements", rating: 3, comment: "[TEST / SYNTHETIC] I was confused about what requirements I needed to bring." },
  { category: "Request Tracking", rating: 5, comment: "[TEST / SYNTHETIC] The request tracking page was useful." },
  { category: "Status Updates", rating: 3, comment: "[TEST / SYNTHETIC] I did not know when my document would be ready." },
  { category: "Mobile Usability", rating: 2, comment: "[TEST / SYNTHETIC] The mobile page was a little difficult to use." },
  { category: "Collection & Release", rating: 5, comment: "[TEST / SYNTHETIC] The collection instructions were clear." },
  { category: "Payment", rating: 3, comment: "[TEST / SYNTHETIC] I wanted more information about the payment process." },
  { category: "Notifications", rating: 5, comment: "[TEST / SYNTHETIC] I received the status update and knew what to do next." },
  { category: "Document Catalog", rating: 3, comment: "[TEST / SYNTHETIC] I had trouble finding the document I needed." },
  { category: "General Experience", rating: 5, comment: "[TEST / SYNTHETIC] The system saved me from asking the office about my request." },
  { category: "Requirements", rating: 2, comment: "[TEST / SYNTHETIC] I was unsure if I needed a student clearance and documentary stamp for my TOR." },
  { category: "Mobile Usability", rating: 2, comment: "[TEST / SYNTHETIC] Buttons on my phone screen felt cramped when checking My Requests." },
  { category: "Request Tracking", rating: 4, comment: "[TEST / SYNTHETIC] Having a reference number made it easy to follow up on my request." },
  { category: "Payment", rating: 3, comment: "[TEST / SYNTHETIC] Please add clearer steps on how to pay via LandBank Link.BizPortal." },
  { category: "Collection & Release", rating: 4, comment: "[TEST / SYNTHETIC] Knowing which claiming window to go to saved a lot of time." },
  { category: "Notifications", rating: 3, comment: "[TEST / SYNTHETIC] I wish I also got an email notification when my document was Ready for Release." },
  { category: "Document Catalog", rating: 4, comment: "[TEST / SYNTHETIC] The document catalog descriptions helped me pick the right certificate." },
  { category: "General Experience", rating: 5, comment: "[TEST / SYNTHETIC] Overall very convenient compared to lining up just to ask about requirements." },
];
