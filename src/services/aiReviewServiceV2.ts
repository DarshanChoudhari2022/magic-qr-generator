/**
 * AI Review Service V2 - Production-Ready Groq API Integration
 * CRITICAL FIX: Proper business-specific review generation with deduplication
 * 
 * Features:
 * - Generates business-specific reviews based on category
 * - Advanced prompt engineering for each business type
 * - Proper deduplication to prevent repeated reviews
 * - unlimited generation capability
 * - SEO-optimized reviews for better Google ranking
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

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'software_development': [
    'development team',
    'innovative solutions',
    'technical expertise',
    'clean code',
    'timely delivery',
    'agile methodology',
    'bug-free',
    'scalable architecture',
    'professional developers',
    'custom solutions',
    'excellent communication',
    'problem-solving',
  ],
  'restaurant': [
    'delicious food',
    'friendly staff',
    'ambiance',
    'menu variety',
    'fresh ingredients',
    'fast service',
    'taste',
    'value for money',
  ],
  'automotive': [
    'professional mechanics',
    'quality service',
    'transparent pricing',
    'quick turnaround',
    'car care',
    'expertise',
    'parts quality',
    'customer satisfaction',
  ],
  'healthcare': [
    'compassionate care',
    'professional staff',
    'clean facilities',
    'patient-friendly',
    'knowledgeable doctors',
    'quick appointments',
    'modern equipment',
  ],
  'salon_spa': [
    'skilled stylists',
    'relaxing atmosphere',
    'quality products',
    'professional service',
    'beauty expertise',
    'cleanliness',
    'friendly staff',
  ],
  'real_estate': [
    'professional agents',
    'market knowledge',
    'great properties',
    'smooth transactions',
    'fair pricing',
    'local expertise',
  ],
  'education': [
    'knowledgeable teachers',
    'quality education',
    'student support',
    'interactive classes',
    'curriculum excellence',
    'individual attention',
  ],
};

class AIReviewService {
  private apiUrl: string = 'https://api.groq.com/openai/v1/chat/completions';
  private apiKey: string | null = null;
  private generatedReviewsCache: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeApiKey();
  }

  private initializeApiKey(): void {
    try {
      const viteKey = (import.meta.env as any)?.VITE_GROQ_API_KEY;
      if (viteKey && viteKey.length > 0) {
        this.apiKey = viteKey;
        console.log('[AIReviewService] API Key loaded from VITE_GROQ_API_KEY');
        return;
      }

      const windowKey = (window as any).__GROQ_API_KEY__;
      if (windowKey && windowKey.length > 0) {
        this.apiKey = windowKey;
        console.log('[AIReviewService] API Key loaded from window.__GROQ_API_KEY__');
        return;
      }

      console.warn('[AIReviewService] No Groq API key found');
    } catch (error) {
      console.error('[AIReviewService] Error during API key initialization:', error);
    }
  }

  private getCategoryKeywords(category: string): string {
    const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');
    const keywords = CATEGORY_KEYWORDS[normalizedCategory] || CATEGORY_KEYWORDS['software_development'];
    return keywords.join(', ');
  }

  private createBusinessSpecificPrompt(
    businessName: string,
    businessCategory: string,
    numberOfReviews: number
  ): string {
    const categoryKeywords = this.getCategoryKeywords(businessCategory);

    return `You are an expert Google review writer specializing in ${businessCategory} industry.

IMPORTANT: Generate REALISTIC, AUTHENTIC, and BUSINESS-SPECIFIC reviews for:
Business Name: "${businessName}"
Business Type: ${businessCategory}

KEY REQUIREMENTS:
1. ONLY mention ${businessCategory}-specific aspects like: ${categoryKeywords}
2. NEVER mention garage services, auto repair, or any generic/wrong business type
3. Each review MUST be 1-2 sentences (30-100 words)
4. Highly specific to ${businessCategory} industry
5. Make reviews feel authentic - mix positive specific details with genuine customer perspective
6. NEVER repeat similar reviews - create UNIQUE perspectives
7. Include specific benefits customers care about for ${businessCategory}
8. Professional tone, natural language, SEO-optimized
9. Respond with ONLY a JSON array of review strings
10. NO other text, NO explanations, NO markdown

Example format:
["review 1", "review 2", "review 3"]

Generate ${numberOfReviews} UNIQUE, BUSINESS-SPECIFIC reviews for ${businessName} (${businessCategory}) NOW:`;
  }

  private isReviewDuplicate(review: string, businessKey: string): boolean {
    const hash = this.hashReview(review);
    const usedHashes = this.generatedReviewsCache.get(businessKey) || new Set();
    return usedHashes.has(hash);
  }

  private hashReview(review: string): string {
    return review
      .toLowerCase()
      .trim()
      .slice(0, 100)
      .replace(/[^a-z0-9]/g, '');
  }

  private markReviewAsUsed(review: string, businessKey: string): void {
    if (!this.generatedReviewsCache.has(businessKey)) {
      this.generatedReviewsCache.set(businessKey, new Set());
    }
    const hash = this.hashReview(review);
    this.generatedReviewsCache.get(businessKey)!.add(hash);
  }

  async generateReviews(request: AIReviewRequest): Promise<string[]> {
    console.log('[AIReviewService] Generating reviews for:', request.businessName, request.businessCategory);

    if (!this.apiKey) {
      console.warn('[AIReviewService] No API key available');
      return this.getFallbackReviews(request.numberOfReviews || 3);
    }

    try {
      const businessKey = `${request.businessName}_${request.businessCategory}`.toLowerCase();
      const numberOfReviews = request.numberOfReviews || 10;

      const prompt = this.createBusinessSpecificPrompt(
        request.businessName,
        request.businessCategory,
        numberOfReviews
      );

      console.log('[AIReviewService] Calling Groq API with business-specific prompt');

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
              content: `You are a professional Google review writer specializing in ${request.businessCategory} business reviews. Generate ONLY authentic, business-specific reviews. NEVER include irrelevant business types or generic content.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.9,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AIReviewService] API error:', response.status, errorText);
        return this.getFallbackReviews(request.numberOfReviews || 3);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error('[AIReviewService] No content in response');
        return this.getFallbackReviews(request.numberOfReviews || 3);
      }

      console.log('[AIReviewService] Raw API response (first 500 chars):', content.substring(0, 500));

      // Parse JSON array
      let reviews: string[] = [];
      try {
        const jsonMatch = content.match(/\[.*\]/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          reviews = Array.isArray(parsed) ? parsed.filter(r => typeof r === 'string') : [];
        }
      } catch (parseError) {
        console.warn('[AIReviewService] JSON parse failed, extracting reviews manually');
        const lines = content.split('\n').filter(l => l.trim().length > 10);
        reviews = lines
          .map(line => line.replace(/^["']|["']$|^\d+\.\s*/g, '').trim())
          .filter(line => line.length > 20 && line.length < 500)
          .slice(0, numberOfReviews);
      }

      // Filter unique reviews
      const uniqueReviews = reviews.filter(review => {
        const isDuplicate = this.isReviewDuplicate(review, businessKey);
        if (!isDuplicate) {
          this.markReviewAsUsed(review, businessKey);
        }
        return !isDuplicate;
      });

      console.log('[AIReviewService] Generated', uniqueReviews.length, 'unique reviews for', request.businessCategory);

      return uniqueReviews.length > 0 ? uniqueReviews : this.getFallbackReviews(request.numberOfReviews || 3);
    } catch (error) {
      console.error('[AIReviewService] Error generating reviews:', error);
      return this.getFallbackReviews(request.numberOfReviews || 3);
    }
  }

  private getFallbackReviews(count: number): string[] {
    const fallbacks = [
      'Great service! Highly satisfied with the experience.',
      'Professional team with excellent attention to detail.',
      'Exceeded expectations from start to finish.',
      'Highly recommended for quality and reliability.',
      'Outstanding experience! Will definitely return.',
      'Impressed with the professionalism and expertise.',
      'Best choice for their expertise and service quality.',
      'Fast, reliable, and professional service delivery.',
    ];
    return fallbacks.slice(0, count);
  }
}

export const aiReviewService = new AIReviewService();
export default aiReviewService;
