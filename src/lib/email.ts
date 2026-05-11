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
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || "ORVAIT Recruitment";

  if (!apiKey || !fromEmail) {
    console.warn("[email] BREVO_API_KEY or BREVO_FROM_EMAIL not set — skipping invite email");
    return;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const assessmentLink = `${baseUrl}/q/${token}`;

  const body = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: candidateEmail, name: candidateName }],
    subject: `Your ${roleTitle} Assessment Invitation`,
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #fff; padding: 40px 32px; border-radius: 12px;">
        <div style="margin: 0 0 24px;">
          <span style="font-size: 20px; font-weight: 800; color: #059669; letter-spacing: -0.5px;">ORVAIT</span>
        </div>
        <h2 style="margin: 0 0 8px; font-size: 22px; color: #111;">Hi ${candidateName},</h2>
        <p style="color: #555; line-height: 1.6; margin: 0 0 20px;">
          You've been invited to complete an online assessment for the
          <strong style="color: #111;">${roleTitle}</strong> position.
        </p>
        <p style="color: #555; line-height: 1.6; margin: 0 0 28px;">
          The assessment includes knowledge and attitude questions. Once you click
          <strong>Start</strong>, a timer begins — make sure you have a quiet block of time before starting.
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
  };

  try {
    console.log(`[email] Sending invite to ${candidateEmail} via Brevo...`);
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[email] Brevo error:", data);
    } else {
      console.log("[email] Sent successfully, messageId:", data.messageId);
    }
  } catch (err) {
    console.error("[email] Failed to send invite email:", err);
  }
}
