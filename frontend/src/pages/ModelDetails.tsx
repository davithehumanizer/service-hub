import { useEffect, useMemo, useState } from "react";
import { Link, useHistory, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Badge, Button, Text } from "@mantine/core";
import PageTitle from "../components/Typography/PageTitle";
import ColourSwatches from "../components/Devices/ColourSwatches";
import DeviceDetailTabs from "../components/Devices/DeviceDetailTabs";
import DeviceIcon from "../components/Devices/DeviceIcon";
import DeviceImage from "../components/Devices/DeviceImage";
import VariantConfigurator from "../components/Devices/VariantConfigurator";
import { variantName } from "../components/Devices/VariantPicker";
import { useNotification } from "../context/NotificationContext";
import { useHasTutorials } from "../hooks/useHasTutorials";
import { Device } from "../models/device";
import { DeviceModelDetail, DeviceModelVariant } from "../models/deviceModel";
import { deviceModelService } from "../services/deviceModelService";
import { deviceService } from "../services/deviceService";
import { personalDeviceService } from "../services/personalDeviceService";
import { RootState } from "../stores/globalStore";
import { tutorialsPath } from "../utils/tutorialsPath";

/**
 * A device model's page (decision 11): the model, its variants, among which
 * a visitor may name theirs — optionally, a ThinkCentre has ten thousand —
 * and the details of that variant, or of the one the model is shown with.
 * /app/device/:id leads here, on that variant.
 */
