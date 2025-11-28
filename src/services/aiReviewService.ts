// AI Review Service - Fallback Only (API disabled due to issues) - v2
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

export const generateAIReviews = async ({
  businessDescription,
  category,
  numberOfReviews = 3,
  excludeReviews = []
}: GenerateReviewParams): Promise<string[]> => {
  // Return immediate fallback reviews
  const fallback = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
  return fallback.slice(0, numberOfReviews);
};

export default generateAIReviews;
