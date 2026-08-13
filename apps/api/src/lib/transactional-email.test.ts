import { describe, expect, it } from 'vitest';

import { renderTransactionalEmail } from './transactional-email.js';

describe('Onix transactional email template', () => {
  it('renders the light-mode brand shell and a usable primary action', () => {
    const html = renderTransactionalEmail({
      preheader: 'Δείτε την πρόσκλησή σας.',
      eyebrow: 'ΠΡΟΣΚΛΗΣΗ ΣΥΝΕΡΓΑΣΙΑΣ',
      title: 'Καλώς ήρθατε στο Onix CRM',
      paragraphs: ['Δημιουργήθηκε ένας λογαριασμός εργασίας για εσάς.'],
      actionLabel: 'Ενεργοποίηση λογαριασμού',
      actionUrl: 'https://crm.example.gr/activate-account?token=secure-token',
      detailLabel: 'Η ΠΡΟΣΚΛΗΣΗ ΛΗΓΕΙ',
      detailValue: '14 Αυγούστου 2026 στις 12:00',
      notice: 'Ο σύνδεσμος είναι προσωπικός και μίας χρήσης.',
    });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('lang="el"');
    expect(html).toContain('background:#f8f8f7');
    expect(html).toContain('background:#ffffff');
    expect(html).toContain('background:#1a1a1e');
    expect(html).toContain('color:#4f46e5');
    expect(html).toContain('ΜΕΛΑΣ ΕΝΕΡΓΕΙΑΚΗ Α.Ε.');
    expect(html).toContain('ΠΡΟΣΚΛΗΣΗ ΣΥΝΕΡΓΑΣΙΑΣ');
    expect(html).toContain('Η ΠΡΟΣΚΛΗΣΗ ΛΗΓΕΙ');
    expect(html).toContain('>Ενεργοποίηση λογαριασμού&nbsp;&nbsp;→</a>');
    expect(
      html.match(/https:\/\/crm\.example\.gr\/activate-account\?token=secure-token/g),
    ).toHaveLength(3);
  });

  it('escapes every value supplied by the caller', () => {
    const html = renderTransactionalEmail({
      preheader: '<preview>',
      eyebrow: '<eyebrow>',
      title: '<title>',
      paragraphs: ['<paragraph>'],
      actionLabel: '<action>',
      actionUrl: 'https://example.gr/?token="unsafe"&next=<path>',
      detailLabel: '<label>',
      detailValue: '<value>',
      notice: '<notice>',
    });

    expect(html).not.toContain('<preview>');
    expect(html).not.toContain('<paragraph>');
    expect(html).not.toContain('token="unsafe"');
    expect(html).toContain('&lt;preview&gt;');
    expect(html).toContain('token=&quot;unsafe&quot;&amp;next=&lt;path&gt;');
  });
});
