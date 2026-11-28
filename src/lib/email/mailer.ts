import { createClient } from "@supabase/supabase-js";
import {
  renderStaffOnboardingEmail,
  type StaffOnboardingEmailParams,
} from "@/lib/email/templates";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export interface EmailDeliveryResult {
  sent: boolean;
  provider: "resend" | "supabase" | "none";
  error?: string;
}

/**
 * Resolves the canonical application base URL from environment configuration
 * (`NEXT_PUBLIC_APP_URL`), falling back to the current request origin or
 * `http://localhost:3000` in local development.
 */
export function getAppBaseUrl(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  if (request) {
    try {
      return new URL(request.url).origin;
    } catch {
      // fall through
    }
  }
  return "http://localhost:3000";
}

/**
 * Sends a transactional HTML + plain-text email using server-side environment
 * configuration (`RESEND_API_KEY` + `EMAIL_FROM`). Never fabricates success
 * when no email provider is configured or when delivery fails.
 */
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailDeliveryResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress =
    process.env.EMAIL_FROM?.trim() ||
    "RegistrarDocs AI <onboarding@resend.dev>";

  if (!resendApiKey) {
    return {
      sent: false,
      provider: "none",
      error:
        "Email delivery provider is not configured (set RESEND_API_KEY and EMAIL_FROM in server environment variables).",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      return {
        sent: false,
        provider: "resend",
        error:
          errBody?.message ||
          `Email provider rejected delivery (HTTP ${res.status}).`,
      };
    }

    return { sent: true, provider: "resend" };
  } catch {
    return {
      sent: false,
      provider: "resend",
      error: "Network error while contacting the email delivery provider.",
    };
  }
}

export async function sendStaffOnboardingEmail(
  params: StaffOnboardingEmailParams
): Promise<EmailDeliveryResult> {
  // 1. Primary: send full branded temporary-password email via Resend if configured
  if (process.env.RESEND_API_KEY?.trim()) {
    const rendered = renderStaffOnboardingEmail(params);
    return sendTransactionalEmail({
      to: params.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 2. Fallback: use Supabase Auth's built-in email delivery (Custom SMTP / Brevo)
  // with a stateless implicit-flow client so the Staff member can open the link
  // on any browser/device without needing the Admin's PKCE code_verifier cookie.
  try {
    const config = getSupabasePublicConfig();
    if (!config) {
      return {
        sent: false,
        provider: "none",
        error: "Supabase authentication is not configured.",
      };
    }

    const appBaseUrl = params.loginUrl.replace(/\/login\/?$/, "");
    const redirectTo = `${appBaseUrl}/auth/reset-password`;
    const supabase = createClient(config.url, config.anonKey, {
      auth: {
        flowType: "implicit",
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { error } = await supabase.auth.resetPasswordForEmail(params.email, {
      redirectTo,
    });

    if (error) {
      return {
        sent: false,
        provider: "supabase",
        error:
          error.message ||
          "Supabase Auth could not send the onboarding email (check Supabase Auth email rate limits or configure RESEND_API_KEY).",
      };
    }

    return { sent: true, provider: "supabase" };
  } catch {
    return {
      sent: false,
      provider: "none",
      error:
        "Unable to send onboarding email via Supabase Auth. Configure RESEND_API_KEY in .env.local for dedicated delivery.",
    };
  }
}
