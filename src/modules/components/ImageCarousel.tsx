import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageFile {
  id: string;
  fileName: string;
  mimeType?: string;
  base64Data: string;
  caption?: string;
}

interface ImageCarouselProps {
  images: ImageFile[];
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

export function ImageCarousel({ images = [], onDelete, readOnly = false }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (images.length === 0) {
    return (
      <div className="border border-border/50 rounded-lg p-6 bg-muted/5 text-center flex flex-col items-center justify-center text-xs text-muted-foreground">
        <span>No image evidence attached.</span>
      </div>
    );
  }

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImg = images[activeIndex];

  return (
    <div className={`relative rounded-xl border border-border/80 bg-card overflow-hidden transition-all duration-300 ${
      isFullscreen ? 'fixed inset-0 z-50 flex flex-col justify-center bg-black/95' : 'w-full'
    }`}>
      {/* Top action bar */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-2">
        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="h-7 w-7 p-0 bg-background/80 backdrop-blur hover:bg-background/95 rounded-full"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </Button>
        {onDelete && !readOnly && (
          <Button
            type="button"
            variant="destructive"
            size="xs"
            onClick={() => {
              onDelete(currentImg.id);
              if (activeIndex >= images.length - 1 && activeIndex > 0) {
                setActiveIndex(activeIndex - 1);
              }
            }}
            className="h-7 w-7 p-0 rounded-full"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Main Image Slider */}
      <div className={`relative flex items-center justify-center overflow-hidden ${
        isFullscreen ? 'flex-1 p-4' : 'aspect-video max-h-[300px]'
      }`}>
        <img
          src={currentImg.base64Data}
          alt={currentImg.caption || `Audit Evidence ${activeIndex + 1}`}
          className={`object-contain transition-all duration-300 ${
            isFullscreen ? 'max-h-full max-w-full' : 'w-full h-full'
          }`}
        />

        {/* Carousel arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/85 text-white p-1.5 rounded-full backdrop-blur-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/85 text-white p-1.5 rounded-full backdrop-blur-md transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Caption Overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
          <p className="text-xs font-bold truncate">
            {currentImg.caption || 'No description provided'}
          </p>
          <span className="text-[10px] text-zinc-300 font-mono">
            {activeIndex + 1} of {images.length} • {currentImg.fileName}
          </span>
        </div>
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div className="bg-muted/30 border-t border-border/40 p-2 flex items-center justify-center space-x-2 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative h-10 w-16 rounded overflow-hidden border-2 transition-all ${
                activeIndex === idx 
                  ? 'border-primary scale-105' 
                  : 'border-transparent opacity-60 hover:opacity-90'
              }`}
            >
              <img src={img.base64Data} alt="thumb" className="object-cover w-full h-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