const ModelDetails = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const modelId = Number(id);
  const variantParam = Number(new URLSearchParams(location.search).get("variant"));
  const chosenId = Number.isInteger(variantParam) && variantParam > 0 ? variantParam : null;
  const { guest } = useSelector((state: RootState) => state.auth);
  const { showNotification } = useNotification();

  const [model, setModel] = useState<DeviceModelDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // The variant as the catalogue has it: its seller, its own name.
  const [variant, setVariant] = useState<Device | null>(null);
  const [variantFailed, setVariantFailed] = useState(false);
  // When the parts button was last pressed: the tabs open their parts tab.
  const [partsAt, setPartsAt] = useState(0);
  const [adding, setAdding] = useState(false);
  // How many devices of this model the user has: one more only when asked.
  const [owned, setOwned] = useState<number | null>(null);
  // What a partial choice leaves: one of its variants, until one is chosen.
  const [previewId, setPreviewId] = useState<number | null>(null);

  // The model alone: its variants are the picker's to page.
  useEffect(() => {
    // Another model's page shows nothing of the previous one meanwhile.
    setModel(null);
    setPreviewId(null);
    setNotFound(false);
    setLoadFailed(false);
    if (!Number.isInteger(modelId) || modelId <= 0) {
      setNotFound(true);
      return;
    }
    let current = true;
    deviceModelService
      .get(modelId, { limit: 1 })
      .then((found) => current && setModel(found))
      // Only a model the catalogue does not have does not exist; an outage
      // says nothing about it.
      .catch((message) => {
        if (!current) return;
        if (/not found/i.test(String(message))) setNotFound(true);
        else setLoadFailed(true);
      });
    return () => {
      current = false;
    };
  }, [modelId]);

  // The details are the chosen variant's, or one the partial choice leaves,
  // or the representative's. Read as the model, as wherever a model is
  // picked: the parts and tutorials are looked up by its brand and name, not
  // a reseller's.
  const shownId = chosenId ?? previewId ?? model?.representative_device_id ?? null;
  useEffect(() => {
    setVariantFailed(false);
    // The previous variant stays until the next one is read: its tabs are
    // not closed and reopened on the first one at each choice.
    if (!shownId || !model) {
      setVariant(null);
      return;
    }
    let current = true;
    // A ?variant= of another model, or of no entry, is dropped.
    const dropChoice = () => {
      if (current && chosenId) history.replace({ search: "" });
    };
    deviceService
      .getById(String(shownId))
      .then((device: Device) => {
        if (!current) return;
        if (chosenId && device.model_id !== model.id) dropChoice();
        else setVariant(device);
      })
      // Only an entry the catalogue does not have: a refusal or an outage
      // says nothing about the choice.
      .catch((message) => {
        if (!current) return;
        setVariant(null);
        if (chosenId && /not found/i.test(String(message))) dropChoice();
        else setVariantFailed(true);
      });
    return () => {
      current = false;
    };
  }, [shownId, model?.id]);

  const shown = useMemo(
    () => (variant && model ? { ...variant, brand: model.brand, model: model.name, model_id: model.id } : null),
    [variant, model?.id],
  );
  // With no variant to show, iFixit is asked about the model itself.
  const tutorialsSubject = useMemo(
    () =>
      shown ??
      (model && (!shownId || variantFailed)
        ? { brand: model.brand, model: model.name, categories: model.categories }
        : null),
    [shown, model?.id, shownId, variantFailed],
  );
  // A model without variant: its parts and its impact all the same.
  const alone = useMemo(
    () => (model && model.variant_count === 0 ? deviceModelService.modelAlone(model) : null),
    [model],
  );
  const hasTutorials = useHasTutorials(tutorialsSubject);

  useEffect(() => {
    if (guest) return;
    let current = true;
    personalDeviceService
      .list()
      .then((all) => current && setOwned(all.filter((d) => d.modelId === modelId).length))
      .catch(() => current && setOwned(0));
    return () => {
      current = false;
    };
  }, [guest, modelId]);

  const choose = (variant: DeviceModelVariant | null) => {
    const params = new URLSearchParams(location.search);
    if (variant) params.set("variant", String(variant.device_id));
    else params.delete("variant");
    history.replace({ search: params.toString() });
  };

  const addToMyDevices = async (another: boolean) => {
    if (!model || adding) return;
    setAdding(true);
    try {
      await personalDeviceService.add({
        modelId: model.id,
        ...(chosenId ? { deviceId: chosenId } : {}),
        another,
      });
      setOwned((count) => (count ?? 0) + 1);
      showNotification(t("modelDetails.added", { name: `${model.brand} ${model.name}` }), "success");
    } catch {
      showNotification(t("modelDetails.addFailed"), "error");
    } finally {
      setAdding(false);
    }
  };

  if (notFound) {
    return <Text c="dimmed" ta="center" py="xl">{t("modelDetails.notFound")}</Text>;
  }
  if (loadFailed) {
    return <Text c="dimmed" ta="center" py="xl">{t("errors.generic")}</Text>;
  }
  if (!model) {
    return <div>{t("common.loading")}</div>;
  }

  const deviceType = model.categories[0]?.canonicalName ?? model.categories[0]?.name ?? "";
  // "N variants" and the choice of one only from two (§4.0, case 1).
  const many = model.variant_count >= 2;
  // The chosen variant as the catalogue has it, for the list to keep in sight.
  const chosen: DeviceModelVariant | null =
    chosenId && variant && Number(variant.device_id) === chosenId
      ? {
          device_id: chosenId,
          brand: variant.brand,
          model: variant.model,
          ean: variant.ean,
          product_code: variant.product_code ?? "",
          variant_label: variant.variant_label ?? null,
          is_refurbished: !!variant.is_refurbished,
        }
      : null;

  return (
    <>
      <PageTitle>{t("modelDetails.title")}</PageTitle>
      <div className="mb-6">
        <Button
          variant="subtle"
          color="gray"
          size="sm"
          // Back to where the visitor came from, the home page or a search: it
          // always led to the library (PBI 13839). A page opened directly has
          // no key and nowhere to go back to, so the library it is.
          onClick={() => (location.key ? history.goBack() : history.push("/app/devices"))}
          leftSection={<span className="material-symbols-outlined text-sm">arrow_back</span>}
          className="mb-4 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {location.key ? t("common.back") : t("deviceDetails.backToList")}
        </Button>
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col md:flex-row p-4 sm:p-8 gap-6 sm:gap-8">
            <div className="flex-shrink-0 flex justify-center items-center bg-white dark:bg-gray-900 dark:bg-opacity-50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-inner w-full md:w-64 h-64">
              <DeviceImage
                urls={model.thumbnail ? [model.thumbnail] : []}
                alt={model.name}
                className="object-contain w-full h-full"
                fallback={<DeviceIcon deviceType={deviceType} className="text-8xl text-gray-300 dark:text-gray-600" />}
              />
            </div>
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge size="lg" radius="sm" variant="gradient" gradient={{ from: "blue", to: "cyan" }}>
                  {model.brand}
                </Badge>
                {model.categories.map((category) => (
                  <Badge key={category.id} size="lg" radius="sm" variant="outline" color="gray">
                    {category.name}
                  </Badge>
                ))}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
                {model.name}
              </h1>
              {many && (
                <div className="flex items-center flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <ColourSwatches colours={model.colours} />
                  <span>{t("devicesComponent.variantCount", { count: model.variant_count })}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  variant="light"
                  color="orange"
                  loading={tutorialsSubject !== null && hasTutorials === null}
                  disabled={!tutorialsSubject || hasTutorials === false}
                  leftSection={<span className="material-symbols-outlined text-sm">build</span>}
                  onClick={() => tutorialsSubject && history.push(tutorialsPath(tutorialsSubject))}
                >
                  {t("devicesComponent.viewTutorials")}
                </Button>
                {/* The parts this device takes, one tap away rather than in a
                    tab below the fold (PBI 13859). */}
                <Button
                  variant="light"
                  color="orange"
                  leftSection={<span className="material-symbols-outlined text-sm">build_circle</span>}
                  onClick={() => setPartsAt(Date.now())}
                >
                  {t("nav.spareParts")}
                </Button>
                {!guest && owned === 0 && (
                  <Button
                    variant="light"
                    color="blue"
                    loading={adding}
                    leftSection={<span className="material-symbols-outlined text-sm">add</span>}
                    onClick={() => addToMyDevices(false)}
                  >
                    {t("devicesComponent.addToMyDevices")}
                  </Button>
                )}
                {!guest && owned !== null && owned > 0 && (
                  <>
                    <Button
                      component={Link}
                      to="/app/devices?tab=mine"
                      variant="light"
                      color="blue"
                      leftSection={<span className="material-symbols-outlined text-sm">check</span>}
                    >
                      {t("myRepairs.inMyDevices")}
                    </Button>
                    <Button variant="subtle" color="gray" loading={adding} onClick={() => addToMyDevices(true)}>
                      {t("modelDetails.addAnother")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {many && (
        <div className="px-4 py-4 mb-6 bg-white rounded-lg shadow-md dark:bg-gray-800 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{t("modelDetails.chooseVariant")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("modelDetails.chooseVariantHelp")}</p>
          </div>
          <VariantConfigurator
            modelId={model.id}
            modelBrand={model.brand}
            modelName={model.name}
            variantCount={model.variant_count}
            chosenId={chosenId}
            chosen={chosen}
            onChoose={choose}
            onPreview={(variant) => setPreviewId(variant ? Number(variant.device_id) : null)}
          />
        </div>
      )}

      {shown ? (
        <div className="px-4 py-3 mb-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
          {many && (
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 break-words">
              {t(chosenId ? "modelDetails.chosenVariant" : "modelDetails.shownVariant", { name: variantName(shown) })}
            </h2>
          )}
          <DeviceDetailTabs device={shown} showPartsAt={partsAt} />
        </div>
      ) : alone ? (
        <div className="px-4 py-3 mb-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
          <Text c="dimmed" size="sm" mb="xs">{t("modelDetails.noVariants")}</Text>
          <DeviceDetailTabs device={alone} showPartsAt={partsAt} />
        </div>
      ) : variantFailed ? (
        <Text c="dimmed" ta="center" py="xl">{t("errors.generic")}</Text>
      ) : null}
    </>
  );
};

export default ModelDetails;
