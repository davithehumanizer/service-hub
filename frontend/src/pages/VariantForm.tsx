import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, Redirect, useHistory, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ActionIcon, Button, Text, TextInput } from "@mantine/core";
import { demoEan } from "../utils/ean";
import TechnicalPropertiesInput from "../components/Devices/TechnicalPropertiesInput";
import { useNotification } from "../context/NotificationContext";
import { DevicePhoto } from "../models/device";
import { ApiRefusal, DeviceModelDetail, VariantProperty } from "../models/deviceModel";
import { deviceModelService } from "../services/deviceModelService";
import { deviceService } from "../services/deviceService";
import { RootState } from "../stores/globalStore";
import { OpenedFrom, leaveForm } from "../utils/leaveForm";

const MAX_PHOTOS = 10;

/**
 * A variant of a model, entered by hand or changed by its author: its
 * barcode or reference, its technical properties, its photos
 * (docs/demo-data.md, §4.2). /app/model/:id/variants/new adds one,
 * /app/model/:id/variants/:variantId/edit changes one.
 */
const VariantForm: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { showNotification } = useNotification();
  const { id, variantId } = useParams<{ id: string; variantId?: string }>();
  const fromPage = !!useLocation<OpenedFrom | undefined>().state?.fromPage;
  const modelId = Number(id);
  const editing = variantId ? Number(variantId) : null;
  const user = useSelector((state: RootState) => state.auth.user);
  const contributor = user?.role?.name === "contributor";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eanRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const propertiesRef = useRef<HTMLDivElement>(null);

  const [model, setModel] = useState<DeviceModelDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [ean, setEan] = useState("");
  const [productCode, setProductCode] = useState("");
  const [initial, setInitial] = useState<VariantProperty[] | null>(editing ? null : []);
  const [properties, setProperties] = useState<VariantProperty[]>([]);
  const [propertiesInvalid, setPropertiesInvalid] = useState(false);
  const [photos, setPhotos] = useState<DevicePhoto[]>([]);
  const [selected, setSelected] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<React.ReactNode>(null);
  const [eanError, setEanError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let current = true;
    deviceModelService
      .get(modelId, { limit: 1 })
      .then((found) => current && setModel(found))
      .catch(() => current && setFailed(true));
    if (editing) {
      deviceService
        .getById(String(editing))
        .then((device) => {
          if (!current) return;
          setEan(device.ean ?? "");
          setProductCode(device.product_code ?? "");
          const technical = (device.technicalProperties ?? []).map((p) => ({
            property_name: p.property_name,
            property_value: p.property_value,
          }));
          setInitial(technical);
          setProperties(technical);
          setPhotos(device.photos ?? []);
        })
        .catch(() => current && setFailed(true));
    }
    return () => {
      current = false;
    };
  }, [modelId, editing]);

  if (!user) return <Redirect to="/login" />;
  if (failed) return <Text c="dimmed" ta="center" py="xl">{t("errors.generic")}</Text>;
  if (!model || !initial) return <div>{t("common.loading")}</div>;

  const modelPage = (variant?: number) => `/app/model/${modelId}${variant ? `?variant=${variant}` : ""}`;
  const categories = model.categories.map((c) => c.canonicalName ?? c.name);

  const pickPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);
    const room = MAX_PHOTOS - photos.length;
    setSelected((prev) => [...prev, ...files].slice(0, room));
    setPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))].slice(0, room));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const unpick = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelected((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removePhoto = async (photo: DevicePhoto) => {
    if (!editing) return;
    try {
      await deviceService.deletePhoto(editing, photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch {
      showNotification(t("variantForm.photoNotYours"), "error");
    }
  };

  const explain = (refusal: ApiRefusal) => {
    if (refusal.statusCode === 409 && refusal.modelId) {
      return (
        <>
          {t("variantForm.codeKnown")}{" "}
          <Link to={`/app/model/${refusal.modelId}`} className="underline">
            {t("variantForm.seeModel")}
          </Link>
        </>
      );
    }
    if (/needs a barcode or a reference/.test(refusal.message)) return t("variantForm.needsCode");
    if (/starts with 2/.test(refusal.message)) return t("createDevice.validation.demoEan");
    if (refusal.statusCode === 403) return t("variantForm.notYours");
    return refusal.message || t("errors.generic");
  };

  // The button is at the foot of a long form: what to fix is brought into
  // view, and focused when it is a field.
  const reveal = (where: "ean" | "properties" | "error") =>
    requestAnimationFrame(() => {
      const target =
        where === "ean"
          ? eanRef.current
          : where === "properties"
            ? propertiesRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? propertiesRef.current
            : errorRef.current;
      // At once: a smooth scroll of the layout's own scrolling <main> does
      // not always run.
      target?.scrollIntoView({ block: "center" });
      if (target instanceof HTMLInputElement) target.focus({ preventScroll: true });
    });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    const barcode = ean.replace(/\s+/g, "");
    const eanProblem =
      barcode && !/^\d{8,14}$/.test(barcode)
        ? t("createDevice.validation.eanFormat")
        : contributor && barcode && !barcode.startsWith("2")
          ? t("createDevice.validation.demoEan")
          : !barcode && !productCode.trim()
            ? t("variantForm.needsCode")
            : null;
    setEanError(eanProblem);
    if (eanProblem) return reveal("ean");
    if (propertiesInvalid) {
      setError(t("variantForm.fixProperties"));
      return reveal("properties");
    }
    setSaving(true);
    try {
      const input = { ean: barcode, product_code: productCode.trim(), technicalProperties: properties };
      const variant = editing
        ? await deviceModelService.updateVariant(modelId, editing, input)
        : await deviceModelService.addVariant(modelId, input);
      if (selected.length > 0) {
        try {
          await deviceService.addPhotos(variant.device_id, selected);
        } catch {
          showNotification(t("createDevice.photosFailed"), "error");
        }
      }
      showNotification(t(editing ? "variantForm.saved" : "variantForm.added"), "success");
      leaveForm(history, modelPage(variant.device_id), fromPage);
    } catch (refusal: any) {
      const { message } = refusal as ApiRefusal;
      // The server's reasons about the codes belong to their field.
      if (/needs a barcode or a reference|starts with 2/.test(message ?? "")) {
        setEanError(explain(refusal as ApiRefusal) as string);
        reveal("ean");
      } else {
        setError(explain(refusal as ApiRefusal));
        reveal("error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    // Main.tsx already provides the centred container and horizontal padding.
    <div className="w-full py-10 space-y-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t(editing ? "variantForm.titleEdit" : "variantForm.titleAdd")}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {model.brand} {model.name}
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-6">
        {error && (
          <div ref={errorRef}>
            <Text c="red">{error}</Text>
          </div>
        )}

        <div className="space-y-1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextInput
              ref={eanRef}
              label={t("createDevice.ean")}
              description={t(contributor ? "createDevice.demoEanHint" : "variantForm.eanHint")}
              value={ean}
              onChange={(e) => setEan(e.currentTarget.value)}
              error={eanError}
              inputMode="numeric"
              rightSectionWidth={contributor ? 100 : undefined}
              rightSectionPointerEvents="all"
              rightSection={
                contributor && (
                  <Button
                    size="compact-xs"
                    variant="light"
                    onClick={() => {
                      setEan(demoEan());
                      setEanError(null);
                    }}
                  >
                    {t("createDevice.generateEan")}
                  </Button>
                )
              }
            />
            <TextInput
              label={t("createDevice.productCode")}
              description={t("createDevice.productCodeHint")}
              value={productCode}
              onChange={(e) => setProductCode(e.currentTarget.value)}
              maxLength={100}
            />
          </div>
          <Text size="xs" c="dimmed">{t("variantForm.codesHint")}</Text>
        </div>

        <div ref={propertiesRef} className="space-y-2">
          <Text style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("variantForm.properties")}</Text>
          <Text size="xs" c="dimmed">{t("variantForm.propertiesHint")}</Text>
          <TechnicalPropertiesInput
            categories={categories}
            initial={initial}
            onChange={(next, invalid) => {
              setProperties(next);
              setPropertiesInvalid(invalid);
            }}
          />
        </div>

        <div className="space-y-2">
          <Text style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("createDevice.photos")}</Text>
          <div className="flex flex-wrap gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative w-24 h-24">
                <img src={photo.url} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                <ActionIcon
                  variant="filled"
                  color="red"
                  size="sm"
                  radius="xl"
                  className="absolute top-1 right-1"
                  aria-label={t("common.delete")}
                  onClick={() => removePhoto(photo)}
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </ActionIcon>
              </div>
            ))}
            {previews.map((src, index) => (
              <div key={src} className="relative w-24 h-24">
                <img src={src} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                <ActionIcon
                  variant="filled"
                  color="gray"
                  size="sm"
                  radius="xl"
                  className="absolute top-1 right-1"
                  aria-label={t("createDevice.removePhoto")}
                  onClick={() => unpick(index)}
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </ActionIcon>
              </div>
            ))}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={pickPhotos} />
          {photos.length + selected.length < MAX_PHOTOS && (
            <Button variant="outline" size="xs" onClick={() => fileInputRef.current?.click()}>
              {t("createDevice.addPhotos")}
            </Button>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => leaveForm(history, modelPage(editing ?? undefined), fromPage)}>
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

export default VariantForm;
