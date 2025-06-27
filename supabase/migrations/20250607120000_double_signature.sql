/*
  # Add double signature support for cession_creances

  1. New Columns
    - `client_signature_url` URL of the client (cedant) signature
    - `dealer_signature_url` URL of the repairer (cessionnaire) signature
*/

ALTER TABLE cession_creances
ADD COLUMN IF NOT EXISTS client_signature_url text,
ADD COLUMN IF NOT EXISTS dealer_signature_url text;

