// AI Review Service using Google Gemini API (Free Tier)
// Generates authentic, SEO-optimized review suggestions

interface GenerateReviewParams {
  businessDescription: string;
  category: string;
  numberOfReviews: number;
  excludeReviews?: string[];
}

// Fallback reviews for when API fails
const FALLBACK_REVIEWS_BY_CATEGORY: { [key: string]: string[] } = {
  'Auto Garage': [
    'Professional service and genuine care for my vehicle. The team took time to explain every repair and was completely transparent about costs. Highly satisfied!',
    'Excellent work on my car maintenance. They fixed the issue properly and the pricing was fair. Would definitely recommend to anyone looking for reliable auto service.',
    'Great experience! The mechanics were knowledgeable and friendly. They completed the repair on time and did a thorough job. Will definitely be coming back!',
  ],
  'Professional Services': [
    'Excellent service! Professional team, on-time delivery, and great communication throughout.',
    'Very satisfied with the work done. Highly skilled professionals who deliver quality results.',
    'Great experience! The team understood my needs and delivered exactly what I wanted.',
  ],
  'General Business': [
    'Great service! Professional team and excellent results.',
    'Very satisfied with the quality and the service provided.',
    'Highly recommend! Best in class service and support.',
  ],
};

/**
 * Generate AI reviews using Google Gemini API (Free Tier)
 */
export const generateAIReviews = async ({
  businessDescription,
  category,
  numberOfReviews = 3,
  excludeReviews = [],
}: GenerateReviewParams): Promise<string[]> => {
  try {
    console.log('[AI Review Service] Starting Gemini review generation...', {
      category,
      numberOfReviews,
    });

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('[AI Review Service] Gemini API key not found, using fallback reviews');
      return getFallbackReviews(category, numberOfReviews, excludeReviews);
    }

    // Call Google Gemini API
    const prompt = `Generate exactly ${numberOfReviews} authentic, unique Google Business reviews for a ${category} business described as: "${businessDescription}"

Requirements:
- Each review: 1-2 sentences, genuine and natural sounding
- Include specific praise (e.g., "professional staff", "fair pricing", "quick service")
- Show customer emotion/satisfaction
- SEO-friendly for Google Business listings
- NO quotation marks or special formatting
- Each review must be distinct and unique
- Sound like real customer experiences

Return ONLY the reviews, one per line, no numbering or bullets.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AI Review Service] Gemini API error:', response.status, errorData);
      return getFallbackReviews(category, numberOfReviews, excludeReviews);
    }

    const data = await response.json();
    const reviewText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!reviewText) {
      console.error('[AI Review Service] Empty response from Gemini');
      return getFallbackReviews(category, numberOfReviews, excludeReviews);
    }

    // Parse reviews from response
    const reviews = reviewText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 20 && !line.match(/^\d+\.|^[-*]/)) // Filter valid reviews
      .slice(0, numberOfReviews);

    console.log(`[AI Review Service] Generated ${reviews.length} reviews from Gemini API`);

    if (reviews.length < numberOfReviews) {
      console.warn(`[AI Review Service] Got ${reviews.length} reviews, need ${numberOfReviews}, adding fallbacks`);
      const fallbackReviews = getFallbackReviews(category, numberOfReviews - reviews.length, excludeReviews);
      return [...reviews, ...fallbackReviews].slice(0, numberOfReviews);
    }

    return reviews.slice(0, numberOfReviews);
  } catch (error) {
    console.error('[AI Review Service] Error generating reviews:', error);
    return getFallbackReviews(category, numberOfReviews, excludeReviews);
  }
};

/**
 * Get fallback reviews when API fails
 */
function getFallbackReviews(
  category: string,
  numberOfReviews: number = 3,
  excludeReviews: string[] = []
): string[] {
  const categoryReviews =
    FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['Professional Services'];

  // Shuffle array
  const shuffled = [...categoryReviews].sort(() => Math.random() - 0.5);

  console.log(`[AI Review Service] Returning ${Math.min(numberOfReviews, shuffled.length)} fallback reviews`);
  return shuffled.slice(0, numberOfReviews);
}
