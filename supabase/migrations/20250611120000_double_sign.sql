/*
  # Add columns for double signature on cession_creances
  - client_signature_url
  - repairer_signature_url
  - client_sign_token
  - repairer_sign_token
*/

ALTER TABLE cession_creances
ADD COLUMN IF NOT EXISTS client_signature_url text,
ADD COLUMN IF NOT EXISTS repairer_signature_url text,
ADD COLUMN IF NOT EXISTS client_sign_token text,
ADD COLUMN IF NOT EXISTS repairer_sign_token text;
