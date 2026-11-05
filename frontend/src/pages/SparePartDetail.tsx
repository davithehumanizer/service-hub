import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
  Divider,
  Stack,
  Image,
  Modal,
} from '@mantine/core';
import {
  TagIcon,
  IdentificationIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  CurrencyEuroIcon,
  TruckIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import sparePartsService, { MeilisearchHit } from '../services/sparePartsService';
import { sparePartCatalogueUrl } from '../utils/globals';
import marker from '../assets/img/marker-icon.png';

const repairerIcon = new L.Icon({
  iconUrl: marker,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const STATUS_COLORS: Record<string, string> = {
  'spare-part-status-excellent': 'green',
  'spare-part-status-good': 'teal',
  'spare-part-status-fair': 'yellow',
  'spare-part-status-poor': 'orange',
  'spare-part-status-for-parts': 'red',
};

const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={2}>{label}</Text>
      <div>{value}</div>
    </div>
  );
};

/**
 * Link out to the PartsFinder catalogue. Shown twice on the page — beside the
 * title, and under the pricing block where the intent to order forms.
 *
 * Declared at module level rather than inside SparePartDetail: a component
 * defined in a render body is a new type on every render, which makes React
 * unmount and remount it instead of updating it.
 */
const CatalogueButton: React.FC<{ href: string; label: string; fullWidth?: boolean }> = ({
  href,
  label,
  fullWidth,
}) => (
  <Button
    component="a"
    href={href}
    // The catalogue is a separate application on its own domain, so this opens
    // in a new tab rather than replacing the Service Hub session.
    target="_blank"
    rel="noopener noreferrer"
    variant="light"
    size="sm"
    fullWidth={fullWidth}
    rightSection={<ArrowTopRightOnSquareIcon className="w-4 h-4" />}
  >
    {label}
  </Button>
);

const SparePartDetail: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const [part, setPart] = useState<MeilisearchHit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<{ url: string; credit?: string } | null>(null);

  // Always fetched, never taken from navigation state. The search hit that a
  // list hands over carries the category but no repairer address, while the API
  // carries the address; reusing the hit therefore drew a different page
  // depending on whether the visitor arrived from a list or opened the link.
  useEffect(() => {
    setLoading(true);
    sparePartsService
      .getById(id)
      .then((data) => {
        if (!data) setError(t('sparePartDetail.notFound') ?? 'Spare part not found.')
        else setPart(data);
      })
      // Only a 404 says the part does not exist; an outage says nothing about it.
      .catch((error) =>
        setError(t(error?.response?.status === 404 ? 'sparePartDetail.notFound' : 'sparePartDetail.loadError')),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="lg" />
      </Group>
    );
  }

  if (error || !part) {
    return (
      <Text c="red" ta="center" py="xl">
        {error ?? 'Spare part not found.'}
      </Text>
    );
  }

  const lat = part.repairer?.address?.latitude
    ? parseFloat(part.repairer.address.latitude)
    : part._geo?.lat
    ? parseFloat(part._geo.lat)
    : null;
  const lng = part.repairer?.address?.longitude
    ? parseFloat(part.repairer.address.longitude)
    : part._geo?.lng
    ? parseFloat(part._geo.lng)
    : null;

  const lowestPrice = (() => {
    if (!part.prices?.length) return null;
    const nums = part.prices
      .map((p: any) => parseFloat(p.unitAmount ?? p.amount ?? p.value ?? p.price))
      .filter((n: number) => !isNaN(n) && isFinite(n));
    return nums.length ? Math.min(...nums) : null;
  })();

  const statusColor = STATUS_COLORS[part.status?.slug ?? ''] ?? 'gray';

  const catalogueUrl = sparePartCatalogueUrl(part.objectID, i18n.language);
  const photos = (part.mediaObjects ?? []).filter(
    (m) => !m.mimeType || m.mimeType.startsWith('image/'),
  );

  return (
    // Main.tsx already provides the centred container and horizontal padding;
    // adding another one here doubled the padding and threw the page off-centre.
    <div className="w-full py-10">
      {/* Back button + header */}
      <Group mb="lg" align="flex-start">
        <Button
          variant="subtle"
          color="gray"
          size="sm"
          leftSection={<span className="material-symbols-outlined text-sm">arrow_back</span>}
          onClick={() => history.goBack()}
        >
        {t('sparePartDetail.back')}
        </Button>
      </Group>

      <Group mb="xl" align="center" gap="md" wrap="wrap" justify="space-between">
        <Group align="center" gap="md" wrap="wrap">
          <div>
            <Title order={2}>{part.model?.name ?? t('sparePartDetail.sparePart')}</Title>
            <Text size="lg" c="dimmed">{part.model?.brand?.name}</Text>
          </div>
          {part.status && (
            <Badge size="lg" variant="filled" color={statusColor}>
              {part.status.name}
            </Badge>
          )}
        </Group>

        <CatalogueButton href={catalogueUrl} label={t('sparePartDetail.viewOnCatalogue')} />
      </Group>

      {/* Photos, when the catalogue has any. Each src points at a redirect that
          signs a fresh URL per request, so nothing here expires in the cache. */}
      {photos.length > 0 && (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md" mb="lg">
          {photos.map((photo) => (
            <Stack key={photo.url} gap={4}>
              {/* flex none: as a flex item the picture's automatic minimum
                  size is its intrinsic height at the column's width — 4:3 on
                  these photographs — which reserved a row far taller than the
                  160px shown, leaving a gap under the credit. */}
              <Image
                src={photo.url}
                alt={photo.originalFilename ?? part.model?.name ?? t('sparePartDetail.sparePart')}
                radius="md"
                loading="lazy"
                h={160}
                fit="cover"
                style={{ cursor: 'zoom-in', flex: 'none' }}
                onClick={() =>
                  setZoomed({ url: photo.url, credit: photo.originalFilename ?? undefined })
                }
                // A part whose image fails to load should not leave a broken icon
                // in the grid; the placeholder keeps the layout intact.
                fallbackSrc="data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
              />
              {/* The credit is a licence condition, not decoration: these
                  photographs come from iFixit under CC BY-NC-SA. */}
              {photo.originalFilename && (
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {photo.originalFilename}
                </Text>
              )}
            </Stack>
          ))}
        </SimpleGrid>
      )}

      {/* zIndex: Leaflet stacks its panes and controls up to 1000, above the
          modal's default 200, so the seller's map showed over the photo. */}
      <Modal
        opened={zoomed !== null}
        onClose={() => setZoomed(null)}
        size="xl"
        centered
        withCloseButton
        zIndex={1100}
        title={part.model?.name ?? t('sparePartDetail.sparePart')}
      >
        {zoomed && (
          <Stack gap="sm">
            <Image src={zoomed.url} alt={zoomed.credit ?? ''} fit="contain" mah="75vh" />
            {zoomed.credit && (
              <Text size="sm" c="dimmed">
                {zoomed.credit}
              </Text>
            )}
          </Stack>
        )}
      </Modal>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">

        {/* Left column */}
        <Stack gap="lg">
          {/* Classification */}
          <Paper p="md" radius="md" withBorder>
            <Group mb="md">
              <ThemeIcon variant="light" color="orange" size="lg" radius="md">
                <TagIcon className="w-5 h-5" />
              </ThemeIcon>
              <Text fw={600} size="lg">{t('sparePartDetail.classification')}</Text>
            </Group>
            <Stack gap="sm">
              <InfoRow label={t('sparePartDetail.brand')} value={
                <Badge variant="dot" color="orange" size="lg">{part.model?.brand?.name}</Badge>
              } />
              <InfoRow label={t('sparePartDetail.type')} value={
                <Badge variant="outline" color="violet" size="md">{part.model?.type?.name}</Badge>
              } />
              <InfoRow label={t('sparePartDetail.category')} value={
                <Badge variant="light" color="gray" size="md">{part.model?.type?.category?.name}</Badge>
              } />
              <InfoRow label={t('sparePartDetail.brandStatus')} value={
                part.model?.brand?.status?.name
                  ? <Text size="sm">{part.model.brand.status.name}</Text>
                  : undefined
              } />
            </Stack>
          </Paper>

          {/* Identity */}
          <Paper p="md" radius="md" withBorder>
            <Group mb="md">
              <ThemeIcon variant="light" color="orange" size="lg" radius="md">
                <IdentificationIcon className="w-5 h-5" />
              </ThemeIcon>
              <Text fw={600} size="lg">{t('sparePartDetail.partDetails')}</Text>
            </Group>
            <Stack gap="sm">
              <InfoRow label={t('sparePartDetail.partId')} value={
                <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-sm font-mono">
                  {part.objectID}
                </code>
              } />
              {part.serialNumber && (
                <InfoRow label={t('sparePartDetail.serialNumber')} value={
                  <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-sm font-mono">
                    {part.serialNumber}
                  </code>
                } />
              )}
              {part.estimatedDate && (
                <InfoRow label={t('sparePartDetail.estimatedDate')} value={
                  <Text size="sm">
                    {typeof part.estimatedDate === 'object'
                      ? new Date(part.estimatedDate.date).toLocaleDateString()
                      : part.estimatedDate}
                  </Text>
                } />
              )}
            </Stack>
          </Paper>

          {/* Pricing */}
          <Paper p="md" radius="md" withBorder>
            <Group mb="md">
              <ThemeIcon variant="light" color="orange" size="lg" radius="md">
                <CurrencyEuroIcon className="w-5 h-5" />
              </ThemeIcon>
              <Text fw={600} size="lg">{t('sparePartDetail.pricing')}</Text>
            </Group>
            {lowestPrice != null ? (
              <Stack gap="xs">
                {part.prices.map((p: any, i: number) => (
                  <Group key={i} justify="space-between">
                    <Text size="sm" c="dimmed">{p.label ?? `${t('sparePartDetail.pricing')} ${i + 1}`}</Text>
                    <Text fw={700} size="sm" c="green">{(() => { const n = parseFloat(p.unitAmount ?? p.amount ?? p.value ?? p.price); return !isNaN(n) ? n.toFixed(2) : '—'; })()} {p.currency?.toUpperCase() ?? '€'}</Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed" fs="italic">{t('sparePartDetail.priceOnRequest')}</Text>
            )}

            {/* Ordering happens in the catalogue, not here — say so where the
                price is, which is where the reader forms the intent to buy. */}
            <Divider my="md" />
            <Text size="sm" c="dimmed" mb="sm">
              {t('sparePartDetail.orderOnCatalogue')}
            </Text>
            <CatalogueButton href={catalogueUrl} label={t('sparePartDetail.viewOnCatalogue')} fullWidth />
          </Paper>

          {/* Delivery */}
          {part.repairer?.deliveryMethods?.length > 0 && (
            <Paper p="md" radius="md" withBorder>
              <Group mb="md">
                <ThemeIcon variant="light" color="orange" size="lg" radius="md">
                  <TruckIcon className="w-5 h-5" />
                </ThemeIcon>
                <Text fw={600} size="lg">{t('sparePartDetail.deliveryMethods')}</Text>
              </Group>
              <Group gap="xs">
                {part.repairer.deliveryMethods.map((method: string, i: number) => (
                  <Badge key={i} variant="outline" color="orange">{method}</Badge>
                ))}
              </Group>
            </Paper>
          )}
        </Stack>

        {/* Right column — Repairer */}
        <Stack gap="lg">
          <Paper p="md" radius="md" withBorder>
            <Group mb="md">
              <ThemeIcon variant="light" color="purple" size="lg" radius="md">
                <BuildingStorefrontIcon className="w-5 h-5" />
              </ThemeIcon>
              <Text fw={600} size="lg">{t('sparePartDetail.repairer')}</Text>
            </Group>
            {part.repairer ? (
              <Stack gap="sm">
                <Text fw={600} size="md">{part.repairer.name}</Text>
                <Divider />
                <Group mb={4}>
                  <ThemeIcon variant="transparent" color="gray" size="sm">
                    <MapPinIcon className="w-4 h-4" />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text size="sm">{part.repairer.address?.route}</Text>
                    {part.repairer.address?.additional && (
                      <Text size="sm" c="dimmed">{part.repairer.address.additional}</Text>
                    )}
                    <Text size="sm">
                      {part.repairer.address?.postalCode} {part.repairer.address?.locality}
                    </Text>
                    {part.repairer.address?.administrativeAreaLevel1 && (
                      <Text size="xs" c="dimmed">
                        {part.repairer.address.administrativeAreaLevel1}
                        {part.repairer.address.administrativeAreaLevel2
                          ? ` — ${part.repairer.address.administrativeAreaLevel2}`
                          : ''}
                      </Text>
                    )}
                  </Stack>
                </Group>
              </Stack>
            ) : (
              <Text c="dimmed" fs="italic">{t('sparePartDetail.noRepairerInfo')}</Text>
            )}
          </Paper>

          {/* Map */}
          {lat !== null && lng !== null && (
            <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
              <MapContainer
                center={[lat, lng]}
                zoom={14}
                style={{ height: 300, width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat, lng]} icon={repairerIcon}>
                  <Popup>
                    <strong>{part.repairer?.name}</strong><br />
                    {part.repairer?.address?.route}<br />
                    {part.repairer?.address?.postalCode} {part.repairer?.address?.locality}
                  </Popup>
                </Marker>
              </MapContainer>
            </Paper>
          )}
        </Stack>
      </SimpleGrid>
    </div>
  );
};

export default SparePartDetail;
