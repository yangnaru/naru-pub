"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface ImageViewerProps {
  src: string;
  alt: string;
  filename: string;
}

export default function ImageViewer({ src, alt, filename }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [imageError, setImageError] = useState(false);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  if (imageError) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="text-6xl mb-4">🖼️</div>
          <p>이미지를 불러올 수 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-muted">
      {/* Image Controls */}
      <div className="p-3 border-b border-border bg-card">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="text-xs px-2 py-1"
            >
              축소
            </Button>
            <span className="text-xs text-muted-foreground min-w-[4rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              className="text-xs px-2 py-1"
            >
              확대
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetZoom}
              className="text-xs px-2 py-1"
            >
              원본
            </Button>
          </div>
        </div>
      </div>

      {/* Image Display */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center justify-center min-h-full">
          <div
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease-out'
            }}
            className="max-w-full max-h-full"
          >
            <img
              src={src}
              alt={alt}
              onError={() => setImageError(true)}
              className="max-w-full max-h-full border border-border rounded"
              style={{ 
                display: 'block',
                maxWidth: zoom === 1 ? '100%' : 'none',
                maxHeight: zoom === 1 ? '100%' : 'none',
                width: zoom === 1 ? 'auto' : undefined,
                height: zoom === 1 ? 'auto' : undefined
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}