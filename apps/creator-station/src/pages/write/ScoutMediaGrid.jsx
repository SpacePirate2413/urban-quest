import { FileAudio, FileVideo, ImageIcon } from 'lucide-react';

/**
 * Grid of media thumbnails for a scouted waypoint. Photos render inline; video
 * and audio render as labeled tiles with the file extension. Tapping any tile
 * opens the full file in a new browser tab — no inline player here so the
 * panel stays compact even when there's a lot of media.
 *
 * The mobile app captures all three media types and stamps the URLs on the
 * waypoint via the same /scouted-waypoints/:id/upload endpoint, so the lists
 * here are populated automatically on the next refresh.
 */

// Strip the trailing /api so /api/media/foo.jpg becomes a fetchable URL.
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

function fullUrl(rel) {
  if (!rel) return null;
  if (/^(https?|file|blob):/i.test(rel)) return rel;
  return `${API_ORIGIN}${rel.startsWith('/') ? rel : `/${rel}`}`;
}

function fileLabel(url) {
  const name = url?.split('/').pop() || '';
  const ext = name.split('.').pop()?.toUpperCase();
  return ext || 'FILE';
}

export function ScoutMediaGrid({ waypoint }) {
  const photos = (waypoint.photos || []).map(fullUrl).filter(Boolean);
  const videos = (waypoint.videos || []).map(fullUrl).filter(Boolean);
  const audios = (waypoint.audioRecordings || []).map(fullUrl).filter(Boolean);

  if (!photos.length && !videos.length && !audios.length) return null;

  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1 text-white/60">
            <ImageIcon className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-wider font-bangers">
              Photos ({photos.length})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block aspect-square overflow-hidden rounded bg-input-bg hover:opacity-80 transition-opacity"
              >
                <img src={url} alt="Scouted location" className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1 text-white/60">
            <FileVideo className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-wider font-bangers">
              Videos ({videos.length})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {videos.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="aspect-square flex flex-col items-center justify-center rounded bg-input-bg hover:bg-panel-border/50 transition-colors text-white/70"
                title="Open video"
              >
                <FileVideo className="w-5 h-5" />
                <span className="text-[9px] mt-1">{fileLabel(url)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {audios.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1 text-white/60">
            <FileAudio className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-wider font-bangers">
              Audio Notes ({audios.length})
            </span>
          </div>
          <div className="space-y-1">
            {audios.map((url) => (
              <audio key={url} src={url} controls className="w-full h-8" preload="none" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ScoutMediaGrid;
