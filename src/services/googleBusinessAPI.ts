import { supabase } from '@/integrations/supabase/client';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMB_API_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';

interface GoogleOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

const config: GoogleOAuthConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  redirectUri: `${window.location.origin}/auth/google/callback`,
  scopes: [
    'https://www.googleapis.com/auth/business.manage',
    'https://www.googleapis.com/auth/plus.business.manage',
  ],
};

export const initiateGoogleOAuth = (campaignId: string) => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: campaignId,
  });

  window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

export const exchangeCodeForTokens = async (code: string, campaignId: string) => {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to exchange code');
    }

    const { access_token, refresh_token } = data;

    await supabase
      .from('review_campaigns')
      .update({
        google_access_token: access_token,
        google_refresh_token: refresh_token,
      })
      .eq('id', campaignId);

    return { accessToken: access_token, refreshToken: refresh_token };
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};

export const refreshAccessToken = async (refreshToken: string) => {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to refresh token');
    }

    return data.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};

export const getBusinessLocations = async (accessToken: string) => {
  try {
    const response = await fetch(
      `${GMB_API_BASE}/accounts`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch locations');
    }

    return data.accounts || [];
  } catch (error) {
    console.error('Get locations error:', error);
    throw error;
  }
};

export const postReviewToGMB = async (
  accessToken: string,
  locationId: string,
  reviewData: {
    rating: number;
    comment: string;
    reviewer: {
      displayName: string;
    };
  }
) => {
  try {
    const response = await fetch(
      `${GMB_API_BASE}/accounts/${locationId}/locations/${locationId}/reviews`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          starRating: reviewData.rating,
          comment: reviewData.comment,
          reviewer: reviewData.reviewer,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to post review');
    }

    return data;
  } catch (error) {
    console.error('Post review error:', error);
    throw error;
  }
};
