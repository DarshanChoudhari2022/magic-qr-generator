import { NextApiRequest, NextApiResponse } from 'next';

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { businessDescription, category, numberOfReviews = 3, excludeReviews = [] } = req.body;
  const apiKey = process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[API] Gemini API key not found, using fallback reviews');
    const fallbackReviews = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
    return res.status(200).json({ reviews: fallbackReviews.slice(0, numberOfReviews) });
  }

  try {
    const prompt = `Generate exactly ${numberOfReviews} authentic, unique Google Business review suggestions for: ${businessDescription}

Category: ${category}

Requirements:
- Each review: 1-2 sentences, genuine and natural sounding
- Include specific praise
- Show customer emotion/satisfaction
- SEO-friendly for Google Business
- NO quotation marks or bullets
- NO numbering

Return ONLY the reviews, one per line.`;

    const response = await Promise.race([
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ]
          })
        }
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API timeout')), 8000)
      )
    ]);

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text;
      const reviews = text
        .split('\n')
        .map((review: string) => review.trim())
        .filter((review: string) => review.length > 0 && !excludeReviews.includes(review));

      if (reviews.length > 0) {
        return res.status(200).json({ reviews: reviews.slice(0, numberOfReviews) });
      }
    }

    console.warn('[API] Invalid Gemini response, using fallback');
    const fallbackReviews = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
    return res.status(200).json({ reviews: fallbackReviews.slice(0, numberOfReviews) });
  } catch (error) {
    console.error('[API] Error calling Gemini:', error);
    const fallbackReviews = FALLBACK_REVIEWS_BY_CATEGORY[category] || FALLBACK_REVIEWS_BY_CATEGORY['General Business'];
    return res.status(200).json({ reviews: fallbackReviews.slice(0, numberOfReviews) });
  }
}
