// Database Types for ReviewBoost AI
// Auto-generated types matching Supabase schema

export interface NFCCard {
  id: string;
  campaign_id: string;
  card_id: string;
  assigned_to: string | null;
  assigned_staff_id: string | null;
  taps_count: number;
  last_tapped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  campaign_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  rating: number;
  review_text: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  source: 'qr' | 'nfc';
  google_review_id: string | null;
  auto_reply_sent: boolean;
  auto_reply_text: string | null;
  time_to_review_seconds: number | null;
  drop_off_stage: string | null;
  location: any | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  language: 'en' | 'hi' | 'mr';
  theme: 'light' | 'dark' | 'system';
  created_at: string;
  updated_at: string;
}

export interface QRTemplate {
  id: string;
  user_id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  frame_style: 'none' | 'square' | 'rounded' | 'circle';
  logo_url: string | null;
  cta_text: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewCampaignExtended {
  id: string;
  user_id: string;
  business_id: string | null;
  name: string;
  description: string | null;
  google_review_url: string | null;
  language: 'en' | 'hi' | 'mr';
  auto_reply_enabled: boolean;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_place_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsStats {
  totalScans: number;
  totalReviews: number;
  conversionRate: number;
  averageRating: number;
  qrScans: number;
  nfcTaps: number;
  averageTimeToReview: number;
  dropOffStages: {
    stage: string;
    count: number;
  }[];
}

export interface Branch {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffMember {
  id: string;
  user_id: string;
  branch_id: string | null;
  email: string;
  role: 'admin' | 'branch_manager' | 'staff';
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Language = 'en' | 'hi' | 'mr';
export type ReviewSource = 'qr' | 'nfc';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type UserRole = 'admin' | 'branch_manager' | 'staff';
export type Theme = 'light' | 'dark' | 'system';
export type FrameStyle = 'none' | 'square' | 'rounded' | 'circle';
