-- Migration: Add Campaign Analytics RLS Policies and Scan Tracking
-- Features: Proper RLS for analytics, enable scan count tracking
-- =====================================================

-- 1. Enable RLS on campaign_analytics table
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policy for SELECT on campaign_analytics
CREATE POLICY "Users can view analytics for their campaigns"
  ON public.campaign_analytics
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE owner_id = auth.uid()
    )
  );

-- 3. Create RLS policy for INSERT on campaign_analytics
CREATE POLICY "Allow inserting analytics for any campaign"
  ON public.campaign_analytics
  FOR INSERT
  WITH CHECK (true);

-- 4. Create RLS policy for UPDATE on campaign_analytics
CREATE POLICY "Users can update analytics for their campaigns"
  ON public.campaign_analytics
  FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE owner_id = auth.uid()
    )
  );

-- 5. Enable RLS on campaigns table (if not already enabled)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policy for SELECT on campaigns
CREATE POLICY IF NOT EXISTS "Users can select their own campaigns"
  ON public.campaigns
  FOR SELECT
  USING (owner_id = auth.uid());

-- 7. Create RLS policy for INSERT on campaigns
CREATE POLICY IF NOT EXISTS "Users can insert their own campaigns"
  ON public.campaigns
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- 8. Create RLS policy for UPDATE on campaigns
CREATE POLICY IF NOT EXISTS "Users can update their own campaigns"
  ON public.campaigns
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 9. Create RLS policy for DELETE on campaigns
CREATE POLICY IF NOT EXISTS "Users can delete their own campaigns"
  ON public.campaigns
  FOR DELETE
  USING (owner_id = auth.uid());

-- 10. Create function to track QR code scans
CREATE OR REPLACE FUNCTION public.track_qr_scan(
  p_campaign_id UUID,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_analytics_id UUID;
BEGIN
  -- Insert analytics record for the scan
  INSERT INTO public.campaign_analytics (
    campaign_id,
    event_type,
    source,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_campaign_id,
    'scan',
    'qr',
    p_ip_address,
    p_user_agent,
    NOW()
  ) RETURNING id INTO v_analytics_id;
  
  RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create a view to get scan count for campaigns
CREATE OR REPLACE VIEW public.campaign_scan_stats AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.owner_id,
  COUNT(ca.id) as total_scans,
  COUNT(CASE WHEN ca.event_type = 'review' THEN 1 END) as review_count,
  ROUND(100.0 * COUNT(CASE WHEN ca.event_type = 'review' THEN 1 END) / 
    NULLIF(COUNT(ca.id), 0), 2) as conversion_rate
FROM public.campaigns c
LEFT JOIN public.campaign_analytics ca ON c.id = ca.campaign_id
GROUP BY c.id, c.name, c.owner_id;

-- 12. Enable RLS on the view
ALTER VIEW public.campaign_scan_stats OWNER TO postgres;

-- Migration complete
