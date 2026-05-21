import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Upload, Paintbrush, Check } from 'lucide-react';

interface SignaturePadProps {
  value?: string; // base64 string
  onChange: (base64?: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function SignaturePad({
  value,
  onChange,
  placeholder = 'Sign in the box above',
  readOnly = false
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(!!value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Setup drawing settings
  useEffect(() => {
    if (readOnly || value) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, [readOnly, value]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (readOnly || value) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || readOnly || value) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setHasDrawn(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
    onChange(undefined);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      const base64 = canvas.toDataURL('image/png');
      onChange(base64);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onChange(base64);
        setHasDrawn(true);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2 max-w-md w-full">
      {/* Canvas container */}
      <div className="relative border-2 border-border/80 rounded-xl overflow-hidden bg-card h-40 w-full flex items-center justify-center">
        {value ? (
          <div className="w-full h-full p-2 bg-white flex items-center justify-center">
            <img src={value} alt="Signature" className="max-h-full max-w-full object-contain" />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full cursor-crosshair bg-white"
          />
        )}

        {/* Action icons / states */}
        {!value && !hasDrawn && (
          <div className="absolute pointer-events-none text-zinc-400 text-xs flex flex-col items-center space-y-1">
            <Paintbrush className="w-5 h-5 text-zinc-300" />
            <span>Draw your signature here</span>
          </div>
        )}
      </div>

      {/* Button Row */}
      {!readOnly && (
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {!value && hasDrawn && (
              <Button
                type="button"
                onClick={saveSignature}
                size="sm"
                className="bg-green-600 hover:bg-green-700 h-8 text-xs text-white"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Lock Signature
              </Button>
            )}
            {(value || hasDrawn) && (
              <Button
                type="button"
                variant="outline"
                onClick={clearCanvas}
                size="sm"
                className="h-8 text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>

          {!value && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1" /> Upload Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
