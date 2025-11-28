-- SMART CONNECT QR - Enhanced Schema
-- Complete database structure for multi-location QR campaign management

-- =====================================================
-- LOCATIONS TABLE - Manage multiple business branches
-- =====================================================
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  google_review_url TEXT NOT NULL,
  category VARCHAR(100),
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- CAMPAIGNS TABLE - Enhanced with location support
-- =====================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  placement_type VARCHAR(100),
  headline VARCHAR(255),
  subheadline VARCHAR(255),
  footer_text TEXT,
  theme_color VARCHAR(50),
  logo_size NUMERIC(3,1),
  logo_x_offset NUMERIC(5,2),
  logo_y_offset NUMERIC(5,2),
  template_size VARCHAR(50),
  design_metadata JSONB,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- SCAN EVENTS TABLE - Track every QR/NFC scan
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  event_type VARCHAR(50), -- 'scan' or 'tap' (NFC)
  device_type VARCHAR(50),
  user_agent TEXT,
  approximate_location TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- CONVERSION EVENTS TABLE - Track review clicks
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  scan_event_id UUID REFERENCES public.scan_events(id),
  converted BOOLEAN DEFAULT TRUE,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- AI SUGGESTIONS TABLE - Cache AI-generated review ideas
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  suggestion_1 TEXT,
  suggestion_2 TEXT,
  suggestion_3 TEXT,
  generated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days'
);

-- =====================================================
-- GOOGLE REVIEWS TABLE - Track reviews and auto-replies
-- =====================================================
CREATE TABLE IF NOT EXISTS public.google_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  review_id VARCHAR(255) UNIQUE,
  author_name VARCHAR(255),
  rating INTEGER,
  review_text TEXT,
  review_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- AUTO REPLIES TABLE - AI-generated responses
-- =====================================================
CREATE TABLE IF NOT EXISTS public.auto_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.google_reviews(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  tone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending', -- pending or posted
  created_at TIMESTAMP DEFAULT NOW(),
  posted_at TIMESTAMP
);

-- =====================================================
-- RLS POLICIES - Row Level Security
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_replies ENABLE ROW LEVEL SECURITY;

-- Locations: Users can only see their own locations
CREATE POLICY "Users can view own locations" ON public.locations
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own locations" ON public.locations
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own locations" ON public.locations
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Campaigns: Users can only see/manage their own campaigns
CREATE POLICY "Users can view own campaigns" ON public.campaigns
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own campaigns" ON public.campaigns
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Scan events: Public can insert (anonymous scans), owners can view
CREATE POLICY "Anyone can record scan events" ON public.scan_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can view scan events" ON public.scan_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = scan_events.campaign_id
      AND campaigns.owner_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_locations_owner_id ON public.locations(owner_id);
CREATE INDEX idx_campaigns_location_id ON public.campaigns(location_id);
CREATE INDEX idx_campaigns_owner_id ON public.campaigns(owner_id);
CREATE INDEX idx_campaigns_short_code ON public.campaigns(short_code);
CREATE INDEX idx_scan_events_campaign_id ON public.scan_events(campaign_id);
CREATE INDEX idx_scan_events_timestamp ON public.scan_events(timestamp);
CREATE INDEX idx_conversion_events_campaign_id ON public.conversion_events(campaign_id);
CREATE INDEX idx_google_reviews_location_id ON public.google_reviews(location_id);
CREATE INDEX idx_auto_replies_review_id ON public.auto_replies(review_id);
