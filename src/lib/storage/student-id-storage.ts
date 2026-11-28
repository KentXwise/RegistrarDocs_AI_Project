import crypto from "node:crypto";
import {
  ACCEPTED_ID_IMAGE_EXTENSIONS,
  ACCEPTED_ID_IMAGE_MIME_TYPES,
  MAX_ID_IMAGE_SIZE_BYTES,
} from "@/lib/registration-validation";
import { STUDENT_ID_STORAGE_BUCKET } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function detectImageTypeFromMagicBytes(
  buffer: Buffer
): { ext: ".jpg" | ".png"; mime: "image/jpeg" | "image/png" } | null {
  // JPEG magic bytes: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { ext: ".jpg", mime: "image/jpeg" };
  }

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
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

export type ValidatedStudentIdBuffer =
  | {
      ok: true;
      buffer: Buffer;
      ext: ".jpg" | ".png";
      mime: "image/jpeg" | "image/png";
      size: number;
    }
  | { ok: false; error: string };

/**
 * Validates Student ID image extension, MIME type, 5 MB max size, and
 * actual binary magic bytes before uploading to private Supabase Storage.
 */
export async function validateStudentIdImageFile(
  file: File
): Promise<ValidatedStudentIdBuffer> {
  if (!file || file.size <= 0) {
    return {
      ok: false,
      error: "Please upload a clear photo of your DNSC Student ID.",
    };
  }

  if (file.size > MAX_ID_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      error: "Image exceeds the 5 MB size limit. Please choose a smaller file.",
    };
  }

  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ACCEPTED_ID_IMAGE_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );
  const hasAllowedMime =
    file.type === ""
      ? hasAllowedExtension
      : (ACCEPTED_ID_IMAGE_MIME_TYPES as readonly string[]).includes(
          file.type.toLowerCase()
        );

  if (!hasAllowedExtension || !hasAllowedMime) {
    return {
      ok: false,
      error:
        "Unsupported file format. Please upload a JPG, JPEG, or PNG image.",
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length <= 0 || buffer.length > MAX_ID_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      error: "Image size is invalid or exceeds the 5 MB limit.",
    };
  }

  const detected = detectImageTypeFromMagicBytes(buffer);
  if (!detected) {
    return {
      ok: false,
      error:
        "The uploaded file does not appear to be a valid JPG or PNG image.",
    };
  }

  return {
    ok: true,
    buffer,
    ext: detected.ext,
    mime: detected.mime,
    size: buffer.length,
  };
}

export type UploadedStudentIdResult =
  | { ok: true; path: string; mime: "image/jpeg" | "image/png"; size: number }
  | { ok: false; error: string };

/**
 * Uploads a validated Student ID image to the private Supabase Storage bucket
 * (`student-ids`) using a randomized filename scoped under the user ID.
 * No public URL is ever generated or exposed.
 */
export async function uploadStudentIdToPrivateStorage(
  userId: string,
  validated: Extract<ValidatedStudentIdBuffer, { ok: true }>
): Promise<UploadedStudentIdResult> {
  const adminClient = createSupabaseAdminClient();
  const objectPath = `${userId}/${crypto.randomUUID()}${validated.ext}`;

  const { error } = await adminClient.storage
    .from(STUDENT_ID_STORAGE_BUCKET)
    .upload(objectPath, validated.buffer, {
      contentType: validated.mime,
      upsert: false,
    });

  if (error) {
    return {
      ok: false,
      error:
        "Unable to store your Student ID image right now. Please try again shortly.",
    };
  }

  return {
    ok: true,
    path: objectPath,
    mime: validated.mime,
    size: validated.size,
  };
}

export async function deletePrivateStudentIdImage(
  objectPath: string
): Promise<void> {
  if (!objectPath || objectPath.includes("..")) return;
  try {
    const adminClient = createSupabaseAdminClient();
    await adminClient.storage
      .from(STUDENT_ID_STORAGE_BUCKET)
      .remove([objectPath]);
  } catch {
    // Ignore cleanup errors
  }
}
