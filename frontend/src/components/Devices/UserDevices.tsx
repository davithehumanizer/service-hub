import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Input,
  Loader,
  Modal,
  Select,
  Text,
  TextInput,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { RootState } from "../../stores/globalStore";
import {
  UsageIntensity,
  VisualCondition,
} from "../../stores/repairWorkflowSlice";
import { useNotification } from "../../context/NotificationContext";
import { DeviceModelVariant } from "../../models/deviceModel";
import {
  PersonalDevice,
  PersonalDeviceChanges,
  personalDeviceService,
} from "../../services/personalDeviceService";
import {
  JourneySummary,
  repairJourneyService,
} from "../../services/repairJourneyService";
import DeviceIcon from "./DeviceIcon";
import DeviceImage from "./DeviceImage";
import VariantConfigurator from "./VariantConfigurator";
import { variantName } from "./VariantPicker";

const VISUAL_KEYS: Record<VisualCondition, string> = {
  unknown: "wizard.condition.visualUnknown",
  as_new: "wizard.condition.visualAsNew",
  good: "wizard.condition.visualGood",
  fair: "wizard.condition.visualFair",
  poor: "wizard.condition.visualPoor",
};

const USAGE_KEYS: Record<UsageIntensity, string> = {
  unknown: "wizard.condition.usageUnknown",
  hardly_used: "wizard.condition.usageHardlyUsed",
  light: "wizard.condition.usageLight",
  moderate: "wizard.condition.usageModerate",
  heavy: "wizard.condition.usageHeavy",
};

const ROUTE_KEYS: Record<string, string> = {
  DoItYourself: "wizard.dispatch.diyTitle",
  Professional: "wizard.dispatch.getHelpTitle",
  Recycle: "wizard.dispatch.recycleTitle",
  Reuse: "wizard.dispatch.reuseTitle",
};

/** The repairs listed on a card; the rest are in "My repairs". */
const HISTORY_SHOWN = 3;

const modelName = (device: PersonalDevice) =>
  device.model ? `${device.model.brand} ${device.model.name}` : "";

const sheetHref = (modelId: number, device: PersonalDevice) =>
  `/app/model/${modelId}${device.deviceId ? `?variant=${device.deviceId}` : ""}`;

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

/**
 * The signed-in user's own devices: each of a model, of a variant when
 * known, with its nickname, its state and its repair history.
 */
