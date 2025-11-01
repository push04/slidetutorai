/**
 * YouTube utility functions for extracting video info and transcripts
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
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Fetch YouTube video transcript and metadata
 */
export async function fetchYouTubeData(url: string): Promise<YouTubeVideoData> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // Fetch video metadata
  const metadataUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const metadataResponse = await fetch(metadataUrl);
  const metadata = await metadataResponse.json();
  const title = metadata.title || 'YouTube Video';

  // Try to get real captions using YouTube Transcript API
  let transcriptText = '';
  try {
    const transcriptResponse = await fetch(
      `https://youtube-transcript-api.p.rapidapi.com/transcript?video_id=${videoId}`,
      {
        headers: {
          'X-RapidAPI-Key': 'demo', // Demo key - limited usage
        }
      }
    ).catch(() => null);

    if (transcriptResponse && transcriptResponse.ok) {
      const transcriptData = await transcriptResponse.json();
      if (Array.isArray(transcriptData) && transcriptData.length > 0) {
        transcriptText = transcriptData.map((item: any) => item.text).join(' ');
      }
    }
  } catch (error) {
    console.log('Could not fetch transcript');
  }

  // If no transcript available, create a placeholder
  if (!transcriptText || transcriptText.length < 100) {
    transcriptText = `YouTube Video: ${title}\n\nNote: Transcript not available. AI will generate educational content based on the video title.`;
  }

  return {
    videoId,
    title,
    transcript: transcriptText
  };
}
