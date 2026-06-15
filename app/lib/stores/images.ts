import { atom } from 'nanostores';

export interface UploadedImage {
  id: string;
  dataUrl: string;
  file: File;
  name: string;
  type: 'upload' | 'unsplash';
  unsplashUrl?: string;
  unsplashAuthor?: string;
  unsplashAuthorUrl?: string;
}

export const MAX_IMAGES = 3;

export const uploadedImages = atom<UploadedImage[]>([]);
export const uploadingImages = atom<string[]>([]);

export function addImage(image: UploadedImage) {
  const current = uploadedImages.get();
  if (current.length >= MAX_IMAGES) {
    return false;
  }
  uploadedImages.set([...current, image]);
  return true;
}

export function removeImage(id: string) {
  const current = uploadedImages.get();
  uploadedImages.set(current.filter((img) => img.id !== id));
}

export function clearImages() {
  uploadedImages.set([]);
}

export function hasReachedLimit() {
  return (uploadedImages.get().length + uploadingImages.get().length) >= MAX_IMAGES;
}

