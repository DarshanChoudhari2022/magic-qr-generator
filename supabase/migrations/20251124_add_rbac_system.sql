-- Migration: Add RBAC System (Multi-Branch & Staff Tracking)
-- Feature 3: Role-Based Access Control with Admin, Branch Manager, and Staff roles
-- Related to Issue #1

-- ==============================================
-- 1. CREATE BUSINESSES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view businesses they belong to"
  ON public.businesses FOR SELECT
  USING (
    id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert their businesses"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their businesses"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their businesses"
  ON public.businesses FOR DELETE
  USING (auth.uid() = owner_id);

-- ==============================================
-- 2. CREATE USER_ROLES TABLE
-- ==============================================
CREATE TYPE user_role_type AS ENUM ('admin', 'branch_manager', 'staff');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  branch_access UUID[] DEFAULT '{}', -- array of campaign IDs
  permissions JSONB DEFAULT '{}', -- flexible permissions object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

-- Add index for faster lookups
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_business_id ON public.user_roles(business_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Add RLS policies for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Business admins can manage roles"
  ON public.user_roles FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ==============================================
-- 3. ALTER CAMPAIGNS TABLE FOR RBAC
-- ==============================================

-- Add new columns to review_campaigns table
ALTER TABLE public.review_campaigns 
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_name TEXT,
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_location TEXT,
  ADD COLUMN IF NOT EXISTS branch_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON public.review_campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_assigned_staff ON public.review_campaigns(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_branch_manager ON public.review_campaigns(branch_manager_id);

-- Update RLS policies for campaigns to respect RBAC
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.review_campaigns;
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON public.review_campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.review_campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.review_campaigns;

-- New RBAC-aware policies for campaigns
CREATE POLICY "Users can view campaigns based on role"
  ON public.review_campaigns FOR SELECT
  USING (
    -- Owners can see all their campaigns
    business_id = (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR
    -- Admins can see all campaigns in their businesses
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Branch managers can see their assigned campaigns
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'branch_manager'
        AND id = ANY(branch_access)
    )
    OR
    -- Staff can see only campaigns assigned to them
    assigned_staff_id = auth.uid()
  );

CREATE POLICY "Admins and owners can insert campaigns"
  ON public.review_campaigns FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin')
    )
    OR
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins and owners can update campaigns"
  ON public.review_campaigns FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins and owners can delete campaigns"
  ON public.review_campaigns FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- ==============================================
-- 4. CREATE STAFF INVITATIONS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role_type NOT NULL,
  branch_access UUID[] DEFAULT '{}',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX idx_staff_invitations_email ON public.staff_invitations(email);
CREATE INDEX idx_staff_invitations_token ON public.staff_invitations(token);
CREATE INDEX idx_staff_invitations_business ON public.staff_invitations(business_id);

-- RLS for staff invitations
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations"
  ON public.staff_invitations FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view invitations sent to them"
  ON public.staff_invitations FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ==============================================
-- 5. CREATE HELPER FUNCTIONS
-- ==============================================

-- Function to check if user has specific role in business
CREATE OR REPLACE FUNCTION public.user_has_role(
  p_user_id UUID,
  p_business_id UUID,
  p_role user_role_type
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
      AND business_id = p_business_id
      AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in business
CREATE OR REPLACE FUNCTION public.get_user_role(
  p_user_id UUID,
  p_business_id UUID
)
RETURNS user_role_type AS $$
DECLARE
  v_role user_role_type;
BEGIN
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id
    AND business_id = p_business_id
  LIMIT 1;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access campaign
CREATE OR REPLACE FUNCTION public.user_can_access_campaign(
  p_user_id UUID,
  p_campaign_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_business_id UUID;
  v_assigned_staff_id UUID;
  v_user_role user_role_type;
BEGIN
  -- Get campaign details
  SELECT business_id, assigned_staff_id
  INTO v_business_id, v_assigned_staff_id
  FROM public.review_campaigns
  WHERE id = p_campaign_id;
  
  -- Check if user is the assigned staff
  IF v_assigned_staff_id = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is admin or owner
  SELECT role INTO v_user_role
  FROM public.user_roles
  WHERE user_id = p_user_id
    AND business_id = v_business_id;
  
  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is branch manager with access
  IF v_user_role = 'branch_manager' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = p_user_id
        AND business_id = v_business_id
        AND p_campaign_id = ANY(branch_access)
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 6. CREATE UPDATED_AT TRIGGERS
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for businesses table
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for user_roles table
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- 7. INSERT DEFAULT DATA (OPTIONAL)
-- ==============================================

-- Note: Default business will be created when user creates their first campaign
-- or they can create a business first from the new Businesses page

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

-- To verify this migration:
-- 1. Check if businesses table exists: SELECT * FROM public.businesses LIMIT 1;
-- 2. Check if user_roles table exists: SELECT * FROM public.user_roles LIMIT 1;
-- 3. Check if new columns added to campaigns: \d public.review_campaigns
-- 4. Test RLS policies by querying as different users
