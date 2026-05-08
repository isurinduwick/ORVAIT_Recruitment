import { Resend } from "resend";

export async function sendInviteEmail({
  candidateName,
  candidateEmail,
  roleTitle,
  token,
}: {
  candidateName: string;
  candidateEmail: string;
  roleTitle: string;
  token: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping invite email");
    return;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const assessmentLink = `${baseUrl}/q/${token}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: fromEmail,
      to: candidateEmail,
      subject: `Your ${roleTitle} Assessment Invitation`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #fff; padding: 40px 32px; border-radius: 12px;">
          <h2 style="margin: 0 0 8px; font-size: 22px; color: #111;">Hi ${candidateName},</h2>
          <p style="color: #555; line-height: 1.6; margin: 0 0 20px;">
            You've been invited to complete an online assessment for the
            <strong style="color: #111;">${roleTitle}</strong> position.
          </p>

          <p style="color: #555; line-height: 1.6; margin: 0 0 28px;">
            The assessment includes knowledge and attitude questions. Once you click
            <strong>Start</strong>, a timer begins — make sure you have a quiet block of time before
            starting.
          </p>

          <div style="text-align: center; margin: 0 0 28px;">
            <a href="${assessmentLink}"
               style="display: inline-block; background: #059669; color: #fff; padding: 13px 28px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
              Open My Assessment
            </a>
          </div>

          <p style="color: #888; font-size: 13px; line-height: 1.5; margin: 0 0 6px;">
            Or copy this link into your browser:
          </p>
          <p style="color: #059669; font-size: 13px; word-break: break-all; margin: 0 0 28px;">
            ${assessmentLink}
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 0 0 20px;" />

          <p style="color: #aaa; font-size: 12px; margin: 0;">
            If you did not apply for this role, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] Failed to send invite email:", err);
  }
}
