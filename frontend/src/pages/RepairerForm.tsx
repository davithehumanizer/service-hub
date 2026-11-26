import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Redirect, useHistory, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Loader, MultiSelect, Select, Text, TextInput, Textarea } from "@mantine/core";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import marker from "../assets/img/marker-icon.png";
import { useNotification } from "../context/NotificationContext";
import { OwnRepairer, Repairer, RepairerProposal } from "../models/repairer";
import { repairerService, RepairerRefusal } from "../services/repairerService";
import { RootState } from "../stores/globalStore";
import { PhotonPlace, searchPlaces } from "../utils/photon";
import {
  COUNTRY_CODES,
  PROPOSABLE_PARTNER_TYPES,
  countryLabel,
  deviceTypeOptions,
  partnerTypeLabel,
} from "../components/Repairers/repairerFields";

type Form = Omit<RepairerProposal, "latitude" | "longitude"> & {
  latitude: number | null;
  longitude: number | null;
};

const EMPTY: Form = {
  name: "",
  description: null,
  address: "",
  postal_code: null,
  city: "",
  country: "",
  website: null,
  email: null,
  phone: null,
  latitude: null,
  longitude: null,
  partner_type: "repairer",
  device_types: [],
};

const pin = new L.Icon({ iconUrl: marker, iconSize: [25, 41], iconAnchor: [12, 41] });
/** The project's countries, before anything is placed. */
const OVERVIEW: [number, number] = [50.5, 5.5];

const HEADING = "text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";

/** A repairer as the form edits it: its waiting change, if any, over it. */
const formOf = (repairer: Repairer | OwnRepairer): Form => {
  const waiting = "revision" in repairer && repairer.revision?.status === "pending" ? repairer.revision.changes : {};
  return {
    name: repairer.name,
    description: repairer.description ?? null,
    address: repairer.address,
    postal_code: repairer.postal_code ?? null,
    city: repairer.city,
    country: repairer.country,
    website: repairer.website ?? null,
    email: repairer.email ?? null,
    phone: repairer.phone ?? null,
    latitude: repairer.latitude != null ? Number(repairer.latitude) : null,
    longitude: repairer.longitude != null ? Number(repairer.longitude) : null,
    partner_type: repairer.partner_type ?? "repairer",
    device_types: repairer.repairerDevices.map((d) => d.device_type),
    ...waiting,
  } as Form;
};

/** Follows the pin when it moves, and places it where the map is clicked. */
const PinControl: React.FC<{
  latitude: number | null;
  longitude: number | null;
  onPlace: (lat: number, lng: number) => void;
}> = ({ latitude, longitude, onPlace }) => {
  const map = useMap();
  // The coordinates, not an array made anew at each render: typing in
  // another field must not bring the map back to the pin.
  useEffect(() => {
    if (latitude != null && longitude != null) map.setView([latitude, longitude], Math.max(map.getZoom(), 16));
  }, [latitude, longitude, map]);
  useMapEvents({ click: (e) => onPlace(e.latlng.lat, e.latlng.lng) });
  return null;
};

