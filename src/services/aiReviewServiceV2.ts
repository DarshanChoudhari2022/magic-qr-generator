/**
 * AI Review Service V2 - UNLIMITED RUNTIME GENERATION
 * Generates FRESH reviews on every call based on business description
 * 
 * Features:
 * - Runtime generation: NO pooling/batching, fresh API call per request
 * - Business-specific: Intelligent prompts based on category
 * - Unlimited generation: Generate infinite reviews on-demand
 * - Multiple fallbacks: Provides variety even if API fails
 * - SEO-optimized: Category-specific keywords for Google ranking
 */

interface AIReviewRequest {
  businessName: string;
  businessCategory: string;
  numberOfReviews?: number;
  tone?: 'professional' | 'casual' | 'enthusiastic';
  language?: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'automotive': [
    'professional mechanics', 'quality service', 'transparent pricing', 'quick turnaround',
    'car care', 'expertise', 'parts quality', 'customer satisfaction', 'diagnostics',
    'maintenance', 'repairs', 'genuine parts', 'warranty', 'knowledgeable staff'
  ],
  'restaurant': [
    'delicious food', 'friendly staff', 'ambiance', 'menu variety', 'fresh ingredients',
    'fast service', 'taste', 'value for money', 'cleanliness', 'portions',
    'flavors', 'presentation', 'dining experience', 'authentic'
  ],
  'service': [
    'professional service', 'quality work', 'customer support', 'timely completion',
    'reliability', 'expertise', 'attention to detail', 'value for money'
  ]
};

const FALLBACK_REVIEWS: Record<string, string[]> = {
  'automotive': [
    'Professional mechanics who explained everything clearly. Fair pricing and quality work.',
    'Excellent service and fair rates. Great mechanics who really care about their work.',
    'Quick turnaround and quality repairs. Highly satisfied with the transparent pricing.',
    'Expert diagnostics and genuine parts. Very professional and reliable team.',
    'They fixed the issue perfectly. Great customer service and honest pricing.',
    'Amazing attention to detail on repairs. Professional staff and fair rates.',
    'Top-notch service! Skilled mechanics and excellent customer communication.',
    'Reliable and trustworthy. They diagnosed the problem correctly on first try.'
  ],
  'restaurant': [
    'Great food and atmosphere! The staff was attentive and the experience was memorable.',
    'Delicious menu with fresh ingredients. Fantastic ambiance and friendly service.',
    'Wonderful dining experience! The portions were generous and flavors excellent.',
    'Loved the authentic cuisine and warm hospitality. Will definitely return.',
    'Amazing food quality with perfect presentation. Staff was very accommodating.',
    'Incredible taste and beautiful plating. Service was prompt and professional.',
    'One of the best dining experiences! Fresh ingredients and skilled preparation.',
    'Fantastic flavors and cozy atmosphere. Highly recommend this restaurant!'
  ],
  'service': [
    'Professional and reliable service with great attention to detail. Highly satisfied.',
    'Excellent work quality and prompt completion. Very pleased with the results.',
    'Great service, fair pricing, and professional team. Highly recommended.',
    'They delivered exactly what they promised. Outstanding customer support.',
    'Amazing service! Professional, timely, and great value for money.',
    'Fantastic work quality and excellent communication throughout the process.',
    'Reliable team with strong expertise. They solved our problem efficiently.',
    'Outstanding professionalism and attention to detail. Will definitely use again!'
  ]
};

class AIReviewService {
  private apiUrl: string = 'https://api.groq.com/openai/v1/chat/completions';
  private apiKey: string | null = null;
  private fallbackIndex: Map<string, number> = new Map();
  
  constructor() {
    this.initializeApiKey();
  }
  
  private initializeApiKey(): void {
    try {
      const viteKey = (import.meta.env as any)?.VITE_GROQ_API_KEY;
      if (viteKey && viteKey.length > 0) {
        this.apiKey = viteKey;
        console.log('[AIReviewService] API Key loaded successfully');
        return;
      }
      console.warn('[AIReviewService] No Groq API key found - using fallback reviews');
    } catch (error) {
      console.error('[AIReviewService] Error during API key initialization:', error);
    }
  }
  
