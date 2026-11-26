/** The languages an email can be written in; any other gets English. */
export const LANGUAGES = ['en', 'fr', 'nl', 'de'] as const;

/** A locale such as `fr` or `fr-BE` as one of LANGUAGES, or null. */
export const languageOf = (locale?: string | null): string | null => {
  const language = (locale ?? '').slice(0, 2).toLowerCase();
  return (LANGUAGES as readonly string[]).includes(language) ? language : null;
};

/** What an administrator decided about a repairer someone proposed. */
export type RepairerDecision =
  | 'published'
  | 'rejected'
  | 'applied'
  | 'change_rejected';

type Wording = {
  subject: string;
  body: string;
  /** After a refusal: what the author can do next. */
  next?: string;
  link: string;
};

const WORDING: Record<string, Record<RepairerDecision, Wording>> = {
  en: {
    published: {
      subject: 'Your repairer is on the map: {name}',
      body: '{name}, which you proposed, is now published on Service Hub.',
      link: 'See it',
    },
    rejected: {
      subject: 'Your repairer proposal was not accepted: {name}',
      body: '{name}, which you proposed, has not been published.',
      next: 'You can correct it and send it again from "My repairers".',
      link: 'My repairers',
    },
    applied: {
      subject: 'Your change is published: {name}',
      body: 'Your change to {name} is now published on Service Hub.',
      link: 'See it',
    },
    change_rejected: {
      subject: 'Your change was not accepted: {name}',
      body: 'Your change to {name} has not been published.',
      next: 'You can propose another one from "My repairers".',
      link: 'My repairers',
    },
  },
  fr: {
    published: {
      subject: 'Votre réparateur est sur la carte : {name}',
      body: '{name}, que vous avez proposé, est maintenant publié sur le Service Hub.',
      link: 'Le voir',
    },
    rejected: {
      subject: "Votre proposition de réparateur n'a pas été retenue : {name}",
      body: "{name}, que vous avez proposé, n'a pas été publié.",
      next: 'Vous pouvez le corriger et le renvoyer depuis « Mes réparateurs ».',
      link: 'Mes réparateurs',
    },
    applied: {
      subject: 'Votre modification est publiée : {name}',
      body: 'Votre modification de {name} est maintenant publiée sur le Service Hub.',
      link: 'La voir',
    },
    change_rejected: {
      subject: "Votre modification n'a pas été retenue : {name}",
      body: "Votre modification de {name} n'a pas été publiée.",
      next: 'Vous pouvez en proposer une autre depuis « Mes réparateurs ».',
      link: 'Mes réparateurs',
    },
  },
  nl: {
    published: {
      subject: 'Uw reparateur staat op de kaart: {name}',
      body: '{name}, dat u hebt voorgesteld, is nu gepubliceerd op Service Hub.',
      link: 'Bekijken',
    },
    rejected: {
      subject: 'Uw voorstel voor een reparateur is niet aanvaard: {name}',
      body: '{name}, dat u hebt voorgesteld, is niet gepubliceerd.',
      next: 'U kunt het verbeteren en opnieuw versturen via "Mijn reparateurs".',
      link: 'Mijn reparateurs',
    },
    applied: {
      subject: 'Uw wijziging is gepubliceerd: {name}',
      body: 'Uw wijziging van {name} is nu gepubliceerd op Service Hub.',
      link: 'Bekijken',
    },
    change_rejected: {
      subject: 'Uw wijziging is niet aanvaard: {name}',
      body: 'Uw wijziging van {name} is niet gepubliceerd.',
      next: 'U kunt een andere voorstellen via "Mijn reparateurs".',
      link: 'Mijn reparateurs',
    },
  },
  de: {
    published: {
      subject: 'Ihr Reparaturbetrieb ist auf der Karte: {name}',
      body: '{name}, den Sie vorgeschlagen haben, ist jetzt auf Service Hub veröffentlicht.',
      link: 'Ansehen',
    },
    rejected: {
      subject: 'Ihr Vorschlag wurde nicht angenommen: {name}',
      body: '{name}, den Sie vorgeschlagen haben, wurde nicht veröffentlicht.',
      next: 'Sie können ihn unter „Meine Reparaturbetriebe“ korrigieren und erneut senden.',
      link: 'Meine Reparaturbetriebe',
    },
    applied: {
      subject: 'Ihre Änderung ist veröffentlicht: {name}',
      body: 'Ihre Änderung an {name} ist jetzt auf Service Hub veröffentlicht.',
      link: 'Ansehen',
    },
    change_rejected: {
      subject: 'Ihre Änderung wurde nicht angenommen: {name}',
      body: 'Ihre Änderung an {name} wurde nicht veröffentlicht.',
      next: 'Sie können unter „Meine Reparaturbetriebe“ eine andere vorschlagen.',
      link: 'Meine Reparaturbetriebe',
    },
  },
};

// With its colon: French puts a space before it.
const REASON: Record<string, string> = {
  en: 'Reason: ',
  fr: 'Motif : ',
  nl: 'Reden: ',
  de: 'Grund: ',
};

/** The name and the reason are typed by users: never markup in the html. */
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  );

/** The email telling a repairer's author what was decided, in their language. */
export function repairerDecisionEmail(
  decision: RepairerDecision,
  language: string | null | undefined,
  details: { name: string; note?: string | null; url: string },
): { subject: string; text: string; html: string } {
  const lang = languageOf(language) ?? 'en';
  const words = WORDING[lang][decision];
  // A function: a name with "$&" in it is not a replacement pattern.
  const fill = (template: string, name: string) =>
    template.replace('{name}', () => name);
  const note = details.note?.trim();

  const lines = [
    fill(words.body, details.name),
    note ? `${REASON[lang]}${note}` : null,
    words.next ?? null,
  ].filter((line): line is string => line !== null);
  const htmlLines = [
    fill(words.body, `<strong>${escapeHtml(details.name)}</strong>`),
    note ? `${REASON[lang]}${escapeHtml(note)}` : null,
    words.next ? escapeHtml(words.next) : null,
  ].filter((line): line is string => line !== null);

  return {
    subject: fill(words.subject, details.name),
    text: [...lines, `${words.link}: ${details.url}`].join('\n\n'),
    html: [
      ...htmlLines.map((line) => `<p>${line}</p>`),
      `<p><a href="${details.url}">${escapeHtml(words.link)}</a></p>`,
    ].join(''),
  };
}
