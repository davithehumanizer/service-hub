import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, Redirect, useHistory, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, MultiSelect, Text, TextInput } from "@mantine/core";
import { useNotification } from "../context/NotificationContext";
import { ApiRefusal } from "../models/deviceModel";
import { deviceModelService } from "../services/deviceModelService";
import { deviceService } from "../services/deviceService";
import { RootState } from "../stores/globalStore";
import { OpenedFrom, leaveForm } from "../utils/leaveForm";

/**
 * A model's brand, name and categories, changed by its author or an
 * administrator. A name another model has is refused, with a link to it
 * (docs/demo-data.md, §8).
 */
const ModelEditPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { showNotification } = useNotification();
  const { id } = useParams<{ id: string }>();
  const fromPage = !!useLocation<OpenedFrom | undefined>().state?.fromPage;
  const modelId = Number(id);
  const user = useSelector((state: RootState) => state.auth.user);

  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [available, setAvailable] = useState<{ value: string; label: string }[]>([]);
  const [error, setError] = useState<React.ReactNode>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let current = true;
    Promise.all([deviceModelService.get(modelId, { limit: 1 }), deviceService.getCategories()])
      .then(([model, all]) => {
        if (!current) return;
        if (!model.editable) return history.replace(`/app/model/${modelId}`);
        setBrand(model.brand);
        setName(model.name);
        setCategories(model.categories.map((c) => String(c.id)));
        setAvailable(all.map((c) => ({ value: String(c.id), label: c.name })));
        setLoaded(true);
      })
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [modelId, history]);

  if (!user) return <Redirect to="/login" />;
  if (failed) return <Text c="dimmed" ta="center" py="xl">{t("errors.generic")}</Text>;
  if (!loaded) return <div>{t("common.loading")}</div>;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    if (!brand.trim() || !name.trim()) return setError(t("modelEdit.brandAndName"));
    setSaving(true);
    try {
      await deviceModelService.update(modelId, {
        brand: brand.trim(),
        name: name.trim(),
        categories: categories.map(Number),
      });
      showNotification(t("modelEdit.saved"), "success");
      leaveForm(history, `/app/model/${modelId}`, fromPage);
    } catch (refusal: any) {
      const { statusCode, modelId: other, message } = refusal as ApiRefusal;
      setError(
        statusCode === 409 && other ? (
          <>
            {t("modelEdit.nameTaken")}{" "}
            <Link to={`/app/model/${other}`} className="underline">
              {t("variantForm.seeModel")}
            </Link>
          </>
        ) : statusCode === 403 ? (
          t("variantForm.notYours")
        ) : (
          message || t("errors.generic")
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    // Main.tsx already provides the centred container and horizontal padding.
    <div className="w-full py-10 space-y-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("modelEdit.title")}</h2>
      </div>
      <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
        {error && <Text c="red">{error}</Text>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextInput
            label={t("createDevice.brand")}
            value={brand}
            onChange={(e) => setBrand(e.currentTarget.value)}
            maxLength={100}
            withAsterisk
          />
          <TextInput
            label={t("createDevice.model")}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            maxLength={200}
            withAsterisk
          />
        </div>
        <MultiSelect
          label={t("createDevice.categories")}
          data={available}
          value={categories}
          onChange={setCategories}
          placeholder={t("createDevice.selectCategories")}
          searchable
          // Enter picks a category; with none highlighted it submitted the form.
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        />
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => leaveForm(history, `/app/model/${modelId}`, fromPage)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={saving}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ModelEditPage;
