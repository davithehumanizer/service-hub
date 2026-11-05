import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Center, Title, Text, TextInput, Button, Divider } from '@mantine/core';
import BarcodeScanner, { hasCamera } from '../../../BarcodeScanner';
import PhotoHandoffPanel from './PhotoHandoffPanel';

interface EanSearchProps {
  onSearch: (ean: string) => void;
}

type Mode = 'input' | 'scan' | 'handoff';

export default function EanSearch({ onSearch }: EanSearchProps) {
  const { t } = useTranslation();
  const [eanValue, setEanValue] = useState('');
  const [mode, setMode] = useState<Mode>('input');

  const handleSearch = () => {
    if (eanValue.trim()) {
      onSearch(eanValue.trim());
    }
  };

  return (
    <div className="text-center py-2 sm:py-8">
      <div className="max-w-md mx-auto">
        <Center mb="md">
          <div className="w-14 h-14 sm:w-24 sm:h-24 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl sm:text-5xl text-blue-600">barcode_scanner</span>
          </div>
        </Center>
        <Title order={2} className="text-lg sm:text-2xl mb-2">{t('wizard.deviceSearch.eanTitle')}</Title>
        <Text c="dimmed" size="sm" mb="lg">{t('wizard.deviceSearch.eanSubtitle')}</Text>

        {mode === 'scan' && (
          <div className="mb-6">
            <BarcodeScanner
              onDetected={(code) => {
                setEanValue(code);
                setMode('input');
                onSearch(code);
              }}
              onCancel={() => setMode('input')}
            />
          </div>
        )}

        {mode === 'handoff' && (
          <div className="mb-6">
            <PhotoHandoffPanel
              mode="barcode"
              onCancel={() => setMode('input')}
              onResult={(response) => {
                const code = response?.data?.GTIN;
                setMode('input');
                if (code) {
                  setEanValue(code);
                  onSearch(code);
                }
              }}
            />
          </div>
        )}

        {mode === 'input' && (
          <>
            <Button
              size="lg"
              radius="xl"
              variant="light"
              color="blue"
              fullWidth
              mb="md"
              onClick={() => setMode(hasCamera() ? 'scan' : 'handoff')}
              leftSection={<span className="material-symbols-outlined">qr_code_scanner</span>}
            >
              {hasCamera()
                ? t('wizard.deviceSearch.scanBarcode', { defaultValue: 'Scan the barcode' })
                : t('wizard.deviceSearch.scanWithPhone', {
                    defaultValue: 'Scan with my phone',
                  })}
            </Button>

            <Divider
              my="md"
              label={t('common.or', { defaultValue: 'or' })}
              labelPosition="center"
            />

            {/* Side by side, the field collapsed to a few characters on a phone
                while the button kept its full label. Stacked below sm, and the
                keyboard opens on digits since an EAN is 13 of them. */}
            <div className="flex flex-col sm:flex-row gap-3">
              <TextInput
                placeholder={t('wizard.deviceSearch.eanPlaceholder')}
                size="lg"
                radius="xl"
                className="flex-1"
                inputMode="numeric"
                pattern="[0-9]*"
                value={eanValue}
                onChange={(e) => setEanValue(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                size="lg"
                radius="xl"
                color="blue"
                onClick={handleSearch}
                disabled={!eanValue.trim()}
              >
                {t('wizard.deviceSearch.findDevice')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
