import { OFFICIAL_DNSC_KNOWLEDGE_SEED } from "@/lib/ai/dnsc-knowledge-seed";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type AssistantLanguage = "en" | "fil" | "ceb";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GroundedSourceRef {
  title: string;
  category: string;
  url: string | null;
  lastVerifiedAt: string | null;
}

export interface AssistantReply {
  answer: string;
  sources: GroundedSourceRef[];
  language: AssistantLanguage;
  mode: "gemini" | "grounded_kb";
  unverifiedWarning: boolean;
}

interface ApprovedKnowledgeItem {
  id: string;
  title: string;
  category: string;
  sourceUrl: string | null;
  contentSummary: string;
  isVerified: boolean;
  lastVerifiedAt: string | null;
  documentTypeCode: string | null;
  checklistVerified: boolean;
}

const UNVERIFIED_MESSAGES: Record<AssistantLanguage, string> = {
  en: "I couldn't verify that information from the currently approved DNSC Registrar information. Please confirm directly with the DNSC Registrar's Office at registrar@dnsc.edu.ph, 0963-128-0320, or https://dnsc.edu.ph/college-registrar/.",
  fil: "Hindi ko ma-verify ang impormasyong iyan mula sa aprubadong impormasyon ng DNSC Registrar. Pakikumpirma nang direkta sa DNSC Registrar's Office sa registrar@dnsc.edu.ph, 0963-128-0320, o sa https://dnsc.edu.ph/college-registrar/.",
  ceb: "Dili nako ma-verify kana nga impormasyon gikan sa aprubado nga impormasyon sa DNSC Registrar. Palihug kumpirmaha direkta sa DNSC Registrar's Office sa registrar@dnsc.edu.ph, 0963-128-0320, o sa https://dnsc.edu.ph/college-registrar/.",
};

const LANGUAGE_INSTRUCTIONS: Record<AssistantLanguage, string> = {
  en: "Respond naturally and clearly in English.",
  fil: "Respond naturally in conversational Filipino (Tagalog) appropriate for college students. Avoid stiff or overly formal translations.",
  ceb: "Respond naturally in Davao-region Bisaya (Cebuano) appropriate for DNSC students (using natural words like Unsa, Asa, Kanus-a, Giunsa, Pwede, Dili, Kinahanglan, Salamat). Do NOT produce awkward literal translations.",
};

function detectConversationalIntent(
  text: string
):
  | "greeting"
  | "help"
  | "thanks"
  | "goodbye"
  | "capabilities"
  | "confusion"
  | null {
  const clean = text
    .trim()
    .toLowerCase()
    .replace(/[!?.]+$/g, "")
    .trim();

  if (
    /^(bye|goodbye|see you|amping|sige salamat|sige, salamat|paalam|ba-bye|thanks,?\s*bye)$/.test(
      clean
    )
  ) {
    return "goodbye";
  }

  if (
    /^(thanks|thank you|thank u|ty|salamat|salamat kaayo|daghang salamat|maraming salamat|thx)$/.test(
      clean
    )
  ) {
    return "thanks";
  }

  if (
    /^(hi|hello|hey|good morning|good afternoon|good evening|kumusta|kamusta|maayong buntag|maayong hapon|maayong gabii|maayong adlaw)(,?\s*(can you help me|pwede ko mangutana|maaari mo ba akong tulungan|tabangi ko))?$/.test(
      clean
    )
  ) {
    return "greeting";
  }

  if (
    /^(can you help me|i need help|help me|tabangi ko|pwede ko mangutana|naa koy pangutana|i have a question|patulong|may tanong ako|maaari mo ba akong tulungan)$/.test(
      clean
    )
  ) {
    return "help";
  }

  if (
    /(what can you do|what are you for|how can you help|unsa imong mahimo|unsa man imong tabang|ano ang kaya mong gawin|paano ka makakatulong)/i.test(
      clean
    )
  ) {
    return "capabilities";
  }

  if (
    /(i don'?t understand|don'?t understand|wala ko kasabot|di ko kasabot|dili ko kasabot|hindi ko maintindihan|explain.*simply|simpler|unsa pasabot ana|can you explain that|ipasabot|explain that in)/i.test(
      clean
    ) &&
    !/ready for release|pending|processing|status/.test(clean)
  ) {
    return "confusion";
  }

  return null;
}

