// AI Review Service - Direct Gemini API with timeout
interface GenerateReviewParams {
  businessDescription: string;
  category: string;
  numberOfReviews?: number;
  excludeReviews?: string[];
}

const FALLBACK_REVIEWS_BY_CATEGORY: { [key: string]: string[] } = {
  'Auto Garage': [
    'Professional service and genuine care for my vehicle. The team took time to explain everything clearly.',
    'Excellent work on my car maintenance. They fixed the issue properly and the pricing was fair.',
    'Great experience! The mechanics were knowledgeable and friendly. They completed the repair quickly.'
  ],
  'Professional Services': [
    'Excellent service! Professional team, on-time delivery, and great communication throughout.',
    'Very satisfied with the work done. Highly skilled professionals who deliver quality results.',
    'Great experience! The team understood my needs and delivered exactly what I wanted.'
  ],
  'General Business': [
    'Great service! Professional team and excellent results.',
    'Very satisfied with the quality and service provided.',
    'Highly recommend! Best in class service and support.'
  ]
};

/**
 * Generate AI reviews with 4-second timeout - direct Gemini API call
 */
export const generateAIReviews = async ({
  businessDescription,
  category,
  numberOfReviews = 3,
  excludeReviews = []
}: GenerateReviewParams): Promise<string[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('[AI] No API key found, using fallback');
    const fallback = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
    return fallback.slice(0, numberOfReviews);
  }

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate exactly ${numberOfReviews} authentic Google Business review suggestions for: ${businessDescription}\nCategory: ${category}\nEach review: 1-2 sentences, genuine and natural sounding. Return ONLY the reviews, one per line.`
                }
              ]
            }
          ]
        })
      }
    );

    clearTimeout(timeoutId);
    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const reviews = data.candidates[0].content.parts[0].text
        .split('\n')
        .map((r: string) => r.trim())
        .filter((r: string) => r.length > 0 && !excludeReviews.includes(r))
        .slice(0, numberOfReviews);

      if (reviews.length > 0) {
        console.log('[AI] Generated reviews:', reviews.length);
        return reviews;
      }
    }

    // Fallback if API response is empty
    const fallback = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
    return fallback.slice(0, numberOfReviews);
  } catch (err) {
    console.error('[AI] Error:', err);
    const fallback = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
    return fallback.slice(0, numberOfReviews);
  }
};

export default generateAIReviews;