const UserDevices = ({ onFindDevice }: { onFindDevice?: () => void }) => {
  const { t, i18n } = useTranslation();
  const { userDevicesLastUpdated } = useSelector(
    (state: RootState) => state.auth,
  );
  const { showNotification } = useNotification();
  const [devices, setDevices] = useState<PersonalDevice[] | null>(null);
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<PersonalDevice | null>(null);
  const [removing, setRemoving] = useState<PersonalDevice | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    Promise.all([
      personalDeviceService.list(),
      // The history is a bonus: the devices show without it.
      repairJourneyService.list([]).catch(() => [] as JourneySummary[]),
    ])
      .then(([found, history]) => {
        setDevices(found);
        setJourneys(history);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(load, [load, userDevicesLastUpdated]);

  const formatDate = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(i18n.language, options).format(new Date(date));

  const remove = async () => {
    if (!removing || busy) return;
    setBusy(true);
    try {
      await personalDeviceService.remove(removing.id);
      setDevices((list) => list?.filter((d) => d.id !== removing.id) ?? null);
      showNotification(
        t("personalDevices.removed", {
          name: removing.nickname || modelName(removing),
        }),
        "success",
      );
      setRemoving(null);
    } catch {
      showNotification(t("personalDevices.removeFailed"), "error");
    } finally {
      setBusy(false);
    }
  };

  if (failed) {
    return (
      <Text c="red" ta="center" py="md">
        {t("personalDevices.loadFailed")}
      </Text>
    );
  }
  if (devices === null) {
    return (
      <div className="flex justify-center py-6">
        <Loader size="sm" />
      </div>
    );
  }
  if (devices.length === 0) {
    return (
      <div className="text-center py-6 space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          {t("personalDevices.empty")}
        </p>
        {onFindDevice && (
          <Button color="blue" onClick={onFindDevice}>
            {t("personalDevices.findDevice")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {devices.map((device) => {
        const history = journeys.filter((j) => j.ownershipId === device.id);
        const category = device.model?.categories[0];
        return (
          <div
            key={device.id}
            className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
          >
            <div className="flex gap-4">
              <div className="w-20 h-20 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-2">
                <DeviceImage
                  urls={device.model?.thumbnail ? [device.model.thumbnail] : []}
                  alt={modelName(device)}
                  className="object-contain w-full h-full"
                  fallback={
                    <DeviceIcon
                      deviceType={
                        category?.canonicalName ?? category?.name ?? ""
                      }
                      className="text-4xl text-gray-300 dark:text-gray-600"
                    />
                  }
                />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white break-words">
                    {device.nickname ||
                      modelName(device) ||
                      t("personalDevices.modelGone")}
                  </h3>
                  {device.nickname && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
                      {modelName(device) || t("personalDevices.modelGone")}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                    {device.variant
                      ? t("personalDevices.variant", {
                          name: variantName(device.variant),
                        })
                      : t("personalDevices.variantUnknown")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {device.visualCondition !== "unknown" && (
                    <Badge
                      variant="light"
                      color="gray"
                      style={{ textTransform: "none" }}
                    >
                      {t("personalDevices.condition", {
                        value: t(VISUAL_KEYS[device.visualCondition]),
                      })}
                    </Badge>
                  )}
                  {device.usageIntensity !== "unknown" && (
                    <Badge
                      variant="light"
                      color="gray"
                      style={{ textTransform: "none" }}
                    >
                      {t("personalDevices.usage", {
                        value: t(USAGE_KEYS[device.usageIntensity]),
                      })}
                    </Badge>
                  )}
                  <Badge
                    variant="light"
                    color="gray"
                    style={{ textTransform: "none" }}
                  >
                    {t("personalDevices.since", {
                      // The first of a month at midnight UTC, as entered:
                      // read locally, west of Greenwich, the month before.
                      date: formatDate(device.acquiredAt, {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      }),
                    })}
                  </Badge>
                </div>
              </div>
            </div>
            {/* Full width: beside the picture, a phone stacks them one per line. */}
            {history.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  {t("personalDevices.repairs", { count: history.length })}
                </p>
                <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
                  {history.slice(0, HISTORY_SHOWN).map((journey) => (
                    <li key={journey.id}>
                      {[
                        formatDate(journey.journeyDate, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }),
                        journey.repairRoute &&
                          t(
                            ROUTE_KEYS[journey.repairRoute] ??
                              journey.repairRoute,
                          ),
                        journey.outcome
                          ? t(`myRepairs.outcomes.${journey.outcome}`)
                          : t("personalDevices.inProgress"),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/app/my-repairs"
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t("personalDevices.allRepairs")}
                </Link>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("personalDevices.noRepairs")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {device.modelId != null && (
                <Button
                  component={Link}
                  to={sheetHref(device.modelId, device)}
                  size="xs"
                  variant="light"
                  color="blue"
                >
                  {t("personalDevices.viewSheet")}
                </Button>
              )}
              <Button
                size="xs"
                variant="light"
                color="gray"
                onClick={() => setEditing(device)}
              >
                {t("personalDevices.edit")}
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="red"
                onClick={() => setRemoving(device)}
              >
                {t("personalDevices.remove")}
              </Button>
            </div>
          </div>
        );
      })}

      {editing && (
        <EditPersonalDevice
          device={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setDevices(
              (list) =>
                list?.map((d) => (d.id === saved.id ? saved : d)) ?? null,
            );
            setEditing(null);
          }}
        />
      )}

      <Modal
        opened={removing !== null}
        onClose={() => setRemoving(null)}
        title={t("personalDevices.removeTitle")}
        centered
      >
        <Text size="sm" mb="md">
          {removing &&
            t("personalDevices.removeConfirm", {
              name: removing.nickname || modelName(removing),
            })}
        </Text>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="default" onClick={() => setRemoving(null)}>
            {t("personalDevices.cancel")}
          </Button>
          <Button color="red" loading={busy} onClick={remove}>
            {t("personalDevices.remove")}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

/** Nickname, state, date and variant of one device, changed together. */
const EditPersonalDevice = ({
  device,
  onClose,
  onSaved,
}: {
  device: PersonalDevice;
  onClose: () => void;
  onSaved: (device: PersonalDevice) => void;
}) => {
  const { t, i18n } = useTranslation();
  const { showNotification } = useNotification();
  const phone = useMediaQuery("(max-width: 640px)");
  const [nickname, setNickname] = useState(device.nickname ?? "");
  const [visualCondition, setVisualCondition] = useState<VisualCondition>(
    device.visualCondition,
  );
  const [usageIntensity, setUsageIntensity] = useState<UsageIntensity>(
    device.usageIntensity,
  );
  // Month and year apart: an input of type month is a bare text field in
  // Firefox and Safari.
  const [acquiredYear, setAcquiredYear] = useState(
    device.acquiredAt.slice(0, 4),
  );
  const [acquiredMonth, setAcquiredMonth] = useState(
    device.acquiredAt.slice(5, 7),
  );
  const thisYear = new Date().getFullYear();
  const years = Array.from(
    { length: thisYear - Math.min(Number(acquiredYear), thisYear - 30) + 1 },
    (_, i) => String(thisYear - i),
  );
  const monthName = new Intl.DateTimeFormat(i18n.language, {
    month: "long",
    timeZone: "UTC",
  });
  const [variant, setVariant] = useState<DeviceModelVariant | null>(
    device.variant,
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    // Only what changed: the variant is checked against the model when sent.
    const changes: PersonalDeviceChanges = {};
    const trimmed = nickname.trim();
    if (trimmed !== (device.nickname ?? "")) changes.nickname = trimmed || null;
    if (visualCondition !== device.visualCondition)
      changes.visualCondition = visualCondition;
    if (usageIntensity !== device.usageIntensity)
      changes.usageIntensity = usageIntensity;
    const acquired = `${acquiredYear}-${acquiredMonth}`;
    if (acquired !== device.acquiredAt.slice(0, 7)) {
      changes.acquiredAt = `${acquired}-01`;
    }
    if ((variant?.device_id ?? null) !== device.deviceId)
      changes.deviceId = variant?.device_id ?? null;
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      onSaved(await personalDeviceService.update(device.id, changes));
      showNotification(t("personalDevices.saved"), "success");
    } catch {
      showNotification(t("personalDevices.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={t("personalDevices.editTitle")}
      size="lg"
      fullScreen={phone}
    >
      <div className="space-y-4">
        <TextInput
          label={t("personalDevices.nickname")}
          description={t("personalDevices.nicknameHint")}
          value={nickname}
          maxLength={100}
          onChange={(e) => setNickname(e.currentTarget.value)}
        />
        <Select
          label={t("personalDevices.visualCondition")}
          data={(Object.keys(VISUAL_KEYS) as VisualCondition[]).map(
            (value) => ({ value, label: t(VISUAL_KEYS[value]) }),
          )}
          value={visualCondition}
          onChange={(value) =>
            value && setVisualCondition(value as VisualCondition)
          }
          allowDeselect={false}
        />
        <Select
          label={t("personalDevices.usageIntensity")}
          data={(Object.keys(USAGE_KEYS) as UsageIntensity[]).map((value) => ({
            value,
            label: t(USAGE_KEYS[value]),
          }))}
          value={usageIntensity}
          onChange={(value) =>
            value && setUsageIntensity(value as UsageIntensity)
          }
          allowDeselect={false}
        />
        <Input.Wrapper label={t("personalDevices.acquiredAt")}>
          <div className="grid grid-cols-2 gap-3">
            <Select
              aria-label={t("personalDevices.acquiredMonth")}
              data={MONTHS.map((value) => ({
                value,
                label: monthName.format(new Date(Date.UTC(2000, Number(value) - 1, 1))),
              }))}
              value={acquiredMonth}
              onChange={(value) => value && setAcquiredMonth(value)}
              allowDeselect={false}
            />
            <Select
              aria-label={t("personalDevices.acquiredYear")}
              data={years}
              value={acquiredYear}
              onChange={(value) => value && setAcquiredYear(value)}
              allowDeselect={false}
            />
          </div>
        </Input.Wrapper>
        {device.model && device.model.variant_count >= 2 && (
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {t("modelDetails.chooseVariant")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("personalDevices.variantHelp")}
              </p>
            </div>
            <VariantConfigurator
              modelId={device.model.id}
              modelBrand={device.model.brand}
              modelName={device.model.name}
              variantCount={device.model.variant_count}
              chosenId={variant?.device_id ?? null}
              chosen={variant}
              onChoose={setVariant}
            />
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="default" onClick={onClose}>
            {t("personalDevices.cancel")}
          </Button>
          <Button color="blue" loading={saving} onClick={save}>
            {t("personalDevices.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserDevices;
