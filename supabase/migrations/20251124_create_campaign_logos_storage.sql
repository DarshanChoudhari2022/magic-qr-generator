-- Create storage bucket for campaign logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-logos', 'campaign-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to campaign logos
CREATE POLICY "Public can view campaign logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'campaign-logos' );

-- Policy: Authenticated users can upload logos
CREATE POLICY "Authenticated users can upload campaign logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-logos' 
  AND auth.role() = 'authenticated'
);

-- Policy: Users can update their own uploaded logos
CREATE POLICY "Users can update their own campaign logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'campaign-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'campaign-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own uploaded logos
CREATE POLICY "Users can delete their own campaign logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
