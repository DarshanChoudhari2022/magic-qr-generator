/**
 * AI Review Service V2 - Fixed Groq API Integration
 *
 * This service provides AI-powered review generation with:
 * - Improved Groq API integration with better prompt engineering
 * - Rate limiting and request throttling
 * - Better JSON response parsing
 * - Request caching to avoid duplicate calls
 * - Type safety with TypeScript
 * - Graceful fallback to static reviews
 * - Enhanced logging for debugging
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
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  cacheDurationMs: number;
}

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequestsPerMinute: 10,
  maxRequestsPerHour: 100,
  cacheDurationMs: 3600000, // 1 hour
};

const FALLBACK_REVIEWS = [
  'Professional service and genuine care. Highly satisfied with the experience!',
  'Excellent work on my inquiry. Fair pricing and quick response. Would recommend.',
  'Outstanding service! Fixed my issue right the first time. Thank you!',
  'Great attention to detail. Professional team that truly cares about quality.',
  'Exceptional experience from start to finish. Will definitely return!',
];

class RequestCache {
  private cache: Map<string, { data: AIReviewResponse; timestamp: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  get(key: string): AIReviewResponse | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.config.cacheDurationMs;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: AIReviewResponse): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

class RateLimiter {
  private requestTimestamps: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > oneHourAgo);

    const lastMinuteRequests = this.requestTimestamps.filter((ts) => ts > oneMinuteAgo).length;
    if (lastMinuteRequests >= this.config.maxRequestsPerMinute) {
      console.warn('[AIReviewService] Rate limit: Max requests per minute exceeded');
      return false;
    }

    if (this.requestTimestamps.length >= this.config.maxRequestsPerHour) {
      console.warn('[AIReviewService] Rate limit: Max requests per hour exceeded');
      return false;
    }

    return true;
  }

  recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  getRemainingRequests(): { perMinute: number; perHour: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const lastMinuteRequests = this.requestTimestamps.filter((ts) => ts > oneMinuteAgo).length;
    const lastHourRequests = this.requestTimestamps.filter((ts) => ts > oneHourAgo).length;

    return {
      perMinute: Math.max(0, this.config.maxRequestsPerMinute - lastMinuteRequests),
      perHour: Math.max(0, this.config.maxRequestsPerHour - lastHourRequests),
    };
  }
}

class AIReviewService {
  private cache: RequestCache;
  private rateLimiter: RateLimiter;
  private config: RateLimitConfig;
  private apiKey: string | null = null;
  private enabled: boolean = false;
  private apiUrl: string = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    this.cache = new RequestCache(this.config);
    this.rateLimiter = new RateLimiter(this.config);
    this.initializeFromEnv();
  }

  private initializeFromEnv(): void {
    this.apiKey = import.meta.env.VITE_GROQ_API_KEY || null;
    this.enabled = !!this.apiKey;
    
    if (this.enabled) {
      console.log('[AIReviewService] Groq API initialized successfully');
    } else {
      console.warn('[AIReviewService] Groq API key not found in environment variables');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async generateReviews(request: AIReviewRequest): Promise<string[]> {
    if (!this.isEnabled()) {
      console.log('[AIReviewService] AI service disabled, using fallback reviews');
      return this.getFallbackReviews(request.numberOfReviews || 3);
    }

    if (!this.rateLimiter.canMakeRequest()) {
      console.warn('[AIReviewService] Rate limit exceeded, using fallback reviews');
      return this.getFallbackReviews(request.numberOfReviews || 3);
    }

    const cacheKey = this.generateCacheKey(request);
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.log('[AIReviewService] Returning cached reviews');
      return cachedResult.reviews;
    }

    try {
      console.log('[AIReviewService] Calling Groq API for:', request.businessName, request.businessCategory);
      const response = await this.callAIAPI(request);
      
      this.cache.set(cacheKey, response);
      this.rateLimiter.recordRequest();
      
      console.log('[AIReviewService] Successfully generated', response.reviews.length, 'reviews');
      return response.reviews;
    } catch (error) {
      console.error('[AIReviewService] Error generating reviews:', error);
      return this.getFallbackReviews(request.numberOfReviews || 3);
    }
  }

  private async callAIAPI(request: AIReviewRequest): Promise<AIReviewResponse> {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }

    const numberOfReviews = request.numberOfReviews || 3;
    const tone = request.tone || 'professional';
    const language = request.language || 'English';

    const prompt = `You are a Google review writer. Generate exactly ${numberOfReviews} authentic, diverse Google reviews for "${request.businessName}", a ${request.businessCategory} business.

IMPORTANT: Return ONLY a valid JSON array. No other text. No markdown. No explanation.
Example format: ["review1", "review2", "review3"]

Requirements for each review:
- 1-2 sentences, 30-120 words
- ${tone} tone
- Natural, authentic sounding
- Highlight specific positive aspects
- Unique from other reviews
- No generic phrases
- Appropriate for ${language}
- Realistic customer perspective

Return exactly ${numberOfReviews} reviews in a valid JSON array format:
`;

    try {
      console.log('[AIReviewService] Making request to Groq with prompt');
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
              content: 'You are an expert at writing authentic Google reviews. Always respond with valid JSON arrays only, nothing else.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AIReviewService] API Response Error:', errorData);
        throw new Error(`Groq API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('[AIReviewService] API Response received');
      
      const content = data.choices?.[0]?.message?.content;
      console.log('[AIReviewService] Raw content:', content?.substring(0, 200));

      if (!content) {
        throw new Error('No content in Groq API response');
      }

      let reviews: string[] = [];
      
      try {
        const trimmed = content.trim();
        const jsonMatch = trimmed.match(/\[.*\]/s);
        const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;
        reviews = JSON.parse(jsonStr);
        console.log('[AIReviewService] Successfully parsed JSON:', reviews.length, 'reviews');
      } catch (parseError) {
        console.warn('[AIReviewService] JSON parse failed, attempting extraction');
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        reviews = lines
          .filter(line => !line.startsWith('{') && !line.startsWith('[') && !line.startsWith('"'))
          .map(line => line.replace(/^[\d.\-*•>]+\s*/, ''))
          .filter(line => line.length > 20 && line.length < 500)
          .slice(0, numberOfReviews);
        
        if (reviews.length === 0) {
          reviews = lines
            .filter(line => line.length > 20 && line.length < 500)
            .slice(0, numberOfReviews);
        }
      }

      if (!Array.isArray(reviews) || reviews.length === 0) {
        console.error('[AIReviewService] No valid reviews extracted from response');
        throw new Error('Invalid review format from Groq API');
      }

      const validReviews = reviews
        .filter(r => typeof r === 'string' && r.length > 10)
        .slice(0, numberOfReviews);

      const result: AIReviewResponse = {
        reviews: validReviews,
        timestamp: Date.now(),
        model: 'mixtral-8x7b-32768',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };

      return result;
    } catch (error) {
      console.error('[AIReviewService] Groq API call failed:', error);
      throw error;
    }
  }

  private getFallbackReviews(count: number): string[] {
    const result: string[] = [];
    for (let i = 0; i < count && i < FALLBACK_REVIEWS.length; i++) {
      result.push(FALLBACK_REVIEWS[i]);
    }
    return result;
  }

  private generateCacheKey(request: AIReviewRequest): string {
    return `${request.businessName}_${request.businessCategory}_${request.numberOfReviews || 3}_${request.tone || 'professional'}`;
  }

  getStatus() {
    return {
      enabled: this.enabled,
      rateLimitStatus: this.rateLimiter.getRemainingRequests(),
      cacheSize: this.cache['cache'].size,
    };
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[AIReviewService] Cache cleared');
  }
}

export const aiReviewService = new AIReviewService();
export { AIReviewRequest, AIReviewResponse, RateLimitConfig, RequestCache, RateLimiter };
export default aiReviewService;
