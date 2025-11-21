import { fetchTranscriptIfPossible, parseYouTubeVideoId } from '../services/youtubeTranscriptService';

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description?: string;
  transcript: string;
  hasTranscript: boolean;
  transcriptSource?: string;
  transcriptReason?: string;
}

async function fetchVideoMetadata(videoId: string): Promise<{ title: string; description?: string }> {
  const fallback = { title: 'YouTube Video', description: '' };

  try {
    const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      return { title: data.title || fallback.title, description: data.author_name || '' };
    }
  } catch (error) {
    console.warn('[YouTube] oEmbed metadata failed', error);
  }

  try {
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (response.ok) {
      const data = await response.json();
      return { title: data.title || fallback.title, description: data.author_name || '' };
    }
  } catch (error) {
    console.warn('[YouTube] noembed metadata failed', error);
  }

  return fallback;
}

export async function fetchYouTubeData(url: string): Promise<YouTubeVideoData> {
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please check the URL format and try again.');
  }

  const metadata = await fetchVideoMetadata(videoId);
  const transcriptResult = await fetchTranscriptIfPossible(videoId);

  if (transcriptResult.status === 'ok' && transcriptResult.text) {
    return {
      videoId,
      title: transcriptResult.title ?? metadata.title,
      description: metadata.description,
      transcript: transcriptResult.text.trim(),
      hasTranscript: true,
      transcriptSource: 'open-captions',
      transcriptReason: transcriptResult.reason,
    };
  }

  return {
    videoId,
    title: transcriptResult.title ?? metadata.title,
    description: metadata.description,
    transcript: '',
    hasTranscript: false,
    transcriptSource: 'manual-required',
    transcriptReason: transcriptResult.reason,
  };
}
