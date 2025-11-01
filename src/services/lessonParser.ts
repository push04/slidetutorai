// Helper to escape HTML characters
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * A simple, lightweight markdown-to-HTML converter.
 * Handles basic formatting like headings, lists, bold, italics, and code blocks.
 */
export function simpleMarkdownToHtml(md: string): string {
  if (!md) return '';
  
  // Handle code blocks first to prevent inner markdown parsing
  md = md.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escapedCode = escapeHtml(code);
    return `<pre><code class="language-${lang || ''}">${escapedCode}</code></pre>`;
  });

  // Block elements
  md = md.replace(/^#\s(.*$)/gm, '<h1>$1</h1>');
  md = md.replace(/^##\s(.*$)/gm, '<h2>$1</h2>');
  md = md.replace(/^###\s(.*$)/gm, '<h3>$1</h3>');
  md = md.replace(/^####\s(.*$)/gm, '<h4>$1</h4>');
  md = md.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
  md = md.replace(/^\s*[-*]\s(.*$)/gm, '<ul>\n<li>$1</li>\n</ul>');
  md = md.replace(/^\s*\d\.\s(.*$)/gm, '<ol>\n<li>$1</li>\n</ol>');

  // Inline elements
  md = md.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/_(.*?)_/g, '<em>$1</em>');
  md = md.replace(/`(.*?)`/g, '<code>$1</code>');

  // Clean up lists by merging adjacent list tags
  md = md.replace(/<\/ul>\n<ul>/g, '');
  md = md.replace(/<\/ol>\n<ol>/g, '');

  // Paragraphs
  md = md.split(/\n{2,}/).map(p => {
      if (p.match(/<\/?(h\d|ul|ol|li|blockquote|pre)/)) {
          return p;
      }
      return p ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '';
  }).join('');

  return md;
}

/**
 * Extracts a JSON object from a string, typically an AI model's response.
 * It looks for a ```json ... ``` code fence first, then falls back to the first '{' and last '}' characters.
 */
export function extractJSONFromResponse(text: string): Record<string, any> | null {
  if (!text) return null;
  
  const jsonFenceMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonFenceMatch?.[1]) {
    try {
      return JSON.parse(jsonFenceMatch[1]);
    } catch (e) {
      console.error("Failed to parse JSON from code fence:", e);
    }
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonString = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse JSON from substring:", e);
    }
  }

  return null;
}

/**
 * Type-safe JSON parser with validation
 * Ensures parsed data conforms to expected structure before returning
 */
export function parseJSONSafely<T>(
  text: string,
  validator: (data: any) => data is T,
  errorMessage: string = 'Invalid JSON structure'
): T {
  const parsed = extractJSONFromResponse(text);
  
  if (!parsed) {
    throw new Error('Failed to extract valid JSON from AI response. The model may be experiencing issues. Please try again.');
  }
  
  if (!validator(parsed)) {
    console.error('Validation failed for parsed JSON:', parsed);
    throw new Error(errorMessage);
  }
  
  return parsed;
}
