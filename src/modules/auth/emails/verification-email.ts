import { env } from "@/lib/env";

interface VerificationEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Content for the "confirm your email" message. Plain inline-styled HTML — no
 * email-template framework, since there is exactly one email so far.
 */
export function buildVerificationEmail(token: string, name?: string | null): VerificationEmail {
  const url = `${env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const greeting = name ? `Hi ${name},` : "Hi,";

  const text = [
    greeting,
    "",
    "Confirm your email address to finish setting up your GlobeLink account:",
    url,
    "",
    "This link expires in 24 hours. If you didn't create an account, you can ignore this email.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f5f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#17202e">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #dfe4ea;border-radius:12px;padding:32px">
            <tr><td style="font-size:18px;font-weight:600;padding-bottom:16px">GlobeLink</td></tr>
            <tr><td style="font-size:15px;line-height:1.6;padding-bottom:24px">
              ${greeting}<br /><br />
              Confirm your email address to finish setting up your account.
            </td></tr>
            <tr><td style="padding-bottom:24px">
              <a href="${url}" style="display:inline-block;background:#2f4d70;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:8px">Confirm email address</a>
            </td></tr>
            <tr><td style="font-size:13px;line-height:1.6;color:#586273">
              This link expires in 24 hours. If you didn't create a GlobeLink account, you can ignore this email.
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: "Confirm your GlobeLink email", html, text };
}
