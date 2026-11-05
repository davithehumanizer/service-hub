import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../stores/globalStore';
import { Center, Title, Text, Button, Card, Group, Loader, Alert, TextInput, Stack, SimpleGrid, Badge } from '@mantine/core';
import { deviceService } from '../../../../services/deviceService';
import { deviceModelService } from '../../../../services/deviceModelService';
import { mapIdentificationToDevice } from '../../../../utils/deviceMapper';
import { Device } from '../../../../models/device';
import { DeviceModel } from '../../../../models/deviceModel';
import { IdentificationResult, IdentificationResponse } from '../../../../models/identification';
import ModelCard from '../../../Devices/ModelCard';
import PhotoHandoffPanel from './PhotoHandoffPanel';

interface PhotoIdentificationProps {
  /** The model picked, with the catalogue entry the wizard works on. */
  onDeviceSelected: (device: Device, model: DeviceModel) => void;
  onCreateNewDevice: (device: Partial<Device>) => void;
  onRefineSearch: (filters: { brand: string; model: string; product: string }) => void;
  guest: boolean;
  onBack: () => void;
  /** The library's cards open the model's page; in the wizard that left the
      journey, a card is picked by tapping it. */
  showDetailsButton: boolean;
}

export default function PhotoIdentification({ 
  onDeviceSelected,
  onCreateNewDevice,
  onRefineSearch,
  guest,
  onBack,
  showDetailsButton,
}: PhotoIdentificationProps) {
  const { t } = useTranslation();
  const isRepairer = useSelector((state: RootState) => state.repairWorkflow.repairContext) === 'repairer';
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [remotePreviewUrl, setRemotePreviewUrl] = useState<string | null>(null);
  const [showHandoff, setShowHandoff] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [foundDevices, setFoundDevices] = useState<DeviceModel[]>([]);
  // The variant a barcode read on the photo named, for the model it found.
  const [identified, setIdentified] = useState<{ modelId: number; deviceId: number } | null>(null);
  const [totalFoundDevices, setTotalFoundDevices] = useState<number>(0);
  const [showOptions, setShowOptions] = useState(false);
  const [notFoundInImage, setNotFoundInImage] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [editableData, setEditableData] = useState<{ brand: string; model: string; product: string }>({ brand: '', model: '', product: '' });
  const [isStrictMode, setIsStrictMode] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const hasSelection = Boolean(
    selectedFile || remotePreviewUrl || identificationResult || notFoundInImage,
  );

  // No result to show yet on this specific photo — keep the compact
  // image-plus-actions layout instead of the two-column results layout.
  const isPreAnalysis = Boolean(selectedFile) && !identificationResult && !notFoundInImage && !error;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('wizard.deviceSearch.invalidPhotoFile'));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(t('wizard.deviceSearch.photoTooLarge'));
      return;
    }

    setSelectedFile(file);
    setError(null);
    setIdentificationResult(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const sanitizeField = (value: string): string => {
    if (!value) return '';
    const lower = value.trim().toLowerCase();
    if (['unknown', 'undefined', 'n/a', 'none', 'null'].includes(lower)) return '';
    return value.trim();
  };

  const handleIdentificationResponse = async (response: IdentificationResponse) => {
    if (response.success && response.data) {
      setIdentificationResult(response.data);
      setEditableData({
        brand: sanitizeField(response.data.Brand),
        model: sanitizeField(response.data.Model),
        product: sanitizeField(response.data.Product)
      });

      await searchIdentified(
        sanitizeField(response.data.Brand),
        sanitizeField(response.data.Model),
        response.data.GTIN,
      );
    } else if (response.notFound) {
      setNotFoundInImage(true);
    } else {
      setError(response.error || t('wizard.deviceSearch.identificationFailedGeneric'));
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);
    setNotFoundInImage(false);
    setShowOptions(false);
    setIsStrictMode(true);
    setFoundDevices([]);

    try {
      const response = await deviceService.identifyByPhoto(selectedFile);
      await handleIdentificationResponse(response);
    } catch (err: any) {
      console.error('Identification error:', err);
      setError(t('wizard.deviceSearch.identificationErrorGeneric'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleHandoffResult = async (response: IdentificationResponse) => {
    setShowHandoff(false);
    setError(null);
    setNotFoundInImage(false);
    setShowOptions(false);
    setIsStrictMode(true);
    setFoundDevices([]);
    setRemotePreviewUrl(response.imageUrl || null);
    await handleIdentificationResponse(response);
  };

  // A barcode the AI read is the surest key. Otherwise brand and model, then
  // the model with its last word dropped, one at a time: the AI appends
  // manufacturer references ("Saros Z70 RREQR50") that the catalogue's
  // commercial names never carry, and extended search cannot help — it wants
  // every word. Strict throughout, and never the brand alone.
  const searchIdentified = async (brand: string, model: string, gtin?: string) => {
    if (gtin && /^\d{8,14}$/.test(gtin.trim()) && (await searchInDatabase('', gtin.trim(), true))) {
      return;
    }
    let words = model.split(/\s+/).filter(Boolean);
    do {
      const tried = words.join(' ');
      if (await searchInDatabase(brand, tried, true)) {
        if (tried !== model) setEditableData((d) => ({ ...d, model: tried }));
        return;
      }
      words = words.slice(0, -1);
    } while (words.length > 0);
  };

  const searchInDatabase = async (brand: string, model: string, strict = true): Promise<boolean> => {
    setIsSearching(true);
    setError(null);
    setIsStrictMode(strict);
    
    try {
      const searchParts = [brand, model].filter(Boolean);
      if (searchParts.length === 0) {
        setFoundDevices([]);
        setTotalFoundDevices(0);
        setShowOptions(true);
        setIsSearching(false);
        return false;
      }
      const searchQuery = searchParts.join(',');
      const response = await deviceModelService.search({
        page: 1,
        limit: 10,
        search: searchQuery,
        strict,
      });
      setIdentified(
        response.variant && response.data[0]
          ? { modelId: response.data[0].id, deviceId: response.variant.device_id }
          : null,
      );

      if (response.data && response.data.length > 0) {
        setFoundDevices(response.data);
        setTotalFoundDevices(response.pagination.total);
        setShowOptions(false);
        return true;
      } else {
        setFoundDevices([]);
        setTotalFoundDevices(0);
        // Only show full options (modify/create) when extended search also fails
        if (!strict) {
          setShowOptions(true);
        }
        // If strict=true and no results, leave showOptions=false — UI shows "Extend search" CTA
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setShowOptions(true);
    } finally {
      setIsSearching(false);
    }
    return false;
  };

  const handleExpandSearch = async () => {
    await searchInDatabase(editableData.brand, editableData.model, false);
  };

  const handleCollapseSearch = async () => {
    await searchInDatabase(editableData.brand, editableData.model, true);
  };

  const handleSearchWithModifiedData = async () => {
    if (!editableData.brand || !editableData.model) {
      setError(t('wizard.deviceSearch.enterBrandAndModel'));
      return;
    }
    await searchInDatabase(editableData.brand, editableData.model, true);
  };

  const handleCreateDevice = () => {
    if (!identificationResult) return;

    if (guest) {
      setError(t('wizard.deviceSearch.guestCreateDevice'));
      return;
    }

    const partialDevice = mapIdentificationToDevice(identificationResult);
    // Update with edited data if modified
    partialDevice.brand = editableData.brand;
    partialDevice.model = editableData.model;
    partialDevice.device_type = editableData.product;
    
    onCreateNewDevice(partialDevice);
  };

  // One pick at a time: a second click while the variant loads would move
  // the wizard on twice, past the symptoms.
  const picking = useRef(false);
  const handleSelectModel = async (model: DeviceModel) => {
    if (picking.current) return;
    picking.current = true;
    setSelectedModelId(model.id);
    try {
      const device = await deviceModelService.deviceOf(
        model,
        identified?.modelId === model.id ? identified.deviceId : null,
      );
      onDeviceSelected(device, model);
    } catch (err) {
      console.error("The model's variant could not be read:", err);
    } finally {
      picking.current = false;
    }
  };

  const handleNewPhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemotePreviewUrl(null);
    setShowHandoff(false);
    setError(null);
    setNotFoundInImage(false);
    setIdentificationResult(null);
    setFoundDevices([]);
    setTotalFoundDevices(0);
    setShowOptions(false);
    setSelectedModelId(null);
    setIdentified(null);
    setEditableData({ brand: '', model: '', product: '' });
    setIsStrictMode(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="text-center py-4">

      {/* Header + Upload — constrained width */}
      <div className="max-w-2xl mx-auto">
        {/* Header - hidden once a photo is selected/received, or once the
            phone handoff panel takes over this space */}
        {!hasSelection && !showHandoff && (
          <>
            <Center mb="xl">
              <div className="w-24 h-24 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-purple-600">photo_camera</span>
              </div>
            </Center>

            <Title order={2} className="mb-4">{t('wizard.deviceSearch.photoTitle')}</Title>
            <Text c="dimmed" mb="xl">
              {t('wizard.deviceSearch.photoSubtitle')}
            </Text>
          </>
        )}

        {/* File Inputs (hidden). Two separate inputs: `capture` makes a phone
            open its camera directly, but it also *replaces* the gallery
            picker on most mobile browsers — so gallery access needs its own
            input without the attribute. Desktop ignores `capture` either way. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload options (shown when nothing selected yet) */}
        {!hasSelection && (
          <Stack gap="md" align="center">
            {showHandoff ? (
              <PhotoHandoffPanel onResult={handleHandoffResult} onCancel={() => setShowHandoff(false)} />
            ) : (
              <Group gap="sm" justify="center">
                {/* Mobile-only: opens the camera directly instead of the gallery */}
                <Button
                  size="lg"
                  radius="xl"
                  variant="outline"
                  color="purple"
                  className="sm:hidden"
                  onClick={triggerCameraInput}
                  leftSection={<span className="material-symbols-outlined">photo_camera</span>}
                >
                  {t('wizard.deviceSearch.takePhoto')}
                </Button>
                <Button
                  size="lg"
                  radius="xl"
                  color="purple"
                  onClick={triggerFileInput}
                  leftSection={<span className="material-symbols-outlined">upload</span>}
                >
                  {t('wizard.deviceSearch.choosePhoto')}
                </Button>
                {/* Desktop-only: taking a photo from the browser is awkward there, so offer to hand off to a phone instead */}
                <Button
                  size="lg"
                  radius="xl"
                  variant="outline"
                  color="purple"
                  className="hidden sm:inline-flex"
                  onClick={() => setShowHandoff(true)}
                  leftSection={<span className="material-symbols-outlined">qr_code_2</span>}
                >
                  {t('wizard.deviceSearch.continueOnPhone')}
                </Button>
              </Group>
            )}
            <Button
              variant="subtle"
              color="gray"
              onClick={onBack}
              leftSection={<span className="material-symbols-outlined text-sm">arrow_back</span>}
            >
              {t('wizard.deviceSearch.backToChoices')}
            </Button>
          </Stack>
        )}
      </div>

      {/* Preview, results, options — after a photo is selected/received */}
      {hasSelection && (isPreAnalysis ? (
        /* Nothing to show yet on the results side, so keep the photo and its
           actions together in one compact block instead of a wide, mostly
           empty two-column layout. */
        <Card shadow="md" padding="lg" radius="lg" withBorder className="max-w-3xl mx-auto bg-white dark:bg-gray-900">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="sm:w-64 flex-shrink-0">
              <img
                src={previewUrl || ''}
                alt={t('wizard.deviceSearch.devicePreviewAlt')}
                className="w-full max-h-72 rounded-lg object-contain"
              />
            </div>

            {isAnalyzing ? (
              <Group gap="md">
                <Loader color="purple" size="md" />
                <Text c="dimmed">{t('wizard.deviceSearch.analyzingDevice')}</Text>
              </Group>
            ) : (
              // `size="lg"` keeps the tap target comfortably above the 44px
              // accessible minimum; `fz`/`px` are style props (rendered as
              // inline styles, so they reliably win over Mantine's own
              // size-driven CSS) shrinking the label and padding on small
              // screens, which is what was actually forcing these pills to
              // the card's full width — not the button's height.
              <div className="flex flex-col items-center gap-3" style={{ width: 'max-content', maxWidth: '100%' }}>
                <Button
                  size="lg"
                  radius="xl"
                  color="purple"
                  onClick={handleAnalyze}
                  fz={{ base: 14, sm: 16 }}
                  px={{ base: 16, sm: 24 }}
                  leftSection={<span className="material-symbols-outlined text-lg sm:text-2xl">search</span>}
                >
                  {t('wizard.deviceSearch.analyzePhoto')}
                </Button>
                <Button
                  size="lg"
                  radius="xl"
                  variant="outline"
                  color="gray"
                  onClick={handleNewPhoto}
                  fz={{ base: 14, sm: 16 }}
                  px={{ base: 16, sm: 24 }}
                  leftSection={<span className="material-symbols-outlined text-lg sm:text-2xl">refresh</span>}
                >
                  {t('wizard.deviceSearch.tryAnotherPhoto')}
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">

          {/* Photo panel — what we saw. Sticky on large screens so it stays in
              view while the search outcome below it changes and scrolls. */}
          <div className="max-w-2xl mx-auto lg:max-w-none lg:mx-0 lg:col-span-4 lg:sticky lg:top-6 space-y-4 mb-6 lg:mb-0">
            {(previewUrl || remotePreviewUrl) && (
              <Card shadow="md" padding="lg" radius="lg" withBorder className="bg-white dark:bg-gray-900">
                <img
                  src={previewUrl || remotePreviewUrl || ''}
                  alt={t('wizard.deviceSearch.devicePreviewAlt')}
                  className="max-w-full max-h-96 mx-auto rounded-lg object-contain"
                />
              </Card>
            )}

            {!isSearching && (
              <Group justify="center" gap="sm">
                {!identificationResult && selectedFile && (
                  <Button
                    size="lg"
                    radius="xl"
                    color="purple"
                    onClick={handleAnalyze}
                    leftSection={<span className="material-symbols-outlined">search</span>}
                  >
                    {t('wizard.deviceSearch.analyzePhoto')}
                  </Button>
                )}
                <Button
                  size="lg"
                  radius="xl"
                  variant="outline"
                  color="gray"
                  onClick={handleNewPhoto}
                  leftSection={<span className="material-symbols-outlined">refresh</span>}
                >
                  {t('wizard.deviceSearch.tryAnotherPhoto')}
                </Button>
              </Group>
            )}
          </div>

          {/* Results panel — what we found, or didn't. */}
          <div className="max-w-2xl mx-auto lg:max-w-none lg:mx-0 lg:col-span-8 space-y-6 text-left">
            {/* No device recognized in image */}
            {notFoundInImage && (
              <div className="text-center py-10 px-6 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 mb-4 mx-auto">
                  <span className="material-symbols-outlined text-3xl text-gray-300 dark:text-gray-600">image_not_supported</span>
                </div>
                <Title order={4} className="mb-2">{t('wizard.deviceSearch.noDeviceRecognized')}</Title>
                <Text c="dimmed" size="sm" className="max-w-sm mx-auto">
                  {t('wizard.deviceSearch.noDeviceRecognizedDesc')}
                </Text>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <Alert color="red" title={t('common.error')} icon={<span className="material-symbols-outlined">error</span>}>
                {error}
              </Alert>
            )}

            {/* Identification Results */}
            {identificationResult && !isSearching && foundDevices.length === 0 && !showOptions && (
              <Card shadow="md" padding="lg" radius="lg" withBorder className="bg-green-50 dark:bg-green-900/20">
                <Group mb="md">
                  <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
                  <Title order={3} className="text-green-700 dark:text-green-400">{t('wizard.deviceSearch.deviceIdentified')}</Title>
                </Group>
                <div className="space-y-2">
                  <Group>
                    <Text fw={600} className="min-w-32">{t('wizard.deviceSearch.productType')}</Text>
                    <Text>{identificationResult.Product}</Text>
                  </Group>
                  <Group>
                    <Text fw={600} className="min-w-32">{t('wizard.deviceSearch.brand')}</Text>
                    <Text>{identificationResult.Brand}</Text>
                  </Group>
                  <Group>
                    <Text fw={600} className="min-w-32">{t('wizard.deviceSearch.model')}</Text>
                    <Text>{identificationResult.Model}</Text>
                  </Group>
                  {isRepairer && identificationResult.GTIN && (
                    <Group>
                    <Text fw={600} className="min-w-32">{t('wizard.deviceSearch.gtin')}</Text>
                      <Text>{identificationResult.GTIN}</Text>
                    </Group>
                  )}
                  {isRepairer && identificationResult.ReleaseDate && (
                    <Group>
                    <Text fw={600} className="min-w-32">{t('wizard.deviceSearch.releaseDate')}</Text>
                      <Text>{identificationResult.ReleaseDate}</Text>
                    </Group>
                  )}
                </div>

                {/* This exact model isn't in our catalog yet — say so right where
                    the confident identification above might otherwise read as
                    a contradiction, and offer both ways forward. */}
                {isStrictMode && (
                  <>
                    <div className="border-t border-green-100 dark:border-green-800 my-4" />
                    <div className="flex items-start gap-2 mb-4">
                      <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-xl">inventory_2</span>
                      <Text size="sm" c="dimmed">
                        {t('wizard.deviceSearch.noExactMatch', { brand: editableData.brand, model: editableData.model })}
                      </Text>
                    </div>
                    <Group gap="sm">
                      <Button
                        color="blue"
                        radius="xl"
                        leftSection={<span className="material-symbols-outlined">manage_search</span>}
                        onClick={handleExpandSearch}
                      >
                        {t('wizard.deviceSearch.extendSearch')}
                      </Button>
                      {!guest && (
                        <Button
                          variant="outline"
                          color="purple"
                          radius="xl"
                          leftSection={<span className="material-symbols-outlined">add_circle</span>}
                          onClick={handleCreateDevice}
                        >
                          {t('wizard.deviceSearch.createNewDevice')}
                        </Button>
                      )}
                    </Group>
                    {guest && (
                      <Alert color="yellow" mt="sm" icon={<span className="material-symbols-outlined">account_circle</span>}>
                        {t('wizard.deviceSearch.guestCreateDevice')}
                      </Alert>
                    )}
                  </>
                )}
              </Card>
            )}

            {/* Searching in Database */}
            {isSearching && (
              <Card shadow="md" padding="lg" radius="lg" withBorder className="bg-blue-50 dark:bg-blue-900/20">
                <Group gap="md" justify="center">
                  <Loader color="blue" size="md" />
                  <Text c="dimmed">{t('wizard.deviceSearch.searchingDatabase')}</Text>
                </Group>
              </Card>
            )}

            {/* Found Devices grid */}
            {foundDevices.length > 0 && (
              <div className="space-y-4">
                {/* Extended search banner */}
                {!isStrictMode && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900 dark:bg-opacity-20 border border-amber-200 dark:border-amber-700">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                      <span className="material-symbols-outlined text-lg">manage_search</span>
                      <span className="text-sm font-medium">{t('wizard.deviceSearch.extendedSearch')}</span>
                    </div>
                    <Button
                      variant="subtle"
                      color="gray"
                      size="xs"
                      leftSection={<span className="material-symbols-outlined text-sm">search</span>}
                      onClick={handleCollapseSearch}
                    >
                      {t('wizard.deviceSearch.backToExact')}
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-symbols-outlined text-xl text-purple-600 dark:text-purple-400 mr-2">inventory_2</span>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white">{t('wizard.deviceSearch.matchingDevices')}</h4>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('wizard.deviceSearch.devicesFound', { count: totalFoundDevices })}
                  </div>
                </div>

                {/* AI-detected data chips */}
                {identificationResult && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">{t('wizard.deviceSearch.aiDetected')}</span>
                    {editableData.product && (
                      <Badge variant="light" color="purple" size="sm"
                        leftSection={<span className="material-symbols-outlined" style={{ fontSize: 12 }}>devices</span>}>
                        {editableData.product}
                      </Badge>
                    )}
                    {editableData.brand && (
                      <Badge variant="light" color="gray" size="sm"
                        leftSection={<span className="material-symbols-outlined" style={{ fontSize: 12 }}>label</span>}>
                        {editableData.brand}
                      </Badge>
                    )}
                    {editableData.model && (
                      <Badge variant="light" color="gray" size="sm"
                        leftSection={<span className="material-symbols-outlined" style={{ fontSize: 12 }}>tag</span>}>
                        {editableData.model}
                      </Badge>
                    )}
                    {isRepairer && identificationResult.GTIN && (
                      <Badge variant="outline" color="gray" size="sm"
                        leftSection={<span className="material-symbols-outlined" style={{ fontSize: 12 }}>qr_code</span>}>
                        {identificationResult.GTIN}
                      </Badge>
                    )}
                  </div>
                )}

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {foundDevices.slice(0, 6).map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      onClick={() => handleSelectModel(model)}
                      selected={selectedModelId === model.id}
                      showDetailsButton={showDetailsButton}
                      variantId={identified?.modelId === model.id ? identified.deviceId : null}
                      color="purple"
                      onViewDetails={() =>
                        onRefineSearch({ brand: editableData.brand, model: editableData.model, product: editableData.product })
                      }
                    />
                  ))}
                </SimpleGrid>

                {/* Refine search */}
                {totalFoundDevices > 6 && (
                  <div className="space-y-3">
                    <Alert color="blue" icon={<span className="material-symbols-outlined">info</span>}>
                      {t('wizard.deviceSearch.showingRefine', { total: totalFoundDevices })}
                    </Alert>
                    <Button
                      fullWidth
                      color="blue"
                      variant="light"
                      onClick={() => onRefineSearch({ brand: editableData.brand, model: editableData.model, product: editableData.product })}
                      leftSection={<span className="material-symbols-outlined">tune</span>}
                    >
                      {t('wizard.deviceSearch.refineSearch', { total: totalFoundDevices })}
                    </Button>
                  </div>
                )}

                {/* Extend search button (strict mode only) */}
                {isStrictMode && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="subtle"
                      color="gray"
                      size="sm"
                      leftSection={<span className="material-symbols-outlined text-sm">manage_search</span>}
                      onClick={handleExpandSearch}
                    >
                      {t('wizard.deviceSearch.extendSearch')}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* No Devices Found - Show Options */}
            {showOptions && identificationResult && (
              <div className="space-y-4">
                <Alert color="orange" title={t('wizard.deviceSearch.noMatchingDevices')} icon={<span className="material-symbols-outlined">info</span>}>
                  {t('wizard.deviceSearch.noMatchingDevicesDesc')}
                </Alert>

                <Card shadow="md" padding="lg" radius="lg" withBorder>
                  <Title order={4} mb="md">{t('wizard.deviceSearch.modifySearch')}</Title>
                  <Stack gap="md">
                    <TextInput
                      label={t('wizard.deviceSearch.brand')}
                      placeholder={t('wizard.deviceSearch.brand')}
                      value={editableData.brand}
                      onChange={(e) => setEditableData({ ...editableData, brand: e.currentTarget.value })}
                      leftSection={<span className="material-symbols-outlined text-sm">badge</span>}
                    />
                    <TextInput
                      label={t('wizard.deviceSearch.model')}
                      placeholder={t('wizard.deviceSearch.model')}
                      value={editableData.model}
                      onChange={(e) => setEditableData({ ...editableData, model: e.currentTarget.value })}
                      leftSection={<span className="material-symbols-outlined text-sm">smartphone</span>}
                    />
                    <TextInput
                      label={t('wizard.deviceSearch.productType')}
                      placeholder={t('wizard.deviceSearch.productType')}
                      value={editableData.product}
                      onChange={(e) => setEditableData({ ...editableData, product: e.currentTarget.value })}
                      leftSection={<span className="material-symbols-outlined text-sm">category</span>}
                    />
                    <Button
                      fullWidth
                      color="blue"
                      onClick={handleSearchWithModifiedData}
                      leftSection={<span className="material-symbols-outlined">search</span>}
                    >
                      {t('wizard.deviceSearch.searchAgain')}
                    </Button>
                  </Stack>
                </Card>

                <Card shadow="md" padding="lg" radius="lg" withBorder>
                  <Title order={4} mb="md">{t('wizard.deviceSearch.createNewDevice')}</Title>
                  {guest ? (
                    <Alert color="yellow" icon={<span className="material-symbols-outlined">account_circle</span>}>
                        {t('wizard.deviceSearch.guestCreateDevice')}
                    </Alert>
                  ) : (
                    <>
                      <Text size="sm" c="dimmed" mb="md">
                        {t('wizard.deviceSearch.createNewDeviceDesc')}
                      </Text>
                      <Button
                        fullWidth
                        color="purple"
                        onClick={handleCreateDevice}
                        leftSection={<span className="material-symbols-outlined">add_circle</span>}
                      >
                        {t('wizard.deviceSearch.createNewDevice')}
                      </Button>
                    </>
                  )}
                </Card>
              </div>
            )}
          </div>

        </div>
      ))}

    </div>
  );
}
