import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Redirect, useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, MultiSelect, Space, Text, TextInput } from '@mantine/core';
import { demoEan } from '../utils/ean';
import { RootState } from '../stores/globalStore';
import { deviceService } from '../services/deviceService';
import { deviceModelService } from '../services/deviceModelService';
import { useNotification } from '../context/NotificationContext';
import { DeviceModel } from '../models/deviceModel';
import DeviceIcon from '../components/Devices/DeviceIcon';
import ModelSuggestions from '../components/Devices/ModelSuggestions';

const MAX_PHOTOS = 10;

/**
 * Adds to the catalogue a model it does not have yet (§4.0, case 3): brand,
 * name and categories, a first variant when a barcode or a reference is
 * known. What belongs to one person's device, its state or its serial
 * number, is no longer asked here. The models the catalogue already has are
 * offered while typing, and an existing one answers instead of a duplicate.
 */
const CreateDevice: React.FC = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const history = useHistory();
  // A photo identification that found nothing hands over what it read.
  const prefilled = (useLocation().state as { prefilledData?: { brand?: string; model?: string } } | undefined)
    ?.prefilledData;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotification();

  const [brand, setBrand] = useState(prefilled?.brand ?? '');
  const [name, setName] = useState(prefilled?.model ?? '');
  const [categories, setCategories] = useState<string[]>([]);
  const [ean, setEan] = useState('');
  const [productCode, setProductCode] = useState('');
  const [availableCategories, setAvailableCategories] = useState<{ value: string; label: string }[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    deviceService.getCategories().then((cats) => {
      if (mounted) setAvailableCategories(cats.map((c) => ({ value: String(c.id), label: c.name })));
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!user) return <Redirect to="/login" />;
  // A contributor's codes are made up: a barcode starting with 2 is no
  // product's (docs/demo-data.md).
  const contributor = user.role?.name === 'contributor';

  const modelPage = (model: DeviceModel, variantId?: number | null) =>
    `/app/model/${model.id}${variantId ? `?variant=${variantId}` : ''}`;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024);
    setSelectedPhotos((prev) => [...prev, ...valid].slice(0, MAX_PHOTOS));
    setPhotoPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))].slice(0, MAX_PHOTOS));
    // So the same file can be picked again once removed.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingStatus) return;
    setError(null);
    const barcode = ean.replace(/\s+/g, '');
    const errors: Record<string, string> = {};
    if (!brand.trim()) errors.brand = t('createDevice.validation.brandRequired');
    if (!name.trim()) errors.name = t('createDevice.validation.nameRequired');
    if (barcode && !/^\d{8,14}$/.test(barcode)) errors.ean = t('createDevice.validation.eanFormat');
    else if (contributor && barcode && !barcode.startsWith('2')) errors.ean = t('createDevice.validation.demoEan');
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoadingStatus(t('createDevice.creating'));
    try {
      const result = await deviceModelService.create({
        brand: brand.trim(),
        name: name.trim(),
        categories: categories.map(Number),
        ...(barcode ? { ean: barcode } : {}),
        ...(productCode.trim() ? { product_code: productCode.trim() } : {}),
      });
      // Photos of the same model, found or made: they show where it has none.
      let photosFailed = false;
      if (selectedPhotos.length > 0) {
        setLoadingStatus(t('createDevice.uploading', { count: selectedPhotos.length }));
        try {
          await deviceModelService.addPhotos(result.model.id, selectedPhotos);
        } catch {
          photosFailed = true;
        }
      }
      showNotification(
        t(result.created ? 'createDevice.created' : 'createDevice.existed', {
          name: `${result.model.brand} ${result.model.name}`,
        }),
        result.created ? 'success' : 'info',
      );
      if (photosFailed) showNotification(t('createDevice.photosFailed'), 'error');
      history.push(modelPage(result.model, result.variant?.device_id));
    } catch (err: any) {
      setError(
        typeof err !== 'string'
          ? t('errors.generic')
          : /already in the catalogue/.test(err)
            ? t('createDevice.demoCodeKnown')
            : err,
      );
    } finally {
      setLoadingStatus(null);
    }
  };

  return (
    // Main.tsx already provides the centred container and horizontal padding;
    // adding another one here doubled the padding and threw the page off-centre.
    <div className="w-full py-10">
      <div className="w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <div className="flex items-center">
            <DeviceIcon deviceType="devices" className="mr-3 text-3xl text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('createDevice.title')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('createDevice.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          {error && <Text c="red" mb="sm">{error}</Text>}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextInput
                label={t('createDevice.brand')}
                value={brand}
                onChange={(e) => setBrand(e.currentTarget.value)}
                error={fieldErrors.brand}
                maxLength={100}
                withAsterisk
              />
              <TextInput
                label={t('createDevice.model')}
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                error={fieldErrors.name}
                maxLength={200}
                withAsterisk
              />
            </div>

            <ModelSuggestions brand={brand} name={name} onPick={(model) => history.push(modelPage(model))} />

            <MultiSelect
              label={t('createDevice.categories')}
              data={availableCategories}
              value={categories}
              onChange={setCategories}
              placeholder={t('createDevice.selectCategories')}
              searchable
              // Enter picks a category; with none highlighted it submitted the form.
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextInput
                label={t('createDevice.ean')}
                description={t(contributor ? 'createDevice.demoEanHint' : 'createDevice.eanHint')}
                value={ean}
                onChange={(e) => setEan(e.currentTarget.value)}
                error={fieldErrors.ean}
                inputMode="numeric"
                rightSectionWidth={contributor ? 100 : undefined}
                rightSectionPointerEvents="all"
                rightSection={
                  contributor && (
                    <Button size="compact-xs" variant="light" onClick={() => setEan(demoEan())}>
                      {t('createDevice.generateEan')}
                    </Button>
                  )
                }
              />
              <TextInput
                label={t('createDevice.productCode')}
                description={t('createDevice.productCodeHint')}
                value={productCode}
                onChange={(e) => setProductCode(e.currentTarget.value)}
                maxLength={100}
              />
            </div>

            <div>
              <Text style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('createDevice.photos')}</Text>
              <Text size="xs" c="dimmed">{t('createDevice.photosDescription')}</Text>
              <Space h="xs" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />
              {photoPreviews.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-3">
                  {photoPreviews.map((src, i) => (
                    <div key={src} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-opacity-80"
                        aria-label={t('createDevice.removePhoto')}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedPhotos.length >= MAX_PHOTOS}
              >
                {selectedPhotos.length === 0
                  ? t('createDevice.addPhotos')
                  : t('createDevice.addMorePhotos', { current: selectedPhotos.length, max: MAX_PHOTOS })}
              </Button>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => history.goBack()}>{t('createDevice.back')}</Button>
              <Button type="submit" loading={loadingStatus !== null}>
                {loadingStatus ?? t('createDevice.submit')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateDevice;
