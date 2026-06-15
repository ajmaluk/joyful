import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { MAX_IMAGES, addImage, uploadedImages, uploadingImages, hasReachedLimit } from '~/lib/stores/images';
import { classNames } from '~/utils/classNames';

interface ImageUploadProps {
  className?: string;
}

export const ImageUpload = memo(({ className }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagesCount, setImagesCount] = useState(0);

  // Subscribe to store count
  useEffect(() => {
    const unsub = uploadedImages.subscribe((val) => {
      setImagesCount(val.length);
    });
    return unsub;
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const currentCount = uploadedImages.get().length;
    const currentUploading = uploadingImages.get();
    const remaining = MAX_IMAGES - currentCount - currentUploading.length;

    const filesToUpload = Array.from(files).slice(0, Math.max(0, remaining));

    filesToUpload.forEach((file, index) => {
      const tempId = `loading-${Date.now()}-${index}`;

      // Show spinner card globally
      uploadingImages.set([...uploadingImages.get(), tempId]);

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;

        // Simulate upload delay for elegant circular spinner UX
        setTimeout(() => {
          addImage({
            id: `upload-${Date.now()}-${index}`,
            dataUrl,
            file,
            name: file.name,
            type: 'upload',
          });

          // Remove spinner card globally
          uploadingImages.set(uploadingImages.get().filter((id) => id !== tempId));
        }, 1000);
      };

      reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again
    event.target.value = '';
  }, []);

  return (
    <div className={classNames('relative flex items-center gap-2', className)}>
      {/* Image upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={hasReachedLimit()}
        className={classNames(
          'bg-transparent text-gray-400 transition-colors flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 hover:text-white',
          hasReachedLimit()
            ? 'opacity-30 cursor-not-allowed'
            : '',
        )}
        title="Upload image / Add asset"
      >
        <div className="i-ph:plus text-lg" />
      </button>

      {imagesCount > 0 && (
        <span className="text-xs text-gray-500 font-medium">
          {imagesCount}/{MAX_IMAGES} images
        </span>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
});

ImageUpload.displayName = 'ImageUpload';

