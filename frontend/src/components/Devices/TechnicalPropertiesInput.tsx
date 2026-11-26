import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Autocomplete, Button, Select, TagsInput, Text, TextInput } from "@mantine/core";
import { VariantProperty } from "../../models/deviceModel";
import { definitionOf, KeyDefinition, labelOf, proposedKeys, unitOf } from "../../utils/propertyKeys";

type Props = {
  /** The model's canonical category names: they choose the keys proposed. */
  categories: string[];
  /** The properties at first, as the catalogue has them. */
  initial: VariantProperty[];
  /** Every change, as the catalogue will store them: none empty; and
   *  whether a number is not one. */
  onChange: (properties: VariantProperty[], invalid: boolean) => void;
};

type Free = { id: number; name: string; value: string };

const NUMBER = /^-?\d+(\.\d+)?$/;

/** A decimal comma is a point to the catalogue. */
const asNumber = (raw: string) => raw.trim().replace(",", ".");

/**
 * A variant's technical properties: the keys its categories usually have,
 * each entered as Icecat stores it, then any other, name and value typed
 * freely (docs/demo-data-keys.md).
 */
const TechnicalPropertiesInput: React.FC<Props> = ({ categories, initial, onChange }) => {
  const { t, i18n } = useTranslation();
  const proposed = proposedKeys(categories);
  const proposedSet = new Set(proposed);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.filter((p) => proposedSet.has(p.property_name)).map((p) => [p.property_name, p.property_value])),
  );
  const nextId = useRef(0);
  const [free, setFree] = useState<Free[]>(() =>
    initial
      .filter((p) => !proposedSet.has(p.property_name))
      .map((p) => ({ id: nextId.current++, name: p.property_name, value: p.property_value })),
  );

  const emit = (nextValues: Record<string, string>, nextFree: Free[]) => {
    setValues(nextValues);
    setFree(nextFree);
    const invalid = proposed.some(
      (name) =>
        nextValues[name]?.trim() &&
        definitionOf(name, categories).type === "number" &&
        !NUMBER.test(asNumber(nextValues[name])),
    );
    onChange([
      ...proposed
        .filter((name) => nextValues[name]?.trim())
        .map((name) => ({
          property_name: name,
          // Saved without leaving the field: "6,1" is 6.1 all the same.
          property_value:
            definitionOf(name, categories).type === "number"
              ? asNumber(nextValues[name])
              : nextValues[name].trim(),
        })),
      ...nextFree
        .filter((row) => row.name.trim() && row.value.trim())
        .map((row) => ({ property_name: row.name.trim(), property_value: row.value.trim() })),
    ], invalid);
  };
  const set = (name: string, value: string) => emit({ ...values, [name]: value }, free);
  const setFreeRow = (id: number, change: Partial<Free>) =>
    emit(values, free.map((row) => (row.id === id ? { ...row, ...change } : row)));

  const field = (name: string, definition: KeyDefinition) => {
    const label = labelOf(definition, i18n.language);
    const value = values[name] ?? "";
    switch (definition.type) {
      case "number": {
        const unit = unitOf(definition, i18n.language);
        return (
          <TextInput
            key={name}
            label={unit ? `${label} (${unit})` : label}
            value={value}
            inputMode="decimal"
            onChange={(e) => set(name, e.currentTarget.value)}
            onBlur={() => value && set(name, asNumber(value))}
            error={value && !NUMBER.test(asNumber(value)) ? t("variantForm.numberInvalid") : undefined}
          />
        );
      }
      case "yesno":
        return (
          <Select
            key={name}
            label={label}
            value={value || null}
            onChange={(next) => set(name, next ?? "")}
            data={[
              { value: "Y", label: t("common.yes") },
              { value: "N", label: t("common.no") },
            ]}
            clearable
          />
        );
      case "choice":
        return (
          <Autocomplete
            key={name}
            label={label}
            value={value}
            onChange={(next) => set(name, next)}
            data={definition.values ?? []}
            limit={50}
            maxLength={255}
          />
        );
      case "multi":
        return (
          <TagsInput
            key={name}
            label={label}
            // Icecat joins them with a comma: "Black,Silver".
            value={value ? value.split(",") : []}
            onChange={(next) => set(name, next.join(","))}
            data={definition.values ?? []}
            limit={50}
            clearable
          />
        );
      default:
        return (
          <TextInput
            key={name}
            label={label}
            value={value}
            maxLength={255}
            onChange={(e) => set(name, e.currentTarget.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {proposed.map((name) => field(name, definitionOf(name, categories)))}
      </div>
      <div className="space-y-2">
        <Text style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("variantForm.otherProperties")}</Text>
        {free.map((row) => (
          <div key={row.id} className="flex items-end gap-2">
            <TextInput
              className="flex-1"
              label={t("variantForm.propertyName")}
              value={row.name}
              maxLength={100}
              onChange={(e) => setFreeRow(row.id, { name: e.currentTarget.value })}
            />
            <TextInput
              className="flex-1"
              label={t("variantForm.propertyValue")}
              value={row.value}
              maxLength={255}
              onChange={(e) => setFreeRow(row.id, { value: e.currentTarget.value })}
            />
            <ActionIcon
              variant="subtle"
              color="red"
              size="lg"
              aria-label={t("common.remove")}
              onClick={() => emit(values, free.filter((r) => r.id !== row.id))}
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </ActionIcon>
          </div>
        ))}
        <Button
          variant="subtle"
          size="xs"
          leftSection={<span className="material-symbols-outlined text-sm">add</span>}
          onClick={() => emit(values, [...free, { id: nextId.current++, name: "", value: "" }])}
        >
          {t("variantForm.addProperty")}
        </Button>
      </div>
    </div>
  );
};

export default TechnicalPropertiesInput;
