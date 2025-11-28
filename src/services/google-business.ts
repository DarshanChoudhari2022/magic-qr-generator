import { supabase } from '@/integrations/supabase/client';

export interface GoogleBusinessProfile {
  locationId: string;
  name: string;
  address: string;
  phoneNumber?: string;
  websiteUrl?: string;
}

export interface GoogleReview {
  reviewId: string;
  reviewer: {
    profilePhotoUrl?: string;
    displayName: string;
  };
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

// Connect user's Google My Business account
export async function connectGoogleBusiness(authCode: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('google-business-connect', {
      body: { authCode },
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error connecting Google Business:', error);
    throw error;
  }
}

// Fetch business locations
export async function getBusinessLocations(): Promise<GoogleBusinessProfile[]> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'google-business-locations'
    );

    if (error) throw error;
    return data?.locations || [];
  } catch (error) {
    console.error('Error fetching business locations:', error);
    return [];
  }
}

// Fetch reviews for a location
export async function getLocationReviews(
  locationId: string
): Promise<GoogleReview[]> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'google-business-reviews',
      {
        body: { locationId },
      }
    );

    if (error) throw error;
    return data?.reviews || [];
  } catch (error) {
    console.error('Error fetching location reviews:', error);
    return [];
  }
}

// Post reply to a review
export async function replyToReview(
  locationId: string,
  reviewId: string,
  replyText: string
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('google-business-reply', {
      body: {
        locationId,
        reviewId,
        comment: replyText,
      },
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error replying to review:', error);
    throw error;
  }
}

// Generate Google Review link for a location
export function generateReviewLink(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${placeId}`;
}

// Parse star rating to number
export function parseStarRating(
  rating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE'
): number {
  const ratingMap = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return ratingMap[rating] || 0;
}
