import { emailSender, sendEmail } from '../../lib/resend.js';

export type ScheduledEmail = {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/** Deliver the exact composed text, with only a safe HTML representation added. */
export async function sendScheduledEmail(email: ScheduledEmail): Promise<boolean> {
  const safeBody = escapeHtml(email.body);

  return sendEmail({
    from: emailSender('ΜΕΛΑΣ ΕΝΕΡΓΕΙΑΚΗ Α.Ε.'),
    to: email.recipientEmail,
    subject: email.subject,
    text: email.body,
    html: `<!doctype html>
<html lang="el">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:32px;background:#ffffff;color:#1a1a1e;">
  <div style="max-width:680px;margin:0 auto;white-space:pre-wrap;font-family:Arial,sans-serif;font-size:15px;line-height:1.65;">${safeBody}</div>
</body>
</html>`,
    idempotencyKey: `scheduled-email/${email.id}`,
  });
}