function getConversationalReply(
  intent: "greeting" | "help" | "thanks" | "goodbye" | "capabilities",
  lang: AssistantLanguage
): string {
  const replies: Record<typeof intent, Record<AssistantLanguage, string>> = {
    greeting: {
      en: "Hello! Welcome to the RegistrarDocs AI Assistant. How can I help you with your DNSC Registrar document request today?",
      fil: "Kumusta! Maligayang pagdating sa RegistrarDocs AI Assistant. Paano kita matutulungan sa iyong DNSC Registrar document request ngayon?",
      ceb: "Maayong adlaw! Welcome sa RegistrarDocs AI Assistant. Unsa akong matabang nimo bahin sa imong DNSC Registrar document request karon?",
    },
    help: {
      en: "Of course! I'm here to help. What would you like to ask about DNSC documents, requirements, claiming, or using RegistrarDocs AI?",
      fil: "Oo naman! Handa akong tumulong. Ano ang gusto mong itanong tungkol sa mga dokumento ng DNSC, requirements, pagkuha, o paggamit ng RegistrarDocs AI?",
      ceb: "Oo, pwede kaayo! Unsa imong pangutana bahin sa mga dokumento sa DNSC, requirements, pagkuha, o paggamit sa RegistrarDocs AI?",
    },
    thanks: {
      en: "You're welcome! Let me know anytime if you have another question about your document request.",
      fil: "Walang anuman! Magtanong ka lang ulit kung may iba ka pang katanungan tungkol sa iyong document request.",
      ceb: "Walay sapayan! Pangutana lang ug balik kung naa pa kay lain pangutana bahin sa imong document request.",
    },
    goodbye: {
      en: "Goodbye! Take care, and feel free to come back whenever you need help with DNSC Registrar procedures.",
      fil: "Paalam at mag-ingat ka! Bumalik ka lang dito kung kailangan mo ng tulong sa mga proseso ng DNSC Registrar.",
      ceb: "Amping! Balik lang diri bisan kanus-a kung kinahanglan ka og tabang sa mga proseso sa DNSC Registrar.",
    },
    capabilities: {
      en: [
        "I am the RegistrarDocs AI Assistant for DNSC. Here is what I can help you with:",
        "- Explaining general DNSC document requirements based on approved official sources",
        "- Guiding you step-by-step on how to submit and track requests in RegistrarDocs AI",
        "- Explaining request statuses (Pending, Processing, Needs Correction, Ready for Release, Released)",
        "- Sharing verified claiming, authorized representative, payment, courier, and contact procedures",
        "",
        "Please note: I provide informational guidance only. I cannot approve or reject requests, change request statuses, check private records, or replace DNSC Registrar Staff.",
      ].join("\n"),
      fil: [
        "Ako ang RegistrarDocs AI Assistant para sa DNSC. Narito ang mga maitutulong ko sa iyo:",
        "- Pagpapaliwanag ng general requirements ng DNSC mula sa aprubadong opisyal na sources",
        "- Step-by-step na gabay sa pag-submit at pag-track ng request sa RegistrarDocs AI",
        "- Pagpapaliwanag ng mga status (Pending, Processing, Needs Correction, Ready for Release, Released)",
        "- Impormasyon tungkol sa pagkuha ng dokumento, authorized representative, pagbabayad, courier, at contact ng Registrar",
        "",
        "Paalala: Impormasyon at gabay lamang ang maibibigay ko. Hindi ako makaka-approve o makaka-reject ng request, hindi makakapagbago ng status, at hindi kapalit ng DNSC Registrar Staff.",
      ].join("\n"),
      ceb: [
        "Ako ang RegistrarDocs AI Assistant para sa DNSC. Mao ni ang akong mahimo para nimo:",
        "- Pagpasabot sa mga general requirements sa DNSC base sa aprubadong opisyal nga sources",
        "- Step-by-step nga giya unsaon pag-submit ug pag-track sa request sa RegistrarDocs AI",
        "- Pagpasabot sa mga status (Pending, Processing, Needs Correction, Ready for Release, Released)",
        "- Impormasyon bahin sa pagkuha sa dokumento, authorized representative, bayad, courier, ug kontak sa Registrar",
        "",
        "Pahinumdom: Giya ug impormasyon ra akong mahatag. Dili ko maka-approve o maka-reject og request, dili makausab og status, ug dili mopuli sa DNSC Registrar Staff.",
      ].join("\n"),
    },
  };

  return replies[intent][lang];
}

