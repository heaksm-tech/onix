import { sendEmail, transactionalEmailSender } from '../../lib/resend.js';
import { renderTransactionalEmail } from '../../lib/transactional-email.js';

const OFFICE_TIME_ZONE = 'Europe/Athens';

const expiresAtFormat = new Intl.DateTimeFormat('el-GR', {
  timeZone: OFFICE_TIME_ZONE,
  dateStyle: 'long',
  timeStyle: 'short',
});

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

  const text = `Καλώς ήρθατε στο Onix CRM

Δημιουργήθηκε ένας λογαριασμός εργασίας για εσάς στο Onix CRM.

Ενεργοποιήστε τον λογαριασμό σας και ορίστε τον κωδικό πρόσβασής σας:
${activationUrl}

Η πρόσκληση λήγει στις ${expiry}.

Ο σύνδεσμος είναι προσωπικός και μίας χρήσης. Αν δεν περιμένατε αυτή την πρόσκληση, αγνοήστε αυτό το email.`;

  return sendEmail({
    from: transactionalEmailSender(),
    to: email,
    subject: 'Πρόσκληση στο Onix CRM',
    text,
    html: renderTransactionalEmail({
      preheader: 'Ενεργοποιήστε τον νέο σας λογαριασμό στο Onix CRM.',
      eyebrow: 'ΠΡΟΣΚΛΗΣΗ ΣΥΝΕΡΓΑΣΙΑΣ',
      title: 'Καλώς ήρθατε στο Onix CRM',
      paragraphs: [
        'Δημιουργήθηκε ένας λογαριασμός εργασίας για εσάς.',
        'Ενεργοποιήστε τον λογαριασμό σας και ορίστε τον κωδικό πρόσβασής σας για να ξεκινήσετε.',
      ],
      actionLabel: 'Ενεργοποίηση λογαριασμού',
      actionUrl: activationUrl,
      detailLabel: 'Η ΠΡΟΣΚΛΗΣΗ ΛΗΓΕΙ',
      detailValue: expiry,
      notice:
        'Ο σύνδεσμος είναι προσωπικός και μίας χρήσης. Αν δεν περιμένατε αυτή την πρόσκληση, μπορείτε να αγνοήσετε το email.',
    }),
    idempotencyKey: `account-invitation/${invitationId}/${expiresAt.getTime()}`,
  });
}
