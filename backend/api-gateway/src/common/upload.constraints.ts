import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Constraints for the public upload endpoints.
 *
 * These endpoints accept files without authentication, and what they store is
 * served back from the same origin as the site. Without a MIME allow-list an
 * uploaded `.html` or `.svg` becomes stored XSS on care2repair.eu; without a
 * size limit the shared `uploads_data` volume is a free disk-fill target.
 */

/** Image types the identification model can actually work with. */
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Extension is derived from the validated MIME type, never from the client's
 * filename: `path.extname(file.originalname)` let the caller choose how the
 * file would later be served.
 */
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_CSV_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

export function extensionForMimeType(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType] ?? '';
}

/** Multer options for endpoints that accept a single image. */
export const imageUploadOptions: MulterOptions = {
  limits: {
    fileSize: MAX_IMAGE_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(
        new BadRequestException(
          `Unsupported image type "${file.mimetype}". Allowed: ${[...ALLOWED_IMAGE_MIME_TYPES].join(', ')}.`,
        ),
        false,
      );
      return;
    }
    callback(null, true);
  },
};

/** Multer options for endpoints that accept up to ten photos at once. */
export const photosUploadOptions: MulterOptions = {
  ...imageUploadOptions,
  limits: {
    fileSize: MAX_IMAGE_UPLOAD_BYTES,
    files: 10,
  },
};

/** Multer options for the repair-record CSV import. */
export const csvUploadOptions: MulterOptions = {
  limits: {
    fileSize: MAX_CSV_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const isCsv =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/plain' ||
      file.originalname.toLowerCase().endsWith('.csv');
    if (!isCsv) {
      callback(new BadRequestException('Only CSV files are accepted.'), false);
      return;
    }
    callback(null, true);
  },
};