async function loadApprovedKnowledgeBase(): Promise<ApprovedKnowledgeItem[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("ai_knowledge_sources")
      .select("*")
      .eq("is_enabled", true);

    const items: ApprovedKnowledgeItem[] = [];
    const seenTitles = new Set<string>();

    if (!error && data && data.length > 0) {
      for (const row of data as Record<string, unknown>[]) {
        const isVerified =
          typeof row.is_verified === "boolean" ? row.is_verified : true;
        if (!isVerified) continue;
        const title = String(row.title ?? "");
        seenTitles.add(title);
        items.push({
          id: String(row.id),
          title,
          category: String(row.category ?? "Registrar Information"),
          sourceUrl:
            typeof row.source_url === "string" ? row.source_url : null,
          contentSummary: String(row.content_summary ?? ""),
          isVerified: true,
          lastVerifiedAt:
            typeof row.last_verified_at === "string"
              ? row.last_verified_at
              : null,
          documentTypeCode:
            typeof row.document_type_code === "string"
              ? row.document_type_code
              : null,
          checklistVerified:
            typeof row.checklist_verified === "boolean"
              ? row.checklist_verified
              : true,
        });
      }
    }

    // Ensure official DNSC seed & system guide entries are available if not yet seeded in DB
    for (const s of OFFICIAL_DNSC_KNOWLEDGE_SEED) {
      if (!s.isEnabled || !s.isVerified || seenTitles.has(s.title)) continue;
      items.push({
        id: s.seedKey,
        title: s.title,
        category: s.category,
        sourceUrl: s.sourceUrl,
        contentSummary: s.contentSummary,
        isVerified: s.isVerified,
        lastVerifiedAt: s.lastVerifiedAt,
        documentTypeCode: s.documentTypeCode ?? null,
        checklistVerified: s.checklistVerified,
      });
    }

    const { data: faqData } = await admin
      .from("faqs")
      .select("id, question, answer, category")
      .eq("is_published", true);

    if (faqData && faqData.length > 0) {
      for (const f of faqData as {
        id: string;
        question: string;
        answer: string;
        category: string;
      }[]) {
        items.push({
          id: `faq-${f.id}`,
          title: `FAQ: ${f.question}`,
          category: f.category || "Frequently asked questions",
          sourceUrl: "https://dnsc.edu.ph/college-registrar/",
          contentSummary: `${f.question}\n${f.answer}`,
          isVerified: true,
          lastVerifiedAt: null,
          documentTypeCode: null,
          checklistVerified: true,
        });
      }
    }

    return items;
  } catch {
    return OFFICIAL_DNSC_KNOWLEDGE_SEED.filter(
      (s) => s.isEnabled && s.isVerified
    ).map((s) => ({
      id: s.seedKey,
      title: s.title,
      category: s.category,
      sourceUrl: s.sourceUrl,
      contentSummary: s.contentSummary,
      isVerified: s.isVerified,
      lastVerifiedAt: s.lastVerifiedAt,
      documentTypeCode: s.documentTypeCode ?? null,
      checklistVerified: s.checklistVerified,
    }));
  }
}

