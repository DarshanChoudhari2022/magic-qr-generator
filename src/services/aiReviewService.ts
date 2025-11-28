// AI Review Service - Calls backend API endpoint
// Backend handles Gemini API calls securely

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
 * Generate AI reviews using backend API endpoint
 * Backend securely handles Gemini API calls with timeout and fallback
 */
export const generateAIReviews = async ({
  businessDescription,
  category,
  numberOfReviews = 3,
  excludeReviews = []
}: GenerateReviewParams): Promise<string[]> => {
  try {
    console.log('[AI Review Service] Calling backend API for review generation...', {
      category,
      numberOfReviews
    });

    const response = await fetch('/api/generateReviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },,
        signal: AbortSignal.timeout(5000)
      body: JSON.stringify({
        businessDescription,
        category,
        numberOfReviews,
        excludeReviews
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.reviews && Array.isArray(data.reviews) && data.reviews.length > 0) {
      console.log('[AI Review Service] Successfully generated reviews:', data.reviews.length);
      return data.reviews;
    }

    // If API returns empty reviews, use fallback
    console.warn('[AI Review Service] API returned empty reviews, using fallback');
    const fallbackReviews = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
    return fallbackReviews.slice(0, numberOfReviews);
  } catch (error) {
    console.error('[AI Review Service] Error generating reviews:', error);
    // Always return fallback suggestions on error
    const fallbackReviews = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
    return fallbackReviews.slice(0, numberOfReviews);
  }
};

export default generateAIReviews;
