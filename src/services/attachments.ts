import type { ChatAttachment } from '@/types';

export const MAX_CHAT_IMAGE_BYTES = 8 * 1024 * 1024;

export function describeAttachment(attachment: ChatAttachment): string {
  return `${attachment.name} (${attachment.mimeType}, ${Math.round(attachment.size / 1024)} KB)`;
}

export function readImageAttachment(file: File): Promise<ChatAttachment> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Please choose an image file.'));
  }
  if (file.size > MAX_CHAT_IMAGE_BYTES) {
    return Promise.reject(new Error('Images must be 8 MB or smaller.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl.startsWith('data:image/')) {
        reject(new Error('Could not read that image.'));
        return;
      }
      resolve({
        id: `attachment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'image',
        name: file.name || 'image',
        mimeType: file.type || 'image/png',
        dataUrl,
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  });
}
