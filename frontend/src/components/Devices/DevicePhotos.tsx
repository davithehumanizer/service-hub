import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Badge, Button, Loader, Popover, SegmentedControl, Text } from "@mantine/core";
import DemoBadge from "./DemoBadge";

/** A photo someone added, the variant's or its model's. */
export type AddedPhoto = {
  id: string;
  url: string;
  isDemo?: boolean;
  /** Its author or an administrator reads it. */
  deletable?: boolean;
};

type Props = {
  /** The catalogue's one picture, its sizes best first: tried in turn. */
  catalogue: string[];
  added: AddedPhoto[];
  /** For a signed-in reader: the files go to the model. */
  onAdd?: (files: File[]) => Promise<void>;
  onDelete?: (photo: AddedPhoto) => Promise<void>;
};

const MAX_FILES = 10;
const MAX_BYTES = 10 * 1024 * 1024;

// Tailwind 2 has no aspect-ratio utility: aspect-square makes no CSS.
const SQUARE = { aspectRatio: "1 / 1" } as const;
const GRID = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3";
const TILE = "relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white";
const HEADING = "text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";

/**
 * A device's photos in one place: the catalogue's picture, then those people
 * added, each with who may remove it. Icecat lists one picture in four sizes:
 * shown once, the next size taking over when one does not load.
 */
