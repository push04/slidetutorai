/**
 * YouTube utility functions for extracting video info and transcripts
 * Uses multiple robust methods with proper fallbacks
 */

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  transcript: string;
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtube\.com\/embed\/)([^&\s]+)/,
    /(?:youtu\.be\/)([^&\s]+)/,
    /(?:youtube\.com\/v\/)([^&\s]+)/,
    /(?:youtube\.com\/shorts\/)([^&\s]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Method 1: Use YouTube's innertube API (most reliable)
 */
async function fetchTranscriptViaInnertube(videoId: string): Promise<string> {
  try {
    console.log('[YouTube] Trying innertube API method...');
    
    // First, get the video page to extract necessary tokens
    const pageResponse = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, {}, 8000);
    const pageHtml = await pageResponse.text();
    
    // Extract API key and context from page
    const apiKeyMatch = pageHtml.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    const contextMatch = pageHtml.match(/"INNERTUBE_CONTEXT":({[^}]+})/);
    
    if (!apiKeyMatch) {
      throw new Error('Could not extract API key');
    }
    
    // Try to find caption tracks directly in the page
    const captionTracksMatch = pageHtml.match(/"captionTracks":(\[.*?\])/);
    if (captionTracksMatch) {
      const captionTracks = JSON.parse(captionTracksMatch[1]);
      
      // Prefer English captions, fall back to first available
      const track = captionTracks.find((t: any) => 
        t.languageCode?.startsWith('en')
      ) || captionTracks[0];
      
      if (track?.baseUrl) {
        console.log('[YouTube] Found caption track, fetching...');
        const captionResponse = await fetchWithTimeout(track.baseUrl, {}, 8000);
        const captionData = await captionResponse.text();
        
        // Parse the caption data (could be JSON or XML)
        let transcript = '';
        
        // Try JSON format first
        try {
          const jsonData = JSON.parse(captionData);
          if (jsonData.events) {
            transcript = jsonData.events
              .filter((e: any) => e.segs)
              .map((e: any) => e.segs.map((s: any) => s.utf8).join(''))
              .join(' ');
          }
        } catch {
          // Try XML format
          const textMatches = captionData.matchAll(/<text[^>]*>(.*?)<\/text>/g);
          const parts = [];
          for (const match of textMatches) {
            const text = match[1]
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&nbsp;/g, ' ')
              .replace(/<[^>]+>/g, '')
              .trim();
            if (text) parts.push(text);
          }
          transcript = parts.join(' ');
        }
        
        if (transcript.length > 100) {
          console.log('[YouTube] Innertube method succeeded, transcript length:', transcript.length);
          return transcript;
        }
      }
    }
    
    throw new Error('No caption tracks found');
  } catch (error: any) {
    console.warn('[YouTube] Innertube method failed:', error.message);
    throw error;
  }
}

/**
 * Method 2: Use transcript API service
 */
async function fetchTranscriptViaAPI(videoId: string): Promise<string> {
  try {
    console.log('[YouTube] Trying transcript API method...');
    
    const response = await fetchWithTimeout(
      `https://www.searchapi.io/api/v1/search?engine=youtube_transcripts&video_id=${videoId}`,
      { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      },
      10000
    );

    if (response.ok) {
      const data = await response.json();
      if (data.transcripts && Array.isArray(data.transcripts) && data.transcripts.length > 0) {
        const transcript = data.transcripts.map((t: any) => t.text).join(' ');
        if (transcript.length > 100) {
          console.log('[YouTube] API method succeeded, transcript length:', transcript.length);
          return transcript;
        }
      }
    }
    throw new Error('API response invalid');
  } catch (error: any) {
    console.warn('[YouTube] API method failed:', error.message);
    throw error;
  }
}

/**
 * Method 3: Use alternative transcript service
 */
