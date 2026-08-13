import { noReplyEmailSender, sendEmail } from '../../lib/resend.js';

export type ScheduledEmail = {
  id: string;
  senderEmail: string;
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
    // Resend only accepts From addresses at the verified sending domain. The
    // message comes from noreply there, while replies go to the assigned user.
    from: noReplyEmailSender(),
    replyTo: email.senderEmail,
    to: email.recipientEmail,
    subject: email.subject,
    text: email.body,
    html: `<!doctype html>
<html lang="el">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:32px;background:#ffffff;color:#1a1a1e;text-align:left;">
  <div dir="auto" style="margin:0;white-space:pre-wrap;text-align:left;font-family:Arial,sans-serif;font-size:15px;line-height:1.65;">${safeBody}</div>
</body>
</html>`,
    idempotencyKey: `scheduled-email/${email.id}`,
  });
}
