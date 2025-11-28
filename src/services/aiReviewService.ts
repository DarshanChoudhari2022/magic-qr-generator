// AI Review Service using Groq API for dynamic review generation

export const generateAIReviews = async (
  businessDescription: string,
  category: string,
  numberOfReviews: number = 3
): Promise<string[]> => {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    
    if (!apiKey) {
      throw new Error('Groq API key not configured');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: 'You are a professional review writer who creates authentic, SEO-optimized Google reviews.',
          },
          {
            role: 'user',
            content: `Generate ${numberOfReviews} unique positive Google reviews for a ${category}. Description: ${businessDescription}. Return ONLY reviews, one per line.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate reviews');
    }

    const data = await response.json();
    const reviewText = data.choices[0].message.content;
    
    const reviews = reviewText
      .split('\n')
      .map((review: string) => review.trim())
      .filter((review: string) => review.length > 10)
      .slice(0, numberOfReviews);

    if (reviews.length === 0) {
      throw new Error('No reviews were generated');
    }

    return reviews;
  } catch (error) {
    console.error('Error generating AI reviews:', error);
    throw error;
  }
};
