-- Temporary migration used only to perform an owner-authorized end-to-end
-- Statens vegvesen lookup from inside the Supabase project during release testing.
create extension if not exists http with schema extensions;
