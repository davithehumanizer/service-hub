import React, { useCallback, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Text, Title, Alert, Loader, Center, Stack } from '@mantine/core';
import { deviceService } from '../services/deviceService';
import BarcodeScanner from '../components/BarcodeScanner';

type Status = 'idle' | 'sending' | 'sent' | 'error';

// Standalone page opened by scanning the QR code shown on the "continue on
// your phone" panel of the desktop photo-identification step. No layout,
// no auth — the pairing token in the URL fragment (never sent to the
// server as part of the URL, only read client-side) is the credential.
const MobilePhotoHandoff: React.FC = () => {
  const { t } = useTranslation();
  const { pairingId } = useParams<{ pairingId: string }>();
  const token = window.location.hash.slice(1);
  // The desktop decides which job it is handing over; the token still travels
  // in the fragment, which never reaches the server.
  const isBarcode =
    new URLSearchParams(window.location.search).get('mode') === 'barcode';
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setValidationError(t('photoHandoff.invalidFile'));
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setValidationError(t('photoHandoff.fileTooLarge'));
      return;
    }

    setValidationError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleBarcode = useCallback(
    async (code: string) => {
      if (!pairingId) return;
      setStatus('sending');
      try {
        await deviceService.submitBarcodeHandoff(pairingId, token, code);
        setStatus('sent');
      } catch {
        setStatus('error');
      }
    },
    [pairingId, token],
  );

  const handleSend = async () => {
    if (!file || !pairingId) return;
    setStatus('sending');
    try {
      await deviceService.submitPhotoHandoff(pairingId, token, file);
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  const handleRetake = () => {
    setFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!pairingId || !token) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
        <Card shadow="md" padding="lg" radius="lg" withBorder className="max-w-sm text-center">
          <Title order={3} className="mb-2">{t('photoHandoff.invalidLinkTitle')}</Title>
          <Text c="dimmed">{t('photoHandoff.invalidLink')}</Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <Card shadow="md" padding="lg" radius="lg" withBorder className="w-full max-w-sm text-center">
        {status === 'sent' ? (
          <>
            <Center mb="md">
              <span className="material-symbols-outlined text-5xl text-green-600">check_circle</span>
            </Center>
            <Title order={3} className="mb-2">{t('photoHandoff.successTitle')}</Title>
            <Text c="dimmed">{t('photoHandoff.success')}</Text>
          </>
        ) : (
          <>
            <Title order={3} className="mb-2">
              {isBarcode
                ? t('photoHandoff.barcodeTitle', { defaultValue: 'Scan the barcode' })
                : t('photoHandoff.title')}
            </Title>
            <Text c="dimmed" size="sm" mb="lg">
              {isBarcode
                ? t('photoHandoff.barcodeSubtitle', {
                    defaultValue:
                      'Point the camera at the barcode on the device or its label.',
                  })
                : t('photoHandoff.subtitle')}
            </Text>

            {isBarcode && status !== 'sending' && (
              <BarcodeScanner onDetected={handleBarcode} />
            )}
            {isBarcode && status === 'sending' && (
              <Center my="lg"><Loader /></Center>
            )}

            {!isBarcode && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            )}

            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-72 mx-auto rounded-lg object-contain mb-4"
              />
            )}

            {validationError && (
              <Alert color="red" mb="md">{validationError}</Alert>
            )}

            {status === 'error' && (
              <Alert color="red" mb="md">{t('photoHandoff.error')}</Alert>
            )}

            <Stack gap="sm">
              {!isBarcode && !file && (
                <Button
                  size="lg"
                  radius="xl"
                  color="purple"
                  onClick={() => fileInputRef.current?.click()}
                  leftSection={<span className="material-symbols-outlined">photo_camera</span>}
                >
                  {t('photoHandoff.takePhoto')}
                </Button>
              )}

              {!isBarcode && file && status !== 'sending' && (
                <>
                  <Button
                    size="lg"
                    radius="xl"
                    color="purple"
                    onClick={handleSend}
                    leftSection={<span className="material-symbols-outlined">send</span>}
                  >
                    {t('photoHandoff.send')}
                  </Button>
                  <Button
                    variant="subtle"
                    color="gray"
                    onClick={handleRetake}
                    leftSection={<span className="material-symbols-outlined text-sm">refresh</span>}
                  >
                    {t('photoHandoff.retake')}
                  </Button>
                </>
              )}

              {!isBarcode && status === 'sending' && (
                <Center py="md">
                  <Stack align="center" gap="xs">
                    <Loader color="purple" />
                    <Text c="dimmed" size="sm">{t('photoHandoff.sending')}</Text>
                  </Stack>
                </Center>
              )}
            </Stack>
          </>
        )}
      </Card>
    </div>
  );
};

export default MobilePhotoHandoff;
