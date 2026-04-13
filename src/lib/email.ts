import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInviteEmail({
  to,
  inviterName,
  tenantName,
  role,
  inviteLink,
}: {
  to: string;
  inviterName: string;
  tenantName: string;
  role: string;
  inviteLink: string;
}) {
  try {
    await resend.emails.send({
      from: "CRM WhatsTask <onboarding@resend.dev>",
      to,
      subject: `You've been invited to join ${tenantName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">You're Invited!</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            <strong>${inviterName}</strong> has invited you to join
            <strong>${tenantName}</strong> as a <strong>${role}</strong>.
          </p>
          <a href="${inviteLink}" style="display: inline-block; margin-top: 24px; padding: 12px 32px; background-color: #7C3AED; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Accept Invitation
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            This invite expires in 7 days. If you didn't expect this, you can ignore this email.
          </p>
        </div>
      `,
    });
    return { sent: true };
  } catch (error) {
    console.error("Failed to send invite email:", error);
    return { sent: false, error };
  }
}
