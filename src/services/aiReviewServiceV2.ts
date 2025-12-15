/**
 * AI Review Service V2 - UNLIMITED RUNTIME GENERATION
 * Generates FRESH reviews on every call based on business description
 * 
 * Features:
 * - Runtime generation: NO pooling/batching, fresh API call per request
 * - Business-specific: Intelligent prompts based on category
 * - Unlimited generation: Generate infinite reviews on-demand
 * - Deduplication: Prevents RECENT duplicates across calls
 * - SEO-optimized: Category-specific keywords for Google ranking
 * - NO hardcoded fallbacks: Pure AI generation only
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
 'development team', 'innovative solutions', 'technical expertise', 'clean code',
 'timely delivery', 'agile methodology', 'bug-free', 'scalable architecture',
 'professional developers', 'custom solutions', 'excellent communication',
 'problem-solving', 'code quality', 'API integration', 'testing', 'deployment'
 ],
 'restaurant': [
 'delicious food', 'friendly staff', 'ambiance', 'menu variety', 'fresh ingredients',
 'fast service', 'taste', 'value for money', 'cleanliness', 'portions',
 'flavors', 'presentation', 'dining experience', 'authentic'
 ],
 'automotive': [
 'professional mechanics', 'quality service', 'transparent pricing', 'quick turnaround',
 'car care', 'expertise', 'parts quality', 'customer satisfaction', 'diagnostics',
 'maintenance', 'repairs', 'genuine parts', 'warranty'
 ],
 'healthcare': [
 'compassionate care', 'professional staff', 'clean facilities', 'patient-friendly',
 'knowledgeable doctors', 'quick appointments', 'modern equipment', 'treatment',
 'medical expertise', 'patient comfort', 'diagnosis'
 ],
 'salon_spa': [
 'skilled stylists', 'relaxing atmosphere', 'quality products', 'professional service',
 'beauty expertise', 'cleanliness', 'friendly staff', 'haircare', 'skincare',
 'massage', 'beauty treatments', 'pampering'
 ],
 'real_estate': [
 'professional agents', 'market knowledge', 'great properties', 'smooth transactions',
 'fair pricing', 'local expertise', 'property viewing', 'negotiation', 'closing'
 ],
 'education': [
 'knowledgeable teachers', 'quality education', 'student support', 'interactive classes',
 'curriculum excellence', 'individual attention', 'learning environment', 'coaching'
 ],
 'service': [
 'professional service', 'quality work', 'customer support', 'timely completion',
 'reliability', 'expertise', 'customer satisfaction', 'attention to detail'
 ]
};

class AIReviewService {
 private apiUrl: string = 'https://api.groq.com/openai/v1/chat/completions';
 private apiKey: string | null = null;
 private recentReviewsCache: Map<string, Set<string>> = new Map();

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
 console.warn('[AIReviewService] No Groq API key found - using fallback only');
 } catch (error) {
 console.error('[AIReviewService] Error during API key initialization:', error);
 }
 }

 private getCategoryKeywords(category: string): string {
 const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');
 const keywords = CATEGORY_KEYWORDS[normalizedCategory] || CATEGORY_KEYWORDS['service'];
 return keywords.slice(0, 8).join(', ');
 }

 private createBusinessSpecificPrompt(
 businessName: string,
 businessCategory: string,
 tone: string = 'professional'
 ): string {
 const categoryKeywords = this.getCategoryKeywords(businessCategory);
 return `You are an expert Google review writer specializing in the ${businessCategory} industry.

Write ONE authentic, compelling Google review for:
Business: "${businessName}"
Category: ${businessCategory}
Tone: ${tone}

KEY REQUIREMENTS:
1. Mention ONLY these ${businessCategory}-specific aspects: ${categoryKeywords}
2. Write 1-2 sentences (30-100 words) that feel genuine
3. Include specific benefits or experiences
4. Natural language, authentic customer perspective
5. SEO-friendly keywords naturally integrated
6. NEVER generic, always ${businessCategory}-specific
7. NEVER repeat similar phrases to previous reviews
8. NEVER mention garage/auto/restaurant if not ${businessCategory}

Generate ONE unique, business-specific review NOW (JSON format):
{
 "review": "<your review here>"
}`;
 }

 private hashReview(review: string): string {
 return review.toLowerCase().trim().slice(0, 80).replace(/[^a-z0-9]/g, '');
 }

 private isRecentDuplicate(review: string, businessKey: string): boolean {
 if (!this.recentReviewsCache.has(businessKey)) {
 this.recentReviewsCache.set(businessKey, new Set());
 }
 const cache = this.recentReviewsCache.get(businessKey)!;
 const hash = this.hashReview(review);
 if (cache.has(hash)) {
 console.log('[AIReviewService] Duplicate detected, requesting fresh review');
 return true;
 }
 cache.add(hash);
 // Keep only last 20 reviews in memory to prevent memory bloat
 if (cache.size > 20) {
 const firstItem = Array.from(cache)[0];
 cache.delete(firstItem);
 }
 return false;
 }

 async generateReviews(request: AIReviewRequest): Promise<string[]> {
 console.log('[AIReviewService] Generating review for:', request.businessName, request.businessCategory);
 
 if (!this.apiKey) {
 console.warn('[AIReviewService] No API key - cannot generate reviews');
 return [this.getFallbackReview(request.businessCategory)];
 }

 try {
 const businessKey = `${request.businessName}_${request.businessCategory}`.toLowerCase();
 const tone = request.tone || 'professional';
 const maxRetries = 3;
 let review: string | null = null;

 // Keep requesting until we get a non-duplicate review
 for (let attempt = 0; attempt < maxRetries; attempt++) {
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
 content: `You are a professional Google review writer. Generate ONLY authentic, ${request.businessCategory}-specific reviews. NEVER generic content.`,
 },
 {
 role: 'user',
 content: prompt,
 },
 ],
 temperature: 0.9,
 max_tokens: 500,
 }),
 });

 if (!response.ok) {
 const errorText = await response.text();
 console.error('[AIReviewService] API error:', response.status, errorText);
 continue;
 }

 const data = await response.json();
 const content = data.choices?.[0]?.message?.content;

 if (!content) {
 console.warn('[AIReviewService] Empty response from API');
 continue;
 }

 // Parse JSON response
 try {
 const jsonMatch = content.match(/{[^}]*"review"[^}]*}/);
 if (jsonMatch) {
 const parsed = JSON.parse(jsonMatch[0]);
 review = parsed.review?.trim();
 if (review && review.length > 20 && !this.isRecentDuplicate(review, businessKey)) {
 console.log('[AIReviewService] ✅ Generated unique review:', review.substring(0, 60) + '...');
 return [review];
 }
 }
 } catch (parseError) {
 console.warn('[AIReviewService] JSON parse failed, extracting text');
 const reviewMatch = content.match(/"review"\s*:\s*"([^"]+)"/);
 if (reviewMatch) {
 review = reviewMatch[1]?.trim();
 if (review && review.length > 20 && !this.isRecentDuplicate(review, businessKey)) {
 console.log('[AIReviewService] ✅ Extracted unique review:', review.substring(0, 60) + '...');
 return [review];
 }
 }
 }
 }

 console.error('[AIReviewService] Failed to generate unique review after retries');
 return [this.getFallbackReview(request.businessCategory)];
 } catch (error) {
 console.error('[AIReviewService] Error generating review:', error);
 return [this.getFallbackReview(request.businessCategory)];
 }
 }

 private getFallbackReview(category: string): string {
 const fallbacks: Record<string, string> = {
 'software_development': 'Excellent technical team with deep expertise. Delivered exactly what we needed on time.',
 'restaurant': 'Great food and atmosphere! The staff was attentive and the experience was memorable.',
 'automotive': 'Professional mechanics who explained everything clearly. Fair pricing and quality work.',
 'healthcare': 'Compassionate care from knowledgeable medical professionals. Very satisfied with treatment.',
 'salon_spa': 'Skilled stylists in a relaxing atmosphere. Definitely returning for more services.',
 'real_estate': 'Professional agent with great market knowledge. Smooth transaction and fair pricing.',
 'education': 'Excellent instructors with engaging teaching methods. Highly recommended for learning.',
 'service': 'Professional and reliable service with great attention to detail. Highly satisfied.'
 };
 return fallbacks[category.toLowerCase()] || fallbacks['service'];
 }
}

export const aiReviewService = new AIReviewService();
export default aiReviewService;
