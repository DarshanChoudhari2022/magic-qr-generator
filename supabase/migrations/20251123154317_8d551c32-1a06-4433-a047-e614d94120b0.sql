-- Create enum for campaign status
CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'archived');

-- Businesses table (profiles for business owners)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_description TEXT,
  google_place_id TEXT,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Review campaigns table
CREATE TABLE public.review_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  google_review_url TEXT NOT NULL,
  custom_message TEXT,
  ai_prompt_template TEXT DEFAULT 'Write a positive, authentic review about your experience. Mention specific details like service quality, atmosphere, or staff helpfulness.',
  status campaign_status NOT NULL DEFAULT 'active',
  qr_code_data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.review_campaigns ENABLE ROW LEVEL SECURITY;

-- Review submissions tracking
CREATE TABLE public.review_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.review_campaigns(id) ON DELETE CASCADE,
  ai_suggested_review TEXT,
  submitted BOOLEAN DEFAULT FALSE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.review_submissions ENABLE ROW LEVEL SECURITY;

-- Analytics table for scan tracking
CREATE TABLE public.campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.review_campaigns(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'scan', 'view', 'ai_suggestion', 'click_review'
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for review_campaigns
CREATE POLICY "Businesses can view their own campaigns"
  ON public.review_campaigns FOR SELECT
  USING (auth.uid() = business_id);

CREATE POLICY "Businesses can create campaigns"
  ON public.review_campaigns FOR INSERT
  WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Businesses can update their own campaigns"
  ON public.review_campaigns FOR UPDATE
  USING (auth.uid() = business_id);

CREATE POLICY "Businesses can delete their own campaigns"
  ON public.review_campaigns FOR DELETE
  USING (auth.uid() = business_id);

-- Public can view active campaigns (for QR code landing pages)
CREATE POLICY "Anyone can view active campaigns"
  ON public.review_campaigns FOR SELECT
  USING (status = 'active');

-- RLS Policies for review_submissions
CREATE POLICY "Businesses can view submissions for their campaigns"
  ON public.review_submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.review_campaigns
    WHERE review_campaigns.id = review_submissions.campaign_id
    AND review_campaigns.business_id = auth.uid()
  ));

CREATE POLICY "Anyone can insert review submissions"
  ON public.review_submissions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for campaign_analytics
CREATE POLICY "Businesses can view analytics for their campaigns"
  ON public.campaign_analytics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.review_campaigns
    WHERE review_campaigns.id = campaign_analytics.campaign_id
    AND review_campaigns.business_id = auth.uid()
  ));

CREATE POLICY "Anyone can insert analytics events"
  ON public.campaign_analytics FOR INSERT
  WITH CHECK (true);

-- Trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.review_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, business_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();