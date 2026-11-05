import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Modal, Select, TextInput } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Device } from "../../../../models/device";
import { DeviceModel } from "../../../../models/deviceModel";
import { deviceService } from "../../../../services/deviceService";
import ModelSuggestions from "../../../Devices/ModelSuggestions";

type Category = Awaited<ReturnType<typeof deviceService.getCategories>>[number];

type Props = {
  opened: boolean;
  initialBrand: string;
  initialName: string;
  /** The guided search's category, by its canonical name. */
  initialCategory: string | null;
  onClose: () => void;
  /** The device as typed: no catalogue entry, no model. */
  onContinue: (device: Device) => void;
  onPickModel: (model: DeviceModel) => void;
};

/**
 * A device the search did not find, typed in by hand for this journey only:
 * the catalogue is not added to (Corentin, 07/10), the journey keeps brand
 * and model as text. The models the catalogue has under what is typed are
 * offered first. Its category is a real one, the symptoms depend on it.
 */
const ManualDeviceEntry: React.FC<Props> = ({
  opened,
  initialBrand,
  initialName,
  initialCategory,
  onClose,
  onContinue,
  onPickModel,
}) => {
  const { t } = useTranslation();
  const phone = useMediaQuery("(max-width: 640px)");
  const [brand, setBrand] = useState(initialBrand);
  const [name, setName] = useState(initialName);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setBrand(initialBrand);
    setName(initialName);
    let current = true;
    deviceService.getCategories().then((found) => {
      if (!current) return;
      setCategories(found);
      const guided = found.find((c) => c.canonicalName === initialCategory || c.name === initialCategory);
      setCategoryId(guided ? String(guided.id) : null);
    });
    return () => {
      current = false;
    };
  }, [opened, initialBrand, initialName, initialCategory]);

  const ready = brand.trim() !== "" && name.trim() !== "";

  const submit = () => {
    if (!ready) return;
    const category = categories.find((c) => String(c.id) === categoryId);
    onContinue({
      device_id: "",
      brand: brand.trim(),
      model: name.trim(),
      manufacturer: brand.trim(),
      categories: category
        ? [{ id: category.id, name: category.name, canonicalName: category.canonicalName, unukey: category.unukey }]
        : [],
      device_type: category?.canonicalName ?? "",
      ean: "",
      technicalProperties: [],
      source: "",
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t("wizard.manualEntry.title")} size="lg" fullScreen={phone}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">{t("wizard.manualEntry.hint")}</p>
        <TextInput
          label={t("wizard.manualEntry.brand")}
          value={brand}
          onChange={(e) => setBrand(e.currentTarget.value)}
          maxLength={255}
          withAsterisk
        />
        <TextInput
          label={t("wizard.manualEntry.model")}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={255}
          withAsterisk
        />
        <ModelSuggestions brand={brand} name={name} onPick={onPickModel} />
        <Select
          label={t("wizard.manualEntry.category")}
          data={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          value={categoryId}
          onChange={setCategoryId}
          searchable
          clearable
        />
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="default" onClick={onClose}>
            {t("wizard.manualEntry.cancel")}
          </Button>
          <Button color="green" disabled={!ready} onClick={submit}>
            {t("wizard.manualEntry.continue")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ManualDeviceEntry;
