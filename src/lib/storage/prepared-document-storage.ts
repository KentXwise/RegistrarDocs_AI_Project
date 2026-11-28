import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const PREPARED_DOCUMENTS_BUCKET =
  process.env.SUPABASE_PREPARED_DOCS_BUCKET?.trim() || "prepared-documents";

export const MAX_PREPARED_DOC_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;
const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

function detectPreparedDocMagicBytes(
  buffer: Buffer
): {
  ext: ".pdf" | ".jpg" | ".png";
  mime: "application/pdf" | "image/jpeg" | "image/png";
} | null {
  // PDF: %PDF-
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { ext: ".pdf", mime: "application/pdf" };
  }

  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { ext: ".jpg", mime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: ".png", mime: "image/png" };
  }

  return null;
}

export type PreparedDocUploadResult =
  | {
      ok: true;
      path: string;
      displayName: string;
      mime: "application/pdf" | "image/jpeg" | "image/png";
      size: number;
    }
  | { ok: false; error: string };

/**
 * Validates and uploads a Staff-prepared document (PDF, JPG, PNG; max 10 MB)
 * to the private `prepared-documents` Supabase Storage bucket.
 */
export async function validateAndUploadPreparedDocument(
  requestId: string,
  file: File
): Promise<PreparedDocUploadResult> {
  if (!file || file.size <= 0) {
    return { ok: false, error: "Please select a prepared document file." };
  }

  if (file.size > MAX_PREPARED_DOC_SIZE_BYTES) {
    return {
      ok: false,
      error: "File exceeds the 10 MB size limit. Please choose a smaller file.",
    };
  }

  const lowerName = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );
  const hasAllowedMime =
    file.type === ""
      ? hasAllowedExt
      : (ALLOWED_MIMES as readonly string[]).includes(file.type.toLowerCase());

  if (!hasAllowedExt || !hasAllowedMime) {
    return {
      ok: false,
      error: "Unsupported file type. Allowed formats: PDF, JPG, JPEG, or PNG.",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length <= 0 || buffer.length > MAX_PREPARED_DOC_SIZE_BYTES) {
    return {
      ok: false,
      error: "File size is invalid or exceeds the 10 MB limit.",
    };
  }

  const detected = detectPreparedDocMagicBytes(buffer);
  if (!detected) {
    return {
      ok: false,
      error:
        "File content does not match a valid PDF, JPG, or PNG document.",
    };
  }

  const safeDisplayName = file.name
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .slice(0, 120);
  const objectPath = `${requestId}/${crypto.randomUUID()}${detected.ext}`;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from(PREPARED_DOCUMENTS_BUCKET)
    .upload(objectPath, buffer, {
      contentType: detected.mime,
      upsert: false,
    });

  if (error) {
    return {
      ok: false,
      error:
        "Unable to upload the prepared document to private storage. Ensure migration 0004 has been applied.",
    };
  }

  return {
    ok: true,
    path: objectPath,
    displayName: safeDisplayName || `prepared-document${detected.ext}`,
    mime: detected.mime,
    size: buffer.length,
  };
}

export async function downloadPrivatePreparedDocument(
  objectPath: string
): Promise<Buffer | null> {
  if (!objectPath || objectPath.includes("..")) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(PREPARED_DOCUMENTS_BUCKET)
    .download(objectPath);

  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function deletePrivatePreparedDocument(
  objectPath: string
): Promise<void> {
  if (!objectPath || objectPath.includes("..")) return;
  try {
    const admin = createSupabaseAdminClient();
    await admin.storage
      .from(PREPARED_DOCUMENTS_BUCKET)
      .remove([objectPath]);
  } catch {
    // Ignore cleanup error
  }
}
