export type TranscriptResultStatus = 'ok' | 'no_transcript' | 'error';

export interface TranscriptResult {
  status: TranscriptResultStatus;
  text?: string;
  reason?: string;
  title?: string;
}

const YT_VIDEO_ID_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([A-Za-z0-9_-]{11})/;

export function parseYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const match = trimmed.match(YT_VIDEO_ID_REGEX);
  if (match) return match[1];
  try {
    const asUrl = new URL(trimmed);
    if (asUrl.hostname.includes('youtube.com') || asUrl.hostname.includes('youtu.be')) {
      const vParam = asUrl.searchParams.get('v');
      if (vParam && vParam.length === 11) return vParam;
      const pathnameParts = asUrl.pathname.split('/').filter(Boolean);
      if (pathnameParts.length > 0 && pathnameParts[pathnameParts.length - 1].length === 11) {
        return pathnameParts[pathnameParts.length - 1];
      }
    }
  } catch (_error) {
    return null;
  }
  return null;
}

async function fetchMetadataTitle(videoId: string): Promise<string | undefined> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.title === 'string') return data.title;
    }
  } catch (error) {
    console.warn('[YouTube] oEmbed metadata failed', error);
  }

  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.title === 'string') return data.title;
    }
  } catch (error) {
    console.warn('[YouTube] noembed metadata failed', error);
  }

  return undefined;
}

export async function fetchTranscriptIfPossible(videoId: string): Promise<TranscriptResult> {
  const baseResult: TranscriptResult = { status: 'no_transcript' };
  const title = await fetchMetadataTitle(videoId);

  const apiKey = import.meta.env.VITE_YT_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoId}&key=${apiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        const item = Array.isArray(data?.items) ? data.items[0] : undefined;
        const hasCaptions = item?.contentDetails?.caption === 'true';
        return {
          status: 'no_transcript',
          title: title ?? item?.snippet?.title,
          reason: hasCaptions
            ? 'Captions exist for this video, but transcript download requires manual copy. Use the steps below to paste it.'
            : 'Auto-transcript is unavailable for this video. Paste the transcript to continue.',
        };
      }
      return {
        status: 'error',
        title,
        reason: 'Could not verify captions via YouTube Data API. Please paste the transcript manually.',
      };
    } catch (error) {
      console.error('[YouTube] Data API check failed', error);
      return {
        status: 'error',
        title,
        reason: 'YouTube Data API request failed. Paste the transcript to proceed.',
      };
    }
  }

  return {
    ...baseResult,
    title,
    reason: 'Auto-transcript is not available without a YouTube API key. Paste the transcript to continue.',
  };
}
