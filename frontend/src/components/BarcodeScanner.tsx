import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { telemetry } from '../services/telemetry.service';
import { Alert, Button, Center, Loader } from '@mantine/core';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onCancel?: () => void;
}

// A phone can scan for itself; a desktop hands the job to one over the QR
// pairing already used for photo identification. Typing stays available on
// both — most desktops have no camera worth pointing at a barcode.
export const hasCamera = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  window.matchMedia('(pointer: coarse)').matches;

const FORMATS = ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'ITF', 'Code128'] as const;
const INTERVAL_MS = 250;

// Unconstrained, browsers deliver 640x480: a few pixels per bar of an EAN-13.
const openCamera = (deviceId: string | null) =>
  navigator.mediaDevices.getUserMedia({
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }),
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  });

// Labels are only filled in once camera access has been granted.
const listCameras = async (): Promise<MediaDeviceInfo[]> => {
  const video = (await navigator.mediaDevices.enumerateDevices()).filter(
    (d) => d.kind === 'videoinput',
  );
  const back = video.filter((d) => /back|rear|environment/i.test(d.label));
  return back.length > 0 ? back : video;
};

// Android names its cameras "camera2 <n>, facing back", the main one first.
// Left to facingMode alone, Chrome often opens the fixed-focus ultra-wide of a
// multi-camera phone — Samsung above all — which cannot focus on a barcode.
const mainAndroidCamera = (cameras: MediaDeviceInfo[]) =>
  cameras
    .map((c) => ({ c, n: /camera2? (\d+)/.exec(c.label) }))
    .filter((x) => x.n)
    .sort((a, b) => Number(a.n![1]) - Number(b.n![1]))[0]?.c ?? null;

/**
 * Live barcode scanning from the rear camera.
 *
 * zxing-wasm rather than the browser's own BarcodeDetector: no engine on iOS
 * implements it, so the native API would fail silently on every iPhone. The
 * module and its wasm are imported dynamically so the ~200 kB only loads on
 * the pages that scan.
 *
 * getUserMedia needs a secure context — it works on https and on localhost,
 * and nowhere else.
 */
