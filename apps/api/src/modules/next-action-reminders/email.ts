import { env } from '../../config/env.js';
import { sendEmail, transactionalEmailSender } from '../../lib/resend.js';
import { renderTransactionalEmail } from '../../lib/transactional-email.js';

const OFFICE_TIME_ZONE = 'Europe/Athens';

const scheduledForFormat = new Intl.DateTimeFormat('el-GR', {
  timeZone: OFFICE_TIME_ZONE,
  dateStyle: 'long',
  timeStyle: 'short',
});

export type NextActionReminderEmail = {
  reminderId: string;
  communicationId: string;
  recipientName: string;
  recipientEmail: string;
  companyName: string;
  contactName: string | null;
  nextAction: string | null;
  scheduledFor: Date;
};

/** Send a Greek reminder for one due next action. */
export async function sendNextActionReminderEmail(
  reminder: NextActionReminderEmail,
): Promise<boolean> {
  const scheduledFor = scheduledForFormat.format(reminder.scheduledFor);
  const communicationUrl = `${env.appUrl}/companies/communications/${reminder.communicationId}`;
  const action = reminder.nextAction?.trim();
  const actionSentence = action
    ? `Η επόμενη ενέργεια είναι: ${action}`
    : 'Χρειάζεται να πραγματοποιήσετε την επόμενη ενέργεια για αυτή την επικοινωνία.';
  const contactSentence = reminder.contactName
    ? `Επαφή: ${reminder.contactName}.`
    : 'Δείτε την επικοινωνία στο Onix CRM για όλες τις διαθέσιμες πληροφορίες.';

  const text = `Γεια σας ${reminder.recipientName},

Έφτασε η ώρα για την επόμενη ενέργεια σχετικά με την εταιρεία ${reminder.companyName}.

${actionSentence}

${contactSentence}
Προγραμματισμένη ώρα: ${scheduledFor}

Προβολή επικοινωνίας:
${communicationUrl}

Αυτό είναι αυτοματοποιημένο μήνυμα από το Onix CRM.`;

  return sendEmail({
    from: transactionalEmailSender(),
    to: reminder.recipientEmail,
    subject: `Υπενθύμιση επόμενης ενέργειας — ${reminder.companyName}`,
    text,
    html: renderTransactionalEmail({
      preheader: `Έφτασε η ώρα για την επόμενη ενέργεια σχετικά με την εταιρεία ${reminder.companyName}.`,
      eyebrow: 'ΥΠΕΝΘΥΜΙΣΗ ΕΠΟΜΕΝΗΣ ΕΝΕΡΓΕΙΑΣ',
      title: 'Ώρα για την επόμενη ενέργεια',
      paragraphs: [
        `Γεια σας ${reminder.recipientName},`,
        `Έφτασε η ώρα για την επόμενη ενέργεια σχετικά με την εταιρεία ${reminder.companyName}.`,
        actionSentence,
      ],
      actionLabel: 'Προβολή επικοινωνίας',
      actionUrl: communicationUrl,
      detailLabel: 'ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΗ ΩΡΑ',
      detailValue: scheduledFor,
      notice: contactSentence,
    }),
    idempotencyKey: `next-action-reminder/${reminder.reminderId}`,
  });
}