const DevicePhotos: React.FC<Props> = ({ catalogue, added, onAdd, onDelete }) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  // Each catalogue size's pixels, measured once the picture is on screen; null
  // for one that does not load.
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number } | null>>({});
  const [catalogueShown, setCatalogueShown] = useState(false);
  const [enlarged, setEnlarged] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const catalogueUrl = catalogue.find((url) => sizes[url] !== null);
  // A string, not the array: the parent passes a new one on every render.
  const catalogueKey = catalogue.join("\n");

  useEffect(() => {
    if (!catalogueShown) return;
    catalogueKey.split("\n").forEach((url) => {
      const img = new Image();
      img.onload = () => setSizes((s) => ({ ...s, [url]: { w: img.naturalWidth, h: img.naturalHeight } }));
      img.onerror = () => setSizes((s) => ({ ...s, [url]: null }));
      img.src = url;
    });
  }, [catalogueShown, catalogueKey]);

  // The definitions to choose from, smallest first, once all are measured:
  // two of Icecat's sizes are sometimes the same file.
  const definitions = catalogue.every((url) => sizes[url] !== undefined)
    ? catalogue
        .flatMap((url) => {
          const size = sizes[url];
          return size ? [{ url, label: `${size.w} × ${size.h}`, area: size.w * size.h }] : [];
        })
        .filter((d, i, all) => all.findIndex((other) => other.label === d.label) === i)
        .sort((a, b) => a.area - b.area)
    : [];

  useEffect(() => {
    if (!enlarged) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setEnlarged(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [enlarged]);

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
      .filter((f) => f.type.startsWith("image/") && f.size <= MAX_BYTES)
      .slice(0, MAX_FILES);
    if (input.current) input.current.value = "";
    if (!onAdd || files.length === 0) return;
    // Shown at once, faded, while they are sent: the grid does not jump later.
    const previews = files.map((f) => URL.createObjectURL(f));
    setUploading(previews);
    try {
      await onAdd(files);
    } finally {
      previews.forEach((p) => URL.revokeObjectURL(p));
      setUploading([]);
    }
  };

  const remove = async (photo: AddedPhoto) => {
    if (!onDelete) return;
    setDeleting(photo.id);
    try {
      await onDelete(photo);
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  };

  if (!catalogueUrl && added.length === 0 && !onAdd) {
    return (
      <Text c="dimmed" fs="italic" ta="center" py="xl">
        {t("deviceDetails.noPhotos")}
      </Text>
    );
  }

  const choose = () => input.current?.click();

  return (
    <div className="space-y-8">
      {catalogueUrl && (
        <section>
          <h3 className={`${HEADING} mb-3`}>
            {t("devicePhotos.catalogue")}
            {definitions.length > 1 && (
              <>
                {" "}
                <span className="whitespace-nowrap text-gray-400 dark:text-gray-500">
                  · {t("devicePhotos.definitions", { n: definitions.length })}
                </span>
              </>
            )}
          </h3>
          <div className={GRID}>
            <button
              type="button"
              className={`${TILE} focus:outline-none focus:ring-2 focus:ring-customgreen-500`}
              style={SQUARE}
              onClick={() => setEnlarged(catalogueUrl)}
              aria-label={t("devicePhotos.enlarge")}
            >
              <img
                key={catalogueUrl}
                src={catalogueUrl}
                alt=""
                loading="lazy"
                className="w-full h-full object-contain p-3 transform transition-transform duration-200 hover:scale-105"
                onLoad={() => setCatalogueShown(true)}
                onError={() => setSizes((s) => ({ ...s, [catalogueUrl]: null }))}
              />
              {definitions.length > 1 && (
                // The number alone: a phone's tile has no room for the words.
                <span className="absolute bottom-2 left-2 pointer-events-none">
                  <Badge
                    component="span"
                    size="xs"
                    radius="sm"
                    variant="default"
                    leftSection={<span className="material-symbols-outlined text-xs">photo_library</span>}
                  >
                    {definitions.length}
                  </Badge>
                </span>
              )}
            </button>
          </div>
        </section>
      )}

      {(added.length > 0 || onAdd) && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
            <div>
              <h3 className={HEADING}>
                {t("devicePhotos.added")}{" "}
                <span className="text-gray-400 dark:text-gray-500">· {added.length}</span>
              </h3>
              {onAdd && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("devicePhotos.addedHint")}</p>
              )}
            </div>
            {onAdd && added.length > 0 && (
              <Button
                variant="outline"
                size="xs"
                loading={uploading.length > 0}
                onClick={choose}
                leftSection={<span className="material-symbols-outlined text-base">add_photo_alternate</span>}
              >
                {t("createDevice.addPhotos")}
              </Button>
            )}
          </div>

          <div className={GRID}>
            {added.map((photo) => (
              <div key={photo.id} className={TILE} style={SQUARE}>
                <button
                  type="button"
                  className="w-full h-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-customgreen-500"
                  onClick={() => setEnlarged(photo.url)}
                  aria-label={t("devicePhotos.enlarge")}
                >
                  <img
                    src={photo.url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-contain p-3 transform transition-transform duration-200 hover:scale-105"
                  />
                </button>
                {photo.isDemo && (
                  <div className="absolute bottom-2 left-2 pointer-events-none">
                    <DemoBadge size="xs" />
                  </div>
                )}
                {photo.deletable && onDelete && (
                  // A popover, not an overlay: a phone's tile is too small to hold the question.
                  <Popover
                    opened={confirming === photo.id}
                    onChange={(open) => !open && deleting !== photo.id && setConfirming(null)}
                    position="bottom-end"
                    withArrow
                    shadow="md"
                  >
                    <Popover.Target>
                      <ActionIcon
                        variant="default"
                        radius="xl"
                        size="md"
                        className="absolute top-2 right-2 shadow-sm"
                        aria-label={t("common.delete")}
                        onClick={() => setConfirming((id) => (id === photo.id ? null : photo.id))}
                      >
                        <span className="material-symbols-outlined text-base text-red-600">delete</span>
                      </ActionIcon>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <Text size="sm" mb="sm" maw={240}>
                        {t("devicePhotos.deleteConfirm")}
                      </Text>
                      <div className="flex gap-2 justify-end">
                        <Button size="xs" variant="default" disabled={deleting === photo.id} onClick={() => setConfirming(null)}>
                          {t("common.cancel")}
                        </Button>
                        <Button size="xs" color="red" loading={deleting === photo.id} onClick={() => remove(photo)}>
                          {t("common.delete")}
                        </Button>
                      </div>
                    </Popover.Dropdown>
                  </Popover>
                )}
              </div>
            ))}

            {uploading.map((src) => (
              <div key={src} className={TILE} style={SQUARE}>
                <img src={src} alt="" className="w-full h-full object-contain p-3 opacity-40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader size="sm" />
                </div>
              </div>
            ))}

            {onAdd && added.length === 0 && uploading.length === 0 && (
              <button
                type="button"
                onClick={choose}
                style={SQUARE}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 transition-colors duration-150 hover:border-customgreen-500 hover:text-customgreen-600 dark:hover:text-customgreen-400 focus:outline-none focus:ring-2 focus:ring-customgreen-500"
              >
                <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                <span className="text-sm font-semibold">{t("devicePhotos.addFirst")}</span>
              </button>
            )}
          </div>
          {onAdd && <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={pick} />}
        </section>
      )}

      {enlarged && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4 bg-black bg-opacity-90"
          onClick={() => setEnlarged(null)}
        >
          <ActionIcon
            variant="transparent"
            size="xl"
            className="absolute top-4 right-4 text-white"
            aria-label={t("devicesComponent.closeLightbox")}
            onClick={() => setEnlarged(null)}
          >
            <span className="material-symbols-outlined text-3xl text-white">close</span>
          </ActionIcon>
          <img
            src={enlarged}
            alt=""
            className="max-w-full max-h-full min-h-0 object-contain bg-white rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {definitions.length > 1 && catalogue.includes(enlarged) && (
            // Each at its own size: the difference is the point.
            <div onClick={(e) => e.stopPropagation()}>
              <SegmentedControl
                size="xs"
                aria-label={t("devicePhotos.chooseDefinition")}
                data={definitions.map((d) => ({ value: d.url, label: `${d.label} px` }))}
                value={enlarged}
                onChange={setEnlarged}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DevicePhotos;
