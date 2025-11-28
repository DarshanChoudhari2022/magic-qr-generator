-- Add business_category field to profiles and review_campaigns tables
-- This enables AI to generate business-specific review suggestions

-- Add business_category to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS business_category TEXT;

-- Add business_category to review_campaigns table
ALTER TABLE review_campaigns 
ADD COLUMN IF NOT EXISTS business_category TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_business_category 
ON profiles(business_category);

CREATE INDEX IF NOT EXISTS idx_campaigns_business_category 
ON review_campaigns(business_category);

-- Add comment for documentation
COMMENT ON COLUMN profiles.business_category IS 'Business type/category for AI review suggestions (e.g., Automotive Garage, Restaurant, Salon)';
COMMENT ON COLUMN review_campaigns.business_category IS 'Business type/category for this specific campaign';


-- Add qr_theme field to review_campaigns table
-- This enables custom color themes for QR codes
ALTER TABLE review_campaigns
ADD COLUMN IF NOT EXISTS qr_theme TEXT DEFAULT 'blue';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_campaigns_qr_theme
ON review_campaigns(qr_theme);

-- Add comment for documentation
COMMENT ON COLUMN review_campaigns.qr_theme IS 'Color theme for QR code (blue, green, purple, orange, red, black)';
