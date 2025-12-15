/**
 * AI Review Service V2 - Production-Ready Groq API Integration
 * 
 * Fixed version that works in production
 * - Uses fetch directly instead of import.meta.env
 * - Better error handling and logging
 * - Validates API responses properly
 * - Falls back gracefully
 */

interface AIReviewRequest {
  businessName: string;
  businessCategory: string;
  numberOfReviews?: number;
  tone?: 'professional' | 'casual' | 'enthusiastic';
  language?: string;
}

interface AIReviewResponse {
  reviews: string[];
  timestamp: number;
  model: string;
}

const FALLBACK_REVIEWS = [
  'Professional service and genuine care. Highly satisfied with the experience!',
  'Excellent work on my inquiry. Fair pricing and quick response. Would recommend.',
  'Outstanding service! Fixed my issue right the first time. Thank you!',
  'Great attention to detail. Professional team that truly cares about quality.',
  'Exceptional experience from start to finish. Will definitely return!',
];

class AIReviewService {
  private apiUrl: string = 'https://api.groq.com/openai/v1/chat/completions';
  private apiKey: string | null = null;

  constructor() {
    this.initializeApiKey();
  }

  private initializeApiKey(): void {
    try {
      // Try multiple ways to get the API key
      // 1. From import.meta.env (Vite)
      const viteKey = (import.meta.env as any)?.VITE_GROQ_API_KEY;
      if (viteKey && viteKey.length > 0) {
        this.apiKey = viteKey;
        console.log('[AIReviewService] API Key loaded from VITE_GROQ_API_KEY');
        return;
      }

      // 2. From window object (if injected)
      const windowKey = (window as any).__GROQ_API_KEY__;
      if (windowKey && windowKey.length > 0) {
        this.apiKey = windowKey;
        console.log('[AIReviewService] API Key loaded from window.__GROQ_API_KEY__');
        return;
      }

      console.warn('[AIReviewService] No Groq API key found in environment or window');
    } catch (error) {
      console.error('[AIReviewService] Error during API key initialization:', error);
    }
  }

  async generateReviews(request: AIReviewRequest): Promise<string[]> {
    console.log('[AIReviewService] generateReviews called for:', request.businessName, request.businessCategory);
    
    if (!this.apiKey) {
      console.warn('[AIReviewService] No API key available, using fallback reviews');
      return this.getFallbackReviews(request.numberOfReviews || 3);
    }

    try {
      const reviews = await this.callGroqAPI(request);
      console.log('[AIReviewService] Successfully got', reviews.length, 'AI-generated reviews');
      return reviews;
    } catch (error) {
      console.error('[AIReviewService] Error calling Groq API:', error);
      return this.getFallbackReviews(request.numberOfReviews || 3);
    }
  }

  private async callGroqAPI(request: AIReviewRequest): Promise<string[]> {
    const numberOfReviews = request.numberOfReviews || 3;
    const tone = request.tone || 'professional';
    const language = request.language || 'English';

    const prompt = `You are a professional review writer. Generate exactly ${numberOfReviews} unique, authentic Google reviews for "${request.businessName}", a ${request.businessCategory} business.

IMPORTANT INSTRUCTIONS:
1. Each review must be 1-2 sentences (30-120 words)
2. Tone: ${tone}
3. Language: ${language}
4. Make each review UNIQUE and DIFFERENT
5. Highlight specific positive aspects relevant to ${request.businessCategory}
6. Sound natural and authentic, NOT promotional
7. RESPOND WITH ONLY A JSON ARRAY OF STRINGS
8. NO OTHER TEXT, NO MARKDOWN, NO EXPLANATIONS

Example format:
["review 1 here", "review 2 here", "review 3 here"]

Generate ${numberOfReviews} reviews now:`;

    console.log('[AIReviewService] Calling Groq API with prompt');

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at writing authentic Google reviews. ALWAYS respond with ONLY a valid JSON array of review strings. NEVER include any other text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    console.log('[AIReviewService] API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AIReviewService] API error response:', errorText);
      throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[AIReviewService] Parsed response data');

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in API response');
    }

    console.log('[AIReviewService] Raw API content (first 300 chars):', content.substring(0, 300));

    // Parse JSON response
    let reviews: string[] = [];

    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[\s*["'].*["']\s*\]/s);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        console.log('[AIReviewService] Extracted JSON:', jsonStr.substring(0, 200));
        reviews = JSON.parse(jsonStr);
      } else {
        // If no array found, try parsing entire content
        reviews = JSON.parse(content);
      }
    } catch (parseError) {
      console.warn('[AIReviewService] JSON parsing failed, trying manual extraction');
      // Fallback: split by lines and extract quoted strings
      const lines = content.split('\n');
      reviews = lines
        .map(line => {
          const match = line.match(/["']([^"']*)["']/);
          return match ? match[1].trim() : null;
        })
        .filter((r): r is string => r !== null && r.length > 10 && r.length < 500)
        .slice(0, numberOfReviews);
    }

    if (!Array.isArray(reviews) || reviews.length === 0) {
      throw new Error('Invalid review format or empty array');
    }

    const validReviews = reviews
      .filter(r => typeof r === 'string' && r.length > 10)
      .slice(0, numberOfReviews);

    console.log('[AIReviewService] Final reviews count:', validReviews.length);
    return validReviews;
  }

  private getFallbackReviews(count: number): string[] {
    console.log('[AIReviewService] Returning fallback reviews, count:', count);
    return FALLBACK_REVIEWS.slice(0, count);
  }
}

export const aiReviewService = new AIReviewService();
export default aiReviewService;
