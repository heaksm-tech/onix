import {
  sendEmail,
  transactionalEmailRecipient,
  transactionalEmailSender,
} from '../../lib/resend.js';

const OFFICE_TIME_ZONE = 'Europe/Athens';

const expiresAtFormat = new Intl.DateTimeFormat('el-GR', {
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

/** Deliver the one-time link that lets a new account choose its first password. */
export async function sendAccountInvitationEmail({
  invitationId,
  email,
  activationUrl,
  expiresAt,
}: {
  invitationId: string;
  email: string;
  activationUrl: string;
  expiresAt: Date;
}): Promise<boolean> {
  const expiry = expiresAtFormat.format(expiresAt);

  const text = `Γεια σας,

Δημιουργήθηκε λογαριασμός για εσάς στο Onix CRM.

Ορίστε τον κωδικό πρόσβασής σας από τον παρακάτω σύνδεσμο:
${activationUrl}

Ο σύνδεσμος είναι μίας χρήσης και ισχύει έως ${expiry}.

Αν δεν περιμένατε αυτή την πρόσκληση, αγνοήστε αυτό το email.`;

  return sendEmail({
    from: transactionalEmailSender(),
    to: transactionalEmailRecipient(email),
    subject: 'Πρόσκληση στο Onix CRM',
    text,
    html: `<p>Γεια σας,</p>
<p>Δημιουργήθηκε λογαριασμός για εσάς στο <strong>Onix CRM</strong>.</p>
<p><a href="${escapeHtml(activationUrl)}">Ορίστε τον κωδικό πρόσβασής σας</a></p>
<p>Ο σύνδεσμος είναι μίας χρήσης και ισχύει έως ${escapeHtml(expiry)}.</p>
<p>Αν δεν περιμένατε αυτή την πρόσκληση, αγνοήστε αυτό το email.</p>`,
    idempotencyKey: `account-invitation/${invitationId}/${expiresAt.getTime()}`,
  });
}
