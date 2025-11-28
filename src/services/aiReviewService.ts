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

  // Use a promise race with timeout
  return new Promise(resolve => {
    let timeoutId: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<string[]>(() => {}).then(() => {
      const fallback = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
      return fallback.slice(0, numberOfReviews);
    });

    timeoutId = setTimeout(() => {
      console.warn('[AI] Timeout reached, using fallback');
      const fallback = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
      resolve(fallback.slice(0, numberOfReviews));
    }, 4000);

    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    )
      .then(res => res.json())
      .then(data => {
        if (timeoutId) clearTimeout(timeoutId);
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          const reviews = data.candidates[0].content.parts[0].text
            .split('\n')
            .map((r: string) => r.trim())
            .filter((r: string) => r.length > 0 && !excludeReviews.includes(r))
            .slice(0, numberOfReviews);
          if (reviews.length > 0) {
            console.log('[AI] Generated reviews:', reviews.length);
            resolve(reviews);
            return;
          }
        }
        const fallback = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
        resolve(fallback.slice(0, numberOfReviews));
      })
      .catch(err => {
        console.error('[AI] Error:', err);
        if (timeoutId) clearTimeout(timeoutId);
        const fallback = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
        resolve(fallback.slice(0, numberOfReviews));
      });
  });
};

export default generateAIReviews;
