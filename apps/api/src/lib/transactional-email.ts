type TransactionalEmailTemplate = {
  preheader: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  actionLabel: string;
  actionUrl: string;
  detailLabel: string;
  detailValue: string;
  notice: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Render the shared Onix transactional email shell.
 *
 * The layout uses tables and inline styles deliberately: invitations must
 * retain their hierarchy in older Outlook versions as well as modern clients.
 * Colors mirror the application's light-mode tokens in globals.css.
 */
export function renderTransactionalEmail(template: TransactionalEmailTemplate): string {
  const paragraphs = template.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px;color:#5b5b66;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:24px;">${escapeHtml(paragraph)}</p>`,
    )
    .join('');

  const actionUrl = escapeHtml(template.actionUrl);

  return `<!doctype html>
<html lang="el">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(template.title)}</title>
  <style>
    :root { color-scheme: light; supported-color-schemes: light; }
    @media only screen and (max-width: 620px) {
      .email-shell { padding: 20px 12px !important; }
      .email-card { border-radius: 16px !important; }
      .email-content { padding: 34px 24px 28px !important; }
      .email-title { font-size: 27px !important; line-height: 34px !important; }
      .email-action { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f8f8f7;color:#1a1a1e;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">${escapeHtml(template.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f8f8f7;">
    <tr>
      <td class="email-shell" align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;">
          <tr>
            <td style="padding:0 6px 18px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="38" height="38" align="center" valign="middle" style="width:38px;height:38px;border-radius:10px;background:#1a1a1e;color:#ffffff;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;font-weight:700;line-height:38px;">O</td>
                  <td style="padding-left:11px;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    <div style="color:#1a1a1e;font-size:16px;font-weight:700;letter-spacing:-0.2px;line-height:20px;">Onix CRM <span style="padding-left:4px;color:#4f46e5;font-family:Arial,sans-serif;font-size:11px;">◆</span></div>
                    <div style="margin-top:1px;color:#9b9ba4;font-size:9px;font-weight:600;letter-spacing:0.65px;line-height:13px;">ΜΕΛΑΣ ΕΝΕΡΓΕΙΑΚΗ Α.Ε.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-card" style="overflow:hidden;border:1px solid #e7e7e4;border-radius:20px;background:#ffffff;box-shadow:0 1px 2px rgba(16,16,20,0.04);">
              <div style="height:4px;background:#4f46e5;font-size:0;line-height:0;">&nbsp;</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="email-content" style="padding:46px 48px 40px;">
                    <div style="margin:0 0 14px;color:#4f46e5;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:700;letter-spacing:1.4px;line-height:16px;text-transform:uppercase;">${escapeHtml(template.eyebrow)}</div>
                    <h1 class="email-title" style="margin:0 0 20px;color:#1a1a1e;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:32px;font-weight:700;letter-spacing:-0.8px;line-height:39px;">${escapeHtml(template.title)}</h1>
                    ${paragraphs}
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 24px;">
                      <tr>
                        <td style="border-radius:9px;background:#1a1a1e;">
                          <a class="email-action" href="${actionUrl}" style="display:inline-block;border:1px solid #1a1a1e;border-radius:9px;background:#1a1a1e;color:#ffffff;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:650;line-height:20px;padding:12px 20px;text-decoration:none;">${escapeHtml(template.actionLabel)}&nbsp;&nbsp;→</a>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 24px;border:1px solid #e7e7e4;border-radius:12px;background:#f8f8f7;">
                      <tr>
                        <td style="padding:15px 17px;">
                          <div style="margin:0 0 3px;color:#9b9ba4;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.7px;line-height:16px;text-transform:uppercase;">${escapeHtml(template.detailLabel)}</div>
                          <div style="color:#1a1a1e;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:600;line-height:21px;">${escapeHtml(template.detailValue)}</div>
                        </td>
                      </tr>
                    </table>
                    <div style="margin:0;padding:14px 16px;border-radius:10px;background:#eef0fd;color:#4338ca;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:20px;">${escapeHtml(template.notice)}</div>
                    <div style="margin:28px 0 0;padding-top:22px;border-top:1px solid #e7e7e4;color:#9b9ba4;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;line-height:17px;">
                      Αν το κουμπί δεν λειτουργεί, αντιγράψτε αυτόν τον σύνδεσμο:<br>
                      <a href="${actionUrl}" style="color:#5b5b66;text-decoration:underline;word-break:break-all;">${actionUrl}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 20px 0;color:#9b9ba4;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;line-height:17px;">
              Onix CRM&nbsp;&nbsp;·&nbsp;&nbsp;ΜΕΛΑΣ ΕΝΕΡΓΕΙΑΚΗ Α.Ε.<br>
              Αυτό είναι αυτοματοποιημένο μήνυμα. Δεν χρειάζεται να απαντήσετε.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
