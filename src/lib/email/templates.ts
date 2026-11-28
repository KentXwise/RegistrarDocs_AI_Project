function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface StaffOnboardingEmailParams {
  fullName: string;
  email: string;
  employeeId?: string | null;
  temporaryPassword: string;
  loginUrl: string;
}

/**
 * Generates a responsive, DNSC Forest Green branded HTML & plain-text email
 * for newly created Registrar Staff accounts.
 */
export function renderStaffOnboardingEmail(params: StaffOnboardingEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const safeName = escapeHtml(params.fullName);
  const safeEmail = escapeHtml(params.email);
  const safeEmpId = params.employeeId ? escapeHtml(params.employeeId) : null;
  const safeTempPass = escapeHtml(params.temporaryPassword);
  const safeLoginUrl = escapeHtml(params.loginUrl);

  const subject = "Your RegistrarDocs AI Staff Account";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#25352B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F5EF;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#FFFFFF;border-radius:16px;border:1px solid #DCE5DF;overflow:hidden;">
          <tr>
            <td style="background-color:#174D32;padding:28px 32px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#E6EFE8;">
                DNSC Registrar&rsquo;s Office
              </p>
              <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#FFFFFF;line-height:1.3;">
                Welcome to RegistrarDocs AI
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px;font-size:14px;line-height:1.65;color:#25352B;">
              <p style="margin:0 0 14px;">Hello <strong>${safeName}</strong>,</p>
              <p style="margin:0 0 20px;color:#3E4F44;">
                An official Staff account has been created for you to access the <strong>RegistrarDocs AI Staff Portal</strong> for the Davao del Norte State College (DNSC) Registrar&rsquo;s Office.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F5EF;border:1px solid #D5E2DA;border-radius:12px;margin-bottom:22px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#174D32;">
                      Your Temporary Login Credentials
                    </p>
                    <p style="margin:0 0 6px;font-size:13px;">
                      <strong>Login Email:</strong> ${safeEmail}
                    </p>
                    ${
                      safeEmpId
                        ? `<p style="margin:0 0 6px;font-size:13px;"><strong>Employee ID:</strong> ${safeEmpId}</p>`
                        : ""
                    }
                    <p style="margin:0;font-size:13px;">
                      <strong>Temporary Password:</strong>
                      <span style="display:inline-block;margin-left:6px;padding:3px 8px;background-color:#E6EFE8;border-radius:6px;font-family:Consolas,Monaco,'Courier New',monospace;font-weight:700;color:#174D32;letter-spacing:0.4px;">
                        ${safeTempPass}
                      </span>
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:#174D32;">
                    <a href="${safeLoginUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">
                      Sign In to Staff Portal
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color:#E6EFE8;border-left:4px solid #174D32;border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:13px;color:#25352B;">
                <strong>First-Login Security Requirement:</strong> You will be required to change your temporary password immediately after your first login before accessing the Staff Dashboard.
              </div>

              <p style="margin:0 0 10px;font-size:13px;color:#4B5B51;">
                For your security, please do not share your login credentials with anyone.
              </p>
              <p style="margin:0;font-size:13px;color:#4B5B51;">
                If you did not expect this account, please contact the DNSC Registrar&rsquo;s Office immediately.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#F5F5EF;border-top:1px solid #E2E8E4;padding:18px 32px;font-size:12px;color:#5F6F65;">
              <p style="margin:0;font-weight:700;color:#174D32;">RegistrarDocs AI</p>
              <p style="margin:2px 0 0;">Davao del Norte State College (DNSC) &middot; Registrar&rsquo;s Office</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    "Welcome to RegistrarDocs AI",
    "",
    `Hello ${params.fullName},`,
    "",
    "An account has been created for you to access the RegistrarDocs AI Staff portal.",
    "",
    "Your login credentials:",
    `Login Email: ${params.email}`,
    ...(params.employeeId ? [`Employee ID: ${params.employeeId}`] : []),
    `Temporary Password: ${params.temporaryPassword}`,
    "",
    `Login here: ${params.loginUrl}`,
    "",
    "For security purposes, you will be required to change your temporary password immediately after your first login before accessing the Staff dashboard.",
    "",
    "Please do not share your login credentials with anyone.",
    "If you did not expect this account, contact the DNSC Registrar's Office.",
    "",
    "RegistrarDocs AI — DNSC Registrar's Office",
  ].join("\n");

  return { subject, html, text };
}
