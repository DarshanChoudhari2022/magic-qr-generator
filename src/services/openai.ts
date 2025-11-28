import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // For demo only - should use backend in production
});

export interface ReviewSuggestion {
  text: string;
  rating: number;
}

export async function generateReviewSuggestions(
  businessName: string,
  rating: number,
  language: string = 'en'
): Promise<ReviewSuggestion[]> {
  const languageMap: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    mr: 'Marathi',
  };

  const prompt = `Generate 3 authentic customer review suggestions for a ${rating}-star Google review of "${businessName}" in ${languageMap[language] || 'English'}. Make them natural, specific, and varied in length (short, medium, detailed). Return as JSON array with format: [{"text": "review text"}]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that generates authentic, natural-sounding customer reviews in multiple Indian languages.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in response');
    }

    const parsed = JSON.parse(content);
    const suggestions = Array.isArray(parsed.reviews)
      ? parsed.reviews
      : Array.isArray(parsed)
      ? parsed
      : [];

    return suggestions.slice(0, 3).map((s: any) => ({
      text: s.text || s,
      rating,
    }));
  } catch (error) {
    console.error('Error generating review suggestions:', error);
    // Fallback suggestions
    const fallbacks: Record<string, string[]> = {
      en: [
        'Great experience! Highly recommend.',
        'Excellent service and quality.',
        'Very satisfied with my visit.',
      ],
      hi: [
        'बहुत अच्छा अनुभव! जरूर जाएं।',
        'शानदार सेवा और गुणवत्ता।',
        'अपने अनुभव से बहुत खुश।',
      ],
      mr: [
        'उत्तम अनुभव! नक्की जावे।',
        'उत्कृष्ट सेवा आणि दर्जा।',
        'माझ्या भेटीने खूप समाधान।',
      ],
    };

    return (fallbacks[language] || fallbacks.en).map((text) => ({
      text,
      rating,
    }));
  }
}

export async function generateAutoReply(
  reviewText: string,
  rating: number,
  businessName: string,
  language: string = 'en'
): Promise<string> {
  const languageMap: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    mr: 'Marathi',
  };

  const prompt = `Generate a professional, warm reply to this ${rating}-star Google review for "${businessName}" in ${languageMap[language] || 'English'}:\n\n"${reviewText}"\n\nMake it personal, thankful, and appropriate for the rating.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that generates professional, warm responses to customer reviews in multiple Indian languages. Keep replies concise (2-3 sentences).`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content || 'Thank you for your feedback!';
  } catch (error) {
    console.error('Error generating auto reply:', error);
    const fallbacks: Record<string, string> = {
      en: 'Thank you for your wonderful feedback! We truly appreciate your support.',
      hi: 'आपकी शानदार प्रतिक्रिया के लिए धन्यवाद! हम आपके समर्थन की सचमुच सराहना करते हैं।',
      mr: 'तुमच्या उत्तम प्रतिक्रियेबद्दल धन्यवाद! आम्ही तुमच्या समर्थनाची खरोखर प्रशंसा करतो।',
    };
    return fallbacks[language] || fallbacks.en;
  }
}
