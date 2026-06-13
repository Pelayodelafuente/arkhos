-- Create project-logos storage bucket (public, so project logos are viewable without auth)
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES (
  'project-logos',
  'project-logos',
  true,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: only the owner can upload/update/delete their logo
CREATE POLICY "Users upload own project logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own project logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own project logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (bucket is public, but explicit policy for clarity)
CREATE POLICY "Public read project logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'project-logos');
