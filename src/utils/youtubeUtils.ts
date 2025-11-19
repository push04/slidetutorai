/**
 * YouTube utility functions for extracting video info and transcripts
 * ENHANCED with MULTIPLE FREE API FALLBACKS for maximum reliability
 * No API keys required - all methods are completely free
 * Returns partial data if transcript unavailable, allowing callers to handle fallback
 */

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description?: string;
  transcript: string;
  hasTranscript: boolean; // Indicates if real transcript was fetched
  transcriptSource?: string; // Which API provided the transcript
}

/**
 * Extract video ID from YouTube URL - supports multiple URL formats
 */
export function extractVideoId(url: string): string | null {
  // Comprehensive regex supporting youtube.com, youtu.be, shorts, embed, etc.
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]{11})/,
    /(?:youtube\.com\/embed\/)([^&\s]{11})/,
    /(?:youtube\.com\/v\/)([^&\s]{11})/,
    /(?:youtu\.be\/)([^&\s]{11})/,
    /(?:youtube\.com\/shorts\/)([^&\s]{11})/,
    /(?:youtube\.com\/live\/)([^&\s]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

const extractPlaylistId = (url: string): string | null => {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

const createTimeoutSignal = (ms: number): AbortSignal => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), ms);

  controller.signal.addEventListener('abort', () => clearTimeout(timeoutId));
  return controller.signal;
};

/**
 * Fetch video metadata from multiple sources with fallbacks
 */
async function fetchVideoMetadata(videoId: string): Promise<{ title: string; description?: string }> {
  let title = 'YouTube Video';
  let description = '';

  // Try YouTube oEmbed API first (most reliable)
  try {
    const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(apiUrl, { signal: createTimeoutSignal(8000) });
    if (response.ok) {
      const data = await response.json();
      title = data.title || title;
      description = data.author_name || '';
      console.log('[YouTube] ✅ Metadata from oEmbed:', title);
      return { title, description };
    }
  } catch (error) {
    console.warn('[YouTube] oEmbed failed, trying alternative...', error);
  }

  // Fallback: Try noembed.com
  try {
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, {
      signal: createTimeoutSignal(8000),
    });
    if (response.ok) {
      const data = await response.json();
      title = data.title || title;
      description = data.author_name || '';
      console.log('[YouTube] ✅ Metadata from noembed:', title);
      return { title, description };
    }
  } catch (error) {
    console.warn('[YouTube] noembed failed', error);
  }

  return { title, description };
}

async function fetchPlaylistVideoIds(playlistId: string): Promise<{ title: string; videoIds: string[] }> {
  const response = await fetch(`https://r.jina.ai/https://www.youtube.com/playlist?list=${playlistId}`, {
    signal: createTimeoutSignal(15000),
  }).catch(() => null);

  if (!response || !response.ok) {
    return { title: `Playlist ${playlistId}`, videoIds: [] };
  }

  const html = await response.text();
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const extractedTitle = titleMatch ? titleMatch[1].replace(/ - YouTube$/, '') : `Playlist ${playlistId}`;
  const ids = Array.from(new Set(Array.from(html.matchAll(/watch\?v=([\w-]{11})/g)).map(m => m[1])));

  // Limit to first 5 to keep runtime manageable
  return { title: extractedTitle, videoIds: ids.slice(0, 5) };
}

const buildTranscriptFallback = (title: string, description?: string) => {
  const safeDescription = description?.trim() ? description.trim() : 'No description available.';
  return `No official transcript was found. Use the video context below to guide generation.\n\nTitle: ${title}\nDescription: ${safeDescription}`;
};

/**
 * Try multiple FREE transcript APIs with fallbacks
 * Each API is completely free and requires no API key
 * ENHANCED with more APIs and better error handling
 */
