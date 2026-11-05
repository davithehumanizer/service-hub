import { languageOf, repairerDecisionEmail } from '../repairer-decision-email';

describe('languageOf', () => {
  it('keeps the four languages, from a locale or a browser header', () => {
    expect(languageOf('fr')).toBe('fr');
    expect(languageOf('nl-BE')).toBe('nl');
    expect(languageOf('DE')).toBe('de');
  });

  it('has none for another language or nothing', () => {
    expect(languageOf('es')).toBeNull();
    expect(languageOf(undefined)).toBeNull();
    expect(languageOf(null)).toBeNull();
  });
});

describe('repairerDecisionEmail', () => {
  const url = 'https://hub.example/app/repairer/r1';

  it('says a publication in the account language, with a link to see it', () => {
    const mail = repairerDecisionEmail('published', 'fr', { name: 'Atelier Vélo', url });
    expect(mail.subject).toBe('Votre réparateur est sur la carte : Atelier Vélo');
    expect(repairerDecisionEmail('rejected', 'fr', { name: 'X', note: 'Fermé', url }).text).toContain('Motif : Fermé');
    expect(mail.text).toContain('Atelier Vélo, que vous avez proposé');
    expect(mail.text).toContain(`Le voir: ${url}`);
    expect(mail.html).toContain(`<a href="${url}">Le voir</a>`);
  });

  it('gives a refusal its reason and what to do next', () => {
    const mail = repairerDecisionEmail('rejected', 'de', {
      name: 'Repair Café',
      note: '  Adresse fehlt  ',
      url,
    });
    expect(mail.subject).toBe('Ihr Vorschlag wurde nicht angenommen: Repair Café');
    expect(mail.text).toContain('Grund: Adresse fehlt');
    expect(mail.text).toContain('„Meine Reparaturbetriebe“');
  });

  it('leaves the reason out when there is none', () => {
    const mail = repairerDecisionEmail('change_rejected', 'nl', { name: 'X', note: ' ', url });
    expect(mail.text).not.toContain('Reden');
    expect(mail.subject).toBe('Uw wijziging is niet aanvaard: X');
  });

  it('writes English for an account without a language', () => {
    expect(repairerDecisionEmail('applied', null, { name: 'X', url }).subject).toBe(
      'Your change is published: X',
    );
    expect(repairerDecisionEmail('applied', 'es', { name: 'X', url }).subject).toBe(
      'Your change is published: X',
    );
  });

  it('keeps a name with a dollar sign as typed', () => {
    const mail = repairerDecisionEmail('published', 'en', { name: "R$&D $' $$", url });
    expect(mail.subject).toBe("Your repairer is on the map: R$&D $' $$");
    expect(mail.html).toContain("<strong>R$&amp;D $&#39; $$</strong>");
  });

  it('never lets a name or a reason become markup', () => {
    const mail = repairerDecisionEmail('rejected', 'en', {
      name: '<img src=x onerror=alert(1)>',
      note: '<b>"no"</b> & \'never\'',
      url,
    });
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(mail.html).toContain('&lt;b&gt;&quot;no&quot;&lt;/b&gt; &amp; &#39;never&#39;');
    // The text part is not html: it keeps what was typed.
    expect(mail.text).toContain('<b>"no"</b>');
  });
});
