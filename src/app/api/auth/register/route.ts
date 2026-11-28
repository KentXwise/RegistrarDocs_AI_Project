import { NextResponse } from "next/server";
import {
  createRequesterProfile,
  findProfileByEmail,
  findProfileByStudentId,
} from "@/lib/db/profiles";
import {
  validateConfirmPassword,
  validateDnscEmail,
  validateFullName,
  validatePassword,
  validatePrivacyAcknowledged,
  validateStudentId,
} from "@/lib/registration-validation";
import {
  deletePrivateStudentIdImage,
  uploadStudentIdToPrivateStorage,
  validateStudentIdImageFile,
} from "@/lib/storage/student-id-storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AuthErrorCode } from "@/types/auth";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase backend is not configured yet. Please configure Supabase environment variables before submitting registrations.",
        code: "SUPABASE_NOT_CONFIGURED" satisfies AuthErrorCode,
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid registration payload. Please submit the form again.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
      },
      { status: 400 }
    );
  }

  const fullName = String(formData.get("fullName") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const dnscEmail = String(formData.get("dnscEmail") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const privacyAcknowledged =
    String(formData.get("privacyAcknowledged") ?? "") === "true";
  const imageEntry = formData.get("studentIdImage");
  const imageFile = imageEntry instanceof File ? imageEntry : null;

  // Server-side validation matching frontend rules
  const fieldErrors: Record<string, string> = {};

  const fullNameErr = validateFullName(fullName);
  if (fullNameErr) fieldErrors.fullName = fullNameErr;

  const studentIdErr = validateStudentId(studentId);
  if (studentIdErr) fieldErrors.studentId = studentIdErr;

  const emailErr = validateDnscEmail(dnscEmail);
  if (emailErr) fieldErrors.dnscEmail = emailErr;

  const passwordErr = validatePassword(password);
  if (passwordErr) fieldErrors.password = passwordErr;

  const confirmErr = validateConfirmPassword(password, confirmPassword);
  if (confirmErr) fieldErrors.confirmPassword = confirmErr;

  const privacyErr = validatePrivacyAcknowledged(privacyAcknowledged);
  if (privacyErr) fieldErrors.privacyAcknowledged = privacyErr;

  if (!imageFile || imageFile.size <= 0) {
    fieldErrors.studentIdImage =
      "Please upload a clear photo of your DNSC Student ID.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      {
        error: "Please correct the highlighted registration fields.",
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
        fieldErrors,
      },
      { status: 400 }
    );
  }

  // Validate image bytes (extension, MIME, size <= 5 MB, and binary magic bytes)
  const validatedImage = await validateStudentIdImageFile(imageFile as File);
  if (!validatedImage.ok) {
    return NextResponse.json(
      {
        error: validatedImage.error,
        code: "VALIDATION_ERROR" satisfies AuthErrorCode,
        fieldErrors: {
          studentIdImage: validatedImage.error,
        },
      },
      { status: 400 }
    );
  }

  // Check duplicate email and Student ID in public.profiles
  const [existingEmail, existingStudentId] = await Promise.all([
    findProfileByEmail(dnscEmail),
    findProfileByStudentId(studentId),
  ]);

  if (existingEmail) {
    return NextResponse.json(
      {
        error: "An account with this email address is already registered.",
        code: "DUPLICATE_EMAIL" satisfies AuthErrorCode,
        fieldErrors: {
          dnscEmail:
            "An account with this email address is already registered.",
        },
      },
      { status: 409 }
    );
  }

  if (existingStudentId) {
    return NextResponse.json(
      {
        error: "An account with this Student ID Number is already registered.",
        code: "DUPLICATE_STUDENT_ID" satisfies AuthErrorCode,
        fieldErrors: {
          studentId:
            "An account with this Student ID Number is already registered.",
        },
      },
      { status: 409 }
    );
  }

  const adminClient = createSupabaseAdminClient();
  let createdAuthUserId: string | null = null;
  let uploadedImagePath: string | null = null;

  try {
    // 1. Create Supabase Auth user (passwords managed securely by Supabase Auth)
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: dnscEmail.trim(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim(),
        },
      });

    if (authError || !authData.user) {
      const msg = authError?.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered")) {
        return NextResponse.json(
          {
            error: "An account with this email address is already registered.",
            code: "DUPLICATE_EMAIL" satisfies AuthErrorCode,
            fieldErrors: {
              dnscEmail:
                "An account with this email address is already registered.",
            },
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Unable to complete registration right now. Please try again shortly.",
          code: "SERVER_ERROR" satisfies AuthErrorCode,
        },
        { status: 500 }
      );
    }

    createdAuthUserId = authData.user.id;

    // 2. Upload Student ID image to private Supabase Storage bucket
    const uploadResult = await uploadStudentIdToPrivateStorage(
      createdAuthUserId,
      validatedImage
    );

    if (!uploadResult.ok) {
      await adminClient.auth.admin
        .deleteUser(createdAuthUserId)
        .catch(() => {});
      return NextResponse.json(
        {
          error: uploadResult.error,
          code: "SERVER_ERROR" satisfies AuthErrorCode,
        },
        { status: 500 }
      );
    }

    uploadedImagePath = uploadResult.path;

    // 3. Create linked profile with hardcoded requester role & pending_approval status
    const createdUser = await createRequesterProfile({
      id: createdAuthUserId,
      fullName,
      email: dnscEmail,
      studentId,
      studentIdImagePath: uploadResult.path,
      studentIdImageMime: uploadResult.mime,
      studentIdImageSize: uploadResult.size,
    });

    return NextResponse.json(
      {
        message:
          "Your registration has been submitted and is now pending administrator approval.",
        user: {
          id: createdUser.id,
          fullName: createdUser.fullName,
          email: createdUser.email,
          studentId: createdUser.studentId,
          role: createdUser.role,
          status: createdUser.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Roll back Storage object and Auth user on failure
    if (uploadedImagePath) {
      await deletePrivateStudentIdImage(uploadedImagePath);
    }
    if (createdAuthUserId) {
      await adminClient.auth.admin
        .deleteUser(createdAuthUserId)
        .catch(() => {});
    }

    const errMessage = error instanceof Error ? error.message.toLowerCase() : "";
    if (errMessage.includes("idx_profiles_email_lower_unique")) {
      return NextResponse.json(
        {
          error: "An account with this email address is already registered.",
          code: "DUPLICATE_EMAIL" satisfies AuthErrorCode,
          fieldErrors: {
            dnscEmail:
              "An account with this email address is already registered.",
          },
        },
        { status: 409 }
      );
    }
    if (errMessage.includes("idx_profiles_student_id_lower_unique")) {
      return NextResponse.json(
        {
          error: "An account with this Student ID Number is already registered.",
          code: "DUPLICATE_STUDENT_ID" satisfies AuthErrorCode,
          fieldErrors: {
            studentId:
              "An account with this Student ID Number is already registered.",
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to complete registration right now. Please try again shortly.",
        code: "SERVER_ERROR" satisfies AuthErrorCode,
      },
      { status: 500 }
    );
  }
}