async function fetchTranscriptViaAlternative(videoId: string): Promise<string> {
  try {
    console.log('[YouTube] Trying alternative service...');
    
    const response = await fetchWithTimeout(
      `https://youtubetranscript.com/?server_vid2=${videoId}`,
      {},
      10000
    );

    if (response.ok) {
      const html = await response.text();
      
      // Try to extract transcript from response
      const transcriptMatch = html.match(/<div class="transcript-content">(.*?)<\/div>/s);
      if (transcriptMatch) {
        const transcript = transcriptMatch[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (transcript.length > 100) {
          console.log('[YouTube] Alternative method succeeded, transcript length:', transcript.length);
          return transcript;
        }
      }
    }
    throw new Error('Alternative service failed');
  } catch (error: any) {
    console.warn('[YouTube] Alternative method failed:', error.message);
    throw error;
  }
}

/**
 * Method 4: Direct YouTube page parsing (last resort)
 */
async function fetchTranscriptDirect(videoId: string): Promise<string> {
  try {
    console.log('[YouTube] Trying direct page parsing...');
    
    const response = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, {}, 8000);
    const html = await response.text();
    
    // Look for timedtext URL patterns
    const timedtextMatch = html.match(/https:\/\/www\.youtube\.com\/api\/timedtext[^"]+/);
    if (timedtextMatch) {
      const timedtextUrl = timedtextMatch[0].replace(/\\u0026/g, '&');
      console.log('[YouTube] Found timedtext URL');
      
      const captionResponse = await fetchWithTimeout(timedtextUrl, {}, 8000);
      const captionXml = await captionResponse.text();
      
      const textMatches = captionXml.matchAll(/<text[^>]*>(.*?)<\/text>/g);
      const parts = [];
      for (const match of textMatches) {
        const text = match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/<[^>]+>/g, '')
          .trim();
        if (text) parts.push(text);
      }
      
      const transcript = parts.join(' ');
      if (transcript.length > 100) {
        console.log('[YouTube] Direct parsing succeeded, transcript length:', transcript.length);
        return transcript;
      }
    }
    
    throw new Error('Direct parsing failed');
  } catch (error: any) {
    console.warn('[YouTube] Direct parsing failed:', error.message);
    throw error;
  }
}

/**
 * Fetch YouTube video transcript using multiple fallback methods
 */
async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  const methods = [
    fetchTranscriptViaInnertube,
    fetchTranscriptDirect,
    fetchTranscriptViaAPI,
    fetchTranscriptViaAlternative,
  ];
  
  let lastError: Error | null = null;
  
  for (let i = 0; i < methods.length; i++) {
    try {
      const transcript = await methods[i](videoId);
      if (transcript && transcript.length > 100) {
        return transcript;
      }
    } catch (error: any) {
      lastError = error;
      console.log(`[YouTube] Method ${i + 1}/${methods.length} failed, trying next...`);
    }
  }
  
  throw new Error(
    `Unable to fetch transcript after ${methods.length} attempts. ` +
    `This video may not have captions available. Last error: ${lastError?.message || 'Unknown'}`
  );
}

/**
 * Fetch YouTube video transcript and metadata
 */
export async function fetchYouTubeData(url: string): Promise<YouTubeVideoData> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please provide a valid YouTube video link (e.g., https://youtube.com/watch?v=...)');
  }

  console.log('[YouTube] Fetching data for video:', videoId);

  // Fetch video metadata
  let title = 'YouTube Video';
  try {
    const metadataUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const metadataResponse = await fetchWithTimeout(metadataUrl, {}, 5000);
    if (metadataResponse.ok) {
      const metadata = await metadataResponse.json();
      title = metadata.title || title;
      console.log('[YouTube] Got video title:', title);
    }
  } catch (error) {
    console.warn('[YouTube] Could not fetch video metadata, using default title');
  }

  // Fetch transcript using multiple methods with fallbacks
  let transcriptText: string;
  try {
    transcriptText = await fetchYouTubeTranscript(videoId);
  } catch (error: any) {
    throw new Error(
      `Unable to fetch transcript for "${title}". ${error.message || ''}\n\n` +
      `Please ensure:\n` +
      `• The video has captions/subtitles enabled\n` +
      `• The video is publicly accessible\n` +
      `• You're using a valid YouTube URL\n\n` +
      `Or try uploading a document instead.`
    );
  }

  // Final validation
  if (!transcriptText || transcriptText.trim().length < 50) {
    throw new Error(
      `The transcript for "${title}" is too short or empty. ` +
      `This video may not have sufficient captions. Please try a different video or upload a document.`
    );
  }

  console.log('[YouTube] Successfully fetched transcript, length:', transcriptText.length);

  return {
    videoId,
    title,
    transcript: transcriptText.trim()
  };
}
