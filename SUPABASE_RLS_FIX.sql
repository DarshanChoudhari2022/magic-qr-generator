-- SUPABASE RLS FIX SCRIPT
-- This script fixes the RLS policies for the 'businesses' and 'qr_codes' tables
-- to allow authenticated users to create campaigns properly.
-- Run this in the Supabase SQL Editor

-- ============= BUSINESSES TABLE RLS POLICIES =============

-- 1. Enable RLS on businesses table (if not already enabled)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- 2. Allow users to SELECT their own businesses
CREATE POLICY "Users can select their own businesses"
  ON public.businesses
  FOR SELECT
  USING (auth.uid() = owner_id);

-- 3. Allow users to INSERT their own businesses
CREATE POLICY "Users can insert their own businesses"
  ON public.businesses
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- 4. Allow users to UPDATE their own businesses
CREATE POLICY "Users can update their own businesses"
  ON public.businesses
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 5. Allow users to DELETE their own businesses
CREATE POLICY "Users can delete their own businesses"
  ON public.businesses
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ============= QR_CODES TABLE RLS POLICIES =============

-- 1. Enable RLS on qr_codes table (if not already enabled)
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- 2. Allow users to SELECT their own QR codes (through business)
CREATE POLICY "Users can select their own QR codes"
  ON public.qr_codes
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- 3. Allow users to INSERT QR codes for their businesses
CREATE POLICY "Users can insert QR codes for their businesses"
  ON public.qr_codes
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- 4. Allow users to UPDATE their own QR codes
CREATE POLICY "Users can update their own QR codes"
  ON public.qr_codes
  FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- 5. Allow users to DELETE their own QR codes
CREATE POLICY "Users can delete their own QR codes"
  ON public.qr_codes
  FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- ============= END OF RLS FIX =============
-- After running this script, test the campaign creation form again.
-- If you still see errors, check the browser console for detailed error messages.