function expandMultilingualQuery(raw: string): string {
  const lower = raw.toLowerCase();
  const expansions: string[] = [lower];

  const map: [RegExp, string][] = [
    [/\b(unsa|unsaon|giunsa|ano|paano)\b/g, "what how procedure submit"],
    [/\b(asa|saan|makita|malalaman)\b/g, "where track status my requests"],
    [/\b(pagkuha|kuha|makuha|kunin|kukunin|dad-on|dalhin|claim|claiming|collect)\b/g, "claim collection stub appointment valid id"],
    [/\b(bayad|magbayad|pagbayad|fee|fees|price|cost|magkano|pila)\b/g, "payment landbank link.bizportal receipt"],
    [/\b(selyo|stamp|stamps|doc stamp)\b/g, "documentary stamps one per document"],
    [/\b(mama|mother|nanay|inahan|papa|father|brother|sister|relative|someone|representative|ibang tao|lain nga tawo|iba|lain)\b/g, "authorized representative spa notarized authorization letter valid id"],
    [/\b(abroad|overseas|outside the philippines|gawas|ibang bansa)\b/g, "abroad consularized spa dhl express courier"],
    [/\b(courier|padala|ship|shipping|deliver|delivery|jrs|dhl)\b/g, "courier jrs express dhl express"],
    [/\b(kontak|makontak|makipag-ugnayan|contact|email|phone|number|tawag|call|reach)\b/g, "contact registrar email phone"],
    [/\b(kulang|incomplete|missing)\b/g, "incomplete requirements release schedule"],
    [/\b(kanus-a|kailan|when|schedule|ready|status|track|tracking|pasabot|meaning|ibig sabihin)\b/g, "status ready for release pending processing track my requests"],
    [/\b(tor|otr|transcript)\b/g, "transcript of records tor otr"],
    [/\b(coe|enrollment|enrolment)\b/g, "certificate of enrollment coe"],
    [/\b(diploma|graduation)\b/g, "diploma graduation"],
    [/\b(cav|honorable dismissal|transfer credential)\b/g, "cav transfer credentials honorable dismissal"],
    [/\b(sf10|sf 10|form 137)\b/g, "sf 10 otr original documents enrollment"],
    [/\b(clearance|klirans)\b/g, "student clearance"],
    [/\b(submit|mag-submit|mag-request|magsugod|start)\b/g, "submit request document catalog reference number"],
    [/\b(returned|correction|needs correction|ibalik)\b/g, "needs correction edit resubmit"],
    [/\b(register|registration|login|sign in|forgot password|password)\b/g, "account registration login forgot password"],
  ];

  for (const [regex, added] of map) {
    if (regex.test(lower)) expansions.push(added);
  }

  return expansions.join(" ");
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

function rankKnowledgeEntries(
  query: string,
  history: ChatTurn[],
  kb: ApprovedKnowledgeItem[]
): { item: ApprovedKnowledgeItem; score: number }[] {
  const prevUser = [...history].reverse().find((h) => h.role === "user");
  const primaryTokens = new Set(tokenize(expandMultilingualQuery(query)));
  const contextTokens = prevUser
    ? new Set(tokenize(expandMultilingualQuery(prevUser.content)))
    : new Set<string>();

  const stopWords = new Set([
    "the", "and", "for", "are", "you", "can", "how", "what", "with", "this",
    "that", "from", "have", "will", "need", "para", "ang", "mga", "ako",
    "akong", "ko", "sa", "ng", "na", "og", "ug", "document", "documents",
    "request", "dnsc", "registrar", "nako", "nimo", "ba", "nga", "kung",
  ]);

  const scored = kb.map((item) => {
    const titleText = item.title.toLowerCase();
    const catText = item.category.toLowerCase();
    const bodyText = item.contentSummary.toLowerCase();

    let score = 0;
    for (const token of primaryTokens) {
      if (stopWords.has(token)) continue;
      if (titleText.includes(token)) score += 6;
      if (catText.includes(token)) score += 4;
      if (bodyText.includes(token)) score += 2;
    }

    if (primaryTokens.size <= 7) {
      for (const token of contextTokens) {
        if (stopWords.has(token)) continue;
        if (titleText.includes(token)) score += 2;
        if (bodyText.includes(token)) score += 1;
      }
    }

    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

/**
 * Natural localized explanations in English, Filipino, and Davao-region Bisaya
 * for core DNSC Registrar & RegistrarDocs AI topics (used when GEMINI_API_KEY
 * is not configured or as resilient fallback).
 */
function buildLocalizedGroundedAnswer(params: {
  primary: ApprovedKnowledgeItem;
  secondary?: ApprovedKnowledgeItem;
  language: AssistantLanguage;
  simplify: boolean;
  hasUnverifiedChecklist: boolean;
}): string {
  const { primary, secondary, language, simplify, hasUnverifiedChecklist } =
    params;
  const key = primary.id;

  const localizedByTopic: Record<string, Record<AssistantLanguage, string>> = {
    sys_guide_submit_request: {
      en: "Here is how to submit a document request in RegistrarDocs AI:\n1. Go to **Request a Document** in the left menu.\n2. Pick the document you need and review the listed reminders.\n3. Click to open the request form, enter your Purpose, Number of Copies, and any Additional Details.\n4. Submit the form to receive your unique Request Reference Number (`RD-YYYY-NNNNNN`).\n5. Track its progress anytime in **My Requests**.",
      fil: "Ganito mag-submit ng document request sa RegistrarDocs AI:\n1. Pumunta sa **Request a Document** sa kaliwang menu.\n2. Piliin ang dokumentong kailangan mo at basahin ang mga paalala.\n3. Punan ang Purpose, Number of Copies, at Additional Details.\n4. I-submit ang form para makuha ang iyong Request Reference Number (`RD-YYYY-NNNNNN`).\n5. Maaari mo itong i-track anumang oras sa **My Requests**.",
      ceb: "Mao ni ang mga lakang unsaon pag-submit og document request sa RegistrarDocs AI:\n1. Adto sa **Request a Document** sa walang menu.\n2. Pilia ang dokumento nga imong kinahanglan ug basaha ang mga pahinumdom.\n3. Isulat ang imong Purpose, pila ka kopya, ug dugang detalye kung naa.\n4. I-submit ang form aron makakuha ka og Request Reference Number (`RD-YYYY-NNNNNN`).\n5. Makita ug ma-track nimo kini bisan kanus-a sa **My Requests**.",
    },
    sys_guide_track_and_correction: {
      en: "You can check your request status in **My Requests** (left sidebar) or through the notification bell icon at the top bar.\n- Click **View Details** on any request to see your status timeline and collection instructions.\n- If your request is marked **Needs Correction**, open **View Details**, read the Registrar Staff instructions, and click **Edit & Resubmit Request** (your original reference number stays the same).",
      fil: "Makikita mo ang status ng iyong request sa **My Requests** sa kaliwang menu o sa notification bell sa itaas.\n- I-click ang **View Details** para makita ang timeline at collection instructions.\n- Kung **Needs Correction** ang status, buksan ang **View Details**, basahin ang gabay ng Registrar Staff, at i-click ang **Edit & Resubmit Request** (mananatili ang orihinal mong reference number).",
      ceb: "Makita nimo ang status sa imong request sa **My Requests** sa walang menu o sa notification bell sa ibabaw.\n- I-click ang **View Details** aron makita ang timeline ug collection instructions.\n- Kung **Needs Correction** ang status, ablihi ang **View Details**, basaha ang giya sa Registrar Staff, ug i-click ang **Edit & Resubmit Request** (magpabilin ang imong orihinal nga reference number).",
    },
    dnsc_status_explanations: {
      en: "Here is what each request status means:\n- **Submitted / Pending:** Logged and waiting for initial verification by Registrar Staff.\n- **Under Processing:** Verified and currently being prepared by Staff.\n- **Needs Correction:** Missing or unclear details—open My Requests to edit and resubmit.\n- **Ready for Release:** Your document is prepared and ready to claim. Check your collection instructions and bring a valid ID.\n- **Released:** Your identity was verified and the document was officially handed over.\n- **Rejected:** Not approved; check Staff remarks in My Requests.",
      fil: "Ito ang ibig sabihin ng bawat status ng request:\n- **Submitted / Pending:** Na-submit na at naghihintay ng initial verification ng Registrar Staff.\n- **Under Processing:** Na-verify na at inihahanda na ng Staff ang dokumento.\n- **Needs Correction:** May kulang o kailangang itama—buksan ang My Requests para mag-edit at mag-resubmit.\n- **Ready for Release:** Handa nang kunin ang iyong dokumento. Sundin ang collection instructions at magdala ng valid ID.\n- **Released:** Na-verify na ang pagkakakilanlan at opisyal nang naibigay ang dokumento.\n- **Rejected:** Hindi naaprubahan; tingnan ang remarks ng Staff sa My Requests.",
      ceb: "Mao ni ang pasabot sa matag status sa imong request:\n- **Submitted / Pending:** Na-submit na ug naghulat pa sa initial verification sa Registrar Staff.\n- **Under Processing:** Na-verify na ug giandam na sa Staff ang imong dokumento.\n- **Needs Correction:** Naa pay kulang o kinahanglan usbon—ablihi ang My Requests aron ma-edit ug ma-resubmit.\n- **Ready for Release:** Andam na kuhaon ang imong dokumento. Sunda ang collection instructions ug pagdala og valid ID.\n- **Released:** Na-verify na ang imong ID ug opisyal nang nahatag ang dokumento.\n- **Rejected:** Wala maaprubahi; tan-awa ang remarks sa Staff sa My Requests.",
    },
    dnsc_entry_e_collection_claiming: {
      en: "When claiming your document at the DNSC Registrar's Office:\n1. Wait until your request status is **Ready for Release** and check the collection instructions in **My Requests**.\n2. Bring your request slip / student copy or claim stub.\n3. Bring a valid ID for Staff identity verification.\n4. Check if an online appointment is required per the posted DNSC Registrar instructions.",
      fil: "Kapag kukunin mo na ang iyong dokumento sa DNSC Registrar's Office:\n1. Hintaying maging **Ready for Release** ang status at basahin ang collection instructions sa **My Requests**.\n2. Dalhin ang iyong request slip / student copy o claim stub.\n3. Magdala ng valid ID para sa identity verification ng Staff.\n4. Tingnan kung kinakailangan ng online appointment ayon sa kasalukuyang abiso ng DNSC Registrar.",
      ceb: "Kung mo-claim na ka sa imong dokumento sa DNSC Registrar's Office:\n1. Hulata nga mahimong **Ready for Release** ang status ug tan-awa ang collection instructions sa **My Requests**.\n2. Pagdala sa imong request slip / student copy o claim stub.\n3. Pagdala og valid ID para sa identity verification sa Staff.\n4. Susiha kung kinahanglan og online appointment base sa gi-post nga instruksyon sa DNSC Registrar.",
    },
    dnsc_entry_f_authorized_representative: {
      en: "Yes, an authorized representative may request or claim documents on your behalf according to DNSC Registrar guidelines. Applicable requirements include:\n- A duly notarized authorization letter, notarized Special Power of Attorney (SPA), affidavit of undertaking, or an applicable consularized SPA if you are residing abroad.\n- A clear copy of the student's valid ID.\n- A clear copy of the authorized representative's valid ID.\nFor your exact situation, please confirm directly with the DNSC Registrar's Office.",
      fil: "Oo, maaaring kumuha o mag-request ang iyong authorized representative ayon sa gabay ng DNSC Registrar. Karaniwang kinakailangan ang:\n- Notarized authorization letter, notarized Special Power of Attorney (SPA), affidavit of undertaking, o consularized SPA kung nasa abroad ka.\n- Malinaw na kopya ng valid ID ng estudyante.\n- Malinaw na kopya ng valid ID ng authorized representative.\nPara sa eksaktong kailangan sa iyong sitwasyon, pakikumpirma nang direkta sa DNSC Registrar's Office.",
      ceb: "Oo, pwede nga lain nga tawo (authorized representative) ang mo-request o mo-claim para nimo base sa giya sa DNSC Registrar. Kinahanglan nila dad-on ang:\n- Notarized authorization letter, notarized Special Power of Attorney (SPA), affidavit of undertaking, o consularized SPA kung naa ka sa abroad.\n- Klaro nga kopya sa valid ID sa estudyante.\n- Klaro nga kopya sa valid ID sa authorized representative.\nKung naa kay espesipiko nga sitwasyon, palihug kumpirmaha direkta sa DNSC Registrar's Office.",
    },
    dnsc_entry_h_contact_info: {
      en: "You can contact the DNSC College Registrar's Office through their official channels:\n- **Email:** registrar@dnsc.edu.ph\n- **Phone / Mobile:** 0963-128-0320\n- **Official Webpage:** https://dnsc.edu.ph/college-registrar/",
      fil: "Maaari kang makipag-ugnayan sa DNSC College Registrar's Office sa pamamagitan ng:\n- **Email:** registrar@dnsc.edu.ph\n- **Phone / Mobile:** 0963-128-0320\n- **Opisyal na Website:** https://dnsc.edu.ph/college-registrar/",
      ceb: "Pwede nimo makontak ang DNSC College Registrar's Office diri:\n- **Email:** registrar@dnsc.edu.ph\n- **Phone / Mobile:** 0963-128-0320\n- **Opisyal nga Website:** https://dnsc.edu.ph/college-registrar/",
    },
    dnsc_entry_d_payment_instructions: {
      en: "The official DNSC College Registrar page describes both online payment (via LandBank Link.BizPortal) and over-the-counter payment procedures, along with payment confirmation steps.\nNote: Exact document fees and payment amounts are not listed here—please confirm the applicable fee on your official payment slip or directly with the DNSC Registrar's Office.",
      fil: "Ayon sa opisyal na pahina ng DNSC College Registrar, mayroong online payment (sa pamamagitan ng LandBank Link.BizPortal) at over-the-counter payment, kasama ang proseso ng payment confirmation.\nPaalala: Walang nakalagay na eksaktong presyo o bayarin dito—pakikumpirma ang tamang halaga sa iyong payment slip o direkta sa DNSC Registrar's Office.",
      ceb: "Base sa opisyal nga pahina sa DNSC College Registrar, naay online payment (gamit ang LandBank Link.BizPortal) ug over-the-counter nga pagbayad, uban sa payment confirmation.\nPahinumdom: Wala diri ang eksaktong presyo o bayranan—palihug kumpirmaha ang eksaktong kantidad sa imong payment slip o direkta sa DNSC Registrar's Office.",
    },
    dnsc_entry_b_general_requirements: {
      en: "General requirements posted by the DNSC Registrar (depending on the requested document and applicable checklist):\n- Original admission documents not previously submitted (such as SF 10 / OTR where applicable)\n- Document-specific checklist requirements\n- Approved student clearance (for applicable transactions like transfer, employment, graduation credentials, or legal purposes)\n- Request payment slip and official receipt\n- Documentary stamps: **one (1) documentary stamp per document**\nNote: Not all requirements apply to every document type.",
      fil: "Mga pangkalahatang requirements mula sa DNSC Registrar (depende sa hinihinging dokumento):\n- Mga orihinal na dokumentong hindi pa naipasa noong enrollment (tulad ng SF 10 / OTR kung kinakailangan)\n- Specific requirements base sa document checklist\n- Approved student clearance (para sa mga transaksyon tulad ng transfer, employment, graduation credentials, o legal purposes)\n- Request payment slip at official receipt\n- Documentary stamps: **isang (1) documentary stamp bawat dokumento**\nPaalala: Hindi lahat ng ito ay awtomatikong kailangan sa bawat dokumento.",
      ceb: "Mga general requirements nga gi-post sa DNSC Registrar (depende sa dokumento nga imong gi-request):\n- Orihinal nga dokumento nga wala pa mapasa sa enrollment (sama sa SF 10 / OTR kung kinahanglan)\n- Specific requirements base sa document checklist\n- Approved student clearance (para sa transfer, employment, graduation credentials, o legal nga katuyoan)\n- Request payment slip ug official receipt\n- Documentary stamps: **usa (1) ka documentary stamp matag dokumento**\nPahinumdom: Dili tanan niini kinahanglan sa matag klase sa dokumento.",
    },
    dnsc_doc_tor: {
      en: "The **Transcript of Records (TOR / OTR)** is your official academic record of completed courses, credits, and grades.\n- General requirements that may apply: student clearance (where applicable), request payment slip/official receipt, 1 documentary stamp per document, and any unsubmitted original admission records (e.g., SF 10/OTR).\n- **Important:** Specific requirements for TOR are not yet verified from the official DNSC checklist. Please confirm the exact checklist with the DNSC Registrar's Office (registrar@dnsc.edu.ph / 0963-128-0320).",
      fil: "Ang **Transcript of Records (TOR / OTR)** ang opisyal mong rekord ng mga natapos na kurso, units, at marka.\n- Mga pangkalahatang requirements na maaaring kailanganin: student clearance (kung naaangkop), payment slip/official receipt, 1 documentary stamp bawat dokumento, at mga orihinal na admission records na hindi pa naipapasa (hal. SF 10/OTR).\n- **Mahalaga:** Ang eksaktong checklist para sa TOR ay hindi pa na-verify mula sa opisyal na checklist ng DNSC. Pakikumpirma ito sa DNSC Registrar's Office (registrar@dnsc.edu.ph / 0963-128-0320).",
      ceb: "Ang **Transcript of Records (TOR / OTR)** mao ang opisyal nga rekord sa imong mga nahuman nga subjects, units, ug grado.\n- Mga general requirements nga posibleng kinahanglan: student clearance (kung kinahanglan), payment slip/official receipt, 1 ka documentary stamp matag dokumento, ug orihinal nga admission documents nga wala pa mapasa (sama sa SF 10/OTR).\n- **Importante:** Wala pa ma-verify ang eksaktong specific checklist para sa TOR gikan sa opisyal nga checklist sa DNSC. Palihug kumpirmaha direkta sa DNSC Registrar's Office (registrar@dnsc.edu.ph / 0963-128-0320).",
    },
  };

  if (localizedByTopic[key]) {
    const base = localizedByTopic[key][language];
    if (simplify) {
      const prefix: Record<AssistantLanguage, string> = {
        en: "No worries! Here is a simpler step-by-step explanation:\n\n",
        fil: "Ayos lang! Heto ang mas simpleng paliwanag:\n\n",
        ceb: "Okay ra kaayo! Ania ang mas simple nga pasabot:\n\n",
      };
      return prefix[language] + base;
    }
    return base;
  }

  // Generic grounded fallback for any other DB-added knowledge entry
  const intro: Record<AssistantLanguage, string> = {
    en: simplify
      ? "Here is a simpler summary from the approved DNSC Registrar information:"
      : "Based on the approved DNSC Registrar's Office information:",
    fil: simplify
      ? "Heto ang mas simpleng buod mula sa aprubadong impormasyon ng DNSC Registrar:"
      : "Batay sa aprubadong impormasyon ng DNSC Registrar's Office:",
    ceb: simplify
      ? "Ania ang mas simple nga pasabot base sa aprubadong impormasyon sa DNSC Registrar:"
      : "Base sa opisyal ug aprubadong impormasyon sa DNSC Registrar's Office:",
  };

  const parts: string[] = [
    intro[language],
    "",
    `**${primary.title}**`,
    primary.contentSummary,
  ];

  if (secondary) {
    parts.push("", `**${secondary.title}**`, secondary.contentSummary);
  }

  if (hasUnverifiedChecklist) {
    const caveat: Record<AssistantLanguage, string> = {
      en: "Note: Specific requirements are not yet verified from the official DNSC checklist. Please confirm with the Registrar (registrar@dnsc.edu.ph / 0963-128-0320).",
      fil: "Paalala: Hindi pa na-verify ang eksaktong checklist mula sa opisyal na listahan ng DNSC. Pakikumpirma sa Registrar (registrar@dnsc.edu.ph / 0963-128-0320).",
      ceb: "Pahinumdom: Wala pa ma-verify ang eksaktong checklist gikan sa opisyal nga listahan sa DNSC. Palihug kumpirmaha sa Registrar (registrar@dnsc.edu.ph / 0963-128-0320).",
    };
    parts.push("", caveat[language]);
  }

  return parts.join("\n");
}

async function tryGeminiGroundedReply(
  question: string,
  history: ChatTurn[],
  topMatches: ApprovedKnowledgeItem[],
  language: AssistantLanguage,
  simplify: boolean
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const kbContext = topMatches
    .map(
      (item, idx) =>
        `[Source ${idx + 1}] ${item.title} (${item.category})\nURL: ${item.sourceUrl || "Official DNSC Registrar"}\nVerified Specific Checklist: ${item.checklistVerified ? "Yes" : "No (must advise user to confirm specific checklist with Registrar)"}\nContent:\n${item.contentSummary}`
    )
    .join("\n\n");

  const systemInstruction = `You are the RegistrarDocs AI Registrar Assistant for Davao del Norte State College (DNSC) Registrar's Office.
STRICT RESPONSE LANGUAGE REQUIREMENT:
${LANGUAGE_INSTRUCTIONS[language]}
Always answer in the selected language above EVEN IF the user wrote in English, Filipino, Bisaya, or a mix of languages.
${simplify ? "The user expressed confusion — re-explain clearly using shorter sentences and simple numbered steps." : ""}

STRICT ACCURACY & SAFETY RULES:
1. Answer ONLY using the Approved DNSC Knowledge Base provided below.
2. NEVER invent document fees, prices, processing times, office schedules, or unverified document-specific requirements.
3. If a document's Verified Specific Checklist is "No", explicitly tell the user that the specific checklist is not yet verified from the official DNSC checklist and advise confirming with the Registrar.
4. NEVER claim to approve/reject requests, change request statuses, or check private student records.
5. If the answer is NOT in the Approved DNSC Knowledge Base, respond: "${UNVERIFIED_MESSAGES[language]}"

APPROVED DNSC KNOWLEDGE BASE:
${kbContext}`;

  const contents = [
    ...history.slice(-6).map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    })),
    { role: "user", parts: [{ text: question }] },
  ];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
        }),
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    } | null;

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();

    return text || null;
  } catch {
    return null;
  }
}

