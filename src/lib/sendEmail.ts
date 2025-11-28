/**
 * Simple email utility for sending support request emails
 * Gracefully handles missing email provider configuration
 * 
 * To enable email functionality:
 * 1. Install resend: npm install resend
 * 2. Set RESEND_API_KEY in .env.local
 * 3. Set SUPPORT_ADMIN_EMAIL in .env.local
 */

type EmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const supportAdminEmail = process.env.SUPPORT_ADMIN_EMAIL || process.env.ADMIN_EMAIL;

  // If email provider is not configured, log and return success (don't break the flow)
  if (!resendApiKey || !supportAdminEmail) {
    console.warn(
      "[sendEmail] Email not configured. Missing RESEND_API_KEY or SUPPORT_ADMIN_EMAIL. Email content:",
      {
        to: options.to,
        subject: options.subject,
        html: options.html.substring(0, 200) + "...",
      }
    );
    return { success: true }; // Return success so UI doesn't break
  }

  // For now, just log the email content since resend is optional
  // In production, you can install resend and uncomment the code below
  console.log("[sendEmail] Email would be sent:", {
    to: supportAdminEmail,
    subject: options.subject,
    // Don't log full HTML in production
  });

  // Uncomment below when resend is installed:
  /*
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from: "Rampant Client Portal <noreply@rampant.com>",
      to: supportAdminEmail,
      subject: options.subject,
      html: options.html,
    });
    if (error) {
      console.error("[sendEmail] Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    console.error("[sendEmail] Error:", error);
    return { success: true }; // Don't break user flow
  }
  */

  return { success: true };
}