/** The address search: picking a suggestion fills the address and places the pin. */
const AddressSearch: React.FC<{ near: { latitude: number; longitude: number } | null; onPick: (place: PhotonPlace) => void }> = ({
  near,
  onPick,
}) => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PhotonPlace[]>([]);
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      abort.current?.abort();
    },
    [],
  );

  const search = async (value: string) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setSearching(true);
    try {
      const found = await searchPlaces(value, { language: i18n.language, near, signal: controller.signal, max: 6, streets: true });
      setPlaces(found);
      setActive(0);
      setError(found.length ? "" : t("repairMap.addressNotFound"));
    } catch (err: any) {
      if (err?.name !== "AbortError") setError(t("repairMap.geocodingFailed"));
    } finally {
      if (abort.current === controller) setSearching(false);
    }
  };

  // Stops what is waiting or under way: an answer arriving later would bring
  // the suggestions back under an emptied field.
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    abort.current?.abort();
    setSearching(false);
    setPlaces([]);
  };

  const onChange = (value: string) => {
    setQuery(value);
    setError("");
    if (value.trim().length < 3) return stop();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void search(value.trim()), 300);
  };

  const pick = (place: PhotonPlace) => {
    onPick(place);
    setQuery("");
    stop();
  };

  return (
    <div className="relative">
      <TextInput
        label={t("repairerForm.searchAddress")}
        placeholder={t("repairerForm.searchPlaceholder")}
        value={query}
        onChange={(e) => onChange(e.currentTarget.value)}
        leftSection={<span className="material-symbols-outlined text-base">search</span>}
        rightSection={searching ? <Loader size="xs" /> : null}
        error={error || undefined}
        autoComplete="off"
        onBlur={() => setPlaces([])}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && places.length) {
            e.preventDefault();
            setActive((i) => (i + 1) % places.length);
          } else if (e.key === "ArrowUp" && places.length) {
            e.preventDefault();
            setActive((i) => (i - 1 + places.length) % places.length);
          } else if (e.key === "Enter") {
            // Enter picks a suggestion; it must not send the form.
            e.preventDefault();
            if (places[active]) pick(places[active]);
          } else if (e.key === "Escape") {
            setPlaces([]);
          }
        }}
      />
      {places.length > 0 && (
        <ul className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {places.map((place, index) => (
            <li key={place.label}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(place);
                }}
                onMouseEnter={() => setActive(index)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-200 ${
                  index === active ? "bg-customgreen-50 dark:bg-gray-700" : ""
                }`}
              >
                <span className="material-symbols-outlined text-base text-customgreen-600">location_on</span>
                <span className="truncate">{place.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Propose a repairer, or change one proposed. It reaches the map once an
 * administrator publishes it; a change to a published one waits likewise
 * while the map keeps the old version (docs/demo-data.md, §4.3).
 */
const RepairerForm: React.FC = () => {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const { showNotification } = useNotification();
  const { id } = useParams<{ id?: string }>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { latitude, longitude } = useSelector((state: RootState) => state.auth);
  const admin = user?.role?.name === "admin";

  const [form, setForm] = useState<Form>(EMPTY);
  const [existing, setExisting] = useState<Repairer | OwnRepairer | null>(null);
  const [loaded, setLoaded] = useState(!id);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Once sent, what is still missing is shown on the field itself.
  const [checked, setChecked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!id) return;
    let current = true;
    // Its author's own list carries the waiting change; an administrator
    // may open any repairer.
    repairerService
      .listMine()
      .then((mine) => mine.find((r) => r.repairer_id === id) ?? repairerService.getRepairer(id))
      .then((repairer: Repairer | OwnRepairer) => {
        if (!current) return;
        setExisting(repairer);
        setForm(formOf(repairer));
        setLoaded(true);
      })
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [id]);

  const devices = useMemo(() => deviceTypeOptions(t), [t]);
  const countries = useMemo(() => {
    const codes = form.country && !COUNTRY_CODES.includes(form.country) ? [...COUNTRY_CODES, form.country] : COUNTRY_CODES;
    return codes.map((code) => ({ value: code, label: countryLabel(code, i18n.language) }));
  }, [form.country, i18n.language]);

  if (!user) return <Redirect to="/login" />;
  if (failed) return <Text c="dimmed" ta="center" py="xl">{t("errors.generic")}</Text>;
  if (!loaded) return <div>{t("common.loading")}</div>;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: "description" | "postal_code" | "website" | "email" | "phone") => ({
    value: form[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.currentTarget.value || null),
  });

  const published = existing?.status === "published";
  const waitingChange = existing && "revision" in existing && existing.revision?.status === "pending";
  const at: [number, number] | null = form.latitude != null && form.longitude != null ? [form.latitude, form.longitude] : null;

  const missing = {
    name: !form.name.trim(),
    address: !form.address.trim(),
    city: !form.city.trim(),
    country: !form.country,
    pin: !at,
  };
  const invalid = (field: keyof typeof missing) => (checked && missing[field] ? t("repairerForm.fieldRequired") : undefined);

  // The button is at the foot of a long form: the first thing missing is
  // brought into view, and focused when it is a field.
  const reveal = () =>
    requestAnimationFrame(() => {
      const target = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-missing="true"]');
      target?.scrollIntoView({ block: "center" });
      if (target instanceof HTMLInputElement) target.focus({ preventScroll: true });
    });

  // The whole address comes from the place picked: what it lacks is left
  // empty to fill in, not kept from a previous one.
  const onPick = (place: PhotonPlace) =>
    setForm((f) => ({
      ...f,
      address: place.street ?? "",
      postal_code: place.postcode ?? null,
      city: place.city ?? "",
      country: place.countryCode,
      latitude: place.latitude,
      longitude: place.longitude,
    }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setChecked(true);
    if (missing.name || missing.address || missing.city || missing.country) {
      setError(t("repairerForm.required"));
      return reveal();
    }
    if (form.latitude == null || form.longitude == null) {
      setError(t("repairerForm.pinMissing"));
      return reveal();
    }
    const website = form.website?.trim();
    const proposal: RepairerProposal = {
      ...form,
      // "www.atelier.fr" would otherwise link to a page of this site.
      website: website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : null,
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
    };
    setSaving(true);
    try {
      if (id) {
        const changed = await repairerService.changeProposal(id, proposal);
        showNotification(t(changed.revision?.status === "pending" ? "repairerForm.changeSent" : "repairerForm.saved"), "success");
      } else {
        await repairerService.propose(proposal);
        showNotification(t(admin ? "repairerForm.published" : "repairerForm.sent"), "success");
      }
      history.push("/app/my-repairers");
    } catch (refusal: any) {
      const { statusCode, message } = refusal as RepairerRefusal;
      setError(statusCode === 403 ? t("repairerForm.notYours") : statusCode === 400 ? message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    // Main.tsx already provides the centred container and horizontal padding.
    <div className="w-full py-10 space-y-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t(id ? "repairerForm.titleEdit" : "repairerForm.titleNew")}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t(admin ? "repairerForm.introAdmin" : published ? "repairerForm.introPublished" : "repairerForm.intro")}
        </p>
        {waitingChange && !admin && (
          <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">{t("repairerForm.pendingChange")}</p>
        )}
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-8">
        <section className="space-y-4">
          <h3 className={HEADING}>{t("repairerForm.sectionPlace")}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextInput
              label={t("repairerForm.name")}
              value={form.name}
              onChange={(e) => set("name", e.currentTarget.value)}
              maxLength={255}
              withAsterisk
              error={invalid("name")}
            />
            <Select
              label={t("repairerForm.activity")}
              data={PROPOSABLE_PARTNER_TYPES.map((type) => ({ value: type, label: partnerTypeLabel(t, type) }))}
              value={form.partner_type}
              onChange={(value) => value && set("partner_type", value)}
              allowDeselect={false}
              withAsterisk
            />
          </div>
          <Textarea label={t("repairerForm.description")} {...text("description")} maxLength={2000} autosize minRows={2} />
        </section>

        <section className="space-y-4">
          <h3 className={HEADING}>{t("repairerForm.sectionAddress")}</h3>
          <AddressSearch near={latitude != null && longitude != null ? { latitude, longitude } : null} onPick={onPick} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <TextInput
                label={t("repairerForm.street")}
                value={form.address}
                onChange={(e) => set("address", e.currentTarget.value)}
                maxLength={255}
                withAsterisk
                error={invalid("address")}
              />
            </div>
            <TextInput label={t("repairerForm.postalCode")} {...text("postal_code")} maxLength={20} />
            <TextInput
              label={t("repairerForm.city")}
              value={form.city}
              onChange={(e) => set("city", e.currentTarget.value)}
              maxLength={255}
              withAsterisk
              error={invalid("city")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Select
              label={t("repairerForm.country")}
              data={countries}
              value={form.country || null}
              onChange={(value) => set("country", value ?? "")}
              withAsterisk
              error={invalid("country")}
            />
          </div>
          <div>
            <div
              data-missing={checked && missing.pin}
              className={`h-64 overflow-hidden rounded-lg border ${
                checked && missing.pin ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <MapContainer center={at ?? OVERVIEW} zoom={at ? 16 : 6} scrollWheelZoom={false} className="h-full w-full z-0">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <PinControl
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onPlace={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
                />
                {at && (
                  <Marker
                    position={at}
                    icon={pin}
                    draggable
                    eventHandlers={{
                      dragend: (e) => {
                        const { lat, lng } = (e.target as L.Marker).getLatLng();
                        setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
                      },
                    }}
                  />
                )}
              </MapContainer>
            </div>
            <p className={`mt-2 text-sm ${checked && missing.pin ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
              {t("repairerForm.pinHint")}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className={HEADING}>{t("repairerForm.sectionContact")}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <TextInput label={t("repairerForm.website")} placeholder="https://" {...text("website")} maxLength={255} />
            <TextInput label={t("repairerForm.email")} type="email" {...text("email")} maxLength={255} />
            <TextInput label={t("repairerForm.phone")} type="tel" {...text("phone")} maxLength={50} />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className={HEADING}>{t("repairerForm.devices")}</h3>
          <MultiSelect
            data={devices}
            value={form.device_types}
            onChange={(value) => set("device_types", value)}
            placeholder={t("repairerForm.devicesPlaceholder")}
            aria-label={t("repairerForm.devices")}
            searchable
            clearable
            maxDropdownHeight={280}
            // Enter picks a type; with none highlighted it sent the form.
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          />
        </section>

        {error && <Text c="red">{error}</Text>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => history.push("/app/my-repairers")}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={saving}>
            {t(id ? "repairerForm.submitEdit" : "repairerForm.submitNew")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RepairerForm;
