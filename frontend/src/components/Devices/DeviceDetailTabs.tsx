import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardBody } from '@windmill/react-ui';
import {
  Badge,
  Grid,
  Group,
  Loader,
  Pagination,
  Paper,
  Select,
  SimpleGrid,
  Tabs,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  Cog6ToothIcon,
  CpuChipIcon,
  IdentificationIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { Device, DeviceInformationalProperty } from '../../models/device';
import { DeviceModelPhoto } from '../../models/deviceModel';
import sparePartsService, { MeilisearchHit } from '../../services/sparePartsService';
import FixometerImpactCalculator from '../Fixometer/FixometerImpactCalculator';
import DevicePhotos from './DevicePhotos';
import MultimediaViewer from './MultimediaViewer';
import PropertyAccordion from './PropertyAccordion';
import PropertyCard from './PropertyCard';

interface DeviceDetailTab {
  label: string;
  value: string;
  content: React.ReactNode;
  icon?: ReactElement<any, any>;
}

/**
 * A catalogue entry's details, by tab: its identity and technical sheet,
 * product information, documentation, photos, spare parts and repair
 * impact. Shown for an entry on its own page, and for a variant on its
 * model's page.
 */
const DeviceDetailTabs = ({
  device,
  showPartsAt = 0,
  modelPhotos = [],
  onAddPhotos,
  onDeletePhoto,
}: {
  device: Device;
  showPartsAt?: number;
  /** The pictures of its model itself, shown with its own. */
  modelPhotos?: DeviceModelPhoto[];
  /** For a signed-in reader: photos added to the model. */
  onAddPhotos?: (files: File[]) => Promise<void>;
  onDeletePhoto?: (photoId: string) => Promise<void>;
}) => {
  const { t } = useTranslation();
  const history = useHistory();
  const [activeTab, setActiveTab] = useState<string>('details');
  const rootRef = useRef<HTMLDivElement>(null);

  // Asked for by the page's own "Spare parts" button, each time it is pressed.
  useEffect(() => {
    if (!showPartsAt) return;
    setActiveTab('spare-parts');
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showPartsAt]);

  const [spareParts, setSpareParts] = useState<MeilisearchHit[]>([]);
  const [sparePartsTotal, setSparePartsTotal] = useState(0);
  const [sparePartsPage, setSparePartsPage] = useState(1);
  const [sparePartsLoading, setSparePartsLoading] = useState(false);
  const SPARE_PARTS_PAGE_SIZE = 12;

  useEffect(() => {
    if (activeTab === 'spare-parts' && device) {
      setSparePartsLoading(true);
      sparePartsService.searchByDevice({
        brand: device.brand,
        model: device.model,
        offset: (sparePartsPage - 1) * SPARE_PARTS_PAGE_SIZE,
        limit: SPARE_PARTS_PAGE_SIZE,
      }).then((result) => {
        setSpareParts(result.hits ?? []);
        setSparePartsTotal(result.estimatedTotalHits ?? 0);
      }).catch(() => {
        setSpareParts([]);
        setSparePartsTotal(0);
      }).finally(() => setSparePartsLoading(false));
    }
  }, [activeTab, device, sparePartsPage]);

  // Helper functions to extract and organize informational properties
  // Icecat lists one picture in four sizes: the best first, the next when one
  // does not load.
  const catalogueImages = (informationalProperties?: DeviceInformationalProperty[]) =>
    ['Image_HighPic', 'Image_Pic500x500', 'Image_LowPic', 'Image_ThumbPic']
      .map((name) => informationalProperties?.find((p) => p.property_name === name)?.property_value)
      .filter((url): url is string => !!url);

  const extractMultimedia = (informationalProperties?: DeviceInformationalProperty[]) => {
    const multimediaProp = informationalProperties?.find(
      prop => prop.property_name === 'Multimedia'
    );
    return multimediaProp?.property_value || null;
  };

  const getOtherInformationalProperties = (informationalProperties?: DeviceInformationalProperty[]) => {
    if (!informationalProperties) return [];
    return informationalProperties.filter(
      prop => !prop.property_name.startsWith('Image_') && prop.property_name !== 'Multimedia'
    );
  };

  const tabs: DeviceDetailTab[] = [
    {
      label: t('deviceDetails.tabs.details'),
      value: 'details',
      icon: <Cog6ToothIcon/>,
      content: (
        <div className="mt-6 animate-in fade-in duration-500">
           <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {/* Identity Card */}
              <Paper p="md" radius="md" withBorder className="bg-gray-50 dark:bg-gray-800 dark:bg-opacity-50 hover:shadow-sm transition-shadow">
                <Group mb="xs">
                  <ThemeIcon variant="light" color="blue" size="lg" radius="md">
                    <IdentificationIcon className="w-5 h-5" />
                  </ThemeIcon>
                  <Text fw={600} size="lg">{t('deviceDetails.identity')}</Text>
                </Group>
                <div className="space-y-3">
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={2}>{t('deviceDetails.modelName')}</Text>
                    <Text fw={500}>{device.model}</Text>
                  </div>
                  {device.product_code && (
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={2}>{t('deviceDetails.productCode')}</Text>
                      <Group gap={6}>
                         <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-sm font-mono">{device.product_code}</code>
                      </Group>
                    </div>
                  )}
                  {device.serial_number && (
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={2}>{t('deviceDetails.serialNumber')}</Text>
                      <Group gap={6}>
                         <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-sm font-mono">{device.serial_number}</code>
                      </Group>
                    </div>
                  )}
                   {device.ean && (
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={2}>{t('deviceDetails.ean')}</Text>
                      <Group gap={6}>
                         <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-sm font-mono">{device.ean}</code>
                      </Group>
                    </div>
                  )}
                </div>
              </Paper>

              {/* Classification Card */}
              <Paper p="md" radius="md" withBorder className="bg-gray-50 dark:bg-gray-800 dark:bg-opacity-50 hover:shadow-sm transition-shadow">
                <Group mb="xs">
                  <ThemeIcon variant="light" color="green" size="lg" radius="md">
                    <TagIcon className="w-5 h-5" />
                  </ThemeIcon>
                  <Text fw={600} size="lg">{t('deviceDetails.classification')}</Text>
                </Group>
                <div className="space-y-3">
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={2}>{t('deviceDetails.brand')}</Text>
                    <Badge size="lg" variant="dot" color="blue">{device.brand}</Badge>
                  </div>
                  {/* <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={2}>{t('deviceDetails.deviceType')}</Text>
                    <Badge size="lg" variant="outline" color="green">{device.device_type || t('common.unknown')}</Badge>
                  </div> */}
                   <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={2}>{t('deviceDetails.categories')}</Text>
                     <Group gap="xs">
                      {device.categories && device.categories.length > 0 ? (
                        device.categories.map(cat => (
                          <Badge key={cat.id} variant="light" color="gray">{cat.name}</Badge>
                        ))
                      ) : (
                        <Text size="sm" c="dimmed" fs="italic">{t('deviceDetails.noCategories')}</Text>
                      )}
                    </Group>
                  </div>
                </div>
              </Paper>

              {/* Status / Meta Card (Placeholder for now) */}
              {/* A model without variant has no entry of its own. */}
              {device.device_id && (
              <Paper p="md" radius="md" withBorder className="bg-gray-50 dark:bg-gray-800 dark:bg-opacity-50 hover:shadow-sm transition-shadow">
                 <Group mb="xs">
                  <ThemeIcon variant="light" color="orange" size="lg" radius="md">
                    <CpuChipIcon className="w-5 h-5" />
                  </ThemeIcon>
                  <Text fw={600} size="lg">{t('deviceDetails.systemInfo')}</Text>
                </Group>
                 <div className="space-y-3">
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={2}>{t('deviceDetails.databaseId')}</Text>
                    <Text size="sm" className="font-mono" c="dimmed">{device.device_id}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={2}>{t('deviceDetails.dataSource')}</Text>
                     <Badge variant="filled" color="dark" size="sm">{device.source}</Badge>
                  </div>
                </div>
              </Paper>
              )}
           </SimpleGrid>
        </div>
      ),
    },
    {
      label: t('deviceDetails.tabs.technicalSpecs'),
      value: 'technical-specs',
      content: (
        <Paper p="md" radius="md" withBorder className="mt-6 bg-gray-50 dark:bg-gray-800 dark:bg-opacity-50 border-gray-100 dark:border-gray-700">
           {device.technicalProperties && device.technicalProperties.length > 0 ? (
             <PropertyAccordion properties={device.technicalProperties} />
           ) : (
             <Text c="dimmed" fs="italic" ta="center" py="xl">{t('deviceDetails.noTechnicalSpecs')}</Text>
           )}
        </Paper>
      ),
    },
    {
      label: t('deviceDetails.tabs.productInfo'),
      value: 'product-info',
      content: (
        <Paper p="md" radius="md" withBorder className="mt-6 bg-gray-50 dark:bg-gray-800 dark:bg-opacity-50 border-gray-100 dark:border-gray-700">
          {getOtherInformationalProperties(device.informationalProperties).length > 0 ? (
            <div className="space-y-4">
              {getOtherInformationalProperties(device.informationalProperties).map((prop) => (
                <PropertyCard key={prop.property_id} property={prop} />
              ))}
            </div>
          ) : (
             <Text c="dimmed" fs="italic" ta="center" py="xl">{t('deviceDetails.noProductInfo')}</Text>
          )}
        </Paper>
      ),
    },
    {
      label: t('deviceDetails.tabs.notices'),
      value: 'notices-docs',
      content: (
        <Paper p="md" radius="md" withBorder className="mt-6 bg-gray-50 dark:bg-gray-800 dark:bg-opacity-50 border-gray-100 dark:border-gray-700">
          {extractMultimedia(device.informationalProperties) ? (
            <MultimediaViewer multimediaJson={extractMultimedia(device.informationalProperties)!} />
          ) : (
            <Text c="dimmed" fs="italic" ta="center" py="xl">{t('deviceDetails.noDocumentation')}</Text>
          )}
        </Paper>
      ),
    },
    {
      label: t('deviceDetails.tabs.photos'),
      value: 'photos',
      content: (
        <Paper p="md" radius="md" withBorder className="mt-6 bg-gray-50 dark:bg-gray-800 dark:bg-opacity-50 border-gray-100 dark:border-gray-700">
          <DevicePhotos
            catalogue={catalogueImages(device.informationalProperties)}
            added={[
              ...(device.photos ?? []).map((p) => ({ id: p.id, url: p.url, isDemo: p.isDemo })),
              ...modelPhotos.map((p) => ({ id: p.id, url: p.url, isDemo: p.is_demo, deletable: p.deletable })),
            ]}
            onAdd={onAddPhotos}
            onDelete={onDeletePhoto ? (photo) => onDeletePhoto(photo.id) : undefined}
          />
        </Paper>
      ),
    },
    {
      label: t('deviceDetails.tabs.spareParts'),
      value: 'spare-parts',
      content: (
        <Paper p="md" radius="md" withBorder className="mt-6 bg-gray-50 dark:bg-gray-800 dark:bg-opacity-50 border-gray-100 dark:border-gray-700">
          {sparePartsLoading && (
            <Group justify="center" py="xl">
              <Loader size="lg" />
            </Group>
          )}
          {!sparePartsLoading && spareParts.length === 0 && (
            <Text c="dimmed" fs="italic" ta="center" py="xl">{t('deviceDetails.noSpareParts')}</Text>
          )}
          {!sparePartsLoading && spareParts.length > 0 && (
            <>
              <Text size="sm" c="dimmed" mb="md">{sparePartsTotal} {t('deviceDetails.resultsFound')}</Text>
              <Grid gutter="md">
                {spareParts.map((hit, index) => (
                  <Grid.Col key={hit.objectID ?? index} span={{ base: 12, xs: 6, sm: 4, md: 3 }}>
                    <Paper
                      p="sm"
                      radius="md"
                      withBorder
                      h="100%"
                      style={{ cursor: 'pointer' }}
                      onClick={() => history.push(`/app/spare-parts/${hit.objectID}`)}
                    >
                      <Group mb={4} gap={6} wrap="nowrap" align="flex-start">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={600} size="sm" lineClamp={2}>
                            {hit.model?.name ?? t('deviceDetails.tabs.spareParts')}
                          </Text>
                          <Text size="xs" c="dimmed">{hit.model?.brand?.name}</Text>
                        </div>
                        {hit.status && (
                          <Badge variant="light" color="gray" size="xs" style={{ flexShrink: 0 }}>
                            {hit.status.name}
                          </Badge>
                        )}
                      </Group>
                      {hit.model?.type && (
                        <Badge variant="outline" color="blue" size="xs" mb={4}>
                          {hit.model.type.name}
                        </Badge>
                      )}
                      {hit.prices?.length > 0 ? (
                        <Text fw={700} size="sm" c="green">
                          {(() => { if (!hit.prices?.length) return null; const nums = hit.prices.map((p: any) => parseFloat(p.unitAmount ?? p.amount ?? p.value ?? p.price)).filter((n: number) => !isNaN(n) && isFinite(n)); return nums.length ? `${Math.min(...nums).toFixed(2)} €` : null; })()}
                        </Text>
                      ) : (
                        <Text size="xs" c="dimmed" fs="italic">{t('spareParts.priceOnRequest')}</Text>
                      )}
                      {hit.repairer && (
                        <Text size="xs" c="dimmed" mt={4} lineClamp={1}>
                          {hit.repairer.name} — {hit.repairer.address?.locality}
                        </Text>
                      )}
                    </Paper>
                  </Grid.Col>
                ))}
              </Grid>
              {Math.ceil(sparePartsTotal / SPARE_PARTS_PAGE_SIZE) > 1 && (
                <Group justify="center" mt="lg">
                  <Pagination
                    total={Math.ceil(sparePartsTotal / SPARE_PARTS_PAGE_SIZE)}
                    value={sparePartsPage}
                    onChange={setSparePartsPage}
                  />
                </Group>
              )}
            </>
          )}
        </Paper>
      ),
    },
    {
      label: t('deviceDetails.tabs.impactMetrics'),
      value: 'impact-metrics',
      icon: <Cog6ToothIcon />,
      content: (
        <Paper p="md" radius="md" withBorder className="mt-6 bg-gray-50 dark:bg-gray-800 dark:bg-opacity-50 border-gray-100 dark:border-gray-700">
          <FixometerImpactCalculator device={device} routeName="Devices" />
        </Paper>
      ),
    },
  ];

  return (
    <div ref={rootRef}>
      <Card>
        <CardBody>
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? "")} color="blue">
            {/* 7 tabs don't fit in one row on mobile even after translation,
                and wrapping them wasn't clear either — different-width tabs
                wrap raggedly with no grid to scan. A dropdown is the
                established pattern for "too many tabs" on narrow screens;
                the tab strip itself returns from md: up. */}
            <div className="md:hidden mb-3">
              <Select
                data={tabs.map((tab) => ({ value: tab.value, label: tab.label }))}
                value={activeTab}
                onChange={(value) => setActiveTab(value ?? "")}
                allowDeselect={false}
                aria-label={t('deviceDetails.title')}
              />
            </div>
            <Tabs.List className="hidden md:flex">
              {tabs.map((tab) => (
                <Tabs.Tab
                  key={tab.value}
                  value={tab.value}
                >
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            {tabs.map((tab) => (
              <Tabs.Panel key={tab.value} value={tab.value}>
                {tab.content}
              </Tabs.Panel>
            ))}
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
};

export default DeviceDetailTabs;
