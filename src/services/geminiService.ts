/**
 * Gemini vision helper: analyzes an item photo and drafts the post details.
 * Uses the REST API directly (no SDK) with gemini-2.5-flash.
 * Gracefully unavailable when no API key is configured.
 */

const GEMINI_API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || '';
const MODEL = 'gemini-3.6-flash';

export interface ItemPhotoAnalysis {
  title: string;
  category: string;
  description: string;
  distinguishingMarks: string;
}

const VALID_CATEGORIES = [
  'Bags', 'Electronics', 'Jewelry', 'Accessories', 'Keys', 'Clothing', 'Books', 'Other',
];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const geminiService = {
  isConfigured(): boolean {
    return Boolean(GEMINI_API_KEY);
  },

  async analyzeItemPhoto(file: File): Promise<ItemPhotoAnalysis> {
    const base64 = await fileToBase64(file);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: file.type || 'image/jpeg', data: base64 } },
                {
                  text:
                    'This is a photo of a lost-and-found item on a school campus. ' +
                    'Describe it for a lost & found listing. Respond with ONLY a JSON object, no markdown, with keys: ' +
                    '"title" (short item name, max 6 words, e.g. "Black Casio Scientific Calculator"), ' +
                    `"category" (exactly one of: ${VALID_CATEGORIES.join(', ')}), ` +
                    '"description" (one sentence describing the item neutrally), ' +
                    '"distinguishingMarks" (specific visible details that could help verify ownership: colors, brands, stickers, scratches, contents).',
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(raw);
    return {
      title: String(parsed.title || '').slice(0, 80),
      category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
      description: String(parsed.description || '').slice(0, 300),
      distinguishingMarks: String(parsed.distinguishingMarks || '').slice(0, 500),
    };
  },
};
