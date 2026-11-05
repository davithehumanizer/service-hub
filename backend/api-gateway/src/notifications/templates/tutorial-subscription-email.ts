const CONTENT: Record<
  string,
  { subject: string; heading: string; body: string; footer: string }
> = {
  en: {
    subject: 'We will notify you when a tutorial is available',
    heading: 'Subscription confirmed',
    body: 'Thank you for your interest! We will send you an email as soon as a repair tutorial becomes available for your device.',
    footer: 'The care2repair.eu team',
  },
  fr: {
    subject: 'Nous vous préviendrons dès qu’un tutoriel sera disponible',
    heading: 'Abonnement confirmé',
    body: 'Merci pour votre intérêt ! Nous vous enverrons un email dès qu’un tutoriel de réparation sera disponible pour votre appareil.',
    footer: 'L’équipe care2repair.eu',
  },
  nl: {
    subject: 'We laten het u weten zodra een tutorial beschikbaar is',
    heading: 'Inschrijving bevestigd',
    body: 'Bedankt voor uw interesse! We sturen u een e-mail zodra er een reparatietutorial beschikbaar is voor uw apparaat.',
    footer: 'Het care2repair.eu-team',
  },
  de: {
    subject: 'Wir benachrichtigen Sie, sobald ein Tutorial verfügbar ist',
    heading: 'Anmeldung bestätigt',
    body: 'Vielen Dank für Ihr Interesse! Wir senden Ihnen eine E-Mail, sobald ein Reparatur-Tutorial für Ihr Gerät verfügbar ist.',
    footer: 'Das care2repair.eu-Team',
  },
};

export function buildTutorialSubscriptionConfirmationEmail(locale: string): {
  subject: string;
  html: string;
} {
  const content = CONTENT[locale] ?? CONTENT.en;

  return {
    subject: content.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #6e9922;">${content.heading}</h2>
        <p>${content.body}</p>
        <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">${content.footer}</p>
      </div>
    `,
  };
}
