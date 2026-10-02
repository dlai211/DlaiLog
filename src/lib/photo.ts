import { Platform } from 'react-native';

import { fitWithin } from '@/lib/geometry';

/**
 * Dish photos for the Meals module.
 *
 * Everything the browser needs to read and shrink an uploaded picture lives
 * here, behind two functions with graceful fallbacks elsewhere — so the rest
 * of the app never touches the DOM.
 *
 * Uploaded pictures are scaled down (longest side 800px, JPEG) before being
 * stored, because they live in the same browser storage as everything else:
 * the original from a phone camera would fill it many times over.
 */

const MAX_SIDE = 800;
const JPEG_QUALITY = 0.72;

/** Opens the browser's image picker; null when there is no browser. */
export function pickImageFile(): Promise<File | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

/** Reads a picked file and returns a shrunken data URL for storage. */
export async function readPhotoAsDataUrl(file: File): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const size = fitWithin(image.naturalWidth || image.width, image.naturalHeight || image.height, MAX_SIDE);

    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0, size.width, size.height);

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Pick, read and shrink in one go — what the meal form calls. */
export async function pickPhotoAsDataUrl(): Promise<string | null> {
  const file = await pickImageFile();
  if (!file) return null;
  return readPhotoAsDataUrl(file);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read that image.'));
    image.src = src;
  });
}

/** Human-readable storage size, for the backup panel. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
