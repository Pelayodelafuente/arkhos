-- Add icon_url column to subscriptions for custom logos (base64 or external URL)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS icon_url TEXT;
