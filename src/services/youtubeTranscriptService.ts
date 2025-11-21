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

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  const textarea = typeof document !== 'undefined' ? document.createElement('textarea') : null;
  if (!textarea) {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  textarea.innerHTML = text;
  return textarea.value;
}

async function fetchTimedTextCaptions(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://video.google.com/timedtext?lang=en&v=${videoId}`);
    if (!res.ok) return null;
    const xml = await res.text();
    if (!xml || xml.trim().length === 0) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const nodes = Array.from(doc.getElementsByTagName('text'));
    if (!nodes.length) return null;

    const combined = nodes
      .map((node) => decodeHtmlEntities(node.textContent || ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return combined.length > 0 ? combined : null;
  } catch (error) {
    console.warn('[YouTube] timedtext fetch failed', error);
    return null;
  }
}

export async function fetchTranscriptIfPossible(videoId: string): Promise<TranscriptResult> {
  const baseResult: TranscriptResult = { status: 'no_transcript' };
  const title = await fetchMetadataTitle(videoId);

  // First, attempt the official timedtext endpoint (works for many public captioned videos without an API key)
  const timedText = await fetchTimedTextCaptions(videoId);
  if (timedText) {
    return {
      status: 'ok',
      text: timedText,
      title,
      reason: 'Pulled open captions automatically. You can still paste/edit below for accuracy.',
    };
  }

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
            ? 'Captions exist for this video, but direct download needs manual copy. Use the steps below to paste it.'
            : 'No auto-captions were found. Paste the transcript to continue.',
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
    reason:
      'Auto-transcript could not be fetched. Paste the YouTube transcript (copy from the Transcript panel) or upload .srt/.vtt to continue.',
  };
}
