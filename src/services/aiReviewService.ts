// Enhanced AI Review Service with Groq API integration, deduplication, and robust fallbacks
// Features: Auto-generation, duplicate prevention, fallback suggestions, error handling

interface GenerateReviewParams {
  businessDescription: string;
  category: string;
  numberOfReviews: number;
  excludeReviews?: string[]; // Existing reviews to avoid duplicates
}

// Comprehensive fallback reviews for Auto Garage businesses
const FALLBACK_REVIEWS_BY_CATEGORY: { [key: string]: string[] } = {
  'Auto Garage': [
    'Professional service and genuine care for my vehicle. The team took time to explain every repair and was completely transparent about costs. Very satisfied with the quality of work!',
    'Excellent work on my car maintenance. They fixed the issue properly and the pricing was fair. Would definitely recommend to anyone looking for reliable auto service.',
    'Great experience! The mechanics were knowledgeable and friendly. They completed the repair on time and did a thorough job. Will definitely be coming back for future maintenance.',
    'Outstanding service! They diagnosed the problem quickly and fixed it right the first time. The staff was helpful and made the whole process smooth. Highly recommend this garage!',
    'Very impressed with their technical expertise and professionalism. They answered all my questions and took great care of my vehicle. Best auto garage in town!',
    'Reliable and trustworthy service. The team is honest about what needs to be done and never pushes unnecessary repairs. Great quality work at reasonable prices.',
    'Exceptional service quality. They went above and beyond to ensure my car was fixed properly. Friendly staff and clean facilities. Absolutely 5 stars!',
    'Quick turnaround time and excellent customer service. The staff explained the repairs clearly and the final result exceeded my expectations!',
    'Been bringing my car here for over a year. Consistent quality, fair pricing, and they always treat me like family. This is the place to service your vehicle!',
    'Impressive technical knowledge. They fixed a problem that other shops couldn\'t diagnose. Won\'t go anywhere else for my car maintenance.',
    'Great attention to detail and professionalism. The mechanics really care about doing good work. Found some issues I didn\'t know about and fixed them properly.',
    'Highly recommend! Professional service, fair prices, and transparent about everything. They really understand cars and treat customers with respect.',
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
 * Filters reviews to exclude duplicates and similar reviews already submitted
 */
function deduplicateReviews(
  reviews: string[],
  excludeReviews: string[] = [],
  maxSimilarityScore: number = 0.85
): string[] {
  if (excludeReviews.length === 0) {
    return reviews;
  }

  const uniqueReviews: string[] = [];

  for (const review of reviews) {
    const isSimilarToExisting = excludeReviews.some((existingReview) => {
      const similarity = calculateSimilarity(review, existingReview);
      return similarity > maxSimilarityScore;
    });

    if (!isSimilarToExisting) {
      uniqueReviews.push(review);
    }
  }

  return uniqueReviews;
}

/**
 * Simple similarity check using string matching (can be enhanced with NLP later)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance for string similarity
 */
function getEditDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Main AI Review Generation Function
 */
export const generateAIReviews = async ({
  businessDescription,
  category,
  numberOfReviews = 3,
  excludeReviews = [],
}: GenerateReviewParams): Promise<string[]> => {
  try {
    console.log('[AI Review Service] Starting review generation...', {
      category,
      numberOfReviews,
      excludeReviewsCount: excludeReviews.length,
    });

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
      console.warn('[AI Review Service] API key not configured, using fallback reviews');
      return getFallbackReviews(category, numberOfReviews, excludeReviews);
    }

    // Build the prompt
    const prompt = `Generate ${numberOfReviews} authentic, unique Google business reviews for a ${category} business described as: "${businessDescription}"

Requirements for each review:
- 1-2 sentences, genuine and natural sounding
- Specific praise (e.g., "professional staff", "fair pricing", "quick service")
- Include customer emotion/satisfaction
- SEO-friendly language suitable for Google Business
- NO quotation marks or special formatting
- Each review should be distinct and unique
- Sound like real customer experiences

Return ONLY the reviews, one per line, no numbering or bullets.`;

    // Make API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.9,
        max_tokens: 1200,
        top_p: 0.95,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AI Review Service] API error:', response.status, errorData);
      return getFallbackReviews(category, numberOfReviews, excludeReviews);
    }

    const data = await response.json();
    const reviewText = data.choices?.[0]?.message?.content || '';

    if (!reviewText) {
      console.error('[AI Review Service] Empty response from API');
      return getFallbackReviews(category, numberOfReviews, excludeReviews);
    }

    // Parse reviews from response
    const reviews = reviewText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 20 && !line.match(/^\d+\.|^[-*]/)) // Filter valid reviews
      .slice(0, numberOfReviews);

    console.log(`[AI Review Service] Generated ${reviews.length} reviews from API`);

    // Ensure we have enough reviews
    if (reviews.length < numberOfReviews) {
      console.warn(`[AI Review Service] Got ${reviews.length} reviews, need ${numberOfReviews}`);
      const fallbackReviews = getFallbackReviews(category, numberOfReviews - reviews.length, excludeReviews);
      return [...reviews, ...fallbackReviews].slice(0, numberOfReviews);
    }

    // Apply deduplication
    const uniqueReviews = deduplicateReviews(reviews, excludeReviews);
    console.log(`[AI Review Service] After deduplication: ${uniqueReviews.length} unique reviews`);

    return uniqueReviews.slice(0, numberOfReviews);
  } catch (error) {
    console.error('[AI Review Service] Error generating reviews:', error);
    return getFallbackReviews(category, numberOfReviews, excludeReviews);
  }
};

/**
 * Get fallback reviews when API fails or is unavailable
 */
function getFallbackReviews(
  category: string,
  numberOfReviews: number = 3,
  excludeReviews: string[] = []
): string[] {
  const categoryReviews = FALLBACK_REVIEWS_BY_CATEGORY[category] ||
    FALLBACK_REVIEWS_BY_CATEGORY['Professional Services'];

  // Shuffle array
  const shuffled = [...categoryReviews].sort(() => Math.random() - 0.5);

  // Apply deduplication
  const uniqueReviews = deduplicateReviews(shuffled, excludeReviews);

  console.log(
    `[AI Review Service] Returning ${Math.min(numberOfReviews, uniqueReviews.length)} fallback reviews`
  );

  return uniqueReviews.slice(0, numberOfReviews);
}
