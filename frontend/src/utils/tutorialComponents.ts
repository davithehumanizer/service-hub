import { TFunction } from "i18next";

// The part of the device a repair guide is about, as far as the wizard can
// tell from the ticked symptoms and the classifier's tag. Carried to the
// tutorials page as `?component=battery,charging_port`.
export const TUTORIAL_COMPONENTS = [
  "battery",
  "screen",
  "charging_port",
  "buttons",
  "camera",
  "audio",
  "keyboard",
] as const;
export type TutorialComponent = (typeof TUTORIAL_COMPONENTS)[number];

const COMPONENTS_OF_ISSUE: Record<string, TutorialComponent[]> = {
  low_battery: ["battery"],
  not_charging: ["battery", "charging_port"],
  charging_port: ["charging_port"],
  screen_broken: ["screen"],
  no_display: ["screen"],
  flickering_display: ["screen"],
  button_malfunction: ["buttons"],
  camera_malfunction: ["camera"],
  speaker_microphone: ["audio"],
  no_sound: ["audio"],
  keyboard_faulty: ["keyboard"],
};

// The other tags (MECHANICAL, SOFTWARE…) name no single part.
const COMPONENTS_OF_TAG: Record<string, TutorialComponent[]> = {
  BATTERY: ["battery"],
};

// iFixit titles and subjects come in the interface's language: "Battery
// Replacement", "Changement batterie", "Akku tauschen", "batterij vervangen".
const PATTERN: Record<TutorialComponent, RegExp> = {
  battery: /batter|akku|accu/i,
  screen: /screen|display|lcd|oled|digitizer|écran|ecran|bildschirm|scherm/i,
  charging_port: /charg|usb|lade(anschluss|buchse|port)|laadpoort|oplaad/i,
  buttons: /button|bouton|taste|knop/i,
  camera: /camera|caméra|kamera/i,
  audio: /speaker|microphone|earpiece|audio|haut-parleur|lautsprecher|mikrofon|luidspreker|microfoon/i,
  keyboard: /keyboard|trackpad|touchpad|clavier|tastatur|toetsenbord/i,
};

/** Search term added to the YouTube query, in English like the guides. */
export const YOUTUBE_TERM: Record<TutorialComponent, string> = {
  battery: "battery",
  screen: "screen",
  charging_port: "charging port",
  buttons: "button",
  camera: "camera",
  audio: "speaker",
  keyboard: "keyboard",
};

export const componentsForIssues = (
  issues: string[],
  tag?: string | null,
): TutorialComponent[] => {
  const found = [
    ...issues.flatMap((issue) => COMPONENTS_OF_ISSUE[issue] ?? []),
    ...(COMPONENTS_OF_TAG[tag ?? ""] ?? []),
  ];
  return TUTORIAL_COMPONENTS.filter((component) => found.includes(component));
};

export const isAboutComponents = (
  guide: { title?: string; subject?: string },
  components: TutorialComponent[],
): boolean => {
  const text = `${guide.subject ?? ""} ${guide.title ?? ""}`;
  return components.some((component) => PATTERN[component].test(text));
};

/** "la batterie ou le port de charge" */
export const componentsLabel = (
  t: TFunction,
  components: TutorialComponent[],
): string =>
  components
    .map((component) => t(`tutorials.components.${component}`))
    .join(` ${t("tutorials.components.or")} `);

/** "battery,screen" from a URL, keeping only the known components. */
export const parseTutorialComponents = (
  value: string | null,
): TutorialComponent[] =>
  TUTORIAL_COMPONENTS.filter((component) =>
    (value ?? "").split(",").includes(component),
  );