async function fetchTranscriptWithFallbacks(videoId: string): Promise<{ text: string; source: string } | null> {
  const apis = [
    {
      name: 'supadata.ai',
      fetch: async () => {
        const response = await fetch(`https://supadata.ai/youtube-transcript-api?videoId=${videoId}`, {
          signal: createTimeoutSignal(10000)
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => item.text || '').join(' ');
        }
        return null;
      }
    },
    {
      name: 'kome.ai (free transcript API)',
      fetch: async () => {
        const response = await fetch(`https://kome.ai/api/tools/youtube-transcripts?url=https://www.youtube.com/watch?v=${videoId}`, {
          signal: createTimeoutSignal(10000)
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (data?.transcript) {
          return data.transcript;
        }
        return null;
      }
    },
    {
      name: 'youtubetranscript.com',
      fetch: async () => {
        const response = await fetch(`https://youtubetranscript.com/api/transcript?videoId=${videoId}`, {
          signal: createTimeoutSignal(10000)
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (Array.isArray(data?.transcript) && data.transcript.length > 0) {
          return data.transcript.map((item: any) => item.text || '').join(' ');
        }
        return null;
      }
    },
    {
      name: 'youtube-captions-scraper (CORS proxy)',
      fetch: async () => {
        // Use a CORS proxy to fetch captions directly
        const response = await fetch(`https://corsproxy.io/?https://www.youtube.com/watch?v=${videoId}`, {
          signal: createTimeoutSignal(15000)
        }).catch(() => null);
        if (!response || !response.ok) return null;
        const html = await response.text();
        
        // Extract caption tracks from page HTML
        const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
        if (captionMatch) {
          const tracks = JSON.parse(captionMatch[1]);
          if (tracks.length > 0) {
            // Get the first available caption track URL
            const captionUrl = tracks[0].baseUrl;
            const captionResponse = await fetch(captionUrl, {
              signal: createTimeoutSignal(10000)
            });
            if (captionResponse.ok) {
              const captionXml = await captionResponse.text();
              // Parse XML to extract text
              const textMatches = captionXml.matchAll(/<text[^>]*>([^<]+)<\/text>/g);
              const texts = Array.from(textMatches).map(m => m[1]);
              if (texts.length > 0) {
                return texts.join(' ').replace(/&amp;#39;/g, "'").replace(/&amp;/g, '&');
              }
            }
          }
        }
        return null;
      }
    },
    {
      name: 'jina.ai CORS mirror',
      fetch: async () => {
        const response = await fetch(`https://r.jina.ai/https://www.youtube.com/watch?v=${videoId}`, {
          signal: createTimeoutSignal(15000),
        }).catch(() => null);

        if (!response || !response.ok) return null;

        const html = await response.text();
        const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
        if (!captionMatch) return null;

        const tracks = JSON.parse(captionMatch[1]);
        if (!Array.isArray(tracks) || tracks.length === 0) return null;

        // Prefer an English track if available
        const preferredTrack = tracks.find((t: any) => t.languageCode?.startsWith('en')) || tracks[0];
        if (!preferredTrack?.baseUrl) return null;

        const captionResponse = await fetch(preferredTrack.baseUrl, {
          signal: createTimeoutSignal(10000),
        }).catch(() => null);

        if (!captionResponse || !captionResponse.ok) return null;
        const captionXml = await captionResponse.text();
        const textMatches = captionXml.matchAll(/<text[^>]*>([^<]+)<\/text>/g);
        const texts = Array.from(textMatches).map(m => m[1]);

        if (texts.length > 0) {
          return texts.join(' ').replace(/&amp;#39;/g, "'").replace(/&amp;/g, '&');
        }

        return null;
      },
    },
    {
      name: 'invid.io API (alternative endpoint)',
      fetch: async () => {
        const response = await fetch(`https://invid.io/api/youtube-transcript/${videoId}`, {
          signal: createTimeoutSignal(10000)
        }).catch(() => null);
        if (!response || !response.ok) return null;
        const data = await response.json();
        if (data?.captions && Array.isArray(data.captions)) {
          return data.captions.map((item: any) => item.text || '').join(' ');
        }
        return null;
      }
    }
  ];

  // Try each API in sequence until one works
  for (const api of apis) {
    try {
      console.log(`[YouTube] Trying ${api.name}...`);
      const text = await api.fetch();
      if (text && text.length > 50) { // Lowered threshold for partial transcripts
        console.log(`[YouTube] ✅ Transcript from ${api.name}! Length: ${text.length} chars`);
        return { text, source: api.name };
      }
    } catch (error) {
      console.log(`[YouTube] ${api.name} failed:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  console.log('[YouTube] ⚠️ All transcript APIs failed');
  return null;
}

/**
 * Fetch YouTube video transcript and metadata
 * ROBUST implementation with multiple free API fallbacks
 * Returns partial data if transcript is unavailable (callers can handle AI fallback)
 */
export async function fetchYouTubeData(url: string): Promise<YouTubeVideoData> {
  const playlistId = extractPlaylistId(url);
  const videoId = extractVideoId(url);

  if (!videoId && playlistId) {
    const playlistData = await fetchPlaylistVideoIds(playlistId);
    const transcriptPieces: string[] = [];
    let source = '';

    for (const id of playlistData.videoIds) {
      const piece = await fetchTranscriptWithFallbacks(id);
      if (piece?.text) {
        transcriptPieces.push(`Video ${id}: ${piece.text}`);
        source = source || piece.source;
      }
    }

    const transcript = transcriptPieces.join('\n\n') || buildTranscriptFallback(playlistData.title);

    return {
      videoId: playlistData.videoIds[0] || playlistId,
      title: `Playlist: ${playlistData.title}`,
      description: 'Combined transcript for the first videos in the playlist.',
      transcript,
      hasTranscript: transcriptPieces.length > 0,
      transcriptSource: source || 'playlist-fallback',
    };
  }

  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please check the URL format and try again.');
  }

  console.log('[YouTube] 🎬 Processing video:', videoId);

  // Fetch metadata
  const metadata = await fetchVideoMetadata(videoId);
  console.log('[YouTube] 📋 Title:', metadata.title);

  // Try to fetch transcript from multiple free APIs
  const transcriptResult = await fetchTranscriptWithFallbacks(videoId);

  // If transcript not available, return partial data with fallback message
  const transcript = transcriptResult?.text ? transcriptResult.text.trim() : buildTranscriptFallback(metadata.title, metadata.description);
  const hasTranscript = Boolean(transcriptResult);

  return {
    videoId,
    title: metadata.title,
    description: metadata.description,
    transcript,
    hasTranscript,
    transcriptSource: transcriptResult?.source || (hasTranscript ? undefined : 'metadata-fallback'),
  };
}