export async function answerRegistrarQuestion(params: {
  question: string;
  history?: ChatTurn[];
  language?: AssistantLanguage;
}): Promise<AssistantReply> {
  const question = params.question.trim();
  const history = (params.history ?? []).slice(-6);
  const lower = question.toLowerCase();

  // Respect explicit inline language override like "Explain that in Bisaya" while defaulting to selected UI language
  let effectiveLang: AssistantLanguage = params.language ?? "en";
  if (/explain.*in\s+(bisaya|cebuano)/i.test(lower)) effectiveLang = "ceb";
  else if (/explain.*in\s+(filipino|tagalog)/i.test(lower)) effectiveLang = "fil";
  else if (/explain.*in\s+english/i.test(lower)) effectiveLang = "en";

  // 1. Handle basic conversational intents naturally without forcing document answers
  const intent = detectConversationalIntent(question);
  if (intent && intent !== "confusion") {
    return {
      answer: getConversationalReply(intent, effectiveLang),
      sources: [],
      language: effectiveLang,
      mode: "grounded_kb",
      unverifiedWarning: false,
    };
  }

  // 2. Explicit accuracy guardrail (no fabricated fees / unverified info / official actions)
  if (
    /not on the dnsc website|even if.*not.*website|make up|guess the fee|exact price|exact fee|how much.*cost|magkano|pila ang bayad|approve my|reject my|mark.*released/i.test(
      lower
    )
  ) {
    return {
      answer: UNVERIFIED_MESSAGES[effectiveLang],
      sources: [
        {
          title: "Official DNSC College Registrar Page",
          category: "Office contact information",
          url: "https://dnsc.edu.ph/college-registrar/",
          lastVerifiedAt: "2026-11-27",
        },
      ],
      language: effectiveLang,
      mode: "grounded_kb",
      unverifiedWarning: true,
    };
  }

  const kb = await loadApprovedKnowledgeBase();
  const isConfusion = intent === "confusion";

  // For confusion / "explain that in Bisaya", re-use the previous user topic from conversation history
  const queryForRetrieval =
    isConfusion && history.length > 0
      ? ([...history].reverse().find((h) => h.role === "user")?.content ??
        question)
      : question;

  const ranked = rankKnowledgeEntries(queryForRetrieval, history, kb);

  if (ranked.length === 0 || ranked[0].score < 2) {
    if (isConfusion) {
      return {
        answer: getConversationalReply("help", effectiveLang),
        sources: [],
        language: effectiveLang,
        mode: "grounded_kb",
        unverifiedWarning: false,
      };
    }

    return {
      answer: UNVERIFIED_MESSAGES[effectiveLang],
      sources: [
        {
          title: "Official DNSC College Registrar Contact Information",
          category: "Office contact information",
          url: "https://dnsc.edu.ph/college-registrar/",
          lastVerifiedAt: "2026-11-27",
        },
      ],
      language: effectiveLang,
      mode: "grounded_kb",
      unverifiedWarning: true,
    };
  }

  const topItems = ranked.map((r) => r.item);
  const sources: GroundedSourceRef[] = topItems.map((item) => ({
    title: item.title,
    category: item.category,
    url: item.sourceUrl,
    lastVerifiedAt: item.lastVerifiedAt,
  }));

  const hasUnverifiedChecklist = topItems.some((i) => !i.checklistVerified);

  const geminiAnswer = await tryGeminiGroundedReply(
    question,
    history,
    topItems,
    effectiveLang,
    isConfusion
  );
  if (geminiAnswer) {
    return {
      answer: geminiAnswer,
      sources,
      language: effectiveLang,
      mode: "gemini",
      unverifiedWarning: hasUnverifiedChecklist,
    };
  }

  const secondary =
    ranked[1] && ranked[1].score >= Math.max(4, ranked[0].score * 0.65)
      ? ranked[1].item
      : undefined;

  return {
    answer: buildLocalizedGroundedAnswer({
      primary: topItems[0],
      secondary,
      language: effectiveLang,
      simplify: isConfusion,
      hasUnverifiedChecklist,
    }),
    sources,
    language: effectiveLang,
    mode: "grounded_kb",
    unverifiedWarning: hasUnverifiedChecklist,
  };
}
