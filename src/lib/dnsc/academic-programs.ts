export interface DnscInstitute {
  code: string;
  name: string;
  shortName: string;
  programs: readonly string[];
}

/**
 * Centralized, verified reference list of Davao del Norte State College (DNSC)
 * Institutes and their official Program Offerings.
 *
 * Source: https://dnsc.edu.ph/program-offerings/ (verified 2026-11-27)
 *
 * Used by both frontend searchable comboboxes and backend API validation so
 * arbitrary institute/program text or mismatched pairs are strictly rejected.
 */
export const DNSC_INSTITUTES: readonly DnscInstitute[] = [
  {
    code: "IC",
    name: "Institute of Computing (IC)",
    shortName: "IC",
    programs: [
      "Bachelor of Science in Information Systems (BSIS)",
      "Bachelor of Science in Information Technology (BSIT)",
      "Master in Information Technology (MIT)",
    ],
  },
  {
    code: "IAAS",
    name: "Institute of Aquatic and Applied Sciences (IAAS)",
    shortName: "IAAS",
    programs: [
      "Bachelor of Science in Agro-Forestry (BSAF)",
      "Bachelor of Science in Fisheries and Aquatic Sciences (BSFAS)",
      "Bachelor of Science in Food Technology (BSFT)",
      "Bachelor of Science in Marine Biology (BSMB)",
      "Master in Fisheries Management – Aquaculture Technology (MFM AQUA)",
      "Master in Fisheries Management – Fish Processing (MFM FP)",
      "Master of Science in Marine Biodiversity (MSMB)",
    ],
  },
  {
    code: "IBPA",
    name: "Institute of Business and Public Affairs (IBPA)",
    shortName: "IBPA",
    programs: [
      "Bachelor of Public Administration (BPA)",
      "Bachelor of Science in Criminology (BSCrim)",
      "Bachelor of Science in Disaster Resilience and Management (BSDRM)",
      "Bachelor of Science in Entrepreneurship (BS ENTREP)",
      "Bachelor of Science in Social Work (BSSW)",
      "Bachelor of Science in Tourism Management (BSTM)",
    ],
  },
  {
    code: "ITED",
    name: "Institute of Teacher Education (ITED)",
    shortName: "ITED",
    programs: [
      "Bachelor of Arts in Communication (BACOMM)",
      "Bachelor of Secondary Education (BSeD) - English",
      "Bachelor of Secondary Education (BSeD) - Mathematics",
      "Bachelor of Secondary Education (BSeD) - Science",
      "Bachelor of Technology and Livelihood Education (BTLEd)",
      "Bachelor of Physical Education (BPEd)",
      "Master of Arts in Educational Management (MAEM)",
      "Master of Arts in Education – English Language Studies and Teaching (MAEd-ELST)",
      "Master of Science Teaching – Mathematics (MST MATH)",
      "Master of Science Teaching – General Science (MST-GenSci)",
      "Doctor of Philosophy in Educational Management (PhD EM)",
      "Doctor in Philosophy in Science Education",
      "Doctor in Philosophy in English Language Studies and Teaching",
    ],
  },
] as const;

export const DNSC_PROGRAM_OFFERINGS_SOURCE_URL =
  "https://dnsc.edu.ph/program-offerings/";

export function findDnscInstitute(
  instituteName: string | null | undefined
): DnscInstitute | undefined {
  if (!instituteName) return undefined;
  const normalized = instituteName.trim();
  return DNSC_INSTITUTES.find((inst) => inst.name === normalized);
}

export function getProgramsForInstitute(
  instituteName: string | null | undefined
): readonly string[] {
  const inst = findDnscInstitute(instituteName);
  return inst ? inst.programs : [];
}

export function isValidInstituteProgramPair(
  instituteName: string | null | undefined,
  programName: string | null | undefined
): boolean {
  const inst = findDnscInstitute(instituteName);
  if (!inst || !programName) return false;
  const normalizedProgram = programName.trim();
  return inst.programs.includes(normalizedProgram);
}

export function hasCompleteAcademicProfile(profile: {
  institute?: string | null;
  program?: string | null;
}): boolean {
  return isValidInstituteProgramPair(profile.institute, profile.program);
}

/**
 * Determines whether a document request type requires the requester's saved
 * Institute and Program before submission.
 *
 * - All academic record, enrollment, graduation, and institutional certificate
 *   types (`tor`, `coe`, `diploma`, and any custom academic types) require
 *   Institute and Program.
 * - General catch-all `"other"` requests do NOT block submission if academic
 *   profile fields are missing, though saved Institute/Program are still
 *   automatically attached when available.
 */
const ACADEMIC_PROFILE_OPTIONAL_DOCUMENT_CODES = new Set(["other"]);

export function requiresAcademicProfileForDocument(
  documentTypeCode: string
): boolean {
  const normalized = documentTypeCode.trim().toLowerCase();
  return !ACADEMIC_PROFILE_OPTIONAL_DOCUMENT_CODES.has(normalized);
}
