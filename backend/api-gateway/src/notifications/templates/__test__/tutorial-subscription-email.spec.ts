import { buildTutorialSubscriptionConfirmationEmail } from '../tutorial-subscription-email';

describe('buildTutorialSubscriptionConfirmationEmail', () => {
  it.each(['en', 'fr', 'nl', 'de'])(
    'builds a subject and html body for locale "%s"',
    (locale) => {
      const result = buildTutorialSubscriptionConfirmationEmail(locale);

      expect(result.subject).toEqual(expect.any(String));
      expect(result.subject.length).toBeGreaterThan(0);
      expect(result.html).toContain('<div');
    },
  );

  it('falls back to English content for an unsupported locale', () => {
    const unsupported = buildTutorialSubscriptionConfirmationEmail('es');
    const english = buildTutorialSubscriptionConfirmationEmail('en');

    expect(unsupported).toEqual(english);
  });
});
