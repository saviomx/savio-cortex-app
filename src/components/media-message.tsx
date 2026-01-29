'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  mediaId: string;
  messageType: string;
  caption?: string | null;
  filename?: string | null;
  isOutbound?: boolean;
  onImageClick?: (url: string) => void;
  onPdfPreview?: (url: string, filename: string) => void;
};

export function MediaMessage({ mediaId, messageType, caption, filename, isOutbound, onImageClick, onPdfPreview }: Props) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const handleLoadError = useCallback(() => {
    setLoadFailed(true);
  }, []);

  useEffect(() => {
    // Set the media URL to point to our proxy endpoint
    setMediaUrl(`/api/media/${mediaId}`);
    setLoading(false);
    setLoadFailed(false);
  }, [mediaId]);

  if (loading) {
    return (
      <div className="w-64 h-48 rounded flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (loadFailed || !mediaUrl) {
    return (
      <div className="w-64 h-48 bg-muted rounded flex items-center justify-center">
        <p className={cn('text-sm', isOutbound ? 'text-green-100' : 'text-muted-foreground')}>
          Media unavailable
        </p>
      </div>
    );
  }

  const isPdf = filename?.toLowerCase().endsWith('.pdf');

  return (
    <div>
      {messageType === 'image' && (
        <div
          className={cn("relative", onImageClick && "group cursor-pointer")}
          onClick={() => onImageClick?.(mediaUrl)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt={caption || 'Image'}
            className="rounded max-w-full h-auto max-h-96"
            onError={handleLoadError}
          />
          {onImageClick && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
              <Eye className="w-8 h-8 text-white" />
            </div>
          )}
        </div>
      )}

      {messageType === 'video' && (
        <video
          src={mediaUrl}
          controls
          className="rounded max-w-full h-auto max-h-96"
          onError={handleLoadError}
        />
      )}

      {messageType === 'audio' && (
        <audio src={mediaUrl} controls className="w-full" onError={handleLoadError} />
      )}

      {messageType === 'document' && (
        <div className="flex items-center gap-2">
          <span className="text-sm">📎 {filename || 'Document'}</span>
          {isPdf && onPdfPreview && (
            <button
              onClick={() => onPdfPreview(mediaUrl, filename || 'Document.pdf')}
              className="p-1.5 rounded hover:bg-black/10 transition-colors"
              title="Preview"
            >
              <Eye className="h-4 w-4 text-[#667781]" />
            </button>
          )}
          <a
            href={mediaUrl}
            download={filename || 'document'}
            className="p-1.5 rounded hover:bg-black/10 transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4 text-[#667781]" />
          </a>
        </div>
      )}
    </div>
  );
}
