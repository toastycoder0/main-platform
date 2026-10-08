import { uuidv7 } from 'uuidv7';

export function generateFileKey(basePath: string, ext: string): string {
  return `${basePath}/${uuidv7()}.${ext}`;
}

export function generateTempKey(ext: string): string {
  return `_temp/${uuidv7()}.${ext}`;
}

export function isTempKey(key: string): boolean {
  return key.startsWith('_temp/');
}

export function extractExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}