  private getRotatingFallback(category: string, businessKey: string): string {
    const reviews = FALLBACK_REVIEWS[category.toLowerCase()] || FALLBACK_REVIEWS['service'];
    let index = this.fallbackIndex.get(businessKey) || 0;
    const review = reviews[index % reviews.length];
    this.fallbackIndex.set(businessKey, index + 1);
    console.log(`[AIReviewService] Using fallback review ${(index % reviews.length) + 1}/${reviews.length}`);
    return review;
  }
  
  private getCategoryKeywords(category: string): string {
    const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');
    const keywords = CATEGORY_KEYWORDS[normalizedCategory] || CATEGORY_KEYWORDS['service'];
    return keywords.slice(0, 6).join(', ');
  }
  
  private createBusinessSpecificPrompt(
    businessName: string,
    businessCategory: string,
    tone: string = 'professional'
  ): string {
    const categoryKeywords = this.getCategoryKeywords(businessCategory);
    const timestamp = Date.now() % 1000;
    
    return `You are an expert Google review writer specializing in the ${businessCategory} industry.
Write ONE authentic, compelling Google review for:
Business: "${businessName}"
Category: ${businessCategory}
Tone: ${tone}
Context ID: ${timestamp}

KEY REQUIREMENTS:
1. Mention ONLY these ${businessCategory}-specific aspects: ${categoryKeywords}
2. Write 1-2 sentences (30-100 words) that feel genuine
3. Include specific benefits or experiences
4. Natural language, authentic customer perspective
5. SEO-friendly keywords naturally integrated
6. NEVER generic, always ${businessCategory}-specific
7. NEVER mention other industries
8. VARY the review - different angle from previous ones

Generate ONE unique review NOW (JSON format):
{"review": "<your review here>"}`;
  }
  
  async generateReviews(request: AIReviewRequest): Promise<string[]> {
    console.log('[AIReviewService] Generating review for:', request.businessName, request.businessCategory);
    
    if (!this.apiKey) {
      console.warn('[AIReviewService] No API key - using rotating fallback');
      const businessKey = `${request.businessName}_${request.businessCategory}`.toLowerCase();
      return [this.getRotatingFallback(request.businessCategory, businessKey)];
    }
    
    try {
      const businessKey = `${request.businessName}_${request.businessCategory}`.toLowerCase();
      const tone = request.tone || 'professional';
      const maxRetries = 2;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const prompt = this.createBusinessSpecificPrompt(
            request.businessName,
            request.businessCategory,
            tone
          );
          
          console.log(`[AIReviewService] API call attempt ${attempt + 1}/${maxRetries}`);
          
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
                  content: `You are a professional Google review writer. Generate ONLY authentic, ${request.businessCategory}-specific reviews. Never generic content.`,
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              temperature: 0.8,
              max_tokens: 200,
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.warn(`[AIReviewService] API error ${response.status}:`, errorText.substring(0, 100));
            continue;
          }
          
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          
          if (!content) {
            console.warn('[AIReviewService] Empty response from API');
            continue;
          }
          
          // Try to parse JSON
          try {
            const jsonMatch = content.match(/{[^}]*"review"[^}]*}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              const review = parsed.review?.trim();
              
              if (review && review.length > 20) {
                console.log('[AIReviewService] ✅ Generated review:', review.substring(0, 60) + '...');
                return [review];
              }
            }
          } catch (parseError) {
            console.warn('[AIReviewService] JSON parse failed, trying text extraction');
            const textMatch = content.match(/"review"\s*:\s*"([^"]+)"/);
            if (textMatch) {
              const review = textMatch[1]?.trim();
              if (review && review.length > 20) {
                console.log('[AIReviewService] ✅ Extracted review:', review.substring(0, 60) + '...');
                return [review];
              }
            }
          }
        } catch (error) {
          console.error(`[AIReviewService] Attempt ${attempt + 1} error:`, error);
        }
      }
      
      // All retries failed, use fallback
      console.log('[AIReviewService] All API attempts failed, using rotating fallback');
      return [this.getRotatingFallback(request.businessCategory, businessKey)];
    } catch (error) {
      console.error('[AIReviewService] Critical error:', error);
      const businessKey = `${request.businessName}_${request.businessCategory}`.toLowerCase();
      return [this.getRotatingFallback(request.businessCategory, businessKey)];
    }
  }
}

export const aiReviewService = new AIReviewService();
export default aiReviewService;
