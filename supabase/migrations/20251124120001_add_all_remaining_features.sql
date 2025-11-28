-- =============================================
-- Migration: Add All Remaining Features
-- Features: NFC Cards, Reviews, Analytics, Language, QR Templates, GMB Integration
-- Related to Issue #1
-- =============================================

-- 1. NFC CARDS TABLE (Feature 2)
CREATE TABLE IF NOT EXISTS public.nfc_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.review_campaigns(id) ON DELETE CASCADE,
  card_id TEXT UNIQUE NOT NULL,
  assigned_to TEXT,
  assigned_staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  taps_count INTEGER DEFAULT 0,
  last_tapped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nfc_cards_campaign ON public.nfc_cards(campaign_id);
CREATE INDEX idx_nfc_cards_card_id ON public.nfc_cards(card_id);

ALTER TABLE public.nfc_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view NFC cards for their campaigns"
  ON public.nfc_cards FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.review_campaigns
      WHERE business_id IN (
        SELECT business_id FROM public.user_roles WHERE user_id = auth.uid()
      ) OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  );

-- 2. REVIEWS TABLE (Feature 1 & 5)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.review_campaigns(id) ON DELETE CASCADE,
  google_review_id TEXT UNIQUE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  reviewer_name TEXT,
  reviewer_email TEXT,
  auto_reply_text TEXT,
  auto_reply_sent BOOLEAN DEFAULT FALSE,
  auto_reply_sent_at TIMESTAMPTZ,
  source TEXT DEFAULT 'qr' CHECK (source IN ('qr', 'nfc')),
  ip_address TEXT,
  user_agent TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_campaign ON public.reviews(campaign_id);
CREATE INDEX idx_reviews_google_id ON public.reviews(google_review_id);
CREATE INDEX idx_reviews_posted_at ON public.reviews(posted_at);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews for their campaigns"
  ON public.reviews FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.review_campaigns
      WHERE business_id IN (
        SELECT business_id FROM public.user_roles WHERE user_id = auth.uid()
      ) OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  );

-- 3. ENHANCE CAMPAIGN_ANALYTICS TABLE (Feature 7)
ALTER TABLE public.campaign_analytics
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'qr' CHECK (source IN ('qr', 'nfc')),
  ADD COLUMN IF NOT EXISTS time_to_review INTEGER,
  ADD COLUMN IF NOT EXISTS drop_off_stage TEXT CHECK (drop_off_stage IN ('scan', 'view', 'ai_suggestion', 'click_review', 'completed')),
  ADD COLUMN IF NOT EXISTS device_type TEXT,
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

CREATE INDEX IF NOT EXISTS idx_analytics_source ON public.campaign_analytics(source);
CREATE INDEX IF NOT EXISTS idx_analytics_drop_off ON public.campaign_analytics(drop_off_stage);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.campaign_analytics(created_at);

-- 4. LANGUAGE PREFERENCES (Feature 6)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'hi', 'mr')),
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Add language to campaigns
ALTER TABLE public.review_campaigns
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en' CHECK (language IN ('en', 'hi', 'mr')),
  ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_reply_tone TEXT DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS google_access_token TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ;

-- 5. QR TEMPLATES TABLE (Feature 4)
CREATE TABLE IF NOT EXISTS public.qr_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.review_campaigns(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  logo_url TEXT,
  foreground_color TEXT DEFAULT '#000000',
  background_color TEXT DEFAULT '#FFFFFF',
  frame_style TEXT DEFAULT 'square' CHECK (frame_style IN ('square', 'rounded', 'dots', 'with_text')),
  call_to_action TEXT DEFAULT 'Scan to Review',
  size INTEGER DEFAULT 300,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qr_templates_campaign ON public.qr_templates(campaign_id);

ALTER TABLE public.qr_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage QR templates for their campaigns"
  ON public.qr_templates FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM public.review_campaigns
      WHERE business_id IN (
        SELECT business_id FROM public.user_roles WHERE user_id = auth.uid()
      ) OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
      )
    )
  );

-- 6. HELPER FUNCTIONS

-- Function to track NFC tap
CREATE OR REPLACE FUNCTION public.track_nfc_tap(
  p_card_id TEXT,
  p_campaign_id UUID,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_analytics_id UUID;
BEGIN
  -- Update NFC card tap count
  UPDATE public.nfc_cards
  SET taps_count = taps_count + 1,
      last_tapped_at = NOW()
  WHERE card_id = p_card_id;
  
  -- Insert analytics record
  INSERT INTO public.campaign_analytics (
    campaign_id,
    event_type,
    source,
    ip_address,
    user_agent
  ) VALUES (
    p_campaign_id,
    'scan',
    'nfc',
    p_ip,
    p_user_agent
  ) RETURNING id INTO v_analytics_id;
  
  RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate conversion rate
CREATE OR REPLACE FUNCTION public.get_conversion_rate(
  p_campaign_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_total_scans INTEGER;
  v_total_reviews INTEGER;
  v_conversion_rate NUMERIC;
BEGIN
  -- Count total scans
  SELECT COUNT(*)
  INTO v_total_scans
  FROM public.campaign_analytics
  WHERE campaign_id = p_campaign_id
    AND event_type = 'scan'
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
  
  -- Count total reviews
  SELECT COUNT(*)
  INTO v_total_reviews
  FROM public.reviews
  WHERE campaign_id = p_campaign_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
  
  -- Calculate conversion rate
  IF v_total_scans > 0 THEN
    v_conversion_rate := (v_total_reviews::NUMERIC / v_total_scans::NUMERIC) * 100;
  ELSE
    v_conversion_rate := 0;
  END IF;
  
  RETURN ROUND(v_conversion_rate, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get average review quality
CREATE OR REPLACE FUNCTION public.get_average_rating(
  p_campaign_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_avg_rating NUMERIC;
BEGIN
  SELECT AVG(rating)
  INTO v_avg_rating
  FROM public.reviews
  WHERE campaign_id = p_campaign_id
    AND rating IS NOT NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
  
  RETURN COALESCE(ROUND(v_avg_rating, 1), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TRIGGERS

CREATE TRIGGER update_nfc_cards_updated_at
  BEFORE UPDATE ON public.nfc_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qr_templates_updated_at
  BEFORE UPDATE ON public.qr_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. DEFAULT DATA

-- Insert default user preferences for existing users
INSERT INTO public.user_preferences (user_id, language)
SELECT id, 'en'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Migration complete
