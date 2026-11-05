import { TFunction } from "i18next";
import { partnerActivities } from "../../utils/partnerTypes";
import { DEVICE_TYPE_GROUPS, getDeviceTypeGroup } from "../../utils/repairerDeviceGroups";
import { RepairerProposal } from "../../models/repairer";

/** The partner types one may propose: 'other' fits nothing on the map. */
export const PROPOSABLE_PARTNER_TYPES = ["repairer", "repairer_reuse", "both", "reuse", "recycler"];

/** "Réparateur + Seconde main", from the map's own activity names. */
export const partnerTypeLabel = (t: TFunction, type?: string | null): string =>
  partnerActivities(type)
    .map((activity) => t(`repairMap.partnerTypeOptions.${activity}`))
    .join(" + ");

/**
 * Every device type the server accepts, by the map's groups. The labels'
 * keys are the server's list, all 74 in each locale.
 */
export const deviceTypeOptions = (t: TFunction) => {
  const labels = t("repairerDeviceTypes", { returnObjects: true }) as Record<string, string>;
  return DEVICE_TYPE_GROUPS.map((group) => ({
    group: t(`repairMap.deviceGroups.${group}`),
    items: Object.keys(labels)
      .filter((type) => getDeviceTypeGroup(type) === group)
      .map((type) => ({ value: type, label: labels[type] }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }));
};

/** The label of each field a change may touch, in the form's words. */
export const FIELD_LABELS: Record<keyof RepairerProposal, string> = {
  name: "repairerForm.name",
  description: "repairerForm.description",
  address: "repairerForm.street",
  postal_code: "repairerForm.postalCode",
  city: "repairerForm.city",
  country: "repairerForm.country",
  website: "repairerForm.website",
  email: "repairerForm.email",
  phone: "repairerForm.phone",
  latitude: "repairerForm.latitude",
  longitude: "repairerForm.longitude",
  partner_type: "repairerForm.activity",
  device_types: "repairerForm.devices",
};

/** The project's countries: where the address search looks. */
export const COUNTRY_CODES = ["BE", "DE", "FR", "LU", "NL", "CH"];

/** A country's name in the reader's language. */
export const countryLabel = (code: string, language: string): string => {
  try {
    return new (Intl as any).DisplayNames([language], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};
