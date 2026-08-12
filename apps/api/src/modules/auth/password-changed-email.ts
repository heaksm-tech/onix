import { env } from '../../config/env.js';
import { sendEmail } from '../../lib/resend.js';

const OFFICE_TIME_ZONE = 'Europe/Athens';

const changedAtFormat = new Intl.DateTimeFormat('el-GR', {
  timeZone: OFFICE_TIME_ZONE,
  dateStyle: 'long',
  timeStyle: 'short',
});

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/** Notify an account after its password has already changed successfully. */
export async function sendPasswordChangedEmail({
  userId,
  name,
  email,
  changedAt,
}: {
  userId: string;
  name: string;
  email: string;
  changedAt: Date;
}): Promise<boolean> {
  const time = changedAtFormat.format(changedAt);
  const recipient = env.isProduction ? email : env.resendDevTo;
  // Production startup validation guarantees this value. The fallback keeps
  // the type honest and is never used there.
  const productionSender = env.resendFromEmail ?? 'onboarding@resend.dev';
  const sender = env.isProduction
    ? `Onix CRM <${productionSender}>`
    : 'Onix CRM <onboarding@resend.dev>';

  const text = `Γεια σας ${name},

Ο κωδικός πρόσβασης του λογαριασμού σας στο Onix CRM άλλαξε στις ${time}.

Αν δεν κάνατε εσείς αυτή την αλλαγή, επικοινωνήστε αμέσως με τον διαχειριστή του Onix CRM.`;

  return sendEmail({
    from: sender,
    to: recipient,
    subject: 'Ο κωδικός πρόσβασής σας άλλαξε',
    text,
    html: `<p>Γεια σας ${escapeHtml(name)},</p>
<p>Ο κωδικός πρόσβασης του λογαριασμού σας στο <strong>Onix CRM</strong> άλλαξε στις ${escapeHtml(time)}.</p>
<p>Αν δεν κάνατε εσείς αυτή την αλλαγή, επικοινωνήστε αμέσως με τον διαχειριστή του Onix CRM.</p>`,
    idempotencyKey: `password-change/${userId}/${changedAt.getTime()}`,
  });
}
