import React, { useRef, useState } from 'react';
import { Camera, Upload, Image as ImageIcon, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageFile {
  id: string;
  fileName: string;
  mimeType?: string;
  base64Data: string;
  caption?: string;
}

interface ImageUploadProps {
  componentId: string;
  images: ImageFile[];
  onChange: (updatedImages: ImageFile[]) => void;
  maxImages?: number;
  label?: string;
  disabled?: boolean;
}

export function ImageUpload({
  componentId,
  images = [],
  onChange,
  maxImages = 3,
  label = 'Evidence Photos',
  disabled = false
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (images.length >= maxImages) {
      alert(`Maximum of ${maxImages} images allowed.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to WebP base64
        const compressedBase64 = canvas.toDataURL('image/webp', 0.75);
        const newImage: ImageFile = {
          id: `img_${Math.random().toString(36).substr(2, 9)}`,
          fileName: file.name.replace(/\.[^/.]+$/, "") + '.webp',
          mimeType: 'image/webp',
          base64Data: compressedBase64,
          caption: ''
        };

        onChange([...images, newImage]);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const removeImage = (id: string) => {
    onChange(images.filter(img => img.id !== id));
  };

  const updateCaption = (id: string, caption: string) => {
    onChange(images.map(img => img.id === id ? { ...img, caption } : img));
  };

  return (
    <div className="space-y-3">
      {label && <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>}
      
      {/* Upload Drag Box */}
      {images.length < maxImages && !disabled && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center space-y-3 transition-colors text-center ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-border/60 hover:border-primary/40 bg-card/20'
          }`}
        >
          <Upload className="w-8 h-8 text-muted-foreground/60" />
          <div className="text-xs">
            <span className="font-bold text-foreground block">Drag and drop photo here</span>
            <span className="text-muted-foreground mt-0.5 block">or choose upload type</span>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-7"
            >
              <ImageIcon className="w-3.5 h-3.5 mr-1" /> Browse Files
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => cameraInputRef.current?.click()}
              className="text-xs h-7"
            >
              <Camera className="w-3.5 h-3.5 mr-1" /> Take Photo
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Uploaded Thumbnails with Caption Edit */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative rounded-lg overflow-hidden border border-border bg-card/50 p-2 flex flex-col space-y-2">
              <div className="relative aspect-video w-full rounded-md overflow-hidden bg-muted">
                <img src={img.base64Data} alt="Thumbnail" className="object-cover w-full h-full" />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={img.caption || ''}
                disabled={disabled}
                onChange={(e) => updateCaption(img.id, e.target.value)}
                placeholder="Enter caption..."
                className="w-full text-[10px] bg-transparent border-b border-border/40 focus:border-primary focus:outline-none px-1 py-0.5 text-foreground"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
