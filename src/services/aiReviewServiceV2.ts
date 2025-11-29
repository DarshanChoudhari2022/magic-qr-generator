/**
 * AI Review Service V2 - Production-Ready Architecture
 * 
 * This service provides AI-powered review generation with:
 * - Rate limiting and request throttling
 * - Error handling and retry logic
 * - Request caching to avoid duplicate calls
 * - Type safety with TypeScript
 * - Graceful fallback to static reviews
 * - Monitoring and logging capabilities
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

/**
 * Default rate limiting configuration
 * Adjust based on your API quota and requirements
 */
const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequestsPerMinute: 10,
  maxRequestsPerHour: 100,
  cacheDurationMs: 3600000, // 1 hour
};

/**
 * Static review templates as fallback
 */
const FALLBACK_REVIEWS = [
  'Professional service and genuine care. Highly satisfied with the experience!',
  'Excellent work on my inquiry. Fair pricing and quick response. Would recommend.',
  'Outstanding service! Fixed my issue right the first time. Thank you!',
  'Great attention to detail. Professional team that truly cares about quality.',
  'Exceptional experience from start to finish. Will definitely return!',
];

/**
 * Request cache to prevent duplicate API calls
 */
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

/**
 * Rate limiter with sliding window approach
 */
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

    // Clean up old timestamps
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > oneHourAgo);

    // Check minute limit
    const lastMinuteRequests = this.requestTimestamps.filter((ts) => ts > oneMinuteAgo).length;
    if (lastMinuteRequests >= this.config.maxRequestsPerMinute) {
      console.warn('[AIReviewService] Rate limit: Max requests per minute exceeded');
      return false;
    }

    // Check hour limit
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

/**
 * Main AI Review Service
 */
class AIReviewService {
  private cache: RequestCache;
  private rateLimiter: RateLimiter;
  private config: RateLimitConfig;
  private apiKey: string | null = null;
  private enabled: boolean = false;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    this.cache = new RequestCache(this.config);
    this.rateLimiter = new RateLimiter(this.config);
    this.initializeFromEnv();
  }

  /**
   * Initialize service from environment variables
   */
  private initializeFromEnv(): void {
    // Set API key from environment (not directly passed for security)
    this.apiKey = process.env.REACT_APP_AI_API_KEY || null;
    this.enabled = !!this.apiKey && process.env.REACT_APP_AI_SERVICE_ENABLED === 'true';
  }

  /**
   * Check if AI service is enabled and ready
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate AI reviews with fallback to static reviews
   */
  async generateReviews(request: AIReviewRequest): Promise<string[]> {
    // If AI service is disabled, return fallback reviews
    if (!this.isEnabled()) {
      console.log('[AIReviewService] AI service disabled, using fallback reviews');
      return this.getFallbackReviews(request.numberOfReviews || 3);
    }

    // Check rate limit
    if (!this.rateLimiter.canMakeRequest()) {
      console.warn('[AIReviewService] Rate limit exceeded, using fallback reviews');
      return this.getFallbackReviews(request.numberOfReviews || 3);
    }

    // Check cache
    const cacheKey = this.generateCacheKey(request);
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.log('[AIReviewService] Returning cached reviews');
      return cachedResult.reviews;
    }

    try {
      // Make API call to generate reviews
      const response = await this.callAIAPI(request);
      
      // Cache the result
      this.cache.set(cacheKey, response);
      
      // Record the request for rate limiting
      this.rateLimiter.recordRequest();
      
      console.log('[AIReviewService] Successfully generated', response.reviews.length, 'reviews');
      return response.reviews;
    } catch (error) {
      console.error('[AIReviewService] Error generating reviews:', error);
      // Fall back to static reviews on error
      return this.getFallbackReviews(request.numberOfReviews || 3);
    }
  }

  /**
   * Call AI API (to be implemented with actual AI provider)
   */
  private async callAIAPI(request: AIReviewRequest): Promise<AIReviewResponse> {
    // This is a placeholder. Implement with your chosen AI provider
    // Examples: OpenAI, Google AI, Anthropic Claude, Hugging Face, etc.
    
    throw new Error(
      'AI API integration not implemented. Please configure your AI provider and set REACT_APP_AI_API_KEY'
    );
  }

  /**
   * Get fallback reviews
   */
  private getFallbackReviews(count: number): string[] {
    const result: string[] = [];
    for (let i = 0; i < count && i < FALLBACK_REVIEWS.length; i++) {
      result.push(FALLBACK_REVIEWS[i]);
    }
    return result;
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: AIReviewRequest): string {
    return `${request.businessName}_${request.businessCategory}_${request.numberOfReviews || 3}_${request.tone || 'professional'}`;
  }

  /**
   * Get service status and diagnostics
   */
  getStatus() {
    return {
      enabled: this.enabled,
      rateLimitStatus: this.rateLimiter.getRemainingRequests(),
      cacheSize: this.cache['cache'].size, // Direct access for diagnostics
    };
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[AIReviewService] Cache cleared');
  }
}

// Export singleton instance
export const aiReviewService = new AIReviewService();

// Export types and classes for advanced usage
export { AIReviewRequest, AIReviewResponse, RateLimitConfig, RequestCache, RateLimiter };
export default aiReviewService;