const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onCancel }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  // The latest callback, read at detection: as a dependency of the effect, a
  // parent passing a new one on each render closed and reopened the camera.
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const activeIdRef = useRef<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let decodeFailed = false;

    const stop = () => {
      if (timer) clearTimeout(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const run = async () => {
      try {
        const zxing = await import('zxing-wasm/reader');
        // Served from our own origin: the library otherwise fetches its wasm
        // from jsDelivr, which a venue network or a CSP can block.
        //
        // Awaited, so a module that cannot compile fails here and is shown,
        // rather than inside the per-frame decode where it would look like an
        // endless stream of frames that simply do not contain a barcode. The
        // CSP needs 'wasm-unsafe-eval' for this to succeed at all.
        await zxing.prepareZXingModule({
          overrides: {
            locateFile: (file: string, prefix: string) =>
              file.endsWith('.wasm')
                ? `${process.env.PUBLIC_URL || ''}/wasm/${file}`
                : prefix + file,
          },
          fireImmediately: true,
        });
        const stream = await openCamera(deviceId);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const track = stream.getVideoTracks()[0];
        activeIdRef.current = track?.getSettings().deviceId;

        if (!deviceId) {
          const found = await listCameras();
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          setCameras(found);
          const main = mainAndroidCamera(found);
          if (main && main.deviceId !== activeIdRef.current) {
            // Reopened on the main camera by the effect this triggers.
            stream.getTracks().forEach((track) => track.stop());
            setDeviceId(main.deviceId);
            return;
          }
        }

        // Not in the DOM typings, and not offered by every engine.
        const capabilities: any = track?.getCapabilities?.() ?? {};
        if (capabilities.focusMode?.includes('continuous')) {
          await track
            .applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] })
            .catch(() => undefined);
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        // iOS refuses to play an inline video without both of these.
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        await video.play();
        setStarting(false);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const tick = async () => {
          if (cancelled || doneRef.current || !ctx || !videoRef.current) return;
          const v = videoRef.current;
          if (v.videoWidth > 0) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            try {
              const results = await zxing.readBarcodesFromImageData(
                ctx.getImageData(0, 0, canvas.width, canvas.height),
                { tryHarder: true, formats: [...FORMATS], maxNumberOfSymbols: 1 },
              );
              const hit = results.find((r) => r.text && r.isValid !== false);
              if (hit && !doneRef.current) {
                doneRef.current = true;
                stop();
                void telemetry.logAction('barcode_scanned', {
                  gtin: hit.text,
                  code_length: hit.text.length,
                  format: hit.format ?? null,
                });
                onDetectedRef.current(hit.text);
                return;
              }
            } catch (frameError) {
              // A frame that will not decode is the normal case. Anything else
              // is not, so it is logged rather than silently dropped.
              if (!decodeFailed) {
                decodeFailed = true;
                console.error('barcode decode failed', frameError);
              }
            }
          }
          timer = setTimeout(() => void tick(), INTERVAL_MS);
        };
        void tick();
      } catch (err: any) {
        if (cancelled) return;
        setStarting(false);
        console.error('barcode scanner failed to start', err);
        setError(
          err?.name === 'NotAllowedError'
            ? t('barcodeScanner.permissionDenied', {
                defaultValue: 'Camera access was refused.',
              })
            : err?.name === 'NotFoundError'
              ? t('barcodeScanner.unavailable', {
                  defaultValue: 'No camera is available on this device.',
                })
              : t('barcodeScanner.startFailed', {
                  defaultValue:
                    'The scanner could not start. Type the number instead.',
                }),
        );
      }
    };

    void run();
    return () => {
      cancelled = true;
      stop();
    };
  }, [t, deviceId]);

  // Nothing scrolls behind the full-screen camera.
  useEffect(() => {
    if (error) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [error]);

  const switchCamera = () => {
    const i = cameras.findIndex((c) => c.deviceId === activeIdRef.current);
    setStarting(true);
    setDeviceId(cameras[(i + 1) % cameras.length].deviceId);
  };

  if (error) {
    return (
      <Alert color="orange" mb="md">
        {error}
        {onCancel && (
          <Button variant="subtle" size="xs" mt="sm" onClick={onCancel}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
        )}
      </Alert>
    );
  }

  const hint = t('barcodeScanner.hint', {
    defaultValue: 'Hold the barcode inside the frame.',
  });

  // The whole screen, over the page: inline, a phone's portrait stream sat
  // below the fold and had to be scrolled to. In a portal, as an ancestor's
  // transform (the home page's animation) would pin a fixed element to it.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={hint}
      className="fixed inset-0 bg-black"
      style={{ zIndex: 300 }}
    >
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
      {/* A window to aim through: barcodes are wide and short. */}
      <div className="absolute inset-x-6 top-1/2 transform -translate-y-1/2 h-24 border-2 border-white border-opacity-80 rounded-lg pointer-events-none" />
      {starting && (
        <Center className="absolute inset-0">
          <Loader color="white" />
        </Center>
      )}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('common.cancel', { defaultValue: 'Cancel' })}
          className="absolute top-4 right-4 w-11 h-11 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center"
        >
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      )}
      <div className="absolute inset-x-0 bottom-0 px-6 pt-12 pb-8 bg-gradient-to-t from-black to-transparent text-center">
        <p className="text-sm text-white">{hint}</p>
        {cameras.length > 1 && (
          <button
            type="button"
            onClick={switchCamera}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white bg-opacity-20 text-sm font-semibold text-white"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">cameraswitch</span>
            {t('barcodeScanner.switchCamera', { defaultValue: 'Switch camera' })}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default BarcodeScanner;
