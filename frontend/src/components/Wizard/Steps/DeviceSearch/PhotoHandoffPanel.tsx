import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Center, Title, Text, Button, Loader, Stack, Alert } from '@mantine/core';
import { QRCodeSVG } from 'qrcode.react';
import { deviceService } from '../../../../services/deviceService';
import { IdentificationResponse } from '../../../../models/identification';

const POLL_INTERVAL_MS = 2000;

interface PhotoHandoffPanelProps {
  onResult: (response: IdentificationResponse) => void;
  onCancel: () => void;
  /** The phone scans a barcode instead of taking a photo. */
  mode?: 'photo' | 'barcode';
}

export default function PhotoHandoffPanel({
  onResult,
  onCancel,
  mode = 'photo',
}: PhotoHandoffPanelProps) {
  const { t } = useTranslation();
  const [mobileUrl, setMobileUrl] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState(false);
  const sessionRef = useRef<{ pairingId: string; token: string; expiresAt: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startSession = async () => {
    setError(false);
    setExpired(false);
    setMobileUrl(null);
    stopPolling();

    try {
      const session = await deviceService.createPhotoHandoffSession();
      sessionRef.current = {
        pairingId: session.pairingId,
        token: session.token,
        expiresAt: new Date(session.expiresAt).getTime(),
      };
      const query = mode === 'barcode' ? '?mode=barcode' : '';
      setMobileUrl(
        `${window.location.origin}/m/${session.pairingId}${query}#${session.token}`,
      );

      pollRef.current = setInterval(async () => {
        const current = sessionRef.current;
        if (!current) return;

        if (Date.now() > current.expiresAt) {
          stopPolling();
          setExpired(true);
          return;
        }

        try {
          const status = await deviceService.getPhotoHandoffStatus(current.pairingId, current.token);
          if (status.status === 'completed' && status.data) {
            stopPolling();
            onResult(status.data);
          }
        } catch {
          stopPolling();
          setExpired(true);
        }
      }, POLL_INTERVAL_MS);
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    startSession();
    return stopPolling;
  }, []);

  return (
    <Card shadow="md" padding="lg" radius="lg" withBorder className="max-w-md mx-auto text-center">
      <Title order={3} className="mb-2">{t('wizard.deviceSearch.handoffTitle')}</Title>
      <Text c="dimmed" size="sm" mb="md">{t('wizard.deviceSearch.handoffSubtitle')}</Text>

      {error && (
        <Alert color="red" mb="md">{t('wizard.deviceSearch.handoffError')}</Alert>
      )}

      {expired && (
        <Alert color="orange" mb="md">{t('wizard.deviceSearch.handoffExpired')}</Alert>
      )}

      {!error && !expired && mobileUrl && (
        <Stack align="center" gap="md">
          <Center className="p-4 bg-white rounded-lg">
            <QRCodeSVG value={mobileUrl} size={200} />
          </Center>
          <Stack align="center" gap={4}>
            <Loader size="sm" color="purple" />
            <Text size="sm" c="dimmed">{t('wizard.deviceSearch.handoffWaiting')}</Text>
          </Stack>
        </Stack>
      )}

      {!error && !expired && !mobileUrl && (
        <Center py="xl"><Loader color="purple" /></Center>
      )}

      <Stack gap="xs" mt="lg">
        {(error || expired) && (
          <Button variant="light" color="purple" onClick={startSession}>
            {t('wizard.deviceSearch.handoffRetry')}
          </Button>
        )}
        <Button variant="subtle" color="gray" onClick={onCancel}>
          {t('wizard.deviceSearch.handoffCancel')}
        </Button>
      </Stack>
    </Card>
  );
}
